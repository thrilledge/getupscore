import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { cached, TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  try {
    // Single RPC call replaces 7 sequential count queries
    const stats = await cached(`analytics:${user.id}`, TTL.ANALYTICS, async () => {
      const { data, error } = await admin.rpc("get_dashboard_stats" as any, {
        p_user_id: user.id,
      } as any);
      if (error) throw error;
      return data as any;
    });

    // Top skills from saved jobs — parallel with stats if not cached
    const { data: savedJobsData } = await admin
      .from("saved_jobs")
      .select("job_id")
      .eq("user_id", user.id)
      .limit(500);

    const savedJobIds = (savedJobsData || []).map((s: any) => s.job_id);
    let topSkills: { skill: string; count: number }[] = [];

    if (savedJobIds.length > 0) {
      const { data: skillsData } = await admin
        .from("jobs")
        .select("skills")
        .not("skills", "is", null)
        .in("id", savedJobIds)
        .limit(500);

      const skillCounts: Record<string, number> = {};
      for (const row of (skillsData || []) as Array<{ skills: string[] | null }>) {
        for (const s of row.skills || []) {
          skillCounts[s] = (skillCounts[s] || 0) + 1;
        }
      }
      topSkills = Object.entries(skillCounts)
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    }

    return NextResponse.json({
      savedJobs: stats?.savedJobs ?? 0,
      totalAnalyses: stats?.totalAnalyses ?? 0,
      activeFilters: stats?.activeFilters ?? 0,
      activeRules: stats?.activeRules ?? 0,
      totalProposals: stats?.totalProposals ?? 0,
      totalNotifications: stats?.totalNotifications ?? 0,
      totalChannels: stats?.totalChannels ?? 0,
      topSkills,
    });
  } catch (err: any) {
    console.error("[Analytics API] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
