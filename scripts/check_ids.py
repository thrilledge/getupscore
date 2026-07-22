#!/usr/bin/env python3
import json
from urllib.request import Request, urlopen

SERVICE_KEY = "sb_secret_dI5gwLE0HaNKXRXWQlgcJg_IRwEZmKU"
BASE = "https://kjfqtenfmxdoyjxxnhnm.supabase.co"

# Get a few jobs with their upwork_job_id and url to understand the format
url = f"{BASE}/rest/v1/jobs?select=upwork_job_id,url&client_score=is.null&limit=5"
req = Request(url, headers={
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Accept": "application/json",
})
with urlopen(req, timeout=30) as r:
    data = json.loads(r.read())
    for j in data:
        print(f"id: {j['upwork_job_id']}")
        print(f"url: {j.get('url', 'N/A')}")
        print()
