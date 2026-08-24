import { chatCompletionWithRetry, parseLlmJson } from "@/lib/llm";
import { logLlmUsage } from "@/lib/llm-logger";

function clampScore(value: unknown): number | null {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function analyzeJob(
  supabase: any,
  job: any,
  dbJobId: string,
  userId: string
): Promise<Record<string, any>> {
  let analysisData: Record<string, any>;

  try {
    // Fetch user's active filters for personalized analysis
    const { data: filters } = await supabase
      .from("job_filters")
      .select("name, keywords, skills, min_budget, max_budget, hourly_min, hourly_max, client_countries, max_proposals, job_type, contractor_tier, category, subcategory")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(5);

    analysisData = await serverSideLlmAnalysis(job, userId, filters);
  } catch (err) {
    console.warn("[Analyze] LLM analysis failed, using keyword fallback:", err instanceof Error ? err.message : err);
    analysisData = serverSideKeywordFallback(job);
  }

  // Clamp scores to the 0-100 INTEGER column bound and drop anything the
  // DB would reject — an out-of-range LLM value must not silently kill the upsert.
  const match_score = clampScore(analysisData.match_score);
  const opportunity_score = clampScore(analysisData.opportunity_score);
  const win_probability = clampScore(analysisData.win_probability);

  const { error: analysisError } = await supabase.from("job_analyses").upsert(
    {
      job_id: dbJobId,
      user_id: userId,
      match_score,
      opportunity_score,
      win_probability,
      skills_match: analysisData.skills_match || {},
      budget_fit: analysisData.budget_fit || {},
      client_analysis: analysisData.client_analysis || {},
      competition_analysis: analysisData.competition_analysis || {},
      recommendation: analysisData.recommendation || "consider",
      reasoning: analysisData.reasoning || "",
      proposal_tips: Array.isArray(analysisData.proposal_tips) ? analysisData.proposal_tips.slice(0, 10) : [],
      red_flags: Array.isArray(analysisData.red_flags) ? analysisData.red_flags.slice(0, 10) : [],
      model_used: "groq-multikey",
    },
    { onConflict: "job_id, user_id", ignoreDuplicates: false }
  );

  if (analysisError) {
    console.warn("[Analyze] Insert error:", analysisError.message);
  }

  return {
    ...analysisData,
    match_score,
    opportunity_score,
    win_probability,
  };
}

async function serverSideLlmAnalysis(
  job: any,
  userId?: string,
  userFilters?: any[],
): Promise<Record<string, any>> {
  const title = job.title || "";
  const description = (job.description || "").slice(0, 3000);

  const skills = Array.isArray(job.skills) ? job.skills.join(", ") : "None listed";
  const budgetInfo = job.budget ? `$${job.budget}` : job.hourly_min ? `$${job.hourly_min}-$${job.hourly_max}/hr` : "Not specified";
  const budgetType = job.job_type || job.budget_type || "Not specified";
  const experienceLevel = job.contractor_tier || job.experience_level || "Not specified";
  const hoursPerWeek = job.hours_per_week || "Not specified";
  const clientCountry = job.client_country || job.client_location_country || "Unknown";
  const clientCity = job.client_city || "";
  const clientRating = job.client_rating ? `${job.client_rating}/5` : "No rating";
  const clientScore = job.client_score != null && job.client_score > 0 ? `${job.client_score}/5` : "No score";
  const clientTotalSpend = job.client_total_spend ? `$${job.client_total_spend}` : "Unknown";
  const clientTotalHires = job.client_total_hires ?? "Unknown";
  const clientHireRate = job.client_hire_rate != null ? `${job.client_hire_rate}%` : "Unknown";
  const clientMemberSince = job.client_member_since ? new Date(job.client_member_since).toLocaleDateString() : "Unknown";
  const paymentVerified = job.client_payment_verified === true || job.payment_verified === true;
  const clientHoursCount = job.client_hours_count ?? "Unknown";
  const clientFeedbackCount = job.client_feedback_count ?? "Unknown";
  const clientActiveAssignments = job.client_active_assignments ?? "Unknown";
  const clientJobsPosted = job.client_total_jobs_with_hires ?? "Unknown";
  const clientCompanySize = job.client_company_size ?? "Unknown";
  const proposalsCount = job.proposals_count ?? "Unknown";
  const duration = job.duration_label ? `${job.duration_label}${job.duration_weeks ? ` (${job.duration_weeks} weeks)` : ""}` : "Not specified";

  const prompt = `Analyze this Upwork job. Return ONLY valid JSON.

JOB: ${title}
Desc: ${description}
Skills: ${skills} | Budget: ${budgetInfo} (${budgetType}) | Level: ${experienceLevel} | Duration: ${duration} | Hrs/wk: ${hoursPerWeek} | Proposals: ${proposalsCount}

CLIENT: ${clientCountry}${clientCity ? `, ${clientCity}` : ""} | Score: ${clientScore} | Rating: ${clientRating} | Spend: ${clientTotalSpend} | Hires: ${clientTotalHires} | Jobs posted: ${clientJobsPosted} | Active: ${clientActiveAssignments} | Hours: ${clientHoursCount} | Reviews: ${clientFeedbackCount} | Size: ${clientCompanySize} | Hire rate: ${clientHireRate} | Since: ${clientMemberSince} | Payment: ${paymentVerified ? "verified" : "not verified"}${userFilters && userFilters.length > 0 ? `

FILTERS: ${userFilters.map((f: any) => `"${f.name || "Unnamed"}" skills:${(f.skills || []).join(",")} keywords:${(f.keywords || []).join(",")} budget:${f.min_budget || "?"}-${f.max_budget || "?"} level:${f.contractor_tier || "?"} countries:${(f.client_countries || []).join(",")}`).join("; ")}
Personalize match_score and tips based on these preferences.` : ""}

RULES: High client score (>=4), verified payment, hire history = POSITIVE signals. Do NOT flag as red flags. Only flag missing/negative data.

JSON schema:
{"match_score":<0-100>,"opportunity_score":<0-100>,"win_probability":<0-100>,"skills_match":{"matched_skills":[str],"missing_skills":[str],"overall_fit":"Good|Moderate|Weak"},"budget_fit":{"type":"hourly|fixed|unknown","assessment":str},"client_analysis":{"country":str,"payment_risk":"low|medium|high","experience":str,"recommendation":str},"competition_analysis":{"competition_level":"low|medium|high","advice":str},"recommendation":"strong_apply|apply|consider|skip|hide","reasoning":str,"proposal_tips":[str],"red_flags":[str]}`;

  const startTime = Date.now();
  const response = await chatCompletionWithRetry(
    (p) => ({
      model: p.model,
      messages: [
        {
          role: "system",
          content: "You are an expert Upwork job analyst. Do NOT output your thinking process, reasoning, or analysis. Return ONLY valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      ...(p.groqStyle ? { reasoning_format: "hidden" as const } : {}),
      response_format: { type: "json_object" },
    }),
  );

  if (!response.response.ok) {
    const errBody = await response.response.text().catch(() => "");
    throw new Error(`LLM returned ${response.response.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await response.response.json();
  const duration_ms = Date.now() - startTime;

  logLlmUsage({
    user_id: userId,
    provider: response.provider.name,
    model: response.provider.model,
    endpoint: "analysis",
    prompt_tokens: data.usage?.prompt_tokens ?? 0,
    completion_tokens: data.usage?.completion_tokens ?? 0,
    total_tokens: data.usage?.total_tokens ?? 0,
    duration_ms,
    success: true,
  }).catch(() => {});

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty LLM response");

  return parseLlmJson(content);
}

function serverSideKeywordFallback(job: any): Record<string, any> {
  return {
    // Deliberately below the notification thresholds (>=50 gate, 70-75 rule
    // mins) so a failed LLM call never fires a notification.
    match_score: 40,
    opportunity_score: 40,
    win_probability: 40,
    skills_match: {
      matched_skills: [],
      missing_skills: [],
      overall_fit: "Moderate",
    },
    budget_fit: {
      type: job.hourly_min ? "hourly" : job.budget ? "fixed" : "unknown",
      assessment: "LLM analysis unavailable — check manually",
    },
    client_analysis: {
      country: job.client_country || "Unknown",
      payment_risk: "unknown",
      recommendation: "Verify client on Upwork",
    },
    competition_analysis: {
      competition_level: "unknown",
      advice: "LLM analysis unavailable — check job posting details manually",
    },
    recommendation: "consider",
    reasoning: "Keyword fallback — LLM analysis temporarily unavailable",
    proposal_tips: ["Review job details on Upwork for tailored proposal"],
    red_flags: [],
  };
}
