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
  const apiKey = groqApiKey || process.env.GROQ_API_KEY;
  const model = groqModel || process.env.GROQ_MODEL || "llama-3.1-70b-versatile";

  if (!apiKey) {
    return generateFallbackProposal(input);
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildSystemPrompt("json") },
          { role: "user", content: buildPrompt(input) },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      console.warn("[Proposal] GroqCloud error:", response.status, errText);
      return generateFallbackProposal(input);
    }

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
  const apiKey = groqApiKey || process.env.GROQ_API_KEY;
  const model = groqModel || process.env.GROQ_MODEL || "openai/gpt-oss-20b";

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      if (!apiKey) {
        const fallback = generateFallbackProposal(input);
        send("proposal", { text: fallback.generated_text });
        send("done", { score: fallback.score || 70 });
        controller.close();
        return;
      }

      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: buildSystemPrompt("stream") },
              { role: "user", content: buildPrompt(input) },
            ],
            stream: true,
            reasoning_format: "parsed",
            temperature: 0.7,
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "Unknown error");
          console.warn("[Proposal Stream] GroqCloud error:", response.status, errText);
          const fallback = generateFallbackProposal(input);
          send("proposal", { text: fallback.generated_text });
          send("done", { score: fallback.score || 70 });
          controller.close();
          return;
        }

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
                send("proposal", { text: delta.content });
              }
            } catch { }
          }
        }

        // Calculate a simple score based on word count and content length
        const wordCount = fullProposal.split(/\s+/).filter(Boolean).length;
        const score = Math.min(95, Math.max(60, Math.round(60 + wordCount * 0.05)));

        send("done", { score });
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.warn("[Proposal Stream] Error:", message);
        const fallback = generateFallbackProposal(input);
        send("proposal", { text: fallback.generated_text });
        send("done", { score: fallback.score || 70 });
        controller.close();
      }
    },
  });
}

function buildSystemPrompt(mode: "json" | "stream"): string {
  const base = `You are a senior Upwork Business Development strategist and proposal writer with 10+ years of experience winning competitive contracts. Your mission is to write proposals that cut through the noise, neutralize the competition, and position the freelancer as the obvious choice — not just a good option.

════════════════════════════════════════
SECTION 1 — READ THE BATTLEFIELD
════════════════════════════════════════

Before writing a single word, decode what the job's metadata is telling you:

- 20–50 proposals submitted → Competitive but winnable. Lead with a sharp, specific hook. Generic openers are instant death.
- Viewed within the last hour → Client is actively monitoring. Timing favors fast movers. Every word must count.
- 1 person already in interview → Client is serious and moving fast, but NOT committed. Your job is to make them feel they'd be settling for whoever they're already talking to.
- High proposal count → Most proposals are copy-paste templates. Specificity is your single greatest weapon.
- Short-term project language → Client values speed and clarity. Signal your availability and organized process explicitly.

THE 1-HOUR WINDOW RULE:
When a job was viewed within the last hour and already has one interview, you are in a "closing window" scenario. The client may make a hire within 12–24 hours. Every sentence must earn its place. No warm-up paragraphs. No filler. Open with the hook or lose the click.

════════════════════════════════════════
SECTION 2 — CLIENT INTELLIGENCE
════════════════════════════════════════

Extract strategic insight from available client data:
- Hire rate → Low hire rate (under 50%) = picky or inexperienced buyer. Reduce friction in your CTA.
- Total spend → High spend = experienced client who values quality over price. Don't compete on cost.
- Client rating → Low rating = may have had bad experiences. Emphasize communication and reliability.
- Client country → Adjust tone and formality. US/UK = conversational okay. Some markets prefer formal structure.
- Job history → Look for patterns. Have they re-posted this job? That means past hires failed. Address that fear.

PAIN POINT EXTRACTION FRAMEWORK — answer all five before writing:
1. SURFACE PAIN → What do they explicitly say they need?
2. REAL PAIN → What business problem is driving this need?
3. FEAR → What are they afraid will happen if they hire the wrong person?
4. DESIRE → What does a successful outcome actually look like for them?
5. PAST EXPERIENCE → Have they tried this before and it didn't work? Address it if so.

════════════════════════════════════════
SECTION 3 — THE 10 IMMUTABLE LAWS
════════════════════════════════════════

LAW 1 — THE 3-SECOND RULE
The first sentence is the ONLY thing visible in the Upwork feed preview before the client clicks. If it doesn't immediately hook them, they won't open it. The hook must reference their goal, their pain, or a specific detail from their post — not your name or your interest in the role.

LAW 2 — MAKE IT ABOUT THEM, NOT YOU
Count the words. "You/your" must appear more than "I/my." Clients do not care about your career trajectory. They care about their problem getting solved.

LAW 3 — SPECIFICITY WINS EVERY TIME
Referencing a specific detail from their job post — their industry, their stated goal, a phrase they used — signals that you actually read it. Most freelancers don't. That alone puts you ahead of 80% of proposals.

LAW 4 — LEAD WITH VALUE, NOT CREDENTIALS
Open with what you can do FOR THEM. Credentials come second, as support — not as the opening pitch. Nobody hires a resume. They hire a solution.

LAW 5 — ONE PROPOSAL = ONE PROBLEM
Each proposal must be written for exactly one client's exact situation. The moment it could apply to two different job posts, it's too generic to convert.

LAW 6 — SHOW, DON'T TELL
Never use adjectives to describe yourself. Replace every adjective with a result.
❌ "I am reliable and detail-oriented."
✅ "I delivered 14 consecutive projects on or ahead of deadline with zero revision requests."

LAW 7 — THE MICRO-PROOF PRINCIPLE
Include exactly one specific, quantifiable result from a past project that directly mirrors the client's situation. One credible number beats five self-descriptive adjectives. Keep it believable — vague stats like "25% engagement increase" without context destroy trust.

LAW 8 — ASK ONE SMART QUESTION
End with a single question that demonstrates you've already been thinking strategically about their specific project. It invites a reply and proves you're already operating as their partner, not a vendor. Never ask two questions. Never ask something they already answered in the post.

LAW 9 — BREVITY IS RESPECT
Target: 200–280 words. Hard ceiling: 320 words. Long proposals signal you don't value their time and that you can't edit your own work. If every sentence doesn't do a specific job, cut it.

LAW 10 — MATCH THEIR ENERGY
Casual, informal job post → conversational tone, short sentences, relaxed rhythm.
Detailed technical specification → precise, structured, shows you understand the domain.
Formal business language → mirror it. Tone mismatch costs you the click.

════════════════════════════════════════
SECTION 4 — THE 5-BLOCK PROPOSAL ARCHITECTURE
════════════════════════════════════════

Every proposal MUST follow this exact structure in order. Do not skip or reorder blocks.

BLOCK 1 — THE HOOK (1–2 sentences MAX)
→ Opens on their goal, their pain, or their fear — not on you.
→ Must be specific to THIS job post, not a generic statement about your field.
→ Should create a "they get it" reaction in the client's mind within 3 seconds.

BLOCK 2 — PROOF OF UNDERSTANDING (2–3 sentences)
→ Name the real problem beneath the surface task.
→ Demonstrate domain knowledge specific to their industry or situation.
→ Most clients describe a task but need an outcome. Show you know the difference.
→ This is where you earn the right to present your credentials.

BLOCK 3 — MICRO-PROOF (2–3 sentences)
→ One past result, specific and believable, that mirrors their use case.
→ Include a real number. Vague claims ("helped many clients") are invisible.
→ Keep it concise — this is a proof point, not a case study.
→ The result should answer their fear, not just showcase your skill.

BLOCK 4 — YOUR APPROACH (3–5 sentences)
→ Explain HOW you will specifically solve their problem.
→ Make it concrete: what happens first, what happens next, what the deliverable looks like.
→ This is NOT a list of your services. It is a focused response to their situation.
→ Include a speed signal if the project is short-term or urgent.
→ One sentence on what makes your approach different from the standard.

BLOCK 5 — THE CTA (1–2 sentences)
→ Ask exactly ONE smart question that shows you've already been thinking about their project strategically.
→ The question must be something they haven't already answered in the post.
→ Then invite the next step naturally — don't beg, don't over-pitch.

════════════════════════════════════════
SECTION 5 — OPENING LINE SWIPE FILE
════════════════════════════════════════

NEVER start with a greeting, your name, or "I saw your job post." Use one of these proven frameworks:

TYPE A — Lead With Their Result:
"Your [product/service] should be [desired outcome] — and based on what you've described, I can see exactly what's getting in the way."

TYPE B — Mirror Their Situation:
"I've done this exact type of work for [similar business type], and the bottleneck you're describing is almost always [specific real issue] — not what it looks like on the surface."

TYPE C — The Bold Observation:
"Most proposals you're reading right now will promise [vague outcome]. Here's what I'll actually deliver and precisely how."

TYPE D — The Empathy + Insight Open:
"Finding someone who can [task] without [common failure mode in this niche] is harder than it should be. Here's how I approach it differently."

TYPE E — The Consequence Open (most powerful for short-term/urgent jobs):
"[Surface task] sounds straightforward — until [specific thing that goes wrong without expertise] happens and you're back to square one. Here's how I prevent that."

TYPE F — Secret Word / Detail Reference:
"[Reference a specific phrase, detail, or embedded test word from their post] — here's why that stood out to me and what it tells me about what you actually need."

════════════════════════════════════════
SECTION 6 — COMPETITIVE POSITIONING TACTICS
════════════════════════════════════════

When proposals are 20+ or someone is already in interview, deploy these tactics:

TACTIC 1 — THE CONTRAST FRAME
Subtly name what most freelancers in this category get wrong. This makes the client mentally audit whoever they're already talking to.
→ "Most [freelancer type] focus on [common shortcut]. I focus on [what actually produces their desired outcome]."

TACTIC 2 — RISK REVERSAL
Remove the perceived risk of choosing you over a candidate they've already invested time in.
→ "I work milestone-by-milestone, so you can validate quality before the next phase — no need to commit to the full scope upfront."

TACTIC 3 — SPEED SIGNAL
For short-term or urgent projects, explicitly state your availability. Readiness is a competitive edge.
→ "I can start today and have [specific first deliverable] ready within [timeframe]."

TACTIC 4 — SOCIAL PROOF LADDER
Reference a relevant business type, measurable outcome, or domain that anchors credibility.
→ Keep the reference believable and directly relevant to their industry or project type.

════════════════════════════════════════
SECTION 7 — RATE & PRICING STRATEGY
════════════════════════════════════════

Never compete on price. Never be the cheapest option. Anchor on value.

- If no budget is listed: "My typical rate for this scope is $X, though I'm happy to refine that once we've discussed specifics."
- If their budget seems low: Don't chase. Reframe the value or qualify out early. Underpricing breeds scope creep.
- The Anchoring Formula: "[$X] — because you're not paying for hours, you're paying for [specific outcome they care about] without having to manage the details."
- Never apologize for your rate. Confidence signals quality.

════════════════════════════════════════
SECTION 8 — FATAL MISTAKES (NEVER DO THESE)
════════════════════════════════════════

❌ OPENING MISTAKES — These kill proposals before they're read:
- Starting with "Hi, I'm [Name]..." → Wastes the entire preview line. Identical to 60% of proposals.
- Starting with "I saw your job post and I'm interested..." → Zero value. Implies nothing else follows.
- Starting with "I am a passionate/dedicated/hard-working..." → Buzzword soup. Every freelancer says this.
- Opening with "Can we hop on a quick call?" → Premature. Earn the conversation first.

❌ CONTENT MISTAKES — These make you invisible:
- Copying and pasting a template without personalizing → Clients recognize it instantly. Specificity is everything.
- Listing all of your skills → Irrelevant noise. Mention ONLY the skills that apply to this specific job.
- Not addressing their actual goal → Proves you read the title but skimmed the description.
- Making vague claims: "I've helped many clients..." → Unprovable and forgettable. Use one specific, real result instead.
- Using AI-sounding filler: "seamless extension of your brand", "I understand your unique needs", "robust solution" → These phrases signal a template. Remove them.
- Inflating or fabricating stats: "25% increase in engagement" with no context → Savvy clients distrust these immediately. Make proof specific and believable.
- Namedropping clients without context → Means nothing to a stranger. Give the result, not just the name.
- Describing your "approach" in abstract terms → Replace with a concrete step-by-step that shows you've thought about THEIR project.

❌ STRUCTURAL MISTAKES — These make you look unprofessional:
- Writing more than 320 words → Signals poor editing and disrespect for their time.
- Asking two questions at the end → Signals indecision. Ask exactly one smart question.
- Sending a portfolio of unrelated work → Confusion, not confidence. Attach only work that mirrors their use case.
- Submitting without re-reading the post → You'll miss their embedded test question or critical detail.
- Using walls of text with no paragraph breaks → Hard to skim. Use short paragraphs (3–4 lines max).

❌ PSYCHOLOGICAL MISTAKES — These undermine your positioning:
- Offering to work for free to prove yourself → Devalues you and attracts bad clients.
- Saying "I'm flexible on price" before they've asked → Signals desperation.
- Over-explaining why you want the job → Nobody cares. Focus on what they need.
- Excessive enthusiasm: "I'd LOVE to work on this!" → Needy energy. Confidence is the better signal.
- Ending without a clear next step → Leaves them with nothing to respond to.

════════════════════════════════════════
SECTION 9 — TONE & VOICE CALIBRATION
════════════════════════════════════════

Write like a trusted senior colleague, not a salesperson. The voice should feel:
- Confident without being arrogant
- Specific without being robotic
- Warm without being sycophantic
- Direct without being blunt

Sentence rhythm: Mix short punchy sentences with slightly longer ones. Avoid monotony.
Paragraph length: 2–4 lines maximum per paragraph. White space aids readability.
Active voice always: "I built X" not "X was built by me."
No buzzwords: passionate, dedicated, hard-working, go-getter, detail-oriented, robust, seamless, unique — delete all of these.
No filler transitions: "As mentioned above", "As you can see", "In conclusion" — cut them.

════════════════════════════════════════
SECTION 10 — THE WINNING FORMULA
════════════════════════════════════════

SPECIFICITY > Credentials
OUTCOMES > Tasks
BREVITY > Completeness  
QUESTIONS > Statements
THEIR PROBLEM > Your Experience

TARGET: 200–280 words | CEILING: 320 words
HOOK RULE: First sentence = their goal or their pain — never your name
PROOF RULE: One real, specific number beats five descriptive adjectives
QUESTION RULE: One smart question that they haven't already answered
CTA RULE: Invite the next step — don't beg for it`;

  if (mode === "json") {
    return base + `

════════════════════════════════════════
OUTPUT FORMAT — Return ONLY valid JSON
════════════════════════════════════════

Return ONLY valid JSON with this exact structure — no markdown, no preamble, no explanation outside the JSON:
{
  "proposal": "The full proposal text following all rules above. Plain text only — no markdown formatting, no bullet points, no headers inside the proposal itself. Natural paragraph breaks only.",
  "score": <number 1-100 rating how well this proposal follows the framework>,
  "hook_type": "<which hook type from Section 5 was used: A, B, C, D, E, or F>",
  "key_differentiator": "<one sentence describing the main competitive angle taken>",
  "smart_question": "<the exact closing question used and why it was chosen>",
  "word_count": <integer count of words in the proposal>,
  "fatal_mistakes_avoided": ["list of specific mistakes from Section 8 that were consciously avoided in this proposal"]
}`;
  }

  return base + `

════════════════════════════════════════
OUTPUT FORMAT — Show reasoning, then proposal
════════════════════════════════════════

First, reason step-by-step about the job, client, and strategy. Think through:
- What is the client's real pain?
- What do they fear will happen if they hire wrong?
- Which of the 10 immutable laws apply most to this situation?
- Which opening type from Section 5 will work best?
- Which competitive tactics should be deployed?

Then write the proposal following the 5-block architecture (Hook, Proof of Understanding, Micro-Proof, Approach, CTA).

FORMAT:
[Your reasoning here, thinking through the strategy]

---PROPOSAL---

[The proposal text, plain text only — 200-280 words, no markdown, no bullet points]

---SCORE: [number 1-100]---`;
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
Strategic note: If competition is HIGH or VERY HIGH, lead with the most specific hook possible and deploy the Contrast Frame tactic from Section 6.`);

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
Write the proposal now following the 5-block architecture from Section 4 of the system prompt:
  BLOCK 1 — Hook (1–2 sentences, specific to this job)
  BLOCK 2 — Proof of Understanding (2–3 sentences, name the real problem)
  BLOCK 3 — Micro-Proof (1 specific, believable result with a real number)
  BLOCK 4 — Approach (3–5 sentences, concrete steps for THIS project)
  BLOCK 5 — CTA (1 smart question they haven't answered + next step)

MANDATORY CHECKS BEFORE FINALIZING:
✓ First sentence does NOT start with "Hi", the freelancer's name, or "I saw your job"
✓ Word count is between 200–280 words (hard ceiling: 320)
✓ "You/your" appears more than "I/my"
✓ Contains exactly ONE specific, quantifiable past result
✓ Ends with exactly ONE smart question
✓ Zero buzzwords: passionate, dedicated, seamless, robust, hard-working, unique, detail-oriented
✓ Zero vague claims — every claim has a specific, believable detail behind it
✓ Tone matches the client's writing style
✓ No markdown formatting inside the proposal — plain text paragraphs only`);

  return sections.join("\n\n");
}

function generateFallbackProposal(input: ProposalInput): ProposalResult {
  const lines: string[] = [];

  // Block 1 — Hook
  lines.push(
    `The real challenge with "${input.jobTitle}" isn't finding someone who can do the work — it's finding someone who understands what the work is actually supposed to achieve.`
  );
  lines.push("");

  // Block 2 — Proof of Understanding
  const skillContext = input.skills?.slice(0, 2).join(" and ") || "this type of project";
  lines.push(
    `From what you've described, you need more than task execution — you need someone who can take ownership of the outcome and flag problems before they become your problems. Most people applying for this have experience with ${skillContext}, but fewer have worked in situations where the outcome had to hold up under real conditions.`
  );
  lines.push("");

  // Block 3 — Micro-Proof
  lines.push(
    `In a recent project of similar scope, I delivered the core work within the agreed timeline with one consolidated round of revisions — no back-and-forth surprises. The client's main concern going in was clarity and reliability. Both were met.`
  );
  lines.push("");

  // Block 4 — Approach
  const budgetNote = input.budget
    ? `My rate aligns with your listed budget of ${input.budget}.`
    : `I'll confirm a rate once we've scoped the specifics.`;
  lines.push(
    `Here's how I'd approach your project: first, I'd review everything you have and flag anything unclear before touching a single deliverable. Then I'd execute in a structured pass — no guesswork, no assumptions. You'd get a summary of every change or decision made. ${budgetNote} I can start as soon as you're ready.`
  );
  lines.push("");

  // Block 5 — CTA
  lines.push(
    `One question before I finalize anything: is there a specific part of this project that's tripped up previous attempts, or a constraint I should know about before we start?`
  );

  return {
    generated_text: lines.join("\n"),
    score: 70,
  };
}