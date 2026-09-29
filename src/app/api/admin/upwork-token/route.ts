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
 *   GET  → token health (expiry, account) + ingest config + last sync stats
 *   POST { action: "generate-link" }        → fresh OAuth URL (PKCE state held on VPS)
 *   POST { action: "connect", code, state } → exchange the code, save token on VPS
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

  let body: { action?: string; code?: string; state?: string; jobsPerSync?: number; syncIntervalMinutes?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    if (body.action === "generate-link") {
      const res = await mcpFetch("/api/auth-url", { method: "POST" });
      if (!res.ok) {
        const err = res.json && typeof res.json === "object" && "error" in res.json
          ? String((res.json as { error: string }).error)
          : "failed to generate link";
        return NextResponse.json({ error: err }, { status: res.status === 401 ? 502 : 400 });
      }
      const j = res.json as { authUrl?: string; state?: string };
      return NextResponse.json({ ok: true, authUrl: j.authUrl, state: j.state });
    }

    if (body.action === "connect") {
      const code = (body.code || "").trim();
      if (!code) return NextResponse.json({ error: "Paste the callback code first" }, { status: 400 });
      const res = await mcpFetch("/api/exchange", {
        method: "POST",
        body: JSON.stringify({ code, state: body.state || null }),
      });
      if (!res.ok) {
        const err = res.json && typeof res.json === "object" && "error" in res.json
          ? String((res.json as { error: string }).error)
          : "token exchange failed";
        return NextResponse.json({ error: err }, { status: 400 });
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
