#!/usr/bin/env python3
"""
Vibeworker Ingester — fetches Upwork jobs from tryvibeworker.com,
static-scores them against user filters (no AI), and POSTs only
passing jobs + scores to /api/jobs/vibeworker for DB insert.

EC2 does ALL the heavy lifting. Vercel just writes to DB.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

# ── Config ──────────────────────────────────────────────────
VW_COOKIE_FILE = os.environ.get("VW_COOKIE_FILE", "/home/ubuntu/upwork-api/cookies/vw_cookies.json")
VW_EMAIL = os.environ.get("VW_EMAIL")
VW_PASSWORD = os.environ.get("VW_PASSWORD")
VW_PAGES = int(os.environ.get("VW_PAGES", "3"))
VW_PAGE_SIZE = int(os.environ.get("VW_PAGE_SIZE", "100"))
UPSCORE_API_URL = os.environ.get("UPSCORE_API_URL", "https://www.getupscore.com/")
UPSCORE_CRON_SECRET = os.environ.get("UPSCORE_CRON_SECRET", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
API_BASE = "https://tryvibeworker.com"
USER_AGENT = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36")
AUTH_COOKIE_PREFIX = "sb-kttkatrmvlzsepgprqqd-auth-token"
REFRESH_BEFORE_MIN = 15
MIN_STATIC_SCORE = 30

# Validate required env vars
_missing = []
if not VW_EMAIL:
    _missing.append("VW_EMAIL")
if not VW_PASSWORD:
    _missing.append("VW_PASSWORD")
if not UPSCORE_CRON_SECRET:
    _missing.append("UPSCORE_CRON_SECRET")
if not SUPABASE_URL:
    _missing.append("SUPABASE_URL")
if not SUPABASE_SERVICE_KEY:
    _missing.append("SUPABASE_SERVICE_ROLE_KEY")
if _missing:
    print(f"FATAL: Missing required environment variables: {', '.join(_missing)}")
    sys.exit(1)


def log(msg):
    print(f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] {msg}", flush=True)


# ════════════════════════════════════════════════════════════
# Cookie management
# ════════════════════════════════════════════════════════════

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
            raise RuntimeError("Login failed")
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


# ════════════════════════════════════════════════════════════
# Fetch jobs from TryVibeWorker
# ════════════════════════════════════════════════════════════

def fetch_jobs(cookies, pages, page_size):
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


# ════════════════════════════════════════════════════════════
# Fetch active user filters from Supabase
# ════════════════════════════════════════════════════════════

def fetch_filters():
    if not SUPABASE_SERVICE_KEY:
        log("SUPABASE_SERVICE_ROLE_KEY not set, skipping scoring")
        return []
    url = f"{SUPABASE_URL}/rest/v1/job_filters?is_active=eq.true&select=*"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Accept": "application/json",
    })
    try:
        import ssl
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            data = json.loads(resp.read().decode())
            log(f"Fetched {len(data)} active filters from Supabase")
            return data
    except Exception as e:
        log(f"Fetch filters error: {e}")
        return []


# ════════════════════════════════════════════════════════════
# Static scoring (mirrors src/lib/jobs/static-score.ts)
# ════════════════════════════════════════════════════════════

def _contains(needle, haystack):
    return needle.lower().strip() in haystack.lower().strip()


def _score_job_vs_filter(job, flt):
    score = 0
    haystack = "\n".join([
        job.get("title") or "",
        job.get("description") or "",
        " ".join(job.get("skills") or []),
        job.get("category") or "",
        job.get("subcategory") or "",
    ]).lower()

    keywords = flt.get("keywords") or []
    if keywords:
        matched = sum(1 for k in keywords if k.lower().strip() in haystack)
        score += round(30 * matched / len(keywords))
    else:
        score += 20

    filter_skills = flt.get("skills") or []
    job_skills = [s.lower().strip() for s in (job.get("skills") or [])]
    if filter_skills and job_skills:
        fs = {s.lower().strip() for s in filter_skills}
        overlap = sum(1 for s in job_skills if s in fs)
        score += round(25 * min(overlap / len(filter_skills), 1.0))
    elif not filter_skills:
        score += 15

    job_budget = job.get("budget") or job.get("hourly_max")
    if job_budget is not None:
        budget_ok = True
        if flt.get("min_budget") is not None and job_budget < flt["min_budget"]:
            budget_ok = False
        if flt.get("max_budget") is not None and job_budget > flt["max_budget"]:
            budget_ok = False
        score += 15 if budget_ok else 0
    else:
        score += 8

    countries = flt.get("client_countries") or []
    if countries:
        country = job.get("client_location_country") or job.get("client_country") or ""
        if country and any(_contains(c, country) for c in countries):
            score += 10
    else:
        score += 5

    proposals = job.get("proposals_count")
    if proposals is not None:
        if flt.get("max_proposals") is not None and proposals > flt["max_proposals"]:
            return 0
        if proposals <= 5:
            score += 10
        elif proposals <= 15:
            score += 7
        elif proposals <= 30:
            score += 4
    else:
        score += 5

    if flt.get("min_client_spend") is not None:
        spend = job.get("client_total_spend")
        if spend is not None:
            score += 10 if spend >= flt["min_client_spend"] else 0
        else:
            score += 3
    else:
        score += 5

    return min(score, 100)


def score_job_for_users(job, filters):
    """Returns list of {user_id, score, filter_id} for users whose filters pass."""
    results = []
    user_best = {}
    for f in filters:
        uid = f.get("user_id")
        if not uid:
            continue
        s = _score_job_vs_filter(job, f)
        if uid not in user_best or s > user_best[uid]["score"]:
            user_best[uid] = {"score": s, "filter_id": f.get("id")}
    for uid, info in user_best.items():
        if info["score"] >= MIN_STATIC_SCORE:
            results.append({
                "user_id": uid,
                "score": info["score"],
                "filter_id": info["filter_id"],
            })
    return results


# ════════════════════════════════════════════════════════════
# Map VW job -> DB insert shape
# ════════════════════════════════════════════════════════════

def map_job(job):
    stats = job.get("clientStats") or {}
    is_hourly = job.get("jobType") == "hourly"
    location = (job.get("clientLocation") or "")[:100] or None
    return {
        "upwork_job_id": job.get("publicId") or job.get("id", ""),
        "title": (job.get("title") or "")[:500],
        "description": (job.get("description") or "")[:10000] or None,
        "url": (job.get("upworkUrl") or "")[:1000] or None,
        "budget": None if is_hourly else job.get("budget"),
        "hourly_min": job.get("budget") if is_hourly else None,
        "hourly_max": job.get("budgetMax") if is_hourly else None,
        "job_type": (job.get("jobType") or "")[:50] or None,
        "contractor_tier": (job.get("experienceLevel") or "")[:50] or None,
        "duration_label": (job.get("duration") or "")[:100] or None,
        "skills": (job.get("skills") or [])[:50],
        "client_country": location,
        "client_location_country": location,
        "client_total_spend": stats.get("totalSpent"),
        "client_total_assignments": stats.get("jobsPosted"),
        "client_total_jobs_with_hires": stats.get("jobsPosted"),
        "client_score": job.get("clientRankScore"),
        "client_rating": job.get("clientRankScore"),
        "client_payment_verified": True if stats.get("paymentVerified") else None,
        "payment_verified": True if stats.get("paymentVerified") else None,
        "proposals_count": None,
        "connects_required": job.get("connects"),
        "posted_at": job.get("receivedAt"),
        "category": (job.get("category") or "")[:100] or None,
        "subcategory": (job.get("subcategory") or "")[:100] or None,
        "source": "vibeworker",
    }


# ════════════════════════════════════════════════════════════
# POST to Vercel
# ════════════════════════════════════════════════════════════

def post_to_upscore(payload):
    if not UPSCORE_CRON_SECRET:
        log("UPSCORE_CRON_SECRET not set, skipping POST")
        return None
    url = f"{UPSCORE_API_URL}/api/jobs/vibeworker"
    body = json.dumps(payload).encode()
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
        log(f"POST failed: {e.code}")
        raise


# ════════════════════════════════════════════════════════════
# Main
# ════════════════════════════════════════════════════════════

def main():
    cookies = ensure_valid_cookies()
    raw_jobs = fetch_jobs(cookies, VW_PAGES, VW_PAGE_SIZE)
    log(f"Fetched {len(raw_jobs)} jobs total")
    if not raw_jobs:
        log("No jobs fetched")
        return

    log("About to fetch filters from Supabase...")
    filters = fetch_filters()
    log(f"Loaded {len(filters)} active filters")

    seen_ids = set()
    jobs_to_send = []
    all_scores = []
    total_skipped = 0

    for job in raw_jobs:
        vw_id = job.get("publicId") or job.get("id", "")
        if vw_id in seen_ids or not job.get("title"):
            continue
        seen_ids.add(vw_id)

        mapped = map_job(job)

        if filters:
            scores = score_job_for_users(mapped, filters)
            if not scores:
                total_skipped += 1
                continue
            for sc in scores:
                all_scores.append({
                    "upwork_job_id": vw_id,
                    "user_id": sc["user_id"],
                    "score": sc["score"],
                    "filter_id": sc["filter_id"],
                })

        jobs_to_send.append(job)

    log(f"Static scoring: {len(jobs_to_send)} passed, {total_skipped} skipped, {len(all_scores)} score rows")

    if not jobs_to_send:
        log("No jobs passed static filter")
        return

    payload = {
        "success": True,
        "jobs": jobs_to_send,
        "scores": all_scores,
    }
    post_to_upscore(payload)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log(f"FATAL: {e}")
        sys.exit(1)
