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
          { role: "system", content: input.answerQuestion
            ? buildAnswerSystemPrompt(input.systemPrompt)
            : isPaid
              ? buildProposalSystemPrompt("json", input.systemPrompt)
              : buildBasicProposalPrompt() },
          { role: "user", content: buildPrompt(input) },
        ],
        temperature: 0.7,
        max_tokens: isPaid ? 4000 : 2000,
        ...(isPaid ? { response_format: { type: "json_object" as const } } : {}),
      }),
      isPaid ? {} : { provider: "groq", maxAttemptsPerProvider: 2 }
    );
    console.log("[Proposal] Using provider:", provider.name, "model:", provider.model, "isPaid:", isPaid);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return generateFallbackProposal(input);

    if (isPaid) {
      const parsed = parseLlmJson(content);
      const proposalText = parsed.proposal || content;
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
              { role: "system", content: input.answerQuestion
                ? buildAnswerSystemPrompt(input.systemPrompt)
                : isPaid
                  ? buildProposalSystemPrompt("stream", input.systemPrompt)
                  : buildBasicProposalPrompt() },
              { role: "user", content: buildPrompt(input) },
            ],
            stream: true,
            ...(isPaid && p.groqStyle ? { reasoning_format: "parsed" as const } : {}),
            temperature: 0.7,
            max_tokens: isPaid ? 4000 : 2000,
          }),
          isPaid ? {} : { provider: "groq", maxAttemptsPerProvider: 2 }
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

        // Groq (reasoning_format: parsed) puts reasoning in delta.reasoning and
        // keeps content clean — stream it live. Other providers may leak
        // reasoning/markers into content, so route them through an incremental
        // cleaner that only emits real proposal text.
        const cleaner = provider.groqStyle
          ? null
          : createIncrementalCleaner(emit);

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
 * Incremental stream cleaner for providers that don't separate reasoning from
 * content. Buffers the reasoning preamble until a proposal-start marker is
 * seen (or a sanity cap is hit), then streams the proposal live while holding
 * back a tail so a trailing score marker can be stripped before it's sent.
 */
function createIncrementalCleaner(emit: (chunk: string) => void) {
  const PROPOSAL_START = ["---PROPOSAL---", "**PROPOSAL:**"];
  const SCORE_MARKER = ["---SCORE:", "**SCORE:**"];
  const TAIL = 200;
  const PREAMBLE_CAP = 4000;

  let preBuffer = "";
  let pendingTail = "";
  let proposalMode = false;
  let done = false;
  let thinkOpen = false;

  function findFirst(s: string, markers: string[]): { index: number; len: number } | null {
    let best: { index: number; len: number } | null = null;
    for (const m of markers) {
      const i = s.indexOf(m);
      if (i !== -1 && (!best || i < best.index)) best = { index: i, len: m.length };
    }
    return best;
  }

  // Strip <think>...</think> blocks that may span chunk boundaries.
  function scrubThink(text: string): string {
    if (!text) return "";
    if (thinkOpen) {
      const close = text.indexOf("</think>");
      if (close === -1) return "";
      thinkOpen = false;
      return scrubThink(text.slice(close + 8));
    }
    const open = text.indexOf("<think>");
    if (open === -1) return text;
    const close = text.indexOf("</think>", open);
    if (close === -1) {
      thinkOpen = true;
      return text.slice(0, open);
    }
    return scrubThink(text.slice(0, open) + text.slice(close + 8));
  }

  // Longest suffix of `s` that is a prefix of any score marker.
  function partialMarkerSuffix(s: string): number {
    for (const m of SCORE_MARKER) {
      for (let i = m.length; i >= 1; i--) {
        if (s.endsWith(m.slice(0, i))) return i;
      }
    }
    return 0;
  }

  function pushProposal(text: string) {
    if (done) return;
    let combined = pendingTail + text;

    const marker = findFirst(combined, SCORE_MARKER);
    if (marker) {
      const before = combined.slice(0, marker.index);
      if (before.trim()) emit(before);
      done = true;
      pendingTail = "";
      return;
    }

    if (combined.length <= TAIL) {
      pendingTail = combined;
      return;
    }

    let cut = combined.length - TAIL;
    let sendable = combined.slice(0, cut);
    const hold = partialMarkerSuffix(sendable);
    if (hold > 0) {
      sendable = sendable.slice(0, sendable.length - hold);
      pendingTail = combined.slice(sendable.length);
    } else {
      pendingTail = combined.slice(cut);
    }
    if (sendable.trim()) emit(sendable);
  }

  return {
    push(raw: string) {
      if (done) return;
      const text = scrubThink(raw);

      if (!proposalMode) {
        preBuffer += text;
        if (preBuffer.length > PREAMBLE_CAP) {
          // No marker ever seen; assume everything from the last paragraph
          // break on is the proposal and stream the rest live.
          proposalMode = true;
          const lastBreak = preBuffer.lastIndexOf("\n\n");
          const head = lastBreak !== -1 ? preBuffer.slice(0, lastBreak) : "";
          if (head.trim()) emit(cleanProposal(head));
          const tail = lastBreak !== -1 ? preBuffer.slice(lastBreak) : preBuffer;
          preBuffer = "";
          pushProposal(tail);
          return;
        }
        const marker = findFirst(preBuffer, PROPOSAL_START);
        if (!marker) return;
        proposalMode = true;
        const rest = preBuffer.slice(marker.index + marker.len);
        preBuffer = "";
        if (rest) pushProposal(rest);
        return;
      }

      pushProposal(text);
    },
    flush() {
      if (done) return;
      done = true;
      if (!proposalMode) {
        const cleaned = cleanProposal(preBuffer);
        if (cleaned) emit(cleaned);
        return;
      }
      const tail = cleanProposal(pendingTail);
      if (tail) emit(tail);
    },
  };
}

/**
 * Strip any reasoning blocks, markers, fences, or score tails that a
 * reasoning-model provider may have leaked into the content stream.
 */
function cleanProposal(raw: string): string {
  if (!raw) return "";

  let text = raw;

  // Self-hosted reasoning models leak chain-of-thought as <think>...</think>.
  text = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/<\/?think>/g, "");

  // "---PROPOSAL---" marker: keep only what follows it.
  const dashMarker = text.indexOf("---PROPOSAL---");
  if (dashMarker !== -1) {
    text = text.slice(dashMarker + "---PROPOSAL---".length);
  }

  // "**PROPOSAL:**" marker inside a leaked "**REASONING:**" block.
  const reasoningStart = text.indexOf("**REASONING:**");
  const boldProposal = text.indexOf("**PROPOSAL:**");
  if (reasoningStart !== -1 && boldProposal !== -1 && boldProposal > reasoningStart) {
    text = text.slice(boldProposal + "**PROPOSAL:**".length);
  }

  // Trailing score marker: keep only what precedes it.
  const scoreIdx = text.lastIndexOf("---SCORE:");
  const boldScoreIdx = text.lastIndexOf("**SCORE:**");
  const cut = Math.max(scoreIdx, boldScoreIdx);
  if (cut !== -1) {
    text = text.slice(0, cut);
  }

  // Remove code fences and stray label lines.
  text = text
    .replace(/```/g, "")
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      return t !== "PROPOSAL:" && t !== "Proposal:" && !/^---(PROPOSAL|SCORE)/.test(t);
    })
    .join("\n")
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
