#!/usr/bin/env python3
import json
import sys
from urllib.request import Request, urlopen

EC2_API = "http://localhost:8000"
SUPABASE_URL = sys.argv[1]
SERVICE_KEY = sys.argv[2]
CIPHERTEXT = "gql_2079792631026719719"

print(f"1. Fetching auth details for {CIPHERTEXT}...")
try:
    url = f"{EC2_API}/jobs/{CIPHERTEXT}/details-auth"
    req = Request(url, headers={"Accept": "application/json"})
    with urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
        print(f"  success: {data.get('success')}")
        details = data.get("details", {})
        stats = details.get("client_stats", {})
        print(f"  score: {stats.get('score')}, spend: {stats.get('total_charges')}")
except Exception as e:
    print(f"  ERROR: {e}")
    sys.exit(1)

print("2. Updating Supabase...")
try:
    update = {
        "client_score": stats.get("score"),
        "client_total_spend": stats.get("total_charges"),
    }
    url = f"{SUPABASE_URL}/rest/v1/jobs?upwork_job_id=eq.{CIPHERTEXT}"
    payload = json.dumps(update).encode("utf-8")
    req = Request(url, data=payload, headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }, method="PATCH")
    with urlopen(req, timeout=30) as r:
        print(f"  Status: {r.status}")
except Exception as e:
    print(f"  ERROR: {e}")
