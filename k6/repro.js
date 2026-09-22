import http from "k6/http";
import { check, sleep } from "k6";
import { b64encode } from "k6/encoding";

const BASE = __ENV.BASE_URL || "https://www.getupscore.com";
const AUTH = __ENV.AUTH_URL || "https://db.getupscore.com";
const ANON = __ENV.ANON_KEY || "";
const SERVICE = __ENV.SERVICE_KEY || "";
const STORAGE_KEY = "sb-db-auth-token";

export const options = {
  scenarios: {
    authed: { executor: "constant-vus", vus: 4, duration: "40s", exec: "authed" },
    landing: {
      executor: "constant-vus",
      vus: 10,
      duration: "40s",
      exec: "landing",
      startTime: "0s",
    },
  },
};

const PUBLIC_PAGES = ["/", "/login", "/signup", "/privacy", "/terms", "/security", "/status", "/tools"];

export function setup() {
  const email = "qa.repro." + Date.now() + "@getupscore.com";
  const password = "QaTmp!x" + Math.floor(Math.random() * 1e9);
  http.post(AUTH + "/auth/v1/admin/users", JSON.stringify({ email, password, email_confirm: true }), {
    headers: { apikey: ANON, Authorization: "Bearer " + SERVICE, "Content-Type": "application/json" },
  });
  const tok = http.post(AUTH + "/auth/v1/token?grant_type=password", JSON.stringify({ email, password }), {
    headers: { apikey: ANON, "Content-Type": "application/json" },
  });
  const s = tok.json();
  const session = {
    access_token: s.access_token,
    token_type: "bearer",
    expires_in: s.expires_in || 3600,
    expires_at: Math.floor(Date.now() / 1000) + (s.expires_in || 3600),
    refresh_token: s.refresh_token,
    provider_token: null,
    provider_refresh_token: null,
    user: s.user,
  };
  const encoded = "base64-" + b64encode(JSON.stringify(session), "rawurlstd");
  return { chunks: encoded.length <= 3180 ? [{ name: STORAGE_KEY, value: encoded }] : [] };
}

export function landing(d) {
  const p = PUBLIC_PAGES[__ITER % PUBLIC_PAGES.length];
  http.get(BASE + p, { tags: { name: "page:" + p } });
  sleep(0.4 + Math.random() * 0.6);
}

export function authed(d) {
  const H = { Cookie: (d.chunks || []).map((c) => c.name + "=" + c.value).join("; ") };
  for (const p of ["/jobs", "/settings", "/filters"]) {
    const r = http.get(BASE + p, { headers: H });
    if (r.status !== 200) {
      const body = r.body || "";
      const title = (body.match(/<title>(.*?)<\/title>/) || [])[1] || "";
      console.log(
        "AUTHFAIL", p, "iter", __ITER, "scenario", __ENV ? "" : "",
        "-> status:", r.status,
        "loc:", (r.headers.Location || r.headers.location || "") || "-",
        "title:", title,
        "len:", body.length,
        "ct:", (r.headers["Content-Type"] || r.headers["content-type"] || "").slice(0, 40),
        "prefix:", body.slice(20, 200).replace(/\s+/g, " ").slice(0, 180)
      );
    } else {
      check(r, { ["200:" + p]: (x) => x.status === 200 });
    }
  }
  sleep(1 + Math.random());
}