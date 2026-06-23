import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { fetchJobs, toJobInserts } from "@/lib/jobs/fetcher";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();

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
    let newCount = 0;

    for (const insert of inserts) {
      const { data: existing } = await supabase
        .from("jobs")
        .select("id")
        .eq("upwork_job_id", insert.upwork_job_id)
        .maybeSingle();

      if (!existing) {
        const { error: insertError } = await supabase
          .from("jobs")
          .insert(insert as any);

        if (!insertError) newCount++;
      }
    }

    console.log(`[Cron] ${newCount} new jobs out of ${rawJobs.length} fetched`);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      totalFetched: rawJobs.length,
      totalNew: newCount,
    });
  } catch (err: any) {
    console.error("[Cron] Fatal error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
