"""
Dump ALL fields from UpHunt job response to find extra data we're not capturing.
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
            const resp = await fetch('/api/search/jobs?page=1&limit=5&timeRange=last_24h');
            return await resp.json();
        }""")

        jobs = result.get("jobs", [])
        if not jobs:
            print("No jobs found")
            await browser.close()
            return

        # Dump full structure of first job
        job = jobs[0]
        print("=== TOP-LEVEL KEYS ===")
        print(list(job.keys()))
        print()

        print("=== jobTile.job KEYS ===")
        tile = job.get("jobTile", {}).get("job", {})
        print(json.dumps(tile, indent=2, default=str)[:3000])
        print()

        print("=== authJobDetailsResponse FULL ===")
        auth = job.get("authJobDetailsResponse", {})
        print(json.dumps(auth, indent=2, default=str)[:3000])
        print()

        print("=== jobDetailsResponse FULL ===")
        details = job.get("jobDetailsResponse", {})
        print(json.dumps(details, indent=2, default=str)[:3000])
        print()

        print("=== ontologySkills ===")
        print(json.dumps(job.get("ontologySkills", [])[:3], indent=2))

        # Also check tile-level client fields
        print("\n=== TILE CLIENT FIELDS ===")
        for key in tile:
            if "client" in key.lower() or "proposal" in key.lower() or "application" in key.lower() or "fee" in key.lower():
                print(f"  {key}: {tile[key]}")

        # Save full JSON for analysis
        with open("uphunt_full_sample.json", "w") as f:
            json.dump(jobs, f, indent=2, default=str)
        print("\nSaved full sample to uphunt_full_sample.json")

        await browser.close()


asyncio.run(main())
