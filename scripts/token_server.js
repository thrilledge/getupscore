#!/usr/bin/env node
/*
 * Upwork MCP token server - powers the admin "UpWork MCP" page.
 *
 * Multi-account: every slot in .mcp/pool is one Upwork account. Slots are
 * self-healing (auto-refresh) and the sync client rotates to the next slot
 * when one dies. See token_pool.js.
 *
 * Endpoints (all require: Authorization: Bearer $CRON_SECRET):
 *   GET    /api/status        - pool summary: every slot's health + account
 *   POST   /api/auth-url      - {slot?} generate PKCE OAuth link (new slot if omitted)
 *   POST   /api/exchange      - {slot, code, state?} store token in that slot
 *   POST   /api/refresh       - {slot?} force refresh now (default: active slot)
 *   DELETE /api/slot/:n       - remove a slot
 *
 * Env: CRON_SECRET (auth).
 */
"use strict";
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const pool = require("./token_pool");

const STATE_DIR = path.join(__dirname, ".mcp");
const CLIENT_FILE = path.join(STATE_DIR, "client.json");
const AUTH_URL = "https://www.upwork.com/ab/account-security/oauth2/authorize";
const TOKEN_URL = "https://www.upwork.com/api/v3/oauth2/token";
const MCP_URL = "https://mcp.upwork.com/mcp";
const REDIRECT = "http://localhost:8123/callback";
const PROTOCOL = "2025-03-26";
const CRON_SECRET = process.env.CRON_SECRET || "";
const PORT = Number(process.env.TOKEN_SERVER_PORT || 4091);
const ACCOUNT_TTL = 30 * 60 * 1000;

function readJson(f) { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } }
function b64url(buf) { return Buffer.from(buf).toString("base64url").replace(/=+$/, ""); }
function safeEq(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
function authOk(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return false;
  return !!CRON_SECRET && safeEq(h.slice(7).trim(), CRON_SECRET);
}
function send(res, status, obj) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = "";
    req.on("data", (c) => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on("end", () => {
      if (!d) return resolve({});
      try { resolve(JSON.parse(d)); } catch { reject(Object.assign(new Error("invalid JSON body"), { status: 400 })); }
    });
    req.on("error", reject);
  });
}
function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms); }),
  ]).finally(() => clearTimeout(timer));
}

// ---------------- MCP (per-request session) ----------------
function mcpHeaders(accessToken, sessionId, extra = {}) {
  const h = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    authorization: `Bearer ${accessToken}`,
    "mcp-protocol-version": PROTOCOL,
    ...extra,
  };
  if (sessionId) h["mcp-session-id"] = sessionId;
  return h;
}

async function mcpSend(accessToken, session, method, params) {
  const payload = { jsonrpc: "2.0", id: Date.now(), method, params };
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: mcpHeaders(accessToken, session.id),
    body: JSON.stringify(payload),
  });
  if (res.status === 401) throw new Error("401 unauthorized");
  const sid = res.headers.get("mcp-session-id") || res.headers.get("Mcp-Session-Id");
  if (sid) session.id = sid;
  if (!res.ok) throw new Error(`MCP http ${res.status}`);
  const text = await res.text();
  const line = text.split("\n").find((l) => l.startsWith("data:"));
  if (line) { try { return JSON.parse(line.slice(5)); } catch {} }
  return JSON.parse(text);
}

/** Ask Upwork which account this token belongs to (name + org_uid). */
async function listAccountFor(slot) {
  const session = { id: null };
  const initR = await mcpSend(slot.access_token, session, "initialize", {
    protocolVersion: PROTOCOL,
    capabilities: {},
    clientInfo: { name: "upscore-token-server", version: "2.0.0" },
  });
  if (!initR?.result) throw new Error("initialize failed");
  const serverProto = initR.result.protocolVersion || PROTOCOL;
  try {
    const n = await fetch(MCP_URL, {
      method: "POST",
      headers: mcpHeaders(slot.access_token, session.id),
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: { protocolVersion: serverProto } }),
    });
    await n.arrayBuffer();
  } catch {}
  const r = await mcpSend(slot.access_token, session, "tools/call", { name: "upwork__list_accounts", arguments: {} });
  const txt = r?.result?.content?.[0]?.text;
  if (!txt) throw new Error("empty list_accounts result");
  const parsed = JSON.parse(txt);
  const a = (parsed?.accounts || [])[0];
  return a ? { name: a.name || null, org_uid: a.org_uid || null, role_label: a.role_label || null } : null;
}

// ---------------- per-slot account cache ----------------
const accountCache = new Map(); // slot -> { value, at, error }
const inFlight = new Set();

async function refreshAccountFor(slotNo, force = false) {
  const cached = accountCache.get(slotNo);
  if (cached && cached.value && !force && Date.now() - cached.at < ACCOUNT_TTL) return cached;
  if (inFlight.has(slotNo)) return cached || { value: null, at: 0, error: null };
  inFlight.add(slotNo);
  try {
    const slot = pool.getSlot(slotNo);
    if (!slot || !slot.access_token) throw new Error("no token");
    const value = await withTimeout(listAccountFor(slot), 45000, "list_accounts");
    if (value) pool.setAccountMeta(slotNo, value); // persist label/org_uid back into the slot
    accountCache.set(slotNo, { value, at: Date.now(), error: null });
  } catch (e) {
    accountCache.set(slotNo, { ...(cached || {}), error: e.message });
  } finally {
    inFlight.delete(slotNo);
  }
  return accountCache.get(slotNo) || { value: null, at: 0, error: null };
}

async function handleStatus() {
  const sum = pool.summary();
  const accounts = {};
  let anyReachable = null;
  for (const v of sum.slots) {
    if (!v.has_refresh && v.status === "needs_reconnect") { accounts[v.slot] = { value: null, at: 0, error: null }; continue; }
    const c = accountCache.get(v.slot);
    if (c && c.value && Date.now() - c.at < ACCOUNT_TTL) {
      accounts[v.slot] = c;
    } else {
      accounts[v.slot] = c || { value: null, at: 0, error: null };
      refreshAccountFor(v.slot).catch(() => {});
    }
    const got = accounts[v.slot] && accounts[v.slot].value;
    if (got) { anyReachable = true; }
    else if (anyReachable === null) anyReachable = null;
  }
  const active = sum.active_slot ? pool.getSlot(sum.active_slot) : null;
  const activeH = sum.active_slot ? sum.slots.find((s) => s.slot === sum.active_slot) : null;
  return {
    ok: true,
    pool: {
      ...sum,
      accounts: Object.fromEntries(
        Object.entries(accounts).map(([k, v]) => [k, {
          name: v.value?.name || null,
          org_uid: v.value?.org_uid || null,
          role_label: v.value?.role_label || null,
          checked_at: v.at ? new Date(v.at).toISOString() : null,
          error: v.error || null,
        }])
      ),
    },
    // legacy single-token shape, derived from the active slot
    token: !!active?.access_token,
    detail: activeH ? { ...activeH, issued_at: active?.issued_at || null, client_id: active?.client_id || null } : null,
    account: sum.active_slot ? (accountCache.get(sum.active_slot)?.value || null) : null,
    mcp: {
      reachable: anyReachable,
      error: [...Object.values(accounts)].map((a) => a.error).filter(Boolean)[0] || null,
      checked_at: new Date().toISOString(),
    },
  };
}

// ---------------- OAuth (per slot) ----------------
function generateAuthUrl(slotNo) {
  const client = readJson(CLIENT_FILE) || {};
  if (!client.client_id) {
    throw Object.assign(new Error(".mcp/client.json missing client_id - run register first"), { status: 500 });
  }
  const slot = Number(slotNo) || pool.nextFreeSlot();
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  const state = b64url(crypto.randomBytes(16));
  pool.ensureDirs();
  fs.writeFileSync(pool.pendingPath(slot), JSON.stringify({
    slot, verifier, state, client_id: client.client_id, created_at: new Date().toISOString(),
  }, null, 2));
  const p = new URLSearchParams({
    client_id: client.client_id, redirect_uri: REDIRECT, response_type: "code",
    scope: "core", code_challenge: challenge, code_challenge_method: "S256", state,
  });
  return { slot, authUrl: `${AUTH_URL}?${p.toString()}`, state, redirect_uri: REDIRECT };
}

async function exchangeCode(code, state, slotNo) {
  const slot = Number(slotNo);
  if (!slot) throw Object.assign(new Error("slot is required"), { status: 400 });
  const pend = readJson(pool.pendingPath(slot));
  if (!pend || !pend.verifier) {
    throw Object.assign(new Error(`no pending link for slot ${slot} - generate a link for it first`), { status: 400 });
  }
  if (state && pend.state && state !== pend.state) {
    throw Object.assign(new Error("state mismatch - link is stale, generate a new one"), { status: 400 });
  }
  const params = new URLSearchParams({
    grant_type: "authorization_code", code,
    redirect_uri: REDIRECT, client_id: pend.client_id,
    code_verifier: pend.verifier,
  });
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const t = await r.json();
  if (!r.ok || !t.access_token) {
    throw Object.assign(new Error(`token exchange failed ${r.status}: ${JSON.stringify(t).slice(0, 300)}`), { status: 400 });
  }
  const prev = pool.getSlot(slot);
  const now = new Date().toISOString();
  const rec = {
    slot,
    label: prev?.label || `Account ${slot}`,
    org_uid: prev?.org_uid || null,
    role_label: prev?.role_label || null,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    token_type: t.token_type || "bearer",
    expires_in: t.expires_in || 86400,
    issued_at: now,
    expires_at: new Date(Date.now() + (t.expires_in || 86400) * 1000).toISOString(),
    client_id: pend.client_id,
    protocol: PROTOCOL,
    status: "ok",
    last_error: null,
    added_at: prev?.added_at || now,
    last_used_at: prev?.last_used_at || null,
  };
  if (prev) { try { fs.copyFileSync(pool.slotPath(slot), `${pool.slotPath(slot)}.bak.${Date.now()}`); } catch {} }
  pool.saveSlot(rec);
  try { fs.unlinkSync(pool.pendingPath(slot)); } catch {}
  accountCache.delete(slot);
  // best-effort: attach account name + org_uid so sync can target this account
  let account = null;
  try { await refreshAccountFor(slot, true); account = accountCache.get(slot)?.value || null; } catch {}
  const saved = pool.getSlot(slot);
  return {
    ok: true, slot,
    expires_in: saved.expires_in, issued_at: saved.issued_at,
    account, org_uid: saved.org_uid || null,
  };
}

// ---------------- HTTP ----------------
const server = http.createServer(async (req, res) => {
  try {
    if (!authOk(req)) return send(res, 401, { ok: false, error: "unauthorized" });
    const u = new URL(req.url, "http://127.0.0.1");
    const p = u.pathname;

    if (p === "/api/status" && req.method === "GET") {
      send(res, 200, await handleStatus());
    } else if (p === "/api/auth-url" && req.method === "POST") {
      const b = await readBody(req);
      send(res, 200, { ok: true, ...generateAuthUrl(b.slot) });
    } else if (p === "/api/exchange" && req.method === "POST") {
      const b = await readBody(req);
      send(res, 200, await exchangeCode(String(b.code || "").trim(), b.state || null, b.slot));
    } else if (p === "/api/refresh" && req.method === "POST") {
      const b = await readBody(req);
      const sum = pool.summary();
      const slot = Number(b.slot) || sum.active_slot;
      if (!slot) return send(res, 400, { ok: false, error: "no slot to refresh" });
      const fresh = await pool.refreshSlot(slot);
      accountCache.delete(slot);
      send(res, 200, {
        ok: true, slot,
        expires_at: fresh.expires_at, seconds_left: pool.health(fresh).seconds_left,
        expires_in: fresh.expires_in,
      });
    } else if (req.method === "DELETE" && /^\/api\/slot\/\d+$/.test(p)) {
      const n = Number(p.split("/").pop());
      pool.deleteSlot(n);
      accountCache.delete(n);
      send(res, 200, { ok: true, removed: n, pool: pool.summary() });
    } else {
      send(res, 404, { ok: false, error: "not found" });
    }
  } catch (e) {
    send(res, e.status || 500, { ok: false, error: e.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`upwork-token-server listening on 127.0.0.1:${PORT}`);
});
