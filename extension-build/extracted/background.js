import {
  login as authLogin,
  logout as authLogout,
  getAccessToken,
  getAuthState,
  setSession as authSetSession,
} from "./lib/auth-manager.js";

const DEFAULT_API_URL = "https://www.getupscore.com/";

let state = {
  connected: false,
  statusMessage: "Initializing...",
  apiToken: null,
  apiUrl: DEFAULT_API_URL,
  user: null,
};

chrome.runtime.onInstalled.addListener(async () => {
  await loadSettings();
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (err) {
    console.warn("[Get UpScore] Side panel setup:", err.message);
  }
  broadcastState();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadSettings();
  broadcastState();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case "GET_STATE":
      sendResponse(state);
      break;

    case "SETTINGS_UPDATED":
      handleSettingsUpdate(msg.settings);
      sendResponse({ ok: true });
      break;

    case "JOBS_CAPTURED":
      handleCapturedJobs(msg.jobs).then(sendResponse);
      return true;

    case "PROFILE_CAPTURED":
      handleCapturedProfile(msg.profile).then(sendResponse);
      return true;

    case "GET_VISITOR_GQL_TOKEN":
      chrome.cookies.get({ url: "https://www.upwork.com", name: "visitor_gql_token" }, (cookie) => {
        sendResponse({ token: cookie?.value || null });
      });
      return true;

    case "OPEN_MY_PROFILE":
      openMyProfile().then(sendResponse);
      return true;

    // ─── Account / auth ───
    case "GET_AUTH_STATE":
      getAuthState().then(async (auth) => {
        if (!auth.authenticated) {
          const imported = await importSessionFromCookies();
          if (imported) {
            await applyImportedSession(imported);
            const updated = await getAuthState();
            sendResponse(updated);
            return;
          }
        }
        sendResponse(auth);
      });
      return true;

    case "GET_AUTH_TOKEN":
      resolveAuthToken().then(async (token) => {
        if (!token) {
          const imported = await importSessionFromCookies();
          if (imported) {
            await applyImportedSession(imported);
            token = await resolveAuthToken();
          }
        }
        if (token) sendResponse({ ok: true, token });
        else sendResponse({ ok: false, error: "Not signed in" });
      });
      return true;

    // Session detected on the dashboard (user signed in there). The
    // dashboard-bridge content script forwards it here so the extension
    // picks up the same account automatically.
    case "AUTH_TOKEN_RECEIVED":
      authSetSession({ session: msg.session, user: msg.user })
        .then((session) => {
          state.user = session?.user || null;
          state.connected = !!session;
          state.statusMessage = session?.user?.email
            ? `Signed in as ${session.user.email}`
            : session
              ? "Signed in"
              : "Not signed in";
          broadcastState();
          broadcastAuth();
          sendResponse({ ok: !!session, user: state.user });
        })
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;

    case "AUTH_LOGIN":
      authLogin(state.apiUrl, msg.email, msg.password)
        .then((session) => {
          state.user = session.user || null;
          state.connected = true;
          state.statusMessage = state.user?.email
            ? `Signed in as ${state.user.email}`
            : "Signed in";
          broadcastState();
          broadcastAuth();
          sendResponse({ ok: true, user: state.user });
        })
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;

    case "AUTH_LOGOUT":
      authLogout().then(async () => {
        state.user = null;
        state.apiToken = null;
        state.connected = false;
        state.statusMessage = "Not signed in";
        await chrome.storage.sync.remove("upscore_api_token").catch(() => { });
        broadcastState();
        broadcastAuth();
        sendResponse({ ok: true });
      });
      return true;

    case "PROXY_FETCH": {
      const { url, options } = msg;
      (async () => {
        try {
          let target;
          try {
            target = new URL(url);
          } catch {
            return sendResponse({ ok: false, error: "Invalid URL" });
          }
          if (new URL(state.apiUrl).origin !== target.origin) {
            return sendResponse({ ok: false, error: "Blocked origin" });
          }
          const resp = await fetch(url, options);
          if (options && options.method === "GET" || (!options || !options.method || options.method === "GET")) {
            const json = await resp.json();
            sendResponse({ ok: resp.ok, status: resp.status, data: json });
          } else {
            const text = await resp.text();
            sendResponse({ ok: resp.ok, status: resp.status, body: text, headers: Object.fromEntries(resp.headers.entries()) });
          }
        } catch (err) {
          sendResponse({ ok: false, error: err.message || "Network error" });
        }
      })();
      return true;
    }

    default:
      sendResponse({ error: "Unknown message type" });
  }
  return true;
});

async function loadSettings() {
  const result = await chrome.storage.sync.get(["upscore_api_url"]);
  state.apiToken = null;
  state.apiUrl = result.upscore_api_url || DEFAULT_API_URL;

  const auth = await getAuthState();
  state.user = auth.user || null;
  state.connected = auth.authenticated;
  state.statusMessage = auth.authenticated
    ? (auth.user?.email ? `Signed in as ${auth.user.email}` : "Signed in")
    : "Not signed in";

  if (!state.connected) {
    const imported = await importSessionFromCookies();
    if (imported) await applyImportedSession(imported);
  }
  broadcastAuth();
}

function handleSettingsUpdate(settings) {
  if (settings.api_url !== undefined) {
    state.apiUrl = settings.api_url;
    chrome.storage.sync.set({ upscore_api_url: settings.api_url });
  }
  broadcastState();
}

/**
 * Session-only auth: the signed-in session token (auto-refreshed). Legacy
 * API tokens are no longer accepted so logout fully disables the extension.
 */
async function resolveAuthToken() {
  return getAccessToken(state.apiUrl);
}

// ─── Dashboard session import ───
// The dashboard (@supabase/ssr createBrowserClient) keeps its session in
// `sb-<ref>-auth-token` cookies (`base64-` prefix + base64url, chunked as
// `.0`, `.1`, ...). The extension has `cookies` permission + host access to
// the dashboard, so the background reads them DIRECTLY — no content script or
// open dashboard tab required. This is what makes "sign in on the dashboard →
// extension signed in" deterministic.
const DASHBOARD_COOKIE_RE = /^(__Secure-|__Host-)?sb-.+-auth-token(\.[0-9]+)?$/;
let lastImportedAccessToken = null;

function fromBase64URL(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function decodeSessionValue(raw) {
  if (!raw) return null;
  let value = raw;
  if (value.startsWith("base64-")) {
    value = value.slice("base64-".length);
  }
  if (!(typeof value === "string" && value.trim().startsWith("{"))) {
    try {
      value = fromBase64URL(value);
    } catch {
      return null;
    }
  }
  try {
    const obj = JSON.parse(value);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

function extractSessionPayload(obj) {
  if (!obj) return null;
  const s = obj?.currentSession || obj?.session || obj?.data?.session || obj;
  if (s?.access_token && s?.refresh_token) {
    return {
      session: {
        access_token: s.access_token,
        refresh_token: s.refresh_token,
        expires_at: s.expires_at ?? null,
        expires_in: s.expires_in ?? null,
      },
      user: {
        id: s.user?.id ?? null,
        email: s.user?.email ?? null,
        display_name:
          s.user?.user_metadata?.full_name ||
          s.user?.user_metadata?.name ||
          s.user?.email ||
          "",
      },
    };
  }
  return null;
}

function getCookiesForUrl(url) {
  return new Promise((resolve) => {
    try {
      chrome.cookies.getAll({ url }, (cookies) => {
        const err = chrome.runtime.lastError;
        if (err) return resolve({ error: err.message, cookies: [] });
        resolve({ error: null, cookies: cookies || [] });
      });
    } catch (e) {
      resolve({ error: e.message, cookies: [] });
    }
  });
}

const CANDIDATE_URLS = [
  "https://www.getupscore.com/",
  "https://getupscore.com/",
];

async function scanCandidateOrigins() {
  const results = [];
  const seen = new Set();
  for (const url of [state.apiUrl + "/", ...CANDIDATE_URLS]) {
    const norm = url.replace(/\/+$/, "") + "/";
    if (seen.has(norm)) continue;
    seen.add(norm);
    let error = null;
    let cookies = [];
    const { error: urlErr, cookies: urlCookies } = await getCookiesForUrl(norm);
    cookies = urlCookies || [];
    error = urlErr;
    const sessionCookies = cookies.filter((c) => DASHBOARD_COOKIE_RE.test(c.name));
    results.push({
      url: norm,
      error,
      totalCookies: cookies.length,
      sessionCookies,
    });
  }
  return results;
}

async function importSessionFromCookies() {
  try {
    const origins = await scanCandidateOrigins();
    for (const origin of origins) {
      const { url, sessionCookies } = origin;
      if (!sessionCookies || sessionCookies.length === 0) continue;
      const map = {};
      for (const c of sessionCookies) map[c.name] = c.value;
      const bases = new Set(Object.keys(map).map((name) => name.replace(/\.[0-9]+$/, "")));
      for (const base of bases) {
        const names = Object.keys(map)
          .filter((n) => n === base || n.startsWith(base + "."))
          .sort((a, b) => {
            if (a === base) return -1;
            if (b === base) return 1;
            return parseInt(a.split(".").pop(), 10) - parseInt(b.split(".").pop(), 10);
          });
        const combined = names.map((n) => map[n]).join("");
        const decoded = decodeSessionValue(combined);
        const payload = extractSessionPayload(decoded);
        if (payload) {
          const session = await authSetSession(payload);
          if (session) {
            return payload;
          }
        }
      }
    }
  } catch (err) {
    console.warn("[Get UpScore] cookie import:", err.message);
  }
  return null;
}

async function applyImportedSession(payload) {
  if (!payload) return false;
  if (lastImportedAccessToken === payload.session.access_token) return false;
  lastImportedAccessToken = payload.session.access_token;
  state.user = payload.user || null;
  state.connected = true;
  state.statusMessage = payload.user?.email
    ? `Signed in as ${payload.user.email}`
    : "Signed in";
  broadcastState();
  broadcastAuth();
  return true;
}

const UPWORK_LOGIN_URL = "https://www.upwork.com/nx/find-work/";

async function openMyProfile() {
  const PROFILE_ME = "https://www.upwork.com/freelancers/me/";
  try {
    // No profile-UUID scraping: just take the user to their own Upwork
    // profile. The content script reads the profile off the page they land on
    // and syncs it automatically.
    const tabs = await chrome.tabs.query({ url: "https://www.upwork.com/*" });
    if (tabs.length > 0) {
      await chrome.tabs.update(tabs[0].id, { active: true, url: PROFILE_ME });
      return { ok: true, url: PROFILE_ME, tabId: tabs[0].id };
    }
    const tab = await chrome.tabs.create({ url: PROFILE_ME });
    return { ok: true, url: PROFILE_ME, tabId: tab?.id ?? null };
  } catch (err) {
    console.warn("[Get UpScore] openMyProfile:", err.message);
  }
  const tab = await chrome.tabs.create({ url: PROFILE_ME });
  return { ok: true, url: PROFILE_ME, tabId: tab?.id ?? null };
}

async function postToServer(endpoint, body) {
  const token = await resolveAuthToken();
  if (!token) {
    state.connected = false;
    state.statusMessage = "Not signed in — sign in to continue";
    broadcastState();
    return { ok: false, error: "Not signed in" };
  }
  try {
    const response = await fetch(`${state.apiUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "HTTP " + response.status }));
      console.warn(`[Get UpScore] Sync to ${endpoint} failed:`, err.error);
      return { ok: false, error: err.error };
    }
    return await response.json();
  } catch (err) {
    console.warn(`[Get UpScore] Sync to ${endpoint} error:`, err.message);
    return { ok: false, error: err.message };
  }
}

async function handleCapturedJobs(jobs) {
  const result = await postToServer("/api/extension/jobs/sync", { jobs });
  broadcastState();
  return result;
}

async function handleCapturedProfile(profile) {
  const result = await postToServer("/api/extension/profile/sync", profile);
  broadcastState();
  return { ok: result?.ok !== false, created: !!result?.created, changed: result?.changed || [], error: result?.error };
}

function broadcastState() {
  chrome.runtime.sendMessage({
    type: "STATUS_UPDATE",
    connected: state.connected,
    message: state.statusMessage,
  }).catch(() => { });
}

function broadcastAuth() {
  chrome.runtime.sendMessage({
    type: "AUTH_UPDATED",
    authenticated: state.connected && !!state.user,
  }).catch(() => { });
}

chrome.alarms.create("upscore-session-import", { periodInMinutes: 5 }).catch(() => { });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "upscore-session-import") return;
  const imported = await importSessionFromCookies();
  if (imported) await applyImportedSession(imported);
});

(async () => {
  await loadSettings();
})();
