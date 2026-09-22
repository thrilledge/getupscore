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
    // Step 1: Pull recently-synced jobs from DB (VPS MCP sync writes them)
    // instead of fetching via scraper — the scraper providers are dead.
    const { newJobIds, jobs } = await step.run("fetch-ids-from-db", async () => {
      const supabase = createSupabaseAdminClient();

      const sinceCutoff = new Date(Date.now() - 25 * 60 * 1000).toISOString();
      const { data: recentJobs, error } = await supabase
        .from("jobs")
        .select("id, upwork_job_id, title, description, skills, budget, hourly_min, hourly_max, job_type, client_country, client_location_country, client_total_spend, proposals_count, category, subcategory, client_payment_verified, payment_verified, client_rating, client_score, client_total_hires, client_total_jobs_with_hires, client_active_assignments, client_hire_rate")
        .gte("created_at", sinceCutoff)
        .limit(100);

      if (error) {
        throw new NonRetriableError(`DB query failed: ${error.message}`);
      }

      // Only jobs that were newly INSERTED (created our side) vs. same-job re-upserts
      // use a second pass below.
      const rows = (recentJobs || []) as any[];
      // Newest jobs first — the queue is FIFO, so junk that slipped past the
      // static filter would otherwise starve fresh, matching jobs forever.
      rows.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return {
        newJobIds: rows.map((j) => j.id),
        jobs: rows,
      };
    });

    // Step 2: Invalidate cache
    await step.run("invalidate-cache", async () => {
      const { cacheInvalidate } = await import("@/lib/cache");
      await cacheInvalidate("jobs:");
      await cacheInvalidate("system:");
    });

    // Step 3: Static pre-filter → only promising jobs go to AI (per user)
    if (newJobIds.length > 0) {
      await step.run("static-prefilter-and-fanout", async () => {
        const supabase = createSupabaseAdminClient();
        const { staticScore } = await import("@/lib/jobs/static-score");

        const { data: allFilters } = await supabase
          .from("job_filters")
          .select("*")
          .eq("is_active", true);

        const filters = (allFilters || []) as any[];
        if (filters.length === 0) return;

        const { data: ruleUsers } = await supabase
          .from("notification_rules")
          .select("user_id")
          .eq("is_active", true);

        const userIdSet = new Set<string>();
        for (const f of filters) userIdSet.add(f.user_id);
        for (const r of ruleUsers || []) userIdSet.add(r.user_id);
        const userIds = [...userIdSet];
        if (userIds.length === 0) return;

        const events: { name: "app/jobs.analyze"; data: { jobId: string; userId: string } }[] = [];
        let passed = 0;
        let skipped = 0;
        let alreadyAnalyzed = 0;

        const { data: analyzedRows } = await supabase
          .from("job_analyses")
          .select("job_id, user_id")
          .in("job_id", newJobIds)
          .in("user_id", userIds);

        const analyzedSet = new Set((analyzedRows || []).map((a: any) => `${a.job_id}:${a.user_id}`));

        for (const job of jobs) {
          for (const userId of userIds) {
            if (analyzedSet.has(`${job.id}:${userId}`)) {
              alreadyAnalyzed++;
              continue;
            }
            const userFilters = filters.filter((f: any) => f.user_id === userId);
            const result = staticScore(
              {
                title: job.title,
                description: job.description,
                skills: job.skills || [],
                budget: job.budget,
                hourly_min: job.hourly_min,
                hourly_max: job.hourly_max,
                job_type: job.job_type,
                client_country: job.client_country,
                client_location_country: job.client_location_country,
                client_total_spend: job.client_total_spend,
                proposals_count: job.proposals_count,
                category: job.category,
                subcategory: job.subcategory,
              },
              userFilters
            );

            if (result.pass) {
              events.push({
                name: "app/jobs.analyze" as const,
                data: { jobId: job.id, userId },
              });
              passed++;
            } else {
              skipped++;
            }
          }
        }

        console.log(`[StaticFilter] ${passed} passed, ${skipped} skipped, ${alreadyAnalyzed} already analyzed out of ${jobs.length} jobs × ${userIds.length} users`);

        for (let i = 0; i < events.length; i += 50) {
          await inngest.send(events.slice(i, i + 50));
        }
      });
    }

    return {
      ok: true,
      newJobs: newJobIds.length,
    };
  }
);

// ─── 2. Analyze Job ───────────────────────────────────────

export const analyzeJobFunction = inngest.createFunction(
  {
    id: "analyze-job",
    retries: 3,
    concurrency: { limit: 5 },
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
        const { staticScore } = await import("@/lib/jobs/static-score");

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

        const { data: userFilters } = await supabase
          .from("job_filters")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true);

        const filters = (userFilters || []) as any[];
        const staticResult = staticScore(
          {
            title: jobData.jobRecord.title || null,
            description: jobData.jobRecord.description || null,
            skills: jobData.jobRecord.skills || [],
            budget: jobData.jobRecord.budget || null,
            hourly_min: jobData.jobRecord.hourly_min || null,
            hourly_max: jobData.jobRecord.hourly_max || null,
            job_type: jobData.jobRecord.job_type || null,
            client_country: jobData.jobRecord.client_country || null,
            client_location_country: jobData.jobRecord.client_location_country || null,
            client_total_spend: jobData.jobRecord.client_total_spend || null,
            proposals_count: jobData.jobRecord.proposals_count || null,
            category: jobData.jobRecord.category || null,
            subcategory: jobData.jobRecord.subcategory || null,
          },
          filters
        );

        if (!staticResult.pass && filters.length > 0) {
          return { ok: true, dbJobId, skipped: "static_filter" };
        }

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
