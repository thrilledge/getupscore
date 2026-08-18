import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { cached, TTL } from "@/lib/cache";

/**
 * GET /api/jobs/status
 * Returns monitoring system status — job count, last analyses, etc.
 * Used by the frontend dashboard and extension.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdminClient();

    const stats = await cached("system:status", TTL.STATS, async () => {
      const { data, error } = await admin.rpc("get_system_stats" as any);
      if (error) throw error;
      return data as any;
    });

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      stats: {
        total_jobs: stats?.total_jobs ?? 0,
        recent_jobs_24h: stats?.recent_jobs_24h ?? 0,
        total_analyses: stats?.total_analyses ?? 0,
        recent_analyses_24h: stats?.recent_analyses_24h ?? 0,
        active_filters: stats?.active_filters ?? 0,
        active_rules: stats?.active_rules ?? 0,
      },
      last_analysis: stats?.last_analysis || null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
