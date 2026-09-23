-- 00049_add_subscriptions_canceled_at.sql
-- The revenue admin route selects canceled_at, but the column never existed in
-- the subscriptions table. Adding it now (idempotent) so revenue calculations
-- (churn, active-during) work. Existing rows have no cancellation timestamp, so
-- they are treated as never-canceled, which matches current behaviour.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;