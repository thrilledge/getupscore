"""
Test Vercel frontend - login and check jobs page
"""
import json
import asyncio
import os
from playwright.async_api import async_playwright


EMAIL = os.environ.get("UPWORK_EMAIL", "")
PASSWORD = os.environ.get("UPWORK_PASSWORD", "")
FRONTEND = "https://www.getupscore.com/"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        api_responses = []

        def on_response(response):
            url = response.url
            if "api/jobs" in url or "jobs" in url.split("/")[-1]:
                api_responses.append({"url": url, "status": response.status})

        page.on("response", on_response)

        # Login
        print("1. Logging in to frontend...")
        await page.goto(f"{FRONTEND}/login", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1000)
        await page.locator('input[type="email"], input[name="email"]').first.fill(EMAIL)
        await page.locator('input[type="password"]').first.fill(PASSWORD)
        await page.locator('button:has-text("Sign In"), button[type="submit"]').first.click()
        await page.wait_for_timeout(5000)
        print(f"   URL: {page.url}")

        # Navigate to jobs
        print("\n2. Navigating to /jobs...")
        await page.goto(f"{FRONTEND}/jobs", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(5000)
        await page.screenshot(path="vercel_jobs.png")
        print(f"   URL: {page.url}")

        # Check API responses
        print(f"\n3. API responses captured: {len(api_responses)}")
        for r in api_responses:
            print(f"   {r['status']} {r['url'][:120]}")

        # Get page content
        print("\n4. Page content (first 2000 chars)...")
        content = await page.locator("body").text_content()
        if content:
            print(content[:2000])

        # Check for job cards
        job_cards = await page.locator("[class*='job'], [class*='card'], article").all()
        print(f"\n5. Found {len(job_cards)} job card elements")

        # Get job data from API directly
        print("\n6. Direct API call for jobs...")
        result = await page.evaluate("""async () => {
            try {
                const resp = await fetch('/api/jobs?page=1&limit=5');
                const data = await resp.json();
                return data;
            } catch(e) {
                return {error: e.message};
            }
        }""")
        print(f"   Jobs returned: {len(result.get('jobs', []))}")
        print(f"   Pagination: {json.dumps(result.get('pagination', {}))}")
        
        if result.get("jobs"):
            j = result["jobs"][0]
            print(f"\n7. First job:")
            print(f"   Title: {j.get('title', 'N/A')[:80]}")
            print(f"   Source: {j.get('source')}")
            print(f"   Client country: {j.get('client_country')}")
            print(f"   Client score: {j.get('client_score')}")
            print(f"   Client spend: {j.get('client_total_spend')}")
            print(f"   Client feedback: {j.get('client_feedback_count')}")

        # Check /api/jobs/status
        print("\n8. System status...")
        status = await page.evaluate("""async () => {
            try {
                const resp = await fetch('/api/jobs/status');
                return await resp.json();
            } catch(e) {
                return {error: e.message};
            }
        }""")
        print(f"   {json.dumps(status, default=str)[:500]}")

        await browser.close()
        print("\nDone!")


asyncio.run(main())
