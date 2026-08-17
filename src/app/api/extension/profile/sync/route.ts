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
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    let result;
    let created = false;
    const changed: string[] = [];

    if (existing) {
      const merged: Record<string, unknown> = {};
      for (const field of Object.keys(profile)) {
        const next = profile[field];
        const prev = (existing as Record<string, unknown>)[field];
        // Skip overwriting a non-null existing value with null/empty
        if (next === null || next === undefined || next === "") {
          if (prev !== null && prev !== undefined && prev !== "") continue;
        }
        const same = JSON.stringify(next) === JSON.stringify(prev);
        if (!same) {
          merged[field] = next;
          changed.push(field);
        }
      }
      if (Object.keys(merged).length > 0) {
        result = await supabase
          .from("upwork_profiles")
          .update(merged as any)
          .eq("id", existing.id)
          .select()
          .single();
      } else {
        result = { data: existing, error: null };
      }
    } else {
      created = true;
      changed.push(...Object.keys(profile).filter((f) => f !== "user_id"));
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

    return NextResponse.json({ ok: true, profile: result.data, created, changed });
  } catch (err) {
    console.error("[Extension Profile] Error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
