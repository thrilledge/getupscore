"""
Debug: check UpHunt jobs IN Supabase that have null client_score
vs the same job in UpHunt API which should have the data
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
    # First: find UpHunt jobs in Supabase with NULL client_score
    url = f"{SUPABASE_URL}/rest/v1/jobs?select=id,upwork_job_id,title,client_score,client_total_spend&source=eq.uphunt&client_score=is.null&limit=5"
    req = Request(url, headers={
        "apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}", "Accept": "application/json",
    })
    with urlopen(req, timeout=15) as resp:
        null_jobs = json.loads(resp.read())

    print(f"Found {len(null_jobs)} UpHunt jobs with NULL client_score")
    for j in null_jobs:
        print(f"  {j['upwork_job_id']}: {j['title'][:60]}")

    # Now fetch from UpHunt API and check
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

        # Fetch all pages to find our null jobs
        for pg in range(1, 6):
            result = await page.evaluate(f"""async () => {{
                const resp = await fetch('/api/search/jobs?page={pg}&limit=50&timeRange=last_7d');
                return await resp.json();
            }}""")
            
            uphunt_jobs = result.get("jobs", [])
            for uj in uphunt_jobs:
                tile = uj.get("jobTile", {}).get("job", {})
                uid = f"uphunt_{tile.get('id', '')}"
                
                for nj in null_jobs:
                    if nj["upwork_job_id"] == uid:
                        auth = uj.get("authJobDetailsResponse", {}).get("data", {}).get("jobAuthDetails", {})
                        buyer = auth.get("buyer", {}).get("info", {}) if auth else {}
                        stats = buyer.get("stats", {}) if buyer else {}
                        charges = (stats.get("totalCharges") or {}) if stats else {}
                        
                        print(f"\n  MATCH: {uid}")
                        print(f"    UpHunt has auth: {bool(auth)}")
                        print(f"    UpHunt score: {stats.get('score') if stats else 'NO STATS'}")
                        print(f"    UpHunt spend: {charges.get('amount') if charges else 'NO CHARGES'}")
                        print(f"    Supabase score: {nj['client_score']}")
                        break

            await page.wait_for_timeout(1000)

        await browser.close()


asyncio.run(main())
