// Creates a Stripe Checkout Session for Phase Pro and returns its URL.
//
// Prices are defined HERE (inline price_data), so there is nothing to create in
// the Stripe dashboard except the account itself. Source of truth for amounts:
// CLAUDE.md -> Monetization ($6.99/mo, $49.99/yr).
//
// Secrets: STRIPE_SECRET_KEY (required). Optional: ALLOWED_ORIGINS
// (comma-separated extra origins allowed to receive the checkout redirect).
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected by
// Supabase. With no STRIPE_SECRET_KEY this returns 501 and charges nothing.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const EXTRA_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean);

const PLANS = {
  monthly: { amount: 699, interval: 'month' },
  yearly: { amount: 4999, interval: 'year' },
} as const;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Only send people back to places we control: localhost, this project's Vercel
// deployments, or an explicitly allowed origin.
function originOk(o: string | null | undefined): o is string {
  if (!o) return false;
  try {
    const u = new URL(o);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
    if (u.protocol === 'https:' && /^phaseofficial[a-z0-9-]*\.vercel\.app$/.test(u.hostname)) return true;
    return EXTRA_ORIGINS.includes(u.origin);
  } catch {
    return false;
  }
}

const svcHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!STRIPE_KEY) return json({ error: 'payments_not_configured' }, 501);

  // Who is asking? Validate the caller's JWT against Supabase Auth.
  const authz = req.headers.get('Authorization') ?? '';
  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authz, apikey: ANON_KEY } });
  if (!who.ok) return json({ error: 'unauthorized' }, 401);
  const user = await who.json();
  if (!user?.id) return json({ error: 'unauthorized' }, 401);

  let body: { plan?: string; origin?: string } = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const plan = body.plan as keyof typeof PLANS;
  if (!PLANS[plan]) return json({ error: 'invalid_plan' }, 400);

  const origin = [req.headers.get('Origin'), body.origin].find(originOk);
  if (!origin) return json({ error: 'invalid_origin' }, 400);

  // Already subscribed? Don't sell them a second subscription.
  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/billing_subscriptions?user_id=eq.${user.id}&select=stripe_customer_id,status`,
    { headers: svcHeaders },
  );
  const existing = existingRes.ok ? (await existingRes.json())[0] : null;
  if (existing && ['active', 'trialing', 'past_due'].includes(existing.status)) {
    return json({ already_pro: true });
  }

  const p = PLANS[plan];
  const form = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(p.amount),
    'line_items[0][price_data][recurring][interval]': p.interval,
    'line_items[0][price_data][product_data][name]': 'Phase Pro',
    'line_items[0][price_data][product_data][description]':
      plan === 'yearly' ? 'Phase Pro, billed yearly' : 'Phase Pro, billed monthly',
    client_reference_id: user.id,
    'metadata[user_id]': user.id,
    'subscription_data[metadata][user_id]': user.id,
    'subscription_data[metadata][plan]': plan,
    allow_promotion_codes: 'true',
    success_url: `${origin}/dashboard?pro=success`,
    cancel_url: `${origin}/dashboard?pro=cancelled`,
  });
  if (existing?.stripe_customer_id) form.set('customer', existing.stripe_customer_id);
  else if (user.email) form.set('customer_email', user.email);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) return json({ error: 'stripe_error', message: data?.error?.message ?? 'Stripe rejected the request' }, 502);
  return json({ url: data.url });
});
