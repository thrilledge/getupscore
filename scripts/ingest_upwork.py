#!/usr/bin/env python3
"""
Upwork GraphQL Job Ingester — fetches jobs from Upwork's GraphQL API
using curl_cffi, then inserts into Supabase.
Replaces ingest_uphunt.py for the timer service.
"""
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen
from urllib.parse import quote

sys.path.insert(0, "/home/ubuntu/upwork-api")
from upwork_scraper import fetch_jobs_with_details

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
JOB_RETENTION_DAYS = 10
PAGE_SIZE = 50
MAX_PAGES = 10
PAGE_DELAY = 3


def delete_old_jobs(days):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat().replace("+", "%2B")
    url = f"{SUPABASE_URL}/rest/v1/jobs?created_at=lt.{cutoff}"
    try:
        req = Request(url, method="DELETE", headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Prefer": "return=minimal",
            "Content-Type": "application/json",
        })
        with urlopen(req, timeout=60) as resp:
            print(f"Cleanup: deleted jobs older than {days} days (status={resp.status})")
    except Exception as e:
        print(f"WARN: Cleanup error: {e}")


def get_existing_ids():
    ids = set()
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/jobs?select=upwork_job_id&offset={offset}&limit=1000"
        req = Request(url, headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Accept": "application/json",
        })
        with urlopen(req, timeout=60) as resp:
            rows = json.loads(resp.read())
            if not rows:
                break
            for r in rows:
                ids.add(r["upwork_job_id"])
            if len(rows) < 1000:
                break
            offset += 1000
    return ids


def upsert_jobs(jobs):
    if not jobs:
        return 0

    url = f"{SUPABASE_URL}/rest/v1/jobs"
    payload = json.dumps(jobs).encode("utf-8")
    req = Request(url, data=payload, headers={
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }, method="POST")

    try:
        with urlopen(req, timeout=120) as resp:
            return resp.status
    except Exception as e:
        if hasattr(e, "read"):
            body = e.read().decode("utf-8", errors="replace")
            print(f"  UPSERT ERROR ({e.code}): {body[:500]}")
        else:
            print(f"  UPSERT ERROR: {e}")
        raise


def main():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars")
        sys.exit(1)

    # 1. Cleanup old jobs
    delete_old_jobs(JOB_RETENTION_DAYS)

    # 2. Get existing IDs
    print("Fetching existing job IDs from Supabase...")
    existing_ids = get_existing_ids()
    print(f"Existing jobs in DB: {len(existing_ids)}")

    # 3. Fetch jobs from Upwork GraphQL + enrich with details
    print("Fetching jobs from Upwork GraphQL API...")
    cookie_file = "/app/cookies/upwork_cookies.json"
    all_cookies = None
    try:
        with open(cookie_file) as f:
            all_cookies = json.load(f)
            if not all_cookies:
                all_cookies = None
    except (FileNotFoundError, json.JSONDecodeError):
        pass

    total_inserted = 0

    for page in range(MAX_PAGES):
        offset = page * PAGE_SIZE
        print(f"Page {page + 1} (offset={offset})...", end=" ", flush=True)

        result = fetch_jobs_with_details(
            count=PAGE_SIZE,
            offset=offset,
            max_details=10,
            all_cookies=all_cookies,
        )

        if not result.get("success"):
            print(f"ERROR: {result.get('error')}")
            break

        all_jobs = result.get("jobs", [])
        if not all_jobs:
            print("No jobs returned")
            break

        new_jobs = [j for j in all_jobs if j.get("upwork_job_id") not in existing_ids]
        print(f"fetched={len(all_jobs)}, new={len(new_jobs)}, enriched={result.get('enriched_count', 0)}")

        if not new_jobs:
            print("No new jobs to insert")
            break

        # Normalize: ensure all jobs have the same keys (fill missing with None)
        ALL_KEYS = [
            "upwork_job_id", "title", "description", "url", "budget",
            "hourly_min", "hourly_max", "weekly_retainer", "hours_per_week",
            "job_type", "contractor_tier", "skills", "posted_at",
            "duration_label", "duration_weeks", "source", "category",
            "client_score", "client_hours_count", "client_feedback_count",
            "client_payment_verified", "client_total_spend", "client_total_hires",
            "client_total_assignments", "client_active_assignments",
            "client_city", "client_location_country", "client_company_size",
            "client_industry", "total_invited", "total_hired", "proposals_count",
            "client_country", "client_rating", "client_spend",
        ]
        for j in new_jobs:
            j.pop("enriched", None)
            # Map new fields to old column names for frontend compatibility
            if j.get("client_location_country") and not j.get("client_country"):
                j["client_country"] = j["client_location_country"]
            if j.get("client_score") is not None and not j.get("client_rating"):
                j["client_rating"] = j["client_score"]
            if j.get("client_total_spend") is not None and not j.get("client_spend"):
                j["client_spend"] = j["client_total_spend"]
            for key in ALL_KEYS:
                if key not in j:
                    j[key] = None

        status = upsert_jobs(new_jobs)
        print(f"Inserted {len(new_jobs)} jobs (status={status})")

        for j in new_jobs:
            existing_ids.add(j.get("upwork_job_id"))
        total_inserted += len(new_jobs)

        if len(all_jobs) < PAGE_SIZE:
            break

        time.sleep(PAGE_DELAY)

    print(f"\nDone. Total new jobs inserted: {total_inserted}")
    print(f"Total jobs in DB: {len(existing_ids)}")


if __name__ == "__main__":
    main()
