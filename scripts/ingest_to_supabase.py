#!/usr/bin/env python3
"""
Upwork Job Ingester — fetches jobs from local FastAPI and inserts into Supabase.
Also fetches enriched client details via authenticated endpoint for each new job.
Runs as a cron job every 5 minutes on EC2.
Also cleans up jobs older than 10 days.
"""
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen
from urllib.error import URLError
import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
API_BASE = "http://localhost:8000/jobs"
JOB_RETENTION_DAYS = 10
PAGE_SIZE = 50
MAX_PAGES = 15
DETAIL_DELAY = 0.5  # seconds between detail fetches

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
}


def delete_old_jobs(supabase_url, service_key, days):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    url = f"{supabase_url}/rest/v1/jobs"
    try:
        resp = requests.delete(
            url,
            headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Prefer": "return=minimal",
            },
            params={"created_at": f"lt.{cutoff}"},
            timeout=60,
        )
        if resp.status_code in (200, 204):
            print(f"Cleanup: deleted jobs older than {days} days")
        else:
            print(f"WARN: Cleanup {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"WARN: Cleanup error: {e}")


def fetch_jobs_page(offset, count):
    url = f"{API_BASE}?count={count}&offset={offset}"
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def fetch_job_details_auth(ciphertext):
    """Fetch enriched client details from authenticated endpoint."""
    url = f"http://localhost:8000/jobs/{ciphertext}/details-auth"
    try:
        req = Request(url, headers=HEADERS)
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            if data.get("success"):
                return data.get("details")
    except Exception as e:
        print(f"  WARN: Auth details failed for {ciphertext}: {e}")
    return None


def get_existing_ids(supabase_url, service_key):
    """Fetch all upwork_job_ids already in DB. Paginate to get all."""
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
    with urlopen(req, timeout=60) as resp:
        return resp.status


def main():
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not supabase_url or not service_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        sys.exit(1)

    delete_old_jobs(supabase_url, service_key, JOB_RETENTION_DAYS)

    print("Fetching existing job IDs from Supabase...")
    existing_ids = get_existing_ids(supabase_url, service_key)
    print(f"Existing jobs in DB: {len(existing_ids)}")

    new_jobs = []
    new_ciphertexts = []  # track ciphertexts for auth detail fetch
    stop = False

    for page in range(MAX_PAGES):
        offset = page * PAGE_SIZE
        print(f"Fetching page {page+1} (offset={offset})...")
        try:
            result = fetch_jobs_page(offset, PAGE_SIZE)
        except Exception as e:
            print(f"ERROR fetching page {page+1}: {e}")
            break

        if not result.get("success"):
            print(f"API error: {result.get('error')}")
            break

        raw_jobs = result.get("jobs", [])
        if not raw_jobs:
            print("No more jobs from API")
            break

        page_new = 0
        for j in raw_jobs:
            jid = j.get("upwork_job_id", "")
            if jid in existing_ids:
                stop = True
                break
            page_new += 1
            new_jobs.append({
                "upwork_job_id": jid,
                "title": j.get("title", "")[:500],
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
                "client_country": (j.get("client_country") or "")[:100] or None,
                "client_name": (j.get("client_name") or "")[:200] or None,
                "client_rating": _num(j.get("client_rating")),
                "client_total_spend": _num(j.get("client_total_spend")),
                "client_total_hires": _int(j.get("client_total_hires")),
                "payment_verified": bool(j.get("payment_verified")),
                "proposals_count": _int(j.get("proposals_count")),
                "category": (j.get("category") or "")[:200] or None,
            })
            new_ciphertexts.append(j.get("upwork_job_id", ""))

        print(f"  Page {page+1}: {len(raw_jobs)} fetched, {page_new} new")

        if stop:
            print("  Hit existing jobs — stopping pagination")
            break

    if not new_jobs:
        print("No new jobs to insert")
        return

    batch_size = 100
    inserted = 0
    for i in range(0, len(new_jobs), batch_size):
        batch = new_jobs[i:i + batch_size]
        try:
            insert_jobs(supabase_url, service_key, batch)
            inserted += len(batch)
        except Exception as e:
            print(f"ERROR inserting batch {i//batch_size+1}: {e}")

    print(f"Inserted {inserted} new jobs")

    # Fetch enriched client details for new jobs
    if new_ciphertexts:
        print(f"\nFetching enriched client details for {len(new_ciphertexts)} jobs...")
        enriched = {}
        for idx, ct in enumerate(new_ciphertexts):
            time.sleep(DETAIL_DELAY)
            details = fetch_job_details_auth(ct)
            if details:
                enriched[ct] = details
            if (idx + 1) % 10 == 0:
                print(f"  Fetched {idx+1}/{len(new_ciphertexts)} details")

        # Update Supabase with enriched data
        if enriched:
            print(f"\nUpdating {len(enriched)} jobs with enriched client data...")
            update_count = 0
            for ct, det in enriched.items():
                client_stats = det.get("client_stats", {})
                client_loc = det.get("client_location", {})
                client_act = det.get("client_activity", {})
                company = det.get("company", {})
                update_payload = {
                    "client_score": _num(client_stats.get("score")),
                    "client_hours_count": _num(client_stats.get("hours_count")),
                    "client_feedback_count": _int(client_stats.get("feedback_count")),
                    "client_payment_verified": bool(det.get("payment_verified")),
                    "client_total_spend": _num(client_stats.get("total_charges")),
                    "client_total_hires": _int(client_stats.get("total_jobs_with_hires")),
                    "client_total_assignments": _int(client_stats.get("total_assignments")),
                    "client_active_assignments": _int(client_stats.get("active_assignments")),
                    "client_city": (client_loc.get("city") or "")[:100] or None,
                    "client_location_country": (client_loc.get("country") or "")[:100] or None,
                    "client_company_size": (company.get("size") or "")[:50] or None,
                    "client_industry": (company.get("industry") or "")[:200] or None,
                    "total_invited": _int(client_act.get("total_invited_to_interview")),
                    "total_hired": _int(client_act.get("total_hired")),
                }
                url = f"{supabase_url}/rest/v1/jobs"
                try:
                    resp = requests.patch(
                        url,
                        headers={
                            "apikey": service_key,
                            "Authorization": f"Bearer {service_key}",
                            "Content-Type": "application/json",
                            "Prefer": "return=minimal",
                        },
                        params={"upwork_job_id": f"eq.{ct}"},
                        json=update_payload,
                        timeout=30,
                    )
                    if resp.status_code in (200, 204):
                        update_count += 1
                    else:
                        print(f"  WARN: Update failed for {ct}: {resp.status_code}")
                except Exception as e:
                    print(f"  WARN: Update error for {ct}: {e}")

            print(f"Updated {update_count}/{len(enriched)} jobs with enriched data")


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
