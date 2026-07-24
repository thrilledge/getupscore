"""
Check raw UpHunt response for jobs that have null location in Supabase
"""
import json
import asyncio
from playwright.async_api import async_playwright

EMAIL = "usamaadeel1183@gmail.com"
PASSWORD = "@Usama#Adeel183"


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

        # Fetch page 1
        result = await page.evaluate("""async () => {
            const resp = await fetch('/api/search/jobs?page=1&limit=50&timeRange=last_24h');
            return await resp.json();
        }""")

        jobs = result.get("jobs", [])

        # Categorize
        has_stats_no_location = 0
        has_location_no_stats = 0
        has_both = 0
        has_neither = 0
        no_auth = 0

        for j in jobs:
            auth = j.get("authJobDetailsResponse", {}).get("data", {}).get("jobAuthDetails", {})
            if not auth:
                no_auth += 1
                continue

            buyer = auth.get("buyer", {}).get("info", {}) or {}
            stats = buyer.get("stats", {}) or {}
            location = buyer.get("location", {}) or {}
            charges = (stats.get("totalCharges") or {}) if stats else {}

            has_stats = bool(stats.get("score") is not None or charges.get("amount") is not None)
            has_loc = bool(location.get("country"))

            if has_stats and has_loc:
                has_both += 1
            elif has_stats and not has_loc:
                has_stats_no_location += 1
            elif not has_stats and has_loc:
                has_location_no_stats += 1
            else:
                has_neither += 1

        print(f"Total: {len(jobs)}")
        print(f"No auth data: {no_auth}")
        print(f"Has BOTH stats+location: {has_both}")
        print(f"Has stats, NO location: {has_stats_no_location}")
        print(f"Has location, NO stats: {has_location_no_stats}")
        print(f"Has NEITHER: {has_neither}")

        # Show a "has stats no location" example
        for j in jobs:
            auth = j.get("authJobDetailsResponse", {}).get("data", {}).get("jobAuthDetails", {})
            if not auth:
                continue
            buyer = auth.get("buyer", {}).get("info", {}) or {}
            stats = buyer.get("stats", {}) or {}
            location = buyer.get("location", {}) or {}
            charges = (stats.get("totalCharges") or {}) if stats else {}
            has_stats = bool(stats.get("score") is not None or charges.get("amount") is not None)
            has_loc = bool(location.get("country"))

            if has_stats and not has_loc:
                tile = j.get("jobTile", {}).get("job", {})
                print(f"\n  Example - no location:")
                print(f"    Job: {j.get('title', '')[:60]}")
                print(f"    ID: {tile.get('id')}")
                print(f"    Stats: score={stats.get('score')} spend={charges.get('amount')}")
                print(f"    Location raw: {json.dumps(buyer.get('location'))}")
                break

        await browser.close()


asyncio.run(main())
