import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

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
    const admin = createSupabaseAdminClient() as any;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── Fetch all proposals (minimal columns) ───────────────
    const { data: proposals, error: propError } = await admin
      .from("proposals")
      .select("id, user_id, job_id, score, status, created_at")
      .order("created_at", { ascending: false });

    if (propError) throw propError;

    const rows: any[] = proposals ?? [];

    // ── Headline counts ─────────────────────────────────────
    const totalProposals = rows.length;
    const proposals24h = rows.filter(
      (r) => new Date(r.created_at) >= oneDayAgo
    ).length;
    const proposals7d = rows.filter(
      (r) => new Date(r.created_at) >= sevenDaysAgo
    ).length;

    // ── Score stats ─────────────────────────────────────────
    const scores = rows
      .map((r) => r.score)
      .filter((s): s is number => typeof s === "number" && !Number.isNaN(s))
      .sort((a, b) => a - b);

    const avgScore =
      scores.length > 0
        ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10
        : 0;

    const medianScore =
      scores.length > 0
        ? scores.length % 2 === 1
          ? scores[(scores.length - 1) / 2]
          : Math.round((scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2)
        : 0;

    // ── By status ───────────────────────────────────────────
    const statusMap: Record<string, number> = {};
    rows.forEach((r) => {
      const st = r.status ?? "unknown";
      statusMap[st] = (statusMap[st] ?? 0) + 1;
    });
    const byStatus = Object.entries(statusMap)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // ── Score distribution (buckets of 20) ──────────────────
    const buckets = [
      { range: "0-20", min: 0, max: 20 },
      { range: "21-40", min: 21, max: 40 },
      { range: "41-60", min: 41, max: 60 },
      { range: "61-80", min: 61, max: 80 },
      { range: "81-100", min: 81, max: 100 },
    ];
    const scoreDistribution = buckets.map(({ range, min, max }) => ({
      range,
      count: scores.filter((s) => s >= min && s <= max).length,
    }));

    // ── Daily proposals (last 30 days) ──────────────────────
    const dailyMap: Record<string, { count: number; scoreSum: number; scoreN: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().slice(0, 10)] = { count: 0, scoreSum: 0, scoreN: 0 };
    }
    rows.forEach((r) => {
      const day = new Date(r.created_at).toISOString().slice(0, 10);
      if (dailyMap[day]) {
        dailyMap[day].count++;
        if (typeof r.score === "number") {
          dailyMap[day].scoreSum += r.score;
          dailyMap[day].scoreN++;
        }
      }
    });
    const dailyProposals = Object.entries(dailyMap).map(([date, v]) => ({
      date,
      count: v.count,
      avgScore: v.scoreN > 0 ? Math.round((v.scoreSum / v.scoreN) * 10) / 10 : 0,
    }));

    // ── Top / worst proposals (by score) ────────────────────
    const scored = rows.filter((r) => typeof r.score === "number");
    const topRows = [...scored].sort((a, b) => b.score - a.score).slice(0, 10);
    const worstRows = [...scored]
      .sort((a, b) => a.score - b.score)
      .filter((r) => !topRows.includes(r))
      .slice(0, 10);

    // Resolve job titles for top/worst
    const jobIds = Array.from(new Set([...topRows, ...worstRows].map((r) => r.job_id)));
    const jobTitleMap: Record<string, string> = {};
    if (jobIds.length > 0) {
      const { data: jobsData } = await admin
        .from("jobs")
        .select("id, title")
        .in("id", jobIds);
      jobsData?.forEach((j: any) => {
        jobTitleMap[j.id] = j.title ?? "Unknown job";
      });
    }

    // Resolve user emails
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
    const emailMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
      usersList?.users?.forEach((u: any) => {
        emailMap[u.id] = u.email ?? "unknown";
      });
    }

    const toProposalRow = (r: any) => ({
      id: r.id,
      email: emailMap[r.user_id] ?? "unknown",
      jobTitle: jobTitleMap[r.job_id] ?? "Unknown job",
      score: r.score,
      status: r.status,
      createdAt: r.created_at,
    });

    const topProposals = topRows.map(toProposalRow);
    const worstProposals = worstRows.map(toProposalRow);

    // ── Per-user leaderboard ────────────────────────────────
    const userAgg: Record<
      string,
      { totalProposals: number; scoreSum: number; scoreN: number; bestScore: number }
    > = {};
    rows.forEach((r) => {
      if (!r.user_id) return;
      if (!userAgg[r.user_id]) {
        userAgg[r.user_id] = { totalProposals: 0, scoreSum: 0, scoreN: 0, bestScore: 0 };
      }
      userAgg[r.user_id].totalProposals++;
      if (typeof r.score === "number") {
        userAgg[r.user_id].scoreSum += r.score;
        userAgg[r.user_id].scoreN++;
        userAgg[r.user_id].bestScore = Math.max(userAgg[r.user_id].bestScore, r.score);
      }
    });

    const perUserTop = Object.entries(userAgg)
      .map(([userId, agg]) => ({
        email: emailMap[userId] ?? "unknown",
        totalProposals: agg.totalProposals,
        avgScore: agg.scoreN > 0 ? Math.round((agg.scoreSum / agg.scoreN) * 10) / 10 : 0,
        bestScore: agg.bestScore,
      }))
      .sort((a, b) => b.totalProposals - a.totalProposals)
      .slice(0, 10);

    return NextResponse.json({
      ok: true,
      totalProposals,
      proposals24h,
      proposals7d,
      avgScore,
      medianScore,
      byStatus,
      scoreDistribution,
      topProposals,
      worstProposals,
      dailyProposals,
      perUserTop,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch proposal stats" }, { status: 500 });
  }
}
