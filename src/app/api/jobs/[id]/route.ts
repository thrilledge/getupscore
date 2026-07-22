import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: job, error: jobError } = await supabase
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
      subcategory,
      job_type,
      contractor_tier,
      duration_label,
      duration_weeks,
      weekly_retainer,
      skills,
      created_at,
      job_analyses (
        id,
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
    `)
    .eq("id", id)
    .single();

  if (jobError) {
    console.error("[Job Detail] Query error:", jobError.message);
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}
