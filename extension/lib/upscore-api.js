const UPSCORE_API_BASE = "http://localhost:3000";
const API_BASE = UPSCORE_API_BASE;

async function getToken() {
  const result = await chrome.storage.sync.get(["upscore_api_token"]);
  return result.upscore_api_token || null;
}

async function getApiUrl() {
  const result = await chrome.storage.sync.get(["upscore_api_url"]);
  return result.upscore_api_url || API_BASE;
}

async function apiRequest(endpoint, options = {}) {
  const token = await getToken();
  const baseUrl = await getApiUrl();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const response = await fetch(`${baseUrl}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API error: ${response.status}`);
  }
  return response.json();
}

async function registerDevice(userId, deviceName) {
  return apiRequest("/api/extension/auth/register", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, device_name: deviceName || "Chrome Extension" }),
  });
}

async function syncJobs(jobs) {
  return apiRequest("/api/extension/jobs/sync", {
    method: "POST",
    body: JSON.stringify({ jobs }),
  });
}

async function syncProfile(profile) {
  return apiRequest("/api/extension/profile/sync", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

async function syncContracts(contracts) {
  return apiRequest("/api/extension/contracts/sync", {
    method: "POST",
    body: JSON.stringify({ contracts }),
  });
}

async function syncWorkDiary(entries) {
  return apiRequest("/api/extension/work-diary/sync", {
    method: "POST",
    body: JSON.stringify({ entries }),
  });
}

export { getToken, getApiUrl, apiRequest, registerDevice, syncJobs, syncProfile, syncContracts, syncWorkDiary };
