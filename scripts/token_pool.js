/*
 * token_pool.js — multi-account Upwork OAuth token pool.
 *
 * One OAuth grant == one Upwork account (`upwork__list_accounts` only ever
 * returns the authorized user). So supporting N accounts means N tokens, each
 * stored in its own slot file, plus:
 *   - auto-refresh: renew a slot with its refresh_token before rotating
 *   - rotation: when a slot's token dies, move to the next healthy one
 *
 * Slot file (.mcp/pool/slot-N.json) holds the OAuth response plus the account
 * metadata (label/org_uid) captured at connect time.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const STATE_DIR = path.join(__dirname, ".mcp");
const POOL_DIR = path.join(STATE_DIR, "pool");
const LEGACY_TOKEN = path.join(STATE_DIR, "token.json");
const STATE_FILE = path.join(POOL_DIR, "_state.json");
const TOKEN_URL = "https://www.upwork.com/api/v3/oauth2/token";
const PROTOCOL = "2025-03-26";
const EXPIRY_WARN_MS = 12 * 60 * 60 * 1000; // <12h left => "expiring"

function readJson(f) { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } }
function writeJson(f, o) { fs.writeFileSync(f, JSON.stringify(o, null, 2)); }
function ensureDirs() { fs.mkdirSync(POOL_DIR, { recursive: true }); }
function slotPath(n) { return path.join(POOL_DIR, `slot-${n}.json`); }
function pendingPath(n) { return path.join(POOL_DIR, `pending-${n}.json`); }

function getState() { return readJson(STATE_FILE) || { active_slot: null }; }
function setState(patch) {
  const s = { ...getState(), ...patch, updated_at: new Date().toISOString() };
  writeJson(STATE_FILE, s);
  return s;
}

/** Token health derived from expires_at (or issued_at + expires_in). */
function health(slot) {
  if (!slot) return { status: "missing" };
  if (slot.status === "needs_reconnect") {
    return { status: "needs_reconnect", expires_at: slot.expires_at || null, seconds_left: 0, days_left: 0 };
  }
  if (!slot.access_token) return { status: "needs_reconnect", seconds_left: 0, days_left: 0 };
  const base = slot.expires_at
    ? new Date(slot.expires_at).getTime()
    : new Date(slot.issued_at || 0).getTime() + (Number(slot.expires_in) || 0) * 1000;
  const left = base - Date.now();
  const status = left <= 0 ? "expired" : left <= EXPIRY_WARN_MS ? "expiring" : "ok";
  return {
    status,
    expires_at: new Date(base).toISOString(),
    seconds_left: Math.max(0, Math.floor(left / 1000)),
    days_left: Math.floor((left / 86400000) * 10) / 10,
  };
}

/** Safe-to-expose view (never includes the tokens themselves). */
function publicView(slot) {
  const h = health(slot);
  return {
    slot: slot.slot,
    label: slot.label || `Account ${slot.slot}`,
    org_uid: slot.org_uid || null,
    role_label: slot.role_label || null,
    added_at: slot.added_at || null,
    last_used_at: slot.last_used_at || null,
    last_refreshed_at: slot.last_refreshed_at || null,
    last_error: slot.last_error || null,
    has_refresh: !!slot.refresh_token,
    ...h,
  };
}

function listSlots() {
  ensureDirs();
  return fs.readdirSync(POOL_DIR)
    .filter((f) => /^slot-\d+\.json$/.test(f))
    .map((f) => readJson(path.join(POOL_DIR, f)))
    .filter(Boolean)
    .sort((a, b) => a.slot - b.slot);
}

function getSlot(n) { return readJson(slotPath(Number(n))); }
function saveSlot(slot) { ensureDirs(); writeJson(slotPath(slot.slot), slot); return slot; }
function deleteSlot(n) {
  try { fs.unlinkSync(slotPath(Number(n))); } catch {}
  try { fs.unlinkSync(pendingPath(Number(n))); } catch {}
}

function nextFreeSlot() {
  const used = new Set(listSlots().map((s) => s.slot));
  for (let i = 1; i <= 20; i++) if (!used.has(i)) return i;
  return listSlots().length + 1;
}

/** One-time migration of the single-account token.json into slot 1. */
function importLegacy() {
  if (listSlots().length) return false;
  const t = readJson(LEGACY_TOKEN);
  if (!t || !t.access_token) return false;
  let issued = t.issued_at;
  if (!issued) {
    try { issued = new Date(fs.statSync(LEGACY_TOKEN).mtimeMs).toISOString(); } catch { issued = new Date().toISOString(); }
  }
  saveSlot({
    slot: 1,
    label: "Primary account",
    org_uid: null,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    token_type: t.token_type,
    expires_in: t.expires_in,
    issued_at: issued,
    expires_at: t.expires_at || new Date(new Date(issued).getTime() + (Number(t.expires_in) || 0) * 1000).toISOString(),
    client_id: t.client_id,
    protocol: t.protocol || PROTOCOL,
    status: "ok",
    last_error: null,
    added_at: issued,
  });
  return true;
}

/** Best usable slot: the one with the most life left (refreshable ones included). */
function selectSlot() {
  importLegacy();
  const scored = listSlots()
    .map((s) => ({ s, h: health(s) }))
    .filter(({ h }) => h.status === "ok" || h.status === "expiring")
    // a slot without a resolved org_uid cannot run a search at all, so it is
    // only used when nothing better exists
    .sort((a, b) => (b.s.org_uid ? 1 : 0) - (a.s.org_uid ? 1 : 0) || b.h.seconds_left - a.h.seconds_left);
  return scored.length ? scored[0].s : null;
}

function markUsed(n) {
  const s = getSlot(n);
  if (!s) return;
  s.last_used_at = new Date().toISOString();
  if (s.status === "needs_reconnect") s.status = "ok";
  saveSlot(s);
}

function markDead(n, err) {
  const s = getSlot(n);
  if (!s) return;
  s.status = "needs_reconnect";
  s.last_error = String(err || "").slice(0, 300);
  saveSlot(s);
}

function setAccountMeta(n, account) {
  const s = getSlot(n);
  if (!s || !account) return;
  s.label = account.name || s.label;
  s.org_uid = account.org_uid || s.org_uid;
  s.role_label = account.role_label || s.role_label;
  saveSlot(s);
}

/** Refresh one slot in place. Marks it needs_reconnect on invalid_grant. */
async function refreshSlot(n) {
  const s = getSlot(Number(n));
  if (!s) throw new Error(`slot ${n} not found`);
  if (!s.refresh_token) { markDead(n, "no refresh_token"); throw new Error(`slot ${n} has no refresh_token`); }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: s.refresh_token,
      client_id: s.client_id,
    }).toString(),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) {
    markDead(n, `refresh failed ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
    throw new Error(`invalid_grant (slot ${n})`);
  }
  s.access_token = body.access_token;
  if (body.refresh_token) s.refresh_token = body.refresh_token;
  s.token_type = body.token_type || s.token_type;
  s.expires_in = body.expires_in || 86400;
  s.issued_at = new Date().toISOString();
  s.expires_at = new Date(Date.now() + s.expires_in * 1000).toISOString();
  s.status = "ok";
  s.last_error = null;
  s.last_refreshed_at = s.issued_at;
  saveSlot(s);
  return s;
}

function orgForSlot(n) { const s = getSlot(n); return s ? s.org_uid : null; }
function defaultOrg() { const s = selectSlot(); return s ? s.org_uid : null; }

function summary() {
  importLegacy();
  const views = listSlots().map(publicView);
  const active = selectSlot();
  return {
    total: views.length,
    healthy: views.filter((v) => v.status === "ok").length,
    expiring: views.filter((v) => v.status === "expiring").length,
    needs_action: views.filter((v) => v.status === "expired" || v.status === "needs_reconnect").length,
    active_slot: active ? active.slot : null,
    slots: views,
  };
}

module.exports = {
  ensureDirs, health, publicView, listSlots, getSlot, saveSlot, deleteSlot, nextFreeSlot,
  selectSlot, markUsed, markDead, setAccountMeta, refreshSlot, orgForSlot, defaultOrg,
  summary, getState, setState, pendingPath, slotPath, readJson, importLegacy, PROTOCOL,
};
