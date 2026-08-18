import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cached, TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const ids = searchParams.get("ids")?.trim() || null;
  const q = searchParams.get("q")?.trim() || null;
  const jobType = searchParams.get("job_type")?.toUpperCase() || null;
  const tier = searchParams.get("contractor_tier") || null;
  const budgetMin = searchParams.get("budget_min") ? parseFloat(searchParams.get("budget_min")!) : null;
  const budgetMax = searchParams.get("budget_max") ? parseFloat(searchParams.get("budget_max")!) : null;
  const hourlyMin = searchParams.get("hourly_min") ? parseFloat(searchParams.get("hourly_min")!) : null;
  const hourlyMax = searchParams.get("hourly_max") ? parseFloat(searchParams.get("hourly_max")!) : null;
  const skill = searchParams.get("skill")?.trim() || null;
  const category = searchParams.get("category")?.trim() || null;

  // Build a cache key from all filter params (include user for per-user analyses)
  const cacheKey = `jobs:${user.id}:${page}:${limit}:${q || ""}:${jobType || ""}:${tier || ""}:${budgetMin || ""}:${budgetMax || ""}:${hourlyMin || ""}:${hourlyMax || ""}:${skill || ""}:${category || ""}:${ids || ""}`;

  try {
    const result = await cached(cacheKey, TTL.JOBS_LIST, async () => {
      const { data, error } = await supabase.rpc("search_jobs" as any, {
        p_search: q,
        p_job_type: jobType,
        p_tier: tier,
        p_budget_min: budgetMin,
        p_budget_max: budgetMax,
        p_hourly_min: hourlyMin,
        p_hourly_max: hourlyMax,
        p_skill: skill,
        p_country: null,
        p_category: category,
        p_ids: ids ? ids.split(",").map((id) => id.trim()).filter(Boolean) : null,
        p_limit: limit,
        p_offset: (page - 1) * limit,
        p_user_id: user.id,
      } as any);

      if (error) throw error;
      return data as any;
    });

    const jobs = Array.isArray(result?.jobs) ? result.jobs : [];
    const total = typeof result?.total === "number" ? result.total : 0;

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("[Jobs API] Query error:", err.message);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
