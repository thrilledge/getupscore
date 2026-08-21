import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";
import { cached, TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAdmin(user);
  if (!auth.authorized) return auth.response;

  try {
    const admin = createSupabaseAdminClient();

    const systemData = await cached("admin:system", TTL.STATS, async () => {
      // System stats
      const { data: systemStats } = await admin.rpc("get_system_stats" as any);

      // Last analysis time
      const { data: lastAnalysis } = await admin
        .from("job_analyses")
        .select("analyzed_at")
        .order("analyzed_at", { ascending: false })
        .limit(1)
        .single();

      // Job source breakdown
      const { data: recentJobs } = await admin
        .from("jobs")
        .select("source, created_at")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const sources = (recentJobs ?? []).reduce(
        (acc, j) => {
          const src = j.source ?? "unknown";
          acc[src] = (acc[src] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Count proposals in last 24h
      const { count: proposals24h } = await (admin as any)
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      return {
        totalJobs: systemStats?.total_jobs ?? 0,
        jobs24h: systemStats?.recent_jobs_24h ?? 0,
        totalAnalyses: systemStats?.total_analyses ?? 0,
        analyses24h: systemStats?.recent_analyses_24h ?? 0,
        activeFilters: systemStats?.active_filters ?? 0,
        activeRules: systemStats?.active_rules ?? 0,
        lastAnalysis: lastAnalysis?.analyzed_at ?? null,
        jobSources: sources,
        proposals24h: proposals24h ?? 0,
      };
    });

    return NextResponse.json({ ok: true, ...systemData });
  } catch {
    return NextResponse.json({ error: "Failed to fetch system data" }, { status: 500 });
  }
}
