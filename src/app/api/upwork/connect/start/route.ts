/**
 * GET /api/upwork/connect/start
 *
 * Starts the per-user Upwork OAuth flow. Assumes an authenticated user.
 * Generates a PKCE verifier + state, stores them in short-lived httpOnly
 * cookies, and 302-redirects to Upwork's authorize URL.
 *
 * Query param `?returnTo=/settings` (default) is echoed back via the state so
 * the callback can route the user back after a successful connect.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildAuthorizeUrl, generatePkce, generateState, registerDynamicClient } from "@/lib/upwork/oauth";
import { env } from "@/lib/env";

const VERIFIER_COOKIE = "upwork_pkce_verifier";
const STATE_COOKIE = "upwork_oauth_state";

// Per-user OAuth start: must always run fresh (never cached) so each user gets
// their own PKCE/state and redirect.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!env.isUpworkConfigured) {
      return NextResponse.json({ error: "Upwork is not configured" }, { status: 500 });
    }

    // Register (or reuse) the Upwork dynamic public client for this redirect URI.
    const client = await registerDynamicClient();

    const returnTo = request.nextUrl.searchParams.get("returnTo") || "/settings";
    const pkce = generatePkce();
    const state = generateState();
    // Encode returnTo and clientId into the OAuth state token so the callback
    // can both verify and know where to send the user + which client to exchange
    // the code with.
    const statePayload = JSON.stringify({
      state,
      returnTo,
      clientId: client.client_id,
    });

    const cookieStore = await cookies();
    cookieStore.set(VERIFIER_COOKIE, pkce.verifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600, // 10 min
    });
    cookieStore.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    const url = await buildAuthorizeUrl({
      state: Buffer.from(statePayload).toString("base64url"),
      codeChallenge: pkce.challenge,
      clientId: client.client_id,
    });

    return NextResponse.redirect(url);
  } catch (err) {
    console.error("upwork connect start error", err);
    const msg =
      err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
