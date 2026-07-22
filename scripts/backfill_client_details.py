#!/usr/bin/env python3
"""
Backfill script — enriches existing Supabase jobs with client details
from the authenticated EC2 API endpoint.
"""
import json
import os
import sys
import time
from urllib.request import Request, urlopen
from urllib.parse import urlencode

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
EC2_API = "http://localhost:8000"
BATCH_SIZE = 50
DETAIL_DELAY = 2.0
MAX_RETRIES = 3
RETRY_BACKOFF = 5.0


def get_jobs_without_score(supabase_url, service_key, offset, limit):
    """Fetch jobs that don't have client_score yet."""
    url = (
        f"{supabase_url}/rest/v1/jobs"
        f"?select=id,upwork_job_id,url,client_score"
        f"&client_score=is.null"
        f"&offset={offset}&limit={limit}"
        f"&order=created_at.desc"
    )
    req = Request(url, headers={
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Accept": "application/json",
    })
    with urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def fetch_auth_details(ciphertext):
    """Fetch enriched details from EC2 auth endpoint with retries."""
    url = f"{EC2_API}/jobs/{ciphertext}/details-auth"
    for attempt in range(MAX_RETRIES):
        try:
            req = Request(url, headers={"Accept": "application/json"})
            with urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
                if data.get("success"):
                    return data.get("details")
                return None
        except Exception as e:
            err_str = str(e)
            if "502" in err_str or "503" in err_str or "rate" in err_str.lower():
                wait = RETRY_BACKOFF * (attempt + 1)
                time.sleep(wait)
            else:
                print(f"  WARN: {ciphertext}: {e}")
                return None
    return None


def update_job(supabase_url, service_key, job_id, details):
    """Update a job with enriched client data."""
    client_stats = details.get("client_stats", {})
    client_loc = details.get("client_location", {})
    client_act = details.get("client_activity", {})
    company = details.get("company", {})

    update = {
        "client_score": _num(client_stats.get("score")),
        "client_hours_count": _num(client_stats.get("hours_count")),
        "client_feedback_count": _int(client_stats.get("feedback_count")),
        "client_payment_verified": bool(details.get("payment_verified")),
        "client_total_spend": _num(client_stats.get("total_charges")),
        "client_total_hires": _int(client_stats.get("total_jobs_with_hires")),
        "client_total_assignments": _int(client_stats.get("total_assignments")),
        "client_active_assignments": _int(client_stats.get("active_assignments")),
        "client_city": (client_loc.get("city") or "")[:100] or None,
        "client_location_country": (client_loc.get("country") or "")[:100] or None,
        "client_company_size": str(company.get("size") or "")[:50] or None,
        "client_industry": (company.get("industry") or "")[:200] or None,
        "total_invited": _int(client_act.get("total_invited_to_interview")),
        "total_hired": _int(client_act.get("total_hired")),
    }

    url = f"{supabase_url}/rest/v1/jobs?{urlencode({'id': f'eq.{job_id}'})}"
    payload = json.dumps(update).encode("utf-8")
    req = Request(url, data=payload, headers={
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }, method="PATCH")
    try:
        with urlopen(req, timeout=30) as resp:
            return resp.status in (200, 204)
    except Exception as e:
        print(f"  WARN: Update error: {e}")
        return False


def _num(v):
    if v is None:
        return None
    try:
        return float(str(v).replace(",", "").replace("$", ""))
    except (ValueError, TypeError):
        return None


def _int(v):
    if v is None:
        return None
    try:
        return int(v)
    except (ValueError, TypeError):
        return None


def main():
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not supabase_url or not service_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        sys.exit(1)

    total_updated = 0
    total_failed = 0
    offset = 0

    while True:
        print(f"\nFetching jobs without client_score (offset={offset})...")
        try:
            jobs = get_jobs_without_score(supabase_url, service_key, offset, BATCH_SIZE)
        except Exception as e:
            print(f"ERROR: {e}")
            break

        if not jobs:
            print("No more jobs to enrich!")
            break

        print(f"  Found {len(jobs)} jobs to enrich")

        for job in jobs:
            job_id = job["id"]
            job_url = job.get("url", "")
            # Extract ciphertext from URL: https://www.upwork.com/jobs/~02207983791776231631/...
            ciphertext = None
            if "/jobs/~" in job_url:
                try:
                    ciphertext = job_url.split("/jobs/~")[1].split("/")[0].split("?")[0]
                except (IndexError, AttributeError):
                    pass
            if not ciphertext:
                # Fallback: try upwork_job_id without gql_ prefix
                raw_id = job.get("upwork_job_id", "")
                if raw_id.startswith("gql_"):
                    ciphertext = raw_id[4:]
                else:
                    ciphertext = raw_id

            time.sleep(DETAIL_DELAY)
            details = fetch_auth_details(ciphertext)

            if details:
                ok = update_job(supabase_url, service_key, job_id, details)
                if ok:
                    total_updated += 1
                    score = details.get("client_stats", {}).get("score", "?")
                    spend = details.get("client_stats", {}).get("total_charges", "?")
                    print(f"  ✓ {ciphertext} score={score} spend=${spend}")
                else:
                    total_failed += 1
                    print(f"  ✗ {ciphertext} update failed")
            else:
                total_failed += 1
                print(f"  ✗ {ciphertext} no details")

        offset += BATCH_SIZE

    print(f"\n=== DONE ===")
    print(f"Updated: {total_updated}")
    print(f"Failed: {total_failed}")


if __name__ == "__main__":
    main()
