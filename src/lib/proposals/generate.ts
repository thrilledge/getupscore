import { buildProposalSystemPrompt } from "./system-prompt";
import { chatCompletionWithRetry } from "@/lib/llm";

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
}

export interface ProposalResult {
  generated_text: string;
  score?: number;
}

export type StreamEvent =
  | { type: "reasoning"; content: string }
  | { type: "proposal"; content: string }
  | { type: "done"; score: number };

export async function generateProposal(
  input: ProposalInput,
  groqApiKey?: string,
  groqModel?: string
): Promise<ProposalResult> {
  try {
    const { response, provider } = await chatCompletionWithRetry(
      (p) => ({
        model: p.model,
        messages: [
          { role: "system", content: buildProposalSystemPrompt("json") },
          { role: "user", content: buildPrompt(input) },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
      { explicitApiKey: groqApiKey, explicitModel: groqModel }
    );

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return generateFallbackProposal(input);

    const parsed = JSON.parse(content);

    return {
      generated_text: parsed.proposal || content,
      score: parsed.score || 75,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[Proposal] Generation error:", message);
    return generateFallbackProposal(input);
  }
}

export async function streamProposal(
  input: ProposalInput,
  groqApiKey?: string,
  groqModel?: string
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
              { role: "system", content: buildProposalSystemPrompt("stream") },
              { role: "user", content: buildPrompt(input) },
            ],
            stream: true,
            ...(p.groqStyle ? { reasoning_format: "parsed" as const } : {}),
            temperature: 0.7,
            max_tokens: 4000,
          }),
          { explicitApiKey: groqApiKey, explicitModel: groqModel }
        );
        console.log("[Proposal Stream] Using provider:", provider.name, "model:", provider.model);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullProposal = "";

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
                fullProposal += delta.content;
              }
            } catch { }
          }
        }

        const cleaned = cleanProposal(fullProposal);
        if (!cleaned) {
          console.warn("[Proposal Stream] Model returned no usable proposal text.");
          send("error", { message: "Model returned no usable proposal text." });
          controller.close();
          return;
        }

        send("proposal", { text: cleaned });

        // Calculate a simple score based on word count and content length
        const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
        const score = Math.min(95, Math.max(60, Math.round(60 + wordCount * 0.05)));

        send("done", { score });
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.warn("[Proposal Stream] Error:", message);
        send("error", { message: `Proposal generation failed: ${message.slice(0, 200)}` });
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
${input.jobDescription.slice(0, 4000)}
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
    profileFields.push(`Background:\n${input.userExperience.slice(0, 1500)}`);
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

  return sections.join("\n\n");
}

/**
 * Strip any reasoning blocks, markers, fences, or score tails that a
 * reasoning-model provider may have leaked into the content stream.
 */
function cleanProposal(raw: string): string {
  if (!raw) return "";

  let text = raw;

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
  if (scoreIdx !== -1) {
    text = text.slice(0, scoreIdx);
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
  lines.push(
    "What actually matters here isn't the execution steps — it's getting the details right up front so nothing gets reworked, and keeping you in the loop as I go."
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
    score: 55,
  };
}
