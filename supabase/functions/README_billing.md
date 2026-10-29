# Phase Pro billing (Stripe)

Three edge functions + one table. Nothing charges anyone until the two secrets
below exist; with no secrets every function answers 501 "payments_not_configured".

| Function | JWT | Job |
|---|---|---|
| `create-checkout-session` | required | Returns a Stripe Checkout URL for `monthly` ($6.99) or `yearly` ($49.99). Amounts are defined in the function (inline `price_data`), so no Products/Prices need creating in Stripe. |
| `stripe-webhook` | **off** (Stripe can't send one; authenticated by signature) | The ONLY thing that sets `users.is_pro` for a paying customer, and writes `billing_subscriptions`. |
| `create-portal-session` | required | Opens Stripe's Customer Portal so a member can update their card or cancel. |

## Switch it on (Stripe test mode first)

1. Stripe dashboard -> Developers -> API keys -> copy the **Secret key** (`sk_test_...`).
2. Stripe dashboard -> Developers -> Webhooks -> Add endpoint:
   `https://dnfcrpthpinilibvqwtf.supabase.co/functions/v1/stripe-webhook`
   events: `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
   Copy the **Signing secret** (`whsec_...`).
3. Stripe dashboard -> Settings -> Billing -> Customer portal -> turn it on.
4. Supabase dashboard -> Edge Functions -> Secrets, add:
   - `STRIPE_SECRET_KEY` = the `sk_...` key
   - `STRIPE_WEBHOOK_SECRET` = the `whsec_...` secret
   - optional `ALLOWED_ORIGINS` = extra production origins, e.g. `https://phase.app`
     (localhost and `phaseofficial*.vercel.app` are already allowed)
5. Test with card `4242 4242 4242 4242`, any future date, any CVC.

## Going live
Repeat 1-4 with live keys (`sk_live_...`, a live-mode webhook). Do NOT do this
until Pro is actually enforced in the app (see CLAUDE.md "Locked Behind Pro").

## Hiding the offer
Set `REACT_APP_PAYMENTS_ENABLED=false` in the host env to drop the paywall step
from onboarding.
