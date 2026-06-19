/**
 * UpScore AI Proposal Generator
 *
 * Uses GroqCloud's Llama models to generate tailored Upwork proposals
 * based on job details, analysis data, and the user's skills.
 *
 * The generator follows this structure:
 *  1. Analyze job requirements from title + description
 *  2. Identify key skills the user should highlight
 *  3. Generate a compelling cover letter (Upwork proposal)
 *  4. Include specific questions about the project
 */

// ─── Types ───

export interface ProposalInput {
  jobTitle: string;
  jobDescription: string;
  jobUrl?: string;
  skills?: string[];
  budget?: string;
  clientCountry?: string;
  proposalTips?: string[];
  matchScore?: number;
  opportunityScore?: number;
  winProbability?: number;
  recommendation?: string;

  // Optional user context to personalize proposals
  userName?: string;
  userTitle?: string;
  userSkills?: string[];
  userExperience?: string;
}

export interface ProposalResult {
  generated_text: string;
  score?: number;
}

// ─── Generator ───

/**
 * Generate an AI proposal for an Upwork job using GroqCloud.
 * Falls back to a template-based proposal if no GroqCloud key is available.
 */
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
          {
            role: "system",
            content: `You are an expert Upwind proposal writer. Your job is to write compelling, 
personalized cover letters for Upwork job applications. Each proposal should:

1. Open with a strong hook that shows you've read the job description
2. Demonstrate relevant experience with specific examples
3. Address the client's needs and pain points directly
4. Include 2-3 thoughtful questions about the project
5. End with a clear call to action
6. Be concise (250-400 words) and professional
7. Avoid generic phrases like "I am writing to apply for..."
8. Use the client's language and terminology from the job post

Return ONLY valid JSON with this structure:
{
  "proposal": "The full proposal text here...",
  "score": <number 1-100 indicating proposal quality>,
  "key_points": ["point1", "point2", "point3"]
}`,
          },
          {
            role: "user",
            content: buildPrompt(input),
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
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
  } catch (err: any) {
    console.warn("[Proposal] Generation error:", err.message);
    return generateFallbackProposal(input);
  }
}

// ─── Prompt Builder ───

function buildPrompt(input: ProposalInput): string {
  const sections: string[] = [];

  sections.push(`JOB DETAILS:
Title: ${input.jobTitle}
Description: ${input.jobDescription.slice(0, 4000)}
${input.budget ? `Budget: ${input.budget}` : ""}
${input.clientCountry ? `Client Location: ${input.clientCountry}` : ""}
${input.skills?.length ? `Required Skills: ${input.skills.join(", ")}` : ""}
${input.matchScore ? `Match Score: ${input.matchScore}/100` : ""}
${input.opportunityScore ? `Opportunity Score: ${input.opportunityScore}/100` : ""}
${input.recommendation ? `Recommendation: ${input.recommendation}` : ""}`);

  if (input.proposalTips?.length) {
    sections.push(`\nANALYSIS TIPS:
${input.proposalTips.map((t) => `- ${t}`).join("\n")}`);
  }

  if (input.userSkills?.length || input.userExperience) {
    sections.push(`\nYOUR PROFILE:
${input.userName ? `Name: ${input.userName}` : ""}
${input.userTitle ? `Title: ${input.userTitle}` : ""}
${input.userSkills?.length ? `Your Skills: ${input.userSkills.join(", ")}` : ""}
${input.userExperience ? `Experience: ${input.userExperience.slice(0, 1000)}` : ""}`);
  }

  sections.push(`\nWrite a professional Upwork proposal based on these details. 
Focus on the job requirements first, then highlight relevant experience. 
Make it specific and personal — avoid generic templates.`);

  return sections.join("\n\n");
}

// ─── Fallback ───

function generateFallbackProposal(input: ProposalInput): ProposalResult {
  const title = input.jobTitle;
  const tips = input.proposalTips || [];
  const userSkills = input.userSkills || input.skills || [];

  const intro = `I read your job posting for "${title}" and I'm confident I can deliver excellent results.`;

  const skillsSection = userSkills.length > 0
    ? `\n\nMy experience with ${userSkills.slice(0, 5).join(", ")} aligns perfectly with your project requirements. I've successfully delivered similar projects and can bring that expertise to your team.`
    : "";

  const tipsSection = tips.length > 0
    ? `\n\n${tips.slice(0, 3).map((t) => `- ${t}`).join("\n")}`
    : "";

  const closing = `\n\nI'd love to discuss your project in more detail. A few questions:
1. What's the timeline for this project?
2. Do you have any specific technical requirements or preferences?
3. What does success look like for this engagement?

Looking forward to hearing from you!`;

  const proposal = `${intro}${skillsSection}${tipsSection}${closing}`;

  return {
    generated_text: proposal,
    score: 65,
  };
}
