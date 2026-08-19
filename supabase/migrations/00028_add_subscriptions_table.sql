-- 00028_add_subscriptions_table.sql
-- Tracks Paddle subscription status per user.

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paddle_subscription_id TEXT UNIQUE NOT NULL,
  paddle_plan_id TEXT,
  status TEXT NOT NULL DEFAULT 'free',
  -- free | active | canceled | past_due | paused
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (webhook inserts/updates)
CREATE POLICY "Service role manages subscriptions"
  ON subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_paddle_id ON subscriptions(paddle_subscription_id);

-- RPC: check if user has active subscription
CREATE OR REPLACE FUNCTION check_subscription(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  sub_record RECORD;
BEGIN
  SELECT status, current_period_end, paddle_plan_id
  INTO sub_record
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    result := '{"plan":"free","status":"free","is_paid":false}'::jsonb;
  ELSIF sub_record.status = 'active' AND (
    sub_record.current_period_end IS NULL OR
    sub_record.current_period_end > now()
  ) THEN
    result := jsonb_build_object(
      'plan', 'pro',
      'status', sub_record.status,
      'is_paid', true,
      'current_period_end', sub_record.current_period_end
    );
  ELSE
    result := jsonb_build_object(
      'plan', 'free',
      'status', sub_record.status,
      'is_paid', false
    );
  END IF;

  RETURN result;
END;
$$;

-- RPC: upsert subscription (called by webhook)
CREATE OR REPLACE FUNCTION upsert_subscription(
  p_user_id UUID,
  p_paddle_subscription_id TEXT,
  p_paddle_plan_id TEXT,
  p_status TEXT,
  p_current_period_end TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO subscriptions (user_id, paddle_subscription_id, paddle_plan_id, status, current_period_end, updated_at)
  VALUES (p_user_id, p_paddle_subscription_id, p_paddle_plan_id, p_status, p_current_period_end, now())
  ON CONFLICT (user_id) DO UPDATE SET
    paddle_subscription_id = EXCLUDED.paddle_subscription_id,
    paddle_plan_id = EXCLUDED.paddle_plan_id,
    status = EXCLUDED.status,
    current_period_end = EXCLUDED.current_period_end,
    updated_at = now();
END;
$$;

-- RPC: cancel subscription
CREATE OR REPLACE FUNCTION cancel_subscription(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE subscriptions
  SET status = 'canceled', updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;
