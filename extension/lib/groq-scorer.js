/**
 * GroqCloud AI Scorer — runs in the extension background worker.
 *
 * Uses GroqCloud API (OpenAI-compatible) with 3-key round-robin
 * to analyze Upwork jobs and return structured scores.
 *
 * Models available (fastest on Groq):
 *  - llama3-70b-8192
 *  - llama-3.1-70b-versatile
 *  - mixtral-8x7b-32768
 *  - gemma2-9b-it
 */

const GROQ_API_BASE = "https://api.groq.com/openai/v1";

// ─── Keys Management (round-robin) ───

/**
 * Get the next Groq API key in rotation.
 * Keys are stored in chrome.storage.sync and rotated on each call.
 */
async function getNextGroqKey() {
  const result = await chrome.storage.sync.get([
    "groq_api_keys",
    "groq_current_key_index",
  ]);

  const keys = result.groq_api_keys || [];
  if (keys.length === 0) return null;

  let index = result.groq_current_key_index || 0;
  const key = keys[index];

  // Rotate for next call
  index = (index + 1) % keys.length;
  await chrome.storage.sync.set({ groq_current_key_index: index });

  return key;
}

/**
 * Get configured Groq model, defaulting to fast model.
 */
async function getGroqModel() {
  const result = await chrome.storage.sync.get(["groq_model"]);
  return result.groq_model || "llama-3.1-70b-versatile";
}

// ─── Scoring Prompt ───

const SYSTEM_PROMPT = `You are an expert Upwork job analyst. Given a job posting and the user's skills, you must analyze the job and return a structured JSON analysis.

Analyze these aspects:
1. **Match Score** (0-100): How well does this job match the user's skills/keywords?
2. **Opportunity Score** (0-100): Quality and viability of this opportunity
3. **Win Probability** (0-100): Likelihood of winning the proposal
4. **Skills Match**: Which skills match, which are missing
5. **Budget Fit**: Analysis of budget/rate
6. **Client Analysis**: Evaluate client based on available info
7. **Competition**: Based on proposals count
8. **Recommendation**: strong_apply | apply | consider | skip | hide
9. **Proposal Tips**: 3-5 specific tips
10. **Red Flags**: Any concerns

Return ONLY raw JSON. No markdown, no code fences.`;

/**
 * Build the analysis prompt for a given job.
 */
function buildPrompt(job) {
  const title = job.title || "Untitled";
  const description = (job.description || "No description").slice(0, 3000);
  
  const budgetInfo = job.budget 
    ? `Fixed budget: $${job.budget}`
    : job.hourly_min && job.hourly_max
      ? `Hourly rate: $${job.hourly_min}-$${job.hourly_max}/hr`
      : "Not specified";

  return `Analyze this Upwork job:

Title: ${title}
Description: ${description}
Budget: ${budgetInfo}
Client Country: ${job.country || job.client_country || "Unknown"}
Proposals: ${job.proposals_count ?? "Unknown"}
Skills listed: ${(job.skills || []).join(", ") || "None specified"}

Return JSON:
{
  "match_score": <0-100>,
  "opportunity_score": <0-100>,
  "win_probability": <0-100>,
  "skills_match": {
    "matched_skills": [<strings>],
    "missing_skills": [<strings>],
    "overall_fit": <string>
  },
  "budget_fit": {
    "type": "hourly" | "fixed" | "unknown",
    "assessment": <string>
  },
  "client_analysis": {
    "country": <string>,
    "payment_risk": "low" | "medium" | "high",
    "recommendation": <string>
  },
  "competition_analysis": {
    "proposals_count": <number>,
    "competition_level": "low" | "medium" | "high",
    "advice": <string>
  },
  "recommendation": "strong_apply" | "apply" | "consider" | "skip" | "hide",
  "reasoning": <string>,
  "proposal_tips": [<3-5 strings>],
  "red_flags": [<strings>]
}`;
}

// ─── Main Scorer ───

/**
 * Analyze a job using GroqCloud. Tries all 3 keys on failure.
 * Returns either the AI result or a keyword-based fallback.
 */
async function analyzeJob(job) {
  // Try each key in rotation
  const result = await chrome.storage.sync.get(["groq_api_keys"]);
  const keys = result.groq_api_keys || [];
  
  // If no keys configured, use fallback
  if (keys.length === 0) {
    console.log("[GroqScorer] No API keys configured, using keyword fallback");
    return keywordFallback(job);
  }

  const model = await getGroqModel();
  let lastError = null;

  // Try each key (up to all 3)
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = await getNextGroqKey();
    if (!key) continue;

    try {
      const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildPrompt(job) },
          ],
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: "json_object" },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return normalizeResult(parsed);
        }
      } else if (response.status === 429) {
        // Rate limited — try next key
        lastError = `Rate limited on key ${attempt + 1}`;
        continue;
      } else if (response.status === 401) {
        lastError = `Invalid key ${attempt + 1}`;
        continue;
      } else {
        const errText = await response.text().catch(() => "Unknown");
        lastError = `Groq error (${response.status}): ${errText}`;
        continue;
      }
    } catch (err) {
      lastError = err.message;
      continue;
    }
  }

  console.warn("[GroqScorer] All keys failed:", lastError);
  return keywordFallback(job);
}

// ─── Normalizer ───

function normalizeResult(parsed) {
  return {
    match_score: clampScore(parsed.match_score),
    opportunity_score: clampScore(parsed.opportunity_score),
    win_probability: clampScore(parsed.win_probability),
    skills_match: parsed.skills_match || {},
    budget_fit: parsed.budget_fit || {},
    client_analysis: parsed.client_analysis || {},
    competition_analysis: parsed.competition_analysis || {},
    recommendation: ["strong_apply", "apply", "consider", "skip", "hide"].includes(parsed.recommendation)
      ? parsed.recommendation
      : "consider",
    reasoning: parsed.reasoning || "AI analysis completed.",
    proposal_tips: Array.isArray(parsed.proposal_tips) ? parsed.proposal_tips.slice(0, 10) : [],
    red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags.slice(0, 10) : [],
  };
}

// ─── Keyword Fallback (when Groq is unavailable) ───

function keywordFallback(job) {
  const title = (job.title || "").toLowerCase();
  const desc = (job.description || "").toLowerCase();
  const combined = title + " " + desc;
  
  // Get user's keywords from stored filters
  // (Extension passes job.skills as hints)
  const jobSkills = (job.skills || []).map(s => s.toLowerCase());
  const matchedSkills = jobSkills.filter(s => combined.includes(s));
  
  const matchScore = jobSkills.length > 0
    ? Math.round((matchedSkills.length / jobSkills.length) * 100)
    : 50;

  let oppScore = 60;
  if (job.proposals_count !== null && job.proposals_count !== undefined) {
    if (job.proposals_count < 5) oppScore = 80;
    else if (job.proposals_count < 15) oppScore = 65;
    else if (job.proposals_count < 30) oppScore = 50;
    else oppScore = 35;
  }

  return {
    match_score: matchScore,
    opportunity_score: oppScore,
    win_probability: Math.round((matchScore + oppScore) / 2),
    skills_match: {
      matched_skills: matchedSkills,
      missing_skills: jobSkills.filter(s => !combined.includes(s)),
      overall_fit: matchScore >= 70 ? "Good" : matchScore >= 40 ? "Moderate" : "Weak",
    },
    budget_fit: {
      type: job.hourly_min ? "hourly" : job.budget ? "fixed" : "unknown",
      assessment: "Set up GroqCloud API keys for detailed budget analysis",
    },
    client_analysis: {
      country: job.country || job.client_country || "Unknown",
      payment_risk: "unknown",
      recommendation: "Verify client on Upwork",
    },
    competition_analysis: {
      proposals_count: job.proposals_count || 0,
      competition_level: !job.proposals_count ? "unknown"
        : job.proposals_count < 10 ? "low"
        : job.proposals_count < 30 ? "medium" : "high",
      advice: "Personalize your proposal to stand out",
    },
    recommendation: matchScore >= 75 && oppScore >= 65 ? "apply"
      : matchScore >= 50 ? "consider" : "skip",
    reasoning: matchScore >= 50
      ? `Keyword match: ${matchedSkills.length}/${jobSkills.length} skills found`
      : "Low keyword match — review job details",
    proposal_tips: [
      "Highlight relevant experience",
      "Reference specific skills from the job",
      "Ask thoughtful questions about the project",
    ],
    red_flags: [],
  };
}

// ─── Helper ───

function clampScore(n) {
  const num = typeof n === "number" ? n : parseInt(n) || 50;
  return Math.max(0, Math.min(100, Math.round(num)));
}

export { analyzeJob, getNextGroqKey, getGroqModel };
