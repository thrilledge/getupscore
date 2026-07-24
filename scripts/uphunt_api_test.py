"""
UpHunt.io Direct API calls using session token
"""
import json
import asyncio
from urllib.request import Request, urlopen
from playwright.async_api import async_playwright


EMAIL = "usamaadeel1183@gmail.com"
PASSWORD = "@Usama#Adeel183"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        page = await context.new_page()

        # Login
        print("Logging in...")
        await page.goto("https://uphunt.io/auth/signin", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        await page.locator('input[type="email"], input[name="email"]').first.fill(EMAIL)
        await page.locator('input[type="password"]').first.fill(PASSWORD)
        await page.locator('button:has-text("Sign In"), button[type="submit"]').first.click()
        await page.wait_for_timeout(5000)
        print(f"Logged in: {page.url}")

        # Get cookies for direct API calls
        cookies = await context.cookies()
        cookie_dict = {c["name"]: c["value"] for c in cookies if "uphunt" in c["domain"]}
        cookie_string = "; ".join(f"{k}={v}" for k, v in cookie_dict.items())

        # Test direct API calls using page.evaluate (same session)
        print("\n=== Testing Search Jobs API ===")
        result = await page.evaluate("""async () => {
            const resp = await fetch('/api/search/jobs?page=1&limit=10&timeRange=last_24h');
            return await resp.json();
        }""")
        print(f"Jobs returned: {len(result.get('jobs', [])) if isinstance(result, dict) else 'N/A'}")
        print(json.dumps(result, indent=2, default=str)[:3000])

        # Save full result
        with open("uphunt_jobs_api_response.json", "w") as f:
            json.dump(result, f, indent=2, default=str)

        # Test with filters
        print("\n=== Testing Search with keywords ===")
        result2 = await page.evaluate("""async () => {
            const resp = await fetch('/api/search/jobs?page=1&limit=10&timeRange=last_24h&keywords=python');
            return await resp.json();
        }""")
        print(json.dumps(result2, indent=2, default=str)[:2000])

        # Check subscription status
        print("\n=== Subscription Status ===")
        sub = await page.evaluate("""async () => {
            const resp = await fetch('/api/user/subscription');
            return await resp.json();
        }""")
        print(json.dumps(sub, indent=2, default=str)[:1000])

        # Check user profile
        print("\n=== User Profile ===")
        user = await page.evaluate("""async () => {
            const resp = await fetch('/api/auth/session');
            return await resp.json();
        }""")
        print(json.dumps(user, indent=2, default=str)[:1000])

        await browser.close()


asyncio.run(main())
