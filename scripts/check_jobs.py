#!/usr/bin/env python3
import json
import sys
from urllib.request import Request, urlopen

SUPABASE_URL = sys.argv[1]
SERVICE_KEY = sys.argv[2]

# Count total
url = f"{SUPABASE_URL}/rest/v1/jobs?select=upwork_job_id&client_score=is.null&limit=1000"
req = Request(url, headers={
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Accept": "application/json",
    "Prefer": "count=exact",
})
try:
    with urlopen(req, timeout=30) as r:
        count_header = r.headers.get("content-range", "")
        data = json.loads(r.read())
        print(f"Content-Range: {count_header}")
        print(f"Jobs without client_score: {len(data)}")
        if data:
            print(f"First: {data[0]['upwork_job_id']}")
            print(f"Last: {data[-1]['upwork_job_id']}")
except Exception as e:
    print(f"Error: {e}")
