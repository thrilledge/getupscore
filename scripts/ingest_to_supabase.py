#!/usr/bin/env python3
"""
Upwork Job Ingester — single endpoint fetches jobs + client details.
Runs as a cron job every 5 minutes on EC2.

Cleanup of old jobs is handled by the Vercel cron
(/api/cron/cleanup → cleanup_old_jobs RPC, 90-day retention).
This script no longer deletes anything, so user data referenced
by job_analyses / saved_jobs / proposals / notifications can never
be cascade-deleted by the ingester.
"""
import json
import os
import sys
from urllib.request import Request, urlopen

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
API_BASE = "http://localhost:8000/jobs/ingest"
PAGE_SIZE = 50
MAX_PAGES = 10


def fetch_ingest_page(offset, count, max_details=20):
    url = f"{API_BASE}?count={count}&offset={offset}&max_details={max_details}"
    req = Request(url, headers={"Accept": "application/json"})
    with urlopen(req, timeout=180) as resp:
        return json.loads(resp.read())


def get_existing_ids(supabase_url, service_key):
    ids = set()
    offset = 0
    while True:
        url = f"{supabase_url}/rest/v1/jobs?select=upwork_job_id&offset={offset}&limit=1000"
        req = Request(url, headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
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


def build_job_row(j):
    return {
        "upwork_job_id": j.get("upwork_job_id", ""),
        "title": (j.get("title") or "")[:500],
        "description": (j.get("description") or "")[:10000] or None,
        "url": (j.get("url") or "")[:1000] or None,
        "budget": _num(j.get("budget")),
        "hourly_min": _num(j.get("hourly_min")),
        "hourly_max": _num(j.get("hourly_max")),
        "weekly_retainer": _num(j.get("weekly_retainer")),
        "hours_per_week": (j.get("hours_per_week") or "")[:50] or None,
        "job_type": (j.get("job_type") or "")[:50] or None,
        "contractor_tier": (j.get("contractor_tier") or "")[:50] or None,
        "duration_label": (j.get("duration_label") or "")[:100] or None,
        "duration_weeks": _int(j.get("duration_weeks")),
        "skills": j.get("skills") or [],
        "source": j.get("source", "upwork_graphql"),
        "posted_at": j.get("posted_at"),
        "connects_required": _int(j.get("connects_required")),
        "proposals_count": _int(j.get("proposals_count")),
        "category": (j.get("category") or "")[:200] or None,
        "client_score": _num(j.get("client_score")),
        "client_hours_count": _num(j.get("client_hours_count")),
        "client_feedback_count": _int(j.get("client_feedback_count")),
        "client_payment_verified": bool(j.get("client_payment_verified")) if j.get("client_payment_verified") is not None else None,
        "client_total_spend": _num(j.get("client_total_spend")),
        "client_total_hires": _int(j.get("client_total_hires")),
        "client_total_assignments": _int(j.get("client_total_assignments")),
        "client_active_assignments": _int(j.get("client_active_assignments")),
        "client_city": (j.get("client_city") or "")[:100] or None,
        "client_location_country": (j.get("client_location_country") or "")[:100] or None,
        "client_company_size": (j.get("client_company_size") or "")[:50] or None,
        "client_industry": (j.get("client_industry") or "")[:200] or None,
        "total_invited": _int(j.get("total_invited")),
        "total_hired": _int(j.get("total_hired")),
    }


def _insert_batch(supabase_url, service_key, batch):
    data = json.dumps(batch).encode("utf-8")
    url = f"{supabase_url}/rest/v1/jobs"
    req = Request(url, data=data, method="POST", headers={
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    with urlopen(req, timeout=60) as resp:
        return resp.status


def main():
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not supabase_url or not service_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        sys.exit(1)

    print("Fetching existing job IDs from Supabase...")
    existing_ids = get_existing_ids(supabase_url, service_key)
    print(f"Existing jobs in DB: {len(existing_ids)}")

    all_new_jobs = []
    stop = False

    for page in range(MAX_PAGES):
        offset = page * PAGE_SIZE
        print(f"Fetching page {page+1} (offset={offset}) with details...")

        max_details = 15 if page == 0 else 5
        try:
            result = fetch_ingest_page(offset, PAGE_SIZE, max_details=max_details)
        except Exception as e:
            print(f"ERROR fetching page {page+1}: {e}")
            break

        if not result.get("success"):
            print(f"API error: {result.get('error')}")
            break

        raw_jobs = result.get("jobs", [])
        enriched = result.get("enriched_count", 0)
        if not raw_jobs:
            print("No more jobs from API")
            break

        page_new = 0
        for j in raw_jobs:
            jid = j.get("upwork_job_id", "")
            if jid in existing_ids:
                stop = True
                break
            all_new_jobs.append(build_job_row(j))
            existing_ids.add(jid)
            page_new += 1

        print(f"  Page {page+1}: {len(raw_jobs)} fetched, {page_new} new, {enriched} enriched")

        if stop:
            print("  Hit existing jobs — stopping pagination")
            break

    if not all_new_jobs:
        print("No new jobs to insert")
        return

    batch_size = 100
    inserted_count = 0
    for i in range(0, len(all_new_jobs), batch_size):
        batch = all_new_jobs[i:i + batch_size]
        try:
            status = _insert_batch(supabase_url, service_key, batch)
            if status in (200, 201):
                inserted_count += len(batch)
            else:
                print(f"WARN: Insert batch status {status}")
        except Exception as e:
            print(f"ERROR inserting batch: {e}")

    print(f"\nDone! Inserted {inserted_count}/{len(all_new_jobs)} new jobs")


def _num(v):
    if v is None:
        return None
    try:
        s = str(v).replace(",", "").replace("$", "")
        return float(s)
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
