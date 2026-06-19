/**
 * UpScore Extension Options — settings page for API configuration.
 */
import { getApiUrl, apiRequest } from "../lib/upscore-api.js";

// ─── DOM refs ───
const apiUrlInput = document.getElementById("apiUrl");
const apiTokenInput = document.getElementById("apiToken");
const btnToggleToken = document.getElementById("btnToggleToken");
const btnTest = document.getElementById("btnTestConnection");
const btnSave = document.getElementById("btnSave");
const connectionStatus = document.getElementById("connectionStatus");
const monitoringText = document.getElementById("monitoringText");
const filtersList = document.getElementById("filtersList");
const checkIntervalSelect = document.getElementById("checkInterval");
const defaultSearchInput = document.getElementById("defaultSearch");

// GroqCloud refs
const groqModelSelect = document.getElementById("groqModel");
const groqKey1 = document.getElementById("groqKey1");
const groqKey2 = document.getElementById("groqKey2");
const groqKey3 = document.getElementById("groqKey3");
const btnTestGroq = document.getElementById("btnTestGroq");
const groqStatus = document.getElementById("groqStatus");

// ─── Init ───
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  await loadFilters();

  btnToggleToken.addEventListener("click", toggleTokenVisibility);
  btnTest.addEventListener("click", testConnection);
  btnSave.addEventListener("click", saveSettings);

  // GroqCloud handlers
  btnTestGroq.addEventListener("click", testGroqConnection);
});

async function loadSettings() {
  const result = await chrome.storage.sync.get([
    "upscore_api_url",
    "upscore_api_token",
    "upscore_check_interval",
    "upscore_default_search",
    "groq_api_keys",
    "groq_model",
  ]);

  if (result.upscore_api_url) {
    apiUrlInput.value = result.upscore_api_url;
  }
  if (result.upscore_api_token) {
    apiTokenInput.value = result.upscore_api_token;
  }
  if (result.upscore_check_interval) {
    checkIntervalSelect.value = String(result.upscore_check_interval);
  }
  if (result.upscore_default_search) {
    defaultSearchInput.value = result.upscore_default_search;
  }

  // Load GroqCloud settings
  const keys = result.groq_api_keys || [];
  if (keys[0]) groqKey1.value = keys[0];
  if (keys[1]) groqKey2.value = keys[1];
  if (keys[2]) groqKey3.value = keys[2];
  if (result.groq_model) {
    groqModelSelect.value = result.groq_model;
  }

  updateConnectionStatus(!!result.upscore_api_token);
  updateGroqStatus(keys.length > 0);
}

async function loadFilters() {
  try {
    const token = await chrome.storage.sync.get("upscore_api_token");
    if (!token.upscore_api_token) {
      filtersList.innerHTML = `<div class="empty-filters">Connect your account to see filters.</div>`;
      return;
    }

    const data = await apiRequest("/api/extension/filters");
    const filters = data.filters || [];

    if (filters.length === 0) {
      filtersList.innerHTML = `<div class="empty-filters">No active filters. Create filters in the UpScore web app.</div>`;
      return;
    }

    filtersList.innerHTML = filters
      .map(
        (f) => `
        <div class="filter-item">
          <div>
            <div class="filter-name">${escapeHtml(f.name)}</div>
            <div class="filter-keywords">${escapeHtml(f.keywords?.join(", ") || "No keywords")}</div>
          </div>
          ${f.is_active ? '<span class="filter-badge">Active</span>' : ""}
        </div>
      `
      )
      .join("");
  } catch (err) {
    filtersList.innerHTML = `<div class="empty-filters">Could not load filters: ${escapeHtml(err.message)}</div>`;
  }
}

function toggleTokenVisibility() {
  const type = apiTokenInput.type;
  apiTokenInput.type = type === "password" ? "text" : "password";
}

async function testConnection() {
  const token = apiTokenInput.value.trim();
  const url = apiUrlInput.value.trim() || "http://localhost:3000";

  if (!token) {
    setConnectionStatus("disconnected", "Please enter an API token.");
    return;
  }

  setConnectionStatus("idle", "Testing connection...");

  try {
    const response = await fetch(`${url}/api/extension/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const filterMsg = data.filter_count > 0
        ? `${data.filter_count} active filter(s) found ✅`
        : "No filters yet — create them in UpScore web app";
      setConnectionStatus("connected", `Connected! Server: v${data.version}, ${filterMsg}`);

      // Update filter count display
      if (data.filter_count > 0) {
        await loadFilters();
      }
    } else {
      const data = await response.json().catch(() => ({}));
      setConnectionStatus("error", data.error || `Server responded with ${response.status}`);
    }
  } catch (err) {
    setConnectionStatus("error", `Cannot reach server: ${err.message}`);
  }
}

async function saveSettings() {
  const token = apiTokenInput.value.trim();
  const url = apiUrlInput.value.trim() || "http://localhost:3000";
  const interval = parseInt(checkIntervalSelect.value, 10);
  const defaultSearch = defaultSearchInput.value.trim();

  // GroqCloud settings
  const keys = [
    groqKey1.value.trim(),
    groqKey2.value.trim(),
    groqKey3.value.trim(),
  ].filter(Boolean);
  const model = groqModelSelect.value;

  await chrome.storage.sync.set({
    upscore_api_token: token,
    upscore_api_url: url,
    upscore_check_interval: interval,
    upscore_default_search: defaultSearch || "",
    groq_api_keys: keys,
    groq_model: model,
  });

  // Update background worker
  chrome.runtime.sendMessage({
    type: "SETTINGS_UPDATED",
    settings: {
      api_token: token,
      api_url: url,
      check_interval: interval,
      default_search: defaultSearch || "",
      groq_api_keys: keys,
      groq_model: model,
    },
  });

  // Update monitoring status
  updateMonitoringStatus(token);
  updateGroqStatus(keys.length > 0);

  // Reload filters
  await loadFilters();

  // Auto-test connection after save
  setTimeout(() => testConnection(), 500);

  // Show feedback
  const originalText = btnSave.textContent;
  btnSave.textContent = "Saved ✓";
  setTimeout(() => {
    btnSave.textContent = originalText;
  }, 2000);
}

function updateConnectionStatus(hasToken) {
  if (hasToken) {
    setConnectionStatus("connected", "Token configured");
  } else {
    setConnectionStatus("disconnected", "Not connected");
  }
}

function setConnectionStatus(state, message) {
  const dot = connectionStatus.querySelector(".dot");
  dot.className = `dot ${state}`;
  const text = connectionStatus.querySelector("span:last-child");
  text.textContent = message;
}

function updateMonitoringStatus(hasToken) {
  const dot = document.querySelector("#monitoringStatus .dot");
  if (hasToken) {
    dot.className = "dot connected";
    monitoringText.textContent = "Active — monitoring Upwork jobs";
  } else {
    dot.className = "dot idle";
    monitoringText.textContent = "Configure API token to start monitoring";
  }
}

// ─── GroqCloud ───

function updateGroqStatus(hasKeys) {
  const dot = groqStatus.querySelector(".dot");
  const text = groqStatus.querySelector("span:last-child");
  if (hasKeys) {
    dot.className = "dot connected";
    text.textContent = `GroqCloud configured with ${countConfiguredKeys()} key(s)`;
  } else {
    dot.className = "dot idle";
    text.textContent = "No API keys configured — keyword analysis will be used";
  }
}

function countConfiguredKeys() {
  return [groqKey1.value.trim(), groqKey2.value.trim(), groqKey3.value.trim()].filter(Boolean).length;
}

async function testGroqConnection() {
  const keys = [
    groqKey1.value.trim(),
    groqKey2.value.trim(),
    groqKey3.value.trim(),
  ].filter(Boolean);

  if (keys.length === 0) {
    setGroqStatus("error", "No API keys entered");
    return;
  }

  setGroqStatus("idle", `Testing key #1...`);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${keys[0]}` },
    });

    if (response.ok) {
      const data = await response.json();
      const modelCount = data.data?.length || "?";
      setGroqStatus("connected", `✅ Key #1 valid — ${modelCount} models available (${keys.length} key(s) total)`);
    } else if (response.status === 401) {
      setGroqStatus("error", "Key #1 is invalid — check your GroqCloud API key");
    } else if (response.status === 429) {
      setGroqStatus("error", "Rate limited on key #1 — try again later");
    } else {
      setGroqStatus("error", `Groq responded with ${response.status}`);
    }
  } catch (err) {
    setGroqStatus("error", `Cannot reach GroqCloud: ${err.message}`);
  }
}

function setGroqStatus(state, message) {
  const dot = groqStatus.querySelector(".dot");
  dot.className = `dot ${state}`;
  const text = groqStatus.querySelector("span:last-child");
  text.textContent = message;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
