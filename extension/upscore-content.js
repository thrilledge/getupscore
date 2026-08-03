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

  if (operation === "getCookies") {
    chrome.runtime.sendMessage({ type: "GET_UPWORK_COOKIES" }, (resp) => {
      window.postMessage({ type: "__upscore_result", operation: "getCookies", cookies: resp?.cookies || "" }, "*");
    });
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
  return (
    window.location.href.match(/\/proposals\/job\/[^/]+\/apply/) ||
    window.location.href.match(/\/job(?:s)?\/[^/]+\/(?:apply|proposal)\//i) ||
    !!findCoverLetterTextarea()
  );
}

function extractAndSend() {
  if (detectProfilePage()) {
    injectMainWorld("getProfileFromDom");
  }
  if (detectJobPage()) {
    return extractJobFromPage().then((result) => {
      if (!result?.success) {
        const alreadyRetried = sessionStorage.getItem("__upscore_refreshed");
        if (!alreadyRetried) {
          sessionStorage.setItem("__upscore_refreshed", "1");
          setTimeout(() => location.reload(), 500);
        }
      }
      return result;
    }).catch(() => {
      const alreadyRetried = sessionStorage.getItem("__upscore_refreshed");
      if (!alreadyRetried) {
        sessionStorage.setItem("__upscore_refreshed", "1");
        setTimeout(() => location.reload(), 500);
      }
    });
  }
  return Promise.resolve();
}

function findCoverLetterTextarea() {
  return (
    document.querySelector("#cover-letter .air3-textarea.inner-textarea") ||
    document.querySelector("#cover-letter textarea") ||
    document.querySelector(".cover-letter-area .air3-textarea.inner-textarea") ||
    document.querySelector('textarea[aria-labelledby="cover_letter_label"]') ||
    document.querySelector(".fe-proposal-additional-details textarea") ||
    document.querySelector('textarea[name="cover_letter"]') ||
    document.querySelector('textarea[id="cover_letter"]') ||
    document.querySelector('[data-qa="cover-letter-textarea"]')
  );
}

function getExtensionSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["upscore_api_url", "upscore_api_token", "upscore_proposal_rules"], (res) => {
      resolve({
        apiUrl: (res.upscore_api_url || "https://getupscore.vercel.app").replace(/\/+$/, ""),
        apiToken: res.upscore_api_token || null,
        rules: res.upscore_proposal_rules || "",
      });
    });
  });
}

function setTextareaValue(textarea, value) {
  textarea.value = value;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  textarea.scrollTop = textarea.scrollHeight;
}

function setBtnState(btn, label, state) {
  btn.textContent = label;
  btn.dataset.state = state || "idle";
  btn.disabled = state === "loading";
}

function resetBtnState(btn) {
  btn.textContent = "Write with AI";
  delete btn.dataset.state;
  btn.disabled = false;
}

async function generateProposalIntoTextarea(btn, textarea, jobDetails, upworkJobId) {
  const settings = await getExtensionSettings();
  if (!settings.apiToken) {
    setBtnState(btn, "Not connected — open Settings", "error");
    setTimeout(() => resetBtnState(btn), 3000);
    return;
  }

  if (!jobDetails && !upworkJobId) {
    setBtnState(btn, "Could not extract job details", "error");
    setTimeout(() => resetBtnState(btn), 3500);
    return;
  }

  const payload = { stream: true };
  if (jobDetails) payload.jobDetails = jobDetails;
  if (upworkJobId) payload.upworkJobId = upworkJobId;
  if (settings.rules) payload.customInstructions = settings.rules;

  let response;
  try {
    response = await fetch(`${settings.apiUrl}/api/proposals/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    setBtnState(btn, "Cannot reach server", "error");
    setTimeout(() => resetBtnState(btn), 3000);
    return;
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "HTTP " + response.status }));
    setBtnState(btn, err.error || "Request failed", "error");
    setTimeout(() => resetBtnState(btn), 3500);
    return;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream")) {
    try {
      const data = await response.json();
      if (data.proposal) {
        setTextareaValue(textarea, textarea.value + data.proposal);
        setBtnState(btn, data.score ? `Written! Score ${data.score}` : "Written!", "done");
        setTimeout(() => resetBtnState(btn), 4000);
      } else {
        setBtnState(btn, "Empty result", "error");
        setTimeout(() => resetBtnState(btn), 3000);
      }
    } catch {
      setBtnState(btn, "Unexpected response", "error");
      setTimeout(() => resetBtnState(btn), 3000);
    }
    return;
  }

  setBtnState(btn, "Writing...", "loading");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let score = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (!json) continue;
        try {
          const parsed = JSON.parse(json);
          if (typeof parsed.text === "string") {
            setTextareaValue(textarea, textarea.value + parsed.text);
          }
          if (parsed.score !== undefined) score = parsed.score;
        } catch { /* ignore */ }
      }
    }
  } catch {
    setBtnState(btn, "Stream interrupted", "error");
    setTimeout(() => resetBtnState(btn), 3000);
    return;
  }

  setBtnState(btn, score !== null ? `Written! Score ${score}` : "Written!", "done");
  setTimeout(() => resetBtnState(btn), 4000);
}

function injectApplyButton() {
  const existing = document.getElementById("upscore-apply-btn");
  if (existing) return;

  const textarea = findCoverLetterTextarea();
  if (!textarea) {
    if (detectApplyPage()) setTimeout(injectApplyButton, 2000);
    return;
  }

  const btn = document.createElement("button");
  btn.id = "upscore-apply-btn";
  btn.type = "button";
  btn.textContent = "Write with AI";
  Object.assign(btn.style, {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    margin: "0 0 8px",
    padding: "7px 14px",
    background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "inherit",
    lineHeight: "1.4",
    boxShadow: "0 1px 3px rgba(37, 99, 235, 0.35)",
    transition: "opacity 0.15s",
  });
  btn.addEventListener("click", async () => {
    const applyMatch = window.location.href.match(/~([a-f0-9]{16,})/);
    const jobUrl = applyMatch
      ? `https://www.upwork.com/jobs/~${applyMatch[1]}`
      : window.location.href;
    const upworkJobId = applyMatch ? applyMatch[1] : null;

    let jobDetails = null;
    setBtnState(btn, "Fetching job...", "loading");

    try {
      const apiResult = await fetchJobFromApi(jobUrl);
      if (apiResult?.success && apiResult?.data) {
        jobDetails = apiResult.data;
      } else {
        const domResult = await extractJobFromPage();
        if (domResult?.success && domResult?.data) jobDetails = domResult.data;
      }
      await generateProposalIntoTextarea(btn, textarea, jobDetails, upworkJobId);
    } catch (err) {
      setBtnState(btn, "Error: " + (err.message || "unknown"), "error");
      setTimeout(() => resetBtnState(btn), 3500);
    }
  });

  textarea.parentNode?.insertBefore(btn, textarea);
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



if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      captureCookies();
      extractAndSend().catch(() => {});
      injectApplyButton();
    }, 2000);
  });
} else {
  setTimeout(() => {
    captureCookies();
    extractAndSend().catch(() => {});
    injectApplyButton();
  }, 2000);
}

let lastUrl = location.href;
const observer = new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    sessionStorage.removeItem("__upscore_refreshed");
    setTimeout(() => {
      captureCookies();
      extractAndSend().catch(() => {});
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
