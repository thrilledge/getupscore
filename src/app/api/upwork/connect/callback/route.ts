/**
 * GET /api/upwork/connect/callback?code=...&state=...
 *
 * OAuth redirect target. Verifies the state cookie, exchanges the code for
 * tokens, discovers the user's org via MCP list-accounts, and stores the
 * encrypted token payload in upwork_connections. Then redirects the browser
 * back to returnTo (default /settings?upwork=connected).
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { UpworkConnectionInsert } from "@/lib/supabase/database-types";
import { encodeTokenPayload } from "@/lib/upwork/crypto";
import { exchangeCodeForToken } from "@/lib/upwork/oauth";
import { listAccounts } from "@/lib/upwork/mcp";
import { env } from "@/lib/env";

const VERIFIER_COOKIE = "upwork_pkce_verifier";
const STATE_COOKIE = "upwork_oauth_state";

// OAuth callback resolves the signed-in user and writes their connection row —
// must always run fresh per request, never cached.
export const dynamic = "force-dynamic";

interface ListAccountsResult {
  data?: unknown;
  result?: {
    content?: Array<{ type: string; text: string }>;
  };
}

function extractText(result: unknown): string {
  const r = result as ListAccountsResult;
  const content = r?.result?.content ?? [];
  const item = content.find((c) => c.type === "text");
  return item?.text ?? JSON.stringify(result ?? {});
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const code = request.nextUrl.searchParams.get("code");
  const stateRaw = request.nextUrl.searchParams.get("state");

  const verifier = cookieStore.get(VERIFIER_COOKIE)?.value;
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;

  // Clear the one-time PKCE cookies regardless of outcome.
  cookieStore.delete(VERIFIER_COOKIE);
  cookieStore.delete(STATE_COOKIE);

  const fail = (msg: string, status = 400) =>
    NextResponse.json({ error: msg }, { status });

  if (!code || !stateRaw) return fail("Missing code or state");
  if (!verifier || !expectedState) return fail("OAuth session expired, please retry");

  // Validate state (the cookie state is embedded inside the state payload).
  let returnTo = "/settings";
  let clientId = env.UPWORK_CLIENT_ID;
  try {
    const payload = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8")) as {
      state: string;
      returnTo?: string;
      clientId?: string;
    };
    if (payload.state !== expectedState) return fail("State mismatch", 400);
    if (payload.returnTo) returnTo = payload.returnTo;
    if (payload.clientId) clientId = payload.clientId;
  } catch {
    return fail("Invalid state", 400);
  }

  try {
    const token = await exchangeCodeForToken({
      code,
      codeVerifier: verifier,
      clientId,
    });

    // Discover org_uid + display name via MCP list-accounts.
    // Note: Upwork's list-accounts returns { name, org_uid, role } — there is
    // NO user_uid / customer_uid field, so we use `name` as the display name.
    let orgUid = "";
    let displayName: string | null = null;
    try {
      const res = (await listAccounts(token.access_token, env.UPWORK_MCP_URL)) as unknown;
      const text = extractText(res);
      const parsed = JSON.parse(text);
      const accounts = Array.isArray(parsed) ? parsed : parsed?.accounts ?? [];
      const first = accounts[0] ?? parsed;
      orgUid = first?.org_uid ?? first?.id ?? "";
      displayName = first?.name ?? null;
    } catch (e) {
      console.warn("upwork list-accounts discovery failed", e);
    }

    // Without an org_uid, every org-scoped Upwork MCP call (connects, profile,
    // proposals) is impossible — and storing a placeholder "unknown" would make
    // different users' connections indistinguishable at scale. Fail cleanly so
    // the user can retry instead of persisting a broken/ambiguous connection.
    if (!orgUid) {
      console.error("upwork connect: org discovery returned no org_uid; aborting connect");
      const target = new URL(returnTo, request.url);
      target.searchParams.set("upwork", "error");
      target.searchParams.set("reason", "org_discovery_failed");
      return NextResponse.redirect(target);
    }

    // Auth: we need the user for the DB row. The callback is a redirect from
    // Upwork, so the Supabase session cookie is still valid.
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const expiresAt = Date.now() + (token.expires_in ?? 3600) * 1000;
    const enc = encodeTokenPayload({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: expiresAt,
      token_type: token.token_type,
      scope: token.scope,
    });

    const admin = createSupabaseAdminClient();

    const payload: UpworkConnectionInsert = {
      user_id: user.id,
      // Upwork's MCP doesn't return a user_uid; use org_uid as the identifier.
      upwork_user_uid: orgUid,
      org_uid: orgUid,
      display_name: displayName,
      token_enc: enc.tokenEnc,
      token_iv: enc.tokenIv,
      token_tag: enc.tokenTag,
      key_version: 1,
      client_ref: clientId,
      is_active: true,
    };

    // Delete any prior active connections for this user, then insert fresh.
    const { error: delErr } = await admin
      .from("upwork_connections")
      .delete()
      .eq("user_id", user.id);
    if (delErr) {
      console.error("upwork connection delete prior error", delErr);
    }

    const { error } = await admin.from("upwork_connections").insert(payload);
    if (error) {
      console.error("upwork connection upsert error", JSON.stringify({
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      }));
      return fail("Failed to store Upwork connection", 500);
    }

    const target = new URL(returnTo, request.url);
    target.searchParams.set("upwork", "connected");
    return NextResponse.redirect(target);
  } catch (err) {
    console.error("upwork connect callback error", err);
    return fail("Failed to complete Upwork connection", 500);
  }
}
