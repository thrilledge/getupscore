-- ──────────────────────────────────────────────────────────
-- Add category and subcategory fields to job_filters
-- to match Upwork search page sidebar filters.
-- ──────────────────────────────────────────────────────────

ALTER TABLE job_filters
  ADD COLUMN category TEXT,
  ADD COLUMN subcategory TEXT;
