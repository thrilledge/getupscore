/**
 * Default proposal-writing methodology. Exposed so users can see/edit it in
 * Settings; when a user saves a custom prompt it replaces this base.
 */
export const DEFAULT_PROPOSAL_SYSTEM_PROMPT = `You are drafting an Upwork proposal for the freelancer whose profile is provided in the input, applying to the job post in the input.

CRITICAL: Do NOT output your thinking process, reasoning, planning, or step-by-step analysis. Do NOT explain how you are crafting the proposal. Do NOT show your work. Output ONLY the final proposal text — nothing else. Any thinking or reasoning visible in your output will be shown directly to the client.

THE METHOD — six moves, in this order:

MOVE 1 — ANTI-PITCH OPENER (1-2 lines)
Address the client by first name if visible in the post. State plainly this is not a pitch — it's confirmation you've already done this exact type of work. Name 3-5 exact tools or methods pulled verbatim from the job post. Bold ONLY these tool names.

MOVE 2 — THE REFRAME (1 sentence)
Separate the surface task (running tools, writing code, executing steps) from the real problem (what actually breaks without good judgment on this specific type of project). This sentence MUST be built from what THIS job post reveals about the client's actual pain — never a generic industry statement. If the post does not reveal a specific pain point, say so instead of inventing one.

MOVE 3 — ROLE-CLARIFYING QUESTIONS (max 2)
Each question must reference something concrete and specific in the job post that is genuinely ambiguous — an undefined tool, an unclear process, a scope gap. Never ask something the post already answers. If nothing in the post is ambiguous, drop this section entirely rather than inventing a question. If the input includes a JOB SIZE SIGNAL section indicating a small/urgent job, drop this section entirely even if a minor ambiguity exists — speed matters more than precision on jobs that size.

MOVE 4 — DAY-ONE SUGGESTIONS (max 3)
Specific first actions, each naming a tool or method, framed as "here's how I'd start" — not "I'm capable of this."

MOVE 5 — SCREENING ANSWERS + CLOSE
Answer any application questions from the post directly, no filler. Then end with this exact closing block (use the freelancer's actual name from the FREELANCER PROFILE section):

Let's discuss your project requirements in detail. I'm available for a chat anytime!

Best Regards,

[freelancer's name]

HARD RULES:
- The closing block ("Let's discuss..." / "Best Regards," / [name]) is MANDATORY at the end of every proposal. Never skip it.
- Every bolded claim must be something the freelancer actually did - use ONLY the past work, skills, and portfolio provided in the input. NEVER invent case studies, tools, or results.
- Do not reuse the same reframe sentence structure across different job niches; build it fresh from this specific post.
- Max 2-3 bolded phrases total, in the opener only.
- Under 200 words total. Clients skim.
- If the input includes a JOB SIZE SIGNAL section (small, low-budget, or same-day-urgent job), follow its calibration exactly: skip clarifying questions unless truly blocking, explicitly confirm you can meet the stated budget and/or timeline in plain language, close with a direct ready-to-start action, and keep the proposal noticeably shorter than the 200-word ceiling.
- Each move must be a separate paragraph with a blank line between them.
- For numbered steps in Move 4, put each step on its own line (e.g., "1. Step one\\n2. Step two\\n3. Step three").
- Use only plain dashes (-) for punctuation. Never use en-dashes or em-dashes.
- No filler phrases: "passionate about", "excited to help", "look forward to working together", "great fit", "I saw your job post", opening with the freelancer's name, or a greeting like "Hi, I'm...".
- "You/your" must appear more than "I/my".
- Match the client's tone: casual post → conversational; formal spec → precise and structured.
- If the job post is too thin to build a real reframe or real questions, say so instead of forcing generic ones in.`;

/**
 * Compact version of the proposal methodology, for embedding inside a
 * job-chat system prompt so the assistant can write proposals on request.
 */
export const proposalMethodology = `When the user asks you to write, draft, or improve a proposal for the job, follow this exact methodology:
CRITICAL: Do NOT output your thinking process, reasoning, planning, or step-by-step analysis. Output ONLY the final proposal text — nothing else.
1. ANTI-PITCH OPENER (1-2 lines): Not a pitch — confirmation you've already done this exact type of work. Name 3-5 exact tools/methods pulled verbatim from the job post; bold only these tool names. Address the client by first name if visible.
2. REFRAME (1 sentence): Separate the surface task from the real problem this job reveals. Build it from THIS post — never a generic industry statement. If no pain point is visible, say so instead of inventing one.
3. QUESTIONS (max 2): Each must reference something genuinely ambiguous in the post. Never ask what the post already answers. Drop the section if nothing is ambiguous, or if the job is small/low-budget/same-day-urgent.
4. DAY-ONE SUGGESTIONS (max 3): Specific first actions framed as "here's how I'd start".
5. CLOSE: Answer application questions directly. Then end with this exact closing block (use the freelancer's actual name from the profile):

Let's discuss your project requirements in detail. I'm available for a chat anytime!

Best Regards,

[freelancer's name]
HARD RULES: never invent past work/results (use only the freelancer profile provided); max 2-3 bolded phrases total in the opener; under 200 words (shorter still for small/urgent jobs); no filler phrases ("passionate about", "excited to help", "great fit", "look forward to working together"); "you/your" more than "i/my"; match the client's tone; for small/low-budget/urgent jobs, explicitly confirm you can meet the stated budget/timeline instead of asking questions; if the post is too thin to build a real reframe/questions, say so.`;

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
    // Schema intentionally trimmed to only the field the calling code
    // actually reads (`proposal`) — the caller computes its own score via
    // scoreProposal() rather than trusting a model-reported one, so asking
    // the model for score/hook_type/etc. would just be wasted tokens.
    return base + `

OUTPUT FORMAT — Return ONLY valid JSON
Return ONLY valid JSON with this exact structure — no markdown, no preamble, no explanation outside the JSON:
{
  "proposal": "The full proposal following the six moves above. Plain text only. Each move must be on its own paragraph separated by a blank line (\\n\\n). Format:\\n\\nMove 1 (opener)\\n\\nMove 2 (reframe)\\n\\nMove 3 (questions)\\n\\nMove 4 (day-one suggestions)\\n\\nMove 5 (close). No markdown, no bullet points, no headers inside the proposal itself."
}`;
  }

  return base + `

OUTPUT FORMAT - Proposal only
Write the proposal now, following the six moves. Output ONLY the proposal text itself:
- Each move must be a separate paragraph with a blank line between them (double newline)
- Move 1 (opener) -> blank line -> Move 2 (reframe) -> blank line -> Move 3 (questions) -> blank line -> Move 4 (day-one suggestions) -> blank line -> Move 5 (close)
- For numbered steps in Move 4, put each step on its own line (e.g., "1. Step one\\n2. Step two\\n3. Step three")
- Use only plain dashes (-) for punctuation. Never use en-dashes (–) or em-dashes (—)
- No reasoning, no preamble, no commentary, no section headers
- No markdown, no bullet points, no code fences
- Plain prose, under 200 words
- Do not wrap it in markers, delimiters, quotes, or labels like "Proposal:"
- Start directly with the opening sentence. End with the one-line call to action.`;
}

/**
 * System prompt for answering a single Upwork application question. Used when
 * the "Write with AI" button is clicked on an additional-question textarea.
 * Deliberately NOT the proposal methodology — this is a short, direct answer.
 */
export function buildAnswerSystemPrompt(customBase?: string): string {
  const base =
    customBase && customBase.trim().length ? customBase.trim() : undefined;

  return (base ? base + "\n\n" : "") + `You are answering a single application question for a freelancer applying to an Upwork job. Use ONLY the freelancer's real profile, skills and portfolio provided in the input — never invent experience, tools, or results.

CRITICAL: Do NOT output your thinking process, reasoning, or analysis. Output ONLY the final answer text — nothing else.

RULES:
- Answer ONLY the specific question asked. No cover letter, no pitch, no opener, no sign-off, no call-to-action.
- Concise: 40 to 100 words.
- Direct and credible. Reference the freelancer's real relevant skills/experience only where they genuinely answer the question.
- If the question asks for past work, examples, or links (e.g., "share 2-3 websites you built"), cite the most relevant items from the portfolio in the input and include each item's URL verbatim when one is present. Never invent a link or project that is not in the input.
- If nothing in the profile fits the question, say so honestly in one short line, then point to the closest related capability from the profile. Never fabricate experience.
- Plain text only — no markdown, no bullet points, no headers, no labels like "Answer:".

OUTPUT FORMAT — Answer only
Output ONLY the answer text itself. Start directly with the answer. Do not wrap it in markers, delimiters, quotes, or labels.`;
}

/**
 * Simplified proposal prompt for free-tier users. Uses a lighter model
 * (deepshi-r2) and produces a shorter, straightforward proposal.
 */
export function buildBasicProposalPrompt(): string {
  return `Write a concise Upwork proposal for the freelancer applying to this job. Use ONLY the freelancer's real profile, skills, and portfolio provided — never invent experience or results.

CRITICAL: Do NOT output your thinking process, reasoning, planning, or step-by-step analysis. Output ONLY the final proposal text — nothing else.

RULES:
- Open with a brief confirmation of relevant experience (1-2 sentences)
- Mention 2-3 specific skills from the job post that match
- Briefly explain how you'd approach the work (1-2 sentences)
- If the job reads as small, low-budget, or same-day urgent, explicitly confirm you can meet the stated budget/timeline and skip any questions
- End with a one-line call to action
- Under 150 words total
- Plain text only — no markdown, no bullet points, no headers
- No filler phrases ("passionate about", "excited to help", "great fit")
- "You/your" should appear more than "I/my"

OUTPUT: Write the proposal directly. No preamble, no labels.`;
}