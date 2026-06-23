const $ = (id) => document.getElementById(id);

// ─── Views ───
const VIEWS = ["dashboard", "savedjobs", "proposal", "clients", "settings"];
const viewEls = {};
for (const v of VIEWS) viewEls[v] = $(`view-${v}`);

let currentView = "dashboard";
let savedJobsCache = [];
let token = null;
let apiUrl = null;
let proposalRules = "";

function showView(name) {
  currentView = name;
  for (const v of VIEWS) {
    viewEls[v].style.display = v === name ? "" : "none";
  }
  // Show back button for sub-views
  const backBtn = $("btnBack");
  backBtn.style.display = name === "dashboard" || name === "settings" ? "none" : "";
  // Update title
  $("appTitle").textContent =
    name === "dashboard" ? "UpScore" :
    name === "savedjobs" ? "Saved Jobs" :
    name === "proposal" ? "Write Proposal" :
    name === "clients" ? "Client History" :
    name === "settings" ? "Settings" : "UpScore";
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
  apiUrl = result.upscore_api_url || "http://localhost:3000";
  token = result.upscore_api_token || null;
  proposalRules = result.upscore_proposal_rules || "";
  apiUrlInput.value = apiUrl;
  apiTokenInput.value = token || "";
  $("proposalRules").value = proposalRules;
  setConnectionStatus(token ? "connected" : "disconnected", token ? "Configured" : "Not connected");

  // View switching
  $("btnSettings").addEventListener("click", () => showView("settings"));
  $("btnBack").addEventListener("click", () => showView("dashboard"));

  // Quick actions
  $("btnViewSavedJobs").addEventListener("click", () => { showView("savedjobs"); loadSavedJobs(); });
  $("btnNewProposal").addEventListener("click", () => { showView("proposal"); loadProposalJobs(); });
  $("btnClientHistory").addEventListener("click", () => { showView("clients"); loadClientHistory(); });

  // Proposal
  document.querySelectorAll(".source-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchProposalSource(tab.dataset.tab));
  });
  $("btnExtractFromTab").addEventListener("click", extractJobFromCurrentTab);
  $("btnFetchJobUrl").addEventListener("click", fetchJobFromUrl);
  $("proposalJobSelect").addEventListener("change", () => onProposalJobSelected());
  $("btnGenerateProposal").addEventListener("click", generateProposal);
  $("btnCopyProposal").addEventListener("click", copyProposal);
  $("btnNewProposalAgain").addEventListener("click", resetProposal);

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
  const oppScore = analysis.opportunity_score;
  const scoreClass = matchScore >= 70 ? "high" : matchScore >= 40 ? "mid" : "low";

  return `
    <div class="job-card" data-job-id="${job.id}">
      <div class="job-card-header">
        <div class="job-title">${escapeHtml(job.title || "Untitled")}</div>
        ${matchScore ? `<div class="score-badge ${scoreClass}">${matchScore}</div>` : ""}
      </div>
      <div class="job-card-meta">
        ${job.client_country ? `<span>${escapeHtml(job.client_country)}</span>` : ""}
        ${job.budget ? `<span>$${job.budget}</span>` : job.hourly_min ? `<span>$${job.hourly_min}-$${job.hourly_max}/hr</span>` : ""}
        ${job.job_type ? `<span>${job.job_type}</span>` : ""}
        ${job.posted_at ? `<span>${timeAgo(job.posted_at)}</span>` : ""}
      </div>
      ${analysis.recommendation ? `<div class="job-card-rec">${escapeHtml(analysis.recommendation)}</div>` : ""}
      <div class="job-card-actions">
        ${job.url ? `<a href="${job.url}" target="_blank" class="btn-small">View on Upwork</a>` : ""}
        <button class="btn-small btn-primary" data-proposal-job-id="${job.id}" data-proposal-title="${escapeHtml(job.title || "")}">Write Proposal</button>
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
    loadProposalJobs(jobId);
  }
});

// ══════════════════════════════════════════════════════════
// ═══  PROPOSAL  ═══
// ══════════════════════════════════════════════════════════

let pendingJobDetails = null;
let currentSource = "tab";

function switchProposalSource(source) {
  currentSource = source;
  document.querySelectorAll(".source-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === source);
  });
  $("proposalSourceTab").style.display = source === "tab" ? "" : "none";
  $("proposalSourceUrl").style.display = source === "url" ? "" : "none";
  $("proposalSourceSaved").style.display = source === "saved" ? "" : "none";
}

async function loadProposalJobs(selectJobId) {
  if (!token) return;

  // Check if we have a pending job from background (e.g. "Write with AI" button)
  const pending = await chrome.runtime.sendMessage({ type: "GET_PENDING_JOB_DETAILS" });
  if (pending?.success && pending?.data) {
    pendingJobDetails = pending.data;
    showJobPreview(pendingJobDetails);
    return;
  }

  const select = $("proposalJobSelect");

  if (savedJobsCache.length === 0) {
    try {
      const data = await apiCall("/api/extension/saved-jobs");
      savedJobsCache = data.jobs || [];
    } catch {}
  }

  select.innerHTML = '<option value="">— Select a saved job —</option>';
  for (const job of savedJobsCache) {
    const option = document.createElement("option");
    option.value = job.id;
    option.textContent = job.title || "Untitled";
    select.appendChild(option);
  }

  if (selectJobId) {
    select.value = selectJobId;
    onProposalJobSelected();
  }
}

// Fetch job details from Upwork's API via the content script (GraphQL)
async function fetchJobViaApi(jobUrl) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  if (!activeTab?.id) throw new Error("No active tab");

  const result = await chrome.tabs.sendMessage(activeTab.id, {
    type: "FETCH_JOB_FROM_API",
    jobUrl: jobUrl,
  });
  if (!result?.success) throw new Error(result?.error || "Could not fetch job");
  return result.data;
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

async function fetchJobFromUrl() {
  const url = $("jobUrlInput").value.trim();
  if (!url) return;

  const btn = $("btnFetchJobUrl");
  btn.textContent = "Fetching...";
  btn.disabled = true;

  try {
    const ciphertextMatch = url.match(/~([a-f0-9]{16,})/);
    if (!ciphertextMatch) throw new Error("Invalid job URL — could not find job ciphertext");

    const data = await fetchJobViaApi(url);
    pendingJobDetails = data;
    showJobPreview(pendingJobDetails);
    btn.textContent = "Fetch Job Details";
    btn.disabled = false;
  } catch (err) {
    btn.textContent = "Failed: " + err.message;
    setTimeout(() => { btn.textContent = "Fetch Job Details"; btn.disabled = false; }, 2000);
  }
}

function onProposalJobSelected() {
  const select = $("proposalJobSelect");
  const jobId = select.value;
  if (!jobId) {
    $("proposalJobPreview").style.display = "none";
    $("proposalCustomize").style.display = "none";
    return;
  }

  const job = savedJobsCache.find((j) => j.id === jobId);
  if (job) {
    pendingJobDetails = { jobId: job.id };
    showJobPreview(job);
  }
}

function showJobPreview(job) {
  const preview = $("jobPreviewContent");
  const jobTitle = job.title || "Untitled Job";
  const budget = job.budget || (job.hourly_min ? `$${job.hourly_min}-$${job.hourly_max}/hr` : "");
  const skills = Array.isArray(job.skills) ? job.skills.join(", ") : "";
  const country = job.clientCountry || job.client_country || job.country || "";
  const proposalsCount = job.proposals_count || job.proposalsCount || "";
  const clientRating = job.client_rating || job.clientRating || "";
  const clientSpend = job.client_total_spend || job.clientTotalSpend || "";
  const clientHireRate = job.client_hire_rate_pct || job.client_hire_rate || job.clientHireRate || "";
  const clientMemberSince = job.client_member_since || "";
  const paymentVerified = job.client_payment_verified || job.payment_verified || "";
  const experienceLevel = job.experience_level || "";
  const budgetType = job.budget_type || "";
  const connectsRequired = job.connects_required || "";

  preview.innerHTML = `
    <div class="preview-title">${escapeHtml(jobTitle)}</div>
    <div class="preview-meta">
      ${budget ? `${escapeHtml(budget)}` : ""}${budget && country ? " · " : ""}${country ? escapeHtml(country) : ""}
      ${budgetType ? ` · ${escapeHtml(budgetType)}` : ""}
      ${experienceLevel ? ` · ${escapeHtml(experienceLevel)}` : ""}
    </div>
    ${skills ? `<div class="preview-skills">${escapeHtml(skills)}</div>` : ""}
    <div class="preview-details" style="font-size:12px;color:#666;margin-top:4px;">
      ${proposalsCount ? `Proposals: ${proposalsCount} | ` : ""}
      ${clientRating ? `Rating: ${clientRating} | ` : ""}
      ${clientSpend ? `Spent: $${clientSpend} | ` : ""}
      ${clientHireRate ? `Hire Rate: ${clientHireRate}% | ` : ""}
      ${connectsRequired ? `Connects: ${connectsRequired} | ` : ""}
      ${paymentVerified ? "✓ Payment Verified" : ""}
    </div>
    ${clientMemberSince ? `<div class="preview-member" style="font-size:12px;color:#666;">Client since: ${escapeHtml(clientMemberSince)}</div>` : ""}
    ${job.description ? `<div class="preview-desc" style="margin-top:8px;">${escapeHtml(job.description.slice(0, 500))}${job.description.length > 500 ? "..." : ""}</div>` : ""}
    ${job.url ? `<div class="preview-url" style="margin-top:4px;"><a href="${job.url}" target="_blank">View on Upwork →</a></div>` : ""}
    ${job.client_recent_history?.length ? `<div class="preview-history" style="margin-top:8px;font-size:12px;">
      <strong>Client's Recent Jobs:</strong>
      ${job.client_recent_history.slice(0, 3).map(h =>
        `<div style="margin:2px 0;">• ${escapeHtml(h.title)}${h.rating ? ` (${h.rating}★)` : ""}</div>`
      ).join("")}
      ${job.client_recent_history.length > 3 ? `<div>+${job.client_recent_history.length - 3} more</div>` : ""}
    </div>` : ""}
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

  $("proposalSource").style.display = "none";
  $("proposalJobPreview").style.display = "none";
  $("proposalCustomize").style.display = "none";
  loading.style.display = "";
  result.style.display = "none";

  let body;
  if (pendingJobDetails.jobId) {
    body = JSON.stringify({ jobId: pendingJobDetails.jobId, customInstructions: instructions });
  } else {
    body = JSON.stringify({ jobDetails: pendingJobDetails, customInstructions: instructions });
  }

  try {
    const data = await apiCall("/api/proposals/generate", {
      method: "POST",
      body,
    });

    loading.style.display = "none";

    if (data.ok) {
      result.style.display = "";
      $("proposalScore").innerHTML = data.score ? `<span class="score-badge ${data.score >= 70 ? "high" : data.score >= 40 ? "mid" : "low"}">Score: ${data.score}</span>` : "";
      $("proposalText").textContent = data.proposal;
    } else {
      loading.textContent = "Generation failed: " + (data.error || "Unknown error");
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
  $("jobUrlInput").value = "";
  switchProposalSource("tab");
}

// ══════════════════════════════════════════════════════════
// ═══  CLIENT HISTORY  ═══
// ══════════════════════════════════════════════════════════
async function loadClientHistory() {
  if (!token) return;
  const list = $("clientsList");
  const loading = $("clientsLoading");
  const empty = $("clientsEmpty");

  loading.style.display = "";
  list.innerHTML = "";
  empty.style.display = "none";

  try {
    let jobs = savedJobsCache;
    if (jobs.length === 0) {
      const data = await apiCall("/api/extension/saved-jobs");
      jobs = data.jobs || [];
    }

    const clients = jobs
      .filter(j => j.client_name || j.client_country)
      .reduce((acc, job) => {
        const key = job.client_name || job.client_country || "unknown";
        if (!acc[key]) {
          acc[key] = {
            name: job.client_name || "Unknown Client",
            country: job.client_country || "",
            rating: job.client_rating,
            totalSpend: job.client_total_spend,
            totalHires: job.client_total_hires,
            totalAssignments: job.client_total_assignments,
            hireRate: job.client_hire_rate,
            memberSince: job.client_member_since,
            jobs: [],
          };
        }
        acc[key].jobs.push({ title: job.title, url: job.url, budget: job.budget });
        return acc;
      }, {});

    const clientList = Object.values(clients);

    loading.style.display = "none";

    if (clientList.length === 0) {
      empty.style.display = "";
      return;
    }

    list.innerHTML = clientList.map(renderClientCard).join("");
  } catch (err) {
    loading.textContent = "Failed to load: " + err.message;
  }
}

function renderClientCard(client) {
  return `
    <div class="client-card">
      <div class="client-card-header">
        <div class="client-name">${escapeHtml(client.name)}</div>
        ${client.country ? `<span class="client-country">${escapeHtml(client.country)}</span>` : ""}
      </div>
      <div class="client-stats">
        ${client.rating ? `<div class="client-stat"><span class="stat-lbl">Rating</span><span class="stat-val">${client.rating}</span></div>` : ""}
        ${client.totalSpend ? `<div class="client-stat"><span class="stat-lbl">Total Spent</span><span class="stat-val">$${client.totalSpend}</span></div>` : ""}
        ${client.totalHires ? `<div class="client-stat"><span class="stat-lbl">Total Hires</span><span class="stat-val">${client.totalHires}</span></div>` : ""}
        ${client.hireRate ? `<div class="client-stat"><span class="stat-lbl">Hire Rate</span><span class="stat-val">${client.hireRate}%</span></div>` : ""}
      </div>
      <div class="client-jobs">
        ${client.jobs.slice(0, 3).map(j =>
          `<div class="client-job">${j.url ? `<a href="${j.url}" target="_blank">` : ""}${escapeHtml(j.title)}${j.url ? "</a>" : ""}</div>`
        ).join("")}
        ${client.jobs.length > 3 ? `<div class="client-job-more">+${client.jobs.length - 3} more</div>` : ""}
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
  const u = apiUrlInput.value.trim() || "http://localhost:3000";
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
  const u = apiUrlInput.value.trim() || "http://localhost:3000";
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
