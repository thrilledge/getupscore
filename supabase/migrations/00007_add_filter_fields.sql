-- ──────────────────────────────────────────────────────────
-- Add job_type, contractor_tier, hourly range, and skills
-- to job_filters table to match backend API filter params.
-- ──────────────────────────────────────────────────────────

ALTER TABLE job_filters
  ADD COLUMN job_type TEXT,
  ADD COLUMN contractor_tier TEXT,
  ADD COLUMN hourly_min NUMERIC(10, 2),
  ADD COLUMN hourly_max NUMERIC(10, 2),
  ADD COLUMN skills TEXT[] NOT NULL DEFAULT '{}';
