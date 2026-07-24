"""
UpHunt.io Search Jobs - explore their job search API
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
            if "uphunt.io" in url and ("/api/" in url or "/graphql" in url):
                data = {
                    "method": request.method,
                    "url": url,
                    "headers": dict(request.headers),
                }
                if request.post_data:
                    try:
                        data["post_data"] = json.loads(request.post_data)
                    except:
                        data["post_data"] = request.post_data[:1000]
                api_calls.append(data)

        def handle_response(response):
            url = response.url
            if "uphunt.io" in url and ("/api/" in url or "/graphql" in url):
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
        print(f"Logged in: {page.url}")

        # Navigate to Search Jobs
        print("\n=== Navigating to Search Jobs ===")
        await page.goto("https://uphunt.io/dashboard/search", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(5000)
        
        # Take screenshot
        await page.screenshot(path="uphunt_search.png")

        # Get page content
        body = await page.locator("body").text_content()
        print("Page content (first 3000 chars):")
        print(body[:3000])

        # Check for search input
        search_inputs = await page.locator("input[type='text'], input[type='search'], input[placeholder*='search' i], input[placeholder*='keyword' i]").all()
        print(f"\nFound {len(search_inputs)} search inputs")
        for inp in search_inputs:
            placeholder = await inp.get_attribute("placeholder") or ""
            print(f"  Placeholder: {placeholder}")

        # Check for filters
        selects = await page.locator("select, [role='combobox'], [role='listbox']").all()
        print(f"\nFound {len(selects)} select/combobox elements")

        # Try searching
        print("\n=== Trying to search for 'python developer' ===")
        search_input = page.locator("input[type='text'], input[type='search']").first
        if await search_input.count() > 0:
            await search_input.fill("python developer")
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(5000)
            await page.screenshot(path="uphunt_search_results.png")

        # Save all API calls
        print(f"\n=== Total API calls: {len(api_calls)} ===")
        for call in api_calls:
            print(f"\n{call['method']} {call['url']}")
            if 'post_data' in call:
                print(f"  Body: {json.dumps(call['post_data'], indent=2)[:500]}")

        with open("uphunt_search_api.json", "w") as f:
            json.dump(api_calls, f, indent=2, default=str)

        # Get session token for direct API calls
        cookies = await context.cookies()
        session_cookie = next((c for c in cookies if "session" in c["name"].lower()), None)
        if session_cookie:
            print(f"\n=== Session Token ===")
            print(session_cookie['value'])
            with open("uphunt_token.txt", "w") as f:
                f.write(session_cookie['value'])

        await browser.close()


asyncio.run(main())
