import { NextResponse } from "next/server";
import { authenticateRequest } from "@/app/api/extension/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/extension/profile/sync
 * Receive the user's own Upwork freelancer profile from the extension.
 *
 * Headers: Authorization: Bearer <token>
 *
 * Body: { upwork_url, title, bio, skills[], hourly_rate, total_earnings,
 *         total_jobs_done, total_hours, member_since, client_rating }
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const userId = auth.user_id as string;

  try {
    const body = await request.json();
    const allowedFields = [
      "upwork_url", "title", "bio", "skills", "hourly_rate",
      "total_earnings", "total_jobs_done", "total_hours",
      "member_since", "client_rating", "portfolio",
    ];

    const profile: Record<string, unknown> = { user_id: userId };
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        profile[field] = body[field];
      }
    }

    const supabase = createSupabaseAdminClient();

    const { data: existing } = await supabase
      .from("upwork_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let result;
    if (existing) {
      result = await supabase
        .from("upwork_profiles")
        .update(profile as any)
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("upwork_profiles")
        .insert(profile as any)
        .select()
        .single();
    }

    if (result.error) {
      console.error("[Extension Profile] Upsert error:", result.error.message);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, profile: result.data });
  } catch (err) {
    console.error("[Extension Profile] Error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
