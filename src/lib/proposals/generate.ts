import { buildProposalSystemPrompt, buildAnswerSystemPrompt, buildBasicProposalPrompt } from "./system-prompt";
import { chatCompletionWithRetry, parseLlmJson } from "@/lib/llm";

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
    const content = data.choices?.[0]?.message?.content;
    if (!content) return generateFallbackProposal(input);

    if (isPaid) {
      // FIX: previously fell back to raw `content` (the full JSON string) if
      // `parsed.proposal` was missing, which risked leaking unparsed JSON
      // straight to the client as their "proposal". Now falls back to the
      // proper fallback generator instead.
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
        // so route them through an incremental scrubber.
        //
        // FIX: the old cleaner buffered content waiting for a
        // "---PROPOSAL---" / "**PROPOSAL:**" marker before streaming
        // anything live. The system prompt explicitly forbids the model
        // from ever emitting those markers, so that marker was never found
        // and the cleaner silently buffered up to 4000 chars (i.e. the
        // entire proposal, since proposals are capped under 200 words)
        // before dumping it all at once at the end — defeating live
        // streaming for every non-Groq provider. The new scrubber only
        // strips <think>...</think> blocks and streams everything else
        // immediately, chunk by chunk.
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
    // FIX: previously this directive always described the built-in
    // "six moves" methodology by name (MOVE 1...MOVE 5), even when the user
    // had saved a custom system prompt that may follow a totally different
    // structure. That created a mismatch between the system prompt the
    // model is told to follow and the user-turn instructions layered on
    // top of it. When a custom system prompt is set, defer to it instead
    // of re-asserting the default methodology here.
    sections.push(`
=== TASK ===
Write the proposal now, strictly following the methodology and rules given in the system prompt above. Output only the final proposal text.`);
  } else {
    sections.push(`
=== WRITING DIRECTIVE ===
Write the proposal now following the six moves from the system prompt:
  MOVE 1 — Anti-pitch opener (1-2 lines, confirmation not pitch, verbatim tools bolded)
  MOVE 2 — Reframe (1 sentence naming the real problem this post reveals)
  MOVE 3 — Role-clarifying questions (max 2, only if something is genuinely ambiguous)
  MOVE 4 — Day-one suggestions (max 3, concrete first actions)
  MOVE 5 — Screening answers + close (answer application questions, one-line CTA)

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
✓ No markdown formatting inside the proposal — plain text paragraphs only`);
  }

  return sections.join("\n\n");
}

/**
 * Deterministic rubric score shared by both JSON and stream paths so the
 * number means the same thing everywhere. Rewards methodology moves and
 * penalizes verbosity past the 200-word ceiling.
 *
 * NOTE: this is a heuristic keyword/pattern score, not a real quality
 * assessment — it rewards proposals that happen to contain certain phrases
 * and penalizes length. Treat/label it in the UI as a rough methodology
 * checklist score, not an objective "quality score".
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
 * via `reasoning_format: hidden` so this isn't needed there).
 *
 * FIX: replaces the old marker-buffering cleaner (`createIncrementalCleaner`)
 * which waited for a "---PROPOSAL---" marker the model is instructed to
 * never produce, and for a "---SCORE:" tail marker that the stream prompt
 * never asks for either. Both markers were dead code paths that caused the
 * entire proposal to be buffered until the end of the stream instead of
 * streaming live. This scrubber only holds back the minimum needed to avoid
 * splitting a "<think>"/"</think>" tag across chunk boundaries, and streams
 * everything else immediately.
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
        // No open tag in what we have. Emit everything except a small tail
        // that could be the start of a split "<think>" tag, unless flushing.
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

  // Remove code fences and stray label lines some models still add despite
  // being told not to.
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

  // Move 5 — Close
  lines.push("Happy to walk through my approach on a quick call if useful.");

  return {
    generated_text: lines.join("\n"),
    score: scoreProposal(lines.join("\n")),
  };
}