import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { streamChat, type ChatMessage } from "@/lib/chat-stream";
import { formatMarketContext } from "@/lib/market-context";
import type { MarketTrends } from "@/lib/market-trends";
import { getUpworkSession } from "@/lib/upwork/session";
import { callMcp, getProfile, normalizeMcpProfile } from "@/lib/upwork/mcp";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

  if (!messages.length) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const last = messages[messages.length - 1];
  if (last?.role !== "user" || !last.content.trim()) {
    return NextResponse.json({ error: "Last message must be from the user" }, { status: 400 });
  }

const [profileResult, trendsResult] = await Promise.all([
    supabase
      .from("upwork_profiles")
      .select(
        "title, bio, skills, portfolio, hourly_rate, total_earnings, total_jobs_done, client_rating, upwork_url"
      )
      .eq("user_id", user.id)
      .single(),
    (async () => {
      try {
        const admin = createSupabaseAdminClient();
        const result = await admin.rpc("get_market_trends", { p_days: 30 });
        if (result.error) {
          console.warn(
            "[Chat] Market trends RPC error:",
            JSON.stringify({ message: result.error.message, code: result.error.code, details: result.error.details, hint: result.error.hint })
          );
        }
        return result;
      } catch (err) {
        console.warn("[Chat] Market trends unavailable:", err instanceof Error ? err.message : err);
        return { data: null, error: { message: "market trends unavailable" } };
      }
    })(),
  ]);

  const dbProfile = profileResult.data;
  let profile: Record<string, unknown> | null = dbProfile ?? null;
  let profileSource: "database" | "mcp" | null = dbProfile ? "database" : null;

  // Fetch Upwork session for live data (connects, financials, profile)
  let upworkSession: Awaited<ReturnType<typeof getUpworkSession>> = null;
  let connectsBalance: number | null = null;
  let freelancerFinancials: unknown = null;
  if (env.isUpworkConfigured) {
    try {
      upworkSession = await getUpworkSession(user.id);
      if (upworkSession) {
        const [connectsRes, financialsRes, mcpProfileRes] = await Promise.allSettled([
          callMcp(upworkSession.token.access_token, env.UPWORK_MCP_URL, "tool", {
            toolName: "upwork__get_freelancer_financials",
            arguments: { action: "connects_balance", org_uid: upworkSession.orgUid, params: { limit: 1 } },
          }),
          callMcp(upworkSession.token.access_token, env.UPWORK_MCP_URL, "tool", {
            toolName: "upwork__get_freelancer_financials",
            arguments: { action: "summary", org_uid: upworkSession.orgUid, params: { from_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], to_date: new Date().toISOString().split("T")[0] } },
          }),
          getProfile(upworkSession.token.access_token, env.UPWORK_MCP_URL, upworkSession.orgUid),
        ]);
        if (connectsRes.status === "fulfilled") {
          connectsBalance = extractConnects(connectsRes.value);
        }
        if (financialsRes.status === "fulfilled") {
          freelancerFinancials = financialsRes.value;
        }
        // Fall back to the live MCP profile when the extension hasn't synced one.
        if (mcpProfileRes.status === "fulfilled") {
          const mcpProfile = normalizeMcpProfile(mcpProfileRes.value);
          if (mcpProfile) {
            if (!profile) {
              profile = mcpProfile;
              profileSource = "mcp";
            }
          }
        }
      }
    } catch (e) {
      console.warn("[Chat] Upwork live data fetch failed:", e instanceof Error ? e.message : e);
    }
  }

  let marketContext: string | null = null;
  try {
    if (trendsResult.data && !trendsResult.error) {
      marketContext = formatMarketContext(trendsResult.data as unknown as MarketTrends, 30);
    }
  } catch (err) {
    console.warn("[Chat] Could not format market context:", err instanceof Error ? err.message : err);
  }

  try {
    const systemPrompt = buildProfileAuditSystemPrompt(profile, marketContext, connectsBalance, freelancerFinancials, upworkSession, profileSource);
    return streamChat(systemPrompt, messages, undefined, 1500);
  } catch (err) {
    console.error("[Chat] Failed to start stream:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to start the AI chat. Please try again." },
      { status: 500 }
    );
  }
}

function extractConnects(result: unknown): number | null {
  try {
    const r = result as {
      result?: { content?: Array<{ type: string; text: string }> };
    };
    const item = r?.result?.content?.find((c) => c.type === "text");
    const text = item?.text ?? JSON.stringify(result);
    const parsed = JSON.parse(text);
    const balance =
      parsed?.connectsBalance ?? parsed?.balance ?? parsed?.total ?? parsed?.data ?? null;
    if (typeof balance === "object" && balance !== null) {
      return Number(balance.remaining ?? balance.available ?? balance.value ?? null) || null;
    }
    return typeof balance === "number" ? balance : null;
  } catch {
    return null;
  }
}

function buildProfileAuditSystemPrompt(
  profile: Record<string, unknown> | null,
  marketContext: string | null,
  connectsBalance: number | null,
  freelancerFinancials: unknown,
  upworkSession: Awaited<ReturnType<typeof getUpworkSession>>,
  profileSource: "database" | "mcp" | null = null
): string {
  const portfolio = profile?.portfolio as { title: string; description?: string }[] | null;
  const portfolioPreview = Array.isArray(portfolio)
    ? portfolio
        .slice(0, 6)
        .map((p) => `- ${p.title}${p.description ? ": " + p.description.slice(0, 140) : ""}`)
        .join("\n")
    : undefined;

  const fields: string[] = [];
  fields.push(`Title/headline: ${String(profile?.title || profile?.headline || "Not set")}`);
  fields.push(
    `Rate: ${profile?.hourly_rate != null ? "$" + profile.hourly_rate + "/hr" : "Not set"}`
  );
  fields.push(`Total earned: ${profile?.total_earnings != null ? "$" + Number(profile.total_earnings).toLocaleString() : "Not set"}`);
  fields.push(`Jobs completed: ${profile?.total_jobs_done != null ? profile.total_jobs_done : "Not set"}`);
  fields.push(`Client rating: ${profile?.client_rating != null ? profile.client_rating + "/5" : "Not set"}`);
  fields.push(`Skills: ${Array.isArray(profile?.skills) ? (profile.skills as string[]).join(", ") : "Not set"}`);
  if (profile?.bio) fields.push(`Bio:\n${String(profile.bio).slice(0, 1000)}`);
  if (portfolioPreview) fields.push(`Portfolio:\n${portfolioPreview}`);
  const sourceNote =
    profileSource === "mcp"
      ? "This profile was pulled LIVE from your Upwork account via the Upwork API (no extension sync needed)."
      : profileSource === "database"
      ? "This profile was synced via the UpScore extension."
      : "";

  // Upwork live data section
  const upworkLiveData: string[] = [];
  if (upworkSession) {
    if (upworkSession.upworkUserUid && upworkSession.upworkUserUid !== "unknown") {
      upworkLiveData.push(`Upwork User UID: ${upworkSession.upworkUserUid}`);
    }
    if (upworkSession.orgUid && upworkSession.orgUid !== "unknown") {
      upworkLiveData.push(`Org UID: ${upworkSession.orgUid}`);
    }
    upworkLiveData.push(`Display Name: ${upworkSession.displayName || "Not set"}`);
    upworkLiveData.push(`Last Synced: ${upworkSession.lastSyncedAt || "Never"}`);
  }
  if (connectsBalance != null) {
    upworkLiveData.push(`Connects Balance: ${connectsBalance}`);
  }
  if (freelancerFinancials) {
    try {
      const finText = typeof freelancerFinancials === "string" ? freelancerFinancials : JSON.stringify(freelancerFinancials).slice(0, 2000);
      upworkLiveData.push(`Financials (90 days): ${finText}`);
    } catch {
      upworkLiveData.push("Financials: Available but could not parse");
    }
  }

  return `You are an AI career coach inside UpScore that audits a freelancer's Upwork profile and helps them improve it.

=== FREELANCER PROFILE (the logged-in user) ===
${profile ? fields.join("\n") + (sourceNote ? "\n" + sourceNote + "\n" : "") : "No profile data is currently available. Be honest about that and, if the user is not connected to Upwork in Settings, explain how to connect. If they ARE connected, their profile may be empty or new."}

${upworkLiveData.length ? `=== LIVE UPWORK DATA ===
${upworkLiveData.join("\n")}` : "=== LIVE UPWORK DATA ===\nNot connected or unavailable. Connect Upwork in Settings to see live connects balance and earnings."}

${marketContext ? marketContext : "=== MARKET TRENDS CONTEXT ===\n(Not available right now. Note this briefly if the user asks about demand, pricing, or niche, and give general advice instead.)"}

=== BEHAVIOR ===
- Answer questions about this profile: its strengths, weaknesses, how to improve the bio, headline, skills, and portfolio, and what niche or job types it is best positioned for.
- Use the MARKET TRENDS CONTEXT as your source of truth for demand, pricing and client signals: rank the user's skills against the top in-demand skills, suggest whether their hourly rate is aligned with median budgets/hourly rates, and recommend skills to add or drop based on demand. If a signal is absent from the context, do not invent numbers.
- Use LIVE UPWORK DATA for real-time connects balance, recent earnings, and account status. If unavailable, guide user to connect in Settings.
- Be specific and reference the actual profile data above. If a field is missing, say so and suggest what the user should add — never invent earnings, ratings, or past work.
- Give actionable, concrete advice a freelancer can apply today (rewrite examples welcome, clearly marked as suggestions).
- Keep answers concise (under ~350 words) unless the user asks for something longer.
- Format with plain text: short paragraphs, occasionally light markdown bullets.`;
}
