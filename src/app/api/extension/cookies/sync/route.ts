import { NextResponse } from "next/server";
import { authenticateRequest } from "@/app/api/extension/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/extension/cookies/sync
 *
 * Receives Upwork session cookies from the extension.
 * These cookies are stored so the server-side cron can use them
 * with ScrapingAnt to fetch GraphQL data 24/7 without needing
 * a browser tab open.
 *
 * Headers: Authorization: Bearer <token>
 * Body: { cookies: string, domain?: string, captured_at?: string }
 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const userId = auth.user_id as string;

  try {
    const body = await request.json();
    const { cookies, domain } = body;

    if (!cookies || typeof cookies !== "string") {
      return NextResponse.json({ error: "Cookies string required" }, { status: 400 });
    }

    const supabase = await createSupabaseAdminClient();

    const { error } = await supabase.from("upwork_sessions").upsert(
      {
        user_id: userId,
        cookie_string: cookies,
        domain: domain || "www.upwork.com",
        captured_at: body.captured_at || new Date().toISOString(),
      },
      { onConflict: "user_id", ignoreDuplicates: false }
    );

    if (error) {
      console.error("[Cookie Sync] DB error:", error.message);
      return NextResponse.json({ error: "Failed to store cookies" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, captured_at: new Date().toISOString() });
  } catch (err) {
    console.error("[Cookie Sync] Error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/**
 * GET /api/extension/cookies/sync
 *
 * Retrieves stored Upwork cookies.
 * Supports two auth methods:
 *   1. Extension token — returns cookies for the authenticated user
 *   2. CRON_SECRET — optionally ?user_id=X for admin/cron usage
 *
 * Headers:
 *   Authorization: Bearer <token_or_cron_secret>
 * Query params:
 *   ?user_id=X (only when using CRON_SECRET)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  // Try extension auth first
  const auth = await authenticateRequest(request);
  let userId: string | null = auth.user_id || null;
  let isExtensionAuth = !auth.error;

  // If extension auth didn't match, try CRON_SECRET
  const expectedSecret = process.env.CRON_SECRET;
  let isCron = false;
  if (!isExtensionAuth && expectedSecret && token === expectedSecret) {
    isCron = true;
    const { searchParams } = new URL(request.url);
    userId = searchParams.get("user_id") || null;
  }

  if (!isExtensionAuth && !isCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseAdminClient();

  let query = supabase
    .from("upwork_sessions")
    .select("user_id, cookie_string, domain, captured_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[Cookie Get] DB error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "No cookies found. Open Upwork in your browser to sync cookies." }, { status: 404 });
  }

  return NextResponse.json({
    user_id: data.user_id,
    cookies: data.cookie_string,
    domain: data.domain,
    captured_at: data.captured_at,
    updated_at: data.updated_at,
  });
}
