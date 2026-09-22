import http from "k6/http";
import { check } from "k6";
import { b64encode } from "k6/encoding";

const BASE = __ENV.BASE_URL || "https://www.getupscore.com";
const AUTH = __ENV.AUTH_URL || "https://db.getupscore.com";
const ANON = __ENV.ANON_KEY || "";
const SERVICE = __ENV.SERVICE_KEY || "";
const STORAGE_KEY = "sb-db-auth-token";

export const options = {
  vus: 1,
  iterations: 8,
};

function createChunks(key, value) {
  return value.length <= 3180 ? [{ name: key, value }] : [];
}

export function setup() {
  const email = "qa.probe." + Date.now() + "@getupscore.com";
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
  return { chunks: createChunks(STORAGE_KEY, encoded) };
}

export default function (d) {
  const H = { Cookie: (d.chunks || []).map((c) => c.name + "=" + c.value).join("; ") };
  for (const p of ["/jobs", "/settings", "/filters"]) {
    const r = http.get(BASE + p, { headers: H, redirects: 0 });
    const ct = r.headers["Content-Type"] || r.headers["content-type"] || "";
    const body = r.body || "";
    check(r, {
      ["200:" + p]: (x) => x.status === 200,
    });
    if (r.status !== 200) {
      const title = (body.match(/<title>(.*?)<\/title>/) || [])[1] || "";
      console.log(
        p, "iter", __ITER, "-> status:", r.status,
        "ct:", ct.slice(0, 40), "loc:", (r.headers.Location || r.headers.location || "") || "-",
        "title:", title,
        "bodyLen:", body.length,
        "bodyPrefix:", body.slice(30, 160).replace(/\s+/g, " ")
      );
    }
  }
}