import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RETENTION_DAYS = 30;
const BATCH_SIZE = 500;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();

    let deleted = 0;
    let remaining = -1;
    let rounds = 0;
    const maxRounds = 20;

    do {
      const { data, error } = await supabase.rpc("cleanup_old_jobs", {
        p_days: RETENTION_DAYS,
        p_batch: BATCH_SIZE,
      });

      if (error) {
        console.error("[CleanupCron] RPC error:", error);
        return NextResponse.json(
          { error: error.message || "cleanup_old_jobs failed" },
          { status: 500 }
        );
      }

      const result = (data ?? {}) as { deleted?: number; remaining?: number };
      deleted += result.deleted ?? 0;
      remaining = result.remaining ?? 0;
      rounds += 1;

      if (remaining === 0 || rounds >= maxRounds) break;
    } while (true);

    console.log(
      `[CleanupCron] retention=${RETENTION_DAYS}d deleted=${deleted} remaining=${remaining} rounds=${rounds}`
    );

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      retentionDays: RETENTION_DAYS,
      deleted,
      remaining,
      rounds,
    });
  } catch (err: any) {
    console.error("[CleanupCron] Fatal error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
