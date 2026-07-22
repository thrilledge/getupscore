import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const subcategory = searchParams.get("subcategory")?.trim() || null;
  const country = searchParams.get("client_country")?.trim() || null;

  let query = supabase
    .from("jobs")
    .select(`
      id,
      upwork_job_id,
      title,
      description,
      url,
      posted_at,
      budget,
      hourly_min,
      hourly_max,
      job_type,
      contractor_tier,
      duration_label,
      duration_weeks,
      skills,
      client_country,
      client_name,
      client_rating,
      client_total_assignments,
      client_total_hires,
      client_total_spend,
      client_member_since,
      client_industry,
      client_score,
      client_hours_count,
      client_feedback_count,
      client_payment_verified,
      client_city,
      client_company_size,
      client_total_jobs_with_hires,
      client_active_assignments,
      client_location_country,
      hours_per_week,
      proposals_count,
      total_invited,
      total_hired,
      payment_verified,
      category,
      source,
      client_recent_history,
      created_at,
      job_analyses (
        match_score,
        opportunity_score,
        win_probability,
        skills_match,
        budget_fit,
        client_analysis,
        competition_analysis,
        recommendation,
        reasoning,
        proposal_tips,
        red_flags,
        model_used,
        analyzed_at
      )
    `, { count: "exact" });

  if (ids) {
    const idList = ids.split(",").map((id) => id.trim()).filter(Boolean);
    if (idList.length > 0) {
      query = query.in("id", idList);
    }
  }

  if (q) {
    const keywords = q.split(/[,;]+/).map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 1) {
      const sanitized = keywords[0].replace(/%/g, "");
      query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
    } else if (keywords.length > 1) {
      const conditions = keywords.flatMap((k) => {
        const s = k.replace(/%/g, "");
        return [`title.ilike.%${s}%`, `description.ilike.%${s}%`];
      }).join(",");
      query = query.or(conditions);
    }
  }
  if (jobType) {
    const dbJobType = jobType === "FIXED_PRICE" ? "FIXED" : jobType;
    query = (query as any).filter("job_type", "eq", dbJobType);
  }
  if (tier) {
    query = (query as any).filter("contractor_tier", "eq", tier);
  }
  if (budgetMin !== null) {
    query = query.gte("budget", budgetMin);
  }
  if (budgetMax !== null) {
    query = query.lte("budget", budgetMax);
  }
  if (hourlyMin !== null) {
    query = query.gte("hourly_min", hourlyMin);
  }
  if (hourlyMax !== null) {
    query = query.lte("hourly_max", hourlyMax);
  }
  if (skill) {
    query = query.contains("skills", [skill]);
  }
  if (country) {
    query = query.ilike("client_country", `%${country}%`);
  }
  if (category) {
    query = (query as any).filter("category", "eq", category);
  }
  if (subcategory) {
    query = (query as any).filter("subcategory", "eq", subcategory);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: jobs, error: jobsError, count: total } = await query
    .order("posted_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (jobsError) {
    console.error("[Jobs API] Query error:", jobsError.message);
    return NextResponse.json({ error: `Jobs query: ${jobsError.message}` }, { status: 500 });
  }

  const totalPages = Math.ceil((total || 0) / limit);

  return NextResponse.json({
    jobs: jobs || [],
    pagination: {
      page,
      limit,
      total: total || 0,
      totalPages,
    },
  });
}
