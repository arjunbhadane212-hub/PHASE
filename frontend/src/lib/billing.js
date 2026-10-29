import { supabase } from './supabaseClient';

// Phase Pro pricing. Source of truth: CLAUDE.md -> Monetization. The amounts
// that are actually CHARGED live in the create-checkout-session edge function;
// keep the two in step.
export const PLANS = {
  yearly: { id: 'yearly', label: 'Yearly', price: 49.99, perMonth: 4.17, cadence: 'year' },
  monthly: { id: 'monthly', label: 'Monthly', price: 6.99, perMonth: 6.99, cadence: 'month' },
};
export const SAVE_PCT = 40; // 49.99 vs 12 x 6.99 = 83.88

// The paywall step in onboarding is on by default. Set
// REACT_APP_PAYMENTS_ENABLED=false in the host's env to hide it.
export const PAYWALL_ENABLED = process.env.REACT_APP_PAYMENTS_ENABLED !== 'false';

export const money = (n) => `$${n.toFixed(2)}`;

// Edge-function errors come back as FunctionsHttpError with the Response on
// .context; unwrap it so callers get a stable `code` to branch on.
async function callFn(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let payload = null;
    try { payload = await error.context.json(); } catch { /* not JSON */ }
    const err = new Error(payload?.message || payload?.error || error.message || 'Request failed');
    err.code = payload?.error || 'request_failed';
    throw err;
  }
  return data;
}

// Sends the browser to Stripe's hosted Checkout. Resolves (without navigating)
// only if the user is already Pro. Throws with err.code === 'payments_not_configured'
// until Stripe keys are added to the project.
export async function startCheckout(plan) {
  const data = await callFn('create-checkout-session', { plan, origin: window.location.origin });
  if (data?.already_pro) return { alreadyPro: true };
  if (!data?.url) {
    const err = new Error('No checkout URL returned');
    err.code = 'no_url';
    throw err;
  }
  window.location.assign(data.url);
  return { redirected: true };
}

export async function openBillingPortal() {
  const data = await callFn('create-portal-session', { origin: window.location.origin });
  if (!data?.url) {
    const err = new Error('No portal URL returned');
    err.code = 'no_url';
    throw err;
  }
  window.location.assign(data.url);
}
