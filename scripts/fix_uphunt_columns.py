import json
import os
from urllib.request import Request, urlopen

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

# Fetch UpHunt jobs needing fix
offset = 0
total_fixed = 0
while True:
    url = f"{SUPABASE_URL}/rest/v1/jobs?select=id,client_location_country,client_total_spend,client_score&source=eq.uphunt&client_country=is.null&offset={offset}&limit=100"
    req = Request(url, headers={**HEADERS, "Accept": "application/json"})
    with urlopen(req, timeout=30) as resp:
        jobs = json.loads(resp.read())
    if not jobs:
        break

    for job in jobs:
        patch = json.dumps({
            "client_country": job.get("client_location_country"),
            "client_spend": job.get("client_total_spend"),
            "client_rating": job.get("client_score"),
        }).encode()
        req = Request(
            f"{SUPABASE_URL}/rest/v1/jobs?id=eq.{job['id']}",
            data=patch, method="PATCH", headers=HEADERS
        )
        try:
            with urlopen(req, timeout=15) as resp:
                total_fixed += 1
        except Exception as e:
            print(f"ERR: {e}")

    offset += 100
    print(f"Processed {offset}... fixed so far: {total_fixed}")

print(f"Done! Fixed {total_fixed} jobs")
