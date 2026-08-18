"""
Check which extra fields are consistently available across multiple jobs.
"""
import json
import asyncio
import os
from playwright.async_api import async_playwright

EMAIL = os.environ.get("UPWORK_EMAIL", "")
PASSWORD = os.environ.get("UPWORK_PASSWORD", "")


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        page = await context.new_page()

        await page.goto("https://uphunt.io/auth/signin", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1500)
        await page.locator('input[type="email"], input[name="email"]').first.fill(EMAIL)
        await page.locator('input[type="password"]').first.fill(PASSWORD)
        await page.locator('button:has-text("Sign In"), button[type="submit"]').first.click()
        await page.wait_for_timeout(5000)

        result = await page.evaluate("""async () => {
            const resp = await fetch('/api/search/jobs?page=1&limit=50&timeRange=last_24h');
            return await resp.json();
        }""")

        jobs = result.get("jobs", [])
        print(f"Total jobs: {len(jobs)}")

        # Check which fields are present across jobs
        fields = {
            "category": 0,
            "categoryGroup": 0,
            "phone_verified": 0,
            "enterprise": 0,
            "topClient": 0,
            "company_name": 0,
            "postedCount": 0,
            "firstJobPost": 0,
            "totalInvitedToInterview": 0,
            "numberOfPositionsToHire": 0,
            "totalApplicants": 0,
            "totalHired": 0,
            "buyer_payment": 0,
            "workHistory": 0,
            "avgHourlyJobsRate": 0,
            "location_state": 0,
            "location_timezone": 0,
        }

        for j in jobs:
            tile = j.get("jobTile", {}).get("job", {})
            auth = (j.get("authJobDetailsResponse") or {}).get("data", {}) or {}
            auth = auth.get("jobAuthDetails", {}) or {}
            details = (j.get("jobDetailsResponse") or {}).get("data", {}) or {}
            details = details.get("jobPubDetails", {}) or {}
            buyer = auth.get("buyer", {}) or {}
            buyer_info = buyer.get("info", {}) or {}
            buyer_stats = buyer_info.get("stats", {}) or {}
            buyer_location = buyer_info.get("location", {}) or {}
            buyer_company = buyer_info.get("company", {}) or {}
            buyer_jobs = buyer_info.get("jobs", {}) or {}
            client_activity = details.get("clientActivity", {}) or {}
            tags = (details.get("annotations") or {}).get("tags", []) or []

            if details.get("category", {}).get("name"):
                fields["category"] += 1
            if details.get("categoryGroup", {}).get("name"):
                fields["categoryGroup"] += 1
            if (auth.get("phoneVerificationStatus") or {}).get("status") == "VERIFIED":
                fields["phone_verified"] += 1
            if buyer.get("enterprise"):
                fields["enterprise"] += 1
            if auth.get("topClient"):
                fields["topClient"] += 1
            if (buyer_company or {}).get("name"):
                fields["company_name"] += 1
            if (buyer_jobs or {}).get("postedCount"):
                fields["postedCount"] += 1
            if "firstJobPost" in tags:
                fields["firstJobPost"] += 1
            if (client_activity or {}).get("totalInvitedToInterview"):
                fields["totalInvitedToInterview"] += 1
            if (client_activity or {}).get("numberOfPositionsToHire"):
                fields["numberOfPositionsToHire"] += 1
            if (client_activity or {}).get("totalApplicants"):
                fields["totalApplicants"] += 1
            if (client_activity or {}).get("totalHired"):
                fields["totalHired"] += 1
            if buyer.get("payment"):
                fields["buyer_payment"] += 1
            if (buyer.get("workHistory") or []):
                fields["workHistory"] += 1
            if (buyer_info or {}).get("avgHourlyJobsRate"):
                fields["avgHourlyJobsRate"] += 1
            if (buyer_location or {}).get("countryTimezone"):
                fields["location_timezone"] += 1

        print("\n=== FIELD AVAILABILITY (out of 50 jobs) ===")
        for field, count in sorted(fields.items(), key=lambda x: -x[1]):
            pct = count / len(jobs) * 100
            print(f"  {field}: {count}/{len(jobs)} ({pct:.0f}%)")

        # Check what buyer_payment looks like
        print("\n=== BUYER PAYMENT SAMPLE ===")
        for j in jobs[:10]:
            auth = (j.get("authJobDetailsResponse") or {}).get("data", {}) or {}
            auth = auth.get("jobAuthDetails", {}) or {}
            buyer = auth.get("buyer", {}) or {}
            payment = buyer.get("payment")
            if payment:
                print(f"  Payment: {json.dumps(payment, default=str)[:200]}")
                break
        else:
            print("  No payment data found in first 10 jobs")

        # Check workHistory
        print("\n=== WORK HISTORY SAMPLE ===")
        for j in jobs[:20]:
            auth = (j.get("authJobDetailsResponse") or {}).get("data", {}) or {}
            auth = auth.get("jobAuthDetails", {}) or {}
            buyer = auth.get("buyer", {}) or {}
            wh = buyer.get("workHistory", []) or []
            if wh:
                print(f"  Work history: {json.dumps(wh[:2], default=str)[:300]}")
                break
        else:
            print("  No work history found in first 20 jobs")

        await browser.close()


asyncio.run(main())
