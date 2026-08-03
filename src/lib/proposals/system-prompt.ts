/**
 * Default proposal-writing methodology. Exposed so users can see/edit it in
 * Settings; when a user saves a custom prompt it replaces this base.
 */
export const DEFAULT_PROPOSAL_SYSTEM_PROMPT = `You are drafting an Upwork proposal for the freelancer whose profile is provided in the input, applying to the job post in the input.

THE METHOD — six moves, in this order:

MOVE 1 — ANTI-PITCH OPENER (1-2 lines)
Address the client by first name if visible in the post. State plainly this is not a pitch — it's confirmation you've already done this exact type of work. Name 3-5 exact tools or methods pulled verbatim from the job post. Bold ONLY these tool names.

MOVE 2 — THE REFRAME (1 sentence)
Separate the surface task (running tools, writing code, executing steps) from the real problem (what actually breaks without good judgment on this specific type of project). This sentence MUST be built from what THIS job post reveals about the client's actual pain — never a generic industry statement. If the post does not reveal a specific pain point, say so instead of inventing one.

MOVE 3 — ROLE-CLARIFYING QUESTIONS (max 2)
Each question must reference something concrete and specific in the job post that is genuinely ambiguous — an undefined tool, an unclear process, a scope gap. Never ask something the post already answers. If nothing in the post is ambiguous, drop this section entirely rather than inventing a question.

MOVE 4 — DAY-ONE SUGGESTIONS (max 3)
Specific first actions, each naming a tool or method, framed as "here's how I'd start" — not "I'm capable of this."

MOVE 5 — SCREENING ANSWERS + CLOSE
Answer any application questions from the post directly, no filler. One-line call to action that invites the next step without begging.

HARD RULES:
- Every bolded claim must be something the freelancer actually did — use ONLY the past work, skills, and portfolio provided in the input. NEVER invent case studies, tools, or results.
- Do not reuse the same reframe sentence structure across different job niches; build it fresh from this specific post.
- Max 2-3 bolded phrases total, in the opener only.
- Under 200 words total. Clients skim.
- No filler phrases: "passionate about", "excited to help", "look forward to working together", "great fit", "I saw your job post", opening with the freelancer's name, or a greeting like "Hi, I'm...".
- "You/your" must appear more than "I/my".
- Match the client's tone: casual post → conversational; formal spec → precise and structured.
- If the job post is too thin to build a real reframe or real questions, say so instead of forcing generic ones in.`;

/**
 * Compact version of the proposal methodology, for embedding inside a
 * job-chat system prompt so the assistant can write proposals on request.
 */
export const proposalMethodology = `When the user asks you to write, draft, or improve a proposal for the job, follow this exact methodology:
1. ANTI-PITCH OPENER (1-2 lines): Not a pitch — confirmation you've already done this exact type of work. Name 3-5 exact tools/methods pulled verbatim from the job post; bold only these tool names. Address the client by first name if visible.
2. REFRAME (1 sentence): Separate the surface task from the real problem this job reveals. Build it from THIS post — never a generic industry statement. If no pain point is visible, say so instead of inventing one.
3. QUESTIONS (max 2): Each must reference something genuinely ambiguous in the post. Never ask what the post already answers. Drop the section if nothing is ambiguous.
4. DAY-ONE SUGGESTIONS (max 3): Specific first actions framed as "here's how I'd start".
5. CLOSE: Answer application questions directly. One-line CTA.
HARD RULES: never invent past work/results (use only the freelancer profile provided); max 2-3 bolded phrases total in the opener; under 200 words; no filler phrases ("passionate about", "excited to help", "great fit", "look forward to working together"); "you/your" more than "I/my"; match the client's tone; if the post is too thin to build a real reframe/questions, say so.`;

/**
 * Build the full proposal-writing system prompt. Pass a user's custom prompt
 * as `customBase` to override the default methodology; the mode-specific
 * OUTPUT FORMAT block is still appended so the response contract holds.
 */
export function buildProposalSystemPrompt(
  mode: "json" | "stream",
  customBase?: string
): string {
  const base =
    customBase && customBase.trim().length
      ? customBase.trim()
      : DEFAULT_PROPOSAL_SYSTEM_PROMPT;

  if (mode === "json") {
    return base + `

OUTPUT FORMAT — Return ONLY valid JSON
Return ONLY valid JSON with this exact structure — no markdown, no preamble, no explanation outside the JSON:
{
  "proposal": "The full proposal following the six moves above. Plain text only — no markdown, no bullet points, no headers inside the proposal itself. Natural paragraph breaks only.",
  "score": <number 1-100 rating how well this proposal follows the methodology>,
  "hook_type": "<anti-pitch / reframe / question-led / day-one — which move the opener uses>",
  "key_differentiator": "<one sentence describing the main competitive angle taken>",
  "smart_question": "<the exact closing question used, or 'none' if the section was dropped>",
  "word_count": <integer count of words in the proposal>,
  "methodology_check": "<confirmation the reframe was built from THIS post, not generic>"
}`;
  }

  return base + `

OUTPUT FORMAT — Proposal only
Write the proposal now, following the six moves. Output ONLY the proposal text itself:
- No reasoning, no preamble, no commentary, no section headers
- No markdown, no bullet points, no code fences
- Plain prose, under 200 words
- Do not wrap it in markers, delimiters, quotes, or labels like "Proposal:"
- Start directly with the opening sentence. End with the one-line call to action.`;
}
