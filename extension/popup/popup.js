/**
 * UpScore Extension Popup — shows monitoring status, stats, and recent captures.
 */
import { getToken, syncJobs } from "../lib/upscore-api.js";

// ─── DOM refs ───
const statusText = document.getElementById("statusText");
const lastCheckEl = document.getElementById("lastCheck");
const statusDot = document.getElementById("statusDot");
const modeLabel = document.getElementById("modeLabel");
const modeDetail = document.getElementById("modeDetail");
const modeIcon = document.getElementById("modeIcon");
const statJobs = document.getElementById("statJobs");
const statSynced = document.getElementById("statSynced");
const statFilters = document.getElementById("statFilters");
const statPending = document.getElementById("statPending");
const jobList = document.getElementById("jobList");
const sectionTitle = document.getElementById("sectionTitle");
const btnCheck = document.getElementById("btnCheck");
const btnOptions = document.getElementById("btnOptions");

// ─── State ───
let jobsCache = [];
let filtersCache = [];

// ─── Init ───
document.addEventListener("DOMContentLoaded", async () => {
  await loadStatus();

  btnCheck.addEventListener("click", handleCheck);
  btnOptions.addEventListener("click", () => chrome.runtime.openOptionsPage());

  // Listen for updates from background worker
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "JOBS_UPDATED") {
      jobsCache = msg.jobs || [];
      filtersCache = msg.filters || [];
      renderJobs();
      updateStats();
    }
    if (msg.type === "STATUS_UPDATE") {
      updateConnectionStatus(msg.connected, msg.message);
      updateLastCheck(msg.lastCheckAt);
      if (msg.lastError) {
        showError(msg.lastError);
      }
    }
  });

  // Request current state from background
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (response) {
      jobsCache = response.jobs || [];
      filtersCache = response.filters || [];
      renderJobs();
      updateStats();
      updateConnectionStatus(response.connected, response.statusMessage);
      updateLastCheck(response.lastCheckAt);
      updateMonitoringMode(response.connected, response.filters?.length || 0);
    }
  });
});

async function loadStatus() {
  const token = await getToken();
  if (!token) {
    updateConnectionStatus(false, "Not connected — open Settings to configure.");
  }
}

function updateConnectionStatus(connected, message) {
  statusDot.className = "status-dot";
  if (connected === true) {
    statusDot.classList.add("connected");
    statusText.textContent = message || "Connected";
  } else if (connected === false) {
    statusDot.classList.add("disconnected");
    statusText.textContent = message || "Disconnected";
    updateMonitoringMode(false, 0);
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

function updateMonitoringMode(connected, filterCount) {
  if (!connected) {
    modeLabel.textContent = "Disconnected";
    modeDetail.textContent = "Configure API token to start monitoring";
    modeIcon.style.color = "var(--text-muted)";
    modeIcon.style.background = "var(--surface)";
    return;
  }

  modeLabel.textContent = "Background Monitoring Active";
  modeIcon.style.color = "var(--accent-green)";
  modeIcon.style.background = "var(--accent-green / 0.1)";

  if (filterCount === 0) {
    modeDetail.textContent = "No filters — create filters in UpScore web app";
    modeDetail.style.color = "var(--accent-amber)";
  } else {
    modeDetail.textContent = `${filterCount} filter(s) active — checking Upwork directly`;
    modeDetail.style.color = "";
  }
}

function showError(errorMsg) {
  statusText.textContent = `⚠ ${errorMsg}`;
  statusText.style.color = "var(--accent-amber)";
}

function updateStats() {
  const synced = jobsCache.filter((j) => j.synced).length;
  const pending = jobsCache.filter((j) => !j.synced).length;
  statJobs.textContent = jobsCache.length;
  statSynced.textContent = synced;
  statFilters.textContent = filtersCache.length || 0;
  statPending.textContent = pending;

  sectionTitle.textContent = `Recent Captures (${jobsCache.length})`;
}

async function handleCheck() {
  btnCheck.disabled = true;
  btnCheck.innerHTML = '<div class="spinner"></div> Checking...';

  try {
    // Tell background to force a check
    chrome.runtime.sendMessage({ type: "FORCE_CHECK" }, () => {
      if (chrome.runtime.lastError) {
        statusText.textContent = "Error: " + chrome.runtime.lastError.message;
      }
    });

    // Wait a moment then refresh
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
        if (response) {
          jobsCache = response.jobs || [];
          filtersCache = response.filters || [];
          renderJobs();
          updateStats();
          updateConnectionStatus(response.connected, response.statusMessage);
          updateLastCheck(response.lastCheckAt);
        }
      });
    }, 3000);
  } catch (err) {
    statusText.textContent = `Check failed: ${err.message}`;
  } finally {
    btnCheck.disabled = false;
    btnCheck.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      Check Now
    `;
  }
}

function renderJobs() {
  if (jobsCache.length === 0) {
    jobList.innerHTML = `<div class="empty-state">No jobs captured yet.<br>The extension checks Upwork automatically.</div>`;
    return;
  }

  // Show latest 15
  const recent = jobsCache.slice().reverse().slice(0, 15);

  jobList.innerHTML = recent
    .map(
      (job) => `
      <div class="job-item">
        <div class="job-title">
          <span class="job-source">${job.source || "capture"}</span>
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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
