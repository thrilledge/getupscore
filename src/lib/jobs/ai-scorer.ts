/**
 * AI Job Analysis Service
 *
 * Uses OpenAI to analyze jobs against user filters and produce:
 *  - Match score (how well the job fits the user's filters)
 *  - Opportunity score (quality/viability of the job)
 *  - Win probability
 *  - Skills analysis
 *  - Budget fit
 *  - Client analysis
 *  - Competition analysis
 *  - Recommendation + reasoning
 *  - Proposal tips
 *  - Red flags
 */

import { env } from "@/lib/env";
import { parseLlmJson } from "@/lib/llm";
import type { Json } from "@/lib/supabase/database-types";

// ─── Types ───

export interface JobAnalysisInput {
  job: {
    id: string;
    upwork_job_id: string;
    title: string;
    description: string | null;
    budget: number | null;
    hourly_min: number | null;
    hourly_max: number | null;
    client_country: string | null;
    proposals_count: number | null;
    url: string | null;
    posted_at: string | null;
  };
  filters?: Array<{
    name: string;
    keywords: string[];
    min_budget?: number | null;
    max_budget?: number | null;
    client_countries?: string[];
    max_proposals?: number | null;
  }>;
}

export interface JobAnalysisResult {
  match_score: number;
  opportunity_score: number;
  win_probability: number;
  skills_match: Record<string, Json>;
  budget_fit: Record<string, Json>;
  client_analysis: Record<string, Json>;
  competition_analysis: Record<string, Json>;
  recommendation: string;
  reasoning: string;
  proposal_tips: string[];
  red_flags: string[];
}

// ─── Scoring Prompt ───

const SYSTEM_PROMPT = `You are an expert Upwork job analyst. Given a job posting and the user's search filters, you must:

1. **Match Score** (0-100): How well does this job match the user's keywords, skills, and preferences?
2. **Opportunity Score** (0-100): Is this a high-quality, legitimate opportunity?
3. **Win Probability** (0-100): What's the likelihood the user can win this project?

Return ONLY valid JSON. No markdown, no code fences, just raw JSON.`;

function buildAnalysisPrompt(input: JobAnalysisInput): string {
  const { job, filters } = input;

  const filterSummary = filters?.length
    ? filters
        .map(
          (f) =>
            `- Filter "${f.name}": keywords=[${f.keywords.join(", ")}]` +
            (f.min_budget ? `, min_budget=$${f.min_budget}` : "") +
            (f.max_budget ? `, max_budget=$${f.max_budget}` : "") +
            (f.client_countries?.length
              ? `, countries=[${f.client_countries.join(", ")}]`
              : "") +
            (f.max_proposals ? `, max_proposals=${f.max_proposals}` : "")
        )
        .join("\n")
    : "No specific filters configured.";

  const budgetInfo = job.budget
    ? `Fixed budget: $${job.budget}`
    : job.hourly_min && job.hourly_max
      ? `Hourly rate: $${job.hourly_min}-$${job.hourly_max}/hr`
      : "No budget specified.";

  return `Analyze this Upwork job:

## Job Details
Title: ${job.title}
Description: ${(job.description || "No description").slice(0, 3000)}
Budget: ${budgetInfo}
Client Country: ${job.client_country || "Unknown"}
Proposals: ${job.proposals_count ?? "Unknown"}
Posted: ${job.posted_at || "Unknown"}

## User's Job Filters
${filterSummary}

## Required JSON Output
{
  "match_score": <number 0-100>,
  "opportunity_score": <number 0-100>,
  "win_probability": <number 0-100>,
  "skills_match": {
    "matched_skills": [<strings>],
    "missing_skills": [<strings>],
    "overall_fit": <string>
  },
  "budget_fit": {
    "type": <"hourly" | "fixed" | "unknown">,
    "user_budget_range": <string>,
    "fit_assessment": <string>
  },
  "client_analysis": {
    "country": <string>,
    "history_indicators": <string>,
    "payment_risk": <"low" | "medium" | "high">,
    "recommendation": <string>
  },
  "competition_analysis": {
    "total_proposals": <number>,
    "competition_level": <"low" | "medium" | "high">,
    "differentiation_advice": <string>
  },
  "recommendation": <"strong_apply" | "apply" | "consider" | "skip">,
  "reasoning": <string explaining scores>,
  "proposal_tips": [<3-5 specific tips for this job>],
  "red_flags": [<any concerns about this job>]
}`;
}

// ─── AI Scorer ───

/**
 * Analyze a job using OpenAI and return structured results.
 */
export async function analyzeJob(
  input: JobAnalysisInput
): Promise<JobAnalysisResult> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    return getFallbackAnalysis(input);
  }

  try {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: buildAnalysisPrompt(input),
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text().catch(() => "Unknown");
      console.error("[AI Scorer] OpenAI error:", response.status, err);
      return getFallbackAnalysis(input);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[AI Scorer] Empty response from OpenAI");
      return getFallbackAnalysis(input);
    }

    const result = parseLlmJson<JobAnalysisResult>(content);

    // Validate and clamp scores
    return {
      match_score: clampScore(result.match_score),
      opportunity_score: clampScore(result.opportunity_score),
      win_probability: clampScore(result.win_probability),
      skills_match: validateJson(result.skills_match),
      budget_fit: validateJson(result.budget_fit),
      client_analysis: validateJson(result.client_analysis),
      competition_analysis: validateJson(result.competition_analysis),
      recommendation: ["strong_apply", "apply", "consider", "skip"].includes(
        result.recommendation
      )
        ? result.recommendation
        : "consider",
      reasoning: result.reasoning || "AI analysis completed.",
      proposal_tips: Array.isArray(result.proposal_tips)
        ? result.proposal_tips.slice(0, 10)
        : [],
      red_flags: Array.isArray(result.red_flags)
        ? result.red_flags.slice(0, 10)
        : [],
    };
  } catch (err) {
    console.error("[AI Scorer] Error:", err);
    return getFallbackAnalysis(input);
  }
}

// ─── Fallback (when no API key or API error) ───

function getFallbackAnalysis(input: JobAnalysisInput): JobAnalysisResult {
  const { job, filters } = input;

  // Simple keyword-based scoring fallback
  const titleWords = (job.title || "").toLowerCase();
  const descWords = (job.description || "").toLowerCase();
  const combinedText = titleWords + " " + descWords;

  let matchScore = 50; // Default mid range
  let matchedSkills: string[] = [];

  if (filters?.length) {
    const allKeywords = filters.flatMap((f) =>
      f.keywords.map((k) => k.toLowerCase())
    );
    const uniqueKeywords = [...new Set(allKeywords)];

    const foundKeywords = uniqueKeywords.filter((kw) =>
      combinedText.includes(kw)
    );
    matchedSkills = foundKeywords;

    if (uniqueKeywords.length > 0) {
      matchScore = Math.round((foundKeywords.length / uniqueKeywords.length) * 100);
    }

    // Adjust for max proposals
    const maxProps = filters[0]?.max_proposals;
    if (maxProps && job.proposals_count && job.proposals_count > maxProps) {
      matchScore = Math.max(0, matchScore - 15);
    }
  }

  // Simple opportunity scoring
  let oppScore = 60;
  if (job.proposals_count !== null) {
    if (job.proposals_count < 5) oppScore = 85;
    else if (job.proposals_count < 15) oppScore = 70;
    else if (job.proposals_count < 30) oppScore = 50;
    else oppScore = 35;
  }
  if (job.budget && job.budget > 500) oppScore = Math.min(95, oppScore + 10);
  if (job.budget && job.budget < 50) oppScore = Math.max(10, oppScore - 20);

  // Win probability
  let winProb = 50;
  if (oppScore > 70 && matchScore > 70) winProb = 75;
  else if (oppScore > 50 && matchScore > 50) winProb = 55;
  else winProb = 30;

  return {
    match_score: clampScore(matchScore),
    opportunity_score: clampScore(oppScore),
    win_probability: clampScore(winProb),
    skills_match: {
      matched_skills: matchedSkills,
      missing_skills: [],
      overall_fit:
        matchScore >= 70
          ? "Good fit based on keyword matching"
          : "Moderate fit — consider refining filters",
    },
    budget_fit: {
      type: job.hourly_min ? "hourly" : job.budget ? "fixed" : "unknown",
      user_budget_range:
        filters?.[0]?.min_budget
          ? `Min: $${filters[0].min_budget}`
          : "Not specified",
      fit_assessment: "Budget analysis requires AI (OpenAI API key not configured)",
    },
    client_analysis: {
      country: job.client_country || "Unknown",
      history_indicators: "Client analysis requires AI (OpenAI API key not configured)",
      payment_risk: "unknown",
      recommendation: "Verify client history on Upwork",
    },
    competition_analysis: {
      total_proposals: job.proposals_count ?? 0,
      competition_level:
        job.proposals_count === null
          ? "unknown"
          : job.proposals_count < 10
            ? "low"
            : job.proposals_count < 30
              ? "medium"
              : "high",
      differentiation_advice:
        "Stand out with a personalized proposal",
    },
    recommendation:
      matchScore >= 75 && oppScore >= 70
        ? "apply"
        : matchScore >= 50
          ? "consider"
          : "skip",
    reasoning:
      matchScore >= 70
        ? `Matches ${matchedSkills.length} keyword(s). ${
            oppScore >= 70 ? "Good opportunity." : "Average opportunity."
          }`
        : `Limited keyword match (${matchedSkills.length} found). ${
            filters?.length
              ? "Try adjusting your filters."
              : "Create filters in UpScore to improve matching."
          }`,
    proposal_tips: [
      "Review the job description thoroughly",
      "Highlight your relevant experience",
      "Ask clarifying questions if details are unclear",
    ],
    red_flags: [],
  };
}

// ─── Helpers ───

function clampScore(n: unknown): number {
  const num = typeof n === "number" ? n : parseInt(String(n)) || 50;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function validateJson(obj: unknown): Record<string, Json> {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return obj as Record<string, Json>;
  }
  return {};
}

/**
 * Batch analyze multiple jobs. Returns analyses in same order.
 */
export async function analyzeJobsBatch(
  jobs: JobAnalysisInput[],
  concurrency = 3
): Promise<JobAnalysisResult[]> {
  const results: JobAnalysisResult[] = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((job) => analyzeJob(job).catch((e) => {
        console.error(`[AI Scorer] Batch error on job ${job.job.id}:`, e);
        return getFallbackAnalysis(job);
      }))
    );
    results.push(...batchResults);
  }

  return results;
}
