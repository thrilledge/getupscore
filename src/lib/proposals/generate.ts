import { buildProposalSystemPrompt, buildAnswerSystemPrompt, buildBasicProposalPrompt } from "./system-prompt";
import { chatCompletionWithRetry, parseLlmJson, friendlyLlmError } from "@/lib/llm";
import { logLlmUsage } from "@/lib/llm-logger";

export interface ProposalInput {
  jobTitle: string;
  jobDescription: string;
  jobUrl?: string;
  skills?: string[];
  budget?: string;
  clientCountry?: string;
  proposalsCount?: number;
  postedAt?: string;
  clientHireRate?: number;
  clientTotalSpend?: number;
  clientRating?: number;
  proposalTips?: string[];
  matchScore?: number;
  opportunityScore?: number;
  winProbability?: number;
  recommendation?: string;
  userName?: string;
  userTitle?: string;
  userSkills?: string[];
  userExperience?: string;
  portfolioItems?: string;
  customInstructions?: string;
  answerQuestion?: string;
  systemPrompt?: string;
  userId?: string;
}

export interface ProposalResult {
  generated_text: string;
  score?: number;
}

export type StreamEvent =
  | { type: "reasoning"; text: string }
  | { type: "proposal"; text: string }
  | { type: "done"; score: number }
  | { type: "error"; text: string };

/**
 * Strip markdown emphasis from text WITHOUT touching URLs. Asterisks and
 * backticks are always removed. Underscores are only treated as italic
 * markers when they wrap a space-delimited word (_like this_), so
 * github.com/usama_adeel/my_repo survives intact.
 */
function stripMarkdownEmphasis(s: string): string {
  return s
    .replace(/[*`]/g, "")
    .replace(/(^|\s)_+([^_\s][^_\n]*?)_+(?=\s|$|[.,;:!?])/g, "$1$2");
}

export async function generateProposal(
  input: ProposalInput,
  _groqApiKey?: string,
  _groqModel?: string,
  isPaid: boolean = true
): Promise<ProposalResult> {
  try {
    const startTime = Date.now();
    const { response, provider } = await chatCompletionWithRetry(
      (p) => ({
        model: p.model,
        messages: [
          {
            role: "system", content: input.answerQuestion
              ? buildAnswerSystemPrompt(input.systemPrompt)
              : isPaid
                ? buildProposalSystemPrompt("json", input.systemPrompt)
                : buildBasicProposalPrompt()
          },
          { role: "user", content: buildPrompt(input) },
        ],
        temperature: 0.7,
        max_tokens: isPaid ? 4000 : 2000,
        ...(p.groqStyle ? { reasoning_format: "hidden" as const } : {}),
        ...(isPaid ? { response_format: { type: "json_object" as const } } : {}),
      }),
      { preferGroq: true }
    );
    console.log("[Proposal] Using provider:", provider.name, "model:", provider.model, "isPaid:", isPaid);

    const data = await response.json();
    const duration_ms = Date.now() - startTime;

    logLlmUsage({
      user_id: input.userId,
      provider: provider.name,
      model: provider.model,
      endpoint: input.answerQuestion ? "answer" : "proposal",
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
      total_tokens: data.usage?.total_tokens ?? 0,
      duration_ms,
      success: true,
    }).catch(() => { });

    const content = data.choices?.[0]?.message?.content;
    if (!content) return generateFallbackProposal(input);

    if (isPaid) {
      // If `parsed.proposal` is missing/invalid, fall back to the proper
      // fallback generator instead of ever leaking raw unparsed JSON.
      const parsed = parseLlmJson(content);
      const proposalText =
        typeof parsed?.proposal === "string" && parsed.proposal.trim()
          ? parsed.proposal
          : null;
      if (!proposalText) {
        console.warn("[Proposal] JSON response missing usable 'proposal' field, using fallback.");
        return generateFallbackProposal(input);
      }
      const cleanedJson = cleanProposal(proposalText);
      const enforced = maybeEnsureClosingBlock(input, cleanedJson);
      return {
        generated_text: enforced,
        score: scoreProposal(enforced),
      };
    }

    const cleaned = cleanProposal(content);
    const enforced = maybeEnsureClosingBlock(input, cleaned);
    return {
      generated_text: enforced,
      score: scoreProposal(enforced),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[Proposal] Generation error:", message);
    logLlmUsage({
      user_id: input.userId,
      provider: "unknown",
      model: "unknown",
      endpoint: input.answerQuestion ? "answer" : "proposal",
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      success: false,
      error_message: message.slice(0, 500),
    }).catch(() => { });
    return generateFallbackProposal(input);
  }
}

export async function streamProposal(
  input: ProposalInput,
  _groqApiKey?: string,
  _groqModel?: string,
  isPaid: boolean = true
): Promise<ReadableStream<Uint8Array>> {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const { response, provider } = await chatCompletionWithRetry(
          (p) => ({
            model: p.model,
            messages: [
              {
                role: "system", content: input.answerQuestion
                  ? buildAnswerSystemPrompt(input.systemPrompt)
                  : isPaid
                    ? buildProposalSystemPrompt("stream", input.systemPrompt)
                    : buildBasicProposalPrompt()
              },
              { role: "user", content: buildPrompt(input) },
            ],
            stream: true,
            ...(isPaid && p.groqStyle ? { reasoning_format: "hidden" as const } : {}),
            temperature: 0.7,
            max_tokens: isPaid ? 4000 : 2000,
          }),
          { preferGroq: true }
        );
        console.log("[Proposal Stream] Using provider:", provider.name, "model:", provider.model, "isPaid:", isPaid);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let proposalText = "";

        // Upwork proposals must be plain text. Per-chunk stripping only
        // removes asterisks and backticks: underscore handling needs full
        // context (chunks can split a URL), so it is left to cleanProposal.
        // Never strip underscores here - it would corrupt portfolio links.
        const stripChunk = (s: string): string => s.replace(/[*`]/g, "");

        const emit = (chunk: string) => {
          if (!chunk) return;
          const clean = stripChunk(chunk);
          proposalText += clean;
          send("proposal", { text: clean });
        };

        // Groq (reasoning_format: hidden) hides all reasoning tokens.
        // Non-Groq providers may leak stray <think> blocks into content,
        // so route them through an incremental scrubber that streams
        // everything else live.
        const cleaner = provider.groqStyle
          ? null
          : createThinkScrubber(emit);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json);
              const delta = parsed.choices?.[0]?.delta;
              if (delta?.reasoning) {
                send("reasoning", { text: delta.reasoning });
              }
              if (delta?.content) {
                if (cleaner) cleaner.push(delta.content);
                else emit(delta.content);
              }
            } catch { }
          }
        }

        if (cleaner) cleaner.flush();

        const finalText = cleanProposal(proposalText);
        if (!finalText) {
          console.warn("[Proposal Stream] Model returned no usable proposal text - falling back to non-streaming generation.");
          // The streaming response produced no content deltas (empty body,
          // provider-specific SSE shape, or a mid-stream failure). Recover by
          // generating non-streaming, which has its own JSON-parse + fallback
          // handling, and emit what we got.
          const fallback = await generateProposal(input, undefined, undefined, isPaid);
          const fbText = fallback.generated_text.trim();
          if (fbText) {
            send("proposal", { text: fbText });
            send("done", { score: fallback.score ?? scoreProposal(fbText) });
          } else {
            send("error", { text: "Model returned no usable proposal text." });
          }
          controller.close();
          return;
        }

        const enforcedText = maybeEnsureClosingBlock(input, finalText);

        // If the model skipped the mandatory sign-off, stream the appended
        // block so both the live UI and the DB-saved text carry it.
        if (enforcedText !== finalText) {
          const suffix = enforcedText.slice(finalText.length).trim();
          if (suffix) send("proposal", { text: `\n\n${suffix}` });
        }

        logLlmUsage({
          user_id: input.userId,
          provider: provider.name,
          model: provider.model,
          endpoint: input.answerQuestion ? "answer" : "proposal",
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          success: true,
        }).catch(() => { });

        send("done", { score: scoreProposal(enforcedText) });
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.warn("[Proposal Stream] Error:", message);
        send("error", { text: friendlyLlmError(err) });
        controller.close();
      }
    },
  });
}

/**
 * Detects whether a job reads as small / low-budget / same-day urgent, so
 * the writing directive can calibrate down: no clarifying questions,
 * explicit budget/timeline confirmation, and a direct-action close.
 *
 * This is a heuristic on purpose - it only needs to catch the clear cases
 * (e.g. "$20 fixed, need this today") well enough to steer tone.
 */
function detectJobSizeSignal(input: ProposalInput): string | null {
  const desc = `${input.jobTitle} ${input.jobDescription}`.toLowerCase();
  const budget = (input.budget || "").toLowerCase();

  const urgentKeywords = /\b(today|asap|as soon as possible|right away|urgent(ly)?)\b/;
  const smallKeywords = /\b(quick fix|small task|simple fix|minor (fix|issue|change|task)|small job|small (project|gig))\b/;

  // Try to pull a dollar amount out of the budget string to catch low
  // fixed-price jobs (e.g. "$20 fixed price"). Hourly rates aren't treated
  // as "low budget" the same way a small fixed price is.
  let lowFixedBudget = false;
  const amountMatch = budget.match(/\$?\s*(\d+(?:\.\d+)?)/);
  if (amountMatch) {
    const amount = parseFloat(amountMatch[1]);
    const looksHourly = /hour|\/\s*hr|\bhr\b/.test(budget);
    if (!looksHourly && amount > 0 && amount <= 50) lowFixedBudget = true;
  }

  const isUrgent = urgentKeywords.test(desc);
  const isSmall = smallKeywords.test(desc) || lowFixedBudget;

  if (!isUrgent && !isSmall) return null;

  const reasons: string[] = [];
  if (lowFixedBudget) reasons.push(`low fixed budget (${input.budget})`);
  if (isUrgent) reasons.push("client wants same-day/urgent completion");
  if (isSmall && !lowFixedBudget) reasons.push("client frames this as a small/quick task");

  return `This reads as a SMALL, LOW-FRICTION job (${reasons.join("; ")}). Calibrate the proposal accordingly:
- Do NOT ask clarifying questions unless something is genuinely blocking execution - the client wants speed, not a discovery process.
- Explicitly confirm, in plain language, that you can meet the stated budget and/or timeline.
- Close with a direct, ready-to-start action (e.g. "send me access and I'll get started") - not a question or an invitation to "discuss next steps".
- Keep the proposal noticeably shorter than the 180-word ceiling; drop any step that isn't essential.`;
}

function buildPrompt(input: ProposalInput): string {
  const sections: string[] = [];

  // ── JOB DETAILS ──────────────────────────────────────────────────────────
  sections.push(`=== JOB DETAILS ===
Title: ${input.jobTitle}
Description:
${input.jobDescription.slice(0, 6000)}
${input.budget ? `Budget/Rate: ${input.budget}` : "Budget: Not specified - anchor on value, not cost"}
${input.clientCountry ? `Client Location: ${input.clientCountry}` : ""}
${input.skills?.length ? `Required Skills: ${input.skills.join(", ")}` : ""}
${input.matchScore !== undefined ? `AI Match Score: ${input.matchScore}/100` : ""}
${input.opportunityScore !== undefined ? `AI Opportunity Score: ${input.opportunityScore}/100` : ""}
${input.winProbability !== undefined ? `AI Win Probability: ${input.winProbability}/100` : ""}
${input.recommendation ? `AI Recommendation: ${input.recommendation}` : ""}`);

  // ── JOB SIZE SIGNAL ────────────────────────────────────────────────────────
  const jobSizeSignal = detectJobSizeSignal(input);
  if (jobSizeSignal) {
    sections.push(`\n=== JOB SIZE SIGNAL ===\n${jobSizeSignal}`);
  }

  // ── COMPETITION SIGNALS ───────────────────────────────────────────────────
  const signalFields: string[] = [];
  if (input.proposalsCount !== undefined) {
    const level = input.proposalsCount < 5 ? "LOW" : input.proposalsCount < 20 ? "MED" : input.proposalsCount < 50 ? "HIGH" : "VERY HIGH";
    signalFields.push(`Proposals: ${input.proposalsCount} (${level}${level === "LOW" ? " - early mover" : level === "VERY HIGH" ? " - radical specificity only" : ""})`);
  }
  if (input.postedAt) signalFields.push(`Posted: ${input.postedAt}`);
  sections.push(`\n=== COMPETITION ===
${signalFields.length ? signalFields.join("\n") : "No data."}
If HIGH+: make the first-line proof link as specific as possible.`);

  // ── CLIENT INTELLIGENCE ───────────────────────────────────────────────────
  const clientFields: string[] = [];
  if (input.clientTotalSpend !== undefined) {
    const sig = input.clientTotalSpend > 10000 ? "serious buyer" : input.clientTotalSpend > 1000 ? "moderate" : "cautious/new";
    clientFields.push(`Spend: $${input.clientTotalSpend} (${sig})`);
  }
  if (input.clientHireRate !== undefined) {
    const sig = input.clientHireRate >= 75 ? "decisive" : input.clientHireRate >= 40 ? "average" : "picky";
    clientFields.push(`Hire rate: ${input.clientHireRate}% (${sig})`);
  }
  if (input.clientRating !== undefined) {
    const sig = input.clientRating >= 4.5 ? "great" : input.clientRating >= 3.5 ? "average" : "low";
    clientFields.push(`Rating: ${input.clientRating}/5 (${sig})`);
  }
  sections.push(`\n=== CLIENT ===
${clientFields.length ? clientFields.join("\n") : "No data."}
Use to calibrate tone and CTA friction.`);

  // ── AI TIPS ───────────────────────────────────────────────────────────────
  if (input.proposalTips?.length) {
    sections.push(`\n=== AI ANALYSIS TIPS ===
${input.proposalTips.map((t) => `- ${t}`).join("\n")}`);
  }

  // ── FREELANCER PROFILE ────────────────────────────────────────────────────
  const profileFields: string[] = [];
  if (input.userName) profileFields.push(`Name: ${input.userName}`);
  if (input.userTitle) profileFields.push(`Title: ${input.userTitle}`);
  if (input.userSkills?.length) profileFields.push(`Skills: ${input.userSkills.join(", ")}`);
  if (input.userExperience) {
    profileFields.push(`Background:\n${input.userExperience.slice(0, 2500)}`);
  }
  sections.push(`\n=== PROFILE ===
${profileFields.length ? profileFields.join("\n") : "No data."}
Use only skills/experience relevant to this job. Never list all skills.`);

  // ── PORTFOLIO ─────────────────────────────────────────────────────────────
  if (input.portfolioItems) {
    sections.push(`\n=== PORTFOLIO (use for the first-line proof link; copy URLs exactly, never alter them) ===
${input.portfolioItems}`);
  } else {
    sections.push(`\n=== PORTFOLIO ===
None provided. Do NOT include any link or invent past projects. Open with the closest matching skill from the PROFILE.`);
  }

  // ── CUSTOM INSTRUCTIONS ───────────────────────────────────────────────────
  if (input.customInstructions) {
    sections.push(`\n=== CUSTOM PROPOSAL INSTRUCTIONS (highest priority - follow exactly) ===
${input.customInstructions}`);
  }

  // ── FINAL DIRECTIVE ───────────────────────────────────────────────────────
  if (input.answerQuestion) {
    sections.push(`
=== TASK ===
Answer this Upwork application question only. Do NOT write a proposal/cover letter.

Question: ${input.answerQuestion}

FORMAT: 40-100 words. Plain text only. No markdown/headers/labels. Reference relevant profile skills only. If no fit, say so briefly and point to closest skill. Include portfolio URLs (copied exactly) if asked for past work. Start directly with the answer.`);
  } else if (input.systemPrompt && input.systemPrompt.trim().length) {
    sections.push(`
=== TASK ===
Write proposal strictly following system prompt methodology.${jobSizeSignal ? " Apply JOB SIZE SIGNAL guidance." : ""} Output only proposal text.`);
  } else {
    sections.push(`
=== WRITING DIRECTIVE ===
Write proposal following the 5 moves from system prompt:
  1: Proof-link opener (first line, max 25 words: matching project + portfolio URL copied exactly + one thing to look at)
  2: Reframe (1 sentence, real need from THIS post; skip if the post is straightforward)
  3: Confirm (1 short line: you'll deliver what the post specifies, incl. any process/guidelines it mentions)
  4: Day-one (max 2, concrete first actions)
  5: Close (answer app questions, then ONE specific question tied to this job - or a direct action if JOB SIZE SIGNAL present - then Best Regards + name)

CHECKS: First line = matching project + portfolio URL (verbatim) + what to look at | If no portfolio URL, no link at all | No "Hi"/name opener | No "I've done this exact type of work" cliche | No invented fear/risk | No hedging | Helper tone, never lecturing | Reframe from this post | <180 words | No markdown/bold | "You" > "I" | No invented past work | No filler | No generic "let's discuss / available anytime" close | Sign-off "Best Regards," + name | Match tone | Plain text paragraphs | JOB SIZE SIGNAL overrides defaults`);
  }

  return sections.join("\n\n");
}

/**
 * Deterministic rubric score shared by both JSON and stream paths so the
 * number means the same thing everywhere. Rewards methodology moves and
 * penalizes verbosity past the 180-word ceiling.
 *
 * NOTE: this is a heuristic keyword/pattern score, not a real quality
 * assessment - treat/label it in the UI as a rough methodology checklist
 * score, not an objective "quality score".
 */
function scoreProposal(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const lower = text.toLowerCase();
  const firstLine = text.trim().split("\n")[0] || "";

  let score = 50;

  // Proof-link opener: a real URL in the very first line is the strongest
  // trust signal, so it is rewarded most.
  if (/https?:\/\/\S+|\b(?:github\.com|gitlab\.com|vercel\.app|netlify\.app)\/?\S*/i.test(firstLine)) score += 15;
  else if (/(i (built|developed|created|designed|shipped|delivered|converted|migrated|cleaned) (a|an|the|this)|for (a|the) (client|company|project)|in my (portfolio|past work))/.test(firstLine.toLowerCase())) score += 8;

  // Clarifying question: light reward only, so the model isn't pushed to
  // invent ambiguity in straightforward posts.
  if (lower.includes("?") && /(confirm|clarify|would|does|is there|do you|are you|what'?s|which)/.test(lower)) score += 3;
  if (/(here'?s how i'?d start|i'?d start by|how i'?d approach|i'?d begin|i'?d first)/.test(lower)) score += 10;
  if (/(send me|share|walk through|i'll (build|deliver|start|get))/i.test(lower)) score += 5;
  // Mandatory sign-off.
  if (/\bbest\s+regards\b/i.test(lower)) score += 10;
  // FUD / hedging - heavily penalized so a model that drowns the post in
  // manufactured risk scores lower than a clean, confident one.
  if (/(the real risk here|quiet pixel drift|lose fidelity|worth confirming|before you commit|most .*(fail|break|drift|fidelity)|could go wrong)/i.test(lower)) score -= 20;
  // Generic passive close.
  if (/(available for a chat|available anytime|let'?s discuss your project)/i.test(lower)) score -= 10;

  if (words <= 180) score += 10;
  else score -= 10 + Math.ceil((words - 180) / 10);

  return Math.max(1, Math.min(100, score));
}

/**
 * Incremental <think>...</think> scrubber for providers that leak reasoning
 * tags into the content stream (non-Groq providers; Groq strips reasoning
 * via `reasoning_format: hidden` so this isn't needed there). Streams
 * everything that isn't inside a think block immediately, holding back only
 * the minimum needed to avoid splitting a tag across chunk boundaries.
 */
function createThinkScrubber(emit: (chunk: string) => void) {
  const TAG_HOLD = 8; // length of "</think>", the longest tag we scrub
  let buffer = "";
  let thinkOpen = false;

  function process(flushAll: boolean) {
    for (; ;) {
      if (thinkOpen) {
        const close = buffer.indexOf("</think>");
        if (close === -1) {
          if (flushAll) buffer = "";
          return;
        }
        buffer = buffer.slice(close + 8);
        thinkOpen = false;
        continue;
      }

      const open = buffer.indexOf("<think>");
      if (open === -1) {
        const holdLen = flushAll ? 0 : Math.min(TAG_HOLD, buffer.length);
        const safeLen = buffer.length - holdLen;
        if (safeLen > 0) {
          emit(buffer.slice(0, safeLen));
          buffer = buffer.slice(safeLen);
        }
        return;
      }

      if (open > 0) emit(buffer.slice(0, open));
      buffer = buffer.slice(open + 7);
      thinkOpen = true;
    }
  }

  return {
    push(raw: string) {
      if (!raw) return;
      buffer += raw;
      process(false);
    },
    flush() {
      process(true);
    },
  };
}

/**
 * Guarantee the proposal ends with the sign-off. The closing LINE (a
 * specific question or direct action) is written by the model, because a
 * generic hard-coded line is exactly what hurts reply rates. If the model
 * already produced a "Best Regards" (any casing) we trust it and leave the
 * text untouched; otherwise we append the sign-off + the freelancer's name.
 */
function ensureClosingBlock(text: string, userName?: string): string {
  const trimmed = text.trim();
  if (!trimmed) return text;

  if (/\bbest\s+regards\b/i.test(trimmed)) return trimmed;

  const name = userName?.trim() || "Your Name";
  return `${trimmed}\n\nBest Regards,\n\n${name}`;
}

/**
 * Apply sign-off enforcement only for full proposals. Answer-question
 * responses (single Upwork application answers) must stay short and direct -
 * they never get a signature block.
 */
function maybeEnsureClosingBlock(input: ProposalInput, text: string): string {
  if (input.answerQuestion) return text;
  return ensureClosingBlock(text, input.userName);
}

/**
 * Strip any stray reasoning blocks, markdown fences, or leaked labels from a
 * complete (non-streamed, or fully-assembled) proposal string.
 */
function cleanProposal(raw: string): string {
  if (!raw) return "";

  let text = raw;

  // Self-hosted reasoning models leak chain-of-thought as <think>...</think>.
  text = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/<\/?think>/g, "");

  text = text
    .replace(/```/g, "")
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      return t !== "PROPOSAL:" && t !== "Proposal:";
    })
    .join("\n")
    // Replace en-dashes and em-dashes with simple dash.
    .replace(/[–—]/g, "-")
    // Add line break before numbered steps like "1.", "2.", "3." when preceded by text.
    .replace(/(\S)\s+(?=\d+[\.\)]\s)/g, "$1\n")
    .replace(/\n{3,}/g, "\n\n");

  // Strip markdown emphasis (bold/italic/backticks) - plain text output only,
  // without corrupting underscores inside URLs.
  text = stripMarkdownEmphasis(text).trim();

  return text;
}

function generateFallbackProposal(input: ProposalInput): ProposalResult {
  const lines: string[] = [];
  const jobSizeSignal = detectJobSizeSignal(input);

  // Move 1 - Proof-link opener. Only uses what the freelancer actually
  // provided; never claims experience or links that can't be verified.
  const tools = input.skills?.slice(0, 3).filter(Boolean).join(", ");
  const firstPortfolioLine = input.portfolioItems
    ?.split("\n")
    .map((l) => l.trim())
    .find(Boolean);

  if (firstPortfolioLine) {
    lines.push(`You can check my related work first: ${firstPortfolioLine.slice(0, 200)}`);
  } else if (tools) {
    lines.push(`My closest experience to this job is ${tools}.`);
  } else {
    lines.push("Here's how I'd approach your project.");
  }
  lines.push("");

  // Move 3 - Confirm
  lines.push(
    input.jobTitle
      ? `I'll deliver exactly what your "${input.jobTitle}" post describes, and keep you updated as I go.`
      : "I'll deliver exactly what your post describes, and keep you updated as I go."
  );
  lines.push("");

  if (jobSizeSignal) {
    // Small/urgent job: skip the question, acknowledge budget/timeline,
    // go straight to a lean plan + direct-action close.
    if (input.budget) {
      lines.push(`This fits within ${input.budget}, and I can get started right away.`);
      lines.push("");
    }
    lines.push(
      "Here's how I'd start: review what you've shared, make the fix, then verify it works before handing it over."
    );
    lines.push("");
    lines.push("Send me access and I'll get this done today.");
  } else {
    // Move 4 - Day-one steps
    lines.push(
      "Here's how I'd start: review everything you have and flag anything unclear before touching a deliverable, then work in small steps so you can review each change."
    );
    lines.push("");

    // Move 5 - One specific question
    lines.push("Which part of the project would you like me to start with?");
  }

  lines.push("");
  lines.push("Best Regards,");
  lines.push("");
  lines.push(input.userName || "Your Name");

  const text = lines.join("\n");
  return {
    generated_text: text,
    score: scoreProposal(text),
  };
}