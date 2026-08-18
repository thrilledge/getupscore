import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { checkRateLimit, authRateLimit } from "@/lib/rate-limit";

const ALLOWED_ORIGINS = [
  "chrome-extension://",
  "moz-extension://",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some(o => origin.startsWith(o));
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const { success } = await checkRateLimit(authRateLimit, `login:${ip}`);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: corsHeaders });
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
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401, headers: corsHeaders });
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
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: corsHeaders });
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
}
