#!/usr/bin/env python3
"""
UpHunt.io Job Ingester — fetches jobs from UpHunt API using Playwright session,
maps to our schema, and inserts into Supabase.
Runs on EC2 via upwork-ingest.timer.
"""
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen


SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
UPHUNT_EMAIL = "usamaadeel1183@gmail.com"
UPHUNT_PASSWORD = "@Usama#Adeel183"
JOB_RETENTION_DAYS = 10
PAGE_SIZE = 50
MAX_PAGES = 10


def delete_old_jobs(supabase_url, service_key, days):
    from urllib.parse import quote
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat().replace("+", "%2B")
    url = f"{supabase_url}/rest/v1/jobs?created_at=lt.{cutoff}"
    try:
        req = Request(url, method="DELETE", headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Prefer": "return=minimal",
            "Content-Type": "application/json",
        })
        with urlopen(req, timeout=60) as resp:
            print(f"Cleanup: deleted jobs older than {days} days (status={resp.status})")
    except Exception as e:
        print(f"WARN: Cleanup error: {e}")


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


def uphunt_to_db_row(job):
    """Map UpHunt job to our Supabase schema."""
    tile = (job.get("jobTile") or {}).get("job", {}) or {}
    auth_resp = (job.get("authJobDetailsResponse") or {}).get("data", {}) or {}
    auth_data = auth_resp.get("jobAuthDetails", {}) or {}
    buyer = auth_data.get("buyer", {}) or {}
    buyer_info = buyer.get("info", {}) or {}
    stats = buyer_info.get("stats") or {}
    location = buyer_info.get("location") or {}
    charges = (stats.get("totalCharges") or {}) if stats else {}
    company = buyer_info.get("company") or {}
    buyer_jobs = buyer_info.get("jobs") or {}
    work_history = buyer.get("workHistory") or []
    phone_status = (auth_data.get("phoneVerificationStatus") or {}).get("status")

    # jobDetailsResponse — category, client activity, tags
    details_resp = (job.get("jobDetailsResponse") or {}).get("data", {}) or {}
    pub_details = (details_resp.get("jobPubDetails") or {}).get("opening", {}) or {}
    category_obj = pub_details.get("category") or {}
    category_group_obj = pub_details.get("categoryGroup") or {}
    client_activity = pub_details.get("clientActivity") or {}
    tags = (pub_details.get("annotations") or {}).get("tags") or []

    fixed = tile.get("fixedPriceAmount") or {}
    hourly_dur = tile.get("hourlyEngagementDuration") or {}
    fixed_dur = tile.get("fixedPriceEngagementDuration") or {}
    dur = hourly_dur or fixed_dur or {}

    cipher = tile.get("ciphertext", "")
    job_id = tile.get("id", "")

    # Work history summary
    wh_total_spend = sum(_num(w.get("totalCharge")) or 0 for w in work_history)
    wh_total_hours = sum(_num(w.get("totalHours")) or 0 for w in work_history)
    wh_active = sum(1 for w in work_history if w.get("status") == "ACTIVE")

    return {
        "upwork_job_id": f"uphunt_{job_id}",
        "title": (job.get("title") or "")[:500],
        "description": (job.get("description") or "")[:10000] or None,
        "url": f"https://www.upwork.com/jobs/{cipher}" if cipher else None,
        "budget": _num(fixed.get("amount")),
        "hourly_min": _num(tile.get("hourlyBudgetMin")),
        "hourly_max": _num(tile.get("hourlyBudgetMax")),
        "weekly_retainer": _num(tile.get("weeklyRetainerBudget")),
        "hours_per_week": _workload(tile.get("hourlyEngagementType")),
        "job_type": tile.get("jobType"),
        "contractor_tier": tile.get("contractorTier"),
        "duration_label": dur.get("label"),
        "duration_weeks": dur.get("weeks"),
        "skills": [s.get("prefLabel", "") for s in (job.get("ontologySkills") or []) if s.get("prefLabel")],
        "source": "uphunt",
        "posted_at": tile.get("publishTime") or tile.get("createTime") or None,
        "connects_required": None,
        "proposals_count": _int(client_activity.get("totalApplicants")),
        "category": (category_obj.get("name") or "")[:200] or None,
        # Client details (old columns frontend uses)
        "client_country": (location.get("country") or "")[:100] or None,
        "client_name": (company.get("name") or "")[:200] or None,
        "client_rating": _num(stats.get("score")),
        "client_spend": _num(charges.get("amount")),
        "client_member_since": None,
        "client_recent_history": None,
        "payment_verified": phone_status == "VERIFIED",
        # Client details (new columns)
        "client_score": _num(stats.get("score")),
        "client_hours_count": _num(stats.get("hoursCount")),
        "client_feedback_count": _int(stats.get("feedbackCount")),
        "client_payment_verified": phone_status == "VERIFIED",
        "client_total_spend": _num(charges.get("amount")),
        "client_total_hires": _int(stats.get("totalJobsWithHires")),
        "client_total_assignments": _int(stats.get("totalAssignments")),
        "client_active_assignments": _int(stats.get("activeAssignmentsCount")),
        "client_city": (location.get("city") or "")[:100] or None,
        "client_location_country": (location.get("country") or "")[:100] or None,
        "client_company_size": None,
        "client_industry": (category_group_obj.get("name") or "")[:200] or None,
        "client_total_jobs_with_hires": _int(stats.get("totalJobsWithHires")),
        "total_invited": _int(client_activity.get("totalInvitedToInterview")),
        "total_hired": _int(client_activity.get("totalHired")),
    }


def _clamp_past(date_str):
    """Return date_str as ISO if in the past, else None."""
    if not date_str:
        return None
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        if dt > datetime.now(timezone.utc):
            return None
        return dt.isoformat()
    except (ValueError, TypeError):
        return None


def _workload(w):
    m = {"PART_TIME": "Less than 30 hrs/week", "FULL_TIME": "More than 30 hrs/week", "AS_NEEDED": "As needed"}
    return m.get(w) if w else None


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


def fetch_uphunt_jobs():
    """Use Playwright to login to UpHunt and fetch jobs via their API."""
    import asyncio
    from playwright.async_api import async_playwright

    async def _fetch():
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            )
            page = await context.new_page()

            # Login
            await page.goto("https://uphunt.io/auth/signin", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)
            await page.locator('input[type="email"], input[name="email"]').first.fill(UPHUNT_EMAIL)
            await page.locator('input[type="password"]').first.fill(UPHUNT_PASSWORD)
            await page.locator('button:has-text("Sign In"), button[type="submit"]').first.click()
            await page.wait_for_timeout(5000)

            if "signin" in page.url:
                await browser.close()
                return None, "Login failed"

            all_jobs = []
            for pg in range(MAX_PAGES):
                page_num = pg + 1
                offset = pg * PAGE_SIZE
                time_range = "last_24h" if pg == 0 else "last_7d"

                result = await page.evaluate(f"""async () => {{
                    const resp = await fetch('/api/search/jobs?page={page_num}&limit={PAGE_SIZE}&timeRange={time_range}');
                    return await resp.json();
                }}""")

                jobs = result.get("jobs", [])
                if not jobs:
                    break
                all_jobs.extend(jobs)

                total_pages = result.get("totalPages", 1)
                if page_num >= total_pages:
                    break

                await page.wait_for_timeout(1000)

            await browser.close()
            return all_jobs, None

    return asyncio.run(_fetch())


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

    print("Fetching jobs from UpHunt API...")
    uphunt_jobs, error = fetch_uphunt_jobs()
    if error:
        print(f"ERROR: {error}")
        sys.exit(1)

    print(f"Fetched {len(uphunt_jobs)} jobs from UpHunt")

    new_jobs = []
    for job in uphunt_jobs:
        row = uphunt_to_db_row(job)
        if row["upwork_job_id"] not in existing_ids:
            new_jobs.append(row)
            existing_ids.add(row["upwork_job_id"])

    print(f"New jobs to insert: {len(new_jobs)}")

    if not new_jobs:
        print("No new jobs to insert")
        return

    batch_size = 100
    inserted_count = 0
    for i in range(0, len(new_jobs), batch_size):
        batch = new_jobs[i:i + batch_size]
        try:
            status = _insert_batch(supabase_url, service_key, batch)
            if status in (200, 201):
                inserted_count += len(batch)
            else:
                print(f"WARN: Insert batch status {status}")
        except Exception as e:
            print(f"ERROR inserting batch: {e}")

    print(f"\nDone! Inserted {inserted_count}/{len(new_jobs)} new jobs from UpHunt")


if __name__ == "__main__":
    main()
