-- ──────────────────────────────────────────────────────────
-- UpScore — Drop redundant / unused indexes
--
--   Bloat reduction (P3). These indexes are never used:
--     • idx_jobs_upwork_job_id  — duplicate of the UNIQUE
--       constraint index jobs_upwork_job_id_key
--     • idx_jobs_proposals_count — no WHERE/ORDER on it
--       (jobs list filters by id, budget, hourly, country)
--     • idx_jobs_hours_per_week — no WHERE/ORDER on it
--     • idx_jobs_client_industry — no WHERE/ORDER on it
--
--   Dropping frees space and speeds up writes (ingest).
-- ──────────────────────────────────────────────────────────

DROP INDEX IF EXISTS public.idx_jobs_upwork_job_id;
DROP INDEX IF EXISTS public.idx_jobs_proposals_count;
DROP INDEX IF EXISTS public.idx_jobs_hours_per_week;
DROP INDEX IF EXISTS public.idx_jobs_client_industry;
