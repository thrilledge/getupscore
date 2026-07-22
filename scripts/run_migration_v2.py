#!/usr/bin/env python3
import json
import sys
from curl_cffi import requests

KEY = sys.argv[1] if len(sys.argv) > 1 else ""

sql = """ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS client_score NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS client_hours_count NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS client_feedback_count INTEGER,
  ADD COLUMN IF NOT EXISTS client_payment_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_city TEXT,
  ADD COLUMN IF NOT EXISTS client_company_size TEXT,
  ADD COLUMN IF NOT EXISTS client_total_jobs_with_hires INTEGER,
  ADD COLUMN IF NOT EXISTS client_active_assignments INTEGER,
  ADD COLUMN IF NOT EXISTS client_location_country TEXT;"""

# Try different Supabase SQL endpoints
endpoints = [
    "https://kjfqtenfmxdoyjxxnhnm.supabase.co/pg/query",
    "https://kjfqtenfmxdoyjxxnhnm.supabase.co/rest/v1/rpc/exec",
    "https://kjfqtenfmxdoyjxxnhnm.supabase.co/sql",
]

for ep in endpoints:
    print(f"\nTrying {ep}...")
    try:
        r = requests.post(ep, json={"query": sql}, headers={
            "apikey": KEY, "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
        }, impersonate="safari17_0", timeout=30)
        print(f"  Status: {r.status_code}")
        print(f"  Response: {r.text[:300]}")
        if r.status_code in (200, 201, 204):
            print("\nSUCCESS!")
            break
    except Exception as e:
        print(f"  Error: {e}")
