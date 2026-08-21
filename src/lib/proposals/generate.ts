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
    const competitionLevel =
      input.proposalsCount < 5
        ? "LOW — early mover advantage"
        : input.proposalsCount < 20
          ? "MEDIUM — be specific and fast"
          : input.proposalsCount < 50
            ? "HIGH — hook must be razor sharp"
            : "VERY HIGH — only radical specificity wins";
    signalFields.push(`Proposals already submitted: ${input.proposalsCount} (Competition: ${competitionLevel})`);
  }
  if (input.postedAt) signalFields.push(`Job posted at: ${input.postedAt}`);
  sections.push(`\n=== COMPETITION SIGNALS ===
${signalFields.length ? signalFields.join("\n") : "No competition data available."}
Strategic note: If competition is HIGH or VERY HIGH, lead with the most specific hook possible.`);

  // ── CLIENT INTELLIGENCE ───────────────────────────────────────────────────
  const clientFields: string[] = [];
  if (input.clientTotalSpend !== undefined) {
    const spendSignal =
      input.clientTotalSpend > 10000
        ? "Serious buyer — values quality over price"
        : input.clientTotalSpend > 1000
          ? "Moderate buyer — balance value and cost"
          : "New or cautious buyer — reduce perceived risk";
    clientFields.push(`Total client spend: $${input.clientTotalSpend} (${spendSignal})`);
  }
  if (input.clientHireRate !== undefined) {
    const hireSignal =
      input.clientHireRate >= 75
        ? "High hire rate — client is decisive and serious"
        : input.clientHireRate >= 40
          ? "Average hire rate — needs more convincing"
          : "Low hire rate — picky or inexperienced. Minimize friction in your CTA.";
    clientFields.push(`Client hire rate: ${input.clientHireRate}% (${hireSignal})`);
  }
  if (input.clientRating !== undefined) {
    const ratingSignal =
      input.clientRating >= 4.5
        ? "Great client — has positive history with freelancers"
        : input.clientRating >= 3.5
          ? "Average client — proceed normally"
          : "Low client rating — may have had conflict with past freelancers. Emphasize communication and clear deliverables.";
    clientFields.push(`Client rating: ${input.clientRating}/5 (${ratingSignal})`);
  }
  sections.push(`\n=== CLIENT INTELLIGENCE ===
${clientFields.length ? clientFields.join("\n") : "No client intelligence data available."}
Use this data to calibrate tone, CTA friction level, and whether to emphasize risk reversal.`);

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
  sections.push(`\n=== FREELANCER PROFILE ===
${profileFields.length ? profileFields.join("\n") : "No profile data available."}
IMPORTANT: Reference ONLY the skills and experience directly relevant to this specific job. Do not list all skills — that is a fatal mistake.`);

  // ── PORTFOLIO ─────────────────────────────────────────────────────────────
  if (input.portfolioItems) {
    sections.push(`\n=== PORTFOLIO ITEMS (reference only if directly relevant to this job) ===
${input.portfolioItems}
WARNING: Do not reference portfolio items that don't mirror this client's use case. Irrelevant portfolio = confusion, not confidence.`);
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
Answer this application question from the client's job post. Write ONLY the answer to the question — do NOT write a cover letter, proposal, or pitch. Do not add pricing, timelines, or sign-offs unless the question itself asks for them.

Question: ${input.answerQuestion}

FORMAT:
- Plain text only — no markdown, no bullet points, no headers, no labels
- Concise: 40 to 100 words
- Direct and specific. Use the freelancer's real skills/experience from the FREELANCER PROFILE and PORTFOLIO sections above only where they genuinely answer the question.
- If the question asks for past work, examples, or links (e.g., "share 2-3 websites you built"), cite the most relevant items listed in the PORTFOLIO section above and include each item's Link URL verbatim when one is present. Never invent a link, website, or project that is not in the profile.
- If nothing in the profile fits the question, say so honestly in one short line, then point to the closest related capability from the profile. Never fabricate experience.`);
  } else if (input.systemPrompt && input.systemPrompt.trim().length) {
    // When a custom system prompt is set, defer to it rather than
    // re-asserting the default six-move structure by name here — but still
    // point the model at the JOB SIZE SIGNAL section if one was added above.
    sections.push(`
=== TASK ===
Write the proposal now, strictly following the methodology and rules given in the system prompt above.${jobSizeSignal ? " Apply the JOB SIZE SIGNAL guidance above if it conflicts with a more elaborate default structure." : ""} Output only the final proposal text.`);
  } else {
    sections.push(`
=== WRITING DIRECTIVE ===
Write the proposal now following the six moves from the system prompt:
  MOVE 1 — Anti-pitch opener (1-2 lines, confirmation not pitch, verbatim tools bolded)
  MOVE 2 — Reframe (1 sentence naming the real problem this post reveals)
  MOVE 3 — Role-clarifying questions (max 2, only if something is genuinely ambiguous, and NONE if a JOB SIZE SIGNAL above says to skip them)
  MOVE 4 — Day-one suggestions (max 3, concrete first actions)
  MOVE 5 — Screening answers + close (answer application questions, one-line CTA — direct action if a JOB SIZE SIGNAL above applies)

MANDATORY CHECKS BEFORE FINALIZING:
✓ First sentence does NOT start with "Hi", the freelancer's name, "I saw your job", or "I'm interested"
✓ Opener states this is not a pitch — it's confirmation of past, relevant work
✓ Reframe is built from THIS post's specific pain point, not a generic industry statement
✓ Word count is under 200 (hard ceiling: 200)
✓ Max 2-3 bolded tool/method names, in the opener only
✓ "You/your" appears more than "I/my"
✓ Never invented past work — only the freelancer profile provided is used
✓ Zero filler phrases: passionate about, excited to help, great fit, look forward to working together
✓ Ends with exactly ONE line inviting the next step — no begging
✓ Tone matches the client's writing style
✓ No markdown formatting inside the proposal — plain text paragraphs only
✓ If a JOB SIZE SIGNAL section is present above, its guidance overrides the defaults (drop non-essential questions, confirm budget/timeline explicitly, close with a direct action)`);
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