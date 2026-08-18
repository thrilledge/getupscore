"""
UpHunt.io API Test - headless, runs on EC2
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
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        # Login
        print("1. Logging in...")
        await page.goto("https://uphunt.io/auth/signin", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        await page.locator('input[type="email"], input[name="email"]').first.fill(EMAIL)
        await page.locator('input[type="password"]').first.fill(PASSWORD)
        await page.locator('button:has-text("Sign In"), button[type="submit"]').first.click()
        await page.wait_for_timeout(5000)
        print(f"   URL: {page.url}")

        if "signin" in page.url:
            print("   LOGIN FAILED!")
            await browser.close()
            return

        print("   Login OK!")

        # Test Search Jobs API
        print("\n2. Testing /api/search/jobs...")
        result = await page.evaluate("""async () => {
            const resp = await fetch('/api/search/jobs?page=1&limit=5&timeRange=last_24h');
            return await resp.json();
        }""")
        
        jobs = result.get("jobs", [])
        print(f"   Jobs returned: {len(jobs)}")
        print(f"   Keys in response: {list(result.keys())}")
        
        if jobs:
            print(f"\n3. First job structure:")
            print(json.dumps(jobs[0], indent=2, default=str)[:2000])
            
            print(f"\n4. All job fields: {list(jobs[0].keys())}")

        # Test with keywords
        print("\n5. Testing search with keywords='python'...")
        result2 = await page.evaluate("""async () => {
            const resp = await fetch('/api/search/jobs?page=1&limit=5&timeRange=last_24h&keywords=python');
            return await resp.json();
        }""")
        jobs2 = result2.get("jobs", [])
        print(f"   Python jobs: {len(jobs2)}")
        if jobs2:
            print(f"   First: {jobs2[0].get('title', 'N/A')[:80]}")

        # Test subscription
        print("\n6. Subscription status...")
        sub = await page.evaluate("""async () => {
            const resp = await fetch('/api/user/subscription');
            return await resp.json();
        }""")
        print(f"   {json.dumps(sub, default=str)[:500]}")

        # Test session
        print("\n7. Session info...")
        session = await page.evaluate("""async () => {
            const resp = await fetch('/api/auth/session');
            return await resp.json();
        }""")
        print(f"   User: {session.get('user', {}).get('email', 'N/A')}")
        print(f"   Expires: {session.get('expires', 'N/A')}")

        # Save everything
        output = {
            "jobs_sample": result,
            "python_jobs": result2,
            "subscription": sub,
            "session": session,
        }
        with open("/home/ubuntu/upwork-api/uphunt_api_data.json", "w") as f:
            json.dump(output, f, indent=2, default=str)
        print("\n8. Data saved to uphunt_api_data.json")

        await browser.close()
        print("\nDone!")


asyncio.run(main())
