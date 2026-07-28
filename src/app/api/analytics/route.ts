import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdminClient() as any;

  try {
    const { count: savedJobs } = await admin
      .from("saved_jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: totalAnalyses } = await admin
      .from("job_analyses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: activeFilters } = await admin
      .from("job_filters")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true);

    const { count: activeRules } = await admin
      .from("notification_rules")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true);

    const { count: totalProposals } = await admin
      .from("proposals")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: totalNotifications } = await admin
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: totalChannels } = await admin
      .from("notification_channels")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Saved jobs' skills
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
      savedJobs: savedJobs ?? 0,
      totalAnalyses: totalAnalyses ?? 0,
      activeFilters: activeFilters ?? 0,
      activeRules: activeRules ?? 0,
      totalProposals: totalProposals ?? 0,
      totalNotifications: totalNotifications ?? 0,
      totalChannels: totalChannels ?? 0,
      topSkills,
    });
  } catch (err: any) {
    console.error("[Analytics API] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
