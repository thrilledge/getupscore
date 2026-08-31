/**
 * POST /api/upwork/connect/disconnect
 *
 * Deactivates the signed-in user's Upwork connection, revoking app access.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

// Per-user mutation — never cache.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("upwork_connections")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (error) {
      console.error("upwork disconnect error", error);
      return NextResponse.json({ error: "Failed to disconnect Upwork" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("upwork disconnect error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
