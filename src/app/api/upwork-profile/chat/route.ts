import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { streamChat, type ChatMessage } from "@/lib/chat-stream";

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

  const { data: profile } = await supabase
    .from("upwork_profiles")
    .select(
      "title, bio, skills, portfolio, hourly_rate, total_earnings, total_jobs_done, client_rating, upwork_url"
    )
    .eq("user_id", user.id)
    .single();

  const systemPrompt = buildProfileAuditSystemPrompt(profile);
  return streamChat(systemPrompt, messages, undefined, 1500);
}

function buildProfileAuditSystemPrompt(profile: Record<string, unknown> | null): string {
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

=== BEHAVIOR ===
- Answer questions about this profile: its strengths, weaknesses, how to improve the bio, headline, skills, and portfolio, and what niche or job types it is best positioned for.
- Be specific and reference the actual profile data above. If a field is missing, say so and suggest what the user should add — never invent earnings, ratings, or past work.
- Give actionable, concrete advice a freelancer can apply today (rewrite examples welcome, clearly marked as suggestions).
- Keep answers concise (under ~350 words) unless the user asks for something longer.
- Format with plain text: short paragraphs, occasionally light markdown bullets.`;
}
