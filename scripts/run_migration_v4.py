#!/usr/bin/env python3
import requests
import sys

KEY = sys.argv[1]
SQL = sys.argv[2] if len(sys.argv) > 2 else """ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS client_score NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS client_hours_count NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS client_feedback_count INTEGER,
  ADD COLUMN IF NOT EXISTS client_payment_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_city TEXT,
  ADD COLUMN IF NOT EXISTS client_company_size TEXT,
  ADD COLUMN IF NOT EXISTS client_total_jobs_with_hires INTEGER,
  ADD COLUMN IF NOT EXISTS client_active_assignments INTEGER,
  ADD COLUMN IF NOT EXISTS client_location_country TEXT;"""

url = "https://kjfqtenfmxdoyjxxnhnm.supabase.co/rest/v1/rpc/exec"

r = requests.post(url, json={"query": SQL}, headers={
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "X-Client-Info": "supabase-cli",
}, timeout=30)
print(f"Status: {r.status_code}")
print(f"Response: {r.text[:500]}")
