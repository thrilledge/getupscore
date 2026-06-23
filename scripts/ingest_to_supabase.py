#!/usr/bin/env python3
"""
Upwork Job Ingester — fetches jobs from local FastAPI and inserts into Supabase.
Runs as a cron job every 5 minutes on EC2.
"""
import json
import os
import sys
from urllib.request import Request, urlopen
from urllib.error import URLError

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
API_URL = "http://localhost:8000/jobs?count=50&offset=0"

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
}


def fetch_jobs():
    req = Request(API_URL, headers=HEADERS)
    with urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def get_existing_ids(supabase_url, service_key):
    """Fetch all upwork_job_ids already in DB (for dedup)."""
    url = f"{supabase_url}/rest/v1/jobs?select=upwork_job_id"
    req = Request(url, headers={
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Accept": "application/json",
    })
    with urlopen(req, timeout=30) as resp:
        rows = json.loads(resp.read())
        return {r["upwork_job_id"] for r in rows}


def insert_jobs(supabase_url, service_key, jobs):
    url = f"{supabase_url}/rest/v1/jobs"
    payload = json.dumps(jobs).encode("utf-8")
    req = Request(url, data=payload, headers={
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }, method="POST")
    with urlopen(req, timeout=30) as resp:
        return resp.status


def main():
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not supabase_url or not service_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        sys.exit(1)

    # Step 1: Fetch jobs from local FastAPI
    print("Fetching jobs from API...")
    result = fetch_jobs()
    if not result.get("success"):
        print(f"ERROR: API returned failure: {result.get('error')}")
        sys.exit(1)

    raw_jobs = result.get("jobs", [])
    if not raw_jobs:
        print("No jobs returned")
        return

    print(f"Fetched {len(raw_jobs)} jobs")

    # Step 2: Get existing IDs for dedup
    existing_ids = get_existing_ids(supabase_url, service_key)
    print(f"Existing jobs in DB: {len(existing_ids)}")

    # Step 3: Filter new jobs only
    new_jobs = []
    for j in raw_jobs:
        if j["upwork_job_id"] not in existing_ids:
            new_jobs.append({
                "upwork_job_id": j["upwork_job_id"],
                "title": j.get("title", "")[:500],
                "description": (j.get("description") or "")[:10000] or None,
                "url": (j.get("url") or "")[:1000] or None,
                "budget": _num(j.get("budget")),
                "hourly_min": _num(j.get("hourly_min")),
                "hourly_max": _num(j.get("hourly_max")),
                "weekly_retainer": _num(j.get("weekly_retainer")),
                "job_type": (j.get("job_type") or "")[:50] or None,
                "contractor_tier": (j.get("contractor_tier") or "")[:50] or None,
                "duration_label": (j.get("duration_label") or "")[:100] or None,
                "duration_weeks": _int(j.get("duration_weeks")),
                "skills": j.get("skills") or [],
                "source": j.get("source", "upwork_graphql"),
                "posted_at": j.get("posted_at"),
            })

    if not new_jobs:
        print("No new jobs to insert")
        return

    # Step 4: Insert new jobs in batches of 50
    batch_size = 50
    inserted = 0
    for i in range(0, len(new_jobs), batch_size):
        batch = new_jobs[i:i + batch_size]
        try:
            insert_jobs(supabase_url, service_key, batch)
            inserted += len(batch)
        except Exception as e:
            print(f"ERROR inserting batch {i}-{i+len(batch)}: {e}")

    print(f"Inserted {inserted} new jobs (skipped {len(new_jobs) - inserted} duplicates/failures)")


def _num(v):
    if v is None:
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def _int(v):
    if v is None:
        return None
    try:
        return int(v)
    except (ValueError, TypeError):
        return None


if __name__ == "__main__":
    main()
