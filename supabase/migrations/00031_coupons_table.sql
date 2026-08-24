-- Coupons table for Paddle discount codes
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Discount type
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(10, 2) NOT NULL,
  
  -- Limits
  max_uses INTEGER,            -- NULL = unlimited
  used_count INTEGER NOT NULL DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  
  -- Plan restrictions (NULL = all plans)
  allowed_plans TEXT[],         -- e.g. {'monthly', 'yearly'} or NULL for all
  
  -- Validity
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  -- Status
  active BOOLEAN NOT NULL DEFAULT true,
  
  -- Who created it
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track who used which coupon
CREATE TABLE IF NOT EXISTS coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  transaction_id TEXT,          -- Paddle transaction ID
  discount_applied NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(coupon_id, user_id)   -- one use per user per coupon (unless max_uses_per_user > 1)
);

-- RPC: Validate a coupon code
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code TEXT,
  p_user_id UUID DEFAULT NULL,
  p_plan TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_coupon RECORD;
  v_uses INTEGER;
  result JSONB;
BEGIN
  -- Find coupon
  SELECT * INTO v_coupon
  FROM coupons
  WHERE upper(code) = upper(p_code)
    AND active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid coupon code');
  END IF;
  
  -- Check expiry
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This coupon has expired');
  END IF;
  
  -- Check start date
  IF v_coupon.starts_at IS NOT NULL AND v_coupon.starts_at > now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This coupon is not active yet');
  END IF;
  
  -- Check max total uses
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This coupon has reached its usage limit');
  END IF;
  
  -- Check plan restriction
  IF v_coupon.allowed_plans IS NOT NULL AND p_plan IS NOT NULL THEN
    IF NOT (p_plan = ANY(v_coupon.allowed_plans)) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'This coupon is not valid for this plan');
    END IF;
  END IF;
  
  -- Check per-user usage
  IF p_user_id IS NOT NULL THEN
    SELECT count(*) INTO v_uses
    FROM coupon_usages
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
    
    IF v_uses >= v_coupon.max_uses_per_user THEN
      RETURN jsonb_build_object('valid', false, 'error', 'You have already used this coupon');
    END IF;
  END IF;
  
  -- Calculate final discount
  result := jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'description', v_coupon.description
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Apply a coupon (mark as used)
CREATE OR REPLACE FUNCTION apply_coupon(
  p_coupon_id UUID,
  p_user_id UUID,
  p_transaction_id TEXT,
  p_discount_applied NUMERIC(10, 2)
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert usage record
  INSERT INTO coupon_usages (coupon_id, user_id, transaction_id, discount_applied)
  VALUES (p_coupon_id, p_user_id, p_transaction_id, p_discount_applied)
  ON CONFLICT (coupon_id, user_id) DO UPDATE SET
    discount_applied = p_discount_applied,
    transaction_id = p_transaction_id;
  
  -- Increment used_count on coupon
  UPDATE coupons
  SET used_count = used_count + 1,
      updated_at = now()
  WHERE id = p_coupon_id;
  
  -- Auto-deactivate if max uses reached
  UPDATE coupons
  SET active = false,
      updated_at = now()
  WHERE id = p_coupon_id
    AND max_uses IS NOT NULL
    AND used_count >= max_uses;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get coupon stats
CREATE OR REPLACE FUNCTION get_coupon_stats()
RETURNS JSONB AS $$
DECLARE
  total_coupons INTEGER;
  active_coupons INTEGER;
  total_uses INTEGER;
  total_discount NUMERIC(10, 2);
BEGIN
  SELECT count(*) INTO total_coupons FROM coupons;
  SELECT count(*) INTO active_coupons FROM coupons WHERE active = true;
  SELECT count(*), coalesce(sum(discount_applied), 0)
    INTO total_uses, total_discount
    FROM coupon_usages;
  
  RETURN jsonb_build_object(
    'total_coupons', total_coupons,
    'active_coupons', active_coupons,
    'total_uses', total_uses,
    'total_discount', total_discount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

-- Only service role (admin) can access
CREATE POLICY "Admin full access on coupons"
  ON coupons FOR ALL
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'is_admin' = 'true'));

CREATE POLICY "Admin full access on coupon_usages"
  ON coupon_usages FOR ALL
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'is_admin' = 'true'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (upper(code));
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON coupon_usages (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_id ON coupon_usages (user_id);
