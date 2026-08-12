"""
Test Vercel frontend - signup with usama account, then check jobs
"""
import json
import asyncio
from playwright.async_api import async_playwright


EMAIL = "usamaadeel1183@gmail.com"
PASSWORD = "usama12345"
FRONTEND = "https://www.getupscore.com/"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        page = await context.new_page()

        api_responses = []

        def on_response(response):
            url = response.url
            if "/api/" in url:
                api_responses.append({"url": url, "status": response.status})

        page.on("response", on_response)

        # Try signup first
        print("1. Going to signup...")
        await page.goto(f"{FRONTEND}/signup", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1000)

        # Fill signup form
        email_input = page.locator('input[type="email"], input[name="email"]').first
        pw_input = page.locator('input[type="password"], input[name="password"]').first
        
        if await email_input.count() > 0:
            await email_input.fill(EMAIL)
            await pw_input.fill(PASSWORD)
            
            # Look for confirm password
            confirm = page.locator('input[name="confirmPassword"], input[placeholder*="confirm" i], input[type="password"]').nth(1)
            if await confirm.count() > 0:
                await confirm.fill(PASSWORD)
            
            await page.locator('button:has-text("Sign Up"), button:has-text("Create"), button[type="submit"]').first.click()
            await page.wait_for_timeout(5000)
            print(f"   After signup URL: {page.url}")

        # Now try login
        print("\n2. Going to login...")
        await page.goto(f"{FRONTEND}/login", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1000)

        email_input = page.locator('input[type="email"], input[name="email"]').first
        pw_input = page.locator('input[type="password"], input[name="password"]').first
        
        await email_input.fill(EMAIL)
        await pw_input.fill(PASSWORD)
        await page.locator('button:has-text("Sign In"), button[type="submit"]').first.click()
        await page.wait_for_timeout(5000)
        print(f"   After login URL: {page.url}")

        # Navigate to jobs
        print("\n3. Navigating to /jobs...")
        await page.goto(f"{FRONTEND}/jobs", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(5000)
        await page.screenshot(path="vercel_jobs_final.png")
        print(f"   URL: {page.url}")

        # API responses
        print(f"\n4. API responses: {len(api_responses)}")
        for r in api_responses[-10:]:
            print(f"   {r['status']} {r['url'][:120]}")

        # Direct API call
        print("\n5. Direct /api/jobs call...")
        result = await page.evaluate("""async () => {
            try {
                const resp = await fetch('/api/jobs?page=1&limit=3');
                return await resp.json();
            } catch(e) {
                return {error: e.message};
            }
        }""")
        jobs = result.get("jobs", [])
        print(f"   Jobs: {len(jobs)}")
        print(f"   Pagination: {json.dumps(result.get('pagination', {}))}")
        
        for j in jobs[:3]:
            print(f"\n   Title: {j.get('title', 'N/A')[:70]}")
            print(f"   Source: {j.get('source')}")
            print(f"   Client country: {j.get('client_country')}")
            print(f"   Client score: {j.get('client_score')}")
            print(f"   Client spend: {j.get('client_total_spend')}")
            print(f"   Client feedback: {j.get('client_feedback_count')}")
            print(f"   Payment verified: {j.get('client_payment_verified')}")

        # Get page content
        print("\n6. Page content (first 1500 chars)...")
        content = await page.locator("body").text_content()
        if content:
            print(content[:1500])

        await browser.close()
        print("\nDone!")


asyncio.run(main())
