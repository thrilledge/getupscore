import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * POST /api/extension/auth/login
 * Sign the extension into the same Supabase account as the dashboard.
 *
 * Body: { email, password }
 * Returns a session (access_token, refresh_token, expires_at) plus user info.
 * Never stores the password anywhere.
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
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim().toLowerCase(),
      password: String(password),
    });

    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || "Invalid credentials" }, { status: 401, headers: corsHeaders });
    }

    return NextResponse.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
      },
      user: {
        id: data.user.id,
        email: data.user.email,
        display_name:
          data.user.user_metadata?.display_name ||
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          null,
      },
    }, { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    console.error("[Extension Auth] Login error:", err);
    return NextResponse.json({ error: message }, { status: 400, headers: corsHeaders });
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
