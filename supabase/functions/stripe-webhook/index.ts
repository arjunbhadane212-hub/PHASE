// Stripe -> Phase. The ONLY place users.is_pro is ever turned on or off for a
// paying customer. Deployed with verify_jwt = false because Stripe cannot send
// a Supabase JWT; every request is authenticated by Stripe's signature instead.
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (the whsec_... signing
// secret of the webhook endpoint). Events to send to this endpoint:
//   checkout.session.completed, customer.subscription.created,
//   customer.subscription.updated, customer.subscription.deleted
//
// Pro stays on while a subscription is active, trialing, or past_due (Stripe is
// still retrying the card, so a failed renewal does not instantly lock someone
// out). Anything else turns it off.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const PRO_STATUSES = ['active', 'trialing', 'past_due'];
const enc = new TextEncoder();
const svc = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Stripe-Signature: t=<unix>,v1=<hex hmac of "<t>.<raw body>">[,v1=...]
async function verifySignature(rawBody: string, header: string | null, secret: string) {
  if (!header) return false;
  let t = '';
  const sigs: string[] = [];
  for (const part of header.split(',')) {
    const [k, v] = part.split('=');
    if (k === 't') t = v;
    else if (k === 'v1') sigs.push(v);
  }
  if (!t || sigs.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false; // replay window
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${rawBody}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return sigs.some((s) => timingSafeEqual(s, hex));
}

async function rest(path: string, init: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, init);
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res;
}

// deno-lint-ignore no-explicit-any
async function applySubscription(sub: any, userIdHint?: string | null) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;

  let userId: string | null = sub.metadata?.user_id ?? userIdHint ?? null;
  if (!userId && customerId) {
    const r = await rest(`billing_subscriptions?stripe_customer_id=eq.${customerId}&select=user_id`, { headers: svc });
    userId = (await r.json())[0]?.user_id ?? null;
  }
  if (!userId) throw new Error(`no user for subscription ${sub.id}`);

  const item = sub.items?.data?.[0];
  const interval = item?.price?.recurring?.interval;
  const plan = interval === 'year' ? 'yearly' : interval === 'month' ? 'monthly' : null;
  const periodEnd = sub.current_period_end ?? item?.current_period_end ?? null;
  const isPro = PRO_STATUSES.includes(sub.status);

  await rest('billing_subscriptions?on_conflict=user_id', {
    method: 'POST',
    headers: { ...svc, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan,
      status: sub.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: !!sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }),
  });
  await rest(`users?id=eq.${userId}`, {
    method: 'PATCH',
    headers: { ...svc, Prefer: 'return=minimal' },
    body: JSON.stringify({ is_pro: isPro }),
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  if (!WEBHOOK_SECRET || !STRIPE_KEY) return new Response('payments not configured', { status: 501 });

  const raw = await req.text();
  if (!(await verifySignature(raw, req.headers.get('stripe-signature'), WEBHOOK_SECRET))) {
    return new Response('bad signature', { status: 400 });
  }

  try {
    const event = JSON.parse(raw);
    const obj = event.data?.object;

    if (event.type === 'checkout.session.completed' && obj?.mode === 'subscription' && obj.subscription) {
      // The session only carries the subscription id; fetch the real thing so
      // status / plan / period end come from Stripe, not from guesswork.
      const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${obj.subscription}`, {
        headers: { Authorization: `Bearer ${STRIPE_KEY}` },
      });
      if (!subRes.ok) throw new Error(`stripe subscription fetch -> ${subRes.status}`);
      await applySubscription(await subRes.json(), obj.client_reference_id ?? obj.metadata?.user_id);
    } else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await applySubscription(obj);
    }
    // Every other event type is acknowledged and ignored.
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('stripe-webhook failed', e);
    // 500 makes Stripe retry, which is what we want for a transient DB error.
    return new Response('handler error', { status: 500 });
  }
});
