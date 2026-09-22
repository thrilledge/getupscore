import http from "k6/http";
import { check, sleep } from "k6";
import { b64encode } from "k6/encoding";

const BASE = __ENV.SUPABASE_URL ? __ENV.BASE_URL || "https://www.getupscore.com" : "https://www.getupscore.com";
const AUTH = __ENV.AUTH_URL || "https://db.getupscore.com";
const ANON = __ENV.SUPABASE_ANON_KEY || __ENV.ANON_KEY || "";
const SERVICE = __ENV.SUPABASE_SERVICE_KEY || __ENV.SERVICE_KEY || "";

if (!ANON || !SERVICE) {
  throw new Error("Missing auth keys. Run with -e ANON_KEY=... -e SERVICE_KEY=... -e BASE_URL=... -e AUTH_URL=...");
}

const STORAGE_KEY = "sb-db-auth-token";
const CHUNK_SIZE = 3180;

const PUBLIC_PAGES = [
  "/", "/login", "/signup", "/privacy", "/terms", "/security", "/status",
  "/affiliate", "/tools", "/tools/rate-calculator", "/tools/fee-calculator",
  "/tools/salary-converter", "/tools/budget-planner", "/tools/proposal-counter",
];
const PROTECTED_PAGES = ["/jobs", "/settings", "/filters", "/market-trends", "/saved", "/upwork-profile", "/billing"];

export const options = {
  scenarios: {
    landing: {
      executor: "constant-vus",
      vus: 10,
      duration: "45s",
      exec: "landing",
    },
    authed: {
      executor: "constant-vus",
      vus: 4,
      duration: "45s",
      exec: "authed",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    checks: ["rate>0.98"],
    "http_req_duration{scenario:landing}": ["p(95)<2500"],
    "http_req_duration{scenario:authed}": ["p(95)<4500"],
    "http_req_duration{name:api:/jobs}": ["p(95)<4000"],
    "http_req_duration{name:page:/settings}": ["p(95)<4000"],
    "http_req_duration{name:page:/jobs}": ["p(95)<3500"],
  },
};

function createChunks(key, value) {
  if (!value || value.length <= CHUNK_SIZE) {
    return [{ name: key, value }];
  }
  const chunks = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push({ name: key + "." + chunks.length, value: value.slice(i, i + CHUNK_SIZE) });
  }
  return chunks;
}

export function setup() {
  const email = "qa." + Date.now() + "@getupscore.com";
  const password = "QaTmp!x" + Math.floor(Math.random() * 1e9);

  const createRes = http.post(
    AUTH + "/auth/v1/admin/users",
    JSON.stringify({ email, password, email_confirm: true }),
    { headers: { apikey: ANON, Authorization: "Bearer " + SERVICE, "Content-Type": "application/json" } }
  );
  if (createRes.status >= 400) {
    throw new Error("setup: admin create failed " + createRes.status + " " + createRes.body.slice(0, 300));
  }

  const tok = http.post(
    AUTH + "/auth/v1/token?grant_type=password",
    JSON.stringify({ email, password }),
    { headers: { apikey: ANON, "Content-Type": "application/json" } }
  );
  if (tok.status >= 400) {
    throw new Error("setup: token exchange failed " + tok.status + " " + tok.body.slice(0, 300));
  }
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
  const chunks = createChunks(STORAGE_KEY, encoded);

  return { chunks, email };
}

export function landing(setupData) {
  const path = PUBLIC_PAGES[__ITER % PUBLIC_PAGES.length];
  const res = http.get(BASE + path, { tags: { name: "page:" + path } });
  check(res, {
    "public page 200 + UpScore": (r) => r.status === 200 && r.body.length > 500 && r.body.includes("UpScore"),
  });

  if (__ITER % 5 === 0) {
    const p = PROTECTED_PAGES[__ITER % PROTECTED_PAGES.length];
    const g = http.get(BASE + p, {
      redirects: 0,
      responseCallback: http.expectedStatuses(301, 302, 303, 307, 308),
      tags: { name: "guest:" + p },
    });
    check(g, {
      "guest redirected to login": (r) =>
        r.status >= 300 && r.status < 400 && (r.headers.Location || r.headers.location || "").includes("/login"),
    });
  }

  if (__ITER % 7 === 0) {
    const a = http.get(BASE + "/api/jobs?page=1&limit=10", {
      responseCallback: http.expectedStatuses(401),
      tags: { name: "api:/jobs/guest" },
    });
    check(a, { "guest api 401": (r) => r.status === 401 });
  }

  sleep(0.3 + Math.random() * 0.7);
}

export function authed(setupData) {
  const cookieHeader = (setupData.chunks || []).map((c) => c.name + "=" + c.value).join("; ");
  const H = { Cookie: cookieHeader };

  const jobs = http.get(BASE + "/jobs", { headers: H, tags: { name: "page:/jobs" } });
  check(jobs, {
    "jobs page 200 authed": (r) => r.status === 200 && r.body.includes("UpScore"),
  });
  if (!(jobs.status === 200 && jobs.body.includes("UpScore"))) {
    logFail("/jobs", jobs, __ITER);
  }

  const api = http.get(BASE + "/api/jobs?page=1&limit=20", { headers: H, tags: { name: "api:/jobs" } });
  check(api, {
    "api /jobs 200": (r) => r.status === 200,
    "api /jobs schema": (r) => {
      try {
        const d = r.json();
        return Array.isArray(d.jobs) && typeof d.pagination?.total === "number";
      } catch {
        return false;
      }
    },
  });

  const settings = http.get(BASE + "/settings", { headers: H, tags: { name: "page:/settings" } });
  check(settings, {
    "settings 200 authed": (r) => r.status === 200 && r.body.includes("UpScore"),
  });
  if (!(settings.status === 200 && settings.body.includes("UpScore"))) {
    logFail("/settings", settings, __ITER);
  }

  const filters = http.get(BASE + "/filters", { headers: H, tags: { name: "page:/filters" } });
  check(filters, {
    "filters 200 authed": (r) => r.status === 200,
  });

  const trends = http.get(BASE + "/market-trends", { headers: H, tags: { name: "page:/market-trends" } });
  check(trends, {
    "market-trends 200 authed": (r) => r.status === 200,
  });

  sleep(1 + Math.random());
}

function logFail(path, r, iter) {
  const body = r.body || "";
  const title = (body.match(/<title>(.*?)<\/title>/) || [])[1] || "";
  console.log(
    "FLOWFAIL", path, "iter", iter,
    "status:", r.status,
    "hasUpScore:", body.includes("UpScore"),
    "hasNextError:", body.includes("next-error"),
    "hasRuntime:", body.includes("Runtime"),
    "hasUnauthorized:", body.toLowerCase().includes("unauthorized"),
    "loc:", (r.headers.Location || r.headers.location || "") || "-",
    "title:", title,
    "len:", body.length,
    "ct:", (r.headers["Content-Type"] || r.headers["content-type"] || "").slice(0, 40),
    "body:", body.slice(0, 420).replace(/\s+/g, " ")
  );
}