import { getToken } from "../lib/upscore-api.js";

const statusText = document.getElementById("statusText");
const statusDot = document.getElementById("statusDot");
const displayApiToken = document.getElementById("displayApiToken");
const displayCookies = document.getElementById("displayCookies");
const btnOptions = document.getElementById("btnOptions");

document.addEventListener("DOMContentLoaded", async () => {
  await loadStatus();

  btnOptions.addEventListener("click", () => chrome.runtime.openOptionsPage());

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "STATUS_UPDATE") {
      updateConnectionStatus(msg.connected, msg.message);
      if (msg.upworkCookies !== undefined) {
        displayCookies.textContent = msg.upworkCookies ? "Captured" : "Not captured";
      }
    }
  });

  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (response) {
      updateConnectionStatus(response.connected, response.statusMessage);
      displayApiToken.textContent = response.apiToken ? "••••••••" : "Not set";
      displayCookies.textContent = response.upworkCookies ? "Captured" : "Not captured";
    }
  });
});

async function loadStatus() {
  const token = await getToken();
  if (!token) {
    updateConnectionStatus(false, "Not connected — open Settings to configure.");
  }
}

function updateConnectionStatus(connected, message) {
  statusDot.className = "status-dot";
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
