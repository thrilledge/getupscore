#!/usr/bin/env python3
"""
Grab JobDetailsNuxt_vt cookie via nodriver (bypasses Cloudflare Turnstile).
Just visits Upwork — no login needed. Turnstile auto-passes.
"""
import asyncio
import json
import sys

COOKIE_FILE = "/tmp/upwork_cookies.json"
DOCKER_COOKIE_FILE = "/home/ubuntu/upwork-api/upwork_cookies.json"
DOCKER_COOKIE_FILE2 = "/app/upwork_cookies.json"
CHROME_PATH = "/home/ubuntu/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome"


async def grab():
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
        print("Step 1: Visiting Upwork homepage...")
        page = await browser.get("https://www.upwork.com/")
        await asyncio.sleep(15)
        print(f"  URL: {page.url}")

        print("Step 2: Navigating to jobs search...")
        page = await browser.get("https://www.upwork.com/nx/search/jobs/")
        await asyncio.sleep(10)
        print(f"  URL: {page.url}")

        print("Step 3: Extracting cookies via browser.cookies...")
        all_cookies = {}
        try:
            cookie_list = await browser.cookies()
            for c in cookie_list:
                if isinstance(c, dict):
                    domain = c.get("domain", "")
                    if ".upwork.com" in domain:
                        all_cookies[c["name"]] = c["value"]
                else:
                    # nodriver cookie object
                    domain = getattr(c, "domain", "")
                    if ".upwork.com" in domain:
                        name = getattr(c, "name", "")
                        value = getattr(c, "value", "")
                        if name:
                            all_cookies[name] = value
        except Exception as e:
            print(f"  cookies() error: {e}")

        # Fallback: try CDP Network.getAllCookies via tab.send
        if not all_cookies:
            print("  Trying CDP fallback...")
            try:
                from nodriver import cdp
                result = await page.send(cdp.network.get_all_cookies())
                if result:
                    for c in result:
                        domain = getattr(c, "domain", "")
                        if ".upwork.com" in domain:
                            name = getattr(c, "name", "")
                            value = getattr(c, "value", "")
                            if name:
                                all_cookies[name] = value
            except Exception as e:
                print(f"  CDP fallback error: {e}")

        print(f"  Got {len(all_cookies)} Upwork cookies")
        important = ["JobDetailsNuxt_vt", "visitor_gql_token", "XSRF-TOKEN"]
        for name in important:
            val = all_cookies.get(name)
            print(f"  {'✓' if val else '✗'} {name}: {(val or 'NOT FOUND')[:50]}")

        if all_cookies:
            for path in [COOKIE_FILE, DOCKER_COOKIE_FILE, DOCKER_COOKIE_FILE2]:
                try:
                    with open(path, "w") as f:
                        json.dump(all_cookies, f, indent=2)
                    print(f"  Saved to {path}")
                except Exception as e:
                    print(f"  Could not save to {path}: {e}")

        return bool(all_cookies.get("JobDetailsNuxt_vt"))

    finally:
        browser.stop()
        print("Browser closed")


if __name__ == "__main__":
    success = asyncio.run(grab())
    print(f"\nResult: {'SUCCESS' if success else 'FAILED'}")
    sys.exit(0 if success else 1)
