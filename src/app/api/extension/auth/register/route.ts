import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

/**
 * POST /api/extension/auth/register
 * Register a new extension device and get an API token.
 *
 * Body: { user_id: string; device_name?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, device_name } = body;

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    // Generate a secure token
    const token = `us_${nanoid(48)}`;

    const supabase = await createSupabaseAdminClient();

    const { data, error } = await supabase
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
