-- 00043_add_paddle_customer_id.sql
-- Stores the Paddle customer id so billing features (payment methods,
-- invoices, portal) can call the Paddle API per user.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_customer_id
  ON subscriptions(paddle_customer_id);

-- RPC: upsert subscription (called by webhook + activate route)
-- Now also persists the Paddle customer id.
CREATE OR REPLACE FUNCTION upsert_subscription(
  p_user_id UUID,
  p_paddle_subscription_id TEXT,
  p_paddle_plan_id TEXT,
  p_status TEXT,
  p_current_period_end TIMESTAMPTZ,
  p_paddle_customer_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO subscriptions (user_id, paddle_subscription_id, paddle_plan_id, status, current_period_end, paddle_customer_id, updated_at)
  VALUES (p_user_id, p_paddle_subscription_id, p_paddle_plan_id, p_status, p_current_period_end, p_paddle_customer_id, now())
  ON CONFLICT (user_id) DO UPDATE SET
    paddle_subscription_id = EXCLUDED.paddle_subscription_id,
    paddle_plan_id = EXCLUDED.paddle_plan_id,
    status = EXCLUDED.status,
    current_period_end = EXCLUDED.current_period_end,
    paddle_customer_id = COALESCE(EXCLUDED.paddle_customer_id, subscriptions.paddle_customer_id),
    updated_at = now();
END;
$$;

-- RPC: get full billing row for a user (raw Paddle ids, status, period).
CREATE OR REPLACE FUNCTION get_billing_details(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
BEGIN
  SELECT paddle_subscription_id, paddle_plan_id, paddle_customer_id, status, current_period_end
  INTO rec
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'paddle_subscription_id', rec.paddle_subscription_id,
    'paddle_plan_id', rec.paddle_plan_id,
    'paddle_customer_id', rec.paddle_customer_id,
    'status', rec.status,
    'current_period_end', rec.current_period_end
  );
END;
$$;