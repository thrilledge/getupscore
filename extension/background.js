const DEFAULT_API_URL = "https://getupscore.vercel.app";

let state = {
  connected: false,
  statusMessage: "Initializing...",
  apiToken: null,
  apiUrl: DEFAULT_API_URL,
  upworkCookies: false,
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

    case "TALENT_CAPTURED":
      handleTalentCaptured(msg.skill, msg.freelancerCount).then(sendResponse);
      return true;

    case "CHECK_COMPETITION":
      checkCompetition().then(sendResponse);
      return true;

    case "SYNC_COOKIES_FROM_SERVER":
      handleSyncCookiesFromServer().then(sendResponse);
      return true;

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

// ─── Skill competition (freelancer counts from talent search) ───
const talentWaiters = new Map();

async function handleTalentCaptured(skill, freelancerCount) {
  if (!skill || freelancerCount == null) return { ok: false, error: "Missing data" };
  const waiter = talentWaiters.get(skill);
  if (waiter) {
    clearTimeout(waiter.timer);
    talentWaiters.delete(skill);
    waiter.resolve(freelancerCount);
  }
  const result = await postToServer("/api/extension/competition/sync", {
    skills: [{ skill, freelancerCount }],
  });
  return result;
}

function waitForTalentCapture(skill, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      talentWaiters.delete(skill);
      resolve(null);
    }, timeoutMs);
    talentWaiters.set(skill, { resolve, timer });
  });
}

async function checkCompetition() {
  if (!state.connected || !state.apiToken) return { ok: false, error: "Not connected" };
  try {
    const response = await fetch(`${state.apiUrl}/api/extension/competition/pending`, {
      headers: {
        Authorization: `Bearer ${state.apiToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { ok: false, error: err.error || "HTTP " + response.status };
    }
    const data = await response.json();
    const skills = Array.isArray(data.skills) ? data.skills : [];
    if (skills.length === 0) {
      return { ok: true, checked: 0, total: 0, results: [] };
    }

    const results = [];
    let checked = 0;
    for (const skill of skills) {
      try {
        const url = `https://www.upwork.com/nx/search/talent/?q=${encodeURIComponent(skill)}&nbs=1`;
        const tab = await chrome.tabs.create({ url, active: false });
        const count = await waitForTalentCapture(skill, 30000);
        try {
          await chrome.tabs.remove(tab.id);
        } catch { /* tab may have closed itself */ }
        results.push({ skill, freelancerCount: count });
        if (count != null) checked++;
        await new Promise((r) => setTimeout(r, 1200));
      } catch (err) {
        console.warn(`[UpScore] Competition check failed for "${skill}":`, err.message);
        results.push({ skill, freelancerCount: null });
      }
    }
    return { ok: true, checked, total: skills.length, results };
  } catch (err) {
    return { ok: false, error: err.message };
  }
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
  }).catch(() => {});
}

(async () => {
  await loadSettings();
})();
