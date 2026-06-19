import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs
 *
 * Returns the authenticated user's captured jobs with AI analysis.
 * Query params:
 *   ?page=1 (default)
 *   ?limit=20 (default, max 50)
 *   ?score_min=0 (filter by minimum match_score)
 *   ?sort=newest|score (default: newest)
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const scoreMin = parseInt(searchParams.get("score_min") || "0");
  const sort = searchParams.get("sort") === "score" ? "score" : "newest";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Step 1: get total count for pagination (separate query avoids count + complex joins)
  let countQuery = supabase
    .from("job_scores")
    .select("job_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (scoreMin > 0 && sort === "score") {
    countQuery = countQuery.gte("match_score", scoreMin);
  }

  const { count: total } = await countQuery;
  const totalPages = Math.ceil((total || 0) / limit);

  // Step 2: fetch paginated job_ids from job_scores
  let scoresQuery = supabase
    .from("job_scores")
    .select("job_id, match_score, opportunity_score")
    .eq("user_id", user.id)
    .order(sort === "score" ? "match_score" : "created_at", { ascending: sort !== "score" })
    .range(from, to);

  const { data: scoreData, error: scoreError } = await scoresQuery;

  if (scoreError) {
    console.error("[Jobs API] Scores query error:", scoreError.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!scoreData || scoreData.length === 0) {
    return NextResponse.json({
      jobs: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }

  const jobIds = scoreData.map((s) => s.job_id);

  // Step 3: fetch full job details + analyses
  const { data: jobs, error: jobsError } = await supabase
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
      proposals_count,
      created_at,
      job_analyses!left (
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
    .in("id", jobIds);

  if (jobsError) {
    console.error("[Jobs API] Jobs query error:", jobsError.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Step 4: merge scores into each job
  const scoreMap = new Map(scoreData.map((s) => [s.job_id, s]));
  const merged = (jobs || []).map((job) => {
    const s = scoreMap.get(job.id);
    return {
      ...job,
      job_scores: s ? [{ match_score: s.match_score, opportunity_score: s.opportunity_score }] : [],
    };
  });

  return NextResponse.json({
    jobs: merged,
    pagination: {
      page,
      limit,
      total: total || 0,
      totalPages,
    },
  });
}
