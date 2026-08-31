import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { proposalMethodology } from "@/lib/proposals/system-prompt";
import { streamChat, type ChatMessage } from "@/lib/chat-stream";
import { runMcpChat } from "@/lib/upwork/mcp-agent";
import { requirePaid } from "@/lib/subscription-guard";
import { getUpworkSession } from "@/lib/upwork/session";
import { callMcp, getProfile, normalizeMcpProfile } from "@/lib/upwork/mcp";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

type ChatJob = {
  title: string | null;
  description: string | null;
  skills: string[] | null;
  budget: number | null;
  hourly_min: number | null;
  hourly_max: number | null;
  job_type: string | null;
  contractor_tier: string | null;
  duration_label: string | null;
  proposals_count: number | null;
  client_country: string | null;
  client_city: string | null;
  client_score: number | null;
  client_total_spend: number | null;
  client_hire_rate: number | null;
  client_payment_verified: boolean | null;
  client_location_country: string | null;
  job_analyses:
  | {
    match_score: number | null;
    opportunity_score: number | null;
    win_probability: number | null;
    recommendation: string | null;
    reasoning: string | null;
    proposal_tips: string[] | null;
    red_flags: string[] | null;
  }[]
  | null;
};

type ChatProfile = {
  title: string | null;
  bio: string | null;
  skills: string[] | null;
  portfolio: unknown;
} | null;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subError = await requirePaid(user.id);
  if (subError) return subError;

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

  if (!messages.length) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const last = messages[messages.length - 1];
  if (last?.role !== "user" || !last.content.trim()) {
    return NextResponse.json({ error: "Last message must be from the user" }, { status: 400 });
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(
      `title,
       description,
       skills,
       budget,
       hourly_min,
       hourly_max,
       job_type,
       contractor_tier,
       duration_label,
       proposals_count,
       client_country,
       client_city,
       client_score,
       client_total_spend,
       client_hire_rate,
       client_payment_verified,
       client_location_country,
       job_analyses (
        match_score,
        opportunity_score,
        win_probability,
        recommendation,
        reasoning,
        proposal_tips,
        red_flags,
        user_id
       )`
    )
    .eq("id", id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Filter analyses to current user only (can't use !inner with optional join)
  if ((job as any).job_analyses) {
    (job as any).job_analyses = (job as any).job_analyses.filter((a: any) => a.user_id === user.id);
    if ((job as any).job_analyses.length === 0) (job as any).job_analyses = null;
  }

  let profile: ChatProfile = (
    await supabase.from("upwork_profiles").select("title, bio, skills, portfolio").eq("user_id", user.id).single()
  ).data as ChatProfile;
  let profileSource: "database" | "mcp" | null = profile ? "database" : null;

  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("proposal_system_prompt, proposal_submit_mode")
    .eq("user_id", user.id)
    .maybeSingle();

  const customSystemPrompt = preferences?.proposal_system_prompt as string | null | undefined;
  const proposalSubmitMode =
    (preferences?.proposal_submit_mode as string | null | undefined) || "draft";

  const { data: filters } = await supabase
    .from("job_filters")
    .select("keywords")
    .eq("user_id", user.id)
    .limit(5);

  const userKeywords =
    filters?.flatMap((f) => (f.keywords as string[]) || []) || [];

  // Fetch Upwork session for live data
  let upworkSession: Awaited<ReturnType<typeof getUpworkSession>> = null;
  let connectsBalance: number | null = null;
  if (env.isUpworkConfigured) {
    try {
      upworkSession = await getUpworkSession(user.id);
      if (upworkSession) {
        const [connectsRes, mcpProfileRes] = await Promise.allSettled([
          callMcp(upworkSession.token.access_token, env.UPWORK_MCP_URL, "tool", {
            toolName: "upwork__get_freelancer_financials",
            arguments: { action: "connects_balance", org_uid: upworkSession.orgUid, params: { limit: 1 } },
          }),
          getProfile(upworkSession.token.access_token, env.UPWORK_MCP_URL, upworkSession.orgUid),
        ]);
        if (connectsRes.status === "fulfilled") {
          connectsBalance = extractConnects(connectsRes.value);
        }
        // Fall back to live MCP profile when the extension hasn't synced one.
        if (mcpProfileRes.status === "fulfilled") {
          const mcpProfile = normalizeMcpProfile(mcpProfileRes.value);
          if (mcpProfile && !profile) {
            profile = {
              title: mcpProfile.title as string | null,
              bio: mcpProfile.bio as string | null,
              skills: (mcpProfile.skills as string[]) ?? null,
              portfolio: mcpProfile.portfolio ?? null,
            } as ChatProfile;
            profileSource = "mcp";
          }
        }
      }
    } catch (e) {
      console.warn("[Job Chat] Upwork live data fetch failed:", e instanceof Error ? e.message : e);
    }
  }

  const systemPrompt = buildChatSystemPrompt(
    job as ChatJob,
    (profile as ChatProfile) || null,
    userKeywords,
    customSystemPrompt ?? undefined,
    upworkSession,
    connectsBalance,
    profileSource,
    proposalSubmitMode
  );

  // When the user asks for a proposal, keep a copy in the `proposals` table
  // so the Proposals page tracks every AI-written proposal as activity. In
  // publish/auto_submit modes the proposal has been (or will be) sent to
  // Upwork, so we mark it as `sent` rather than `draft`.
  const proposalDraftStatus = proposalSubmitMode === "draft" ? "draft" : "sent";
  const saveProposal = isProposalDraftRequest(last.content)
    ? { supabase: createSupabaseAdminClient(), userId: user.id, jobId: id, status: proposalDraftStatus }
    : undefined;

  const proposalDraftCallback = saveProposal
    ? async (fullContent: string) => {
      const { error: saveError } = await saveProposal.supabase
        .from("proposals")
        .insert({
          user_id: saveProposal.userId,
          job_id: saveProposal.jobId,
          generated_text: fullContent,
          status: saveProposal.status as "draft" | "sent",
        });
      return !saveError;
    }
    : undefined;

  // Submission is controlled by the user's per-user proposal_submit_mode:
  //   'draft'       → real Upwork submission is BLOCKED (isTesting=true). The AI
  //                   writes the proposal and it's saved to the Proposals page.
  //   'publish'     → real submission ENABLED; the AI prepares the proposal and
  //                   its real submission on Upwork for the user to review.
  //   'auto_submit' → real submission ENABLED; the AI submits directly to Upwork.
  // NOTE: publish/auto_submit reach out to Upwork and spend the user's Connects.
  const isTesting = proposalSubmitMode === "draft";

  if (upworkSession) {
    return runMcpChat({
      systemPrompt,
      messages,
      mcp: {
        accessToken: upworkSession.token.access_token,
        url: env.UPWORK_MCP_URL,
        orgUid: upworkSession.orgUid,
        isTesting,
        // Only register the tools that are actually useful in the job chat.
        // NOTE: NO job-finding tools here — the AI works from the current saved
        // job (passed in "THIS JOB") and focuses on proposing: connects/price
        // check, own proposals, profile, and proposal submission.
        toolIncludes: [
          "upwork_get_freelancer_financials",
          "upwork_list_freelancer_proposals",
          "upwork_get_profile",
          "upwork_manage_proposals",
        ],
        maxResultChars: 3000,
      },
      maxToolIterations: 3,
      onProposalDraft: proposalDraftCallback,
    });
  }

  return streamChat(systemPrompt, messages, saveProposal);
}

function isProposalDraftRequest(text: string): boolean {
  return /(write|draft|generate|create|improve|rewrite|compose|polish)\b.{0,80}\b(proposal|cover letter)\b/i.test(
    text
  );
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

function buildChatSystemPrompt(
  job: ChatJob,
  profile: ChatProfile,
  userKeywords: string[],
  customPrompt?: string,
  upworkSession?: Awaited<ReturnType<typeof getUpworkSession>> | null,
  connectsBalance?: number | null,
  profileSource?: "database" | "mcp" | null,
  proposalSubmitMode: string = "draft"
): string {
  const analysis = job.job_analyses?.[0];
  const skills = Array.isArray(job.skills) ? job.skills.join(", ") : "None listed";
  const budget = job.budget
    ? `$${job.budget}`
    : job.hourly_min
      ? `$${job.hourly_min}-$${job.hourly_max}/hr`
      : "Not specified";
  const clientCountry = job.client_city
    ? `${job.client_city}, ${job.client_location_country || job.client_country || "Unknown"}`
    : job.client_location_country || job.client_country || "Unknown";
  const paymentVerified =
    job.client_payment_verified === true
      ? "Verified"
      : "Not verified";

  const portfolio = profile?.portfolio as { title: string; description?: string }[] | null;
  const portfolioPreview = Array.isArray(portfolio)
    ? portfolio
      .slice(0, 5)
      .map((p) => `- ${p.title}${p.description ? ": " + p.description.slice(0, 150) : ""}`)
      .join("\n")
    : undefined;

  const profileFields: string[] = [];
  if (profile?.title) profileFields.push(`Title: ${profile.title}`);
  if (profile?.skills?.length) profileFields.push(`Skills: ${profile.skills.join(", ")}`);
  else if (userKeywords.length) profileFields.push(`Skills (from filters): ${userKeywords.join(", ")}`);
  if (profile?.bio) profileFields.push(`Background:\n${String(profile.bio).slice(0, 1200)}`);
  if (portfolioPreview) profileFields.push(`Portfolio:\n${portfolioPreview}`);
  if (profileSource === "mcp") {
    profileFields.push("(Profile pulled LIVE from Upwork via the Upwork API — no extension sync needed.)");
  }

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

  // STATIC BLOCK FIRST — same for every request per custom prompt,
  // so Groq's automatic prefix cache serves the cached tokens.
  const staticMethodology = customPrompt && customPrompt.trim().length
    ? customPrompt.trim()
    : proposalMethodology;

  const staticBlock = `You are an AI assistant inside UpScore. Help the freelancer evaluate this Upwork job and write proposals.

=== BEHAVIOR ===
- Answer questions about the job, client, whether to apply, and how to position the application.
- When asked to write/draft/improve a proposal, use the PROPOSAL METHODOLOGY and the freelancer's real profile. Never invent past results, tools, or case studies not present in the profile — if the profile is empty, say so and offer a generic draft the user can personalize.
- Use LIVE UPWORK DATA for real-time connects balance and account status. If unavailable, guide user to connect in Settings.
- Keep conversational answers concise (under ~350 words) unless the user asks for a full proposal.
- Format: plain text, short paragraphs, occasional light markdown bullets. No headers inside proposals.

=== PROPOSAL METHODOLOGY ===
${staticMethodology}

=== FREELANCER PROFILE (the logged-in user) ===
${profileFields.length ? profileFields.join("\n") : "No profile data. Do not invent past work — keep proof generic or ask user for specifics."}

${upworkLiveData.length ? `=== LIVE UPWORK DATA ===
${upworkLiveData.join("\n")}` : "=== LIVE UPWORK DATA ===\nNot connected or unavailable. Connect Upwork in Settings to see live connects balance."}

=== MCP TOOLS (when Upwork is connected) ===
You work from the CURRENT JOB already given in "THIS JOB" below — you do NOT search for new jobs. To advise/act on it you may call live Upwork tools:
- upwork_get_freelancer_financials (connects_balance) — check real-time connects to decide bid affordability
- upwork_list_freelancer_proposals — the user's own proposals/invitations
- upwork_get_profile — the user's live profile (skills, rate) to align the proposal
- upwork_manage_proposals — submit/prepare a proposal for this job (with bid/price adjustment and portfolio/attachment notes)
RULES: Make at most 1-2 tool calls per reply, then answer from the results. Never claim data you didn't retrieve. Never search for or pull other jobs — work only with the current job.

=== PROPOSAL SUBMISSION MODE ===
The user's proposal_submit_mode is "${proposalSubmitMode}":
- "draft": Write the proposal and output it as your reply. Do NOT submit to Upwork. (It is auto-saved to the Proposals page.)
- "publish": Write the proposal, then use upwork_manage_proposals to submit it on Upwork (this spends Connects). After submitting, clearly report what was submitted and the Connects cost. Always confirm the bid and ask the user to review before doing anything irreversible.
- "auto_submit": Write the proposal and use upwork_manage_proposals to submit it directly on Upwork without pausing (this spends Connects). After submitting, report the result and Connects cost.
Only ever submit for THIS job (never another). If you lack enough info (bid, job reference), ask before acting.`;

  // DYNAMIC BLOCK — changes every request; placed after static for cache.
  const dynamicBlock = `=== THIS JOB ===
Title: ${job.title || "Untitled"}
Description: ${String(job.description || "").slice(0, 2500)}
Skills: ${skills} | Budget: ${budget} | Type: ${job.job_type || "N/A"} | Level: ${job.contractor_tier || "N/A"} | Duration: ${job.duration_label || "N/A"} | Proposals: ${job.proposals_count ?? "N/A"}
Client: ${clientCountry} | Score: ${job.client_score ?? "N/A"}/5 | Spend: ${job.client_total_spend != null ? "$" + job.client_total_spend : "N/A"} | Hire rate: ${job.client_hire_rate != null ? job.client_hire_rate + "%" : "N/A"} | Payment: ${paymentVerified}

=== AI ANALYSIS ===
${analysis ? `Match: ${analysis.match_score}/100 | Opp: ${analysis.opportunity_score}/100 | Win: ${analysis.win_probability ?? "N/A"}% | Rec: ${analysis.recommendation || "consider"}
Tips: ${(analysis.proposal_tips || []).join("; ") || "None"}
Flags: ${(analysis.red_flags || []).join("; ") || "None"}` : "No analysis available. Reason from the job description alone."}`;

  return staticBlock + "\n\n" + dynamicBlock;
}
