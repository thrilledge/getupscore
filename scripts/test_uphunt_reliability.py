"""
Test UpHunt auto-login reliability - check for CAPTCHA, rate limits, etc.
Run multiple times to see if login stays reliable.
"""
import json
import asyncio
import time
from playwright.async_api import async_playwright


EMAIL = "usamaadeel1183@gmail.com"
PASSWORD = "@Usama#Adeel183"


async def test_login(attempt):
    start = time.time()
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        errors = []
        def on_response(response):
            if response.status >= 400 and "uphunt" in response.url:
                errors.append(f"{response.status} {response.url}")

        page.on("response", on_response)

        try:
            await page.goto("https://uphunt.io/auth/signin", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(1500)

            # Check for CAPTCHA
            captcha = await page.locator("iframe[src*='captcha'], iframe[src*='recaptcha'], [class*='captcha'], [id*='captcha']").count()
            if captcha > 0:
                print(f"  Attempt {attempt}: CAPTCHA DETECTED!")
                await browser.close()
                return False, "CAPTCHA"

            # Fill and submit
            await page.locator('input[type="email"], input[name="email"]').first.fill(EMAIL)
            await page.locator('input[type="password"]').first.fill(PASSWORD)
            await page.locator('button:has-text("Sign In"), button[type="submit"]').first.click()
            await page.wait_for_timeout(5000)

            url = page.url
            elapsed = time.time() - start

            if "signin" in url:
                error_text = await page.locator("[class*='error'], [class*='alert']").all_text_contents()
                print(f"  Attempt {attempt}: LOGIN FAILED ({elapsed:.1f}s) - {error_text}")
                await browser.close()
                return False, f"Failed: {error_text}"

            # Check for any blocking modal/popup
            modal = await page.locator("[role='dialog'], [class*='modal']").count()

            # Test API call
            result = await page.evaluate("""async () => {
                const resp = await fetch('/api/search/jobs?page=1&limit=1');
                return {status: resp.status, ok: resp.ok};
            }""")

            print(f"  Attempt {attempt}: OK ({elapsed:.1f}s) API={result['status']} errors={len(errors)} modal={modal}")
            await browser.close()
            return True, None

        except Exception as e:
            elapsed = time.time() - start
            print(f"  Attempt {attempt}: EXCEPTION ({elapsed:.1f}s) - {e}")
            await browser.close()
            return False, str(e)


async def main():
    print("Testing UpHunt login reliability (5 attempts)...\n")
    results = []
    for i in range(1, 6):
        ok, err = await test_login(i)
        results.append({"attempt": i, "ok": ok, "error": err})
        if i < 5:
            await asyncio.sleep(3)

    successes = sum(1 for r in results if r["ok"])
    print(f"\nResult: {successes}/5 successful")
    if successes < 5:
        print("Failures:")
        for r in results:
            if not r["ok"]:
                print(f"  Attempt {r['attempt']}: {r['error']}")


asyncio.run(main())
