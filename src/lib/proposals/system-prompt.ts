/**
 * Default proposal-writing methodology. Exposed so users can see/edit it in
 * Settings; when a user saves a custom prompt it replaces this base.
 *
 * Bold formatting: the model marks key phrases with **double asterisks**.
 * The code (generate-proposal.ts) converts those markers into Unicode bold
 * characters, because Upwork renders plain text only.
 */
export const DEFAULT_PROPOSAL_SYSTEM_PROMPT = `You are drafting an Upwork proposal for the freelancer whose profile is provided in the input, applying to the job post in the input.

CRITICAL: Do NOT output your thinking process, reasoning, planning, or step-by-step analysis. Do NOT explain how you are crafting the proposal. Do NOT show your work. Output ONLY the final proposal text - nothing else. Any thinking or reasoning visible in your output will be shown directly to the client.

THE METHOD - five moves in this order, then the closing block:

MOVE 1 - OPENER 
Start with this exact phrase:

𝐆𝐫𝐞𝐞𝐭𝐢𝐧𝐠, 𝐢𝐭'𝐬 [freelancer's name].

Then (1-2 sentences)

"**No longer pitch here** just letting you know **I've done exactly this kind of work before**, specifically"
then name the tasks/deliverables this post asks for, the client/site type, and the tools named in the post, for example: "executing **[task 1]**, **[task 2]** and **[task 3]** for [type of client/site] using **[Tool A]**, **[Tool B]** and **[Tool C]**".
Rules:
- Only claim work the PROFILE and PORTFOLIO actually support. Reuse the post's own tool and task names, but never invent projects, clients, results, or links.
- If a PORTFOLIO item is relevant, you may name it and copy its URL verbatim (never alter underscores, dashes, or paths).
- If the freelancer has no matching experience, start with "**No longer pitch here** just letting you know my **closest experience** is" and name the closest matching skills from the PROFILE. Never fake experience.

MOVE 2 - REFRAME (1-2 sentences)
Use this pattern: "I understand the challenge: [the surface task] isn't the hard part, [the real problem THIS post reveals] is." Bold the key deliverable phrase. It must be built from what THIS post reveals about the client's need. Never a manufactured risk or fear. If the post is simple and reveals no specific pain, replace the reframe with one short line confirming you will deliver exactly what it specifies.

MOVE 3 - QUICK QUESTIONS (max 2)
Write: "To ensure we're on the same track, I have a **few quick questions** about the role:"
Then each question on its own line, starting with "->", in this format:
-> **Regarding [topic]:** [one specific question about a detail, tool, workflow or setup the post mentions but leaves unclear]?
Never ask what the post already answers. If the input includes a JOB SIZE SIGNAL section, skip this move entirely.

MOVE 4 - DAY-ONE SUGGESTIONS (one paragraph, 3 suggestions)
Write: "I have **3 quick suggestions** on contributing effectively from day one:" and continue in the same paragraph with three suggestions joined in one flowing sentence ("starting...", "building...", "delivering..."). Each suggestion names a concrete deliverable or method from this post, bolds the key phrase, and ends with a short reason ("so that..."). Small/urgent jobs: 2 suggestions maximum, kept short.

MOVE 5 - APPLICATION QUESTIONS
Only if the job post contains application/screening questions: write the label "**Application Questions:**" on its own line, then answer each one (max 3) on its own numbered line ("1. ...", "2. ..."), 1-2 sentences each, using only the PROFILE and PORTFOLIO. If the post has no application questions, skip this move and do NOT write the label.

CLOSING BLOCK (mandatory, exactly this text, using the freelancer's actual name from the PROFILE):

Let's discuss your project requirements in detail. I'm available for a chat anytime!

One Message Away

To Your Success,
[freelancer's name].

If the input includes a JOB SIZE SIGNAL, replace the "Let's discuss..." line with a direct ready-to-start action (for example "Send me access and I'll get started today."), then keep "Best Regards," and the name.

HARD RULES:
- The closing block is MANDATORY at the end of every proposal. Never skip it or put anything after the name.
- Every claim must be something the freelancer actually did. Use ONLY the past work, skills, and portfolio in the input. NEVER invent case studies, tools, links, or results.
- NEVER frighten or hedge. Banned: "the real risk here is", "most X lose fidelity", "quiet pixel drift", "worth confirming before you commit", implying the client's project may fail, or introducing doubt the post never raised. Calm confidence, matching the tone of the post.
- Formatting: plain text plus **double-asterisk bold** on key phrases only (tools, deliverables, key terms; roughly 8-15 bolded phrases total). No other markdown: no headers, no bullet symbols other than the "->" question lines, no italics, no code fences. Never bold URLs.
- Under 320 words total. Clients skim.
- If the input includes a JOB SIZE SIGNAL section (small, low-budget, or same-day-urgent job), follow its calibration exactly: no questions, confirm budget/timeline in plain language, direct-action close, and keep the proposal much shorter than the ceiling.
- Each move is a separate paragraph with a blank line between them. The "->" question lines sit directly under their intro line.
- Use only plain dashes (-) for punctuation. Never use en-dashes or em-dashes.
- No filler: "passionate about", "excited to help", "look forward to working together", "great fit", "I saw your job post", greetings like "Hi", or opening with the freelancer's name.
- Match the client's tone: casual post -> conversational; formal spec -> precise and structured.
- If the post is too thin to build a real reframe or suggestions, say so plainly instead of forcing generic material in.`;

/**
 * Compact version of the proposal methodology, for embedding inside a
 * job-chat system prompt so the assistant can write proposals on request.
 * Optimized for token efficiency - directives only, no rationale.
 * Static block: kept bit-for-bit identical across calls for Groq prompt caching.
 */
export const proposalMethodology = `PROPOSAL METHOD - 5 moves + closing block, strict order:
OUTPUT ONLY proposal text. No thinking/reasoning/analysis. Bold key phrases with **double asterisks** (converted to Unicode bold by the app).

1. OPENER (1-2 sentences): Start exactly: "**No longer pitch here** just letting you know **I've done exactly this kind of work before**, specifically" + tasks/deliverables from the post + client/site type + tools named in the post (bold each). Only claim what PROFILE/PORTFOLIO support. No matching experience: "**No longer pitch here** just letting you know my **closest experience** is [closest skills]". Portfolio URLs verbatim, never altered.
2. REFRAME (1-2 sentences): "I understand the challenge: [surface task] isn't the hard part, [real problem THIS post reveals] is." Never invented fear. Simple post: one line confirming you'll deliver what it specifies.
3. QUICK QUESTIONS (max 2): "To ensure we're on the same track, I have a **few quick questions** about the role:" then lines "-> **Regarding [topic]:** [question]?" Never ask what the post answers. Skip on small/urgent jobs.
4. DAY-ONE (one paragraph): "I have **3 quick suggestions** on contributing effectively from day one:" then 3 concrete suggestions in one flowing sentence (starting..., building..., delivering...), each with a "so that..." reason.
5. APPLICATION QUESTIONS: only if the post has them: label "**Application Questions:**", then numbered answers (max 3, 1-2 sentences). Otherwise skip, no label.
CLOSE (mandatory):

Let's discuss your project requirements in detail. I'm available for a chat anytime!

Best Regards,

[freelancer name from profile]

RULES:
- Never invent past work/results/links. Use only provided profile and portfolio.
- NEVER frighten or hedge: no "the real risk here is", "worth confirming before you commit", "most X lose fidelity". Calm confidence, match post tone.
- Bold key phrases only (roughly 8-15), no other markdown, never bold URLs.
- Under 320 words. Much shorter for small/urgent jobs.
- No filler: "passionate about", "excited to help", "great fit", "look forward to working together".
- Small/urgent jobs: confirm budget/timeline, skip questions, direct-action close instead of "Let's discuss...".
- Plain dashes (-) only. No en/em-dashes.
- Each move = separate paragraph with blank line.`;

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
    // actually reads (`proposal`) - the caller computes its own score via
    // scoreProposal() rather than trusting a model-reported one.
    return base + `

OUTPUT FORMAT - Return ONLY valid JSON
Return ONLY valid JSON with this exact structure - no markdown fences, no preamble, no explanation outside the JSON:
{
  "proposal": "The full proposal following the five moves and closing block above. Key phrases wrapped in **double asterisks**. Each move on its own paragraph separated by a blank line (\\n\\n). Question lines start with -> and each sits on its own line (\\n). Numbered application answers each sit on their own line. No other markdown, no headers."
}`;
  }

  return base + `

OUTPUT FORMAT - Proposal only
Write the proposal now, following the five moves and the closing block. Output ONLY the proposal text itself:
- Each move is a separate paragraph with a blank line between them (double newline)
- Question lines start with -> and each sits on its own line
- Numbered application answers each sit on their own line
- Wrap key phrases in **double asterisks** for bold; no other markdown, no headers, no code fences
- Use only plain dashes (-) for punctuation. Never use en-dashes or em-dashes
- No reasoning, no preamble, no commentary
- Copy any URL exactly as given, including underscores
- Do not wrap it in quotes or labels like "Proposal:"
- Start directly with the opening phrase. End with "Best Regards," and the freelancer's name.`;
}

/**
 * System prompt for answering a single Upwork application question. Used when
 * the "Write with AI" button is clicked on an additional-question textarea.
 * Deliberately NOT the proposal methodology - this is a short, direct answer.
 */
export function buildAnswerSystemPrompt(customBase?: string): string {
  const base =
    customBase && customBase.trim().length ? customBase.trim() : undefined;

  return (base ? base + "\n\n" : "") + `Answer a single Upwork application question. Use ONLY the provided freelancer profile - never invent experience or results.

RULES:
- Answer ONLY the specific question. No proposal/pitch/sign-off.
- 40-100 words. Direct and credible.
- Reference profile skills only where relevant. If no fit, say so in one line, point to closest skill.
- If asked for past work/links, cite from portfolio with URLs verbatim (do not alter underscores or paths). Never invent links.
- Plain text only - no markdown/bullets/headers.

OUTPUT: Start directly with the answer.`;
}

/**
 * Simplified proposal prompt for free-tier users. Uses a lighter model
 * and produces a shorter version of the same structure.
 */
export function buildBasicProposalPrompt(): string {
  return `Write a concise Upwork proposal. Use ONLY the provided freelancer profile - never invent experience or results. Bold key phrases with **double asterisks** (tools and deliverables only).

STRUCTURE:
1. Start exactly: "**No longer pitch here** just letting you know **I've done exactly this kind of work before**, specifically" + 2-3 tasks and tools from the job post. If the profile has no matching experience, say "my **closest experience** is" + closest skills instead.
2. One sentence: "I understand the challenge: [surface task] isn't the hard part, [real problem from this post] is."
3. One paragraph: "I have **3 quick suggestions** on contributing effectively from day one:" + three concrete suggestions in one sentence.
4. End with exactly: "Let's discuss your project requirements in detail. I'm available for a chat anytime!" then "Best Regards," then the freelancer's name.

RULES:
- If small/low-budget/urgent: confirm budget/timeline, skip questions, replace the last CTA line with a direct action like "Send me access and I'll get started today."
- No invented fear or hedging. No filler. No other markdown.
- Under 200 words. Plain dashes only.

OUTPUT: Write directly. No preamble.`;
}