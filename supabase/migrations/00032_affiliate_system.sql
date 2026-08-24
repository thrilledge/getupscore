-- Affiliate system tables

-- Affiliates (users who refer others)
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- Referral code (unique, user-friendly)
  referral_code TEXT NOT NULL UNIQUE,
  
  -- Commission settings (admin can customize per affiliate)
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 20.00,  -- percentage of sale
  commission_type TEXT NOT NULL DEFAULT 'percent' CHECK (commission_type IN ('percent', 'fixed')),
  fixed_commission_amount NUMERIC(10, 2) DEFAULT NULL,  -- used if type = 'fixed'
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'banned')),
  
  -- Stats (denormalized for fast reads)
  total_referrals INTEGER NOT NULL DEFAULT 0,
  total_signups INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,  -- referrals who became paid
  total_earned NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_paid_out NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  pending_commission NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  
  -- Payout info
  payout_method TEXT DEFAULT 'paypal' CHECK (payout_method IN ('paypal', 'bank', 'crypto')),
  payout_email TEXT,
  minimum_payout NUMERIC(10, 2) DEFAULT 50.00,
  
  -- Tracking
  total_clicks INTEGER NOT NULL DEFAULT 0,
  unique_clicks INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referral clicks (track every click on affiliate link)
CREATE TABLE IF NOT EXISTS referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  
  -- Visitor info
  visitor_ip TEXT,
  visitor_fingerprint TEXT,  -- client-side fingerprint for anonymous tracking
  user_agent TEXT,
  referrer_url TEXT,
  landing_page TEXT,
  
  -- Cookie-based tracking (30-day window)
  cookie_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  
  -- Did this click convert?
  converted BOOLEAN NOT NULL DEFAULT false,
  converted_user_id UUID,
  converted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referral signups (track when referred user signs up)
CREATE TABLE IF NOT EXISTS referral_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  
  -- The referred user
  user_id UUID NOT NULL,
  
  -- Source click
  click_id UUID REFERENCES referral_clicks(id),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'signup' CHECK (status IN ('signup', 'active', 'paid', 'expired')),
  
  -- When they upgraded to paid
  converted_at TIMESTAMPTZ,
  plan_purchased TEXT,  -- 'monthly' or 'yearly'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)  -- each user can only be referred once
);

-- Commissions (individual commission records)
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referral_signup_id UUID REFERENCES referral_signups(id),
  
  -- Transaction details
  paddle_transaction_id TEXT,
  customer_user_id UUID,
  plan TEXT NOT NULL,  -- 'monthly' or 'yearly'
  sale_amount NUMERIC(10, 2) NOT NULL,
  
  -- Commission
  commission_rate NUMERIC(5, 2) NOT NULL,
  commission_amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  
  -- Payout batch
  payout_id UUID,
  paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payout batches
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  
  amount NUMERIC(10, 2) NOT NULL,
  commission_count INTEGER NOT NULL DEFAULT 0,
  
  payout_method TEXT NOT NULL,
  payout_email TEXT,
  transaction_ref TEXT,  -- external payment reference
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  notes TEXT,
  
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Policies: users can read their own affiliate data
CREATE POLICY "Affiliates read own"
  ON affiliates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Affiliates insert own"
  ON affiliates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Affiliates update own"
  ON affiliates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Referral signups read own"
  ON referral_signups FOR SELECT
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "Commissions read own"
  ON commissions FOR SELECT
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

CREATE POLICY "Affiliate payouts read own"
  ON affiliate_payouts FOR SELECT
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Service role (admin) full access via functions
-- Clicks are public (insert via API, no auth needed)

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates (user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates (referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_affiliate_id ON referral_clicks (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON referral_clicks (referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_cookie ON referral_clicks (visitor_fingerprint, cookie_expires_at);
CREATE INDEX IF NOT EXISTS idx_referral_signups_affiliate_id ON referral_signups (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referral_signups_user_id ON referral_signups (user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_id ON commissions (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions (status);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON affiliate_payouts (affiliate_id);

-- RPC: Track a click
CREATE OR REPLACE FUNCTION track_affiliate_click(
  p_referral_code TEXT,
  p_visitor_ip TEXT DEFAULT NULL,
  p_visitor_fingerprint TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer_url TEXT DEFAULT NULL,
  p_landing_page TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_affiliate_id UUID;
  v_click_id UUID;
  v_existing_click UUID;
BEGIN
  -- Find affiliate
  SELECT id INTO v_affiliate_id
  FROM affiliates
  WHERE referral_code = p_referral_code AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Check for existing non-expired click from same fingerprint (dedup within 24h)
  IF p_visitor_fingerprint IS NOT NULL THEN
    SELECT id INTO v_existing_click
    FROM referral_clicks
    WHERE affiliate_id = v_affiliate_id
      AND visitor_fingerprint = p_visitor_fingerprint
      AND created_at > now() - INTERVAL '24 hours';
    
    IF FOUND THEN
      RETURN v_existing_click;
    END IF;
  END IF;
  
  -- Insert new click
  INSERT INTO referral_clicks (affiliate_id, referral_code, visitor_ip, visitor_fingerprint, user_agent, referrer_url, landing_page)
  VALUES (v_affiliate_id, p_referral_code, p_visitor_ip, p_visitor_fingerprint, p_user_agent, p_referrer_url, p_landing_page)
  RETURNING id INTO v_click_id;
  
  -- Update affiliate click counts
  UPDATE affiliates
  SET total_clicks = total_clicks + 1,
      unique_clicks = unique_clicks + 1,
      updated_at = now()
  WHERE id = v_affiliate_id;
  
  RETURN v_click_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Record a referral signup
CREATE OR REPLACE FUNCTION record_referral_signup(
  p_referral_code TEXT,
  p_user_id UUID,
  p_click_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_affiliate_id UUID;
BEGIN
  -- Find affiliate
  SELECT id INTO v_affiliate_id
  FROM affiliates
  WHERE referral_code = p_referral_code AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if user already referred
  IF EXISTS (SELECT 1 FROM referral_signups WHERE user_id = p_user_id) THEN
    RETURN false;
  END IF;
  
  -- Insert signup
  INSERT INTO referral_signups (affiliate_id, referral_code, user_id, click_id, status)
  VALUES (v_affiliate_id, p_referral_code, p_user_id, p_click_id, 'signup');
  
  -- Mark click as converted
  IF p_click_id IS NOT NULL THEN
    UPDATE referral_clicks
    SET converted = true, converted_user_id = p_user_id, converted_at = now()
    WHERE id = p_click_id;
  END IF;
  
  -- Update affiliate stats
  UPDATE affiliates
  SET total_referrals = total_referrals + 1,
      total_signups = total_signups + 1,
      updated_at = now()
  WHERE id = v_affiliate_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Record a commission
CREATE OR REPLACE FUNCTION record_commission(
  p_affiliate_id UUID,
  p_customer_user_id UUID,
  p_paddle_transaction_id TEXT,
  p_plan TEXT,
  p_sale_amount NUMERIC(10, 2)
)
RETURNS UUID AS $$
DECLARE
  v_affiliate RECORD;
  v_commission_id UUID;
  v_commission_amount NUMERIC(10, 2);
  v_referral_id UUID;
BEGIN
  -- Get affiliate details
  SELECT * INTO v_affiliate
  FROM affiliates
  WHERE id = p_affiliate_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Calculate commission
  IF v_affiliate.commission_type = 'percent' THEN
    v_commission_amount := p_sale_amount * (v_affiliate.commission_rate / 100);
  ELSE
    v_commission_amount := COALESCE(v_affiliate.fixed_commission_amount, 0);
  END IF;
  
  -- Find the referral signup
  SELECT id INTO v_referral_id
  FROM referral_signups
  WHERE user_id = p_customer_user_id AND affiliate_id = p_affiliate_id;
  
  -- Insert commission record
  INSERT INTO commissions (affiliate_id, referral_signup_id, paddle_transaction_id, customer_user_id, plan, sale_amount, commission_rate, commission_amount, status)
  VALUES (p_affiliate_id, v_referral_id, p_paddle_transaction_id, p_customer_user_id, p_plan, p_sale_amount, v_affiliate.commission_rate, v_commission_amount, 'pending')
  RETURNING id INTO v_commission_id;
  
  -- Update referral status to 'paid'
  IF v_referral_id IS NOT NULL THEN
    UPDATE referral_signups
    SET status = 'paid', converted_at = now(), plan_purchased = p_plan, updated_at = now()
    WHERE id = v_referral_id;
  END IF;
  
  -- Update affiliate stats
  UPDATE affiliates
  SET total_conversions = total_conversions + 1,
      total_earned = total_earned + v_commission_amount,
      pending_commission = pending_commission + v_commission_amount,
      updated_at = now()
  WHERE id = p_affiliate_id;
  
  RETURN v_commission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get affiliate dashboard stats
CREATE OR REPLACE FUNCTION get_affiliate_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_affiliate RECORD;
  result JSONB;
BEGIN
  SELECT * INTO v_affiliate
  FROM affiliates
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('registered', false);
  END IF;
  
  result := jsonb_build_object(
    'registered', true,
    'referral_code', v_affiliate.referral_code,
    'status', v_affiliate.status,
    'commission_rate', v_affiliate.commission_rate,
    'commission_type', v_affiliate.commission_type,
    'total_clicks', v_affiliate.total_clicks,
    'unique_clicks', v_affiliate.unique_clicks,
    'total_referrals', v_affiliate.total_referrals,
    'total_signups', v_affiliate.total_signups,
    'total_conversions', v_affiliate.total_conversions,
    'total_earned', v_affiliate.total_earned,
    'total_paid_out', v_affiliate.total_paid_out,
    'pending_commission', v_affiliate.pending_commission,
    'payout_method', v_affiliate.payout_method,
    'payout_email', v_affiliate.payout_email,
    'minimum_payout', v_affiliate.minimum_payout,
    'conversion_rate', CASE
      WHEN v_affiliate.total_clicks > 0
      THEN ROUND((v_affiliate.total_conversions::NUMERIC / v_affiliate.total_clicks) * 100, 1)
      ELSE 0
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
