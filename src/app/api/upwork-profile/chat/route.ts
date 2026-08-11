import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { streamChat, type ChatMessage } from "@/lib/chat-stream";
import { formatMarketContext } from "@/lib/market-context";
import type { MarketTrends } from "@/lib/market-trends";

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

  const profile = profileResult.data;
  let marketContext: string | null = null;
  let debugError: unknown = null;
  try {
    if (trendsResult.data && !trendsResult.error) {
      marketContext = formatMarketContext(trendsResult.data as unknown as MarketTrends, 30);
    } else {
      debugError = trendsResult.error ?? "no data, no error";
    }
  } catch (err) {
    console.warn("[Chat] Could not format market context:", err instanceof Error ? err.message : err);
    debugError = err;
  }

  try {
    const systemPrompt = buildProfileAuditSystemPrompt(profile, marketContext);
    return streamChat(systemPrompt, messages, undefined, 1500, debugError);
  } catch (err) {
    console.error("[Chat] Failed to start stream:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to start the AI chat. Please try again." },
      { status: 500 }
    );
  }
}

function buildProfileAuditSystemPrompt(
  profile: Record<string, unknown> | null,
  marketContext: string | null
): string {
  const portfolio = profile?.portfolio as { title: string; description?: string }[] | null;
  const portfolioPreview = Array.isArray(portfolio)
    ? portfolio
        .slice(0, 8)
        .map((p) => `- ${p.title}${p.description ? ": " + p.description.slice(0, 180) : ""}`)
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
  if (profile?.bio) fields.push(`Bio:\n${String(profile.bio).slice(0, 1500)}`);
  if (portfolioPreview) fields.push(`Portfolio:\n${portfolioPreview}`);

  return `You are an AI career coach inside UpScore that audits a freelancer's Upwork profile and helps them improve it.

=== FREELANCER PROFILE (the logged-in user) ===
${profile ? fields.join("\n") : "No profile has been synced yet. Be honest about that and explain how to sync it (install the extension and visit the Upwork profile page)."}

${marketContext ? marketContext : "=== MARKET TRENDS CONTEXT ===\n(Not available right now. Note this briefly if the user asks about demand, pricing, or niche, and give general advice instead.)"}

=== BEHAVIOR ===
- Answer questions about this profile: its strengths, weaknesses, how to improve the bio, headline, skills, and portfolio, and what niche or job types it is best positioned for.
- Use the MARKET TRENDS CONTEXT as your source of truth for demand, pricing and client signals: rank the user's skills against the top in-demand skills, suggest whether their hourly rate is aligned with median budgets/hourly rates, and recommend skills to add or drop based on demand. If a signal is absent from the context, do not invent numbers.
- Be specific and reference the actual profile data above. If a field is missing, say so and suggest what the user should add — never invent earnings, ratings, or past work.
- Give actionable, concrete advice a freelancer can apply today (rewrite examples welcome, clearly marked as suggestions).
- Keep answers concise (under ~350 words) unless the user asks for something longer.
- Format with plain text: short paragraphs, occasionally light markdown bullets.`;
}
