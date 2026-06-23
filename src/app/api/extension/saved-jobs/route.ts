import { NextResponse } from "next/server";
import { authenticateRequest } from "@/app/api/extension/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const userId = auth.user_id as string;

  try {
    const supabase = createSupabaseAdminClient();

    const { data: saved, error: savedError } = await supabase
      .from("saved_jobs")
      .select(`
        id,
        created_at,
        job:jobs (
          id,
          upwork_job_id,
          title,
          url,
          budget,
          hourly_min,
          hourly_max,
          job_type,
          contractor_tier,
          skills,
          client_country,
          client_name,
          client_rating,
          client_spend,
          client_hire_rate,
          client_total_assignments,
          client_total_hires,
          client_total_spend,
          client_member_since,
          posted_at,
          proposals_count
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (savedError) {
      return NextResponse.json({ error: savedError.message }, { status: 500 });
    }

    const savedJobIds = (saved || []).map((s: any) => s.job.id).filter(Boolean);

    const analysesMap: Record<string, any> = {};
    if (savedJobIds.length > 0) {
      const { data: analyses } = await supabase
        .from("job_analyses")
        .select("job_id, match_score, opportunity_score, win_probability, recommendation, reasoning, proposal_tips, red_flags, client_analysis, competition_analysis, skills_match, budget_fit")
        .in("job_id", savedJobIds)
        .eq("user_id", userId);

      for (const a of analyses || []) {
        analysesMap[a.job_id] = a;
      }
    }

    const jobs = (saved || []).map((s: any) => ({
      ...s.job,
      saved_at: s.created_at,
      analysis: analysesMap[s.job.id] || null,
    }));

    return NextResponse.json({ jobs });
  } catch (err: any) {
    console.error("[Extension Saved Jobs] Error:", err.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
