-- Add Paddle discount tracking to coupons table
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS paddle_discount_id TEXT;

-- Update existing SUMMER10 coupon with Paddle discount ID
UPDATE coupons SET paddle_discount_id = 'dsc_01m0sdkq9tkmr2gxbh8fw5kptp' WHERE code = 'SUMMER10';
