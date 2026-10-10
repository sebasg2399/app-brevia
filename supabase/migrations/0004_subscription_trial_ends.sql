-- Brevia MVP — add trial_ends_at to subscriptions (idempotent)
-- WU-4: Stripe Billing

alter table public.subscriptions
  add column if not exists trial_ends_at timestamptz;