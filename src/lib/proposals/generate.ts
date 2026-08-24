import { buildProposalSystemPrompt, buildAnswerSystemPrompt, buildBasicProposalPrompt } from "./system-prompt";
import { chatCompletionWithRetry, parseLlmJson } from "@/lib/llm";
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
      {}
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
    }).catch(() => {});

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
      return {
        generated_text: proposalText,
        score: scoreProposal(proposalText),
      };
    }

    return {
      generated_text: cleanProposal(content),
      score: scoreProposal(content),
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
    }).catch(() => {});
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
          {}
        );
        console.log("[Proposal Stream] Using provider:", provider.name, "model:", provider.model, "isPaid:", isPaid);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let proposalText = "";

        // Upwork proposals must be plain text — strip markdown emphasis leaks
        // (bold/italic/backticks) that models add despite the prompt rules.
        const stripMarkdown = (s: string): string => s.replace(/[*_`]/g, "");

        const emit = (chunk: string) => {
          if (!chunk) return;
          const clean = stripMarkdown(chunk);
          proposalText += clean;
          send("proposal", { text: clean });
        };

        // Groq (reasoning_format: hidden) hides all reasoning tokens.
        // Non-Groq providers may leak stray <think> blocks into content,
        // so route them through an incremental scrubber that streams
        // everything else live (no marker-buffering — the model is never
        // asked to emit markers, so waiting for one would just delay the
        // entire proposal to the end of the stream).
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
          console.warn("[Proposal Stream] Model returned no usable proposal text.");
          send("error", { text: "Model returned no usable proposal text." });
          controller.close();
          return;
        }

        send("done", { score: scoreProposal(finalText) });
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.warn("[Proposal Stream] Error:", message);
        send("error", { text: `Proposal generation failed: ${message.slice(0, 200)}` });
        controller.close();
      }
    },
  });
}

/**
 * Detects whether a job reads as small / low-budget / same-day urgent, so
 * the writing directive can calibrate down: fewer/no clarifying questions,
 * explicit budget/timeline confirmation, and a direct-action close instead
 * of an "let's discuss" invitation.
 *
 * This is a heuristic on purpose — it only needs to catch the clear cases
 * (e.g. "$20 fixed, need this today") well enough to steer tone. It's fine
 * for it to miss ambiguous cases and fall through to the default directive.
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
- Close with a direct, ready-to-start action (e.g. "send me access and I'll get started") - not an invitation to "discuss next steps".
- Keep the proposal noticeably shorter than the 200-word ceiling; drop any step that isn't essential.`;
}

function buildPrompt(input: ProposalInput): string {
  const sections: string[] = [];

  // ── JOB DETAILS ──────────────────────────────────────────────────────────
  sections.push(`=== JOB DETAILS ===
Title: ${input.jobTitle}
Description:
${input.jobDescription.slice(0, 6000)}
${input.budget ? `Budget/Rate: ${input.budget}` : "Budget: Not specified — anchor on value, not cost"}
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
If HIGH+: lead with most specific hook.`);

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
    sections.push(`\n=== PORTFOLIO (reference if relevant) ===
${input.portfolioItems}`);
  }

  // ── CUSTOM INSTRUCTIONS ───────────────────────────────────────────────────
  if (input.customInstructions) {
    sections.push(`\n=== CUSTOM PROPOSAL INSTRUCTIONS (highest priority — follow exactly) ===
${input.customInstructions}`);
  }

  // ── FINAL DIRECTIVE ───────────────────────────────────────────────────────
  if (input.answerQuestion) {
    sections.push(`
=== TASK ===
Answer this Upwork application question only. Do NOT write a proposal/cover letter.

Question: ${input.answerQuestion}

FORMAT: 40-100 words. Plain text only. No markdown/headers/labels. Reference relevant profile skills only. If no fit, say so briefly and point to closest skill. Include portfolio URLs if asked for past work. Start directly with the answer.`);
  } else if (input.systemPrompt && input.systemPrompt.trim().length) {
    sections.push(`
=== TASK ===
Write proposal strictly following system prompt methodology.${jobSizeSignal ? " Apply JOB SIZE SIGNAL guidance." : ""} Output only proposal text.`);
  } else {
    sections.push(`
=== WRITING DIRECTIVE ===
Write proposal following 5 moves from system prompt:
  1: Opener (1-2 lines, confirmation not pitch, verbatim tools bolded)
  2: Reframe (1 sentence, real problem from THIS post)
  3: Questions (max 2, skip if ambiguous or JOB SIZE SIGNAL says skip)
  4: Day-one (max 3, concrete first actions)
  5: Close + CTA (answer app questions, one-line CTA — direct action if JOB SIZE SIGNAL present)

CHECKS: No "Hi"/name opener | Not a pitch | Reframe from this post | <200 words | Max 2-3 bold opener | "You" > "I" | No invented past work | No filler | One CTA line | Match tone | Plain text paragraphs | JOB SIZE SIGNAL overrides defaults`);
  }

  return sections.join("\n\n");
}

/**
 * Deterministic rubric score shared by both JSON and stream paths so the
 * number means the same thing everywhere. Rewards methodology moves and
 * penalizes verbosity past the 200-word ceiling.
 *
 * NOTE: this is a heuristic keyword/pattern score, not a real quality
 * assessment — treat/label it in the UI as a rough methodology checklist
 * score, not an objective "quality score".
 */
function scoreProposal(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const lower = text.toLowerCase();

  let score = 50;

  if (/(not pitching|not a pitch|this isn't a pitch|already (done|handled) this|done this exact type)/.test(lower)) score += 15;
  if (lower.includes("?") && /(confirm|clarify|would|does|is there|do you|are you|what'?s|which)/.test(lower)) score += 10;
  if (/(here'?s how i'?d start|i'?d start by|how i'?d approach|i'?d begin|i'?d first)/.test(lower)) score += 10;
  if (/(happy to|ready when|let me know|send me|share|look forward|walk through)/.test(lower)) score += 5;

  if (words <= 200) score += 10;
  else score -= 10 + Math.ceil((words - 200) / 10);

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
    .replace(/\n{3,}/g, "\n\n")
    // Strip markdown emphasis (bold/italic/backticks) — plain text output only.
    .replace(/[*_`]/g, "")
    .trim();

  return text;
}

function generateFallbackProposal(input: ProposalInput): ProposalResult {
  const lines: string[] = [];
  const jobSizeSignal = detectJobSizeSignal(input);

  // Move 1 — Anti-pitch opener
  const tools = input.skills?.slice(0, 3).filter(Boolean).join(", ");
  lines.push(
    tools
      ? `Not pitching — just confirming I've already done this exact type of work before: ${tools}.`
      : "Not pitching — this is exactly the kind of work I've handled before, and here's how I'd approach yours."
  );
  lines.push("");

  // Move 2 — Reframe (never echo the job post itself)
  const project = input.jobTitle ? `a "${input.jobTitle}" result that actually works in your setup` : "getting the details right up front so nothing gets reworked";
  lines.push(
    `What actually matters here isn't the execution steps — it's ${project}, and keeping you in the loop as I go.`
  );
  lines.push("");

  if (jobSizeSignal) {
    // Small/urgent job: skip the clarifying question, acknowledge
    // budget/timeline directly, and go straight to a lean plan + close.
    if (input.budget) {
      lines.push(`This fits within ${input.budget}, and I can get started right away.`);
      lines.push("");
    }
    lines.push(
      "Here's how I'd start: check the affected sections at common mobile widths, adjust the responsive spacing and alignment without touching desktop or tablet, then verify the fix live."
    );
    lines.push("");
    lines.push("Send me access and I'll get this done today.");
  } else {
    // Move 3 — Question
    lines.push(
      "One thing I'd confirm before quoting: is there a specific part of this project that has tripped up previous attempts, or a constraint I should know about before we start?"
    );
    lines.push("");

    // Move 4 — Day-one suggestions
    lines.push(
      "Here's how I'd start: review everything you have and flag anything unclear before touching a deliverable, then execute in a structured pass — you'd get a summary of every change and decision made."
    );
    lines.push("");
  }

  // Move 5 — Closing CTA (always included)
  lines.push("");
  lines.push("Let's discuss your project requirements in detail. I'm available for a chat anytime!");
  lines.push("");
  lines.push("Best Regards,");
  lines.push("");
  lines.push(input.userName || "Your Name");

  return {
    generated_text: lines.join("\n"),
    score: scoreProposal(lines.join("\n")),
  };
}