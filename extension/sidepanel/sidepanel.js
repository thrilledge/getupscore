/**
 * UpScore Extension Side Panel — monitoring dashboard in the Chrome sidebar.
 *
 * Communicates with the background service worker to show:
 *  - Connection status & API health
 *  - Job capture stats & latest jobs
 *  - Active filters
 *  - Server session cookie status
 *  - Monitoring controls (check now, interval info)
 */
import { getToken } from "../lib/upscore-api.js";

// ─── DOM refs ───
const $ = (id) => document.getElementById(id);

const statusText = $("statusText");
const statusDot = $("statusDot");
const lastCheckEl = $("lastCheck");

const statJobs = $("statJobs");
const statSynced = $("statSynced");
const statFilters = $("statFilters");
const statPending = $("statPending");

const displayApiUrl = $("displayApiUrl");
const displayApiToken = $("displayApiToken");
const displayGroq = $("displayGroq");
const displayCookies = $("displayCookies");
const displayInterval = $("displayInterval");
const displayLastCheck = $("displayLastCheck");
const displayFiltersCount = $("displayFiltersCount");
const displayCookieTime = $("displayCookieTime");
const displayCookieDomain = $("displayCookieDomain");

const filtersBody = $("filtersBody");
const filtersCount = $("filtersCount");
const jobsBody = $("jobsBody");
const jobsEmpty = $("jobsEmpty");
const jobsList = $("jobsList");
const jobsCount = $("jobsCount");
const monitoringBadge = $("monitoringBadge");
const cookieBadge = $("cookieBadge");
const connectionBody = $("connectionBody");

// ─── State ───
let jobsCache = [];
let filtersCache = [];

// ─── Init ───
document.addEventListener("DOMContentLoaded", async () => {
  // Button handlers
  $("btnRefresh").addEventListener("click", handleRefresh);
  $("btnSettings").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("btnOpenSettings").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("btnOpenOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("btnCheckNow").addEventListener("click", handleCheck);
  $("btnSyncCookies").addEventListener("click", handleSyncCookies);

  // Listen for live updates from background worker
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "JOBS_UPDATED") {
      jobsCache = msg.jobs || [];
      filtersCache = msg.filters || [];
      renderFilters();
      renderJobs();
      updateStats();
    }
    if (msg.type === "STATUS_UPDATE") {
      updateConnectionStatus(msg.connected, msg.message);
      updateLastCheck(msg.lastCheckAt);
      if (msg.lastError) {
        showError(msg.lastError);
      }
      // Update cookie badge from real-time status
      if (msg.upworkCookies !== undefined) {
        if (msg.upworkCookies) {
          cookieBadge.textContent = "Captured";
          cookieBadge.className = "badge active";
        }
        displayCookies.textContent = msg.upworkCookies ? "✅ Captured" : "◻️ Not synced";
      }
    }
  });

  // Request current state from background
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (!response) return;
    jobsCache = response.jobs || [];
    filtersCache = response.filters || [];
    updateAll(response);
  });
});

// ─── Full State Update ───
function updateAll(state) {
  renderFilters();
  renderJobs();
  updateStats();
  updateConnectionStatus(state.connected, state.statusMessage);
  updateLastCheck(state.lastCheckAt);
  updateMonitoringSection(state);
  updateConnectionSection(state);
  updateCookieSection(state);
}

// ─── Connection Section ───
function updateConnectionSection(state) {
  displayApiUrl.textContent = state.apiUrl || "Not set";
  displayApiToken.textContent = state.apiToken ? "••••••••" : "Not set";
  displayGroq.textContent = state.groqConfigured ? "✅ Keys configured" : "❌ Not configured";
  displayCookies.textContent = state.upworkCookies ? "✅ Captured" : "◻️ Not synced";
}

// ─── Monitoring Section ───
function updateMonitoringSection(state) {
  displayInterval.textContent = `${state.checkInterval || 15} min`;
  displayLastCheck.textContent = state.lastCheckAt
    ? formatTimestamp(state.lastCheckAt)
    : "—";
  displayFiltersCount.textContent = state.filters?.length || 0;

  const isActive = state.connected && state.filters?.length > 0;
  monitoringBadge.textContent = isActive ? "Active" : "Idle";
  monitoringBadge.className = "badge " + (isActive ? "active" : "inactive");
}

// ─── Cookie Section ───
function updateCookieSection(state) {
  if (state.upworkCookies) {
    cookieBadge.textContent = "Captured";
    cookieBadge.className = "badge active";
    displayCookieTime.textContent = "Available (auto-synced)";
    displayCookieDomain.textContent = "www.upwork.com";
  } else {
    cookieBadge.textContent = "Waiting";
    cookieBadge.className = "badge inactive";
    displayCookieTime.textContent = "Not captured yet";
    displayCookieDomain.textContent = "—";
  }
}

// ─── Status Bar ───
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

function updateLastCheck(timestamp) {
  if (!timestamp) {
    lastCheckEl.textContent = "";
    return;
  }
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  let text;
  if (diff < 60) text = `${diff}s ago`;
  else if (diff < 3600) text = `${Math.floor(diff / 60)}m ago`;
  else text = `${Math.floor(diff / 3600)}h ago`;
  lastCheckEl.textContent = `Last: ${text}`;
}

function showError(errorMsg) {
  statusText.textContent = `⚠ ${errorMsg}`;
  statusText.style.color = "var(--accent-amber)";
}

// ─── Stats ───
function updateStats() {
  const synced = jobsCache.filter((j) => j.synced).length;
  const pending = jobsCache.filter((j) => !j.synced).length;
  statJobs.textContent = jobsCache.length;
  statSynced.textContent = synced;
  statFilters.textContent = filtersCache.length || 0;
  statPending.textContent = pending;

  jobsCount.textContent = jobsCache.length;
  filtersCount.textContent = filtersCache.length;
}

// ─── Filters List ───
function renderFilters() {
  if (!filtersCache || filtersCache.length === 0) {
    filtersBody.innerHTML = `<div class="empty-state">No filters configured. Create filters in the web app.</div>`;
    return;
  }

  filtersBody.innerHTML = filtersCache
    .map(
      (f) => `
      <div class="filter-item">
        <div>
          <div class="filter-name">${escapeHtml(f.name)}</div>
          <div class="filter-keywords">${escapeHtml(f.keywords?.join(", ") || "")}</div>
        </div>
        <span class="filter-active">✓ Active</span>
      </div>
    `
    )
    .join("");
}

// ─── Jobs List ───
function renderJobs() {
  if (jobsCache.length === 0) {
    jobsEmpty.style.display = "flex";
    jobsList.innerHTML = "";
    return;
  }

  jobsEmpty.style.display = "none";

  // Show latest 20
  const recent = jobsCache.slice().reverse().slice(0, 20);

  jobsList.innerHTML = recent
    .map(
      (job) => `
      <div class="job-item">
        <div class="job-title">
          <span class="job-source ${job.source === "graphql" || job.source === "bg_fetch" ? "graphql" : ""}">${job.source || "capture"}</span>
          ${escapeHtml(job.title || "Untitled")}
          <span class="sync-badge ${job.synced ? "synced" : "pending"}"></span>
        </div>
        <div class="job-meta">
          ${job.budget ? `<span class="tag">💰 ${escapeHtml(job.budget)}</span>` : ""}
          ${job.country ? `<span class="tag">🌍 ${escapeHtml(job.country)}</span>` : ""}
          ${job.skills?.length ? `<span class="tag">🏷 ${escapeHtml(job.skills.slice(0, 2).join(", "))}</span>` : ""}
          ${job.proposals_count ? `<span class="tag">📋 ${job.proposals_count} props</span>` : ""}
          ${job.source === "bg_fetch" || job.source === "bg_fetch_regex" ? `<span class="tag">🤖 Auto</span>` : `<span class="tag">👁 Viewed</span>`}
        </div>
      </div>
    `
    )
    .join("");
}

// ─── Actions ───
async function handleRefresh() {
  $("btnRefresh").classList.add("loading");
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (response) {
      jobsCache = response.jobs || [];
      filtersCache = response.filters || [];
      updateAll(response);
    }
    $("btnRefresh").classList.remove("loading");
  });
}

async function handleCheck() {
  $("btnCheckNow").disabled = true;
  $("btnCheckNow").innerHTML = '<span class="spinner"></span> Checking...';

  try {
    chrome.runtime.sendMessage({ type: "FORCE_CHECK" }, () => {
      if (chrome.runtime.lastError) {
        statusText.textContent = "Error: " + chrome.runtime.lastError.message;
      }
    });

    // Refresh state after a delay
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
        if (response) {
          jobsCache = response.jobs || [];
          filtersCache = response.filters || [];
          updateAll(response);
        }
        $("btnCheckNow").disabled = false;
        $("btnCheckNow").innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Check Now
        `;
      });
    }, 3000);
  } catch (err) {
    statusText.textContent = `Check failed: ${err.message}`;
    $("btnCheckNow").disabled = false;
    $("btnCheckNow").innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      Check Now
    `;
  }
}

// ─── Cookie Sync from Server ───
async function handleSyncCookies() {
  const btn = $("btnSyncCookies");
  const status = $("cookieSyncStatus");
  btn.disabled = true;
  status.textContent = "Syncing...";
  status.className = "sync-status";

  try {
    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "SYNC_COOKIES_FROM_SERVER" },
        (response) => {
          resolve(response || { ok: false, error: "No response from background" });
        }
      );
    });

    if (result.ok) {
      status.textContent = "✅ Synced";
      status.className = "sync-status success";
      displayCookieTime.textContent = result.captured_at
        ? formatTimestamp(result.captured_at)
        : "Available";
      displayCookieDomain.textContent = result.domain || "www.upwork.com";
      cookieBadge.textContent = "Captured";
      cookieBadge.className = "badge active";

      // Refresh full state so Connection section also updates
      chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
        if (response) {
          jobsCache = response.jobs || [];
          filtersCache = response.filters || [];
          updateAll(response);
        }
      });
    } else {
      status.textContent = "⚠ " + (result.error || "Sync failed");
      status.className = "sync-status error";
    }
  } catch (err) {
    status.textContent = "⚠ Error: " + err.message;
    status.className = "sync-status error";
  }

  btn.disabled = false;
  setTimeout(() => {
    status.textContent = "";
    status.className = "sync-status";
  }, 5000);
}

// ─── Utils ───
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatTimestamp(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}
