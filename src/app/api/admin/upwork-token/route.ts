import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Admin control plane for the VPS UpWork MCP connection.
 *
 * The VPS runs `upwork-token-server` (127.0.0.1:4091) behind nginx at
 * http://<vps>/mcp-token/. It is protected by the same CRON_SECRET as the
 * rest of the app's cron surface, so this route is the only thing that talks
 * to it — the secret never reaches the browser.
 *
 * Multiple Upwork accounts are supported: each one owns a slot in the VPS
 * token pool. The sync client auto-refreshes a slot, and when a token dies it
 * quarantines that slot and rotates to the next one.
 *
 *   GET  → pool health (every slot) + ingest config + last sync stats
 *   POST { action: "generate-link", slot? }  → fresh OAuth URL (new slot if omitted)
 *   POST { action: "connect", slot, code|callbackUrl, state? } → exchange + store token
 *   POST { action: "refresh", slot? }        → force a refresh now
 *   POST { action: "delete-slot", slot }     → remove an account from the pool
 *   POST { action: "ingest", jobsPerSync, syncIntervalMinutes } → update config row
 */

const MCP_BASE = (process.env.UPWORK_MCP_BASE_URL || "http://144.91.85.40/mcp-token").replace(/\/+$/, "");

async function mcpFetch(path: string, init?: RequestInit) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET not configured");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(`${MCP_BASE}${path}`, {
      ...init,
      cache: "no-store",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${secret}`,
        "content-type": "application/json",
        ...(init?.headers || {}),
      },
    });
    const text = await res.text();
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-json */ }
    return { ok: res.ok, status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

async function readConfig() {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("upwork_mcp_config")
    .select("jobs_per_sync, sync_interval_minutes, last_sync_at, last_sync_jobs, updated_at")
    .eq("id", 1)
    .maybeSingle();
  return {
    jobsPerSync: data?.jobs_per_sync ?? 10,
    syncIntervalMinutes: data?.sync_interval_minutes ?? 5,
    lastSyncAt: data?.last_sync_at ?? null,
    lastSyncJobs: data?.last_sync_jobs ?? null,
    updatedAt: data?.updated_at ?? null,
  };
}

/**
 * Upwork redirects to http://localhost:8123/callback?code=...&state=..., so the
 * operator usually pastes the whole URL. Accept a bare code, a full URL, or a
 * raw query string and pull `code` (+ `state` when we have it) out of any of them.
 */
function parseCallback(input: string): { code: string; state: string | null } {
  const raw = (input || "").trim().replace(/^["']|["']$/g, "");
  if (!raw) return { code: "", state: null };

  if (raw.startsWith("code=") || raw.startsWith("?")) {
    const p = new URLSearchParams(raw.replace(/^\?/, ""));
    return { code: (p.get("code") || "").trim(), state: p.get("state") };
  }

  if (raw.includes("://") || raw.startsWith("/")) {
    try {
      const u = new URL(raw, "http://localhost");
      const code = (u.searchParams.get("code") || "").trim();
      if (code) return { code, state: u.searchParams.get("state") };
    } catch {
      /* not a URL after all — fall through */
    }
  }

  const [codePart, queryPart] = raw.split("?");
  let state: string | null = null;
  if (queryPart) {
    try { state = new URLSearchParams(queryPart).get("state"); } catch { /* ignore */ }
  }
  return { code: codePart.trim(), state };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const auth = await requireAdmin(user ?? null);
  if (!auth.authorized) return auth.response;

  const config = await readConfig();

  try {
    const res = await mcpFetch("/api/status");
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: res.json && typeof res.json === "object" && "error" in res.json
          ? String((res.json as { error: string }).error)
          : `token server unreachable (http ${res.status})`,
        config,
      });
    }
    return NextResponse.json({ ok: true, ...(res.json as object), config });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "token server unreachable",
      config,
    });
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const auth = await requireAdmin(user ?? null);
  if (!auth.authorized) return auth.response;

  let body: {
    action?: string;
    code?: string;
    state?: string;
    slot?: number;
    jobsPerSync?: number;
    syncIntervalMinutes?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slot = Number.isFinite(Number(body.slot)) && Number(body.slot) > 0 ? Number(body.slot) : undefined;
  const mcpError = (json: unknown, fallback: string) =>
    json && typeof json === "object" && "error" in json
      ? String((json as { error: string }).error)
      : fallback;

  try {
    if (body.action === "generate-link") {
      const res = await mcpFetch("/api/auth-url", {
        method: "POST",
        body: JSON.stringify(slot ? { slot } : {}),
      });
      if (!res.ok) {
        return NextResponse.json({ error: mcpError(res.json, "failed to generate link") },
          { status: res.status === 401 ? 502 : 400 });
      }
      const j = res.json as { authUrl?: string; state?: string; slot?: number };
      return NextResponse.json({ ok: true, authUrl: j.authUrl, state: j.state, slot: j.slot });
    }

    if (body.action === "connect") {
      if (!slot) return NextResponse.json({ error: "Which account slot?" }, { status: 400 });
      const parsed = parseCallback(body.code || "");
      if (!parsed.code) {
        return NextResponse.json(
          { error: "Paste the callback URL (or just its code) from your browser address bar" },
          { status: 400 },
        );
      }
      const res = await mcpFetch("/api/exchange", {
        method: "POST",
        body: JSON.stringify({ slot, code: parsed.code, state: body.state || parsed.state || null }),
      });
      if (!res.ok) {
        return NextResponse.json({ error: mcpError(res.json, "token exchange failed") }, { status: 400 });
      }
      return NextResponse.json({ ok: true, ...(res.json as object) });
    }

    if (body.action === "refresh") {
      const res = await mcpFetch("/api/refresh", {
        method: "POST",
        body: JSON.stringify(slot ? { slot } : {}),
      });
      if (!res.ok) {
        return NextResponse.json({ error: mcpError(res.json, "refresh failed") },
          { status: res.status === 401 ? 502 : 400 });
      }
      return NextResponse.json({ ok: true, ...(res.json as object) });
    }

    if (body.action === "delete-slot") {
      if (!slot) return NextResponse.json({ error: "Which account slot?" }, { status: 400 });
      const res = await mcpFetch(`/api/slot/${slot}`, { method: "DELETE" });
      if (!res.ok) {
        return NextResponse.json({ error: mcpError(res.json, "failed to remove account") },
          { status: res.status === 401 ? 502 : 400 });
      }
      return NextResponse.json({ ok: true, ...(res.json as object) });
    }

    if (body.action === "ingest") {
      const jobs = Math.min(200, Math.max(1, Math.round(Number(body.jobsPerSync) || 0)));
      const interval = Math.min(1440, Math.max(1, Math.round(Number(body.syncIntervalMinutes) || 0)));
      if (!jobs || !interval) return NextResponse.json({ error: "Invalid values" }, { status: 400 });
      const admin = createSupabaseAdminClient();
      const { error } = await admin
        .from("upwork_mcp_config")
        .update({ jobs_per_sync: jobs, sync_interval_minutes: interval, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
      return NextResponse.json({ ok: true, config: await readConfig() });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "Request failed",
    }, { status: 500 });
  }
}
