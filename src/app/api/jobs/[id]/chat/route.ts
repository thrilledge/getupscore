import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { proposalMethodology } from "@/lib/proposals/system-prompt";
import { streamChat, type ChatMessage } from "@/lib/chat-stream";
import { requirePaid } from "@/lib/subscription-guard";

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

  const { data: profile } = await supabase
    .from("upwork_profiles")
    .select("title, bio, skills, portfolio")
    .eq("user_id", user.id)
    .single();

  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("proposal_system_prompt")
    .eq("user_id", user.id)
    .maybeSingle();

  const customSystemPrompt = preferences?.proposal_system_prompt as string | null | undefined;

  const { data: filters } = await supabase
    .from("job_filters")
    .select("keywords")
    .eq("user_id", user.id)
    .limit(5);

  const userKeywords =
    filters?.flatMap((f) => (f.keywords as string[]) || []) || [];

  const systemPrompt = buildChatSystemPrompt(
    job as ChatJob,
    (profile as ChatProfile) || null,
    userKeywords,
    customSystemPrompt ?? undefined
  );

  // When the user asks for a proposal, keep a copy in the `proposals` table
  // so the Proposals page tracks every AI-written proposal as activity.
  const saveProposal = isProposalDraftRequest(last.content)
    ? { supabase: createSupabaseAdminClient(), userId: user.id, jobId: id }
    : undefined;

  return streamChat(systemPrompt, messages, saveProposal);
}

function isProposalDraftRequest(text: string): boolean {  return /(write|draft|generate|create|improve|rewrite|compose|polish)\b.{0,80}\b(proposal|cover letter)\b/i.test(
    text
  );
}

function buildChatSystemPrompt(
  job: ChatJob,
  profile: ChatProfile,
  userKeywords: string[],
  customPrompt?: string
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

  return `You are an AI assistant inside UpScore that helps a freelancer evaluate Upwork jobs and write proposals. You have context about exactly ONE job.

=== THIS JOB ===
Title: ${job.title || "Untitled"}
Description:
${String(job.description || "").slice(0, 4000)}
Skills: ${skills}
Budget: ${budget}
Job type: ${job.job_type || "Not specified"}
Experience level: ${job.contractor_tier || "Not specified"}
Duration: ${job.duration_label || "Not specified"}
Proposals submitted so far: ${job.proposals_count ?? "Unknown"}
Client: ${clientCountry} | Score: ${job.client_score != null ? job.client_score + "/5" : "N/A"} | Total spend: ${job.client_total_spend != null ? "$" + job.client_total_spend : "N/A"} | Hire rate: ${job.client_hire_rate != null ? job.client_hire_rate + "%" : "N/A"} | Payment: ${paymentVerified}

=== AI ANALYSIS OF THIS JOB ===
${analysis ? `Match: ${analysis.match_score}/100
Opportunity: ${analysis.opportunity_score}/100
Win probability: ${analysis.win_probability != null ? analysis.win_probability + "%" : "N/A"}
Recommendation: ${analysis.recommendation || "consider"}
Reasoning: ${analysis.reasoning || "N/A"}
Proposal tips:
${(analysis.proposal_tips || []).map((t: string) => `- ${t}`).join("\n")}
Red flags:
${(analysis.red_flags || []).map((f: string) => `- ${f}`).join("\n") || "- None"}` : "No AI analysis available yet. You can reason about the job from the description alone."}

=== FREELANCER PROFILE (the logged-in user) ===
${profileFields.length ? profileFields.join("\n") : "No profile data available. Do not invent past work — keep any proof generic or ask the user for specifics."}

=== PROPOSAL METHODOLOGY ===
${customPrompt && customPrompt.trim().length ? customPrompt.trim() : proposalMethodology}

=== BEHAVIOR ===
- Answer questions about this job, its client, whether to apply, and how to position the application. Use the AI analysis above as your baseline but feel free to go deeper.
- When the user asks to write, draft, or improve a proposal, produce it using the PROPOSAL METHODOLOGY and the freelancer's real profile. NEVER invent past results, tools, or case studies not present in the profile — if the profile is empty, say so and offer to write a generic draft the user can personalize.
- Keep conversational answers concise (under ~350 words) unless the user asks for a full proposal.
- Format with plain text: short paragraphs, occasionally light markdown bullets. No headers inside proposals.`;
}
