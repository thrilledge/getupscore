"""
Compare UpHunt API response vs what's stored in Supabase for same jobs
"""
import json
import asyncio
from playwright.async_api import async_playwright
from urllib.request import Request, urlopen

EMAIL = "usamaadeel1183@gmail.com"
PASSWORD = "@Usama#Adeel183"
SUPABASE_URL = "https://kjfqtenfmxdoyjxxnhnm.supabase.co"
SERVICE_KEY = "sb_secret_dI5gwLE0HaNKXRXWQlgcJg_IRwEZmKU"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        page = await context.new_page()

        await page.goto("https://uphunt.io/auth/signin", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1500)
        await page.locator('input[type="email"], input[name="email"]').first.fill(EMAIL)
        await page.locator('input[type="password"]').first.fill(PASSWORD)
        await page.locator('button:has-text("Sign In"), button[type="submit"]').first.click()
        await page.wait_for_timeout(5000)

        # Get jobs from UpHunt
        result = await page.evaluate("""async () => {
            const resp = await fetch('/api/search/jobs?page=1&limit=10&timeRange=last_24h');
            return await resp.json();
        }""")
        jobs = result.get("jobs", [])

        # For each job, compare UpHunt data vs Supabase data
        for j in jobs[:5]:
            tile = j.get("jobTile", {}).get("job", {})
            job_id = tile.get("id", "")
            auth = j.get("authJobDetailsResponse", {}).get("data", {}).get("jobAuthDetails", {})
            buyer_info = auth.get("buyer", {}).get("info", {}) if auth else {}
            stats = buyer_info.get("stats", {}) if buyer_info else {}
            location = buyer_info.get("location", {}) if buyer_info else {}
            charges = stats.get("totalCharges", {}) if stats else {}

            print(f"\n=== Job {job_id}: {j.get('title', '')[:60]} ===")
            print(f"  UpHunt: score={stats.get('score')} spend={charges.get('amount')} country={location.get('country')} feedback={stats.get('feedbackCount')}")

            # Check Supabase
            url = f"{SUPABASE_URL}/rest/v1/jobs?upwork_job_id=eq.uphunt_{job_id}&select=title,client_score,client_total_spend,client_country,client_feedback_count"
            req = Request(url, headers={
                "apikey": SERVICE_KEY,
                "Authorization": f"Bearer {SERVICE_KEY}",
                "Accept": "application/json",
            })
            try:
                with urlopen(req, timeout=10) as resp:
                    rows = json.loads(resp.read())
                    if rows:
                        r = rows[0]
                        print(f"  Supabase: score={r.get('client_score')} spend={r.get('client_total_spend')} country={r.get('client_country')} feedback={r.get('client_feedback_count')}")
                    else:
                        print(f"  Supabase: NOT FOUND")
            except Exception as e:
                print(f"  Supabase error: {e}")

        await browser.close()


asyncio.run(main())
