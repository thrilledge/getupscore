/**
 * GET /api/upwork/connect/status
 *
 * Returns whether the signed-in user has an active Upwork connection, plus a
 * best-effort live connects balance pulled via the Upwork MCP
 * `upwork__get_freelancer_financials` action=connects_balance.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUpworkSession } from "@/lib/upwork/session";
import { callMcp } from "@/lib/upwork/mcp";
import { env } from "@/lib/env";

// This route returns per-user data (which Upwork account is connected). It must
// NEVER be cached/shared: force it dynamic and mark every response `no-store` so
// no CDN/proxy/Vercel edge can serve one user's connection to another user.
export const dynamic = "force-dynamic";

// Applied to every response so a shared cache can never hand user A's Upwork
// connection to user B.
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" } as const;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
    }

    const session = await getUpworkSession(user.id);
    if (!session) {
      return NextResponse.json({ connected: false }, { headers: NO_STORE });
    }

    let connectsBalance: number | null = null;
    if (env.isUpworkConfigured) {
      try {
        const res = await callMcp(session.token.access_token, env.UPWORK_MCP_URL, "tool", {
          toolName: "upwork__get_freelancer_financials",
          arguments: {
            action: "connects_balance",
            org_uid: session.orgUid,
            params: { limit: 1 },
          },
        });
        connectsBalance = extractConnects(res);
      } catch (e) {
        console.warn("connects balance fetch failed", e);
      }
    }

    return NextResponse.json({
      connected: true,
      orgUid: session.orgUid,
      upworkUserUid: session.upworkUserUid,
      displayName: session.displayName,
      lastSyncedAt: session.lastSyncedAt,
      connectsBalance,
    }, { headers: NO_STORE });
  } catch (err) {
    console.error("upwork status error", err);
    return NextResponse.json({ error: "Failed to read Upwork status" }, { status: 500, headers: NO_STORE });
  }
}

function extractConnects(result: unknown): number | null {
  try {
    const r = result as {
      result?: { content?: Array<{ type: string; text: string }> };
    };
    const item = r?.result?.content?.find((c) => c.type === "text");
    const text = item?.text ?? JSON.stringify(result);
    const parsed = JSON.parse(text);
    const balance =
      parsed?.connectsBalance ?? parsed?.balance ?? parsed?.total ?? parsed?.data ?? null;
    if (typeof balance === "object" && balance !== null) {
      return Number(balance.remaining ?? balance.available ?? balance.value ?? null) || null;
    }
    return typeof balance === "number" ? balance : null;
  } catch {
    return null;
  }
}
