/**
 * UpScore API client — communicates with the UpScore backend.
 */
const UPSCORE_API_BASE = (() => {
  // Default to production, override in dev
  return "http://localhost:3000";
})();

const API_BASE = UPSCORE_API_BASE;

/**
 * Get stored API token from chrome storage.
 */
async function getToken() {
  const result = await chrome.storage.sync.get(["upscore_api_token"]);
  return result.upscore_api_token || null;
}

/**
 * Get the configured API URL.
 */
async function getApiUrl() {
  const result = await chrome.storage.sync.get(["upscore_api_url"]);
  return result.upscore_api_url || API_BASE;
}

/**
 * Make an authenticated request to the UpScore API.
 */
async function apiRequest(endpoint, options = {}) {
  const token = await getToken();
  const baseUrl = await getApiUrl();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Register the extension as a device with the UpScore backend.
 * Returns { device_id, api_token }.
 */
async function registerDevice(userId, deviceName) {
  return apiRequest("/api/extension/auth/register", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, device_name: deviceName || "Chrome Extension" }),
  });
}

/**
 * Sync captured jobs to UpScore backend.
 * jobs: Array of { title, url, description, skills, budget, country, posted_at, proposals_count, client_info }
 */
async function syncJobs(jobs) {
  return apiRequest("/api/extension/jobs/sync", {
    method: "POST",
    body: JSON.stringify({ jobs }),
  });
}

/**
 * Get user's active job filters.
 */
async function getFilters() {
  return apiRequest("/api/extension/filters");
}

/**
 * Send a heartbeat to show the extension is active.
 */
async function sendHeartbeat() {
  return apiRequest("/api/extension/heartbeat", {
    method: "POST",
  });
}

export { getToken, getApiUrl, apiRequest, registerDevice, syncJobs, getFilters, sendHeartbeat };
