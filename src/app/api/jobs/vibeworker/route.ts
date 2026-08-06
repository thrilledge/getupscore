import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  mapVibeworkerJobsToInserts,
  type VibeworkerResponse,
} from "@/lib/jobs/vibeworker";
import { analyzeJob } from "@/lib/jobs/analyze";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: VibeworkerResponse;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload || !Array.isArray(payload.jobs)) {
    return NextResponse.json(
      { error: "Body must include a jobs array" },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseAdminClient();
    const inserts = mapVibeworkerJobsToInserts(payload.jobs);
    const newJobIds: string[] = [];

    for (const insert of inserts) {
      const { data: existing } = await supabase
        .from("jobs")
        .select("id")
        .eq("upwork_job_id", insert.upwork_job_id)
        .maybeSingle();

      if (!existing) {
        const { data: inserted, error: insertError } = await supabase
          .from("jobs")
          .insert(insert as any)
          .select("id")
          .single();

        if (insertError) {
          // 23505 = unique violation from a concurrent run inserting the same
          // job. That run handles analysis/notification — skip, don't drop.
          if (insertError.code !== "23505") {
            console.warn(
              "[Vibeworker] Insert error for",
              insert.upwork_job_id,
              ":",
              insertError.message
            );
          }
          continue;
        }
        if (inserted) {
          newJobIds.push(inserted.id);
        }
      }
    }

    console.log(
      `[Vibeworker] ${newJobIds.length} new jobs out of ${inserts.length} received`
    );

    // ── Run AI analysis for all active users ─────────────────────────
    if (newJobIds.length > 0) {
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

      // Include every user with an active filter OR an active notification
      // rule so analysis runs for all of them regardless of filters.
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

        // Bound the run: worst case is jobs × users LLM calls. A massive
        // burst is processed across subsequent runs — never let one run
        // blow the function timeout.
        const jobIdsForRun = newJobIds.slice(0, 100);
        const truncated = newJobIds.length > jobIdsForRun.length;

        const { mapLimit } = await import("@/lib/pool");
        for (const userId of userIds) {
          const userFilters = filtersByUser.get(userId) || [];
          await mapLimit(jobIdsForRun, 4, async (jobId) => {
            const jobRecord = jobMap.get(jobId) || {};
            try {
              // Analyze every new job for every active user. Filters only
              // gate notifications — never analysis.
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
                    budget: jobRecord.budget
                      ? `$${jobRecord.budget}`
                      : jobRecord.hourly_min
                        ? `$${jobRecord.hourly_min}-$${jobRecord.hourly_max}/hr`
                        : undefined,
                    country: jobRecord.client_country || jobRecord.client_location_country || "",
                    skills: Array.isArray(jobRecord.skills) ? jobRecord.skills : [],
                    proposalsCount: typeof jobRecord.proposals_count === "number" ? jobRecord.proposals_count : undefined,
                    matchScore: analysis.match_score,
                    opportunityScore: analysis.opportunity_score,
                    winProbability: analysis.win_probability,
                    recommendation: analysis.recommendation,
                    proposalTips: Array.isArray(analysis.proposal_tips)
                      ? analysis.proposal_tips
                      : [],
                    matchedFilterIds: matchedFilters.map((f: any) => f.id),
                  });
                } catch (notifErr: any) {
                  console.warn(
                    `[Vibeworker] Notification error for job ${jobId}, user ${userId}:`,
                    notifErr.message
                  );
                }
              }
            } catch (err: any) {
              console.warn(
                `[Vibeworker] Analysis error for job ${jobId}, user ${userId}:`,
                err.message
              );
            }
          });
        }

        console.log(
          `[Vibeworker] Analyzed ${jobIdsForRun.length} jobs for ${userIds.length} users${truncated ? ` (${newJobIds.length - jobIdsForRun.length} deferred)` : ""}`
        );
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      received: payload.jobs.length,
      newJobs: newJobIds.length,
    });
  } catch (err: any) {
    console.error("[Vibeworker] Fatal error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
