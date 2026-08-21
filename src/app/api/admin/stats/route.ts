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

    const stats = await cached("admin:stats", TTL.STATS, async () => {
      // System stats
      const { data: systemStats } = await admin.rpc("get_system_stats" as any);

      // User count from auth
      let totalUsers = 0;
      let recentUsers7d = 0;
      const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (usersList?.users) {
        totalUsers = usersList.users.length;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        recentUsers7d = usersList.users.filter(
          (u) => new Date(u.created_at) >= sevenDaysAgo
        ).length;
      }

      // Subscription stats
      const { data: subs } = await (admin as any)
        .from("subscriptions")
        .select("status, paddle_plan_id, created_at, user_id");

      const activePro = subs?.filter((s: any) => s.status === "active").length ?? 0;
      const totalFree = subs?.filter((s: any) => s.status === "free").length ?? 0;
      const canceled30d = subs?.filter((s: any) => {
        if (s.status !== "canceled") return false;
        const d = new Date(s.created_at);
        return d >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }).length ?? 0;

      const mrr = activePro * 12;

      // Daily signups (last 30 days)
      const dailySignups: { date: string; count: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().slice(0, 10);
        const count = usersList?.users?.filter(
          (u) => u.created_at.slice(0, 10) === dayStr
        ).length ?? 0;
        dailySignups.push({ date: dayStr, count });
      }

      // Daily jobs (last 7 days)
      const dailyJobs: { date: string; count: number }[] = [];
      const { data: jobs } = await admin
        .from("jobs")
        .select("created_at")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().slice(0, 10);
        const count = jobs?.filter((j) => j.created_at?.slice(0, 10) === dayStr).length ?? 0;
        dailyJobs.push({ date: dayStr, count });
      }

      // Daily proposals (last 7 days)
      const dailyProposals: { date: string; count: number }[] = [];
      const { data: proposals } = await admin
        .from("proposals")
        .select("created_at")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().slice(0, 10);
        const count = proposals?.filter((p) => p.created_at?.slice(0, 10) === dayStr).length ?? 0;
        dailyProposals.push({ date: dayStr, count });
      }

      // Recent 10 signups
      const recentSignups = usersList?.users
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map((u) => ({
          email: u.email ?? "unknown",
          displayName: u.user_metadata?.display_name ?? "",
          createdAt: u.created_at,
          plan: subs?.find((s: any) => s.status === "active" && s.user_id === u.id)?.status === "active" ? "pro" : "free",
        })) ?? [];

      // Recent 10 jobs
      const { data: recentJobs } = await admin
        .from("jobs")
        .select("title, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      return {
        overview: {
          totalUsers,
          recentUsers7d,
          activePro,
          totalFree,
          mrr,
          canceled30d,
          totalJobs: systemStats?.total_jobs ?? 0,
          jobs24h: systemStats?.recent_jobs_24h ?? 0,
          totalAnalyses: systemStats?.total_analyses ?? 0,
          analyses24h: systemStats?.recent_analyses_24h ?? 0,
          activeFilters: systemStats?.active_filters ?? 0,
          activeRules: systemStats?.active_rules ?? 0,
        },
        charts: {
          dailySignups,
          dailyJobs,
          dailyProposals,
        },
        recent: {
          signups: recentSignups,
          jobs: recentJobs ?? [],
        },
      };
    });

    return NextResponse.json({ ok: true, ...stats });
  } catch {
    return NextResponse.json({ error: "Failed to fetch admin stats" }, { status: 500 });
  }
}
