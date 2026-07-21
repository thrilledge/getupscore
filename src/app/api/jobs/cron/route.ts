import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { fetchJobs, toJobInserts } from "@/lib/jobs/fetcher";
import { analyzeJob } from "@/lib/jobs/analyze";

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

        if (!insertError && inserted) {
          newJobIds.push(inserted.id);
        }
      }
    }

    console.log(`[Cron] ${newJobIds.length} new jobs out of ${rawJobs.length} fetched`);

    // ── Run AI analysis for all active users ─────────────────────────
    if (newJobIds.length > 0) {
      const { data: activeUsers } = await supabase
        .from("job_filters")
        .select("user_id")
        .eq("is_active", true);

      const userIds = [...new Set(activeUsers?.map((f: any) => f.user_id) || [])] as string[];

      if (userIds.length > 0) {
        // Fetch full job records for enrichment
        const { data: fullJobs } = await supabase
          .from("jobs")
          .select("*")
          .in("id", newJobIds);

        const jobMap = new Map((fullJobs || []).map((j: any) => [j.id, j]));

        for (const userId of userIds) {
          for (const jobId of newJobIds) {
            const jobRecord = jobMap.get(jobId) || {};
            try {
              await analyzeJob(supabase, jobRecord, jobId, userId);
            } catch (err: any) {
              console.warn(`[Cron] Analysis error for job ${jobId}, user ${userId}:`, err.message);
            }
          }
        }

        console.log(`[Cron] Analyzed ${newJobIds.length} jobs for ${userIds.length} users`);
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      totalFetched: rawJobs.length,
      totalNew: newJobIds.length,
    });
  } catch (err: any) {
    console.error("[Cron] Fatal error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
