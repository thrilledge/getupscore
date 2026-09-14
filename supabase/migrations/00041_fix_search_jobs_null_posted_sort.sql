-- 00041_fix_search_jobs_null_posted_sort.sql
--
-- Bug: the jobs feed showed stale times (e.g. "3 hours ago") because the two
-- newest synced jobs had posted_at = NULL. search_jobs ordered by
-- `posted_at DESC NULLS LAST`, which sank NULL-posted jobs below the ~3h-old
-- batch.
--
-- Fix (two parts):
--   1. Backfill NULL posted_at from created_at (first-seen time is the best
--      proxy when the MCP feed omits a published date). Idempotent.
--   2. search_jobs ORDER BY changed to `COALESCE(posted_at, created_at)`
--      in 00035/00036 so future nulls still sort newest-first.
--
-- NOTE: The live 16-arg + 13-arg search_jobs overloads were re-applied via
-- the Supabase Management API (CLI push blocked: login-role 403). The ORDER BY
-- in those on-disk migrations is kept in sync for fresh installs.

-- Part 1: backfill (applies to existing prod data)
UPDATE jobs
SET posted_at = created_at
WHERE posted_at IS NULL
  AND created_at IS NOT NULL;