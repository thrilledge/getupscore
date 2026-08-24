-- Add bank details to affiliate_payouts for manual payout requests
ALTER TABLE affiliate_payouts
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT;
