-- ──────────────────────────────────────────────────────────
-- UpScore — Enriched client stats from authenticated API
-- ──────────────────────────────────────────────────────────

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS client_score NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS client_hours_count NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS client_feedback_count INTEGER,
  ADD COLUMN IF NOT EXISTS client_payment_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_city TEXT,
  ADD COLUMN IF NOT EXISTS client_company_size TEXT,
  ADD COLUMN IF NOT EXISTS client_total_jobs_with_hires INTEGER,
  ADD COLUMN IF NOT EXISTS client_active_assignments INTEGER,
  ADD COLUMN IF NOT EXISTS client_location_country TEXT;
