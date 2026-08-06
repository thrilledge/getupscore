import { NextResponse } from "next/server";
import { authenticateRequest } from "@/app/api/extension/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { analyzeJob } from "@/lib/jobs/analyze";

const MAX_JOBS_PER_REQUEST = 20; // Reduced to accommodate analysis data

/**
 * POST /api/extension/jobs/sync
 * Receive captured jobs (optionally with AI analysis) from the extension.
 *
 * Flow:
 *  1. Upsert job into shared `jobs` table (dedup by upwork_job_id)
 *  2. If job.analysis is provided, store/update it in `job_analyses`
 *  3. Create `job_scores` entry for the user
 *
 * Headers: Authorization: Bearer <token>
 *
 * Body:
 *   { jobs: Array<{ ...jobFields, analysis?: { match_score, ... } }> }
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const userId = auth.user_id as string;

  try {
    const body = await request.json();
    let { jobs } = body;

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    if (jobs.length > MAX_JOBS_PER_REQUEST) {
      jobs = jobs.slice(0, MAX_JOBS_PER_REQUEST);
    }

    const supabase = createSupabaseAdminClient();
    let syncedCount = 0;

    // Load the user's active filters once so notifications only fire for
    // jobs that actually match their saved criteria.
    const { data: activeFilters } = await supabase
      .from("job_filters")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);
    const filters = (activeFilters || []) as any[];

    for (const job of jobs) {
      const title = String(job.title || "Untitled").slice(0, 500);
      if (!title || title.length < 3) continue;

      // Generate upwork_job_id from URL or title hash
      const upworkJobId =
        String(job.job_id || "").trim() ||
        String(job.url || "")
          .match(/~([a-f0-9]{16,})/)?.[1] ||
        `ext_${simpleHash(title + (job.url || ""))}`;

      // Map fields to jobs table columns — rich data from DOM extraction
      const budgetVal = parseBudget(job.budget);
      let hourlyMin = null;
      let hourlyMax = null;
      if (job.budget && typeof job.budget === "string") {
        const hourlyMatch = job.budget.match(/\$(\d+)\s*[-–]\s*\$?(\d+)\s*\/hr/i);
        if (hourlyMatch) {
          hourlyMin = parseFloat(hourlyMatch[1]);
          hourlyMax = parseFloat(hourlyMatch[2]);
        }
      }

      const jobRecord: Record<string, unknown> = {
        upwork_job_id: upworkJobId,
        title,
        description: job.description ? String(job.description).slice(0, 10000) : null,
        url: String(job.url || "").slice(0, 1000),
        posted_at: job.posted_at
          ? (() => { try { return new Date(job.posted_at).toISOString(); } catch { return null; } })()
          : null,
        budget: budgetVal,
        hourly_min: hourlyMin,
        hourly_max: hourlyMax,
        client_country: String(job.client_country || "").slice(0, 100) || null,
        proposals_count: parseInt(job.proposals_count, 10) || null,
        // Rich fields from detailed DOM extraction
        skills: Array.isArray(job.skills) ? job.skills.slice(0, 50) : null,
        client_rating: parseFloat(job.client_rating) || null,
        client_name: String(job.client_name || "").slice(0, 200) || null,
        client_total_spend: parseFloat(job.client_total_spend) || null,
        client_spend: parseFloat(job.client_total_spend) || null,
        client_total_hires: parseInt(job.client_total_hires, 10) || null,
        client_hire_rate: parseInt(job.client_hire_rate_pct || job.client_hire_rate, 10) || null,
        client_total_assignments: parseInt(job.client_jobs_posted, 10) || null,
        client_member_since: job.client_member_since
          ? (() => { try { return new Date(job.client_member_since).toISOString(); } catch { return null; } })()
          : null,
        client_industry: String(job.company_industry || job.client_industry || "").slice(0, 200) || null,
        payment_verified: job.client_payment_verified === true || job.payment_verified === true,
        job_type: String(job.budget_type || job.job_type || "").slice(0, 50) || null,
        contractor_tier: String(job.experience_level || "").slice(0, 50) || null,
        total_invited: parseInt(job.invites_sent, 10) || null,
        total_hired: parseInt(job.interviewing_count, 10) || null,
        hours_per_week: String(job.hours_per_week || "").slice(0, 50) || null,
        category: String(job.category || "").slice(0, 200) || null,
        source: "extension_dom",
      };

      if (job.client_recent_history && Array.isArray(job.client_recent_history) && job.client_recent_history.length > 0) {
        jobRecord.client_recent_history = job.client_recent_history.slice(0, 20);
      }

      // Upsert into jobs table
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .upsert(jobRecord as any, {
          onConflict: "upwork_job_id",
          ignoreDuplicates: false,
        })
        .select("id")
        .single();

      if (jobError || !jobData) {
        console.warn("[Extension Jobs] Upsert error:", jobError?.message);
        continue;
      }

      const dbJobId = jobData.id;

      // Run server-side AI analysis using the rich DOM data
      try {
        await analyzeJob(supabase, jobRecord, dbJobId, userId);
      } catch (analyzeErr: any) {
        console.warn("[Extension Jobs] Analysis error:", analyzeErr.message);
      }

      // If AI analysis is provided, store it in job_analyses
      if (job.analysis && typeof job.analysis === "object") {
        const a = job.analysis;

        const { error: analysisError } = await supabase
          .from("job_analyses")
          .upsert({
            job_id: dbJobId,
            user_id: userId,
            analysis_version: 1,
            model_used: "groqcloud",
            match_score: typeof a.match_score === "number"
              ? Math.max(0, Math.min(100, Math.round(a.match_score)))
              : undefined,
            opportunity_score: typeof a.opportunity_score === "number"
              ? Math.max(0, Math.min(100, Math.round(a.opportunity_score)))
              : undefined,
            win_probability: typeof a.win_probability === "number"
              ? Math.max(0, Math.min(100, Math.round(a.win_probability)))
              : undefined,
            skills_match: a.skills_match || undefined,
            budget_fit: a.budget_fit || undefined,
            client_analysis: a.client_analysis || undefined,
            competition_analysis: a.competition_analysis || undefined,
            recommendation: a.recommendation || undefined,
            reasoning: a.reasoning || undefined,
            proposal_tips: Array.isArray(a.proposal_tips) ? a.proposal_tips.slice(0, 10) : undefined,
            red_flags: Array.isArray(a.red_flags) ? a.red_flags.slice(0, 10) : undefined,
          }, {
            onConflict: "job_id, user_id",
            ignoreDuplicates: false,
          });

        if (analysisError) {
          console.warn("[Extension Jobs] Analysis upsert error:", analysisError.message);
        } else if (
          typeof a.match_score === "number" && a.match_score >= 50 ||
          typeof a.opportunity_score === "number" && a.opportunity_score >= 50
        ) {
          // Only notify when the job matches at least one saved filter.
          try {
            const { findMatchingFilters } = await import("@/lib/filters/match");
            const matchedFilters = findMatchingFilters(jobRecord, filters);
            if (matchedFilters.length === 0) continue;

            const { notifyUser } = await import("@/lib/notifications");
            const skills = Array.isArray(job.skills) ? job.skills : [];
            await notifyUser(userId, {
              jobId: dbJobId,
              upworkJobId: upworkJobId,
              title: title,
              url: String(job.url || ""),
              budget: job.budget ? String(job.budget) : undefined,
              country: String(job.country || job.client_country || ""),
              skills,
              proposalsCount: parseInt(job.proposals_count, 10) || undefined,
              matchScore: a.match_score,
              opportunityScore: a.opportunity_score,
              winProbability: a.win_probability,
              recommendation: a.recommendation,
              proposalTips: Array.isArray(a.proposal_tips) ? a.proposal_tips : [],
              matchedFilterIds: matchedFilters.map((f) => f.id),
            });
          } catch (notifErr: any) {
            console.warn("[Extension Jobs] Notification error:", notifErr.message);
          }
        }
      }

      // Create/update job_scores entry for this user (marks as captured)
      const { error: scoreError } = await supabase.from("job_scores").upsert(
        {
          job_id: dbJobId,
          user_id: userId,
          match_score: job.analysis?.match_score ?? null,
          opportunity_score: job.analysis?.opportunity_score ?? null,
        },
        {
          onConflict: "job_id, user_id",
          ignoreDuplicates: true,
        }
      );

      if (scoreError) {
        console.warn("[Extension Jobs] Score insert error:", scoreError.message);
      }

      syncedCount++;
    }

    return NextResponse.json({ count: syncedCount });
  } catch (err) {
    console.error("[Extension Jobs] Error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/** Parse a budget string into a numeric value. */
function parseBudget(value: unknown): number | null {
  if (!value) return null;
  const str = String(value);
  const match = str.replace(/,/g, "").match(/\$?([\d.]+)/);
  return match ? parseFloat(match[1]) || null : null;
}

/** Simple hash for generating unique IDs from strings. */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).padStart(8, "0");
}
