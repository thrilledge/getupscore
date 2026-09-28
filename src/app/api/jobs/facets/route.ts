import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cached, TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * Distinct filter facets (categories, subcategories, project lengths, client
 * countries) pulled from the jobs actually present in the DB, so the Jobs page
 * dropdowns only offer values that will return results.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const facets = await cached("jobs:facets", TTL.FACETS, async () => {
      const { data, error } = await supabase.rpc("get_job_filter_facets" as any);
      if (error) throw error;
      return data as any;
    });

    return NextResponse.json({
      categories: Array.isArray(facets?.categories) ? facets.categories : [],
      subcategories: Array.isArray(facets?.subcategories) ? facets.subcategories : [],
      durations: Array.isArray(facets?.durations) ? facets.durations : [],
      countries: Array.isArray(facets?.countries) ? facets.countries : [],
    });
  } catch (err: any) {
    console.error("[Jobs Facets] Query error:", err.message);
    // Non-fatal: the page still works with just the static filters.
    return NextResponse.json({ categories: [], subcategories: [], durations: [], countries: [] });
  }
}
