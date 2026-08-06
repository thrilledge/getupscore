const $ = (id) => document.getElementById(id);

// ─── Views ───
const VIEWS = ["dashboard", "savedjobs", "settings"];
const viewEls = {};
for (const v of VIEWS) viewEls[v] = $(`view-${v}`);

const NAV_IDS = {
  dashboard: "navDashboard",
  savedjobs: "navSavedJobs",
  settings: "navSettings",
};
const navEls = {};
for (const v of VIEWS) navEls[v] = $(NAV_IDS[v]);

const VIEW_TITLES = {
  dashboard: "UpScore",
  savedjobs: "Saved Jobs",
  settings: "Settings",
};

let currentView = "dashboard";
let savedJobsCache = [];
let token = null;
let apiUrl = null;

function showView(name) {
  currentView = name;
  for (const v of VIEWS) {
    viewEls[v].style.display = v === name ? "" : "none";
    if (navEls[v]) navEls[v].classList.toggle("active", v === name);
  }
  // Hide back button — nav tabs are the primary navigation
  $("btnBack").style.display = "none";
  // Update title
  $("appTitle").textContent = VIEW_TITLES[name] || "UpScore";
}

// ─── Status refs ───
const statusText = $("statusText");
const statusDot = $("statusDot");

// ─── Settings refs ───
const apiUrlInput = $("apiUrl");
const apiTokenInput = $("apiToken");
const btnToggleToken = $("btnToggleToken");
const btnTestConnection = $("btnTestConnection");
const btnSave = $("btnSave");
const connectionStatus = $("connectionStatus");

// ─── API helper ───
async function apiCall(path, options = {}) {
  if (!token || !apiUrl) throw new Error("Not connected");
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "HTTP " + response.status }));
    throw new Error(err.error || "Request failed");
  }
  return response.json();
}

// ─── Init ───
document.addEventListener("DOMContentLoaded", async () => {
  // Load settings from storage
  const result = await chrome.storage.sync.get(["upscore_api_url", "upscore_api_token"]);
  apiUrl = result.upscore_api_url || "https://getupscore.vercel.app";
  token = result.upscore_api_token || null;
  apiUrlInput.value = apiUrl;
  apiTokenInput.value = token || "";
  setConnectionStatus(token ? "connected" : "disconnected", token ? "Configured" : "Not connected");

  // View switching
  $("btnSettings")?.addEventListener("click", () => showView("settings"));
  $("btnBack")?.addEventListener("click", () => showView("dashboard"));

  // Nav tabs
  navEls.dashboard?.addEventListener("click", () => showView("dashboard"));
  navEls.savedjobs?.addEventListener("click", () => { showView("savedjobs"); loadSavedJobs(); });
  navEls.settings?.addEventListener("click", () => showView("settings"));

  // Quick actions
  $("btnViewSavedJobs")?.addEventListener("click", () => { showView("savedjobs"); loadSavedJobs(); });

  // Settings
  btnToggleToken.addEventListener("click", () => {
    apiTokenInput.type = apiTokenInput.type === "password" ? "text" : "password";
  });
  btnTestConnection.addEventListener("click", testConnection);
  btnSave.addEventListener("click", saveSettings);

  // Listen for background state
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "STATUS_UPDATE") {
      updateConnectionStatus(msg.connected, msg.message);
    }
  });

  // Initial load
  requestState();
  loadAnalytics();
  setInterval(loadAnalytics, 30000);
});

function requestState() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (!response) return;
    updateConnectionStatus(response.connected, response.statusMessage);
  });
}

function updateConnectionStatus(connected, message) {
  statusDot.className = "dot";
  if (connected === true) {
    statusDot.classList.add("connected");
    statusText.textContent = message || "Connected";
  } else if (connected === false) {
    statusDot.classList.add("disconnected");
    statusText.textContent = message || "Disconnected";
  } else {
    statusDot.classList.add("error");
    statusText.textContent = message || "Error";
  }
}

// ══════════════════════════════════════════════════════════
// ═══  ANALYTICS  ═══
// ══════════════════════════════════════════════════════════
async function loadAnalytics() {
  if (!token) return;
  try {
    const data = await apiCall("/api/extension/analytics");
    $("statSavedJobs").textContent = data.savedJobs ?? 0;
    $("statAnalyses").textContent = data.totalAnalyses ?? 0;
    $("statProposals").textContent = data.totalProposals ?? 0;
    $("statFilters").textContent = data.activeFilters ?? 0;
  } catch {
    // Not connected yet
  }
}

// ══════════════════════════════════════════════════════════
// ═══  SAVED JOBS  ═══
// ══════════════════════════════════════════════════════════
async function loadSavedJobs() {
  if (!token) return;
  const list = $("jobsList");
  const loading = $("jobsLoading");
  const empty = $("jobsEmpty");

  loading.style.display = "";
  list.innerHTML = "";
  empty.style.display = "none";

  try {
    const data = await apiCall("/api/extension/saved-jobs");
    savedJobsCache = data.jobs || [];
    $("jobsCount").textContent = savedJobsCache.length;

    if (savedJobsCache.length === 0) {
      loading.style.display = "none";
      empty.style.display = "";
      return;
    }

    loading.style.display = "none";
    list.innerHTML = savedJobsCache.map(renderJobCard).join("");
  } catch (err) {
    loading.textContent = "Failed to load: " + err.message;
  }
}

function renderJobCard(job) {
  const analysis = job.analysis || {};
  const matchScore = analysis.match_score;
  const scoreClass = matchScore >= 70 ? "high" : matchScore >= 40 ? "mid" : "low";

  const clientScore = job.client_score || job.clientRating || "";
  const clientSpend = job.client_total_spend || job.clientTotalSpend || "";
  const clientHires = job.client_total_jobs_with_hires || job.client_total_hires || "";
  const clientAssignments = job.client_total_assignments || "";
  const clientHours = job.client_hours_count || "";
  const clientReviews = job.client_feedback_count || "";
  const paymentVerified = job.client_payment_verified || job.payment_verified || false;
  const clientCity = job.client_city || "";
  const clientCountry = job.client_country || job.client_location_country || "";
  const clientLocation = [clientCity, clientCountry].filter(Boolean).join(", ");
  const clientIndustry = job.client_industry || "";
  const activeAssignments = job.client_active_assignments || "";

  const budget = job.budget ? `$${job.budget}` : (job.hourly_min ? `$${job.hourly_min}-$${job.hourly_max}/hr` : "");
  const duration = job.duration_label || "";

  return `
    <div class="job-card" data-job-id="${job.id}">
      <div class="job-card-header">
        <div class="job-title">${escapeHtml(job.title || "Untitled")}</div>
        ${matchScore ? `<div class="score-badge ${scoreClass}">${matchScore}</div>` : ""}
      </div>
      <div class="job-card-meta">
        ${budget ? `<span>${escapeHtml(budget)}</span>` : ""}
        ${job.job_type ? `<span>${job.job_type}</span>` : ""}
        ${duration ? `<span>${escapeHtml(duration)}</span>` : ""}
        ${job.posted_at ? `<span>${timeAgo(job.posted_at)}</span>` : ""}
      </div>
      ${clientLocation ? `<div class="job-card-client-row">
        <span class="client-label">Client:</span> ${escapeHtml(clientLocation)}
        ${clientScore ? ` · <strong>${clientScore}</strong>★` : ""}
        ${clientSpend ? ` · $${Number(clientSpend).toLocaleString()} spent` : ""}
        ${paymentVerified ? ' · <span class="verified-badge">✓ Verified</span>' : ""}
      </div>` : ""}
      <div class="job-card-stats">
        ${clientHires ? `<span>${clientHires} hires</span>` : ""}
        ${clientAssignments ? `<span>${clientAssignments} jobs</span>` : ""}
        ${clientHours ? `<span>${Math.round(clientHours)}h logged</span>` : ""}
        ${clientReviews ? `<span>${clientReviews} reviews</span>` : ""}
        ${activeAssignments ? `<span>${activeAssignments} active</span>` : ""}
      </div>
      ${analysis.recommendation ? `<div class="job-card-rec">${escapeHtml(analysis.recommendation)}</div>` : ""}
      <div class="job-card-actions">
        ${job.url ? `<a href="${escapeAttr(job.url)}" target="_blank" rel="noopener noreferrer" class="btn-small">View on Upwork</a>` : ""}
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════
// ═══  SETTINGS  ═══
// ══════════════════════════════════════════════════════════
function setConnectionStatus(state, message) {
  const dot = connectionStatus.querySelector(".dot");
  dot.className = `dot ${state}`;
  connectionStatus.querySelector("span:last-child").textContent = message;
}

async function testConnection() {
  const t = apiTokenInput.value.trim();
  const u = apiUrlInput.value.trim() || "https://getupscore.vercel.app";
  if (!t) {
    setConnectionStatus("disconnected", "Please enter an API token.");
    return;
  }
  setConnectionStatus("idle", "Testing connection...");
  try {
    const response = await fetch(`${u}/api/extension/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
    });
    if (response.ok) {
      const data = await response.json();
      setConnectionStatus("connected", `Connected! Server v${data.version}`);
    } else {
      const data = await response.json().catch(() => ({}));
      setConnectionStatus("error", data.error || `Server responded with ${response.status}`);
    }
  } catch (err) {
    setConnectionStatus("error", `Cannot reach server: ${err.message}`);
  }
}

async function saveSettings() {
  const t = apiTokenInput.value.trim();
  const u = apiUrlInput.value.trim() || "https://getupscore.vercel.app";
  await chrome.storage.sync.set({ upscore_api_token: t, upscore_api_url: u });
  chrome.runtime.sendMessage({
    type: "SETTINGS_UPDATED",
    settings: { api_token: t, api_url: u },
  });
  token = t;
  apiUrl = u;
  setTimeout(() => testConnection(), 500);
  const originalText = btnSave.textContent;
  btnSave.textContent = "Saved!";
  setTimeout(() => { btnSave.textContent = originalText; }, 2000);
}

// ══════════════════════════════════════════════════════════
// ═══  UTILITIES  ═══
// ══════════════════════════════════════════════════════════
function escapeAttr(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  try {
    const now = Date.now();
    const d = new Date(dateStr).getTime();
    if (isNaN(d)) { return dateStr; }
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}
