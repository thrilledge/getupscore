const $ = (id) => document.getElementById(id);

// ─── Views ───
const VIEWS = ["dashboard", "savedjobs", "proposal", "settings"];
const viewEls = {};
for (const v of VIEWS) viewEls[v] = $(`view-${v}`);

const NAV_IDS = {
  dashboard: "navDashboard",
  savedjobs: "navSavedJobs",
  proposal: "navProposal",
  settings: "navSettings",
};
const navEls = {};
for (const v of VIEWS) navEls[v] = $(NAV_IDS[v]);

const VIEW_TITLES = {
  dashboard: "UpScore",
  savedjobs: "Saved Jobs",
  proposal: "Write Proposal",
  settings: "Settings",
};

let currentView = "dashboard";
let savedJobsCache = [];
let token = null;
let apiUrl = null;
let proposalRules = "";

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
  const result = await chrome.storage.sync.get(["upscore_api_url", "upscore_api_token", "upscore_proposal_rules"]);
  apiUrl = result.upscore_api_url || "https://getupscore.vercel.app";
  token = result.upscore_api_token || null;
  proposalRules = result.upscore_proposal_rules || "";
  apiUrlInput.value = apiUrl;
  apiTokenInput.value = token || "";
  $("proposalRules").value = proposalRules;
  setConnectionStatus(token ? "connected" : "disconnected", token ? "Configured" : "Not connected");

  // Check if opened with pending job details — go straight to proposal view
  const pending = await chrome.runtime.sendMessage({ type: "GET_PENDING_JOB_DETAILS" });
  if (pending?.success && pending?.data) {
    pendingJobDetails = pending.data;
    showView("proposal");
    showJobPreview(pendingJobDetails);
  }

  // View switching
  $("btnSettings")?.addEventListener("click", () => showView("settings"));
  $("btnBack")?.addEventListener("click", () => showView("dashboard"));

  // Nav tabs
  navEls.dashboard?.addEventListener("click", () => showView("dashboard"));
  navEls.savedjobs?.addEventListener("click", () => { showView("savedjobs"); loadSavedJobs(); });
  navEls.proposal?.addEventListener("click", () => { showView("proposal"); loadProposalJobs(); });
  navEls.settings?.addEventListener("click", () => showView("settings"));

  // Quick actions
  $("btnViewSavedJobs")?.addEventListener("click", () => { showView("savedjobs"); loadSavedJobs(); });
  $("btnNewProposal")?.addEventListener("click", () => { showView("proposal"); loadProposalJobs(); });

  // Proposal
  $("btnExtractFromTab")?.addEventListener("click", extractJobFromCurrentTab);
  $("btnGenerateProposal")?.addEventListener("click", generateProposal);
  $("btnCopyProposal")?.addEventListener("click", copyProposal);
  $("btnNewProposalAgain")?.addEventListener("click", resetProposal);

  // Settings
  btnToggleToken.addEventListener("click", () => {
    apiTokenInput.type = apiTokenInput.type === "password" ? "text" : "password";
  });
  btnTestConnection.addEventListener("click", testConnection);
  btnSave.addEventListener("click", saveSettings);
  $("btnSaveRules").addEventListener("click", saveProposalRules);

  // Listen for background state
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "STATUS_UPDATE") {
      updateConnectionStatus(msg.connected, msg.message);
    }
    if (msg.type === "OPEN_SIDEPANEL_WITH_JOB" && msg.jobDetails) {
      pendingJobDetails = msg.jobDetails;
      showView("proposal");
      showJobPreview(pendingJobDetails);
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
        <button class="btn-small btn-primary" data-proposal-job-id="${job.id}" data-proposal-title="${escapeAttr(job.title || "")}">Write Proposal</button>
      </div>
    </div>
  `;
}

// Delegate click events for job cards
document.addEventListener("click", (e) => {
  const proposalBtn = e.target.closest("[data-proposal-job-id]");
  if (proposalBtn) {
    const jobId = proposalBtn.dataset.proposalJobId;
    const title = proposalBtn.dataset.proposalTitle;
    showView("proposal");
    loadProposalJobs();
  }
});

// ══════════════════════════════════════════════════════════
// ═══  PROPOSAL  ═══
// ══════════════════════════════════════════════════════════

let pendingJobDetails = null;

async function loadProposalJobs() {
  if (!token) return;

  // Always reset proposal view first
  pendingJobDetails = null;
  $("proposalResult").style.display = "none";
  $("proposalLoading").style.display = "none";
  $("proposalSource").style.display = "";
  $("proposalJobPreview").style.display = "none";
  $("proposalCustomize").style.display = "none";
  $("proposalInstructions").value = "";
  $("proposalText").textContent = "";
  $("proposalScore").innerHTML = "";
  $("reasoningContent").textContent = "";

  const pending = await chrome.runtime.sendMessage({ type: "GET_PENDING_JOB_DETAILS" });
  if (pending?.success && pending?.data) {
    pendingJobDetails = pending.data;
    showJobPreview(pendingJobDetails);
  }
}

async function extractJobFromCurrentTab() {
  const btn = $("btnExtractFromTab");
  btn.textContent = "Fetching...";
  btn.disabled = true;

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab?.url) throw new Error("No active tab URL");

    const ciphertextMatch = activeTab.url.match(/~([a-f0-9]{16,})/);
    if (!ciphertextMatch) throw new Error("Current tab is not an Upwork job page");

    // Step 1: Try DOM extraction (immediate, basic data)
    const domResult = await chrome.tabs.sendMessage(activeTab.id, {
      type: "EXTRACT_JOB_FROM_PAGE",
    });
    if (domResult?.success && domResult?.data) {
      pendingJobDetails = domResult.data;
      showJobPreview(pendingJobDetails);
      btn.textContent = "Loading API...";
    }

    // Step 2: Always try API fetch for rich data (overrides DOM if better)
    try {
      const apiResult = await chrome.tabs.sendMessage(activeTab.id, {
        type: "FETCH_JOB_FROM_API",
        jobUrl: activeTab.url,
      });
      if (apiResult?.success && apiResult?.data) {
        // Merge: use API data as base, fill gaps from DOM
        const merged = { ...(domResult?.data || {}), ...apiResult.data };
        pendingJobDetails = merged;
        showJobPreview(merged);
      }
    } catch (apiErr) {
      console.log("[Sidepanel] API fetch failed (DOM data used):", apiErr.message);
    }

    btn.textContent = "Extract from Current Tab";
    btn.disabled = false;
  } catch (err) {
    btn.textContent = "Failed: " + err.message;
    setTimeout(() => { btn.textContent = "Extract from Current Tab"; btn.disabled = false; }, 2000);
  }
}

function showJobPreview(job) {
  const preview = $("jobPreviewContent");
  const jobTitle = job.title || "Untitled Job";
  const budget = job.budget ? `$${job.budget}` : (job.hourly_min ? `$${job.hourly_min}-$${job.hourly_max}/hr` : "");
  const skills = Array.isArray(job.skills) ? job.skills.join(", ") : "";
  const country = job.clientCountry || job.client_country || job.country || job.client_location_country || "";
  const clientCity = job.client_city || "";
  const clientLocation = [clientCity, country].filter(Boolean).join(", ");
  const proposalsCount = job.proposals_count || job.proposalsCount || "";
  const clientScore = job.client_score || job.client_rating || job.clientRating || "";
  const clientSpend = job.client_total_spend || job.clientTotalSpend || "";
  const clientHires = job.client_total_jobs_with_hires || job.client_total_hires || "";
  const clientAssignments = job.client_total_assignments || "";
  const clientHours = job.client_hours_count || "";
  const clientReviews = job.client_feedback_count || "";
  const activeAssignments = job.client_active_assignments || "";
  const paymentVerified = job.client_payment_verified || job.payment_verified || false;
  const clientIndustry = job.client_industry || "";
  const companySize = job.client_company_size || "";
  const experienceLevel = job.experience_level || "";
  const budgetType = job.budget_type || "";
  const duration = job.duration_label || "";
  const durationWeeks = job.duration_weeks || "";
  const clientMemberSince = job.client_member_since || "";

  preview.innerHTML = `
    <div class="preview-title">${escapeHtml(jobTitle)}</div>
    <div class="preview-meta">
      ${budget ? escapeHtml(budget) : ""}${budget && clientLocation ? " · " : ""}${clientLocation ? escapeHtml(clientLocation) : ""}
      ${duration ? ` · ${escapeHtml(duration)}` : ""}
      ${experienceLevel ? ` · ${escapeHtml(experienceLevel)}` : ""}
    </div>
    ${skills ? `<div class="preview-skills">${escapeHtml(skills)}</div>` : ""}
    <div class="preview-client-block" style="margin-top:8px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;background:#fafafa;">
      <div style="font-weight:600;font-size:12px;color:#374151;margin-bottom:6px;">Client Details</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:11px;color:#555;">
        ${clientScore ? `<div>★ Score: <strong>${clientScore}</strong></div>` : ""}
        ${clientSpend ? `<div>Spent: <strong>$${Number(clientSpend).toLocaleString()}</strong></div>` : ""}
        ${clientHires ? `<div>Hires: <strong>${clientHires}</strong></div>` : ""}
        ${clientAssignments ? `<div>Jobs: <strong>${clientAssignments}</strong></div>` : ""}
        ${clientHours ? `<div>Hours: <strong>${Math.round(clientHours)}</strong></div>` : ""}
        ${clientReviews ? `<div>Reviews: <strong>${clientReviews}</strong></div>` : ""}
        ${activeAssignments ? `<div>Active: <strong>${activeAssignments}</strong></div>` : ""}
        ${proposalsCount ? `<div>Proposals: <strong>${proposalsCount}</strong></div>` : ""}
        ${paymentVerified ? '<div style="color:#16a34a;">✓ Payment Verified</div>' : ""}
        ${clientIndustry ? `<div>Industry: ${escapeHtml(clientIndustry)}</div>` : ""}
        ${companySize ? `<div>Size: ${escapeHtml(companySize)}</div>` : ""}
        ${clientMemberSince ? `<div>Member since: ${escapeHtml(clientMemberSince)}</div>` : ""}
      </div>
    </div>
    ${job.description ? `<div class="preview-desc" style="margin-top:8px;font-size:12px;">${escapeHtml(job.description.slice(0, 500))}${job.description.length > 500 ? "..." : ""}</div>` : ""}
    ${job.url ? `<div class="preview-url" style="margin-top:4px;font-size:12px;"><a href="${escapeAttr(job.url)}" target="_blank" rel="noopener noreferrer">View on Upwork →</a></div>` : ""}
  `;

  $("proposalSource").style.display = "none";
  $("proposalJobPreview").style.display = "";
  $("proposalCustomize").style.display = "";
}

async function generateProposal() {
  if (!pendingJobDetails) return;

  const inlineInstructions = $("proposalInstructions").value.trim();
  const instructions = [proposalRules, inlineInstructions].filter(Boolean).join("\n\n") || undefined;
  const loading = $("proposalLoading");
  const result = $("proposalResult");
  const reasoningEl = $("proposalReasoning");
  const reasoningContent = $("reasoningContent");

  $("proposalSource").style.display = "none";
  $("proposalJobPreview").style.display = "none";
  $("proposalCustomize").style.display = "none";
  loading.style.display = "";
  loading.textContent = "Generating proposal with AI...";
  result.style.display = "none";
  reasoningEl.style.display = "none";

  let body;
  if (pendingJobDetails.jobId) {
    body = JSON.stringify({ jobId: pendingJobDetails.jobId, customInstructions: instructions, stream: true });
  } else {
    body = JSON.stringify({ jobDetails: pendingJobDetails, customInstructions: instructions, stream: true });
  }

  try {
    const response = await fetch(`${apiUrl}/api/proposals/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "HTTP " + response.status }));
      throw new Error(err.error || "Request failed");
    }

    loading.style.display = "none";
    result.style.display = "";
    reasoningEl.style.display = "none";
    $("proposalText").textContent = "";
    $("proposalScore").innerHTML = "";
    reasoningContent.textContent = "";
    let fullProposal = "";
    let reasoningText = "";

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let lastEventType = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          lastEventType = line.slice(7).trim();
          continue;
        }
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (!json) continue;

        try {
          const parsed = JSON.parse(json);

          if (parsed.phase) {
            loading.textContent = parsed.phase === "generating"
              ? "Generating proposal..."
              : `Status: ${parsed.phase}`;
            continue;
          }

          if (parsed.score !== undefined) {
            // 'done' event — show score
            $("proposalScore").innerHTML = `<span class="score-badge ${parsed.score >= 70 ? "high" : parsed.score >= 40 ? "mid" : "low"}">Score: ${parsed.score}</span>`;
            continue;
          }

          if (parsed.text !== undefined) {
            if (lastEventType === "reasoning") {
              reasoningText += parsed.text;
              reasoningContent.textContent = reasoningText;
              reasoningEl.style.display = "";
            } else if (lastEventType === "proposal") {
              fullProposal += parsed.text;
              $("proposalText").textContent = fullProposal;
              $("proposalText").scrollTop = $("proposalText").scrollHeight;
            }
          }
        } catch {}
      }
    }

    // Final score from 'done' event
    // (parsed from the last data line during the loop)
    if (fullProposal.length < 50) {
      $("proposalText").textContent = "Proposal generation returned empty result. Try again.";
    }
  } catch (err) {
    loading.textContent = "Error: " + err.message;
  }
}

function copyProposal() {
  const text = $("proposalText").textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = $("btnCopyProposal");
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = "Copy to Clipboard"; }, 2000);
  }).catch(() => {
    const btn = $("btnCopyProposal");
    btn.textContent = "Copy failed";
    setTimeout(() => { btn.textContent = "Copy to Clipboard"; }, 2000);
  });
}

function resetProposal() {
  pendingJobDetails = null;
  $("proposalResult").style.display = "none";
  $("proposalLoading").style.display = "none";
  $("proposalSource").style.display = "";
  $("proposalJobPreview").style.display = "none";
  $("proposalCustomize").style.display = "none";
  $("proposalInstructions").value = "";
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

async function saveProposalRules() {
  const rules = $("proposalRules").value.trim();
  proposalRules = rules;
  await chrome.storage.sync.set({ upscore_proposal_rules: rules });
  const btn = $("btnSaveRules");
  const originalText = btn.textContent;
  btn.textContent = "Saved!";
  setTimeout(() => { btn.textContent = originalText; }, 2000);
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
