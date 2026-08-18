"""
Check UpHunt API - does it return client details for all jobs or only some?
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

        # Login
        await page.goto("https://uphunt.io/auth/signin", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1500)
        await page.locator('input[type="email"], input[name="email"]').first.fill(EMAIL)
        await page.locator('input[type="password"]').first.fill(PASSWORD)
        await page.locator('button:has-text("Sign In"), button[type="submit"]').first.click()
        await page.wait_for_timeout(5000)

        # Fetch first page of jobs
        result = await page.evaluate("""async () => {
            const resp = await fetch('/api/search/jobs?page=1&limit=50&timeRange=last_24h');
            return await resp.json();
        }""")

        jobs = result.get("jobs", [])
        print(f"Total jobs in response: {len(jobs)}")

        has_auth_details = 0
        has_buyer_stats = 0
        has_location = 0
        has_description = 0

        for j in jobs:
            auth = j.get("authJobDetailsResponse", {}).get("data", {}).get("jobAuthDetails", {})
            buyer_info = auth.get("buyer", {}).get("info", {})
            stats = buyer_info.get("stats", {}) if buyer_info else {}
            location = buyer_info.get("location", {}) if buyer_info else {}
            desc = j.get("description", "")

            if auth:
                has_auth_details += 1
            if stats:
                has_buyer_stats += 1
            if location and location.get("country"):
                has_location += 1
            if desc:
                has_description += 1

        print(f"Jobs with authJobDetailsResponse: {has_auth_details}/{len(jobs)}")
        print(f"Jobs with buyer stats (score, spend): {has_buyer_stats}/{len(jobs)}")
        print(f"Jobs with location: {has_location}/{len(jobs)}")
        print(f"Jobs with description: {has_description}/{len(jobs)}")

        # Check if there's a way to get full details
        print("\nChecking subscription tier...")
        sub = await page.evaluate("""async () => {
            const resp = await fetch('/api/user/subscription');
            return await resp.json();
        }""")
        print(json.dumps(sub, indent=2))

        # Check if there's a details endpoint
        print("\nChecking for job detail endpoints...")
        # Try fetching a single job with full details
        if jobs:
            job_id = jobs[0].get("id")
            print(f"Job ID: {job_id}")

            # Check if UpHunt has a detail endpoint
            detail_result = await page.evaluate(f"""async () => {{
                try {{
                    const resp = await fetch('/api/search/jobs/{job_id}');
                    return {{status: resp.status, data: await resp.json()}};
                }} catch(e) {{
                    return {{error: e.message}};
                }}
            }}""")
            print(f"Detail endpoint: {json.dumps(detail_result, default=str)[:500]}")

        await browser.close()


asyncio.run(main())
