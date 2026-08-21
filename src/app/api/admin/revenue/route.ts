import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const PRICE = 12;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtMonth(y: number, m: number): string {
  return `${MONTHS_SHORT[m]} '${String(y).slice(2)}`;
}

function monthRange(monthsAgo: number, now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo + 1, 1));
  return { start, end };
}

function activeDuring(sub: any, asOf: Date): boolean {
  const created = new Date(sub.created_at);
  const canceled = sub.canceled_at ? new Date(sub.canceled_at) : null;
  return created < asOf && (!canceled || canceled >= asOf);
}

function planLabel(planId: string | null): string {
  if (!planId) return "Pro";
  const p = planId.toLowerCase();
  if (p.includes("year") || p.includes("annual")) return "Pro Yearly";
  if (p.includes("month")) return "Pro Monthly";
  return "Pro";
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireAdmin(user);
  if (!auth.authorized) return auth.response;

  try {
    const admin = createSupabaseAdminClient();

    const { data: subs } = await (admin as any)
      .from("subscriptions")
      .select("user_id, status, paddle_plan_id, current_period_end, created_at, canceled_at");
    const allSubs = subs ?? [];

    const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const users = usersList?.users ?? [];
    const totalUsers = users.length;

    const emailMap = new Map<string, string>();
    for (const u of users) {
      emailMap.set(u.id, u.email ?? "unknown");
    }

    const now = new Date();

    const activeSubs = allSubs.filter((s: any) => s.status === "active");
    const activePro = activeSubs.length;
    const totalFree = allSubs.filter((s: any) => s.status === "free").length;
    const mrr = activePro * PRICE;
    const arr = mrr * 12;

    const prevMonth = monthRange(1, now);
    const prevMonthEnd = prevMonth.end;
    const prevActive = allSubs.filter((s: any) => activeDuring(s, prevMonthEnd)).length;
    const mrrGrowth = prevActive > 0
      ? Math.round(((activePro - prevActive) / prevActive) * 1000) / 10
      : activePro > 0 ? 100 : 0;

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const churned30d = allSubs.filter((s: any) => {
      if (s.status !== "canceled" || !s.canceled_at) return false;
      return new Date(s.canceled_at) >= thirtyDaysAgo;
    }).length;
    const churnRate = activePro + churned30d > 0
      ? Math.round((churned30d / (activePro + churned30d)) * 1000) / 10
      : 0;

    const avgRevenuePerUser = totalUsers > 0 ? Math.round((mrr / totalUsers) * 100) / 100 : 0;
    const ltv = churnRate > 0
      ? Math.round((avgRevenuePerUser / (churnRate / 100)) * 100) / 100
      : Math.round(avgRevenuePerUser * 24 * 100) / 100;

    const monthlyRevenue: { month: string; revenue: number; subscribers: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const { start, end } = monthRange(i, now);
      const subscribers = allSubs.filter((s: any) => activeDuring(s, end)).length;
      monthlyRevenue.push({
        month: fmtMonth(start.getUTCFullYear(), start.getUTCMonth()),
        revenue: subscribers * PRICE,
        subscribers,
      });
    }

    const churnTrend: { month: string; churned: number; newSubs: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const { start, end } = monthRange(i, now);
      const churned = allSubs.filter((s: any) => {
        if (!s.canceled_at) return false;
        const c = new Date(s.canceled_at);
        return c >= start && c < end;
      }).length;
      const newSubs = allSubs.filter((s: any) => {
        const c = new Date(s.created_at);
        return c >= start && c < end;
      }).length;
      churnTrend.push({
        month: fmtMonth(start.getUTCFullYear(), start.getUTCMonth()),
        churned,
        newSubs,
      });
    }

    const [profileRes, analysisRes, proposalRes, filterRes] = await Promise.all([
      (admin as any).from("upwork_profiles").select("user_id"),
      admin.from("job_analyses").select("user_id"),
      admin.from("proposals").select("user_id"),
      admin.from("job_filters").select("user_id"),
    ]);

    const distinct = (rows: { user_id: string }[] | null) => new Set((rows ?? []).map((r) => r.user_id)).size;

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const wasProSet = new Set(
      allSubs.filter((s: any) => s.status !== "free").map((s: any) => s.user_id)
    );

    const conversionFunnel = {
      signedUp: totalUsers,
      haveProfile: distinct(profileRes.data),
      ranAnalysis: distinct(analysisRes.data),
      generatedProposal: distinct(proposalRes.data),
      createdFilter: distinct(filterRes.data),
      isPro: activePro,
      wasPro: wasProSet.size,
      last7dActive: users.filter((u) => u.last_sign_in_at && new Date(u.last_sign_in_at) >= sevenDaysAgo).length,
      last30dActive: users.filter((u) => u.last_sign_in_at && new Date(u.last_sign_in_at) >= thirtyDaysAgoDate).length,
    };

    const topPayingUsers = [...activeSubs]
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 10)
      .map((s: any) => {
        const created = new Date(s.created_at);
        const totalMonths =
          (now.getUTCFullYear() - created.getUTCFullYear()) * 12 +
          (now.getUTCMonth() - created.getUTCMonth());
        return {
          email: emailMap.get(s.user_id) ?? "unknown",
          plan: planLabel(s.paddle_plan_id),
          since: s.created_at,
          totalMonths: Math.max(totalMonths, 0),
        };
      });

    const last3 = monthlyRevenue.slice(-3).map((m) => m.subscribers);
    const base = last3[last3.length - 1] ?? 0;
    const slope = last3.length === 3 ? (last3[2] - last3[0]) / 2 : 0;
    const revenueForecast: { month: string; projected: number; conservative: number; optimistic: number }[] = [];
    for (let i = 1; i <= 3; i++) {
      const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
      revenueForecast.push({
        month: fmtMonth(ref.getUTCFullYear(), ref.getUTCMonth()),
        projected: Math.max(0, Math.round((base + slope * i) * PRICE)),
        conservative: Math.max(0, Math.round((base + slope * 0.5 * i) * PRICE)),
        optimistic: Math.max(0, Math.round((base + slope * 1.5 * i) * PRICE)),
      });
    }

    return NextResponse.json({
      ok: true,
      mrr,
      arr,
      mrrGrowth,
      activePro,
      totalFree,
      churned30d,
      churnRate,
      avgRevenuePerUser,
      ltv,
      monthlyRevenue,
      churnTrend,
      conversionFunnel,
      topPayingUsers,
      revenueForecast,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch revenue data" }, { status: 500 });
  }
}
