"""
UpHunt.io Dashboard Explorer - intercepts API calls to understand their backend
"""
import json
import asyncio
from playwright.async_api import async_playwright


EMAIL = "usamaadeel1183@gmail.com"
PASSWORD = "@Usama#Adeel183"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        api_calls = []

        def handle_request(request):
            url = request.url
            if "uphunt.io" in url and ("/api/" in url or "/graphql" in url or "/rest/" in url):
                api_calls.append({
                    "method": request.method,
                    "url": url,
                    "headers": dict(request.headers),
                    "post_data": request.post_data[:500] if request.post_data else None,
                })

        def handle_response(response):
            url = response.url
            if "uphunt.io" in url and ("/api/" in url or "/graphql" in url or "/rest/" in url):
                print(f"  API: {response.request.method} {url} -> {response.status}")

        page.on("request", handle_request)
        page.on("response", handle_response)

        # Login
        print("Logging in...")
        await page.goto("https://uphunt.io/auth/signin", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        await page.locator('input[type="email"], input[name="email"]').first.fill(EMAIL)
        await page.locator('input[type="password"]').first.fill(PASSWORD)
        await page.locator('button:has-text("Sign In"), button[type="submit"]').first.click()
        await page.wait_for_timeout(5000)
        print(f"Logged in, URL: {page.url}")

        # Explore dashboard
        print("\n=== Exploring Dashboard ===")
        await page.wait_for_timeout(3000)

        # Look for navigation links
        links = await page.locator("a[href]").all()
        nav_links = []
        for link in links:
            href = await link.get_attribute("href")
            text = (await link.text_content()).strip()[:50]
            if href and not href.startswith("#") and not href.startswith("javascript"):
                nav_links.append({"text": text, "href": href})
        
        print(f"Found {len(nav_links)} navigation links:")
        for nl in nav_links[:20]:
            print(f"  {nl['text']}: {nl['href']}")

        # Check for any Upwork-related data on the page
        print("\n=== Page Content ===")
        body_text = await page.locator("body").text_content()
        body_text = body_text[:3000]
        print(body_text[:2000])

        # Navigate to jobs page if exists
        for nl in nav_links:
            if "job" in nl["href"].lower() or "opportunity" in nl["href"].lower():
                print(f"\n=== Navigating to {nl['href']} ===")
                await page.goto(f"https://uphunt.io{nl['href']}" if nl['href'].startswith('/') else nl['href'], 
                              wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(3000)
                await page.screenshot(path="uphunt_jobs.png")
                
                # Check for job data
                jobs_text = await page.locator("body").text_content()
                print(jobs_text[:2000])
                break

        # Save API calls
        print(f"\n=== Captured {len(api_calls)} API calls ===")
        with open("uphunt_api_calls.json", "w") as f:
            json.dump(api_calls, f, indent=2, default=str)
        
        for call in api_calls[:10]:
            print(f"  {call['method']} {call['url']}")
            if call['post_data']:
                print(f"    Body: {call['post_data'][:200]}")

        # Get cookies with session token
        cookies = await context.cookies()
        session_cookie = next((c for c in cookies if "session" in c["name"].lower()), None)
        if session_cookie:
            print(f"\nSession token: {session_cookie['value'][:100]}...")
            # Save full token
            with open("uphunt_token.txt", "w") as f:
                f.write(session_cookie['value'])

        await browser.close()


asyncio.run(main())
