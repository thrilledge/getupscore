import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/jobs/cron
 *
 * 24/7 job fetching pipeline. Uses ScrapingAnt proxy + stored
 * session cookies (from extension) to call Upwork's GraphQL API.
 *
 * Flow:
 *  1. Fetch stored session cookies from upwork_sessions table
 *  2. Call Upwork GraphQL via ScrapingAnt for each user's filters
 *  3. Deduplicate against existing jobs
 *  4. Store new jobs in jobs table
 *  5. Analyze via GroqCloud AI (if keys configured on server)
 *  6. Store analysis results in job_analyses table
 *
 * Auth: Bearer <CRON_SECRET>
 */
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization") || "";
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createSupabaseAdminClient();

    // Step 1: Get all users with active filters + session cookies
    const { data: activeUsers, error: userError } = await supabase
      .from("upwork_sessions")
      .select(`
        user_id,
        cookie_string,
        captured_at
      `)
      .returns<{ user_id: string; cookie_string: string; captured_at: string }[]>();

    if (userError) {
      console.error("[Cron] Error fetching sessions:", userError.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!activeUsers || activeUsers.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No active sessions. Open Upwork in your browser to sync cookies.",
        usersChecked: 0,
      });
    }

    const results = {
      usersChecked: activeUsers.length,
      totalJobsFound: 0,
      totalNewJobs: 0,
      totalAnalyzed: 0,
      errors: [] as string[],
    };

    for (const session of activeUsers) {
      try {
        const userResult = await processUser(supabase, session);
        results.totalJobsFound += userResult.jobsFound;
        results.totalNewJobs += userResult.newJobs;
        results.totalAnalyzed += userResult.analyzed;
        if (userResult.error) results.errors.push(userResult.error);
      } catch (err: any) {
        results.errors.push(`User ${session.user_id.slice(0, 8)}: ${err.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Cron] Fatal error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function processUser(
  supabase: any,
  session: { user_id: string; cookie_string: string }
) {
  const result = { jobsFound: 0, newJobs: 0, analyzed: 0, error: null as string | null };

  // Get user's active job filters
  const { data: filters, error: filterError } = await supabase
    .from("job_filters")
    .select("id, name, keywords, is_active")
    .eq("user_id", session.user_id)
    .eq("is_active", true);

  if (filterError) {
    return { ...result, error: `Filter query error: ${filterError.message}` };
  }

  if (!filters || filters.length === 0) {
    return result; // No filters — nothing to search for
  }

  // Import dynamically (to avoid circular imports)
  const { fetchJobsViaGraphQL, toJobInsert } = await import("@/lib/jobs/graphql-fetcher");

  for (const filter of filters) {
    const keywords = filter.keywords || [];
    if (keywords.length === 0) continue;

    const query = keywords.join(" ");

    try {
      const fetchResult = await fetchJobsViaGraphQL({
        query,
        cookies: session.cookie_string,
        count: 10,
        offset: 0,
      });

      result.jobsFound += fetchResult.jobs.length;

      for (const job of fetchResult.jobs) {
        // Upsert job (dedup by upwork_job_id)
        const { data: existing, error: upsertError } = await supabase
          .from("jobs")
          .upsert(toJobInsert(job), {
            onConflict: "upwork_job_id",
            ignoreDuplicates: false,
          })
          .select("id")
          .single();

        if (upsertError || !existing) {
          continue;
        }

        result.newJobs++;

        // Store job_scores entry (marks as belonging to this user)
        await supabase.from("job_scores").upsert(
          {
            job_id: existing.id,
            user_id: session.user_id,
            match_score: null,
            opportunity_score: null,
          },
          { onConflict: "job_id, user_id", ignoreDuplicates: true }
        );

        // AI Analysis via GroqCloud (server-side)
        try {
          const analysis = await analyzeJobOnServer(supabase, job, existing.id, session.user_id);
          result.analyzed++;

          // Fire notifications for high-scoring jobs
          if (analysis && (analysis.match_score >= 50 || analysis.opportunity_score >= 50)) {
            try {
              const { notifyUser } = await import("@/lib/notifications");
              await notifyUser(session.user_id, {
                jobId: existing.id,
                upworkJobId: job.upwork_job_id,
                title: job.title || "Untitled",
                url: job.url || "",
                budget: job.budget ? `$${job.budget}` : undefined,
                country: job.client_country || undefined,
                skills: job.skills || [],
                matchScore: analysis.match_score,
                opportunityScore: analysis.opportunity_score,
                winProbability: analysis.win_probability,
                recommendation: analysis.recommendation,
                proposalTips: analysis.proposal_tips,
              });
            } catch (notifErr: any) {
              console.warn(`[Cron] Notification failed for ${job.upwork_job_id}:`, notifErr.message);
            }
          }
        } catch (aiErr: any) {
          console.warn(`[Cron] AI analysis failed for ${job.upwork_job_id}:`, aiErr.message);
        }
      }
    } catch (fetchErr: any) {
      // If auth expired, skip remaining filters for this user
      if (fetchErr.message?.includes("UPWORK_AUTH_EXPIRED")) {
        result.error = `Cookies expired for user ${session.user_id.slice(0, 8)} — needs browser refresh`;
        break; // Stop processing more filters for this user
      }
      console.warn(`[Cron] Fetch error for filter "${filter.name}":`, fetchErr.message);
    }
  }

  return result;
}

/**
 * Analyze a job on the server using GroqCloud.
 * Falls back to keyword analysis if no Groq key is configured.
 */
async function analyzeJobOnServer(
  supabase: any,
  job: any,
  dbJobId: string,
  userId: string
) {
  const groqApiKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || "llama-3.1-70b-versatile";

  let analysisData: Record<string, any>;

  if (groqApiKey) {
    // Use GroqCloud for AI analysis
    analysisData = await serverSideGroqAnalysis(job, groqApiKey, groqModel);
  } else {
    // Keyword fallback
    analysisData = serverSideKeywordFallback(job);
  }

  const { error: analysisError } = await supabase.from("job_analyses").upsert(
    {
      job_id: dbJobId,
      user_id: userId,
      match_score: analysisData.match_score,
      opportunity_score: analysisData.opportunity_score,
      win_probability: analysisData.win_probability,
      skills_match: analysisData.skills_match || {},
      budget_fit: analysisData.budget_fit || {},
      client_analysis: analysisData.client_analysis || {},
      competition_analysis: analysisData.competition_analysis || {},
      recommendation: analysisData.recommendation || "consider",
      reasoning: analysisData.reasoning || "",
      proposal_tips: analysisData.proposal_tips || [],
      red_flags: analysisData.red_flags || [],
      model_used: groqApiKey ? groqModel : "keyword-fallback",
    },
    { onConflict: "job_id, user_id", ignoreDuplicates: false }
  );

  if (analysisError) {
    console.warn("[Cron] Analysis insert error:", analysisError.message);
  }

  return analysisData;
}

/**
 * Server-side GroqCloud analysis.
 */
async function serverSideGroqAnalysis(
  job: any,
  apiKey: string,
  model: string
): Promise<Record<string, any>> {
  const title = job.title || "";
  const description = (job.description || "").slice(0, 3000);
  const skills = (job.skills || []).join(", ");

  const prompt = `Analyze this Upwork job for a developer:
Title: ${title}
Description: ${description}
Skills: ${skills}
Budget: ${job.budget ? `$${job.budget}` : job.hourly_min ? `$${job.hourly_min}-$${job.hourly_max}/hr` : "Unknown"}

Return JSON only:
{
  "match_score": <0-100>,
  "opportunity_score": <0-100>,
  "win_probability": <0-100>,
  "skills_match": { "matched_skills": [strings], "missing_skills": [strings], "overall_fit": "Good"|"Moderate"|"Weak" },
  "budget_fit": { "type": "hourly"|"fixed"|"unknown", "assessment": "string" },
  "client_analysis": { "country": "Unknown", "payment_risk": "low"|"medium"|"high", "recommendation": "string" },
  "competition_analysis": { "competition_level": "low"|"medium"|"high", "advice": "string" },
  "recommendation": "strong_apply"|"apply"|"consider"|"skip"|"hide",
  "reasoning": "string",
  "proposal_tips": [strings],
  "red_flags": [strings]
}`;

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
          content: "You are an expert Upwork job analyst. Return only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`GroqCloud returned ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty GroqCloud response");

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON from GroqCloud");
  }
}

/**
 * Server-side keyword fallback (when no GroqCloud key).
 */
function serverSideKeywordFallback(job: any): Record<string, any> {
  const title = (job.title || "").toLowerCase();
  const desc = (job.description || "").toLowerCase();
  const combined = title + " " + desc;
  const jobSkills = (job.skills || []).map((s: string) => s.toLowerCase());

  const matchedSkills = jobSkills.filter((s: string) => combined.includes(s));

  const matchScore =
    jobSkills.length > 0
      ? Math.round((matchedSkills.length / jobSkills.length) * 100)
      : 50;

  return {
    match_score: matchScore,
    opportunity_score: 60,
    win_probability: Math.round((matchScore + 60) / 2),
    skills_match: {
      matched_skills: matchedSkills,
      missing_skills: jobSkills.filter((s: string) => !combined.includes(s)),
      overall_fit: matchScore >= 70 ? "Good" : matchScore >= 40 ? "Moderate" : "Weak",
    },
    budget_fit: {
      type: job.hourly_min ? "hourly" : job.budget ? "fixed" : "unknown",
      assessment: "Set up GROQ_API_KEY env var for detailed analysis",
    },
    client_analysis: {
      country: job.client_country || "Unknown",
      payment_risk: "unknown",
      recommendation: "Verify client on Upwork",
    },
    competition_analysis: {
      competition_level: "unknown",
      advice: "Configure GroqCloud keys for detailed competition analysis",
    },
    recommendation: matchScore >= 70 ? "apply" : matchScore >= 40 ? "consider" : "skip",
    reasoning: `Keyword match: ${matchedSkills.length}/${jobSkills.length} skills found`,
    proposal_tips: ["Review job details on Upwork for tailored proposal"],
    red_flags: [],
  };
}
