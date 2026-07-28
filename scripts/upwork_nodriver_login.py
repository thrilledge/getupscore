#!/usr/bin/env python3
"""
Login to Upwork via nodriver (undetected chromedriver) to bypass Cloudflare.
Saves authenticated cookies for client detail enrichment.
"""
import asyncio
import json
import sys

COOKIE_FILE = "/tmp/upwork_cookies.json"
DOCKER_COOKIE_FILE = "/home/ubuntu/upwork-api/upwork_cookies.json"
CHROME_PATH = "/home/ubuntu/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome"

EMAIL = "usama@thrilledge.com"
PASSWORD = "@Usama#Adeel183"


async def login():
    import nodriver as uc

    browser = await uc.start(
        headless=True,
        browser_executable_path=CHROME_PATH,
        browser_args=[
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--window-size=1920,1080",
        ]
    )

    try:
        # 1. Go to login page
        print("Step 1: Loading login page...")
        page = await browser.get("https://www.upwork.com/ab/account-security/login")
        await asyncio.sleep(10)

        current_url = page.url if hasattr(page, 'url') else str(page.target_url)
        print(f"  URL: {current_url}")

        # 2. Find and fill username
        print("Step 2: Finding login form...")
        username_el = await page.select('input[name="login_username"], input[id="login_username"]')
        if not username_el:
            # Try to find any visible text input
            username_el = await page.find("Email or username", best_match=True)
        
        if username_el:
            print("  Found username field, typing...")
            await username_el.clear_input()
            await username_el.send_keys(EMAIL)
            await asyncio.sleep(1)
        else:
            print("  ERROR: Username field not found!")
            # Dump page for debugging
            html = await page.get_content()
            print(f"  Page length: {len(html)}")
            if len(html) < 5000:
                print(f"  HTML: {html[:2000]}")
            return False

        # 3. Find and fill password
        print("Step 3: Filling password...")
        password_el = await page.select('input[name="login_password"], input[id="login_password"]')
        if not password_el:
            password_el = await page.find("Password", best_match=True)
        
        if password_el:
            await password_el.clear_input()
            await password_el.send_keys(PASSWORD)
            await asyncio.sleep(1)
        else:
            print("  ERROR: Password field not found!")
            return False

        # 4. Click login
        print("Step 4: Clicking login...")
        submit_btn = await page.select('button[type="submit"]')
        if submit_btn:
            await submit_btn.click()
        else:
            # Try pressing Enter
            await password_el.send_keys("\n")

        await asyncio.sleep(12)
        current_url = page.url if hasattr(page, 'url') else str(page.target_url)
        print(f"  URL after login: {current_url}")

        # 5. Navigate to jobs page to trigger cookies
        print("Step 5: Navigating to jobs page...")
        page = await browser.get("https://www.upwork.com/nx/search/jobs/")
        await asyncio.sleep(8)

        # 6. Get all cookies via CDP
        print("Step 6: Extracting cookies...")
        cookies_result = await browser.send(
            browser.get_target(),
            browser.make_cmd("Network.getAllCookies")
        )

        all_cookies = {}
        if cookies_result and "result" in cookies_result:
            for c in cookies_result["result"].get("cookies", []):
                if ".upwork.com" in c.get("domain", ""):
                    all_cookies[c["name"]] = c["value"]

        print(f"  Got {len(all_cookies)} Upwork cookies")
        important = ["JobDetailsNuxt_vt", "visitor_gql_token", "XSRF-TOKEN", "oauth2_token_sg"]
        for name in important:
            val = all_cookies.get(name)
            if val:
                print(f"  ✓ {name}: {val[:50]}...")
            else:
                print(f"  ✗ {name}: NOT FOUND")

        if all_cookies:
            with open(COOKIE_FILE, "w") as f:
                json.dump(all_cookies, f, indent=2)
            print(f"\nSaved to {COOKIE_FILE}")

            with open(DOCKER_COOKIE_FILE, "w") as f:
                json.dump(all_cookies, f, indent=2)
            print(f"Saved to {DOCKER_COOKIE_FILE}")

        return bool(all_cookies.get("JobDetailsNuxt_vt"))

    finally:
        browser.stop()
        print("Browser closed")


if __name__ == "__main__":
    success = asyncio.run(login())
    print(f"\nLogin {'SUCCESS' if success else 'FAILED'}")
    sys.exit(0 if success else 1)
