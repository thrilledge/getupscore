const DEFAULT_API_URL = "http://localhost:3000";

let state = {
  connected: false,
  statusMessage: "Initializing...",
  apiToken: null,
  apiUrl: DEFAULT_API_URL,
  upworkCookies: false,
  pendingJobDetails: null,
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
          handleCapturedCookies(cookies);
        }
      });
      sendResponse({ ok: true });
      break;

    case "JOBS_CAPTURED":
      handleCapturedJobs(msg.jobs).then(sendResponse);
      return true;

    case "PROFILE_CAPTURED":
      console.log("[UpScore BG] PROFILE_CAPTURED received", msg.profile?.title);
      handleCapturedProfile(msg.profile).then(sendResponse);
      return true;

    case "CONTRACTS_CAPTURED":
      handleCapturedContracts(msg.contracts).then(sendResponse);
      return true;

    case "WORK_DIARY_CAPTURED":
      handleCapturedWorkDiary(msg.entries).then(sendResponse);
      return true;

    case "SYNC_COOKIES_FROM_SERVER":
      handleSyncCookiesFromServer().then(sendResponse);
      return true;

    case "OPEN_SIDEPANEL_WITH_JOB":
      state.pendingJobDetails = msg.jobDetails;
      chrome.sidePanel.open({ tabId: sender.tab?.id }).catch(() => {}).then(() => {
        broadcastState();
        sendResponse({ ok: true });
      });
      return true;

    case "GET_PENDING_JOB_DETAILS": {
      const details = state.pendingJobDetails;
      state.pendingJobDetails = null;
      sendResponse(details);
      break;
    }

    case "GET_VISITOR_GQL_TOKEN":
      chrome.cookies.get({ url: "https://www.upwork.com", name: "visitor_gql_token" }, (cookie) => {
        sendResponse({ token: cookie?.value || null });
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
  state.connected = !!state.apiToken;
  state.statusMessage = state.connected ? "Connected" : "Not configured";
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
  state.connected = !!state.apiToken;
  state.statusMessage = state.connected ? "Connected" : "Not configured";
  broadcastState();
}

async function postToServer(endpoint, body) {
  if (!state.connected || !state.apiToken) return;
  try {
    const response = await fetch(`${state.apiUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.apiToken}`,
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

async function handleCapturedContracts(contracts) {
  const result = await postToServer("/api/extension/contracts/sync", { contracts });
  broadcastState();
  return result;
}

async function handleCapturedWorkDiary(entries) {
  const result = await postToServer("/api/extension/work-diary/sync", { entries });
  broadcastState();
  return result;
}

async function handleSyncCookiesFromServer() {
  if (!state.connected || !state.apiToken) return { ok: false, error: "Not connected" };
  try {
    const response = await fetch(`${state.apiUrl}/api/extension/cookies/sync`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${state.apiToken}`,
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
    apiToken: state.apiToken,
    apiUrl: state.apiUrl,
  }).catch(() => {});
}

(async () => {
  await loadSettings();
})();
