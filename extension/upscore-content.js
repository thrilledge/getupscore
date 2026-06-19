/**
 * UpScore Extension — Content Script
 *
 * Runs on https://www.upwork.com/* pages.
 *
 * Responsibilities:
 *  1. Inject page-context scripts for Cloudflare-safe GraphQL fetches
 *  2. Capture Upwork session cookies for server-side use
 *  3. Intercept Upwork API calls (fetch/XHR)
 *  4. Extract jobs from __NEXT_DATA__ and DOM
 *  5. Forward all data to background service worker
 *
 * The page-context injection approach is critical because:
 *  - Content scripts run in "isolated world" — Cloudflare blocks them
 *  - Injected <script> tags run in "main world" — Cloudflare is OK
 *  - Only main world has proper cookies + Cloudflare Turnstile clearance
 *
 * NOTE: Content scripts in MV3 cannot use static ES module imports.
 * The GraphQL queries and normalizer functions are inlined below instead of
 * imported from lib/upwork-gql.js (which is still used by background.js as a module).
 */

console.log("[UpScore] Content script loaded");

// ─── Config ───
const UPWORK_SEARCH_PATHS = [
  "/nx/search/jobs",
  "/nx/find-work",
  "/ab/feed/jobs",
];

const UPWORK_API_PATTERNS = [
  "/api/jobs/search",
  "/graphql",
  "/api/v3/jobs",
];

// ─── State ───
let capturedJobs = [];
let apiCallCount = 0;
let mainWorldBridgeInjected = false;

// ═══════════════════════════════════════════════════
// MAIN-WORLD BRIDGE (CSP-safe via web_accessible_resources)
// ═══════════════════════════════════════════════════

/**
 * Inject the main-world bridge script into the page.
 * Uses <script src="chrome-extension://<id>/lib/main-world.js"> which
 * is CSP-compliant because chrome-extension:// URLs are whitelisted.
 * This runs in the page's main world with Cloudflare clearance.
 * Returns a promise that resolves when the bridge is loaded and ready.
 */
function injectMainWorldBridge() {
  if (mainWorldBridgeInjected) return Promise.resolve();
  mainWorldBridgeInjected = true;

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("lib/main-world.js");
    script.setAttribute("data-upscore", "");
    script.onload = resolve;
    script.onerror = () => {
      console.warn("[UpScore] Failed to load main-world bridge");
      resolve(); // Resolve anyway so postMessage can still try
    };
    document.documentElement.appendChild(script);
    script.remove();
  });
}

/**
 * Execute an operation in the page's main world via postMessage.
 * The bridge script (injected once) listens for __upscore_exec messages
 * and performs the actual work (GraphQL fetch, cookie capture).
 * Waits for bridge to load on first call before posting.
 */
async function injectMainWorld(operation, params = {}) {
  try {
    await injectMainWorldBridge();
    window.postMessage(
      { type: "__upscore_exec", operation, params },
      "*"
    );
  } catch (err) {
    console.warn(`[UpScore] Main world op failed (${operation}):`, err.message);
  }
}

/**
 * Normalize a GraphQL search result into the standard job format.
 */
function normalizeGraphQLJob(result) {
  const jobTile = result.jobTile?.job || {};
  const skills = (result.ontologySkills || []).map(s => s.prefLabel || s.freeText).filter(Boolean);

  let budget = null;
  let hourlyMin = null;
  let hourlyMax = null;
  const fpAmount = jobTile.fixedPriceAmount;
  if (fpAmount && fpAmount.amount) {
    budget = fpAmount.amount;
  }
  if (jobTile.hourlyBudgetMin || jobTile.hourlyBudgetMax) {
    hourlyMin = jobTile.hourlyBudgetMin;
    hourlyMax = jobTile.hourlyBudgetMax;
  }

  return {
    job_id: result.ciphertext || result.cipherText || jobTile.ciphertext || result.id || '',
    title: (result.title || '').slice(0, 500),
    description: (result.description || '').slice(0, 10000),
    url: `https://www.upwork.com/jobs/~${result.ciphertext || result.id || ''}`,
    skills,
    budget: budget ? `$${budget}` : '',
    hourly_min: hourlyMin,
    hourly_max: hourlyMax,
    country: '',
    proposals_count: 0,
    posted_at: jobTile.createTime || jobTile.publishTime || '',
    client_info: '',
    payment_verified: false,
    captured_at: new Date().toISOString(),
    source: 'graphql_search',
    synced: false,
  };
}

/**
 * Listen for CustomEvent results from page-context scripts.
 * These events carry GraphQL responses and cookie data.
 */
window.addEventListener("__upscore_graphql_result", (event) => {
  const detail = event.detail;
  if (!detail) return;

  if (detail.success && detail.operation === "jobSearch") {
    const results = extractJobsFromGraphQL(detail.data);
    if (results.length > 0) {
      chrome.runtime.sendMessage({
        type: "JOBS_CAPTURED",
        jobs: results,
        source: "graphql_search",
      });
      addToCaptured(results);
    }
  }

  if (detail.success && detail.operation === "jobDetails") {
    chrome.runtime.sendMessage({
      type: "JOB_DETAILS_CAPTURED",
      jobDetail: detail.data,
      ciphertext: detail.ciphertext,
    });
  }
});

/**
 * Listen for cookie capture from page context.
 */
window.addEventListener("__upscore_cookies", (event) => {
  const cookies = event.detail?.cookies;
  if (cookies) {
    chrome.runtime.sendMessage({
      type: "UPWORK_COOKIES",
      cookies,
    });
  }
});

// ═══════════════════════════════════════════════════
// GRAPHQL JOB SEARCH (via page-context)
// ═══════════════════════════════════════════════════

/**
 * Trigger a GraphQL job search from the page context.
 * @param {string} query - Search keywords
 * @param {number} offset - Pagination offset
 * @param {number} count - Results per page
 */
function searchJobsViaGraphQL(query = "", offset = 0, count = 10) {
  injectMainWorld("jobSearch", {
    query: "",
    variables: {
      requestVariables: {
        userQuery: query,
        sort: "recency+desc",
        highlight: true,
        paging: { offset, count },
      },
    },
  });
}

/**
 * Extract job results from GraphQL search response.
 */
function extractJobsFromGraphQL(data) {
  try {
    const results =
      data?.data?.search?.universalSearchNuxt?.visitorJobSearchV1?.results ||
      [];
    return results.map(normalizeGraphQLJob).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Get all search queries from the page or from background worker
 * based on user's saved filters.
 */
async function searchJobsForFilters() {
  // Ask background worker for active filters
  chrome.runtime.sendMessage({ type: "GET_FILTERS_QUERIES" }, (filters) => {
    if (!filters || filters.length === 0) {
      // Fallback: extract keywords from page URL
      const url = new URL(window.location.href);
      const q = url.searchParams.get("q") || "";
      if (q) {
        searchJobsViaGraphQL(q);
      }
      return;
    }

    // Search for each filter's keywords
    for (const filter of filters) {
      const keywords = filter?.keywords || [];
      if (keywords.length > 0) {
        searchJobsViaGraphQL(keywords.join(" "));
      }
    }
  });
}

// ═══════════════════════════════════════════════════
// COOKIE CAPTURE (for server-side cron)
// ═══════════════════════════════════════════════════

/**
 * Capture session cookies from the page context.
 * These are sent to the server so the cron job can use
 * them with ScrapingAnt for 24/7 GraphQL access.
 */
function captureUpworkCookies() {
  injectMainWorld("getCookies");
}

// ═══════════════════════════════════════════════════
// INTERCEPT fetch() API CALLS
// ═══════════════════════════════════════════════════

(function interceptFetch() {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const requestUrl = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    const isUpworkApi = UPWORK_API_PATTERNS.some((p) => requestUrl.includes(p));

    if (isUpworkApi) {
      apiCallCount++;

      try {
        const response = await originalFetch.apply(this, args);
        const clone = response.clone();
        const contentType = clone.headers.get("content-type") || "";

        if (contentType.includes("json")) {
          const json = await clone.json();
          const jobs = extractJobsFromApiResponse(json, requestUrl);
          if (jobs.length > 0) {
            chrome.runtime.sendMessage({
              type: "API_ENDPOINT_DISCOVERED",
              endpoint: {
                url: requestUrl,
                method: args[1]?.method || "GET",
                responseSample: {
                  keys: Object.keys(json).slice(0, 10),
                  hasJobs: jobs.length > 0,
                  jobCount: jobs.length,
                },
              },
            });

            chrome.runtime.sendMessage({ type: "JOBS_CAPTURED", jobs });
            addToCaptured(jobs);
          }
        }

        return response;
      } catch {
        return originalFetch.apply(this, args);
      }
    }

    return originalFetch.apply(this, args);
  };
})();

// ═══════════════════════════════════════════════════
// INTERCEPT XMLHttpRequest
// ═══════════════════════════════════════════════════

(function interceptXHR() {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._upscoreUrl = typeof url === "string" ? url : url?.href || "";
    this._upscoreMethod = method;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    const url = this._upscoreUrl || "";
    const isUpworkApi = UPWORK_API_PATTERNS.some((p) => url.includes(p));

    if (isUpworkApi) {
      this.addEventListener("load", function () {
        try {
          const contentType = this.getResponseHeader("content-type") || "";
          if (contentType.includes("json")) {
            const json = JSON.parse(this.responseText);
            const jobs = extractJobsFromApiResponse(json, url);
            if (jobs.length > 0) {
              addToCaptured(jobs);
              chrome.runtime.sendMessage({ type: "JOBS_CAPTURED", jobs });
            }
          }
        } catch {
          // Silently ignore
        }
      });
    }

    return originalSend.apply(this, args);
  };
})();

// ═══════════════════════════════════════════════════
// MESSAGE LISTENER
// ═══════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case "SCAN_JOBS":
      scanForJobs();
      // Also run GraphQL search for page's query
      triggerGraphQLSearch();
      // Capture cookies for server-side use
      captureUpworkCookies();
      sendResponse({ ok: true });
      break;

    case "FETCH_GRAPHQL":
      // Background worker asks content script to fetch GraphQL
      if (msg.query) {
        searchJobsViaGraphQL(msg.query, msg.offset || 0, msg.count || 10);
      } else {
        triggerGraphQLSearch();
      }
      sendResponse({ ok: true });
      break;

    case "GET_COOKIES":
      // Background worker needs cookies right now
      captureUpworkCookies();
      sendResponse({ ok: true });
      break;

    case "GET_CAPTURED_JOBS":
      sendResponse({ jobs: capturedJobs });
      break;
  }
  return true;
});

function triggerGraphQLSearch() {
  const url = new URL(window.location.href);
  const q = url.searchParams.get("q") || "";
  if (q) {
    searchJobsViaGraphQL(q);
  }
}

// ═══════════════════════════════════════════════════
// SCAN PAGE (DOM-based extraction)
// ═══════════════════════════════════════════════════

function scanForJobs() {
  const url = window.location.href;
  const isSearch = UPWORK_SEARCH_PATHS.some((path) => url.includes(path));
  if (!isSearch) return;

  // Strategy 1: __NEXT_DATA__
  const jobs1 = extractFromNextData();
  if (jobs1.length > 0) {
    addToCaptured(jobs1);
    chrome.runtime.sendMessage({ type: "JOBS_CAPTURED", jobs: jobs1 });
    return;
  }

  // Strategy 2: DOM parsing
  const jobs2 = extractFromDOM();
  if (jobs2.length > 0) {
    addToCaptured(jobs2);
    chrome.runtime.sendMessage({ type: "JOBS_CAPTURED", jobs: jobs2 });
  }
}

// ═══════════════════════════════════════════════════
// PARSERS (unchanged from original)
// ═══════════════════════════════════════════════════

function extractJobsFromApiResponse(json, url) {
  if (!json || typeof json !== "object") return [];
  const jobs = [];
  const walkForJobs = (obj, depth = 0) => {
    if (depth > 8 || !obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (item && typeof item === "object" && item.title && item.ciphertext) {
          const job = normalizeJob(item);
          if (job) jobs.push(job);
        }
        walkForJobs(item, depth + 1);
      }
    } else {
      if (obj.title && (obj.ciphertext || obj.id) && !obj.items && !obj.results) {
        const job = normalizeJob(obj);
        if (job) jobs.push(job);
      }
      for (const key of Object.keys(obj)) {
        walkForJobs(obj[key], depth + 1);
      }
    }
  };
  walkForJobs(json);
  return jobs;
}

function extractFromNextData() {
  const el = document.getElementById("__NEXT_DATA__");
  if (!el) return [];
  try {
    const data = JSON.parse(el.textContent);
    const jobs = [];
    const walk = (obj, depth = 0) => {
      if (depth > 10 || !obj || typeof obj !== "object") return;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (item && isJobItem(item)) {
            const job = normalizeJob(item);
            if (job) jobs.push(job);
          }
          walk(item, depth + 1);
        }
      } else {
        for (const key of Object.keys(obj)) {
          if (isJobItem(obj[key])) {
            const job = normalizeJob(obj[key]);
            if (job) jobs.push(job);
          }
          walk(obj[key], depth + 1);
        }
      }
    };
    walk(data);
    return jobs;
  } catch {
    return [];
  }
}

function isJobItem(item) {
  if (!item || typeof item !== "object") return false;
  return !!(
    item.title &&
    typeof item.title === "string" &&
    item.title.length > 5 &&
    (item.ciphertext || item.jobId || item.id) &&
    Object.keys(item).length < 30
  );
}

function extractFromDOM() {
  const jobs = [];
  const selectors = [
    "[data-job-id]",
    "[data-test*='job']",
    "[class*='job-tile']",
    "[class*='JobTile']",
    "[class*='job-card']",
    "article",
    ".up-card-section",
  ];

  const candidates = new Set();
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => candidates.add(el));
  }

  for (const el of candidates) {
    if (el.tagName === "BODY" || el.tagName === "HTML") continue;

    const titleEl = el.querySelector(
      'h2, h3, h4, [class*="title"], [class*="Title"], a[href*="~"]'
    );
    if (!titleEl) continue;

    const title = titleEl.textContent.trim();
    if (!title || title.length < 5) continue;

    const link = el.querySelector("a[href]") || titleEl.closest("a");
    let url = "";
    if (link) {
      const href = link.getAttribute("href");
      if (href) url = href.startsWith("http") ? href : `https://www.upwork.com${href}`;
    }

    const jobId = el.getAttribute("data-job-id") || url.match(/~([a-f0-9]{16,})/)?.[1] || "";

    const descEl = el.querySelector('[class*="description"], [class*="Description"], p');
    const description = descEl?.textContent?.trim()?.slice(0, 500) || "";

    const skillEls = el.querySelectorAll('[class*="skill"], [class*="Skill"], [class*="token"]');
    const skills = Array.from(skillEls).map((s) => s.textContent.trim()).filter(Boolean).slice(0, 10);

    const budgetEl = el.querySelector('[class*="budget"], [class*="Budget"], [class*="rate"], [class*="Rate"]');
    const budget = budgetEl?.textContent?.trim() || "";

    const countryEl = el.querySelector('[class*="location"], [class*="Location"]');
    const country = countryEl?.textContent?.trim() || "";

    const proposalsEl = el.querySelector('[class*="proposals"], [class*="Proposals"]');
    const proposalsCount = parseInt(proposalsEl?.textContent?.match(/\d+/)?.[0] || "0", 10);

    const timeEl = el.querySelector('[class*="time"], [class*="posted"]');
    const postedAt = timeEl?.textContent?.trim() || "";

    const isDuplicate = jobs.some((j) => j.title === title && j.url === url);
    if (!isDuplicate) {
      jobs.push({
        job_id: jobId,
        title,
        url,
        description,
        skills,
        budget,
        country,
        proposals_count: proposalsCount,
        posted_at: postedAt,
        client_info: "",
        payment_verified: false,
        captured_at: new Date().toISOString(),
        source: "dom_scan",
        synced: false,
      });
    }
  }

  return jobs;
}

function normalizeJob(item) {
  const title = typeof item.title === "string" ? item.title : item.title?.text || "";
  if (!title || title.length < 5) return null;

  const jobId = item.ciphertext || item.jobId || item.id || "";

  return {
    job_id: jobId,
    title: title.slice(0, 500),
    url: item.url
      ? (item.url.startsWith("http") ? item.url : `https://www.upwork.com${item.url}`)
      : jobId
        ? `https://www.upwork.com/jobs/~${jobId}`
        : "",
    description: (typeof item.description === "string" ? item.description : item.description?.text || "").slice(0, 10000),
    skills: (item.skills || item.jobSkills || []).map((s) =>
      typeof s === "string" ? s : s.name || s.label || String(s)
    ).filter(Boolean).slice(0, 20),
    budget: item.budget?.amount ? `$${item.budget.amount}` : item.rate || item.hourlyBudget || "",
    country: item.client?.country || item.country || "",
    proposals_count: item.proposalsCount || item.applicationsCount || 0,
    posted_at: item.publishedDate || item.createdAt || "",
    client_info: item.client?.name || item.clientName || "",
    payment_verified: item.client?.paymentVerified || false,
    captured_at: new Date().toISOString(),
    source: "api_intercept",
    synced: false,
  };
}

// ─── Helpers ───
function addToCaptured(jobs) {
  if (jobs.length === 0) return;
  const seen = new Set(capturedJobs.map((j) => `${j.job_id}:${j.title}`));
  const newOnes = jobs.filter((j) => !seen.has(`${j.job_id}:${j.title}`));
  capturedJobs = [...capturedJobs, ...newOnes];
  if (capturedJobs.length > 500) capturedJobs = capturedJobs.slice(-500);
}

// ═══════════════════════════════════════════════════
// AUTO INIT
// ═══════════════════════════════════════════════════

// Scan + capture cookies + search GraphQL after page loads
setTimeout(() => {
  scanForJobs();
  captureUpworkCookies();
  triggerGraphQLSearch();
}, 3000);

// Watch for SPA navigation
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    setTimeout(() => {
      scanForJobs();
      captureUpworkCookies();
      triggerGraphQLSearch();
    }, 2000);
  }
});
if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
}
