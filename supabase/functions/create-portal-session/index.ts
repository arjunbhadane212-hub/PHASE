// Opens the Stripe Customer Portal so a Pro member can update their card or
// cancel. Cancelling is the member's right, so this must always work.
//
// Secrets: STRIPE_SECRET_KEY. The Customer Portal must be switched on once in
// the Stripe dashboard (Settings -> Billing -> Customer portal).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const EXTRA_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!STRIPE_KEY) return json({ error: 'payments_not_configured' }, 501);

  const authz = req.headers.get('Authorization') ?? '';
  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authz, apikey: ANON_KEY } });
  if (!who.ok) return json({ error: 'unauthorized' }, 401);
  const user = await who.json();
  if (!user?.id) return json({ error: 'unauthorized' }, 401);

  let body: { origin?: string } = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const origin = [req.headers.get('Origin'), body.origin].find(originOk);
  if (!origin) return json({ error: 'invalid_origin' }, 400);

  const rowRes = await fetch(
    `${SUPABASE_URL}/rest/v1/billing_subscriptions?user_id=eq.${user.id}&select=stripe_customer_id`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  const row = rowRes.ok ? (await rowRes.json())[0] : null;
  if (!row?.stripe_customer_id) return json({ error: 'no_subscription' }, 404);

  const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ customer: row.stripe_customer_id, return_url: `${origin}/dashboard/settings` }),
  });
  const data = await res.json();
  if (!res.ok) return json({ error: 'stripe_error', message: data?.error?.message ?? 'Stripe rejected the request' }, 502);
  return json({ url: data.url });
});
