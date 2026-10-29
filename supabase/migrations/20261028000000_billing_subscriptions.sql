-- Stripe linkage for Phase Pro. Kept OUT of public.users on purpose so the
-- shared protect_user_columns() trigger never has to know about it, and
-- clients can read their own row but can never write it. Only the
-- stripe-webhook edge function (service role) writes here and flips
-- users.is_pro. Applied to production 2026-10-28.
create table if not exists public.billing_subscriptions (
  user_id uuid primary key references public.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  plan text check (plan in ('monthly','yearly')),
  status text not null default 'incomplete',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists billing_subscriptions_customer_idx
  on public.billing_subscriptions (stripe_customer_id);

alter table public.billing_subscriptions enable row level security;
revoke all on public.billing_subscriptions from anon, authenticated;
grant select on public.billing_subscriptions to authenticated;

drop policy if exists "billing: read own" on public.billing_subscriptions;
create policy "billing: read own" on public.billing_subscriptions
  for select to authenticated using (user_id = auth.uid());
