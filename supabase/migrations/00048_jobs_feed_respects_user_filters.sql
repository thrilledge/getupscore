-- Make the jobs feed respect each user's ACTIVE job_filters (non-hardcoded,
-- applies to every user).
--
-- Before this migration search_jobs returned EVERY job regardless of the
-- user's saved filters, so the dashboard feed was cluttered with irrelevant
-- posts (e.g. video-editing jobs surfacing for pure dev filters).
--
-- New behavior when p_user_id is provided:
--   * Browse-all when the user has NO active filters (unchanged).
--   * Otherwise a job is visible ONLY if:
--       1. it matches >=1 active filter (same rules as the app's
--          jobMatchesFilter, but keywords match title/skills/category/
--          subcategory instead of the free-text description), OR
--       2. the user already has a non-dismissed analysis (recommendation not
--          hide/skip and skills_match.overall_fit != 'Weak') for it.
--   * A job whose existing analysis is Weak or hide/skip is suppressed even if
--     a filter superficially matches (AI/user verdict wins over loose match).
--   * Explicit p_ids (saved jobs) always bypass the filter gate.
--
-- Also drops description from keyword matching in the SQL feed gate so a
-- keyword like "editing" no longer matches jobs that merely mention it in the
-- description prose (root cause of the video-editor false positives).

CREATE OR REPLACE FUNCTION public.user_filter_matches_job(
  p_user_id uuid,
  p_job_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job record;
  v_filter record;
  v_haystack text;
  v_country text;
BEGIN
  SELECT * INTO v_job FROM jobs WHERE id = p_job_id;
  IF NOT FOUND THEN RETURN false; END IF;

  FOR v_filter IN
    SELECT * FROM job_filters
    WHERE user_id = p_user_id AND is_active = true
  LOOP
    -- Keywords: every keyword must appear in (title, skills, category,
    -- subcategory). DESCRIPTION is intentionally excluded — it is free-text
    -- prose, not a structured signal, and matches there cause false positives.
    IF coalesce(array_length(v_filter.keywords, 1), 0) > 0 THEN
      v_haystack := lower(
        coalesce(v_job.title, '') || E'\n' ||
        coalesce(array_to_string(v_job.skills, ' '), '') || E'\n' ||
        coalesce(v_job.category, '') || E'\n' ||
        coalesce(v_job.subcategory, '')
      );
      IF NOT EXISTS (
        SELECT 1 FROM unnest(v_filter.keywords) k
        WHERE v_haystack ~ ('[[:<:]]' || lower(k) || '[[:>:]]')
      ) THEN
        CONTINUE;
      END IF;
    END IF;

    -- Job type (HOURLY vs FIXED) — both sides normalized.
    IF v_filter.job_type IS NOT NULL AND v_filter.job_type <> '' THEN
      IF public.normalize_job_type(v_job.job_type) IS DISTINCT FROM public.normalize_job_type(v_filter.job_type) THEN
        CONTINUE;
      END IF;
    END IF;

    -- Contractor tier — both sides normalized.
    IF v_filter.contractor_tier IS NOT NULL AND v_filter.contractor_tier <> '' THEN
      IF public.normalize_tier(v_job.contractor_tier) IS DISTINCT FROM public.normalize_tier(v_filter.contractor_tier) THEN
        CONTINUE;
      END IF;
    END IF;

    -- Category / subcategory (exact, case-insensitive).
    IF v_filter.category IS NOT NULL AND v_filter.category <> ''
       AND lower(coalesce(v_job.category, '')) <> lower(v_filter.category) THEN
      CONTINUE;
    END IF;
    IF v_filter.subcategory IS NOT NULL AND v_filter.subcategory <> ''
       AND lower(coalesce(v_job.subcategory, '')) <> lower(v_filter.subcategory) THEN
      CONTINUE;
    END IF;

    -- Fixed-price budget range (only applies to fixed jobs carrying a budget).
    IF v_job.budget IS NOT NULL THEN
      IF v_filter.min_budget IS NOT NULL AND v_job.budget < v_filter.min_budget THEN CONTINUE; END IF;
      IF v_filter.max_budget IS NOT NULL AND v_job.budget > v_filter.max_budget THEN CONTINUE; END IF;
    END IF;

    -- Hourly rate range (only applies to hourly jobs carrying a rate).
    IF v_job.hourly_min IS NOT NULL THEN
      IF v_filter.hourly_min IS NOT NULL AND v_job.hourly_min < v_filter.hourly_min THEN CONTINUE; END IF;
      IF v_filter.hourly_max IS NOT NULL AND v_job.hourly_min > v_filter.hourly_max THEN CONTINUE; END IF;
    END IF;

    -- Skills overlap (any; filters with skills require the job to have some too).
    IF coalesce(array_length(v_filter.skills, 1), 0) > 0 THEN
      IF v_job.skills IS NULL OR coalesce(array_length(v_job.skills, 1), 0) = 0 THEN CONTINUE; END IF;
      IF NOT EXISTS (
        SELECT 1 FROM unnest(v_filter.skills) fs, unnest(v_job.skills) js
        WHERE lower(fs) = lower(js)
      ) THEN CONTINUE; END IF;
    END IF;

    -- Client country (case-insensitive substring).
    IF coalesce(array_length(v_filter.client_countries, 1), 0) > 0 THEN
      v_country := lower(coalesce(v_job.client_location_country, v_job.client_country, ''));
      IF v_country = '' OR NOT EXISTS (
        SELECT 1 FROM unnest(v_filter.client_countries) c
        WHERE position(lower(c) IN v_country) > 0
      ) THEN CONTINUE; END IF;
    END IF;

    -- Client total spend (ignored when the job lacks the figure).
    IF v_filter.min_client_spend IS NOT NULL AND v_job.client_total_spend IS NOT NULL
       AND v_job.client_total_spend < v_filter.min_client_spend THEN CONTINUE; END IF;

    -- Max proposal competition (ignored when the job lacks the figure).
    IF v_filter.max_proposals IS NOT NULL AND v_job.proposals_count IS NOT NULL
       AND v_job.proposals_count > v_filter.max_proposals THEN CONTINUE; END IF;

    RETURN true;
  END LOOP;

  RETURN false;
END;
$$;

DROP FUNCTION IF EXISTS public.search_jobs(
  text, text, text, numeric, numeric, numeric, numeric,
  text, text, text, text[], integer, integer, uuid
);

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
  p_subcategory text DEFAULT NULL,
  p_duration text DEFAULT NULL,
  p_ids text[] DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_search_terms text[];
BEGIN
  PERFORM set_config('statement_timeout', '45000', true);

  IF p_search IS NOT NULL AND p_search != '' THEN
    SELECT array_agg(trim(t)) INTO v_search_terms
    FROM unnest(string_to_array(p_search, ',')) t
    WHERE trim(t) != '';
  END IF;

  WITH matched AS (
    SELECT
      j.id, j.upwork_job_id, j.title, j.url,
      j.posted_at, j.budget, j.hourly_min, j.hourly_max,
      j.job_type, j.contractor_tier, j.duration_label, j.duration_weeks,
      j.skills, j.client_country, j.client_name, j.client_rating,
      j.client_total_assignments, j.client_total_hires, j.client_total_spend,
      j.client_member_since, j.client_industry, j.client_score, j.client_hire_rate,
      j.client_hours_count, j.client_feedback_count, j.client_payment_verified,
      j.client_city, j.client_company_size, j.client_total_jobs_with_hires,
      j.client_active_assignments, j.client_location_country,
      j.hours_per_week, j.proposals_count, j.connects_required,
      j.total_invited, j.total_hired,
      j.payment_verified, j.category, j.subcategory, j.source, j.client_recent_history,
      j.created_at,
      count(*) OVER() AS full_count
    FROM jobs j
    WHERE
      (v_search_terms IS NULL OR array_length(v_search_terms, 1) IS NULL OR
        EXISTS (
          SELECT 1 FROM unnest(v_search_terms) term
          WHERE j.title ILIKE '%' || term || '%'
             OR j.description ILIKE '%' || term || '%'
        ))
      AND (p_job_type IS NULL OR p_job_type = '' OR public.normalize_job_type(j.job_type) = public.normalize_job_type(p_job_type))
      AND (p_tier IS NULL OR p_tier = '' OR public.normalize_tier(j.contractor_tier) = public.normalize_tier(p_tier))
      AND (p_budget_min IS NULL OR j.budget >= p_budget_min)
      AND (p_budget_max IS NULL OR j.budget <= p_budget_max)
      AND (p_hourly_min IS NULL OR j.hourly_min >= p_hourly_min)
      AND (p_hourly_max IS NULL OR j.hourly_max <= p_hourly_max)
      AND (p_skill IS NULL OR p_skill = '' OR j.skills @> ARRAY[p_skill])
      AND (p_country IS NULL OR p_country = '' OR j.client_country ILIKE '%' || p_country || '%')
      AND (p_category IS NULL OR p_category = '' OR j.category = p_category)
      AND (p_subcategory IS NULL OR p_subcategory = '' OR j.subcategory = p_subcategory)
      AND (p_duration IS NULL OR p_duration = '' OR j.duration_label = p_duration)
      AND (p_ids IS NULL OR array_length(p_ids, 1) IS NULL OR j.id::text = ANY(p_ids))
      AND CASE
        WHEN p_user_id IS NULL THEN true
        WHEN p_ids IS NOT NULL AND array_length(p_ids, 1) > 0 THEN true
        WHEN NOT EXISTS (
          SELECT 1 FROM job_filters f
          WHERE f.user_id = p_user_id AND f.is_active = true
        ) THEN true
        ELSE public.user_filter_matches_job(p_user_id, j.id)
      END
    ORDER BY COALESCE(j.posted_at, j.created_at) DESC NULLS LAST
    LIMIT p_limit OFFSET p_offset
  ),
  enriched AS (
    SELECT m.*,
      CASE WHEN la.analyses IS NOT NULL
        THEN json_build_array(la.analyses)
        ELSE '[]'::json
      END AS job_analyses,
      COALESCE(sc.scores, '[]'::json) AS job_scores
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
        AND (p_user_id IS NULL OR ja.user_id = p_user_id)
      ORDER BY ja.analyzed_at DESC NULLS LAST
      LIMIT 1
    ) la ON true
    LEFT JOIN LATERAL (
      SELECT json_agg(json_build_object(
        'id', js.id,
        'match_score', js.match_score,
        'opportunity_score', js.opportunity_score,
        'win_probability', js.win_probability,
        'recommendation', js.recommendation,
        'created_at', js.created_at
      ) ORDER BY js.created_at DESC) AS scores
      FROM job_scores js WHERE js.job_id = m.id
        AND (p_user_id IS NULL OR js.user_id = p_user_id)
    ) sc ON true
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

GRANT EXECUTE ON FUNCTION public.user_filter_matches_job(uuid, uuid) TO service_role;