import os
import time
import random
import json
import base64
import urllib.request
import urllib.error
import gevent
from locust import HttpUser, task, between, events
from locust import LoadTestShape

BASE = os.environ.get("BASE_URL", "https://www.getupscore.com")
AUTH = os.environ.get("AUTH_URL", "https://db.getupscore.com")
ANON = os.environ.get("ANON_KEY", "")
SERVICE = os.environ.get("SERVICE_KEY", "")

STORAGE_KEY = "sb-db-auth-token"
CHUNK_SIZE = 3180

if not ANON or not SERVICE:
    raise SystemExit("Missing ANON_KEY / SERVICE_KEY env vars")

PUBLIC_PAGES = [
    "/", "/login", "/signup", "/privacy", "/terms", "/security", "/status",
    "/affiliate", "/tools", "/tools/rate-calculator", "/tools/fee-calculator",
    "/tools/salary-converter", "/tools/budget-planner", "/tools/proposal-counter",
]

DASHBOARD_PAGES = [
    "/affiliates", "/billing", "/channels", "/dashboard", "/extension",
    "/filters", "/jobs", "/market-trends", "/notifications", "/proposals",
    "/rules", "/saved", "/settings", "/upwork-profile",
]

AUTHED_APIS = [
    "/api/analytics",
    "/api/billing/overview",
    "/api/billing/status",
    "/api/favorites",
    "/api/jobs?page=1&limit=20",
    "/api/jobs/facets",
    "/api/jobs/status",
    "/api/market-trends",
    "/api/notifications/history",
    "/api/proposals",
    "/api/saved-jobs",
    "/api/suggestions",
    "/api/upwork-profile",
]

GUEST_APIS = [
    ("/api/jobs?page=1&limit=10", 401),
    ("/api/analytics", 401),
    ("/api/market-trends?scope=filters", 401),
    ("/api/notifications/history", 401),
    ("/api/saved-jobs", 401),
    ("/api/suggestions", 401),
    ("/api/proposals", 401),
]

_tokens = []

def b64url_encode(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def make_chunks(key, value):
    if not value or len(value) <= CHUNK_SIZE:
        return [{"name": key, "value": value}]
    chunks = []
    for i in range(0, len(value), CHUNK_SIZE):
        chunks.append({"name": key + "." + str(len(chunks)), "value": value[i:i + CHUNK_SIZE]})
    return chunks

def create_authed_session(environment, email, password):
    def http_json(method, url, body=None, extra_headers=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Content-Type", "application/json")
        req.add_header("apikey", ANON)
        if extra_headers:
            for k, v in extra_headers.items():
                req.add_header(k, v)
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.status, json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            return e.code, None

    status, _ = http_json(
        "POST",
        AUTH + "/auth/v1/admin/users",
        {"email": email, "password": password, "email_confirm": True},
        {"Authorization": "Bearer " + SERVICE},
    )
    if status >= 400:
        return None
    status, s = http_json(
        "POST",
        AUTH + "/auth/v1/token?grant_type=password",
        {"email": email, "password": password},
    )
    if status >= 400 or not s:
        return None
    session = {
        "access_token": s["access_token"],
        "token_type": "bearer",
        "expires_in": s.get("expires_in", 3600),
        "expires_at": int(time.time()) + s.get("expires_in", 3600),
        "refresh_token": s.get("refresh_token"),
        "provider_token": None,
        "provider_refresh_token": None,
        "user": s.get("user"),
    }
    encoded = "base64-" + b64url_encode(json.dumps(session, separators=(",", ":")).encode())
    return make_chunks(STORAGE_KEY, encoded)

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    global _tokens
    stamp = int(time.time())

    def spawn_user(idx):
        email = f"qa.scale.{stamp}.{idx}@getupscore.com"
        password = "QaTmp!x" + str(random.randint(10**8, 10**9 - 1))
        return create_authed_session(environment, email, password)

    keys = []
    for batch in range(6):
        results = []
        for i in range(5):
            idx = batch * 5 + i
            results.append(gevent.spawn(spawn_user, idx))
        gevent.joinall(results)
        keys += [r.value for r in results if r.value]
    _tokens = keys
    if not _tokens:
        raise SystemExit("No authed users could be created")
    print(f"[locust] created {len(_tokens)} authed session tokens")


class LandingUser(HttpUser):
    wait_time = between(0.3, 1.0)

    @task(7)
    def public_page(self):
        path = PUBLIC_PAGES[random.randrange(len(PUBLIC_PAGES))]
        with self.client.get(path, name="page:" + path, catch_response=True) as r:
            ok = r.status_code == 200 and len(r.content) > 500 and b"UpScore" in r.content
            r.success() if ok else r.failure(f"status={r.status_code} len={len(r.content)}")

    @task(2)
    def guest_protected_redirect(self):
        path = DASHBOARD_PAGES[random.randrange(len(DASHBOARD_PAGES))]
        with self.client.get(path, name="guest:" + path, catch_response=True, allow_redirects=False) as r:
            ok = r.status_code in (301, 302, 303, 307, 308) and "/login" in (r.headers.get("Location") or "")
            r.success() if ok else r.failure(f"status={r.status_code} loc={r.headers.get('Location')}")

    @task(1)
    def guest_api_401(self):
        path, expected = GUEST_APIS[random.randrange(len(GUEST_APIS))]
        with self.client.get(path, name="guest-api:" + path, catch_response=True) as r:
            ok = r.status_code == expected
            r.success() if ok else r.failure(f"status={r.status_code} expected={expected}")


class AuthedUser(HttpUser):
    wait_time = between(1, 2)
    _header = None

    def on_start(self):
        if not _tokens:
            raise RuntimeError("no tokens available")
        idx = random.randrange(len(_tokens))
        chunks = _tokens[idx]
        self._header = {"Cookie": "; ".join(c["name"] + "=" + c["value"] for c in chunks)}

    @task(5)
    def dashboard_pages(self):
        path = DASHBOARD_PAGES[random.randrange(len(DASHBOARD_PAGES))]
        with self.client.get(path, headers=self._header, name="page:" + path, catch_response=True) as r:
            ok = r.status_code == 200 and b"UpScore" in r.content
            r.success() if ok else r.failure(f"status={r.status_code} len={len(r.content)}")

    @task(7)
    def authed_apis(self):
        path = AUTHED_APIS[random.randrange(len(AUTHED_APIS))]
        with self.client.get(path, headers=self._header, name="api:" + path.split("?")[0], catch_response=True) as r:
            ok = r.status_code == 200
            if ok and path.startswith("/api/jobs?"):
                try:
                    d = r.json()
                    ok = isinstance(d.get("jobs"), list) and isinstance(d.get("pagination", {}).get("total"), (int, float))
                except Exception:
                    ok = False
            r.success() if ok else r.failure(f"status={r.status_code}")

    @task(1)
    def jobs_detail_page(self):
        with self.client.get("/jobs/018c0000-0000-7000-9000-000000000000", headers=self._header,
                             name="page:/jobs/[id]", catch_response=True) as r:
            ok = r.status_code in (200, 404)
            r.success() if ok else r.failure(f"status={r.status_code} expected 200/404")


class UpscoreLoadShape(LoadTestShape):
    """
    Step-load: 200 -> 400 -> 600 -> 800 -> 1000 users, holding each level.
    Each step holds for STEP_TIME seconds, then +STEP_USERS more.
    After passing MAX_USERS the run finishes.
    """
    STEP_USERS = 200
    STEP_TIME = 90
    MAX_USERS = 1000
    SPAWN_RATE = 200

    def tick(self):
        run_time = self.get_run_time()
        step = int(run_time / self.STEP_TIME) + 1
        user_count = step * self.STEP_USERS
        if user_count > self.MAX_USERS:
            return None
        return (user_count, self.SPAWN_RATE)