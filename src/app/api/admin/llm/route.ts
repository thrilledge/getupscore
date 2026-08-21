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
      const admin = createSupabaseAdminClient() as any;

      const stats = await cached("admin:llm-stats", TTL.STATS, async () => {
        // Always run direct queries for the detailed data
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Total counts
        const { count: totalCalls } = await admin
          .from("llm_usage_logs")
          .select("*", { count: "exact", head: true });

        const { count: calls24h } = await admin
          .from("llm_usage_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", oneDayAgo.toISOString());

        const { count: calls7d } = await admin
          .from("llm_usage_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo.toISOString());

        // Token sums
        const { data: tokenSums } = await admin
          .from("llm_usage_logs")
          .select("total_tokens, prompt_tokens, completion_tokens")
          .gte("created_at", thirtyDaysAgo.toISOString());

        const totalTokensAllTime = tokenSums?.reduce((s: number, r: any) => s + (r.total_tokens || 0), 0) ?? 0;
        const totalPromptTokens = tokenSums?.reduce((s: number, r: any) => s + (r.prompt_tokens || 0), 0) ?? 0;
        const totalCompletionTokens = tokenSums?.reduce((s: number, r: any) => s + (r.completion_tokens || 0), 0) ?? 0;

        // Tokens 24h
        const { data: tokens24hData } = await admin
          .from("llm_usage_logs")
          .select("total_tokens")
          .gte("created_at", oneDayAgo.toISOString());
        const tokens24h = tokens24hData?.reduce((s: number, r: any) => s + (r.total_tokens || 0), 0) ?? 0;

        // Tokens 7d
        const { data: tokens7dData } = await admin
          .from("llm_usage_logs")
          .select("total_tokens")
          .gte("created_at", sevenDaysAgo.toISOString());
        const tokens7d = tokens7dData?.reduce((s: number, r: any) => s + (r.total_tokens || 0), 0) ?? 0;

        // Success/error counts 24h
        const { count: success24h } = await admin
          .from("llm_usage_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", oneDayAgo.toISOString())
          .eq("success", true);
        const { count: errors24h } = await admin
          .from("llm_usage_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", oneDayAgo.toISOString())
          .eq("success", false);

        const successRate24h = (calls24h ?? 0) > 0
          ? Math.round(((success24h ?? 0) / (calls24h ?? 1)) * 100)
          : 100;

        // Per-provider breakdown (24h)
        const { data: providerData24h } = await admin
          .from("llm_usage_logs")
          .select("provider, total_tokens")
          .gte("created_at", oneDayAgo.toISOString());

        const byProvider24h: Record<string, { calls: number; tokens: number }> = {};
        providerData24h?.forEach((r: any) => {
          if (!byProvider24h[r.provider]) byProvider24h[r.provider] = { calls: 0, tokens: 0 };
          byProvider24h[r.provider].calls++;
          byProvider24h[r.provider].tokens += r.total_tokens || 0;
        });

        // Per-endpoint breakdown (24h)
        const { data: endpointData24h } = await admin
          .from("llm_usage_logs")
          .select("endpoint, total_tokens")
          .gte("created_at", oneDayAgo.toISOString());

        const byEndpoint24h: Record<string, { calls: number; tokens: number }> = {};
        endpointData24h?.forEach((r: any) => {
          if (!byEndpoint24h[r.endpoint]) byEndpoint24h[r.endpoint] = { calls: 0, tokens: 0 };
          byEndpoint24h[r.endpoint].calls++;
          byEndpoint24h[r.endpoint].tokens += r.total_tokens || 0;
        });

        // Daily tokens (last 7 days)
        const dailyTokens: { date: string; tokens: number; calls: number }[] = [];
        for (let i = 6; i >= 0; i--) {
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

          dailyTokens.push({
            date: dayStr,
            tokens: dayData?.reduce((s: number, r: any) => s + (r.total_tokens || 0), 0) ?? 0,
            calls: dayData?.length ?? 0,
          });
        }

        // Top users by token usage (7d)
        const { data: topUsersData } = await admin
          .from("llm_usage_logs")
          .select("user_id, total_tokens")
          .gte("created_at", sevenDaysAgo.toISOString())
          .not("user_id", "is", null);

        const userTokensMap: Record<string, { calls: number; tokens: number }> = {};
        topUsersData?.forEach((r: any) => {
          if (!userTokensMap[r.user_id]) userTokensMap[r.user_id] = { calls: 0, tokens: 0 };
          userTokensMap[r.user_id].calls++;
          userTokensMap[r.user_id].tokens += r.total_tokens || 0;
        });

        // Get user emails for top users
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

        // Rate limit errors (429s) per provider (24h)
        const { data: errors24hData } = await admin
          .from("llm_usage_logs")
          .select("provider, error_message")
          .gte("created_at", oneDayAgo.toISOString())
          .eq("success", false);

        const rateLimits: Record<string, number> = {};
        errors24hData?.forEach((r: any) => {
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

        // Get user emails for recent calls
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

        // API chain info
        const keysEnv = process.env.GROQ_API_KEYS;
        const keyCount = keysEnv ? keysEnv.split(",").filter(Boolean).length : (process.env.GROQ_API_KEY ? 1 : 0);
        const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

      return {
        overview: {
          totalCalls: totalCalls ?? 0,
          calls24h: calls24h ?? 0,
          calls7d: calls7d ?? 0,
          tokensAllTime: totalTokensAllTime,
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
          tokens24h,
          tokens7d,
          successRate24h,
          errors24h: errors24h ?? 0,
        },
        chain: {
          provider: "Groq",
          keyCount,
          model,
          keys: Array.from({ length: keyCount }, (_, i) => `groq-${i + 1}`),
        },
        byProvider24h: Object.entries(byProvider24h).map(([provider, data]) => ({
          provider,
          ...data,
        })).sort((a, b) => b.tokens - a.tokens),
        byEndpoint24h: Object.entries(byEndpoint24h).map(([endpoint, data]) => ({
          endpoint,
          ...data,
        })).sort((a, b) => b.tokens - a.tokens),
        dailyTokens,
        topUsers,
        rateLimits24h: Object.entries(rateLimits).map(([provider, count]) => ({
          provider,
          count,
        })),
        recentCalls: recentWithEmails,
      };
    });

    return NextResponse.json({ ok: true, ...stats });
  } catch {
    return NextResponse.json({ error: "Failed to fetch LLM stats" }, { status: 500 });
  }
}
