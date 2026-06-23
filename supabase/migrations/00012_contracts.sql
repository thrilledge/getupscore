-- Upwork contracts (active + history)
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upwork_contract_id TEXT UNIQUE,
  title TEXT NOT NULL,
  client_name TEXT,
  client_url TEXT,
  client_rating DECIMAL(3,2),
  type TEXT NOT NULL CHECK (type IN ('hourly', 'fixed')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
  hourly_rate DECIMAL(10,2),
  fixed_price DECIMAL(12,2),
  total_hours DECIMAL(10,2) DEFAULT 0,
  total_earned DECIMAL(12,2) DEFAULT 0,
  started_at DATE,
  ended_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_upwork_id ON contracts(upwork_contract_id);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contracts"
  ON contracts FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage own contracts"
  ON contracts FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own contracts"
  ON contracts FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own contracts"
  ON contracts FOR DELETE
  USING ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contracts_updated_at();
