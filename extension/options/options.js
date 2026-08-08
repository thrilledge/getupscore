const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const connectionStatus = document.getElementById("connectionStatus");
const authSignedOut = document.getElementById("authSignedOut");
const authSignedIn = document.getElementById("authSignedIn");
const authEmail = document.getElementById("authEmail");

let apiUrl = "https://getupscore.vercel.app";

document.addEventListener("DOMContentLoaded", async () => {
  const stored = await chrome.storage.sync.get(["upscore_api_url"]);
  if (stored.upscore_api_url) apiUrl = stored.upscore_api_url;

  await loadAuthState();

  btnLogin.addEventListener("click", login);
  btnLogout.addEventListener("click", logout);

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "AUTH_UPDATED" || msg.type === "STATUS_UPDATE") {
      loadAuthState();
    }
  });
});

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

function login() {
  const url = `${(apiUrl || "https://getupscore.vercel.app").replace(/\/+$/, "")}/login`;
  chrome.tabs.create({ url });
  setConnectionStatus("idle", "Sign in on the dashboard tab — this page connects automatically.");
}

async function logout() {
  await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "AUTH_LOGOUT" }, resolve);
  });
  setSignedOut();
}

function setConnectionStatus(state, message) {
  const dot = connectionStatus.querySelector(".dot");
  dot.className = `dot ${state}`;
  const text = connectionStatus.querySelector("span:last-child");
  text.textContent = message;
}
