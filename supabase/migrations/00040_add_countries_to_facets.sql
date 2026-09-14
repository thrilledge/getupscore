-- Add distinct client countries to get_job_filter_facets() so the Jobs page
-- filter sheet can offer a Client Country dropdown (search_jobs already
-- supports p_country).
--
-- NOTE: Applied on the live DB via the Supabase Management API (supabase CLI
-- db push is blocked: login-role 403 "does not have the necessary
-- privileges"). Keep this file in sync with what was applied there.

CREATE OR REPLACE FUNCTION public.get_job_filter_facets()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'categories', COALESCE((
      SELECT json_agg(c ORDER BY c)
      FROM (SELECT DISTINCT category AS c FROM jobs WHERE category IS NOT NULL AND category <> '') s
    ), '[]'::json),
    'subcategories', COALESCE((
      SELECT json_agg(json_build_object('category', category, 'subcategory', subcategory))
      FROM (SELECT DISTINCT category, subcategory FROM jobs WHERE subcategory IS NOT NULL AND subcategory <> '') s
    ), '[]'::json),
    'durations', COALESCE((
      SELECT json_agg(d ORDER BY d)
      FROM (SELECT DISTINCT duration_label AS d FROM jobs WHERE duration_label IS NOT NULL AND duration_label <> '') s
    ), '[]'::json),
    'countries', COALESCE((
      SELECT json_agg(c ORDER BY c)
      FROM (SELECT DISTINCT client_country AS c FROM jobs WHERE client_country IS NOT NULL AND client_country <> '') s
    ), '[]'::json)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_job_filter_facets() TO anon, authenticated, service_role;