import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/jobs/status
 * Returns monitoring system status — job count, last analyses, etc.
 * Used by the frontend dashboard and extension.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseAdminClient();

    // Get total job counts
    const { count: totalJobs } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true });

    // Jobs added in last 24h
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const { count: recentJobs } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneDayAgo);

    // Total analyses
    const { count: totalAnalyses } = await supabase
      .from("job_analyses")
      .select("*", { count: "exact", head: true });

    // Analyses in last 24h
    const { count: recentAnalyses } = await supabase
      .from("job_analyses")
      .select("*", { count: "exact", head: true })
      .gte("analyzed_at", oneDayAgo);

    // Last analysis time
    const { data: lastAnalysis } = await supabase
      .from("job_analyses")
      .select("analyzed_at")
      .order("analyzed_at", { ascending: false })
      .limit(1);

    // Active filters count
    const { count: activeFilters } = await supabase
      .from("job_filters")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Active notification rules count
    const { count: activeRules } = await supabase
      .from("notification_rules")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      stats: {
        total_jobs: totalJobs ?? 0,
        recent_jobs_24h: recentJobs ?? 0,
        total_analyses: totalAnalyses ?? 0,
        recent_analyses_24h: recentAnalyses ?? 0,
        active_filters: activeFilters ?? 0,
        active_rules: activeRules ?? 0,
      },
      last_analysis:
        lastAnalysis?.[0]?.analyzed_at || null,
    });
  } catch (err: any) {
    console.error("[Job Status] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
