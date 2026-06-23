-- ──────────────────────────────────────────────────────────
-- UpScore — Add full filter/analysis fields to jobs table
-- ──────────────────────────────────────────────────────────

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS job_type TEXT,
  ADD COLUMN IF NOT EXISTS contractor_tier TEXT,
  ADD COLUMN IF NOT EXISTS weekly_retainer NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS duration_label TEXT,
  ADD COLUMN IF NOT EXISTS duration_weeks INTEGER,
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upwork_graphql',
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_rating NUMERIC(3, 2),
  ADD COLUMN IF NOT EXISTS proposals_count INTEGER;

-- Drop old migration file if it exists
DROP INDEX IF EXISTS idx_jobs_category;
DROP INDEX IF EXISTS idx_jobs_source;
DROP INDEX IF EXISTS idx_jobs_payment_verified;

-- New indexes for filters
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_contractor_tier ON jobs(contractor_tier);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_payment_verified ON jobs(payment_verified);
CREATE INDEX IF NOT EXISTS idx_jobs_skills ON jobs USING gin(skills);
