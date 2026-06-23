-- User's own Upwork freelancer profile
CREATE TABLE IF NOT EXISTS upwork_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  upwork_url TEXT,
  title TEXT,
  bio TEXT,
  skills TEXT[],
  hourly_rate DECIMAL(10,2),
  total_earnings DECIMAL(12,2) DEFAULT 0,
  total_jobs_done INTEGER DEFAULT 0,
  total_hours DECIMAL(10,2) DEFAULT 0,
  member_since DATE,
  client_rating DECIMAL(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upwork_profiles_user_id ON upwork_profiles(user_id);

ALTER TABLE upwork_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own upwork profile"
  ON upwork_profiles FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage own upwork profile"
  ON upwork_profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own upwork profile"
  ON upwork_profiles FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION update_upwork_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_upwork_profiles_updated_at
  BEFORE UPDATE ON upwork_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_upwork_profiles_updated_at();
