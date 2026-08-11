-- ──────────────────────────────────────────────────────────
-- UpScore — Query performance indexes
--   Fixes 500 / statement-timeout errors on the jobs page,
--   dashboard stats, and AI chat as the jobs table grows.
--
--   Background: the jobs table is large (>50k rows). Queries
--   using ILIKE '%term%' did full table scans, and the
--   get_market_trends RPC wrapped posted_at in COALESCE which
--   prevented the existing posted_at index from being used.
--
--   This migration:
--     1. Enables pg_trgm and adds GIN trigram indexes so
--        ILIKE '%term%' searches on title / description /
--        client_country become index-backed.
--     2. Rewrites get_market_trends so the time-window filter
--        uses posted_at (indexed) instead of COALESCE.
-- ──────────────────────────────────────────────────────────

-- ── 1. Trigram search indexes ────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm
  ON jobs USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_jobs_description_trgm
  ON jobs USING GIN (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_jobs_client_country_trgm
  ON jobs USING GIN (client_country gin_trgm_ops);

-- Help range counts on created_at (dashboard "last 24h")
CREATE INDEX IF NOT EXISTS idx_jobs_created_at
  ON jobs (created_at DESC);

-- ── 2. get_market_trends: index-friendly time filter ────
CREATE OR REPLACE FUNCTION public.get_market_trends(p_days integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := CASE WHEN p_days IN (7, 30, 90) THEN p_days ELSE 30 END;
  v_cutoff timestamptz := now() - make_interval(days => v_days);
  v_hist_start date := date_trunc('day', now())::date - (v_days - 1);
  v_result json;
BEGIN
  WITH base AS (
    SELECT
      id,
      COALESCE(posted_at, created_at) AS ts,
      CASE
        WHEN upper(replace(job_type, ' ', '')) IN ('FIXED', 'FIXED-PRICE') THEN 'FIXED'
        WHEN upper(replace(job_type, ' ', '')) = 'HOURLY' THEN 'HOURLY'
        ELSE 'OTHER'
      END AS jtype,
      budget,
      hourly_min,
      client_country,
      client_location_country,
      payment_verified,
      client_payment_verified,
      client_rating,
      client_total_spend,
      contractor_tier,
      skills,
      category,
      subcategory
    FROM jobs
    WHERE posted_at >= v_cutoff
       OR (posted_at IS NULL AND created_at >= v_cutoff)
  ),
  history AS (
    SELECT
      to_char(d.day, 'YYYY-MM-DD') AS date,
      coalesce(h.cnt, 0) AS count,
      coalesce(h.fixed, 0) AS fixed,
      coalesce(h.hourly, 0) AS hourly
    FROM generate_series(v_hist_start, current_date, interval '1 day') AS d(day)
    LEFT JOIN (
      SELECT date_trunc('day', ts)::date AS day,
             count(*) AS cnt,
             count(*) FILTER (WHERE jtype = 'FIXED') AS fixed,
             count(*) FILTER (WHERE jtype = 'HOURLY') AS hourly
      FROM base
      GROUP BY 1
    ) h ON h.day = d.day
  ),
  skills AS (
    SELECT s AS name, count(*) AS n
    FROM base, unnest(skills) AS s
    WHERE s IS NOT NULL AND s <> ''
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 30
  ),
  recent7 AS (
    SELECT s AS name, count(*) AS n
    FROM base, unnest(skills) AS s
    WHERE ts >= now() - interval '7 days'
      AND s IS NOT NULL AND s <> ''
    GROUP BY 1
  ),
  prev7 AS (
    SELECT s AS name, count(*) AS n
    FROM base, unnest(skills) AS s
    WHERE ts >= now() - interval '14 days'
      AND ts < now() - interval '7 days'
      AND s IS NOT NULL AND s <> ''
    GROUP BY 1
  ),
  skill_top AS (
    SELECT name FROM skills LIMIT 8
  ),
  skill_trend AS (
    SELECT s AS name,
           to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS date,
           count(*) AS n
    FROM base, unnest(skills) AS s
    WHERE s IN (SELECT name FROM skill_top)
    GROUP BY 1, 2
  ),
  pair_top AS (
    SELECT name FROM skills LIMIT 20
  ),
  expanded AS (
    SELECT DISTINCT id, s
    FROM base, unnest(skills) AS s
    WHERE s IN (SELECT name FROM pair_top)
  ),
  pairs AS (
    SELECT a.s AS a, b.s AS b, count(*) AS n
    FROM expanded a
    JOIN expanded b ON a.id = b.id AND a.s < b.s
    GROUP BY 1, 2
    ORDER BY 3 DESC
    LIMIT 60
  ),
  budget_bands AS (
    SELECT
      CASE
        WHEN budget < 100 THEN 'under_100'
        WHEN budget < 500 THEN '100_499'
        WHEN budget < 1000 THEN '500_999'
        WHEN budget < 2500 THEN '1000_2499'
        WHEN budget < 5000 THEN '2500_4999'
        ELSE '5000_plus'
      END AS band,
      count(*) AS n
    FROM base
    WHERE budget IS NOT NULL
    GROUP BY 1
  ),
  hourly_bands AS (
    SELECT
      CASE
        WHEN hourly_min < 10 THEN 'under_10'
        WHEN hourly_min < 20 THEN '10_19'
        WHEN hourly_min < 35 THEN '20_34'
        WHEN hourly_min < 50 THEN '35_49'
        WHEN hourly_min < 75 THEN '50_74'
        WHEN hourly_min < 100 THEN '75_99'
        ELSE '100_plus'
      END AS band,
      count(*) AS n
    FROM base
    WHERE hourly_min IS NOT NULL
    GROUP BY 1
  ),
  timing_dow AS (
    SELECT extract(dow FROM ts)::integer AS dow, count(*) AS n
    FROM base GROUP BY 1
  ),
  timing_hour AS (
    SELECT extract(hour FROM ts)::integer AS hour, count(*) AS n
    FROM base GROUP BY 1
  ),
  categories AS (
    SELECT category AS name, count(*) AS n
    FROM base
    WHERE category IS NOT NULL AND category <> ''
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 15
  ),
  subcategories AS (
    SELECT subcategory AS name, count(*) AS n
    FROM base
    WHERE subcategory IS NOT NULL AND subcategory <> ''
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 15
  ),
  geography AS (
    SELECT COALESCE(NULLIF(client_location_country, ''), client_country) AS name,
           count(*) AS n
    FROM base
    WHERE COALESCE(NULLIF(client_location_country, ''), client_country) IS NOT NULL
      AND COALESCE(NULLIF(client_location_country, ''), client_country) <> ''
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 15
  ),
  tiers AS (
    SELECT
      CASE
        WHEN upper(replace(contractor_tier, ' ', '')) LIKE '%ENTRY%' THEN 'Entry'
        WHEN upper(replace(contractor_tier, ' ', '')) LIKE '%INTERMEDIATE%' THEN 'Intermediate'
        WHEN upper(replace(contractor_tier, ' ', '')) LIKE '%EXPERT%' THEN 'Expert'
        ELSE 'Other'
      END AS tier,
      count(*) AS n
    FROM base
    WHERE contractor_tier IS NOT NULL
    GROUP BY 1
  ),
  verified AS (
    SELECT count(*) FILTER (WHERE payment_verified OR client_payment_verified) AS yes,
           count(*) AS total
    FROM base
  ),
  pricing AS (
    SELECT
      (SELECT count(*) FROM base) AS total_jobs,
      (SELECT count(*) FROM base WHERE jtype = 'FIXED') AS fixed,
      (SELECT count(*) FROM base WHERE jtype = 'HOURLY') AS hourly,
      (SELECT count(*) FROM base WHERE jtype = 'OTHER') AS other,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY budget) FROM base WHERE budget IS NOT NULL) AS median_budget,
      (SELECT round(avg(budget), 0) FROM base WHERE budget IS NOT NULL) AS avg_budget,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY hourly_min) FROM base WHERE hourly_min IS NOT NULL) AS median_hourly,
      (SELECT round(avg(hourly_min), 0) FROM base WHERE hourly_min IS NOT NULL) AS avg_hourly,
      (SELECT round(avg(client_rating), 2) FROM base WHERE client_rating IS NOT NULL) AS avg_client_rating,
      (SELECT round(avg(client_total_spend), 0) FROM base WHERE client_total_spend IS NOT NULL) AS avg_client_spend
  )
  SELECT json_build_object(
    'meta', (SELECT json_build_object(
      'periodDays', v_days,
      'totalJobs', total_jobs,
      'fixed', fixed,
      'hourly', hourly,
      'other', other,
      'medianBudget', median_budget,
      'avgBudget', avg_budget,
      'medianHourly', median_hourly,
      'avgHourly', avg_hourly,
      'avgClientRating', avg_client_rating,
      'avgClientSpend', avg_client_spend
    ) FROM pricing),
    'history', (SELECT json_agg(json_build_object(
      'date', date, 'count', count, 'fixed', fixed, 'hourly', hourly
    ) ORDER BY date) FROM history),
    'skills', (SELECT json_agg(json_build_object(
      'name', s.name,
      'count', s.n,
      'recent7', coalesce(r.n, 0),
      'prev7', coalesce(p.n, 0),
      'deltaPct', CASE WHEN coalesce(p.n, 0) > 0
                       THEN round(100.0 * (s.n - p.n) / p.n, 1)
                       ELSE NULL END
    )) FROM skills s
      LEFT JOIN recent7 r ON r.name = s.name
      LEFT JOIN prev7 p ON p.name = s.name),
    'skillTrend', (SELECT json_agg(json_build_object(
      'name', name, 'date', date, 'n', n
    )) FROM skill_trend),
    'skillPairs', (SELECT json_agg(json_build_object(
      'a', a, 'b', b, 'n', n
    )) FROM pairs),
    'budgetBands', (SELECT json_agg(json_build_object(
      'band', band, 'n', n
    )) FROM budget_bands),
    'hourlyBands', (SELECT json_agg(json_build_object(
      'band', band, 'n', n
    )) FROM hourly_bands),
    'timing', (SELECT json_build_object(
      'byDay', (SELECT json_agg(json_build_object('dow', dow, 'n', n)) FROM timing_dow),
      'byHour', (SELECT json_agg(json_build_object('hour', hour, 'n', n)) FROM timing_hour)
    )),
    'categories', (SELECT json_agg(json_build_object(
      'name', name, 'n', n
    )) FROM categories),
    'subcategories', (SELECT json_agg(json_build_object(
      'name', name, 'n', n
    )) FROM subcategories),
    'geography', (SELECT json_agg(json_build_object(
      'name', name, 'n', n
    )) FROM geography),
    'clients', (SELECT json_build_object(
      'tiers', (SELECT json_agg(json_build_object('tier', tier, 'n', n)) FROM tiers),
      'paymentVerifiedYes', yes,
      'paymentVerifiedTotal', total
    ) FROM verified)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant access (API routes use service_role)
REVOKE ALL ON FUNCTION public.get_market_trends(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_market_trends(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_market_trends(integer) TO authenticated;
