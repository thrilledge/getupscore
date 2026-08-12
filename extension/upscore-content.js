let bridgeReady = false;
const bridgeQueue = [];

function contextOk() {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

function injectMainWorldBridge() {
  if (bridgeReady) return Promise.resolve();
  if (bridgeQueue.length > 0) {
    return new Promise((resolve) => bridgeQueue.push(resolve));
  }
  return new Promise((resolve) => {
    bridgeQueue.push(resolve);
    let src;
    try {
      src = chrome.runtime.getURL("lib/main-world.js");
    } catch {
      bridgeReady = true;
      const q = bridgeQueue.splice(0);
      q.forEach((r) => r());
      return;
    }
    const script = document.createElement("script");
    script.src = src;
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

const pendingJobRequests = new Map();
let jobRequestSeq = 0;

let cachedJobCiphertext = null;
let cachedJobDetails = null;

function requestJobDetails(operation, params) {
  const requestId = "jr_" + ++jobRequestSeq;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      pendingJobRequests.delete(requestId);
      resolve({ success: false, error: "Timeout" });
    }, 20000);
    pendingJobRequests.set(requestId, { resolve, timeout });
    injectMainWorld(operation, { ...params, requestId });
  });
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== "__upscore_result") return;

  const { operation } = event.data;

  if (operation === "profileDetail") {
    if (!event.data.success) return;
    const profile = normalizeProfile(event.data.data);
    if (profile.title) {
      if (contextOk()) {
        showProfileToast("Syncing Upwork profile...", "info", 0);
        chrome.runtime.sendMessage({ type: "PROFILE_CAPTURED", profile }, (res) => {
          if (!res?.ok && res?.error === "Not signed in") {
            showProfileToast("Sign in to sync your profile", "error");
            return;
          }
          if (!res?.ok) {
            showProfileToast("Profile sync failed", "error");
            return;
          }
          if (res.changed && res.changed.length > 0) {
            showProfileToast("Profile synced — updates saved", "success");
          } else if (res.created) {
            showProfileToast("Profile synced", "success");
          } else {
            showProfileToast("Profile already up to date", "success");
          }
        });
      }
    }
  }

  if (operation === "jobDetails") {
    const requestId = event.data?.requestId;
    if (requestId && pendingJobRequests.has(requestId)) {
      const { resolve, timeout } = pendingJobRequests.get(requestId);
      clearTimeout(timeout);
      pendingJobRequests.delete(requestId);
      resolve(event.data);
    }
    if (event.data.success && contextOk()) {
      const job = event.data.data;
      if (job) {
        const urlMatch = location.href.match(/~([a-f0-9]{16,})/);
        if (urlMatch) {
          cachedJobCiphertext = "~" + urlMatch[1];
          cachedJobDetails = job;
        }
      }
      chrome.runtime.sendMessage({ type: "JOBS_CAPTURED", jobs: [job] });
    }
  }

  if (operation === "getCookies") {
    if (!contextOk()) return;
    chrome.runtime.sendMessage({ type: "GET_UPWORK_COOKIES" }, (resp) => {
      window.postMessage({ type: "__upscore_result", operation: "getCookies", cookies: resp?.cookies || "" }, "*");
    });
  }
});

function extractJobFromPage() {
  return requestJobDetails("getJobDetailsFromDom", {});
}

function fetchJobFromApi(jobUrl) {
  const match = jobUrl.match(/[~/]([a-f0-9]{16,})/i);
  if (!match) {
    return Promise.resolve({ success: false, error: "Could not extract job ID from URL" });
  }
  const ciphertext = "~" + match[1];
  return new Promise((resolve) => {
    if (!contextOk()) {
      resolve({ success: false, error: "Extension updated - please refresh this page" });
      return;
    }
    // Get the visitor_gql_token from background script (can read HttpOnly cookies)
    chrome.runtime.sendMessage({ type: "GET_VISITOR_GQL_TOKEN" }, (response) => {
      const token = response?.token || null;
      requestJobDetails("fetchJobFromApi", { ciphertext, token }).then(resolve);
    });
  });
}

let profileToastTimer = null;
function showProfileToast(message, type = "info", duration = 3500) {
  let toast = document.getElementById("upscore-profile-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "upscore-profile-toast";
    Object.assign(toast.style, {
      position: "fixed",
      top: "16px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "2147483647",
      padding: "10px 16px",
      borderRadius: "10px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "13px",
      fontWeight: "600",
      color: "#fff",
      boxShadow: "0 4px 16px rgba(15, 23, 42, 0.25)",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "opacity 0.2s",
    });
    document.documentElement.appendChild(toast);
  }
  const colors = {
    info: "linear-gradient(135deg, #2563eb 0%, #6634c0 100%)",
    success: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
    error: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
  };
  toast.style.background = colors[type] || colors.info;
  toast.textContent = message;
  toast.style.display = "flex";
  toast.style.opacity = "1";
  if (profileToastTimer) clearTimeout(profileToastTimer);
  if (duration > 0) {
    profileToastTimer = setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => { toast.style.display = "none"; }, 250);
    }, duration);
  }
}

function syncProfileToast() {
  if (!detectProfilePage()) return;
  showProfileToast("Syncing Upwork profile...", "info", 0);
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
            url: item.url || item.projectUrl || item.project_url || item.link || item.website || item.externalUrl || item.previewLink || "",
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
    console.error("[Get UpScore] normalizeProfile error:", err);
    return {};
  }
}

function detectProfilePage() {
  return window.location.href.match(/\/freelancers\/(~|me\/?)/);
}

function detectJobPage() {
  return window.location.href.match(/\/(?:jobs|job)\/[^/]/) || window.location.href.match(/[~/][a-f0-9]{16,}/i);
}

function detectApplyPage() {
  return (
    window.location.href.match(/\/proposals\/job\/[^/]+\/apply/) ||
    window.location.href.match(/\/job(?:s)?\/[^/]+\/(?:apply|proposal)\//i) ||
    !!document.querySelector("#cover-letter, .cover-letter-area, .fe-proposal")
  );
}

function findCoverLetterTextarea() {
  return findApplyTextareas()[0] || null;
}

/**
 * Every textarea on the apply page — the cover letter plus any additional
 * question fields. Each one gets its own "Write with AI" button.
 */
function findApplyTextareas() {
  const found = new Set();
  const selectors = [
    "#cover-letter .air3-textarea.inner-textarea",
    "#cover-letter textarea",
    ".cover-letter-area .air3-textarea.inner-textarea",
    ".cover-letter-area textarea",
    'textarea[aria-labelledby="cover_letter_label"]',
    'textarea[name="cover_letter"]',
    'textarea[id="cover_letter"]',
    '[data-qa="cover-letter-textarea"]',
  ];
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => {
      el.dataset.upscoreRole = "cover-letter";
      found.add(el);
    });
  }

  // Additional question textareas — every visible textarea in the apply form.
  const applyRoot =
    document.querySelector(".fe-proposal") ||
    document.querySelector(".fe-form") ||
    document.querySelector(".fe-apply-page") ||
    document.querySelector("form[id*='apply']");
  const candidates = applyRoot
    ? [...applyRoot.querySelectorAll("textarea")]
    : [...document.querySelectorAll("textarea")];
  for (const el of candidates) {
    if (found.has(el)) continue;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const visible = rect.width > 20 && rect.height > 20 && style.visibility !== "hidden" && style.display !== "none";
    if (visible) found.add(el);
  }
  return [...found];
}

/** Pull the question text shown next to a textarea (for question-specific answers). */
function getQuestionText(textarea) {
  try {
    // 1. aria-labelledby → element id
    const labelledBy = textarea.getAttribute("aria-labelledby");
    if (labelledBy) {
      const label = document.getElementById(labelledBy);
      if (label?.textContent?.trim()) return label.textContent.trim().slice(0, 300);
    }

    // 2. Associated <label for="..."> elements
    if (textarea.labels?.length) {
      for (const l of textarea.labels) {
        if (l?.textContent?.trim()) return l.textContent.trim().slice(0, 300);
      }
    }

    // 3. aria-label / placeholder / name attributes
    const attr = textarea.getAttribute("aria-label") || textarea.getAttribute("placeholder") || textarea.getAttribute("name");
    if (attr && attr.trim() && attr.trim().length > 5 && !/^upscore/.test(attr)) {
      return attr.trim().slice(0, 300);
    }

    // 4. Walk up ancestors looking for a label/heading near the field
    const labelSelectors = "label, .air3-form-label, .label, [class*='label'], h2, h3, .title, strong, legend";
    let el = textarea;
    for (let depth = 0; el && depth < 6; depth++) {
      el = el.parentElement;
      if (!el) continue;
      const label = el.querySelector(labelSelectors);
      if (label?.textContent?.trim()) return label.textContent.trim().slice(0, 300);
    }

    // 5. Last resort: nearest label element anywhere before the textarea in
    //    document order (covers grid/flex layouts where the label is a sibling
    //    container, not an ancestor).
    let nearest = null;
    for (const l of document.querySelectorAll(labelSelectors)) {
      if (l.textContent?.trim() && (l.compareDocumentPosition(textarea) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        nearest = l;
      }
    }
    if (nearest?.textContent?.trim()) return nearest.textContent.trim().slice(0, 300);

    return "";
  } catch {
    return "";
  }
}

function getAuthTokenFromBackground() {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "GET_AUTH_TOKEN" }, (res) => {
        if (chrome.runtime.lastError) return resolve(null);
        resolve(res?.ok ? res.token : null);
      });
    } catch {
      resolve(null);
    }
  });
}

function getExtensionSettings() {
  return new Promise(async (resolve) => {
    const res = await new Promise((r) =>
      chrome.storage.sync.get(["upscore_api_url", "upscore_proposal_rules"], r)
    );
    const apiToken = await getAuthTokenFromBackground();
    resolve({
      apiUrl: (res.upscore_api_url || "https://getupscore.vercel.app").replace(/\/+$/, ""),
      apiToken,
      rules: res.upscore_proposal_rules || "",
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
  btn.textContent = btn.dataset.idleLabel || "Write with AI";
  delete btn.dataset.state;
  btn.disabled = false;
}

async function generateProposalIntoTextarea(btn, textarea, jobDetails, question) {
  setBtnState(btn, question ? "Answering..." : "Writing...", "loading");
  const settings = await getExtensionSettings();
  if (!settings.apiToken) {
    resetBtnState(btn);
    pendingGenerate = { btn, textarea, jobDetails, question };
    showSignInPopup();
    return;
  }

  const payload = { jobDetails, stream: true };
  const rules = settings.rules || "";
  if (question) {
    // Additional-question field: the server answers that specific question
    // in short form instead of writing a full proposal.
    payload.answerQuestion = question;
  } else {
    if (rules) payload.customInstructions = rules;
  }

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
        setTextareaValue(textarea, textarea.value + data.proposal.replace(/[*_`]/g, ""));
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

  setBtnState(btn, question ? "Answering..." : "Writing...", "loading");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let score = null;

  const stripMarkdown = (s) => String(s).replace(/[*_`]/g, "");

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
            setTextareaValue(textarea, textarea.value + stripMarkdown(parsed.text));
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

let applyBtnCounter = 0;

let pendingGenerate = null;

function dashboardUrl(path) {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(["upscore_api_url"], (res) => {
        const base = (res.upscore_api_url || "https://getupscore.vercel.app").replace(/\/+$/, "");
        resolve(base + path);
      });
    } catch {
      resolve("https://getupscore.vercel.app" + path);
    }
  });
}

function showSignInPopup() {
  if (document.getElementById("upscore-signin-popup")) return;

  const popup = document.createElement("div");
  popup.id = "upscore-signin-popup";
  Object.assign(popup.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(15, 23, 42, 0.55)",
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    background: "#ffffff",
    color: "#0f172a",
    width: "360px",
    maxWidth: "calc(100vw - 32px)",
    borderRadius: "16px",
    padding: "28px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
    textAlign: "center",
    boxSizing: "border-box",
    position: "relative",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  });

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.title = "Close";
  Object.assign(close.style, {
    position: "absolute",
    top: "8px",
    right: "10px",
    border: "none",
    background: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#64748b",
    lineHeight: "1",
    padding: "4px",
  });
  close.addEventListener("click", () => {
    pendingGenerate = null;
    removeSignInPopup();
  });

  const logo = document.createElement("div");
  logo.textContent = "U";
  Object.assign(logo.style, {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    margin: "0 auto 12px",
    background: "linear-gradient(135deg, #2563eb 0%, #6634c0 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    fontWeight: "700",
  });

  const title = document.createElement("h2");
  title.textContent = "Sign In";
  Object.assign(title.style, { margin: "0 0 8px", fontSize: "20px", fontWeight: "700" });

  const welcome = document.createElement("p");
  welcome.textContent = "Sign in with your Get UpScore dashboard account to continue.";
  Object.assign(welcome.style, { margin: "0 0 16px", color: "#475569", fontSize: "14px", lineHeight: "1.5" });

  const signInBtn = document.createElement("button");
  signInBtn.type = "button";
  signInBtn.id = "upscore-login-btn";
  signInBtn.textContent = "Sign in on Dashboard";
  Object.assign(signInBtn.style, {
    display: "block",
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #2563eb 0%, #6634c0 100%)",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  });
  signInBtn.addEventListener("click", () => {
    dashboardUrl("/login").then((u) => window.open(u, "_blank", "noopener,noreferrer"));
  });

  const hint = document.createElement("p");
  hint.textContent = "After signing in, this window closes automatically and your proposal is generated.";
  Object.assign(hint.style, { margin: "10px 0 0", color: "#64748b", fontSize: "12px", lineHeight: "1.5" });

  const register = document.createElement("p");
  Object.assign(register.style, { margin: "14px 0 0", color: "#475569", fontSize: "13px" });
  register.innerHTML = 'Don&apos;t have an account? <a href="#" style="color:#2563eb;font-weight:600;text-decoration:none">Register</a>';
  register.querySelector("a").addEventListener("click", (e) => {
    e.preventDefault();
    dashboardUrl("/signup?from=extension").then((u) => window.open(u, "_blank", "noopener,noreferrer"));
  });

  const terms = document.createElement("p");
  Object.assign(terms.style, { margin: "10px 0 0", color: "#94a3b8", fontSize: "11px", lineHeight: "1.5" });
  terms.innerHTML = 'By signing in you agree to our <a href="#" style="color:#94a3b8;text-decoration:underline">Terms &amp; Conditions</a>.';
  terms.querySelector("a").addEventListener("click", (e) => {
    e.preventDefault();
    window.open("https://getupscore.vercel.app", "_blank", "noopener,noreferrer");
  });

  card.append(close, logo, title, welcome, signInBtn, hint, register, terms);
  popup.appendChild(card);
  document.documentElement.appendChild(popup);
}

function removeSignInPopup() {
  const el = document.getElementById("upscore-signin-popup");
  if (el) el.remove();
}

function injectApplyButton() {
  if (!detectApplyPage()) return;

  const textareas = findApplyTextareas();
  if (textareas.length === 0) {
    setTimeout(injectApplyButton, 2000);
    return;
  }

  for (const textarea of textareas) {
    if (textarea.dataset.upscoreBtnAdded) continue;
    textarea.dataset.upscoreBtnAdded = "1";

    const btn = document.createElement("button");
    btn.id = "upscore-apply-btn-" + applyBtnCounter++;
    btn.type = "button";
    btn.textContent = "Write with AI";
    Object.assign(btn.style, {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      margin: "0 0 8px",
      padding: "7px 14px",
      background: "linear-gradient(135deg, #2563eb 0%, #6634c0 100%)",
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

    const detectedQuestion = getQuestionText(textarea);
    const isCoverLetter =
      textarea.dataset.upscoreRole === "cover-letter" && /cover letter/i.test(detectedQuestion);
    const question = isCoverLetter ? "" : detectedQuestion;
    if (!isCoverLetter) {
      console.log(
        "[Get UpScore] textarea", textarea.id || textarea.name || "(no id)",
        "| label found:", question ? "YES" : "NO",
        "| question:", question ? JSON.stringify(question) : "(none)"
      );
    }
    const idleLabel = question ? "Write answer" : "Write with AI";
    btn.dataset.idleLabel = idleLabel;
    btn.textContent = idleLabel;
    btn.title = question
      ? "Write answer for: " + question
      : isCoverLetter
        ? "Write cover letter proposal"
        : "No label detected - question field? Right-click > Inspect";

    btn.addEventListener("click", async () => {
      if (!contextOk()) {
        setBtnState(btn, "Extension updated - refresh this page", "error");
        setTimeout(() => resetBtnState(btn), 5000);
        return;
      }
      const applyMatch = window.location.href.match(/~([a-f0-9]{16,})/);
      const jobUrl = applyMatch
        ? `https://www.upwork.com/jobs/~${applyMatch[1]}`
        : window.location.href;
      const ciphertext = applyMatch ? "~" + applyMatch[1] : null;

      let jobDetails = null;
      // Reuse already-extracted details for this job — don't re-fetch every click.
      if (ciphertext && cachedJobCiphertext === ciphertext && cachedJobDetails) {
        jobDetails = cachedJobDetails;
      }

      if (!jobDetails) {
        setBtnState(btn, question ? "Answering..." : "Fetching job...", "loading");
        try {
          const apiResult = await fetchJobFromApi(jobUrl);
          let failReason = "";
          if (apiResult?.success && apiResult?.data) {
            jobDetails = apiResult.data;
          } else {
            failReason = "API: " + (apiResult?.error || "no data");
            const domResult = await extractJobFromPage();
            if (domResult?.success && domResult?.data) {
              jobDetails = domResult.data;
            } else {
              failReason += " | DOM: " + (domResult?.error || "no data");
            }
          }
          if (!jobDetails) throw new Error("Could not extract job details - " + failReason);
        } catch (err) {
          setBtnState(btn, "Error: " + (err.message || "unknown"), "error");
          setTimeout(() => resetBtnState(btn), 5000);
          return;
        }
        if (ciphertext) {
          cachedJobCiphertext = ciphertext;
          cachedJobDetails = jobDetails;
        }
      }

      await generateProposalIntoTextarea(btn, textarea, jobDetails, question);
    });

    textarea.parentNode?.insertBefore(btn, textarea);
  }
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

function onAuthAvailable() {
  removeSignInPopup();
  const pending = pendingGenerate;
  pendingGenerate = null;
  if (pending) {
    generateProposalIntoTextarea(pending.btn, pending.textarea, pending.jobDetails, pending.question);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case "GET_COOKIES":
      captureCookies();
      sendResponse({ ok: true });
      break;
    case "GET_MY_PROFILE_URL": {
      let url = null;
      const candidates = [
        document.querySelector(".nav-user-info-link"),
        document.querySelector("a[data-testid='my-profile-link']"),
        document.querySelector("a[href*='/freelancers/~']"),
        document.querySelector("a[href*='/freelancers/']"),
        document.querySelector("link[rel='canonical']"),
      ];
      for (const el of candidates) {
        const href = el?.href;
        if (href && /\/freelancers\/(~|me\/)/.test(href) && !/\/proposals\//.test(href)) {
          url = href;
          break;
        }
      }
      sendResponse({ ok: !!url, url });
      break;
    }
    case "EXTRACT_PAGE":
      extractAndSend();
      sendResponse({ ok: true });
      break;
    case "EXTRACT_JOB_FROM_PAGE":
      extractJobFromPage().then((result) => {
        sendResponse(result);
      });
      return true;
    case "INSERT_PORTFOLIO":
      injectMainWorld("insertPortfolioOnApply", { portfolio: msg.portfolio || [] });
      sendResponse({ ok: true });
      break;
    case "AUTH_UPDATED":
      if (msg.authenticated) onAuthAvailable();
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
      injectApplyButton();
      extractAndSend().catch(() => {});
    }, 2000);
  });
} else {
  setTimeout(() => {
    captureCookies();
    injectApplyButton();
    extractAndSend().catch(() => {});
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
      injectApplyButton();
      extractAndSend().catch(() => {});
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
