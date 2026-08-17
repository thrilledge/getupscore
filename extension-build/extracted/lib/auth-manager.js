/**
 * Session management for the Get UpScore extension.
 *
 * The extension signs in with the same Supabase account as the dashboard.
 * Credentials are exchanged for a session via the backend, and only the
 * tokens are kept in chrome.storage.local. Access tokens expire after ~1h,
 * so the stored refresh_token is used to mint a fresh token on demand.
 *
 * Session shape stored under "upscore_session":
 *   { access_token, refresh_token, expires_at, expires_in, user: {id, email, display_name} }
 */

const SESSION_KEY = "upscore_session";
const EXPIRY_SKEW_MS = 60 * 1000;

function getStoredSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get([SESSION_KEY], (res) => {
      resolve(res[SESSION_KEY] || null);
    });
  });
}

function setStoredSession(session) {
  return new Promise((resolve) => {
    if (session) {
      chrome.storage.local.set({ [SESSION_KEY]: session }, resolve);
    } else {
      chrome.storage.local.remove([SESSION_KEY], resolve);
    }
  });
}

function normalizeSession(session, user) {
  return {
    access_token: session?.access_token || null,
    refresh_token: session?.refresh_token || null,
    expires_at: session?.expires_at || null,
    expires_in: session?.expires_in || null,
    user: user || session?.user || null,
  };
}

function isExpired(session) {
  if (!session?.expires_at) return true;
  return session.expires_at * 1000 - Date.now() < EXPIRY_SKEW_MS;
}

async function callBackend(apiUrl, path, body) {
  const response = await fetch(`${apiUrl.replace(/\/+$/, "")}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.error || `Server responded with ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return data;
}

async function login(apiUrl, email, password) {
  const data = await callBackend(apiUrl, "/api/extension/auth/login", { email, password });
  const session = normalizeSession(data.session, data.user);
  await setStoredSession(session);
  return session;
}

async function logout() {
  await setStoredSession(null);
}

async function refreshSession(apiUrl, session) {
  if (!session?.refresh_token) return null;
  try {
    const data = await callBackend(apiUrl, "/api/extension/auth/refresh", {
      refresh_token: session.refresh_token,
    });
    const fresh = normalizeSession(data.session, data.user);
    await setStoredSession(fresh);
    return fresh;
  } catch {
    await setStoredSession(null);
    return null;
  }
}

/**
 * Return a valid access token for backend calls, refreshing via the backend
 * when the stored one is missing or expired. Returns null when not signed in.
 */
async function getAccessToken(apiUrl) {
  let session = await getStoredSession();
  if (!session?.access_token) return null;
  if (isExpired(session)) {
    session = await refreshSession(apiUrl, session);
    if (!session) return null;
  }
  return session.access_token;
}

async function getSession() {
  return getStoredSession();
}

/**
 * Store a session handed over by the dashboard after the user signs in there.
 * Payload shape: { session: {access_token, refresh_token, expires_at, expires_in}, user: {...} }
 * Returns the normalized stored session, or null when there's no access token.
 */
async function setSession(payload) {
  const normalized = normalizeSession(payload?.session, payload?.user);
  if (!normalized.access_token) return null;
  await setStoredSession(normalized);
  return normalized;
}

async function getAuthState() {
  const session = await getStoredSession();
  return {
    authenticated: !!session?.access_token,
    user: session?.user || null,
  };
}

export {
  getSession,
  getAuthState,
  getAccessToken,
  login,
  logout,
  setSession,
  normalizeSession,
};
