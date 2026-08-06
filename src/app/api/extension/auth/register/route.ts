import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

/**
 * POST /api/extension/auth/register
 * Register a new extension device and get an API token.
 *
 * Requires an authenticated web session — the token is only minted for the
 * logged-in user, never for an arbitrary user_id supplied in the body.
 *
 * Body: { user_id: string; device_name?: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to register a device" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_id, device_name } = body;

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    // Only allow minting a token for the authenticated user.
    if (user_id !== user.id) {
      return NextResponse.json(
        { error: "user_id does not match the signed-in account" },
        { status: 403 }
      );
    }

    // Generate a secure token
    const token = `us_${nanoid(48)}`;

    const adminClient = await createSupabaseAdminClient();

    const { data, error } = await adminClient
      .from("api_tokens")
      .insert({
        user_id,
        token,
        name: device_name || "Chrome Extension",
      })
      .select("id, token, name, created_at")
      .single();

    if (error) {
      console.error("[Extension Auth] Insert error:", error);
      return NextResponse.json(
        { error: "Failed to register device" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      device_id: data.id,
      api_token: data.token,
      name: data.name,
      created_at: data.created_at,
    });
  } catch (err) {
    console.error("[Extension Auth] Error:", err);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
