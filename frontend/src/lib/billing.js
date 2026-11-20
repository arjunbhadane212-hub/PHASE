import { supabase } from './supabaseClient';

// Phase Pro pricing. Source of truth: CLAUDE.md -> Monetization. The amounts
// that are actually CHARGED live in the create-checkout-session edge function;
// keep the two in step.
export const PLANS = {
  yearly: { id: 'yearly', label: 'Yearly', price: 49.99, perMonth: 4.17, cadence: 'year' },
  monthly: { id: 'monthly', label: 'Monthly', price: 6.99, perMonth: 6.99, cadence: 'month' },
};
export const SAVE_PCT = 40; // 49.99 vs 12 x 6.99 = 83.88

// Billing / Pro UI is OFF for v1. Nothing is functionally gated behind is_pro
// in the app, Stripe isn't wired up, and Google Play forbids an external
// payment flow for digital goods — so the onboarding paywall step and the
// Settings "Plan" card both stay hidden until we deliberately switch them on.
// Flip it back on per-build with REACT_APP_PAYMENTS_ENABLED=true once Stripe +
// the stores' in-app billing are in place.
export const PAYWALL_ENABLED = process.env.REACT_APP_PAYMENTS_ENABLED === 'true';

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
