import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const expectedSecret = process.env.CRON_SECRET;
  if (
    !expectedSecret ||
    !authHeader.startsWith("Bearer ") ||
    !timingSafeEqual(authHeader.slice(7), expectedSecret)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();

    // Step 1: Pull recently-synced jobs from DB (VPS MCP sync writes them).
    await new Promise((r) => setTimeout(r, 0));
    const sinceCutoff = new Date(Date.now() - 25 * 60 * 1000).toISOString();
    const { data: recentJobs, error } = await supabase
      .from("jobs")
      .select("id, upwork_job_id, title, description, skills, budget, hourly_min, hourly_max, job_type, client_country, client_location_country, client_total_spend, proposals_count, category, subcategory, client_payment_verified, payment_verified, client_rating, client_score, client_total_hires, client_total_jobs_with_hires, client_active_assignments, client_hire_rate")
      .gte("created_at", sinceCutoff)
      .limit(100);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }

    const jobs = (recentJobs || []) as any[];
    jobs.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Step 2: Invalidate cache
    try {
      const { cacheInvalidate } = await import("@/lib/cache");
      await cacheInvalidate("jobs:");
      await cacheInvalidate("system:");
    } catch (e: any) {
      console.warn("[Cron] Cache invalidate error:", e?.message);
    }

    // Step 3: Static pre-filter → only promising jobs go to AI (per user)
    const { staticScore } = await import("@/lib/jobs/static-score");

    const { data: allFilters } = await supabase
      .from("job_filters")
      .select("*")
      .eq("is_active", true);
    const filters = (allFilters || []) as any[];
    if (filters.length === 0) {
      return NextResponse.json({
        ok: true,
        reason: "no-active-filters",
        jobs: jobs.length,
        timestamp: new Date().toISOString(),
      });
    }

    const { data: ruleUsers } = await supabase
      .from("notification_rules")
      .select("user_id")
      .eq("is_active", true);

    const userIdSet = new Set<string>();
    for (const f of filters) userIdSet.add(f.user_id);
    for (const r of ruleUsers || []) userIdSet.add(r.user_id);
    const userIds = [...userIdSet];
    if (userIds.length === 0) {
      return NextResponse.json({
        ok: true,
        reason: "no-users",
        jobs: jobs.length,
        timestamp: new Date().toISOString(),
      });
    }

    const jobIds = jobs.map((j) => j.id);
    const { data: analyzedRows } = await supabase
      .from("job_analyses")
      .select("job_id, user_id")
      .in("job_id", jobIds)
      .in("user_id", userIds);

    const analyzedSet = new Set(
      (analyzedRows || []).map((a: any) => `${a.job_id}:${a.user_id}`)
    );

    const toAnalyze: { job: any; jobId: string; userId: string }[] = [];
    for (const job of jobs) {
      for (const userId of userIds) {
        if (analyzedSet.has(`${job.id}:${userId}`)) continue;
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
          toAnalyze.push({ job, jobId: job.id, userId });
        }
      }
    }

    // Step 4: Analyze in-process (fire-and-forget style is NOT used — awaited
    // with a bounded concurrency pool so Vercel doesn't kill the lambda).
    const { analyzeJob } = await import("@/lib/jobs/analyze");
    const results = { analyzed: 0, failed: 0, notified: 0 };

    await new Promise<void>((resolve) => {
      let idx = 0;
      const worker = async () => {
        while (idx < toAnalyze.length) {
          const item = toAnalyze[idx++];
          try {
            const analysis = await analyzeJob(
              supabase,
              item.job,
              item.jobId,
              item.userId
            );
            results.analyzed++;

            const skillsFit =
              (analysis?.skills_match as any)?.overall_fit;

            if (
              skillsFit !== "Weak" &&
              ((typeof analysis?.match_score === "number" && analysis.match_score >= 50) ||
                (typeof analysis?.opportunity_score === "number" && analysis.opportunity_score >= 50))
            ) {
              try {
                const { data: job } = await supabase
                  .from("jobs")
                  .select("*")
                  .eq("id", item.jobId)
                  .single();
                if (job) {
                  const { data: activeFilters } = await supabase
                    .from("job_filters")
                    .select("*")
                    .eq("user_id", item.userId)
                    .eq("is_active", true);
                  const f = (activeFilters || []) as any[];
                  if (f.length > 0) {
                    const { findMatchingFilters } = await import("@/lib/filters/match");
                    const matchedFilters = findMatchingFilters(job, f);
                    if (matchedFilters.length > 0) {
                      const { notifyUser } = await import("@/lib/notifications");
                      await notifyUser(item.userId, {
                        jobId: item.jobId,
                        upworkJobId: job.upwork_job_id || "",
                        title: job.title || "",
                        url: job.url || "",
                        budget: job.budget
                          ? `$${job.budget}`
                          : job.hourly_min
                            ? `$${job.hourly_min}-$${job.hourly_max}/hr`
                            : undefined,
                        country: job.client_country || job.client_location_country || "",
                        skills: Array.isArray(job.skills) ? job.skills : [],
                        proposalsCount: typeof job.proposals_count === "number" ? job.proposals_count : undefined,
                        matchScore: analysis.match_score,
                        opportunityScore: analysis.opportunity_score,
                        winProbability: analysis.win_probability,
                        recommendation: analysis.recommendation,
                        proposalTips: Array.isArray(analysis.proposal_tips) ? analysis.proposal_tips : [],
                        matchedFilterIds: matchedFilters.map((m: any) => m.id),
                      });
                      results.notified++;
                    }
                  }
                }
              } catch (e: any) {
                console.warn("[Cron] Notify error:", e?.message);
              }
            }
          } catch (e: any) {
            console.warn("[Cron] Analysis failed for", item.jobId, e?.message);
            results.failed++;
          }
        }
      };

      const workers = Array.from(
        { length: Math.min(5, toAnalyze.length) },
        () => worker()
      );
      Promise.all(workers).then(() => resolve());
    });

    return NextResponse.json({
      ok: true,
      scanned: jobs.length,
      users: userIds.length,
      passed: toAnalyze.length,
      analyzed: results.analyzed,
      failed: results.failed,
      notified: results.notified,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Cron] Fatal error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}