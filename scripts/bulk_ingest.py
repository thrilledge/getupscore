#!/usr/bin/env python3
"""
One-time bulk ingest: fetches jobs from EC2 API and inserts into Supabase.
Run from local machine. No dedup — just upserts everything.
"""
import json
import os
import sys
import time
from urllib.request import Request, urlopen

API_BASE = os.environ.get("UPWORK_API_URL", "http://13.48.204.110/api/upwork-jobs")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://kjfqtenfmxdoyjxxnhnm.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

PAGE_SIZE = 50
MAX_PAGES = 200
PAGE_DELAY = 5  # seconds between pages to avoid rate limiting
MAX_RETRIES = 5


def fetch_page(offset, count):
    url = f"{API_BASE}?count={count}&offset={offset}"
    req = Request(url)
    with urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def upsert_batch(jobs):
    url = f"{SUPABASE_URL}/rest/v1/jobs"
    payload = json.dumps(jobs).encode("utf-8")
    req = Request(url, data=payload, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }, method="POST")
    with urlopen(req, timeout=60) as resp:
        return resp.status


def get_existing_ids():
    ids = set()
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/jobs?select=upwork_job_id&offset={offset}&limit=1000"
        req = Request(url, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
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


def main():
    global SUPABASE_KEY
    if not SUPABASE_KEY:
        SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not SUPABASE_KEY:
        print("Set SUPABASE_KEY or SUPABASE_SERVICE_KEY env var")
        sys.exit(1)

    print("Fetching existing IDs...")
    existing = get_existing_ids()
    print(f"Existing: {len(existing)}")

    total_inserted = 0

    for page in range(MAX_PAGES):
        offset = page * PAGE_SIZE
        print(f"Page {page+1} (offset={offset})...", end=" ", flush=True)
        result = None
        for attempt in range(MAX_RETRIES):
            try:
                result = fetch_page(offset, PAGE_SIZE)
                break
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    wait = PAGE_DELAY * (attempt + 1)
                    print(f"retry {attempt+1} ({e})...", end=" ", flush=True)
                    time.sleep(wait)
                else:
                    print(f"ERROR after {MAX_RETRIES} retries: {e}")
                    result = None

        if result is None:
            break

        if not result.get("success"):
            print(f"API error: {result.get('error')}")
            break

        raw_jobs = result.get("jobs", [])
        if not raw_jobs:
            print("No more jobs")
            break

        rows = []
        new_count = 0
        for j in raw_jobs:
            jid = j.get("upwork_job_id", "")
            if not jid or jid in existing:
                continue
            existing.add(jid)
            new_count += 1
            rows.append({
                "upwork_job_id": jid,
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
                "client_country": (j.get("client_country") or "")[:100] or None,
                "client_name": (j.get("client_name") or "")[:200] or None,
                "client_rating": _num(j.get("client_rating")),
                "client_total_spend": _num(j.get("client_total_spend")),
                "client_total_hires": _int(j.get("client_total_hires")),
                "payment_verified": bool(j.get("payment_verified")),
                "proposals_count": _int(j.get("proposals_count")),
                "category": (j.get("category") or "")[:200] or None,
            })

        if not rows:
            if len(raw_jobs) > 0:
                print(f"{len(raw_jobs)} fetched, 0 new (all existing)")
            else:
                print("No more jobs")
            # If entire page is existing, we may have gone past all data
            # But keep going for a few more pages in case there are gaps
            time.sleep(PAGE_DELAY)
            continue

        try:
            upsert_batch(rows)
            total_inserted += len(rows)
            print(f"{len(raw_jobs)} fetched, {len(rows)} new (total: {total_inserted})")
        except Exception as e:
            print(f"INSERT ERROR: {e}")
            break

        time.sleep(PAGE_DELAY)

    print(f"\nDone. Total upserted: {total_inserted}")


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
