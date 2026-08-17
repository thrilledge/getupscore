/**
 * Inngest background functions.
 *
 * Architecture:
 *   1. process-cron-jobs  — fetches new jobs, upserts, fans out analysis events
 *   2. analyze-job        — AI-analyzes a single job for a single user
 *   3. process-extension  — handles extension-synced jobs (analyze + notify)
 */

import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// ─── 1. Process Cron Jobs ─────────────────────────────────

export const processCronJobs = inngest.createFunction(
  {
    id: "process-cron-jobs",
    retries: 2,
    concurrency: { limit: 1 },
    triggers: [{ event: "app/cron.trigger" }],
  },
  async ({ event, step }) => {
    // Step 1: Fetch + upsert jobs
    const { newJobIds, totalFetched } = await step.run("fetch-and-upsert", async () => {
      const { fetchJobs, toJobInserts } = await import("@/lib/jobs/fetcher");
      const supabase = createSupabaseAdminClient();

      const fetchResult = await fetchJobs();
      if (!fetchResult.success) {
        throw new NonRetriableError(`Fetch failed: ${fetchResult.error}`);
      }

      const rawJobs = fetchResult.jobs;
      if (rawJobs.length === 0) {
        return { newJobIds: [], totalFetched: 0 };
      }

      const inserts = toJobInserts(rawJobs);
      const jobsJsonb = inserts.map((j: any) => ({
        ...j,
        skills: Array.isArray(j.skills) ? j.skills : null,
        client_recent_history: j.client_recent_history || null,
      }));

      const { data, error } = await supabase.rpc("bulk_upsert_jobs" as any, {
        p_jobs: jobsJsonb,
      } as any);

      if (error) {
        const newIds: string[] = [];
        for (const insert of inserts) {
          const { data: inserted, error: insErr } = await supabase
            .from("jobs")
            .upsert(insert as any, {
              onConflict: "upwork_job_id",
              ignoreDuplicates: false,
            })
            .select("id")
            .single();
          if (!insErr && inserted) newIds.push(inserted.id);
        }
        return { newJobIds: newIds, totalFetched: rawJobs.length };
      }

      const result = data as any;
      return {
        newJobIds: result?.new_ids || [],
        totalFetched: rawJobs.length,
      };
    });

    // Step 2: Invalidate cache
    await step.run("invalidate-cache", async () => {
      const { cacheInvalidate } = await import("@/lib/cache");
      await cacheInvalidate("jobs:");
      await cacheInvalidate("system:");
    });

    // Step 3: Fan out analysis events for each new job × each user
    if (newJobIds.length > 0) {
      await step.run("fan-out-analysis", async () => {
        const supabase = createSupabaseAdminClient();

        const { data: activeFilters } = await supabase
          .from("job_filters")
          .select("user_id")
          .eq("is_active", true);

        const { data: ruleUsers } = await supabase
          .from("notification_rules")
          .select("user_id")
          .eq("is_active", true);

        const userIdSet = new Set<string>();
        for (const f of activeFilters || []) userIdSet.add(f.user_id);
        for (const r of ruleUsers || []) userIdSet.add(r.user_id);

        const userIds = [...userIdSet];
        if (userIds.length === 0) return;

        const jobIds = newJobIds.slice(0, 100);
        const events = [];
        for (const jobId of jobIds) {
          for (const userId of userIds) {
            events.push({
              name: "app/jobs.analyze" as const,
              data: { jobId, userId },
            });
          }
        }

        for (let i = 0; i < events.length; i += 50) {
          await inngest.send(events.slice(i, i + 50));
        }
      });
    }

    return {
      ok: true,
      totalFetched,
      newJobs: newJobIds.length,
    };
  }
);

// ─── 2. Analyze Job ───────────────────────────────────────

export const analyzeJobFunction = inngest.createFunction(
  {
    id: "analyze-job",
    retries: 3,
    concurrency: { limit: 10 },
    triggers: [{ event: "app/jobs.analyze" }],
  },
  async ({ event, step }) => {
    const { jobId, userId } = event.data;
    if (!jobId || !userId) throw new NonRetriableError("Missing jobId or userId");

    // Step 1: Fetch job record + run AI analysis
    const analysis = await step.run("ai-analysis", async () => {
      const supabase = createSupabaseAdminClient();

      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobErr || !job) throw new NonRetriableError(`Job ${jobId} not found`);

      const { analyzeJob } = await import("@/lib/jobs/analyze");
      return analyzeJob(supabase, job, jobId, userId);
    });

    // Step 2: Check filters + send notification
    await step.run("filter-and-notify", async () => {
      if (
        (typeof analysis?.match_score === "number" && analysis.match_score >= 50) ||
        (typeof analysis?.opportunity_score === "number" && analysis.opportunity_score >= 50)
      ) {
        const supabase = createSupabaseAdminClient();

        const { data: job } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", jobId)
          .single();

        if (!job) return;

        const { data: activeFilters } = await supabase
          .from("job_filters")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true);

        const filters = (activeFilters || []) as any[];
        const { findMatchingFilters } = await import("@/lib/filters/match");
        const matchedFilters = findMatchingFilters(job, filters);

        if (matchedFilters.length === 0) return;

        const { notifyUser } = await import("@/lib/notifications");
        await notifyUser(userId, {
          jobId,
          upworkJobId: job.upwork_job_id || "",
          title: job.title || "",
          url: job.url || "",
          budget: job.budget ? `$${job.budget}` : job.hourly_min ? `$${job.hourly_min}-$${job.hourly_max}/hr` : undefined,
          country: job.client_country || job.client_location_country || "",
          skills: Array.isArray(job.skills) ? job.skills : [],
          proposalsCount: typeof job.proposals_count === "number" ? job.proposals_count : undefined,
          matchScore: analysis.match_score,
          opportunityScore: analysis.opportunity_score,
          winProbability: analysis.win_probability,
          recommendation: analysis.recommendation,
          proposalTips: Array.isArray(analysis.proposal_tips) ? analysis.proposal_tips : [],
          matchedFilterIds: matchedFilters.map((f: any) => f.id),
        });
      }
    });

    return { ok: true, jobId, userId };
  }
);

// ─── 3. Process Extension Sync ────────────────────────────

export const processExtensionSync = inngest.createFunction(
  {
    id: "process-extension-sync",
    retries: 2,
    concurrency: { limit: 5 },
    triggers: [{ event: "app/extension.sync" }],
  },
  async ({ event, step }) => {
    const { userId, jobs } = event.data;
    if (!userId || !Array.isArray(jobs) || jobs.length === 0) {
      throw new NonRetriableError("Missing userId or jobs");
    }

    for (const jobData of jobs) {
      await step.run(`process-job-${jobData.upwork_job_id}`, async () => {
        const supabase = createSupabaseAdminClient();

        const { data: jobRow, error: jobErr } = await supabase
          .from("jobs")
          .upsert(jobData.jobRecord, {
            onConflict: "upwork_job_id",
            ignoreDuplicates: false,
          })
          .select("id")
          .single();

        if (jobErr || !jobRow) return { ok: false, error: jobErr?.message };
        const dbJobId = jobRow.id;

        let analysis: Record<string, any> | null = null;

        if (jobData.analysis && typeof jobData.analysis === "object") {
          const a = jobData.analysis;
          await supabase.from("job_analyses").upsert(
            {
              job_id: dbJobId,
              user_id: userId,
              analysis_version: 1,
              model_used: "groqcloud",
              match_score: typeof a.match_score === "number" ? Math.max(0, Math.min(100, Math.round(a.match_score))) : undefined,
              opportunity_score: typeof a.opportunity_score === "number" ? Math.max(0, Math.min(100, Math.round(a.opportunity_score))) : undefined,
              win_probability: typeof a.win_probability === "number" ? Math.max(0, Math.min(100, Math.round(a.win_probability))) : undefined,
              skills_match: a.skills_match || undefined,
              budget_fit: a.budget_fit || undefined,
              client_analysis: a.client_analysis || undefined,
              competition_analysis: a.competition_analysis || undefined,
              recommendation: a.recommendation || undefined,
              reasoning: a.reasoning || undefined,
              proposal_tips: Array.isArray(a.proposal_tips) ? a.proposal_tips.slice(0, 10) : undefined,
              red_flags: Array.isArray(a.red_flags) ? a.red_flags.slice(0, 10) : undefined,
            },
            { onConflict: "job_id, user_id", ignoreDuplicates: false }
          );
          analysis = a;
        } else {
          const { analyzeJob } = await import("@/lib/jobs/analyze");
          analysis = await analyzeJob(supabase, jobData.jobRecord, dbJobId, userId);
        }

        await supabase.from("job_scores").upsert(
          {
            job_id: dbJobId,
            user_id: userId,
            match_score: analysis?.match_score ?? null,
            opportunity_score: analysis?.opportunity_score ?? null,
          },
          { onConflict: "job_id, user_id", ignoreDuplicates: true }
        );

        if (
          (typeof analysis?.match_score === "number" && analysis.match_score >= 50) ||
          (typeof analysis?.opportunity_score === "number" && analysis.opportunity_score >= 50)
        ) {
          const { data: activeFilters } = await supabase
            .from("job_filters")
            .select("*")
            .eq("user_id", userId)
            .eq("is_active", true);

          const filters = (activeFilters || []) as any[];
          const { findMatchingFilters } = await import("@/lib/filters/match");
          const matchedFilters = findMatchingFilters(jobData.jobRecord, filters);

          if (matchedFilters.length > 0) {
            const { notifyUser } = await import("@/lib/notifications");
            await notifyUser(userId, {
              jobId: dbJobId,
              upworkJobId: jobData.upworkJobId || "",
              title: jobData.title || "",
              url: jobData.url || "",
              budget: jobData.budget,
              country: jobData.country || "",
              skills: Array.isArray(jobData.skills) ? jobData.skills : [],
              proposalsCount: jobData.proposalsCount,
              matchScore: analysis?.match_score,
              opportunityScore: analysis?.opportunity_score,
              winProbability: analysis?.win_probability,
              recommendation: analysis?.recommendation,
              proposalTips: Array.isArray(analysis?.proposal_tips) ? analysis.proposal_tips : [],
              matchedFilterIds: matchedFilters.map((f: any) => f.id),
            });
          }
        }

        return { ok: true, dbJobId };
      });
    }

    return { ok: true, processed: jobs.length };
  }
);
