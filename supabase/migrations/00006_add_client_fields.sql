-- ──────────────────────────────────────────────────────────
-- UpScore — Add client details and workload fields
-- ──────────────────────────────────────────────────────────

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS hours_per_week TEXT,
  ADD COLUMN IF NOT EXISTS client_total_assignments INTEGER,
  ADD COLUMN IF NOT EXISTS client_total_hires INTEGER,
  ADD COLUMN IF NOT EXISTS client_total_spend NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS client_member_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_industry TEXT,
  ADD COLUMN IF NOT EXISTS total_invited INTEGER,
  ADD COLUMN IF NOT EXISTS total_hired INTEGER;

CREATE INDEX IF NOT EXISTS idx_jobs_hours_per_week ON jobs(hours_per_week);
CREATE INDEX IF NOT EXISTS idx_jobs_client_industry ON jobs(client_industry);
