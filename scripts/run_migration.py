#!/usr/bin/env python3
import json
from urllib.request import Request, urlopen
import sys

url = "https://kjfqtenfmxdoyjxxnhnm.supabase.co/rest/v1/rpc/exec_sql"
key = sys.argv[1] if len(sys.argv) > 1 else ""

if not key:
    print("Usage: python3 run_migration.py <service_role_key>")
    sys.exit(1)

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

payload = json.dumps({"query": sql}).encode()
req = Request(url, data=payload, headers={
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
}, method="POST")

try:
    with urlopen(req, timeout=30) as resp:
        print("Migration result:", resp.read().decode())
except Exception as e:
    print(f"Error: {e}")
