const apiUrlInput = document.getElementById("apiUrl");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const btnTest = document.getElementById("btnTestConnection");
const btnSave = document.getElementById("btnSave");
const connectionStatus = document.getElementById("connectionStatus");
const authSignedOut = document.getElementById("authSignedOut");
const authSignedIn = document.getElementById("authSignedIn");
const authEmail = document.getElementById("authEmail");

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  await loadAuthState();

  btnLogin.addEventListener("click", login);
  btnLogout.addEventListener("click", logout);
  btnTest.addEventListener("click", testConnection);
  btnSave.addEventListener("click", saveSettings);

  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
});

async function loadSettings() {
  const result = await chrome.storage.sync.get(["upscore_api_url"]);
  if (result.upscore_api_url) {
    apiUrlInput.value = result.upscore_api_url;
  }
}

async function loadAuthState() {
  const auth = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" }, resolve);
  });
  if (auth?.authenticated) {
    setSignedIn(auth.user?.email || "your account");
  } else {
    setSignedOut();
  }
}

function setSignedIn(email) {
  authSignedOut.style.display = "none";
  authSignedIn.style.display = "";
  authEmail.textContent = email || "your account";
  setConnectionStatus("connected", `Signed in as ${email || "your account"}`);
}

function setSignedOut() {
  authSignedIn.style.display = "none";
  authSignedOut.style.display = "";
  setConnectionStatus("disconnected", "Not signed in");
}

async function login() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setConnectionStatus("error", "Enter your email and password.");
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = "Signing in...";
  setConnectionStatus("idle", "Signing in...");

  const res = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "AUTH_LOGIN", email, password }, resolve);
  });

  btnLogin.disabled = false;
  btnLogin.textContent = "Sign in";

  if (res?.ok) {
    passwordInput.value = "";
    setSignedIn(res.user?.email || email);
  } else {
    setConnectionStatus("error", res?.error || "Sign in failed");
  }
}

async function logout() {
  await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "AUTH_LOGOUT" }, resolve);
  });
  setSignedOut();
}

async function testConnection() {
  const url = apiUrlInput.value.trim() || "https://getupscore.vercel.app";

  setConnectionStatus("idle", "Testing connection...");

  const auth = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" }, resolve);
  });
  if (!auth?.authenticated) {
    setConnectionStatus("disconnected", "Not signed in — sign in first.");
    return;
  }

  const tokenRes = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_AUTH_TOKEN" }, resolve);
  });
  if (!tokenRes?.ok) {
    setConnectionStatus("error", tokenRes?.error || "No auth token");
    return;
  }

  try {
    const response = await fetch(`${url.replace(/\/+$/, "")}/api/extension/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenRes.token}`,
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
  const url = apiUrlInput.value.trim() || "https://getupscore.vercel.app";

  await chrome.storage.sync.set({
    upscore_api_url: url,
  });

  chrome.runtime.sendMessage({
    type: "SETTINGS_UPDATED",
    settings: { api_url: url },
  });

  const originalText = btnSave.textContent;
  btnSave.textContent = "Saved";
  setTimeout(() => {
    btnSave.textContent = originalText;
  }, 2000);
}

function setConnectionStatus(state, message) {
  const dot = connectionStatus.querySelector(".dot");
  dot.className = `dot ${state}`;
  const text = connectionStatus.querySelector("span:last-child");
  text.textContent = message;
}
