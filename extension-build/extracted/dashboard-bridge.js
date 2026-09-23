// Runs on the Get UpScore dashboard so that signing in there also signs in the
// extension automatically.
//
// The dashboard uses @supabase/ssr (createBrowserClient), which stores the
// session in COOKIES, not localStorage: one or more `sb-<ref>-auth-token`
// cookies whose values are `base64-` prefixed base64url-encoded JSON
// (chunked as `sb-<ref>-auth-token.0`, `.1`, ... when large). We read and
// decode those cookies here and forward the tokens to the background service
// worker, which stores them as the extension session.
//
// No dashboard deploy is required — the extension reads the session itself.
(() => {
  const SESSION_COOKIE_RE = /^(__Secure-|__Host-)?sb-.+-auth-token(\.[0-9]+)?$/;
  const SESSION_LS_RE = /^sb-.+-auth-token$/;
  const seenTokens = new Set();
  let pollTimer = null;

  function fromBase64URL(str) {
    const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function decodeValue(raw) {
    if (!raw) return null;
    let value = raw;
    if (value.startsWith("base64-")) {
      value = value.slice("base64-".length);
    }
    if (!(typeof value === "string" && value.trim().startsWith("{"))) {
      try {
        value = fromBase64URL(value);
      } catch {
        return null;
      }
    }
    try {
      const obj = JSON.parse(value);
      return obj && typeof obj === "object" ? obj : null;
    } catch {
      return null;
    }
  }

  function extractPayload(obj) {
    if (!obj) return null;
    const s = obj?.currentSession || obj?.session || obj?.data?.session || obj;
    if (s?.access_token && s?.refresh_token) {
      return {
        session: {
          access_token: s.access_token,
          refresh_token: s.refresh_token,
          expires_at: s.expires_at ?? null,
          expires_in: s.expires_in ?? null,
        },
        user: {
          id: s.user?.id ?? null,
          email: s.user?.email ?? null,
          display_name:
            s.user?.user_metadata?.full_name ||
            s.user?.user_metadata?.name ||
            s.user?.email ||
            "",
        },
      };
    }
    return null;
  }

  function forwardToExtension(payload) {
    if (!chrome?.runtime?.id) return;
    if (seenTokens.has(payload.session.access_token)) return;
    seenTokens.add(payload.session.access_token);
    chrome.runtime.sendMessage(
      {
        type: "AUTH_TOKEN_RECEIVED",
        session: payload.session,
        user: payload.user,
      },
      () => void chrome.runtime.lastError
    );
  }

  function readSessionCookies() {
    const cookieMap = {};
    document.cookie.split(";").forEach((part) => {
      const idx = part.indexOf("=");
      if (idx < 0) return;
      const name = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (SESSION_COOKIE_RE.test(name)) cookieMap[name] = value;
    });

    const bases = new Set(
      Object.keys(cookieMap).map((name) => name.replace(/\.[0-9]+$/, ""))
    );

    for (const base of bases) {
      const names = Object.keys(cookieMap)
        .filter((n) => n === base || n.startsWith(base + "."))
        .sort((a, b) => {
          if (a === base) return -1;
          if (b === base) return 1;
          return parseInt(a.split(".").pop(), 10) - parseInt(b.split(".").pop(), 10);
        });
      const combined = names.map((n) => cookieMap[n]).join("");
      const payload = extractPayload(decodeValue(combined));
      if (payload) forwardToExtension(payload);
    }
  }

  function readSessionLocalStorage() {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !SESSION_LS_RE.test(key)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const payload = extractPayload(decodeValue(raw));
      if (payload) forwardToExtension(payload);
    }
  }

  function scan() {
    try {
      readSessionCookies();
    } catch {
      /* cookie access may be restricted */
    }
    try {
      readSessionLocalStorage();
    } catch {
      /* localStorage may be unavailable */
    }
  }

  // Explicit handoff from the dashboard login/signup pages (future-proof).
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== "UPSCORE_EXT_LOGIN") return;
    if (data.session?.access_token) {
      forwardToExtension({ session: data.session, user: data.user });
    }
  });

  // LocalStorage writes from another tab → storage event fires.
  window.addEventListener("storage", (event) => {
    if (event.key && event.key.startsWith("sb-")) scan();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scan();
  });

  // Initial scan + fallback polling: login happens in the same tab, so no
  // storage event fires — the poll picks the freshly written cookies up.
  scan();
  pollTimer = setInterval(scan, 10000);
  window.addEventListener("pageshow", scan);
  window.addEventListener("focus", scan);
})();
