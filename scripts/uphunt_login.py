"""
UpHunt.io Login & Session Extractor
Uses Playwright to login and capture session cookies/tokens.
"""
import json
import asyncio
import os
from playwright.async_api import async_playwright


EMAIL = os.environ.get("UPWORK_EMAIL", "")
PASSWORD = os.environ.get("UPWORK_PASSWORD", "")
OUTPUT_FILE = "uphunt_session.json"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        print("Navigating to UpHunt signin...")
        await page.goto("https://uphunt.io/auth/signin", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)

        print("Filling email...")
        email_input = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]').first
        await email_input.fill(EMAIL)

        print("Filling password...")
        pw_input = page.locator('input[type="password"], input[name="password"]').first
        await pw_input.fill(PASSWORD)

        print("Clicking Sign In...")
        await page.locator('button:has-text("Sign In"), button[type="submit"]').first.click()

        await page.wait_for_timeout(5000)
        print(f"Current URL after login: {page.url}")

        # Check if login succeeded
        if "signin" in page.url.lower():
            print("Login may have failed, checking for errors...")
            error_text = await page.locator(".text-red, .error, [class*='error']").all_text_contents()
            if error_text:
                print(f"Error messages: {error_text}")
        
        # Capture all cookies
        cookies = await context.cookies()
        print(f"\nCaptured {len(cookies)} cookies")
        for c in cookies:
            print(f"  {c['name']}: {c['value'][:50]}... (domain={c['domain']})")

        # Capture localStorage
        local_storage = await page.evaluate("""() => {
            const items = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                items[key] = localStorage.getItem(key);
            }
            return items;
        }""")
        print(f"\nLocalStorage keys: {list(local_storage.keys())}")

        # Capture sessionStorage
        session_storage = await page.evaluate("""() => {
            const items = {};
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                items[key] = sessionStorage.getItem(key);
            }
            return items;
        }""")
        print(f"SessionStorage keys: {list(session_storage.keys())}")

        # Save everything
        session_data = {
            "cookies": cookies,
            "localStorage": local_storage,
            "sessionStorage": session_storage,
            "current_url": page.url,
        }

        with open(OUTPUT_FILE, "w") as f:
            json.dump(session_data, f, indent=2, default=str)
        print(f"\nSession data saved to {OUTPUT_FILE}")

        # Take screenshot
        await page.screenshot(path="uphunt_screenshot.png")
        print("Screenshot saved to uphunt_screenshot.png")

        # Try to navigate to dashboard/jobs page
        if "signin" not in page.url.lower():
            print("\nNavigating to dashboard...")
            await page.goto("https://uphunt.io/dashboard", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(3000)
            await page.screenshot(path="uphunt_dashboard.png")
            print(f"Dashboard URL: {page.url}")

            # Look for API endpoints being called
            print("\nChecking page content for useful data...")
            title = await page.title()
            print(f"Page title: {title}")

        await browser.close()


asyncio.run(main())
