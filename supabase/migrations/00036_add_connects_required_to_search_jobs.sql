-- Add connects_required to search_jobs output so the dashboard list can
-- show how many Connects each job costs to apply (from MCP action=get).
-- Copy of 00035 with j.connects_required added to matched + output columns.

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
  PERFORM set_config('statement_timeout', '25000', true);

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
