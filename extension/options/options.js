const apiUrlInput = document.getElementById("apiUrl");
const apiTokenInput = document.getElementById("apiToken");
const btnToggleToken = document.getElementById("btnToggleToken");
const btnTest = document.getElementById("btnTestConnection");
const btnSave = document.getElementById("btnSave");
const connectionStatus = document.getElementById("connectionStatus");

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();

  btnToggleToken.addEventListener("click", toggleTokenVisibility);
  btnTest.addEventListener("click", testConnection);
  btnSave.addEventListener("click", saveSettings);
});

async function loadSettings() {
  const result = await chrome.storage.sync.get([
    "upscore_api_url",
    "upscore_api_token",
  ]);

  if (result.upscore_api_url) {
    apiUrlInput.value = result.upscore_api_url;
  }
  if (result.upscore_api_token) {
    apiTokenInput.value = result.upscore_api_token;
  }

  updateConnectionStatus(!!result.upscore_api_token);
}

function toggleTokenVisibility() {
  const type = apiTokenInput.type;
  apiTokenInput.type = type === "password" ? "text" : "password";
}

async function testConnection() {
  const token = apiTokenInput.value.trim();
  const url = apiUrlInput.value.trim() || "https://getupscore.vercel.app";

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
      setConnectionStatus("connected", `Connected! Server: v${data.version}`);
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
  const url = apiUrlInput.value.trim() || "https://getupscore.vercel.app";

  await chrome.storage.sync.set({
    upscore_api_token: token,
    upscore_api_url: url,
  });

  chrome.runtime.sendMessage({
    type: "SETTINGS_UPDATED",
    settings: {
      api_token: token,
      api_url: url,
    },
  });

  setTimeout(() => testConnection(), 500);

  const originalText = btnSave.textContent;
  btnSave.textContent = "Saved";
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
