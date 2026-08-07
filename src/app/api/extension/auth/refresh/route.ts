import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * POST /api/extension/auth/refresh
 * Exchange a stored refresh_token for a fresh session (access tokens expire
 * after ~1 hour).
 *
 * Body: { refresh_token }
 */
export async function POST(request: Request) {
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { refresh_token } = await request.json();
    if (!refresh_token) {
      return NextResponse.json({ error: "refresh_token is required" }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: String(refresh_token) });

    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || "Invalid or expired refresh token" }, { status: 401, headers: corsHeaders });
    }

    return NextResponse.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
      },
      user: {
        id: data.user?.id,
        email: data.user?.email,
        display_name:
          data.user?.user_metadata?.display_name ||
          data.user?.user_metadata?.full_name ||
          data.user?.user_metadata?.name ||
          null,
      },
    }, { headers: corsHeaders });
  } catch (err) {
    console.error("[Extension Auth] Refresh error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
