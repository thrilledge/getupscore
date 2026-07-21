let bridgeReady = false;
const bridgeQueue = [];

function injectMainWorldBridge() {
  if (bridgeReady) return Promise.resolve();
  if (bridgeQueue.length > 0) {
    return new Promise((resolve) => bridgeQueue.push(resolve));
  }
  return new Promise((resolve) => {
    bridgeQueue.push(resolve);
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("lib/main-world.js");
    script.setAttribute("data-upscore", "");
    script.onload = () => {
      bridgeReady = true;
      const q = bridgeQueue.splice(0);
      q.forEach((r) => r());
    };
    script.onerror = () => {
      bridgeReady = true;
      const q = bridgeQueue.splice(0);
      q.forEach((r) => r());
    };
    document.documentElement.appendChild(script);
    script.remove();
  });
}

async function injectMainWorld(operation, params = {}) {
  try {
    await injectMainWorldBridge();

    window.postMessage({ type: "__upscore_exec", operation, params }, "*");
  } catch (err) {
  
  }
}

injectMainWorldBridge();

let pendingJobResolve = null;
let pendingJobTimeout = null;

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== "__upscore_result") return;

  const { operation } = event.data;

  if (operation === "profileDetail") {
    if (!event.data.success) return;
    const profile = normalizeProfile(event.data.data);
    if (profile.title) {
      chrome.runtime.sendMessage({ type: "PROFILE_CAPTURED", profile });
    }
  }

  if (operation === "jobDetails") {
    if (pendingJobResolve) {
      clearTimeout(pendingJobTimeout);
      pendingJobTimeout = null;
      pendingJobResolve(event.data);
      pendingJobResolve = null;
    }
    if (event.data.success) {
      chrome.runtime.sendMessage({ type: "JOBS_CAPTURED", jobs: [event.data.data] });
    }
  }
});

function extractJobFromPage() {
  return new Promise((resolve) => {
    if (pendingJobResolve) {
      pendingJobResolve({ success: false, error: "Overridden" });
    }
    clearTimeout(pendingJobTimeout);
    pendingJobResolve = resolve;
    injectMainWorld("getJobDetailsFromDom");
    pendingJobTimeout = setTimeout(() => {
      if (pendingJobResolve) {
        pendingJobResolve({ success: false, error: "Timeout" });
        pendingJobResolve = null;
        pendingJobTimeout = null;
      }
    }, 15000);
  });
}

function fetchJobFromApi(jobUrl) {
  const match = jobUrl.match(/[~/]([a-f0-9]{16,})/i);
  if (!match) {
    return Promise.resolve({ success: false, error: "Could not extract job ID from URL" });
  }
  const ciphertext = "~" + match[1];
  return new Promise((resolve) => {
    if (pendingJobResolve) {
      pendingJobResolve({ success: false, error: "Overridden" });
    }
    clearTimeout(pendingJobTimeout);
    pendingJobResolve = resolve;
    // Get the visitor_gql_token from background script (can read HttpOnly cookies)
    chrome.runtime.sendMessage({ type: "GET_VISITOR_GQL_TOKEN" }, (response) => {
      const token = response?.token || null;
      injectMainWorld("fetchJobFromApi", { ciphertext, token });
      pendingJobTimeout = setTimeout(() => {
        if (pendingJobResolve) {
          pendingJobResolve({ success: false, error: "Timeout fetching job from API" });
          pendingJobResolve = null;
          pendingJobTimeout = null;
        }
      }, 15000);
    });
  });
}

function normalizeProfile(data) {
  try {
    const p = data?.data?.talentVPDAuthProfile || data;
    const profile = p.profile || {};
    const stats = p.stats || {};

    const hasSubProfile = Object.keys(profile).length > 0 || Object.keys(stats).length > 0;
    const src = hasSubProfile ? profile : p;

    const skills = Array.isArray(src.skills)
      ? src.skills.map((s) => {
          if (typeof s === "string") return s;
          if (s?.prettyName && typeof s.prettyName === "string") return s.prettyName;
          if (s?.name && typeof s.name === "string") return s.name;
          if (s?.node?.prettyName) return s.node.prettyName;
          return String(s);
        }).filter(Boolean)
      : [];

    const hourlyRate = stats.hourlyRate?.node?.amount
      || p.hourlyRate?.node?.amount
      || src.hourlyRate?.node?.amount
      || src.hourly_rate
      || null;

    const totalEarnings = stats.totalEarnings ?? p.totalEarnings ?? src.totalEarnings ?? src.total_earnings ?? null;
    const totalJobs = stats.totalJobsWorked ?? p.totalJobsWorked ?? src.totalJobsWorked ?? src.total_jobs_done ?? null;
    const totalHours = stats.totalHoursActual ?? p.totalHoursActual ?? src.totalHoursActual ?? src.total_hours ?? null;
    const rating = stats.rating ?? p.rating ?? src.rating ?? src.client_rating ?? null;
    const memberSince = stats.memberSince || p.memberSince || src.memberSince || null;
    const country = (profile.location?.country || p.location?.country || src.location?.country || "");

    const portfolioData = data?.data?.portfolioV2;
    let portfolioItems = [];
    if (portfolioData) {
      if (Array.isArray(portfolioData)) {
        portfolioItems = portfolioData;
      } else if (Array.isArray(portfolioData.items)) {
        portfolioItems = portfolioData.items;
      } else if (Array.isArray(portfolioData.projects)) {
        portfolioItems = portfolioData.projects;
      } else if (Array.isArray(portfolioData.data)) {
        portfolioItems = portfolioData.data;
      } else if (Array.isArray(portfolioData.portfolioItems)) {
        portfolioItems = portfolioData.portfolioItems;
      } else if (Array.isArray(portfolioData.publishedCurrentPageProjects)) {
        portfolioItems = portfolioData.publishedCurrentPageProjects;
      } else if (Array.isArray(portfolioData.draftCurrentPageProjects)) {
        portfolioItems = portfolioData.draftCurrentPageProjects;
      } else if (Array.isArray(portfolioData.results)) {
        portfolioItems = portfolioData.results;
      } else {
        for (const key of Object.keys(portfolioData)) {
          const val = portfolioData[key];
          if (Array.isArray(val) && val.length > 0 && val[0]?.title) {
            portfolioItems = val;
            break;
          }
        }
      }
    }
    const portfolio = portfolioItems.length
      ? portfolioItems.slice(0, 20).map((item) => ({
            title: item.title || "",
            description: (item.description || "").slice(0, 1000),
            url: item.url || "",
            images: Array.isArray(item.images)
              ? item.images.map((img) => (typeof img === "string" ? img : img?.url || img?.src || "")).filter(Boolean)
              : [],
            skills: Array.isArray(item.skills)
              ? item.skills.map((s) => typeof s === "string" ? s : s?.prettyName || s?.name || "")
              : [],
          })).filter((i) => i.title)
      : [];

    return {
      upwork_url: window.location.href,
      title: profile.title || p.title || src.title || "",
      bio: (profile.description || p.description || src.description || "").slice(0, 5000),
      skills,
      hourly_rate: hourlyRate,
      total_earnings: totalEarnings,
      total_jobs_done: totalJobs,
      total_hours: totalHours,
      member_since: memberSince,
      client_rating: rating,
      country,
      portfolio,
      captured_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[UpScore] normalizeProfile error:", err);
    return {};
  }
}

function detectProfilePage() {
  return window.location.href.match(/\/freelancers\/~/);
}

function detectJobPage() {
  return window.location.href.match(/\/(?:jobs|job)\/[^/]/) || window.location.href.match(/[~/][a-f0-9]{16,}/i);
}

function detectApplyPage() {
  return window.location.href.match(/\/proposals\/job\/[^/]+\/apply/);
}

function extractAndSend() {
  if (detectProfilePage()) {
    injectMainWorld("getProfileFromDom");
  }
  if (detectJobPage()) {
    extractJobFromPage();
  }
}

function injectApplyButton() {
  if (!detectApplyPage()) return;
  const existing = document.getElementById("upscore-apply-btn");
  if (existing) return;

  const target = document.querySelector('[data-qa="cover-letter-textarea"]')?.closest(".form-group") ||
                 document.querySelector("textarea[name='cover_letter']")?.closest("div") ||
                 document.querySelector(".up-form-group");

  if (!target) {
    setTimeout(injectApplyButton, 2000);
    return;
  }

  const btn = document.createElement("button");
  btn.id = "upscore-apply-btn";
  btn.textContent = "Write with AI";
  btn.type = "button";
  Object.assign(btn.style, {
    marginTop: "8px",
    padding: "8px 16px",
    backgroundColor: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  });
  btn.addEventListener("mouseenter", () => { btn.style.backgroundColor = "#6d28d9"; });
  btn.addEventListener("mouseleave", () => { btn.style.backgroundColor = "#7c3aed"; });
  btn.addEventListener("click", async () => {
    btn.textContent = "Generating...";
    btn.disabled = true;
    try {
      const applyMatch = window.location.href.match(/~([a-f0-9]{16,})/);
      const jobUrl = applyMatch
        ? `https://www.upwork.com/jobs/~${applyMatch[1]}`
        : window.location.href;
      const result = await fetchJobFromApi(jobUrl);
      if (!result.success) {
        btn.textContent = "Failed to fetch job";
        setTimeout(() => { btn.textContent = "Write with AI"; btn.disabled = false; }, 2000);
        return;
      }
      chrome.runtime.sendMessage({
        type: "OPEN_SIDEPANEL_WITH_JOB",
        jobDetails: result.data,
      });
    } catch {
      btn.textContent = "Error";
      setTimeout(() => { btn.textContent = "Write with AI"; btn.disabled = false; }, 2000);
    }
  });
  target.parentNode?.insertBefore(btn, target.nextSibling);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case "GET_COOKIES":
      captureCookies();
      sendResponse({ ok: true });
      break;
    case "EXTRACT_PAGE":
      extractAndSend();
      sendResponse({ ok: true });
      break;
    case "EXTRACT_JOB_FROM_PAGE":
      extractJobFromPage().then((result) => {
        sendResponse(result);
      });
      return true;
    case "FETCH_JOB_FROM_API":
      fetchJobFromApi(msg.jobUrl).then((result) => {
        sendResponse(result);
      });
      return true;
    case "INSERT_PORTFOLIO":
      injectMainWorld("insertPortfolioOnApply", { portfolio: msg.portfolio || [] });
      sendResponse({ ok: true });
      break;
  }
  return true;
});

function captureCookies() {
  try {
    chrome.runtime.sendMessage({ type: "GET_UPWORK_COOKIES" });
  } catch (e) { /* ignore */ }
}

window.addEventListener("__upscore_get_cookies", () => {
  try {
    chrome.runtime.sendMessage({ type: "GET_UPWORK_COOKIES", debug: true }, (resp) => {
      window.__upscore_last_cookies = resp?.cookies || "none";
      if (resp?.cookies) {
        navigator.clipboard.writeText(resp.cookies).catch(() => {});
      }
    });
  } catch (e) {}
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      captureCookies();
      extractAndSend();
      injectApplyButton();
    }, 2000);
  });
} else {
  setTimeout(() => {
    captureCookies();
    extractAndSend();
    injectApplyButton();
  }, 2000);
}

let lastUrl = location.href;
const observer = new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    setTimeout(() => {
      captureCookies();
      extractAndSend();
      injectApplyButton();
    }, 2000);
  }
});
if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener("DOMContentLoaded", () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
