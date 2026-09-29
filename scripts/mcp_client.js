#!/usr/bin/env node
/*
 * Static Upwork MCP client — OAuth2 (authorization-code + PKCE) + tools/call.
 * No AI. Pure JSON-RPC over HTTP.
 *
 * Commands:
 *   node mcp_client.js register            → dynamic client registration (prints client_id/secret)
 *   node mcp_client.js authorize           → PKCE authorize flow + code exchange → token.json
 *   node mcp_client.js refresh             → refresh token rotation → token.json
 *   node mcp_client.js tools-list          → list MCP tools
 *   node mcp_client.js get-job <id> [--json] → tools/call find_jobs action=get
 */
"use strict";
const http = require("http");
const crypto = require("crypto");
const pool = require("./token_pool");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const MCP_URL = "https://mcp.upwork.com/mcp";
const REG_URL = "https://www.upwork.com/register";
const AUTH_URL = "https://www.upwork.com/ab/account-security/oauth2/authorize";
const TOKEN_URL = "https://www.upwork.com/api/v3/oauth2/token";
const REDIRECT = "http://localhost:8123/callback";

const STATE_DIR = path.join(__dirname, ".mcp");
const TOKEN_FILE = path.join(STATE_DIR, "token.json");
const CLIENT_FILE = path.join(STATE_DIR, "client.json");
const PROTOCOL = "2025-03-26";
const JOBS_LIMIT = parseInt(process.env.JOBS_PER_SYNC || "10", 10) || 10;

// ---------------- helpers ----------------
function b64url(buf) {
  return Buffer.from(buf).toString("base64url").replace(/=+$/, "");
}
function base64UrlEncode(obj) {
  return b64url(JSON.stringify(obj)).replace(/=+$/, "");
}
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}
function ensureState() {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
}
function joseSignature(header, payload, jwk) {
  const input = `${b64url(Buffer.from(JSON.stringify(header)))}.${b64url(Buffer.from(JSON.stringify(payload)))}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(input);
  sign.end();
  const signature = sign.sign({ key: jwk, padding: crypto.constants.RSA_PKCS1_PADDING });
  return `${input}.${b64url(signature)}`;
}

// ---------------- register ----------------
async function register() {
  ensureState();
  const reg = {
    client_name: "StaticJobsClient",
    redirect_uris: [REDIRECT],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    scope: "core",
  };
  const res = await fetch(REG_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(reg),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`register failed ${res.status}: ${JSON.stringify(body)}`);
  fs.writeFileSync(CLIENT_FILE, JSON.stringify(body, null, 2));
  console.log("Registered client:", body.client_id);
  console.log("registration_access_token:", body.registration_access_token);
  return body;
}

// ---------------- authorize (PKCE) ----------------
async function authorize() {
  ensureState();
  const client = readJson(CLIENT_FILE) || (await register());
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  const state = b64url(crypto.randomBytes(16));
  // persist PKCE secrets so the code can be exchanged even if the local
  // callback listener is gone (e.g. user completes consent on another device)
  fs.writeFileSync(path.join(STATE_DIR, "pending_oauth.json"), JSON.stringify({
    client_id: client.client_id, code_verifier: verifier, state,
  }, null, 2));

  const params = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: "core",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });
  const authUrl = `${AUTH_URL}?${params.toString()}`;
  console.log("Open the authorization URL and sign in:");
  console.log(authUrl);
  spawnSync("cmd", ["/c", "start", "", authUrl]);

  const code = await waitForCallback(state);
  console.log("Got auth code, exchanging for token...");
  const token = await exchangeToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT,
    client_id: client.client_id,
    code_verifier: verifier,
  });
  token.client_id = client.client_id;
  token.protocol = PROTOCOL;
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2));
  try { fs.unlinkSync(path.join(STATE_DIR, "pending_oauth.json")); } catch {}
  console.log("Saved token to", TOKEN_FILE);
}

function waitForCallback(expectedState) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname !== "/callback") {
        res.writeHead(404); res.end(); return;
      }
      if (url.searchParams.get("state") !== expectedState) {
        res.writeHead(400, { "content-type": "text/plain" });
        res.end("state mismatch (ignored)");
        console.log("[authorize] ignoring stray callback state", url.searchParams.get("state"));
        return;
      }
      const code = url.searchParams.get("code");
      const err = url.searchParams.get("error");
      if (!code && err) {
        res.writeHead(400, { "content-type": "text/plain" });
        res.end("auth error: " + err);
        reject(new Error(err)); return;
      }
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("Authorization complete. You can close this tab.");
      server.close();
      resolve(code);
    });
    server.listen(8123, "127.0.0.1", () => console.log("Listening on http://localhost:8123/callback"));
    setTimeout(() => { server.close(); reject(new Error("timeout waiting for callback")); }, 300000);
  });
}

async function exchangeToken(form) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`token exchange failed ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

// ---------------- refresh ----------------
async function refresh() {
  const slots = pool.listSlots();
  if (!slots.length) throw new Error("no tokens in pool");
  for (const s of slots) {
    try {
      const f = await pool.refreshSlot(s.slot);
      console.log(`slot ${s.slot} refreshed. New access token valid for ${f.expires_in}s`);
    } catch (e) {
      console.log(`slot ${s.slot} refresh failed: ${e.message}`);
    }
  }
}

// ---------------- MCP JSON-RPC (streamable HTTP, session-aware) ----------------
let mcpSessionId = null;

function mcpHeaders(tok, extra = {}) {
  const h = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    authorization: `Bearer ${tok.access_token}`,
    "mcp-protocol-version": PROTOCOL,
    ...extra,
  };
  if (mcpSessionId) h["mcp-session-id"] = mcpSessionId;
  return h;
}

function parseMcpResponse(text) {
  // results and errors may arrive as a single JSON object, or SSE data: lines
  const line = text.split("\n").find((l) => l.startsWith("data:"));
  if (line) { try { return JSON.parse(line.slice(5)); } catch {} }
  try { return JSON.parse(text); } catch { return null; }
}

async function mcpSend(method, params, tok) {
  const payload = { jsonrpc: "2.0", id: Date.now(), method, params };
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: mcpHeaders(tok),
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (res.status === 401) throw new Error("401 unauthorized — refresh the token");
  const sid = res.headers.get("mcp-session-id") || res.headers.get("Mcp-Session-Id");
  if (sid) mcpSessionId = sid;
  if (!res.ok) throw new Error(`MCP ${res.status}: ${text.slice(0, 300)}`);
  return parseMcpResponse(text);
}

// ---- multi-account token pool ----
let activeToken = null;
let activeSlot = null;

async function acquireToken() {
  const slot = pool.selectSlot();
  if (!slot) throw new Error("no healthy Upwork token in the pool - reconnect an account from the admin panel");
  activeSlot = slot.slot;
  activeToken = pool.getSlot(slot.slot) || slot;
  pool.markUsed(slot.slot);
  mcpSessionId = null;
  console.log("using pool slot", activeSlot, "|", activeToken.label || "?", "| org", activeToken.org_uid || "unknown");
  return activeToken;
}

async function ensureInitialized() {
  if (!activeToken) await acquireToken();
  const tok = activeToken;
  if (!tok || !tok.access_token) throw new Error("no healthy token in pool");
  // initialize (no session id yet)
  const initR = await mcpSend("initialize", {
    protocolVersion: PROTOCOL,
    capabilities: {},
    clientInfo: { name: "static-mcp-client", version: "0.1.0" },
  }, tok);
  if (!initR?.result) throw new Error("initialize failed: " + JSON.stringify(initR));
  // pick negotiated protocol version (may differ) and notify initialized
  const serverProto = initR.result.protocolVersion || PROTOCOL;
  // notifications/initialized (no id)
  const notif = {
    jsonrpc: "2.0",
    method: "notifications/initialized",
    params: { protocolVersion: serverProto },
  };
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: mcpHeaders(tok),
    body: JSON.stringify(notif),
  });
  await res.arrayBuffer();
  return tok;
}

// The org must always belong to the token being used: after a rotation the
// previous account's org_uid is rejected by Upwork, so bind it per request.
function withOrg(params, tok) {
  if (!params || typeof params !== "object") return params;
  const orgNow = tok.org_uid || pool.orgForSlot(tok.slot) || pool.defaultOrg();
  if (!orgNow) return params;
  if (params.arguments && typeof params.arguments === "object" && params.arguments.org_uid !== undefined) {
    return { ...params, arguments: { ...params.arguments, org_uid: String(orgNow) } };
  }
  if (params.org_uid !== undefined) return { ...params, org_uid: String(orgNow) };
  return params;
}

async function mcpRequest(method, params) {
  const total = Math.max(1, pool.listSlots().length);
  let lastErr = null;
  for (let i = 0; i < total; i++) {
    try {
      const tok = await ensureInitialized();
      return await mcpSend(method, withOrg(params, tok), tok);
    } catch (e) {
      const msg = String(e.message || e);
      const authFail = msg.includes("401") || msg.includes("unauthorized") || msg.includes("invalid_grant");
      if (!authFail) throw e;
      lastErr = e;
      const bad = activeSlot;
      mcpSessionId = null;
      console.log(`slot ${bad} auth failed - trying auto-refresh`);
      try {
        const fresh = await pool.refreshSlot(bad);
        activeToken = fresh;
        activeSlot = fresh.slot;
        console.log(`slot ${bad} auto-refreshed, retrying`);
        return await mcpSend(method, withOrg(params, fresh), fresh);
      } catch (refErr) {
        pool.markDead(bad, refErr.message);
        console.log(`slot ${bad} refresh failed (${refErr.message}) - quarantined, rotating to next account`);
        activeToken = null;
        activeSlot = null;
        mcpSessionId = null;
      }
    }
  }
  throw new Error(`all Upwork tokens unusable: ${lastErr ? lastErr.message : "no healthy slot in pool"}`);
}

async function toolsList() {
  const r = await mcpRequest("tools/list", {});
  console.log(JSON.stringify(r, null, 2));
}

async function toolCall(name, args) {
  const r = await mcpRequest("tools/call", { name, arguments: args });
  const txt = r?.result?.content?.[0]?.text;
  if (!txt) throw new Error("empty tool result");
  let parsed;
  try { parsed = JSON.parse(txt); } catch { parsed = txt; }
  if (r?.result?.isError || (parsed && parsed.status === "error")) {
    throw new Error(typeof parsed === "string" ? parsed : JSON.stringify(parsed));
  }
  return parsed;
}

async function searchJobs(orgUid) {
  const r = await toolCall("upwork__find_jobs", { action: "search", org_uid: orgUid, params: { limit: JOBS_LIMIT, include_full_details: true } });
  console.log(JSON.stringify(r, null, 2));
}

function stripUntrusted(s) {
  return String(s || "").replace(/<untrusted_participant_content>/g, "").replace(/<\/untrusted_participant_content>/g, "");
}
function parseMoneyStr(s) {
  if (s == null) return null;
  const m = String(s).replace(/[\$,]/g, "").match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}
// Build a save-script-compatible job object from a search payload when `get`
// is denied at the account level (PERMISSION) so ingestion never stalls.
function searchFallback(j) {
  const c = j.client || {};
  const jt = (j.job_type || "").toLowerCase();
  let hourlyMin = null, hourlyMax = null, budget = null;
  const b = j.budget;
  if (jt.includes("hourly") && b && typeof b === "string") {
    const parts = b.match(/([\d,.]+)\s*[\u2013-]\s*([\d,.]+)/);
    if (parts) { hourlyMin = parseMoneyStr(parts[1]); hourlyMax = parseMoneyStr(parts[2]); }
  } else if (jt.includes("hourly") && b && typeof b === "number") {
    hourlyMax = parseMoneyStr(String(b));
  } else {
    budget = parseMoneyStr(b);
  }
  const verified = String(c.verification_status || "").toUpperCase() === "VERIFIED";
  const published = j.published_date || j.created_date || null;
  return {
    id: j.id || j.job_id || j.upwork_job_id,
    title: j.title,
    description: stripUntrusted(j.description || j.description_snippet),
    url: j.url,
    job_type: j.job_type,
    experience_level: j.experience_level,
    duration: j.duration,
    skills: j.skills,
    hourly_min: hourlyMin,
    hourly_max: hourlyMax,
    budget,
    client_country: c.country,
    client_location_country: c.country,
    client_rating: parseMoneyStr(c.rating),
    client_total_spend: parseMoneyStr(c.total_spent),
    client_spend: parseMoneyStr(c.total_spent),
    payment_verified: verified,
    client_payment_verified: verified,
    proposals_count: j.proposal_count != null ? j.proposal_count : (j.proposals_count != null ? j.proposals_count : null),
    client_score: parseMoneyStr(c.rating),
    client_total_jobs_with_hires: c.total_posted_jobs != null ? parseInt(c.total_posted_jobs, 10) : null,
    client_feedback_count: c.total_reviews != null ? parseInt(c.total_reviews, 10) : null,
    persons_to_hire: j.freelancers_to_hire != null ? parseInt(j.freelancers_to_hire, 10) : null,
    engagement_type: j.engagement || null,
    posted_at: published,
    _search_fallback: true,
  };
}
// search -> per-job get (with search fallback) -> write mcp_get_jobs.json -> save
async function sync(outFile, saveScript, legacyOrg) {
  // pick the slot first, then read that account's org, so the two always agree
  if (!activeToken) await acquireToken();
  const orgUid = activeToken.org_uid || pool.orgForSlot(activeSlot) || pool.defaultOrg() || legacyOrg || "";
  if (!orgUid) {
    throw new Error(`pool slot ${activeSlot} has no org_uid - reconnect that account in the admin panel`);
  }
  const search = await toolCall("upwork__find_jobs", { action: "search", org_uid: orgUid, params: { limit: JOBS_LIMIT, include_full_details: true } });
  const jobs = Array.isArray(search) ? search : search.jobs || search.results || [];
  console.log("search returned", jobs.length, "jobs");
  const byId = {};
  for (const j of jobs) {
    const jid = j.id || j.job_id || j.upwork_job_id;
    if (jid) byId[jid] = j;
  }
  const ids = Object.keys(byId);
  const dateMap = {};
  for (const j of jobs) {
    const jid = j.id || j.job_id || j.upwork_job_id;
    if (!jid) continue;
    const d = j.published_date || j.created_date || j.publishedAt || j.createdAt || j.posted_at;
    if (d) dateMap[jid] = d;
  }
  console.log("job ids:", ids, "| dates found:", Object.keys(dateMap).length);
  const gets = [];
  let fallbackCount = 0;
  for (const id of ids) {
    try {
      const g = await toolCall("upwork__find_jobs", { action: "get", org_uid: orgUid, params: { id, job_id: id } });
      if (dateMap[id] && !g.published_date) g.published_date = dateMap[id];
      gets.push(g);
      console.log("get ok:", id);
    } catch (e) {
      // get denied (PERMISSION) -> use rich search payload so ingestion flows.
      const sj = byId[id];
      if (sj) {
        const fb = searchFallback(sj);
        if (dateMap[id] && !fb.published_date) fb.published_date = dateMap[id];
        gets.push(fb);
        fallbackCount++;
        console.log("get failed (fallback):", id, e.message.slice(0, 80));
      } else {
        console.log("get failed:", id, e.message);
      }
    }
  }
  if (!gets.length) { console.log("no job details fetched"); return; }
  fs.writeFileSync(outFile, JSON.stringify(gets, null, 2));
  console.log("wrote", outFile, "(", gets.length, "jobs,", fallbackCount, "fallback )");
  if (saveScript && fs.existsSync(saveScript)) {
    const { spawnSync } = require("child_process");
    const pyBin = process.platform === "win32" ? "python" : "python3";
    const py = spawnSync(pyBin, [saveScript, "--update", outFile], { encoding: "utf8" });
    console.log(py.stdout || "");
    console.error(py.stderr || "");
    console.log("save exit:", py.status);
  }
}

async function getJob(id, asJson, orgUid) {
  const r = await mcpRequest("tools/call", {
    name: "upwork__find_jobs",
    arguments: { action: "get", org_uid: orgUid, params: { id, job_id: id } },
  });
  if (asJson) { console.log(JSON.stringify(r, null, 2)); return; }
  // printable summary
  try {
    const content = r.result?.content || [];
    const txt = content[0]?.text || JSON.stringify(r.result);
    console.log(txt);
  } catch {
    console.log(JSON.stringify(r, null, 2));
  }
}

async function toolSchema(name) {
  const r = await mcpRequest("tools/list", {});
  const tool = r?.result?.tools?.find((t) => t.name === name);
  if (!tool) throw new Error(`tool not found: ${name}`);
  console.log(JSON.stringify(tool, null, 2));
}

async function listAccounts() {
  const r = await mcpRequest("tools/call", {
    name: "upwork__list_accounts",
    arguments: {},
  });
  console.log(JSON.stringify(r, null, 2));
}

// ---------------- main ----------------
(async () => {
  const cmd = process.argv[2];
  switch (cmd) {
    case "register": await register(); break;
    case "authorize": await authorize(); break;
    case "refresh": await refresh(); break;
    case "tools-list": await toolsList(); break;
    case "tool-schema": await toolSchema(process.argv[3]); break;
    case "list-accounts": await listAccounts(); break;
    case "search": await searchJobs(process.argv[3] || pool.defaultOrg()); break;
    case "sync": {
      let a = process.argv[3], b = process.argv[4], c = process.argv[5];
      let legacyOrg = null;
      if (a && /^\d+$/.test(a)) { legacyOrg = a; a = b; b = c; c = null; }
      await sync(a || "mcp_get_jobs.json", b === undefined ? "save_get_jobs_to_db.py" : b, legacyOrg);
      break;
    }
    case "get-job": await getJob(process.argv[3], process.argv.includes("--json"), process.argv[4]); break;
    default:
      console.log("Usage: node mcp_client.js <register|authorize|refresh|tools-list|list-accounts|get-job <id> [org_uid] [--json]>");
  }
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
