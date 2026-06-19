import { NextResponse } from "next/server";
import { authenticateRequest } from "@/app/api/extension/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/extension/heartbeat
 * Health check endpoint — validates the token and returns server + filter status.
 *
 * Headers: Authorization: Bearer <token>
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const userId = auth.user_id as string;

  // Also return filter count for diagnostics
  let filterCount = 0;
  try {
    const supabase = await createSupabaseAdminClient();
    const { count } = await supabase
      .from("job_filters")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true);
    filterCount = count ?? 0;
  } catch {
    // Non-critical — don't fail the heartbeat
  }

  return NextResponse.json({
    ok: true,
    user_id: userId,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    filter_count: filterCount,
  });
}
