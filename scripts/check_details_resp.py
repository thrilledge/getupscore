"""
Quick check: what does jobDetailsResponse actually look like for a few jobs?
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

        result = await page.evaluate("""async () => {
            const resp = await fetch('/api/search/jobs?page=1&limit=5&timeRange=last_24h');
            return await resp.json();
        }""")

        jobs = result.get("jobs", [])
        for i, j in enumerate(jobs):
            details = j.get("jobDetailsResponse")
            print(f"\n=== JOB {i+1} jobDetailsResponse type: {type(details).__name__} ===")
            if details:
                print(json.dumps(details, indent=2, default=str)[:1500])
            else:
                print("  NULL / None")

        await browser.close()


asyncio.run(main())
