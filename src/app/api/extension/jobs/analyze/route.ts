import { NextResponse } from "next/server";
import { authenticateRequest } from "@/app/api/extension/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { analyzeJob } from "@/lib/jobs/analyze";

/**
 * POST /api/extension/jobs/analyze
 * Run AI analysis on a job using rich DOM-extracted data.
 *
 * Body:
 *   { job: { ...richJobFields }, upworkJobId?: string, jobId?: string }
 *
 * If upworkJobId is provided, it tries to find existing job in DB.
 * If jobId is provided, uses that directly.
 * Rich job fields are used for AI context regardless.
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const userId = auth.user_id as string;

  try {
    const body = await request.json();
    const { job, upworkJobId, jobId } = body;

    if (!job && !upworkJobId && !jobId) {
      return NextResponse.json({ error: "Provide job data, upworkJobId, or jobId" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    let dbJobId = jobId;

    if (!dbJobId && upworkJobId) {
      const { data: existing } = await supabase
        .from("jobs")
        .select("id")
        .eq("upwork_job_id", upworkJobId)
        .maybeSingle();
      if (existing) dbJobId = existing.id;
    }

    if (!dbJobId) {
      return NextResponse.json({ error: "Job not found in database. Sync it first." }, { status: 404 });
    }

    const analysisData = await analyzeJob(supabase, job || {}, dbJobId, userId);

    return NextResponse.json({
      ok: true,
      analysis: {
        match_score: analysisData.match_score,
        opportunity_score: analysisData.opportunity_score,
        win_probability: analysisData.win_probability,
        skills_match: analysisData.skills_match,
        budget_fit: analysisData.budget_fit,
        client_analysis: analysisData.client_analysis,
        competition_analysis: analysisData.competition_analysis,
        recommendation: analysisData.recommendation,
        reasoning: analysisData.reasoning,
        proposal_tips: analysisData.proposal_tips,
        red_flags: analysisData.red_flags,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Analyze Endpoint] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
