import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import {
  mapVibeworkerJobsToInserts,
  type VibeworkerResponse,
} from "@/lib/jobs/vibeworker";

export const dynamic = "force-dynamic";

interface VibeworkerPayload extends VibeworkerResponse {
  scores?: {
    upwork_job_id: string;
    user_id: string;
    score: number;
    filter_id: string;
  }[];
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: VibeworkerPayload;
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
    let skipped = 0;

    for (const insert of inserts) {
      const { data: existing } = await supabase
        .from("jobs")
        .select("id")
        .eq("upwork_job_id", insert.upwork_job_id)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("jobs")
        .insert(insert as any)
        .select("id, upwork_job_id")
        .single();

      if (insertError) {
        if (insertError.code !== "23505") {
          console.warn(
            "[Vibeworker] Insert error:",
            insert.upwork_job_id,
            insertError.message
          );
        }
        skipped++;
        continue;
      }
      if (inserted) {
        newJobIds.push(inserted.id);
      }
    }

    const scores = payload.scores || [];
    let scoreCount = 0;
    const scoreInserts: { job_id: string; user_id: string; match_score: number; opportunity_score: number; win_probability: number; recommendation: string }[] = [];

    if (scores.length > 0) {
      const upworkIdToDbId = new Map<string, string>();
      const upworkIds = [...new Set(scores.map((s) => s.upwork_job_id))];

      if (upworkIds.length > 0) {
        const { data: dbJobs } = await supabase
          .from("jobs")
          .select("id, upwork_job_id")
          .in("upwork_job_id", upworkIds);

        for (const row of dbJobs || []) {
          upworkIdToDbId.set(row.upwork_job_id, row.id);
        }
      }

      for (const s of scores) {
        const dbId = upworkIdToDbId.get(s.upwork_job_id);
        if (!dbId) continue;
        scoreInserts.push({
          job_id: dbId,
          user_id: s.user_id,
          match_score: s.score,
          opportunity_score: 0,
          win_probability: 0,
          recommendation: `Static match (${s.score}/100) via filter ${s.filter_id}`,
        });
      }

      if (scoreInserts.length > 0) {
        const { error: scoreErr } = await supabase
          .from("job_scores")
          .upsert(scoreInserts, {
            onConflict: "job_id, user_id",
            ignoreDuplicates: false,
          });
        if (scoreErr) {
          console.warn("[Vibeworker] Score upsert error:", scoreErr.message);
        } else {
          scoreCount = scoreInserts.length;
        }
      }
    }

    console.log(
      `[Vibeworker] ${newJobIds.length} new, ${skipped} skipped, ${scoreCount} scored out of ${inserts.length} received`
    );

    const analyzeEvents = (scoreInserts || [])
      .map((s: any) => ({
        name: "app/jobs.analyze" as const,
        data: { jobId: s.job_id, userId: s.user_id },
      }));

    if (analyzeEvents.length > 0) {
      try {
        for (let i = 0; i < analyzeEvents.length; i += 50) {
          await inngest.send(analyzeEvents.slice(i, i + 50));
        }
        console.log(`[Vibeworker] Sent ${analyzeEvents.length} analysis events to Inngest`);
      } catch (e: any) {
        console.warn("[Vibeworker] Failed to send Inngest events:", e.message);
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      received: payload.jobs.length,
      newJobs: newJobIds.length,
      skipped,
      scored: scoreCount,
      analyzeQueued: analyzeEvents.length,
    });
  } catch (err: any) {
    console.error("[Vibeworker] Fatal error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
