#!/usr/bin/env python3
"""
Login to Upwork via Playwright and save authenticated cookies.
Run outside Docker (system Python with playwright).
Saves to /tmp/upwork_cookies.json for Docker container to read.
"""
import asyncio
import json
import os
import sys

COOKIE_FILE = "/tmp/upwork_cookies.json"
DOCKER_COOKIE_FILE = "/home/ubuntu/upwork-api/upwork_cookies.json"

EMAIL = "usama@thrilledge.com"
PASSWORD = "@Usama#Adeel183"


async def login():
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
        )
        page = await context.new_page()
        await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        try:
            # 1. Go to login page
            print("Step 1: Loading login page...")
            await page.goto("https://www.upwork.com/ab/account-security/login", wait_until="domcontentloaded", timeout=90000)
            await page.wait_for_timeout(10000)
            print(f"  URL: {page.url}")

            # Debug: dump page structure
            inputs = await page.query_selector_all("input")
            print(f"  Found {len(inputs)} input elements:")
            for inp in inputs:
                name = await inp.get_attribute("name")
                iid = await inp.get_attribute("id")
                itype = await inp.get_attribute("type")
                placeholder = await inp.get_attribute("placeholder")
                aria = await inp.get_attribute("aria-label")
                print(f"    name={name} id={iid} type={itype} placeholder={placeholder} aria={aria}")

            # 2. Fill login form
            print("Step 2: Filling login form...")
            username_input = page.locator('input[name="login_username"], input[id="login_username"], input[aria-label="Email or username"], input[type="email"]')
            count = await username_input.count()
            print(f"  Username inputs found: {count}")
            if count > 0:
                await username_input.first.fill(EMAIL)
            else:
                # Fallback: try first visible text/email input
                await page.locator('input[type="text"], input[type="email"]').first.fill(EMAIL)
            await page.wait_for_timeout(500)
            password_input = page.locator('input[name="login_password"], input[id="login_password"], input[aria-label="Password"], input[type="password"]')
            pcount = await password_input.count()
            print(f"  Password inputs found: {pcount}")
            if pcount > 0:
                await password_input.first.fill(PASSWORD)
            await page.wait_for_timeout(500)

            # 3. Click login button
            print("Step 3: Clicking login...")
            submit_btn = page.locator('button[type="submit"], button[data-testid="login-submit"]')
            scount = await submit_btn.count()
            print(f"  Submit buttons found: {scount}")
            if scount > 0:
                await submit_btn.first.click()
            else:
                # Try pressing Enter
                await page.keyboard.press("Enter")
            await page.wait_for_timeout(8000)

            print(f"  URL after login: {page.url}")

            # Check if we're logged in (redirected away from login page)
            if "login" in page.url.lower():
                print("  WARNING: Still on login page, checking for errors...")
                error_text = await page.text_content(".alert, .error, [data-testid='error']")
                if error_text:
                    print(f"  Error: {error_text[:200]}")

            # 4. Navigate to jobs page to trigger cookie generation
            print("Step 4: Navigating to jobs page...")
            await page.goto("https://www.upwork.com/nx/search/jobs/", wait_until="domcontentloaded", timeout=90000)
            await page.wait_for_timeout(8000)
            print(f"  URL: {page.url}")

            # 5. Extract all cookies
            print("Step 5: Extracting cookies...")
            cookies = await context.cookies()

            upwork_cookies = {}
            for c in cookies:
                if ".upwork.com" in c.get("domain", ""):
                    upwork_cookies[c["name"]] = c["value"]

            print(f"  Got {len(upwork_cookies)} Upwork cookies")

            important = ["JobDetailsNuxt_vt", "visitor_gql_token", "XSRF-TOKEN", "oauth2_token_sg"]
            for name in important:
                val = upwork_cookies.get(name)
                if val:
                    print(f"  ✓ {name}: {val[:50]}...")
                else:
                    print(f"  ✗ {name}: NOT FOUND")

            # 6. Save cookies
            with open(COOKIE_FILE, "w") as f:
                json.dump(upwork_cookies, f, indent=2)
            print(f"\nSaved to {COOKIE_FILE}")

            # Also copy to Docker mount path
            with open(DOCKER_COOKIE_FILE, "w") as f:
                json.dump(upwork_cookies, f, indent=2)
            print(f"Saved to {DOCKER_COOKIE_FILE}")

            return bool(upwork_cookies.get("JobDetailsNuxt_vt") or upwork_cookies.get("visitor_gql_token"))

        finally:
            await browser.close()
            print("Browser closed")


if __name__ == "__main__":
    success = asyncio.run(login())
    print(f"\nLogin {'SUCCESS' if success else 'FAILED'}")
    sys.exit(0 if success else 1)
