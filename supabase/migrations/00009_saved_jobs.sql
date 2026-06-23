-- ──────────────────────────────────────────────────────────
-- Saved Jobs (Favorites)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- Enable RLS
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

-- Policies: Users can manage their own saved jobs
CREATE POLICY "users can select own saved jobs"
  ON saved_jobs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "users can insert own saved jobs"
  ON saved_jobs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users can delete own saved jobs"
  ON saved_jobs FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Allow service_role full access for admin operations
CREATE POLICY "service_role full access on saved_jobs"
  ON saved_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
