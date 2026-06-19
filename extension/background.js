/**
 * UpScore Extension — Background Service Worker
 *
 * Key Capabilities:
 *  - Fetches Upwork jobs via GraphQL (visitor mode — no login needed)
 *  - Falls back to HTML scraping of search pages
 *  - Content script bridge for page-context GraphQL (Cloudflare bypass)
 *  - Parses job listings and AI-analyzes via GroqCloud (3-key round-robin)
 *  - Periodic alarms via chrome.alarms API
 *  - Syncs captured jobs + AI analysis to UpScore API
 *  - Captures session cookies for server-side ScrapingAnt cron
 *
 * Architecture: Dual-mode job fetching
 *  Strategy A (primary): Direct GraphQL to api/graphql/v1?alias=visitorJobSearch
 *    — Visits Upwork GraphQL API directly, no login required
 *    — Works from service worker context (no tab needed)
 *  Strategy B (fallback): HTML scrape of nx/search/jobs/
 *    — Uses whatever cookies the browser has
 *    — Parses __NEXT_DATA__ JSON or DOM
 *  Strategy C (supplemental): Content script → page-context injection
 *    — Only works when an Upwork tab is open
 *    — Has full Cloudflare clearance from tab context
 *
 * Limitations:
 *  - Service worker terminates when browser is fully closed (Chrome MV3)
 *  - Server-side cron requires captured cookies + ScrapingAnt
 */

import { analyzeJob } from "./lib/groq-scorer.js";
import { VISITOR_JOB_SEARCH_QUERY, normalizeGraphQLJob } from "./lib/upwork-gql.js";

const DEFAULT_CHECK_INTERVAL = 15; // minutes
const DEFAULT_API_URL = "http://localhost:3000";
const UPWORK_BASE = "https://www.upwork.com";
const UPWORK_GRAPHQL = "https://www.upwork.com/api/graphql/v1";

// ─── State ───
let state = {
  connected: false,
  statusMessage: "Initializing...",
  jobs: [],          // All captured jobs (with synced flag)
  filters: [],       // Active filters from UpScore API
  defaultSearch: "", // Fallback search query when no filters exist
  apiToken: null,
  apiUrl: DEFAULT_API_URL,
  checkInterval: DEFAULT_CHECK_INTERVAL,
  lastCheckAt: null,
  lastError: null,
  discoveredEndpoints: [], // API endpoints learned from content script
  groqConfigured: false,   // Whether GroqCloud keys are set up
  upworkCookies: null,     // Latest Upwork session cookies (for server sync)
};

// ─── Initialization ───
chrome.runtime.onInstalled.addListener(async () => {
  await loadSettings();
  await refreshFilters();
  setupAlarm();

  // Set up side panel to open on action click
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    console.log("[UpScore] Side panel configured");
  } catch (err) {
    console.warn("[UpScore] Side panel setup:", err.message);
  }

  broadcastState();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadSettings();
  setupAlarm();
  // Do an immediate check when browser starts
  setTimeout(() => performCheck(), 5000);
  broadcastState();
});

// ─── Message Handler ───
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case "GET_STATE":
      sendResponse(state);
      break;

    case "SETTINGS_UPDATED":
      handleSettingsUpdate(msg.settings);
      sendResponse({ ok: true });
      break;

    case "JOBS_CAPTURED":
      handleJobsCaptured(msg.jobs);
      sendResponse({ ok: true });
      break;

    case "SYNC_JOBS":
      syncJobsToApi();
      sendResponse({ ok: true });
      break;

    case "API_ENDPOINT_DISCOVERED":
      // Content script found a working API endpoint on Upwork
      handleDiscoveredEndpoint(msg.endpoint, sender.tab?.id);
      sendResponse({ ok: true });
      break;

    case "FORCE_CHECK":
      performCheck();
      sendResponse({ ok: true });
      break;

    case "UPWORK_COOKIES":
      // Content script captured cookies from page context
      handleUpworkCookies(msg.cookies);
      sendResponse({ ok: true });
      break;

    case "SYNC_COOKIES_FROM_SERVER":
      // Side panel wants to fetch cookies from server (reverse sync)
      handleSyncCookiesFromServer().then((result) => sendResponse(result));
      return true; // Keep channel open for async response

    case "JOB_DETAILS_CAPTURED":
      // Full job details from GraphQL (could be stored for analysis)
      console.log(`[UpScore] Job details received for: ${msg.ciphertext}`);
      sendResponse({ ok: true });
      break;

    case "GET_FILTERS_QUERIES":
      // Content script needs filter keywords to run GraphQL searches
      let gqlQueries = [];
      if (state.filters.length > 0) {
        gqlQueries = state.filters
          .filter((f) => f.keywords?.length > 0)
          .map((f) => ({
            name: f.name,
            keywords: f.keywords,
            query: f.keywords.join(" "),
          }));
      } else if (state.defaultSearch) {
        const terms = state.defaultSearch.split(/\s+/).filter(Boolean);
        gqlQueries = [{
          name: "Default Search",
          keywords: terms,
          query: state.defaultSearch,
        }];
      }
      sendResponse(gqlQueries.length > 0 ? gqlQueries : null);
      break;

    default:
      sendResponse({ error: "Unknown message type" });
  }
  return true;
});

// ─── Alarm Handler ───
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "upscore-check") {
    // Reload settings first — alarm may fire before bootstrap completes
    loadSettings().then(() => performCheck());
  }
});

// ─── Settings ───
async function loadSettings() {
  const result = await chrome.storage.sync.get([
    "upscore_api_token",
    "upscore_api_url",
    "upscore_check_interval",
    "upscore_default_search",
    "upscore_discovered_endpoints",
    "groq_api_keys",
    "groq_model",
  ]);

  state.apiToken = result.upscore_api_token || null;
  state.apiUrl = result.upscore_api_url || DEFAULT_API_URL;
  state.checkInterval = result.upscore_check_interval || DEFAULT_CHECK_INTERVAL;
  state.defaultSearch = result.upscore_default_search || "";
  state.discoveredEndpoints = result.upscore_discovered_endpoints || [];

  // GroqCloud settings
  const keys = result.groq_api_keys || [];
  state.groqConfigured = keys.length > 0;

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
  if (settings.check_interval !== undefined) {
    state.checkInterval = settings.check_interval;
    chrome.storage.sync.set({ upscore_check_interval: settings.check_interval });
  }
  if (settings.default_search !== undefined) {
    state.defaultSearch = settings.default_search;
    chrome.storage.sync.set({ upscore_default_search: settings.default_search });
  }
  if (settings.groq_api_keys !== undefined) {
    const keys = settings.groq_api_keys || [];
    state.groqConfigured = keys.length > 0;
    chrome.storage.sync.set({ groq_api_keys: keys });
  }
  if (settings.groq_model !== undefined) {
    chrome.storage.sync.set({ groq_model: settings.groq_model });
  }

  state.connected = !!state.apiToken;
  state.statusMessage = state.connected ? "Connected" : "Not configured";

  setupAlarm();
  broadcastState();
}

function setupAlarm() {
  chrome.alarms.clear("upscore-check");
  if (state.connected && state.checkInterval > 0) {
    chrome.alarms.create("upscore-check", {
      periodInMinutes: state.checkInterval,
      delayInMinutes: 1, // Wait 1 minute before first check
    });
    console.log(`[UpScore] Alarm set: every ${state.checkInterval} min`);
    state.statusMessage = `Monitoring every ${state.checkInterval} min`;
  } else {
    state.statusMessage = "Monitoring paused — configure API token";
  }
  broadcastState();
}

// ─── API Endpoint Discovery ───
function handleDiscoveredEndpoint(endpoint, tabId) {
  if (!endpoint || !endpoint.url) return;

  const alreadyKnown = state.discoveredEndpoints.some(
    (e) => e.url === endpoint.url
  );
  if (alreadyKnown) return;

  state.discoveredEndpoints.push({
    url: endpoint.url,
    method: endpoint.method || "GET",
    responseSample: endpoint.responseSample || null,
    discoveredAt: Date.now(),
  });

  // Keep last 20
  if (state.discoveredEndpoints.length > 20) {
    state.discoveredEndpoints = state.discoveredEndpoints.slice(-20);
  }

  chrome.storage.sync.set({
    upscore_discovered_endpoints: state.discoveredEndpoints,
  });

  console.log(`[UpScore] Discovered API endpoint: ${endpoint.url}`);
}

// ─── Filters ───
async function refreshFilters() {
  if (!state.connected || !state.apiToken) return [];

  try {
    const response = await fetch(`${state.apiUrl}/api/extension/filters`, {
      headers: {
        Authorization: `Bearer ${state.apiToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn("[UpScore] Failed to fetch filters:", response.status);
      // Return null to distinguish "error" from "empty but ok"
      return null;
    }

    const data = await response.json();
    state.filters = data.filters || [];
    return state.filters;
  } catch (err) {
    console.warn("[UpScore] Filter fetch error:", err.message);
    return null;
  }
}

// ─── Main Check ───
async function performCheck() {
  console.log("[UpScore] 🔄 Performing periodic check...");
  state.lastCheckAt = Date.now();

  // Self-heal: if not connected, reload settings (alarm may have fired early)
  if (!state.connected || !state.apiToken) {
    await loadSettings();
    if (!state.connected || !state.apiToken) {
      state.statusMessage = "Not connected — configure in extension settings";
      state.lastError = "No API token";
      broadcastState();
      return;
    }
  }

  // Step 1: Refresh filters from UpScore
  const filters = await refreshFilters();

  // If filters is null, it means API error (not just empty)
  if (filters === null) {
    state.statusMessage = "⚠️ Server error — check API URL and token in Settings";
    state.lastError = "API request failed";
    broadcastState();
    return;
  }

  // Step 2: Build the list of queries to run
  // Use server-side filters if available, otherwise fall back to default search
  let queries = [];
  if (filters.length > 0) {
    queries = filters.map((f) => ({
      name: f.name,
      keywords: f.keywords,
      query: f.keywords.join(" "),
      isDefault: false,
    }));
  } else if (state.defaultSearch) {
    const terms = state.defaultSearch.split(/\s+/).filter(Boolean);
    queries = [{
      name: "Default Search",
      keywords: terms,
      query: state.defaultSearch,
      isDefault: true,
    }];
  }

  if (queries.length === 0) {
    state.statusMessage = "ℹ️ No filters or default search — configure in Extension Settings";
    state.lastError = "no_filters";
    broadcastState();
    return;
  }

  // Step 3: Fetch jobs for each query using dual-mode fetcher
  let totalJobsFound = 0;
  let modeUsed = "visitor-graphql";

  for (const q of queries) {
    try {
      // Strategy A: Direct GraphQL (visitor — no login needed)
      let jobs = await fetchUpworkGraphQL(q);
      let mode = "graphql";

      // Strategy B: If GraphQL returns nothing, try HTML scraping
      if (!jobs || jobs.length === 0) {
        jobs = await fetchUpworkForFilter(q);
        if (jobs && jobs.length > 0) mode = "html";
      }

      if (jobs && jobs.length > 0) {
        // Tag jobs with their fetch mode
        const tagged = jobs.map((j) => ({ ...j, source: j.source || mode }));
        handleJobsCaptured(tagged);
        totalJobsFound += tagged.length;
        modeUsed = mode;
      }
    } catch (err) {
      console.warn(`[UpScore] Error fetching "${q.name}":`, err.message);
      // Fallback: try HTML if GraphQL threw
      try {
        const fallback = await fetchUpworkForFilter(q);
        if (fallback && fallback.length > 0) {
          handleJobsCaptured(fallback.map((j) => ({ ...j, source: j.source || "html" })));
          totalJobsFound += fallback.length;
          modeUsed = "html";
        }
      } catch (fallbackErr) {
        console.warn(`[UpScore] Fallback also failed for "${q.name}":`, fallbackErr.message);
      }
    }
  }

  // Step 4: Also ask any open Upwork tabs to scan (supplemental)
  // Don't block on this — it's optional
  notifyContentScripts();

  const fetchLabel = modeUsed === "graphql" ? "GraphQL (visitor)" : "HTML scrape";
  state.statusMessage = `Checked ${queries.length} query(ies), ${totalJobsFound} job(s) via ${fetchLabel}`;
  state.lastError = null;
  broadcastState();
  console.log(`[UpScore] ✅ Check complete: ${totalJobsFound} new jobs (${fetchLabel})`);
}

// ─── GraphQL Visitor Fetcher (no login needed) ───
async function fetchUpworkGraphQL(filter) {
  if (!filter || !filter.keywords || filter.keywords.length === 0) return [];

  const queryTerms = filter.keywords.join(" ");
  const variables = {
    requestVariables: {
      userQuery: queryTerms,
      sort: "recency+desc",
      highlight: true,
      paging: { offset: 0, count: 20 },
    },
  };

  const url = `${UPWORK_GRAPHQL}?alias=visitorJobSearch`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Origin: "https://www.upwork.com",
        Referer: "https://www.upwork.com/nx/search/jobs/",
      },
      body: JSON.stringify({
        query: VISITOR_JOB_SEARCH_QUERY,
        variables,
      }),
    });

    if (!response.ok) {
      console.warn(`[UpScore] GraphQL fetch failed (HTTP ${response.status})`);
      return [];
    }

    const json = await response.json();

    // Log GraphQL errors if present
    if (json.errors) {
      console.warn(`[UpScore] GraphQL errors for "${queryTerms}":`, json.errors.map(e => e.message).join("; "));
    }

    // Navigate the response path matching the actual GraphQL schema
    const results =
      json?.data?.search?.universalSearchNuxt?.visitorJobSearchV1?.results || [];

    if (!results.length) {
      console.log(`[UpScore] GraphQL returned 0 results for "${queryTerms}"`);
      return [];
    }

    // Use the same normalizer that content.js uses
    const jobs = results.map(normalizeGraphQLJob).filter(Boolean);

    console.log(`[UpScore] GraphQL fetched ${jobs.length} jobs for "${queryTerms}"`);
    return jobs.map((j) => ({ ...j, source: "graphql" }));
  } catch (err) {
    console.warn(`[UpScore] GraphQL error for "${queryTerms}":`, err.message);
    return [];
  }
}

// ─── Upwork Fetcher (HTML scrape — visitor-friendly) ───
async function fetchUpworkForFilter(filter) {
  if (!filter || !filter.keywords || filter.keywords.length === 0) return [];

  // Build search query from filter keywords
  const query = filter.keywords.join(" ");
  const searchUrl = `${UPWORK_BASE}/nx/search/jobs/?q=${encodeURIComponent(query)}&sort=recency`;

  console.log(`[UpScore] HTML fetch: ${searchUrl}`);

  const response = await fetch(searchUrl, {
    headers: {
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Upgrade-Insecure-Requests": "1",
    },
  });

  if (!response.ok) {
    if (response.status === 410) {
      throw new Error("Upwork search page unavailable (410)");
    }
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();

  // Check if this is actually a search results page (not login/signup redirect)
  const isLoginPage = (html.includes("Log in") || html.includes("Sign in")) &&
    !html.includes("job-search-card") && !html.includes("JobDetails") && !html.includes("__NEXT_DATA__");
  if (isLoginPage) {
    return []; // Silently return empty — GraphQL visitor will be tried instead
  }

  // Strategy 1: Extract from __NEXT_DATA__ (most reliable)
  const jobs = extractFromNextData(html);

  // Strategy 2: Fallback to DOM parsing
  if (jobs.length === 0) {
    const domJobs = extractFromHTML(html);
    return domJobs;
  }

  return jobs;
}

// ─── HTML Parsing: __NEXT_DATA__ ───
function extractFromNextData(html) {
  const jobs = [];

  // Find __NEXT_DATA__ JSON
  const match = html.match(
    /<script id="__NEXT_DATA__"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) return jobs;

  try {
    const data = JSON.parse(match[1]);
    const walkForJobs = (obj, depth = 0) => {
      if (depth > 10 || !obj || typeof obj !== "object") return;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (item && isJobItem(item)) {
            const job = normalizeJobItem(item);
            if (job) jobs.push(job);
          }
          walkForJobs(item, depth + 1);
        }
      } else {
        for (const key of Object.keys(obj)) {
          if (isJobItem(obj[key])) {
            const job = normalizeJobItem(obj[key]);
            if (job) jobs.push(job);
          }
          walkForJobs(obj[key], depth + 1);
        }
      }
    };
    walkForJobs(data);
  } catch (err) {
    console.warn("[UpScore] __NEXT_DATA__ parse error:", err.message);
  }

  return jobs;
}

function isJobItem(item) {
  if (!item || typeof item !== "object") return false;
  // Upwork job items have specific patterns
  const hasTitle = !!(item.title && typeof item.title === "string" && item.title.length > 5);
  const hasId = !!(item.ciphertext || item.jobId || item.id);
  // Avoid too-big objects that are page props
  const isReasonableSize = Object.keys(item).length < 30;
  return hasTitle && hasId && isReasonableSize;
}

function normalizeJobItem(item) {
  const title = typeof item.title === "string" ? item.title : "";
  if (!title || title.length < 5) return null;

  const jobId = item.ciphertext || item.jobId || item.id || "";

  return {
    job_id: jobId,
    title: title.slice(0, 500),
    url: item.url
      ? (item.url.startsWith("http") ? item.url : `${UPWORK_BASE}${item.url}`)
      : jobId
        ? `${UPWORK_BASE}/jobs/~${jobId}`
        : "",
    description: (typeof item.description === "string"
      ? item.description
      : item.description?.text || ""
    ).slice(0, 10000) || "",
    skills: (item.skills || item.jobSkills || []).map((s) =>
      typeof s === "string" ? s : s.name || s.label || String(s)
    ).filter(Boolean).slice(0, 20),
    budget: item.budget?.amount
      ? `$${item.budget.amount}`
      : item.rate || item.hourlyBudget || "",
    country: item.client?.country || item.country || "",
    proposals_count: item.proposalsCount || item.applicationsCount || 0,
    posted_at: item.publishedDate || item.createdAt || "",
    client_info: item.client?.name || item.clientName || "",
    payment_verified: item.client?.paymentVerified || false,
    captured_at: new Date().toISOString(),
    source: "bg_fetch",
    synced: false,
  };
}

// ─── HTML Parsing: DOM Fallback ───
function extractFromHTML(html) {
  // For service worker, we can't use DOM parsing easily.
  // Use regex-based extraction as last resort.
  const jobs = [];

  // Look for job card patterns in the HTML
  // Upwork job cards often have data attributes
  const jobCardRegex = /<div[^>]*data-job-id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
  let match;

  while ((match = jobCardRegex.exec(html)) !== null) {
    const jobId = match[1];
    const cardHtml = match[2];

    const titleMatch = cardHtml.match(
      /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i
    );
    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, "").trim()
      : "";

    if (!title || title.length < 5) continue;

    const budgetMatch = cardHtml.match(/\$[\d,.]+/);
    const budget = budgetMatch ? budgetMatch[0] : "";

    const skills = [];
    const skillRegex = /<span[^>]*class="[^"]*(?:skill|Skill|token)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
    let skillMatch;
    while ((skillMatch = skillRegex.exec(cardHtml)) !== null) {
      const skill = skillMatch[1].replace(/<[^>]+>/g, "").trim();
      if (skill) skills.push(skill);
    }

    jobs.push({
      job_id: jobId,
      title: title.slice(0, 500),
      url: `${UPWORK_BASE}/jobs/~${jobId}`,
      description: "",
      skills: skills.slice(0, 20),
      budget,
      country: "",
      proposals_count: 0,
      posted_at: "",
      client_info: "",
      payment_verified: false,
      captured_at: new Date().toISOString(),
      source: "bg_fetch_regex",
      synced: false,
    });
  }

  return jobs;
}

// ─── Jobs ───
function handleJobsCaptured(jobs) {
  if (!jobs || jobs.length === 0) return;

  const existingUrls = new Set(state.jobs.map((j) => `${j.job_id}:${j.title}`));
  const newJobs = jobs.filter((j) => !existingUrls.has(`${j.job_id}:${j.title}`));

  if (newJobs.length === 0) return;

  state.jobs = [...state.jobs, ...newJobs];

  // Keep last 500
  if (state.jobs.length > 500) {
    state.jobs = state.jobs.slice(-500);
  }

  // Auto-sync
  if (state.connected && state.apiToken) {
    syncJobsToApi();
  }

  broadcastState();
}

async function syncJobsToApi() {
  const unsyncedJobs = state.jobs.filter((j) => !j.synced);
  if (unsyncedJobs.length === 0) return;

  // Step 1: Analyze jobs via GroqCloud AI (if configured)
  state.statusMessage = `Analyzing ${unsyncedJobs.length} job(s) with AI...`;
  broadcastState();

  const analyzedJobs = [];
  for (const job of unsyncedJobs) {
    try {
      const analysis = await analyzeJob(job);
      analyzedJobs.push({ ...job, analysis });
    } catch (err) {
      // Still sync the job even if analysis fails
      console.warn(`[UpScore] Analysis failed for "${job.title}":`, err.message);
      analyzedJobs.push({ ...job, analysis: null });
    }
  }

  // Step 2: Sync in batches of 10 (smaller batches to fit analysis data)
  const batchSize = 10;
  for (let i = 0; i < analyzedJobs.length; i += batchSize) {
    const batch = analyzedJobs.slice(i, i + batchSize);
    try {
      const response = await fetch(`${state.apiUrl}/api/extension/jobs/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.apiToken}`,
        },
        body: JSON.stringify({ jobs: batch }),
      });

      if (response.ok) {
        const result = await response.json();
        // Mark batch as synced
        const batchJobs = batch.map((j) => {
          const original = state.jobs.find(
            (sj) => sj.job_id === j.job_id && sj.title === j.title
          );
          return original || j;
        });
        state.jobs = state.jobs.map((j) => {
          if (batchJobs.includes(j)) return { ...j, synced: true };
          return j;
        });
        const groqNote = state.groqConfigured ? ", AI analyzed" : "";
        state.statusMessage = `Synced ${result.count || batch.length} job(s)${groqNote}`;
      } else {
        const err = await response.json().catch(() => ({}));
        state.statusMessage = `Sync failed: ${err.error || response.status}`;
        break; // Stop on error
      }
    } catch (err) {
      state.statusMessage = `Sync error: ${err.message}`;
      break;
    }
  }

  broadcastState();
}

// ─── Cookie Capture & Sync ───

/**
 * Handle cookies captured from Upwork page context.
 * Sends them to the server so the cron job can use them
 * with ScrapingAnt for 24/7 GraphQL access.
 */
function handleUpworkCookies(cookies) {
  if (!cookies || cookies === state.upworkCookies) return;

  state.upworkCookies = cookies;

  // Sync to server immediately if connected
  if (state.connected && state.apiToken) {
    syncCookiesToServer(cookies);
  }
}

async function syncCookiesToServer(cookies) {
  try {
    const response = await fetch(`${state.apiUrl}/api/extension/cookies/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.apiToken}`,
      },
      body: JSON.stringify({
        cookies,
        domain: "www.upwork.com",
        captured_at: new Date().toISOString(),
      }),
    });

    if (response.ok) {
      console.log("[UpScore] Cookies synced to server");
    } else {
      console.warn("[UpScore] Cookie sync failed:", response.status);
    }
  } catch (err) {
    console.warn("[UpScore] Cookie sync error:", err.message);
  }
}

/**
 * Reverse cookie sync: fetch cookies stored on the server (e.g. from another
 * browser session) and update the extension state.
 */
async function handleSyncCookiesFromServer() {
  if (!state.connected || !state.apiToken) {
    return { ok: false, error: "Not connected to server" };
  }

  try {
    const response = await fetch(
      `${state.apiUrl}/api/extension/cookies/sync`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${state.apiToken}`,
        },
      }
    );

    if (response.status === 404) {
      return {
        ok: false,
        error: "No cookies on server — open Upwork in your browser to capture first",
      };
    }

    if (!response.ok) {
      return { ok: false, error: `Server error (HTTP ${response.status})` };
    }

    const data = await response.json();
    if (data.cookies) {
      state.upworkCookies = data.cookies;
      state.statusMessage = "✅ Cookies synced from server";
      broadcastState();
      console.log("[UpScore] Cookies fetched from server");
      return {
        ok: true,
        captured_at: data.captured_at,
        domain: data.domain,
      };
    }

    return { ok: false, error: "Server returned empty cookies" };
  } catch (err) {
    console.warn("[UpScore] Cookie server sync error:", err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Notify all Upwork tabs to fetch GraphQL data and capture cookies.
 * Called during periodic checks alongside DOM scanning.
 */
async function notifyContentScripts() {
  try {
    const tabs = await chrome.tabs.query({
      url: ["https://www.upwork.com/*"],
    });
    for (const tab of tabs) {
      try {
        // Tell content script to scan DOM + fetch GraphQL + capture cookies
        await chrome.tabs.sendMessage(tab.id, { type: "SCAN_JOBS" });
      } catch {
        // Content script not injected or tab not ready
      }
    }
  } catch {
    // Tab query failed
  }
}

// ─── Broadcast ───
function broadcastState() {
  chrome.runtime.sendMessage({
    type: "STATUS_UPDATE",
    connected: state.connected,
    message: state.statusMessage,
    lastCheckAt: state.lastCheckAt,
    lastError: state.lastError,
    upworkCookies: state.upworkCookies,
  }).catch(() => {});

  chrome.runtime.sendMessage({
    type: "JOBS_UPDATED",
    jobs: state.jobs,
    filters: state.filters,
  }).catch(() => {});
}

// ─── Bootstrap ───
(async () => {
  await loadSettings();
  if (state.connected) {
    await refreshFilters();
    setupAlarm();
  }
})();
