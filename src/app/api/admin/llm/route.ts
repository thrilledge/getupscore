import { NextResponse, NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const RANGE_MS: Record<string, number> = {
  "15s": 15_000,
  "30s": 30_000,
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "6h": 6 * 60 * 60_000,
  "24h": 24 * 60 * 60_000,
  "7d": 7 * 24 * 60 * 60_000,
  "30d": 30 * 24 * 60 * 60_000,
};

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
    const rangeParam = req.nextUrl.searchParams.get("range") || "24h";
    const rangeMs = RANGE_MS[rangeParam] ?? RANGE_MS["24h"];
    const now = new Date();
    const since = new Date(now.getTime() - rangeMs);

    // Total counts (all time)
    const { count: totalCalls } = await admin
      .from("llm_usage_logs")
      .select("*", { count: "exact", head: true });

    // Counts within selected range
    const { count: rangeCalls } = await admin
      .from("llm_usage_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since.toISOString());

    // Token sums within range
    const { data: tokenSums } = await admin
      .from("llm_usage_logs")
      .select("total_tokens, prompt_tokens, completion_tokens")
      .gte("created_at", since.toISOString());

    const rangeTokens = tokenSums?.reduce((s: number, r: any) => s + (r.total_tokens || 0), 0) ?? 0;
    const rangePromptTokens = tokenSums?.reduce((s: number, r: any) => s + (r.prompt_tokens || 0), 0) ?? 0;
    const rangeCompletionTokens = tokenSums?.reduce((s: number, r: any) => s + (r.completion_tokens || 0), 0) ?? 0;

    // Success/error counts within range
    const { count: successCount } = await admin
      .from("llm_usage_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since.toISOString())
      .eq("success", true);
    const { count: errorCount } = await admin
      .from("llm_usage_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since.toISOString())
      .eq("success", false);

    const successRate = (rangeCalls ?? 0) > 0
      ? Math.round(((successCount ?? 0) / (rangeCalls ?? 1)) * 100)
      : 100;

    // Per-provider breakdown (range)
    const { data: providerData } = await admin
      .from("llm_usage_logs")
      .select("provider, total_tokens")
      .gte("created_at", since.toISOString());

    const byProvider: Record<string, { calls: number; tokens: number }> = {};
    providerData?.forEach((r: any) => {
      if (!byProvider[r.provider]) byProvider[r.provider] = { calls: 0, tokens: 0 };
      byProvider[r.provider].calls++;
      byProvider[r.provider].tokens += r.total_tokens || 0;
    });

    // Per-endpoint breakdown (range)
    const { data: endpointData } = await admin
      .from("llm_usage_logs")
      .select("endpoint, total_tokens")
      .gte("created_at", since.toISOString());

    const byEndpoint: Record<string, { calls: number; tokens: number }> = {};
    endpointData?.forEach((r: any) => {
      if (!byEndpoint[r.endpoint]) byEndpoint[r.endpoint] = { calls: 0, tokens: 0 };
      byEndpoint[r.endpoint].calls++;
      byEndpoint[r.endpoint].tokens += r.total_tokens || 0;
    });

    // Time-series data — adaptive granularity based on range
    let timeSeries: { date: string; tokens: number; calls: number }[] = [];

    if (rangeMs <= 60_000) {
      // ≤1m: 5-second buckets
      const bucketCount = Math.ceil(rangeMs / 5_000);
      for (let i = bucketCount - 1; i >= 0; i--) {
        const bucketEnd = new Date(now.getTime() - i * 5_000);
        const bucketStart = new Date(bucketEnd.getTime() - 5_000);
        const { data: bucketData } = await admin
          .from("llm_usage_logs")
          .select("total_tokens")
          .gte("created_at", bucketStart.toISOString())
          .lt("created_at", bucketEnd.toISOString());
        timeSeries.push({
          date: bucketEnd.toISOString().slice(11, 19),
          tokens: bucketData?.reduce((s: number, r: any) => s + (r.total_tokens || 0), 0) ?? 0,
          calls: bucketData?.length ?? 0,
        });
      }
    } else if (rangeMs <= 360_000) {
      // ≤6m: 30-second buckets
      const bucketCount = Math.ceil(rangeMs / 30_000);
      for (let i = bucketCount - 1; i >= 0; i--) {
        const bucketEnd = new Date(now.getTime() - i * 30_000);
        const bucketStart = new Date(bucketEnd.getTime() - 30_000);
        const { data: bucketData } = await admin
          .from("llm_usage_logs")
          .select("total_tokens")
          .gte("created_at", bucketStart.toISOString())
          .lt("created_at", bucketEnd.toISOString());
        timeSeries.push({
          date: bucketEnd.toISOString().slice(11, 19),
          tokens: bucketData?.reduce((s: number, r: any) => s + (r.total_tokens || 0), 0) ?? 0,
          calls: bucketData?.length ?? 0,
        });
      }
    } else if (rangeMs <= 6 * 3600_000) {
      // ≤6h: 5-minute buckets
      const bucketCount = Math.ceil(rangeMs / (5 * 60_000));
      for (let i = bucketCount - 1; i >= 0; i--) {
        const bucketEnd = new Date(now.getTime() - i * 5 * 60_000);
        const bucketStart = new Date(bucketEnd.getTime() - 5 * 60_000);
        const { data: bucketData } = await admin
          .from("llm_usage_logs")
          .select("total_tokens")
          .gte("created_at", bucketStart.toISOString())
          .lt("created_at", bucketEnd.toISOString());
        timeSeries.push({
          date: bucketEnd.toISOString().slice(11, 16),
          tokens: bucketData?.reduce((s: number, r: any) => s + (r.total_tokens || 0), 0) ?? 0,
          calls: bucketData?.length ?? 0,
        });
      }
    } else if (rangeMs <= 24 * 3600_000) {
      // ≤24h: hourly buckets
      const bucketCount = Math.ceil(rangeMs / 3600_000);
      for (let i = bucketCount - 1; i >= 0; i--) {
        const bucketEnd = new Date(now.getTime() - i * 3600_000);
        const bucketStart = new Date(bucketEnd.getTime() - 3600_000);
        const { data: bucketData } = await admin
          .from("llm_usage_logs")
          .select("total_tokens")
          .gte("created_at", bucketStart.toISOString())
          .lt("created_at", bucketEnd.toISOString());
        timeSeries.push({
          date: bucketEnd.toISOString().slice(5, 16).replace("T", " "),
          tokens: bucketData?.reduce((s: number, r: any) => s + (r.total_tokens || 0), 0) ?? 0,
          calls: bucketData?.length ?? 0,
        });
      }
    } else {
      // >24h: daily buckets
      const dayCount = Math.ceil(rangeMs / (24 * 3600_000));
      for (let i = dayCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().slice(0, 10);
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);
        const { data: dayData } = await admin
          .from("llm_usage_logs")
          .select("total_tokens")
          .gte("created_at", dayStart.toISOString())
          .lte("created_at", dayEnd.toISOString());
        timeSeries.push({
          date: dayStr,
          tokens: dayData?.reduce((s: number, r: any) => s + (r.total_tokens || 0), 0) ?? 0,
          calls: dayData?.length ?? 0,
        });
      }
    }

    // Top users by token usage (range)
    const { data: topUsersData } = await admin
      .from("llm_usage_logs")
      .select("user_id, total_tokens")
      .gte("created_at", since.toISOString())
      .not("user_id", "is", null);

    const userTokensMap: Record<string, { calls: number; tokens: number }> = {};
    topUsersData?.forEach((r: any) => {
      if (!userTokensMap[r.user_id]) userTokensMap[r.user_id] = { calls: 0, tokens: 0 };
      userTokensMap[r.user_id].calls++;
      userTokensMap[r.user_id].tokens += r.total_tokens || 0;
    });

    const topUserIds = Object.entries(userTokensMap)
      .sort(([, a], [, b]) => b.tokens - a.tokens)
      .slice(0, 20)
      .map(([id]) => id);

    let topUsers: { user_id: string; email: string; calls: number; tokens: number }[] = [];
    if (topUserIds.length > 0) {
      const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const emailMap: Record<string, string> = {};
      usersList?.users?.forEach((u: any) => { emailMap[u.id] = u.email ?? "unknown"; });
      topUsers = topUserIds.map((id) => ({
        user_id: id,
        email: emailMap[id] ?? "unknown",
        calls: userTokensMap[id].calls,
        tokens: userTokensMap[id].tokens,
      }));
    }

    // Rate limit errors (429s) per provider (range)
    const { data: errorsData } = await admin
      .from("llm_usage_logs")
      .select("provider, error_message")
      .gte("created_at", since.toISOString())
      .eq("success", false);

    const rateLimits: Record<string, number> = {};
    errorsData?.forEach((r: any) => {
      if (r.error_message?.includes("429")) {
        rateLimits[r.provider] = (rateLimits[r.provider] || 0) + 1;
      }
    });

    // Recent calls (last 50)
    const { data: recentCalls } = await admin
      .from("llm_usage_logs")
      .select("id, user_id, provider, model, endpoint, prompt_tokens, completion_tokens, total_tokens, duration_ms, success, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    let recentWithEmails: any[] = recentCalls ?? [];
    if (recentCalls?.length) {
      const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const emailMap: Record<string, string> = {};
      usersList?.users?.forEach((u: any) => { emailMap[u.id] = u.email ?? "unknown"; });
      recentWithEmails = recentCalls.map((r: any) => ({
        ...r,
        email: r.user_id ? emailMap[r.user_id] ?? "unknown" : "—",
      }));
    }

    // API chain info (show providers, not individual keys)
    const keysEnv = process.env.GROQ_API_KEYS;
    const groqKeyCount = keysEnv ? keysEnv.split(",").filter(Boolean).length : (process.env.GROQ_API_KEY ? 1 : 0);
    const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

    return NextResponse.json({
      ok: true,
      range: rangeParam,
      overview: {
        totalCalls: totalCalls ?? 0,
        rangeCalls: rangeCalls ?? 0,
        rangeTokens,
        rangePromptTokens,
        rangeCompletionTokens,
        successRate,
        errors: errorCount ?? 0,
      },
      chain: {
        providers: [
          { name: "Groq", keys: groqKeyCount, model },
          { name: "Pollinations AI", keys: 1, model: "openai" },
        ],
      },
      byProvider: Object.entries(byProvider).map(([provider, data]) => ({
        provider,
        ...data,
      })).sort((a, b) => b.tokens - a.tokens),
      byEndpoint: Object.entries(byEndpoint).map(([endpoint, data]) => ({
        endpoint,
        ...data,
      })).sort((a, b) => b.tokens - a.tokens),
      timeSeries,
      topUsers,
      rateLimits: Object.entries(rateLimits).map(([provider, count]) => ({
        provider,
        count,
      })),
      recentCalls: recentWithEmails,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch LLM stats" }, { status: 500 });
  }
}
