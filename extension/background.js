import {
  login as authLogin,
  logout as authLogout,
  getAccessToken,
  getAuthState,
} from "./lib/auth-manager.js";

const DEFAULT_API_URL = "https://getupscore.vercel.app";

let state = {
  connected: false,
  statusMessage: "Initializing...",
  apiToken: null,
  apiUrl: DEFAULT_API_URL,
  upworkCookies: false,
  user: null,
};

chrome.runtime.onInstalled.addListener(async () => {
  await loadSettings();
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (err) {
    console.warn("[UpScore] Side panel setup:", err.message);
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

    case "UPWORK_COOKIES":
      handleCapturedCookies(msg.cookies);
      sendResponse({ ok: true });
      break;

    case "GET_UPWORK_COOKIES":
      chrome.cookies.getAll({ url: "https://www.upwork.com" }, (cookies) => {
        if (!chrome.runtime.lastError && cookies && cookies.length > 0) {
          const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join("; ");
          handleCapturedCookies(cookieStr);
          sendResponse({ ok: true, cookies: cookieStr });
        } else {
          sendResponse({ ok: false, error: "No cookies found" });
        }
      });
      return true;

    case "JOBS_CAPTURED":
      handleCapturedJobs(msg.jobs).then(sendResponse);
      return true;

    case "PROFILE_CAPTURED":
      handleCapturedProfile(msg.profile).then(sendResponse);
      return true;

    case "SYNC_COOKIES_FROM_SERVER":
      handleSyncCookiesFromServer().then(sendResponse);
      return true;

    case "GET_VISITOR_GQL_TOKEN":
      chrome.cookies.get({ url: "https://www.upwork.com", name: "visitor_gql_token" }, (cookie) => {
        sendResponse({ token: cookie?.value || null });
      });
      return true;

    // ─── Account / auth ───
    case "GET_AUTH_STATE":
      getAuthState().then((auth) => {
        sendResponse(auth);
      });
      return true;

    case "GET_AUTH_TOKEN":
      resolveAuthToken().then((token) => {
        if (token) sendResponse({ ok: true, token });
        else sendResponse({ ok: false, error: "Not signed in" });
      });
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
          sendResponse({ ok: true, user: state.user });
        })
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;

    case "AUTH_LOGOUT":
      authLogout().then(() => {
        state.user = null;
        state.connected = !!state.apiToken;
        state.statusMessage = state.connected ? "Connected (legacy token)" : "Not signed in";
        broadcastState();
        sendResponse({ ok: true });
      });
      return true;

    default:
      sendResponse({ error: "Unknown message type" });
  }
  return true;
});

async function loadSettings() {
  const result = await chrome.storage.sync.get(["upscore_api_token", "upscore_api_url"]);
  state.apiToken = result.upscore_api_token || null;
  state.apiUrl = result.upscore_api_url || DEFAULT_API_URL;

  const auth = await getAuthState();
  state.user = auth.user || null;
  state.connected = auth.authenticated || !!state.apiToken;
  state.statusMessage = auth.authenticated
    ? (auth.user?.email ? `Signed in as ${auth.user.email}` : "Signed in")
    : state.apiToken
      ? "Connected (legacy token)"
      : "Not signed in";
}

function handleSettingsUpdate(settings) {
  if (settings.api_token !== undefined) {
    state.apiToken = settings.api_token;
    chrome.storage.sync.set({ upscore_api_token: settings.api_token });
  }
  if (settings.api_url !== undefined) {
    state.apiUrl = settings.api_url;
    chrome.storage.sync.set({ upscore_api_url: settings.api_url });
  }
  state.connected = state.connected || !!state.apiToken;
  state.statusMessage = state.connected ? "Connected" : "Not configured";
  broadcastState();
}

/**
 * Prefer the signed-in session token; fall back to a legacy API token so
 * existing installs keep working until they sign in.
 */
async function resolveAuthToken() {
  const sessionToken = await getAccessToken(state.apiUrl);
  if (sessionToken) return sessionToken;
  if (state.apiToken) return state.apiToken;
  return null;
}

async function postToServer(endpoint, body) {
  const token = await resolveAuthToken();
  if (!token) {
    state.connected = false;
    state.statusMessage = "Not signed in — open extension options";
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
      console.warn(`[UpScore] Sync to ${endpoint} failed:`, err.error);
      return { ok: false, error: err.error };
    }
    return await response.json();
  } catch (err) {
    console.warn(`[UpScore] Sync to ${endpoint} error:`, err.message);
    return { ok: false, error: err.message };
  }
}

async function handleCapturedCookies(cookies) {
  const result = await postToServer("/api/extension/cookies/sync", { cookies });
  if (result?.ok !== false) {
    state.upworkCookies = true;
  }
  broadcastState();
}

async function handleCapturedJobs(jobs) {
  const result = await postToServer("/api/extension/jobs/sync", { jobs });
  broadcastState();
  return result;
}

async function handleCapturedProfile(profile) {
  const result = await postToServer("/api/extension/profile/sync", profile);
  broadcastState();
  return result;
}

async function handleSyncCookiesFromServer() {
  const token = await resolveAuthToken();
  if (!token) return { ok: false, error: "Not signed in" };
  try {
    const response = await fetch(`${state.apiUrl}/api/extension/cookies/sync`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "HTTP " + response.status }));
      return { ok: false, error: err.error };
    }
    const data = await response.json();
    state.upworkCookies = true;
    broadcastState();
    return { ok: true, ...data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function broadcastState() {
  chrome.runtime.sendMessage({
    type: "STATUS_UPDATE",
    connected: state.connected,
    message: state.statusMessage,
    upworkCookies: state.upworkCookies,
  }).catch(() => {});
}

(async () => {
  await loadSettings();
})();
