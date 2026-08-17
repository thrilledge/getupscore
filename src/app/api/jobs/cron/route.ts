import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { fetchJobs, toJobInserts } from "@/lib/jobs/fetcher";
import { analyzeJob } from "@/lib/jobs/analyze";
import { cacheInvalidate } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();

    // ── Fetch new jobs ───────────────────────────────────────────────
    const fetchResult = await fetchJobs();
    if (!fetchResult.success) {
      console.error("[Cron] UpAlerts fetch failed:", fetchResult.error);
      return NextResponse.json({ error: fetchResult.error || "Fetch failed" }, { status: 502 });
    }

    const rawJobs = fetchResult.jobs;
    if (rawJobs.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No jobs returned from UpAlerts",
        totalFetched: 0,
        totalNew: 0,
      });
    }

    const inserts = toJobInserts(rawJobs);

    // ── Bulk upsert: single RPC replaces N+1 insert loop ────────────
    // Build JSONB array for the RPC
    const jobsJsonb = inserts.map((j) => ({
      ...j,
      skills: Array.isArray(j.skills) ? j.skills : null,
      client_recent_history: (j as any).client_recent_history || null,
    }));

    const { data: upsertResult, error: upsertError } = await supabase.rpc(
      "bulk_upsert_jobs" as any,
      { p_jobs: jobsJsonb } as any
    );

    if (upsertError) {
      console.error("[Cron] Bulk upsert error:", upsertError.message);
      // Fallback to individual inserts if RPC fails
      const newJobIds: string[] = [];
      for (const insert of inserts) {
        const { data: inserted, error: insertError } = await supabase
          .from("jobs")
          .upsert(insert as any, {
            onConflict: "upwork_job_id",
            ignoreDuplicates: false,
          })
          .select("id")
          .single();

        if (insertError) {
          if (insertError.code !== "23505") {
            console.warn("[Cron] Insert error for", insert.upwork_job_id, ":", insertError.message);
          }
          continue;
        }
        if (inserted) newJobIds.push(inserted.id);
      }

      return processAnalysis(supabase, newJobIds, rawJobs.length);
    }

    // The RPC returns new_ids for freshly inserted rows (not updated ones)
    const result = upsertResult as any;
    const newJobIds: string[] = result?.new_ids || [];
    const totalUpserted = result?.count || 0;

    console.log(`[Cron] Upserted ${totalUpserted} jobs (${newJobIds.length} new) out of ${rawJobs.length} fetched`);

    // Invalidate jobs cache
    cacheInvalidate("jobs:");
    cacheInvalidate("system:");

    return processAnalysis(supabase, newJobIds, rawJobs.length);
  } catch (err: any) {
    console.error("[Cron] Fatal error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function processAnalysis(supabase: any, newJobIds: string[], totalFetched: number) {
  if (newJobIds.length === 0) {
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      totalFetched,
      totalNew: 0,
    });
  }

  // ── Run AI analysis for all active users ─────────────────────────
  const { data: activeFilters } = await supabase
    .from("job_filters")
    .select("*")
    .eq("is_active", true);

  const filtersByUser = new Map<string, any[]>();
  for (const f of activeFilters || []) {
    const list = filtersByUser.get(f.user_id) || [];
    list.push(f);
    filtersByUser.set(f.user_id, list);
  }

  const { data: ruleUsers } = await supabase
    .from("notification_rules")
    .select("user_id")
    .eq("is_active", true);

  const userIdSet = new Set<string>(filtersByUser.keys());
  for (const r of ruleUsers || []) userIdSet.add(r.user_id);
  const userIds = [...userIdSet];

  if (userIds.length > 0) {
    const { data: fullJobs } = await supabase
      .from("jobs")
      .select("*")
      .in("id", newJobIds);

    const jobMap = new Map((fullJobs || []).map((j: any) => [j.id, j]));
    const jobIdsForRun = newJobIds.slice(0, 100);
    const truncated = newJobIds.length > jobIdsForRun.length;

    const { mapLimit } = await import("@/lib/pool");
    for (const userId of userIds) {
      const userFilters = filtersByUser.get(userId) || [];
      await mapLimit(jobIdsForRun, 4, async (jobId) => {
        const jobRecord: Record<string, any> = jobMap.get(jobId) || {};
        try {
          const analysis = await analyzeJob(supabase, jobRecord, jobId, userId);

          const { findMatchingFilters } = await import("@/lib/filters/match");
          const matchedFilters = findMatchingFilters(jobRecord, userFilters);
          if (matchedFilters.length === 0) return;

          if (
            typeof analysis?.match_score === "number" && analysis.match_score >= 50 ||
            typeof analysis?.opportunity_score === "number" && analysis.opportunity_score >= 50
          ) {
            try {
              const { notifyUser } = await import("@/lib/notifications");
              await notifyUser(userId, {
                jobId,
                upworkJobId: jobRecord.upwork_job_id || "",
                title: jobRecord.title || "",
                url: jobRecord.url || "",
                budget: jobRecord.budget ? `$${jobRecord.budget}` : jobRecord.hourly_min ? `$${jobRecord.hourly_min}-$${jobRecord.hourly_max}/hr` : undefined,
                country: jobRecord.client_country || jobRecord.client_location_country || "",
                skills: Array.isArray(jobRecord.skills) ? jobRecord.skills : [],
                proposalsCount: typeof jobRecord.proposals_count === "number" ? jobRecord.proposals_count : undefined,
                matchScore: analysis.match_score,
                opportunityScore: analysis.opportunity_score,
                winProbability: analysis.win_probability,
                recommendation: analysis.recommendation,
                proposalTips: Array.isArray(analysis.proposal_tips) ? analysis.proposal_tips : [],
                matchedFilterIds: matchedFilters.map((f: any) => f.id),
              });
            } catch (notifErr: any) {
              console.warn(`[Cron] Notification error for job ${jobId}, user ${userId}:`, notifErr.message);
            }
          }
        } catch (err: any) {
          console.warn(`[Cron] Analysis error for job ${jobId}, user ${userId}:`, err.message);
        }
      });
    }

    console.log(`[Cron] Analyzed ${jobIdsForRun.length} jobs for ${userIds.length} users${truncated ? ` (${newJobIds.length - jobIdsForRun.length} deferred)` : ""}`);
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    totalFetched: totalFetched,
    totalNew: newJobIds.length,
  });
}
