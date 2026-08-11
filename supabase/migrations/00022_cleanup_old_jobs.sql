-- ──────────────────────────────────────────────────────────
-- UpScore — Safe old-job cleanup RPC
--
--   Problem (P1): EC2 ingest ran a raw REST DELETE on jobs
--   older than 10 days. Because job_analyses / saved_jobs /
--   proposals / notifications / job_scores reference jobs
--   with ON DELETE CASCADE, that wiped user data (analyses,
--   saved jobs, proposals) as a side effect.
--
--   This migration:
--     1. Adds cleanup_old_jobs RPC that deletes ONLY
--        unreferenced jobs older than p_days (default 90),
--        protecting any job still referenced by user data.
--     2. Deletes in batches (p_batch, default 500) so each
--        RPC call is a short transaction — the Vercel cron
--        loops the call until remaining = 0.
--
--   Called via service_role by the Vercel cron route.
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_old_jobs(
  p_days integer DEFAULT 90,
  p_batch integer DEFAULT 500
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := GREATEST(COALESCE(p_days, 90), 1);
  v_batch integer := GREATEST(COALESCE(p_batch, 500), 1);
  v_cutoff timestamptz := now() - make_interval(days => v_days);
  v_deleted integer;
  v_remaining bigint;
BEGIN
  DELETE FROM jobs j
  WHERE j.id IN (
    SELECT j2.id
    FROM jobs j2
    WHERE COALESCE(j2.posted_at, j2.created_at) < v_cutoff
      AND NOT EXISTS (SELECT 1 FROM job_analyses a WHERE a.job_id = j2.id)
      AND NOT EXISTS (SELECT 1 FROM saved_jobs s WHERE s.job_id = j2.id)
      AND NOT EXISTS (SELECT 1 FROM proposals p WHERE p.job_id = j2.id)
      AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.job_id = j2.id)
      AND NOT EXISTS (SELECT 1 FROM job_scores sc WHERE sc.job_id = j2.id)
    LIMIT v_batch
  );
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  SELECT count(*)
  INTO v_remaining
  FROM jobs j2
  WHERE COALESCE(j2.posted_at, j2.created_at) < v_cutoff
    AND NOT EXISTS (SELECT 1 FROM job_analyses a WHERE a.job_id = j2.id)
    AND NOT EXISTS (SELECT 1 FROM saved_jobs s WHERE s.job_id = j2.id)
    AND NOT EXISTS (SELECT 1 FROM proposals p WHERE p.job_id = j2.id)
    AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.job_id = j2.id)
    AND NOT EXISTS (SELECT 1 FROM job_scores sc WHERE sc.job_id = j2.id);

  RETURN json_build_object(
    'retentionDays', v_days,
    'deleted', v_deleted,
    'remaining', v_remaining
  );
END;
$$;

-- Only the system (service_role) may run cleanup — never end users.
REVOKE ALL ON FUNCTION public.cleanup_old_jobs(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_jobs(integer, integer) TO service_role;
