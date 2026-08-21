import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAdmin(user);
  if (!auth.authorized) return auth.response;

  try {
    const admin = createSupabaseAdminClient() as any;
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") ?? "all";

    let query = admin
      .from("subscriptions")
      .select("id, user_id, paddle_subscription_id, paddle_plan_id, status, current_period_end, created_at");

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: subs, error: subError } = await query.order("created_at", { ascending: false });
    if (subError) throw subError;

    const userIds = [...new Set(subs?.map((s: any) => s.user_id) ?? [])] as string[];
    const userMap = new Map<string, string>();

    for (const uid of userIds) {
      if (userMap.has(uid)) continue;
      try {
        const { data: u } = await admin.auth.admin.getUserById(uid);
        userMap.set(uid, u?.user?.email ?? "unknown");
      } catch {
        userMap.set(uid, "unknown");
      }
    }

    const enriched = subs?.map((s: any) => ({
      ...s,
      email: userMap.get(s.user_id) ?? "unknown",
    })) ?? [];

    const { data: allSubsData } = await admin.from("subscriptions").select("status, created_at");
    const allStatuses = allSubsData ?? [];

    const activePro = allStatuses.filter((s: any) => s.status === "active").length;
    const totalFree = allStatuses.filter((s: any) => s.status === "free").length;
    const canceled30d = allStatuses.filter((s: any) => {
      if (s.status !== "canceled") return false;
      return new Date(s.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }).length;
    const churnRate = activePro + totalFree > 0
      ? Math.round((canceled30d / (activePro + totalFree)) * 100)
      : 0;

    const dailyRevenue: { date: string; mrr: number; subscribers: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);

      const activeOnDay = allStatuses.filter((s: any) => {
        if (s.status !== "active") return false;
        return new Date(s.created_at) <= d;
      }).length;

      dailyRevenue.push({
        date: dayStr,
        mrr: activeOnDay * 12,
        subscribers: activeOnDay,
      });
    }

    return NextResponse.json({
      ok: true,
      subscriptions: enriched,
      summary: {
        mrr: activePro * 12,
        activePro,
        totalFree,
        canceled30d,
        churnRate,
      },
      charts: { dailyRevenue },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}
