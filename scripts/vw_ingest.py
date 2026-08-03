#!/usr/bin/env python3
"""
Vibeworker Ingester — fetches Upwork jobs from tryvibeworker.com using a
logged-in session, and POSTs them to the UpScore frontend API
(/api/jobs/vibeworker) which inserts + analyzes + notifies.

Cookie lifecycle:
  - Cookies are loaded from VW_COOKIE_FILE.
  - If missing/expired, Camoufox headless logs in and refreshes them.
  - If the API probe fails (session revoked), it re-logs in automatically.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

VW_COOKIE_FILE = os.environ.get("VW_COOKIE_FILE", "/home/ubuntu/upwork-api/cookies/vw_cookies.json")
VW_EMAIL = os.environ.get("VW_EMAIL", "admin@thrilledge.com")
VW_PASSWORD = os.environ.get("VW_PASSWORD", "Lovelyflower@6381")
VW_PAGES = int(os.environ.get("VW_PAGES", "3"))
VW_PAGE_SIZE = int(os.environ.get("VW_PAGE_SIZE", "100"))
UPSCORE_API_URL = os.environ.get("UPSCORE_API_URL", "https://getupscore.vercel.app")
UPSCORE_CRON_SECRET = os.environ.get("UPSCORE_CRON_SECRET", "")
API_BASE = "https://tryvibeworker.com"
USER_AGENT = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36")
AUTH_COOKIE_PREFIX = "sb-kttkatrmvlzsepgprqqd-auth-token"
REFRESH_BEFORE_MIN = 15


def log(msg):
    print(f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] {msg}", flush=True)


def load_cookies():
    try:
        with open(VW_COOKIE_FILE) as f:
            return json.load(f)
    except Exception:
        return None


def save_cookies(cookies):
    os.makedirs(os.path.dirname(VW_COOKIE_FILE), exist_ok=True)
    with open(VW_COOKIE_FILE, "w") as f:
        json.dump(cookies, f, indent=2)


def cookie_header(cookies):
    return "; ".join(f"{c['name']}={c['value']}" for c in cookies)


def auth_cookie_expiry(cookies):
    for c in cookies or []:
        if c.get("name") == AUTH_COOKIE_PREFIX:
            exp = c.get("expires")
            if isinstance(exp, (int, float)) and exp > 0:
                return exp
    return None


def cookies_are_fresh(cookies):
    if not cookies:
        return False
    exp = auth_cookie_expiry(cookies)
    if exp is None:
        return True
    now = time.time()
    if exp < now + REFRESH_BEFORE_MIN * 60:
        log(f"Auth cookie expires soon ({datetime.fromtimestamp(exp, tz=timezone.utc)}), refreshing")
        return False
    return True


def api_probe(cookies):
    """Returns True if the /api/jobs endpoint returns JSON with the session."""
    url = f"{API_BASE}/api/jobs?sort=newest&limit=1"
    req = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "Cookie": cookie_header(cookies),
        "User-Agent": USER_AGENT,
        "Referer": f"{API_BASE}/dashboard",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            if '"success":true' in body or '"success": true' in body:
                return True
            return False
    except Exception:
        return False


def login_with_camoufox():
    """Headless login via Camoufox, returns cookie list."""
    from camoufox import Camoufox

    log("Logging in with Camoufox...")
    with Camoufox(headless=True) as browser:
        ctx = browser.new_context()
        page = ctx.new_page()
        page.goto(f"{API_BASE}/login", wait_until="domcontentloaded", timeout=60000)
        time.sleep(3)
        page.locator('input[type="email"]').first.fill(VW_EMAIL)
        page.locator('input[type="password"]').first.fill(VW_PASSWORD)
        page.locator('button:has-text("Sign in")').first.click()
        time.sleep(10)

        if "dashboard" not in page.url:
            time.sleep(5)

        if "dashboard" not in page.url:
            raise RuntimeError(f"Login failed, landed on: {page.url}")

        raw = ctx.cookies()
        cookies = [
            {"name": c["name"], "value": c["value"], "domain": c["domain"],
             "path": c.get("path", "/"), "expires": c.get("expires", 0)}
            for c in raw
        ]
        ctx.close()
        save_cookies(cookies)
        log(f"Login OK, saved {len(cookies)} cookies")
        return cookies


def ensure_valid_cookies():
    cookies = load_cookies()
    if cookies and cookies_are_fresh(cookies) and api_probe(cookies):
        log("Cookies are valid")
        return cookies

    cookies = login_with_camoufox()
    if not api_probe(cookies):
        raise RuntimeError("Session invalid even after fresh login")
    log("Cookies valid after login")
    return cookies


def fetch_jobs(cookies, pages, page_size):
    """Fetch newest jobs across N pages."""
    all_jobs = []
    headers = {
        "Accept": "application/json",
        "Cookie": cookie_header(cookies),
        "User-Agent": USER_AGENT,
        "Referer": f"{API_BASE}/dashboard",
    }
    for page in range(1, pages + 1):
        url = f"{API_BASE}/api/jobs?sort=newest&page={page}&limit={page_size}"
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode())
        except Exception as e:
            log(f"Fetch page {page} error: {e}")
            break
        jobs = data.get("jobs", []) or []
        all_jobs.extend(jobs)
        log(f"Page {page}: {len(jobs)} jobs (hasMore={data.get('hasMore')})")
        if not jobs or not data.get("hasMore"):
            break
        time.sleep(0.5)
    return all_jobs


def post_to_upscore(jobs):
    if not UPSCORE_CRON_SECRET:
        log("UPSCORE_CRON_SECRET not set, skipping POST")
        return None
    url = f"{UPSCORE_API_URL}/api/jobs/vibeworker"
    body = json.dumps({"success": True, "jobs": jobs}).encode()
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Authorization": f"Bearer {UPSCORE_CRON_SECRET}",
        "Content-Type": "application/json",
        "User-Agent": "UpScore-Ingest/1.0",
    })
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            result = json.loads(resp.read().decode())
            log(f"POST {url}: {result}")
            return result
    except urllib.error.HTTPError as e:
        log(f"POST failed: {e.code} {e.read().decode()[:500]}")
        raise


def main():
    cookies = ensure_valid_cookies()
    jobs = fetch_jobs(cookies, VW_PAGES, VW_PAGE_SIZE)
    log(f"Fetched {len(jobs)} jobs total")
    if not jobs:
        log("No jobs fetched")
        return
    post_to_upscore(jobs)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log(f"FATAL: {e}")
        sys.exit(1)
