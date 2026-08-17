-- ──────────────────────────────────────────────────────────
-- UpScore — Scalability RPCs
--   1. search_jobs()  — replaces client-side ILIKE/filter chain
--   2. get_skills_suggestions()  — replaces 1000-row client scan
--   3. get_countries_suggestions()  — replaces 500-row client scan
--   4. get_dashboard_stats()  — replaces 7 sequential count queries
--   5. get_system_stats()  — replaces 6 sequential count queries
--   6. bulk_upsert_jobs()  — replaces N+1 insert loop
-- ──────────────────────────────────────────────────────────

-- ── 1. search_jobs: filtered, paginated job search ──────
-- Uses CTE to scan table ONCE (not twice for COUNT + data).
-- LEFT JOIN LATERAL for analyses instead of correlated subquery.
-- 25s statement_timeout to survive cold-plan first calls.
CREATE OR REPLACE FUNCTION public.search_jobs(
  p_search text DEFAULT NULL,
  p_job_type text DEFAULT NULL,
  p_tier text DEFAULT NULL,
  p_budget_min numeric DEFAULT NULL,
  p_budget_max numeric DEFAULT NULL,
  p_hourly_min numeric DEFAULT NULL,
  p_hourly_max numeric DEFAULT NULL,
  p_skill text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_ids text[] DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  PERFORM set_config('statement_timeout', '25000', true);

  WITH matched AS (
    SELECT
      j.id, j.upwork_job_id, j.title, j.url,
      j.posted_at, j.budget, j.hourly_min, j.hourly_max,
      j.job_type, j.contractor_tier, j.duration_label, j.duration_weeks,
      j.skills, j.client_country, j.client_name, j.client_rating,
      j.client_total_assignments, j.client_total_hires, j.client_total_spend,
      j.client_member_since, j.client_industry, j.client_score,
      j.client_hours_count, j.client_feedback_count, j.client_payment_verified,
      j.client_city, j.client_company_size, j.client_total_jobs_with_hires,
      j.client_active_assignments, j.client_location_country,
      j.hours_per_week, j.proposals_count, j.total_invited, j.total_hired,
      j.payment_verified, j.category, j.source, j.client_recent_history,
      j.created_at,
      count(*) OVER() AS full_count
    FROM jobs j
    WHERE
      (p_search IS NULL OR p_search = '' OR
        j.title ILIKE '%' || p_search || '%' OR
        j.description ILIKE '%' || p_search || '%')
      AND (p_job_type IS NULL OR upper(replace(j.job_type, ' ', '')) = upper(replace(p_job_type, ' ', '')))
      AND (p_tier IS NULL OR j.contractor_tier = p_tier)
      AND (p_budget_min IS NULL OR j.budget >= p_budget_min)
      AND (p_budget_max IS NULL OR j.budget <= p_budget_max)
      AND (p_hourly_min IS NULL OR j.hourly_min >= p_hourly_min)
      AND (p_hourly_max IS NULL OR j.hourly_max <= p_hourly_max)
      AND (p_skill IS NULL OR p_skill = '' OR j.skills @> ARRAY[p_skill])
      AND (p_country IS NULL OR p_country = '' OR j.client_country ILIKE '%' || p_country || '%')
      AND (p_category IS NULL OR j.category = p_category)
      AND (p_ids IS NULL OR array_length(p_ids, 1) IS NULL OR j.id::text = ANY(p_ids))
    ORDER BY j.posted_at DESC NULLS LAST
    LIMIT p_limit OFFSET p_offset
  ),
  enriched AS (
    SELECT m.*,
      CASE WHEN la.analyses IS NOT NULL
        THEN json_build_array(la.analyses)
        ELSE '[]'::json
      END AS job_analyses
    FROM matched m
    LEFT JOIN LATERAL (
      SELECT json_build_object(
        'match_score', ja.match_score,
        'opportunity_score', ja.opportunity_score,
        'win_probability', ja.win_probability,
        'skills_match', ja.skills_match,
        'budget_fit', ja.budget_fit,
        'client_analysis', ja.client_analysis,
        'competition_analysis', ja.competition_analysis,
        'recommendation', ja.recommendation,
        'reasoning', ja.reasoning,
        'proposal_tips', ja.proposal_tips,
        'red_flags', ja.red_flags,
        'model_used', ja.model_used,
        'analyzed_at', ja.analyzed_at
      ) AS analyses
      FROM job_analyses ja WHERE ja.job_id = m.id
      ORDER BY ja.analyzed_at DESC NULLS LAST
      LIMIT 1
    ) la ON true
  )
  SELECT json_build_object(
    'jobs', coalesce(json_agg((row_to_json(e))::jsonb - 'full_count'), '[]'::json),
    'total', max(full_count)
  )
  INTO v_result
  FROM enriched e;

  RETURN v_result;
END;
$$;

-- ── 2. Skills suggestions: unique skills matching prefix ─
CREATE OR REPLACE FUNCTION public.get_skills_suggestions(
  p_query text,
  p_limit integer DEFAULT 10
)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(json_agg(DISTINCT s ORDER BY s), '[]'::json)
  FROM (
    SELECT unnest(skills) AS s
    FROM jobs
    WHERE skills IS NOT NULL
    ORDER BY posted_at DESC
    LIMIT 5000
  ) sub
  WHERE s ILIKE '%' || p_query || '%'
  LIMIT p_limit;
$$;

-- ── 3. Countries suggestions ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_countries_suggestions(
  p_query text,
  p_limit integer DEFAULT 10
)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(json_agg(DISTINCT c ORDER BY c), '[]'::json)
  FROM (
    SELECT DISTINCT client_country AS c
    FROM jobs
    WHERE client_country IS NOT NULL AND client_country <> ''
  ) sub
  WHERE c ILIKE '%' || p_query || '%'
  LIMIT p_limit;
$$;

-- ── 4. Dashboard stats: all counts in one query ─────────
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'savedJobs',      (SELECT count(*) FROM saved_jobs WHERE user_id = p_user_id),
    'totalAnalyses',  (SELECT count(*) FROM job_analyses WHERE user_id = p_user_id),
    'activeFilters',  (SELECT count(*) FROM job_filters WHERE user_id = p_user_id AND is_active = true),
    'activeRules',    (SELECT count(*) FROM notification_rules WHERE user_id = p_user_id AND is_active = true),
    'totalProposals', (SELECT count(*) FROM proposals WHERE user_id = p_user_id),
    'totalNotifications', (SELECT count(*) FROM notifications WHERE user_id = p_user_id),
    'totalChannels',  (SELECT count(*) FROM notification_channels WHERE user_id = p_user_id)
  );
$$;

-- ── 5. System stats: all counts in one query ────────────
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_one_day_ago timestamptz := now() - interval '24 hours';
  v_result json;
BEGIN
  SELECT json_build_object(
    'total_jobs',         (SELECT count(*) FROM jobs),
    'recent_jobs_24h',    (SELECT count(*) FROM jobs WHERE created_at >= v_one_day_ago),
    'total_analyses',     (SELECT count(*) FROM job_analyses),
    'recent_analyses_24h',(SELECT count(*) FROM job_analyses WHERE analyzed_at >= v_one_day_ago),
    'active_filters',     (SELECT count(*) FROM job_filters WHERE is_active = true),
    'active_rules',       (SELECT count(*) FROM notification_rules WHERE is_active = true),
    'last_analysis',      (SELECT max(analyzed_at) FROM job_analyses)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ── 6. Bulk upsert jobs: replaces N+1 insert loop ───────
CREATE OR REPLACE FUNCTION public.bulk_upsert_jobs(p_jobs jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_ids text[] := '{}';
  v_item jsonb;
  v_upsert_id text;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_jobs)
  LOOP
    INSERT INTO jobs (
      upwork_job_id, title, description, url, posted_at, budget,
      hourly_min, hourly_max, job_type, contractor_tier, skills,
      client_country, client_name, client_rating, client_total_spend,
      client_total_hires, client_total_assignments, client_member_since,
      client_industry, payment_verified, proposals_count, category,
      source, duration_label, duration_weeks, hours_per_week,
      total_invited, total_hired, client_recent_history
    ) VALUES (
      (v_item->>'upwork_job_id'),
      (v_item->>'title'),
      (v_item->>'description'),
      (v_item->>'url'),
      NULLIF((v_item->>'posted_at'), '')::timestamptz,
      NULLIF((v_item->>'budget'), '')::numeric,
      NULLIF((v_item->>'hourly_min'), '')::numeric,
      NULLIF((v_item->>'hourly_max'), '')::numeric,
      (v_item->>'job_type'),
      (v_item->>'contractor_tier'),
      CASE WHEN v_item->'skills' IS NOT NULL
           THEN ARRAY(SELECT jsonb_array_elements_text(v_item->'skills'))
           ELSE NULL END,
      (v_item->>'client_country'),
      (v_item->>'client_name'),
      NULLIF((v_item->>'client_rating'), '')::numeric,
      NULLIF((v_item->>'client_total_spend'), '')::numeric,
      NULLIF((v_item->>'client_total_hires'), '')::int,
      NULLIF((v_item->>'client_total_assignments'), '')::int,
      NULLIF((v_item->>'client_member_since'), '')::timestamptz,
      (v_item->>'client_industry'),
      COALESCE((v_item->>'payment_verified')::boolean, false),
      NULLIF((v_item->>'proposals_count'), '')::int,
      (v_item->>'category'),
      (v_item->>'source'),
      (v_item->>'duration_label'),
      NULLIF((v_item->>'duration_weeks'), '')::int,
      (v_item->>'hours_per_week'),
      NULLIF((v_item->>'total_invited'), '')::int,
      NULLIF((v_item->>'total_hired'), '')::int,
      CASE WHEN v_item->'client_recent_history' IS NOT NULL
           THEN v_item->'client_recent_history'::jsonb
           ELSE NULL END
    )
    ON CONFLICT (upwork_job_id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      url = EXCLUDED.url,
      posted_at = EXCLUDED.posted_at,
      budget = EXCLUDED.budget,
      hourly_min = EXCLUDED.hourly_min,
      hourly_max = EXCLUDED.hourly_max,
      skills = EXCLUDED.skills,
      client_country = EXCLUDED.client_country,
      client_name = EXCLUDED.client_name,
      client_rating = EXCLUDED.client_rating,
      client_total_spend = EXCLUDED.client_total_spend,
      proposals_count = EXCLUDED.proposals_count,
      client_recent_history = EXCLUDED.client_recent_history
    RETURNING id::text INTO v_upsert_id;

    v_new_ids := array_append(v_new_ids, v_upsert_id);
  END LOOP;

  RETURN json_build_object(
    'new_ids', v_new_ids,
    'count', array_length(v_new_ids, 1)
  );
END;
$$;

-- ── Grants ──────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.search_jobs(text,text,text,numeric,numeric,numeric,numeric,text,text,text,text[],integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_jobs(text,text,text,numeric,numeric,numeric,numeric,text,text,text,text[],integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_jobs(text,text,text,numeric,numeric,numeric,numeric,text,text,text,text[],integer,integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_skills_suggestions(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_skills_suggestions(text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_skills_suggestions(text,integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_countries_suggestions(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_countries_suggestions(text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_countries_suggestions(text,integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_dashboard_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_system_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_system_stats() TO service_role;

REVOKE ALL ON FUNCTION public.bulk_upsert_jobs(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_jobs(jsonb) TO service_role;
