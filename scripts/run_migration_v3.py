#!/usr/bin/env python3
"""Run SQL migration via Supabase Management API or direct approach."""
import json
import sys
from urllib.request import Request, urlopen

SERVICE_KEY_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZnF0ZW5mbXhkb3lqeHhuaG5tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTcxNDc5MH0.RykYr3Qp7VrNv4fLZz3qVcL8Fm7B3Jn5pXt6yZ4v8wQ"
SERVICE_KEY_SECRET = "sb_secret_dI5gwLE0HaNKXRXWQlgcJg_IRwEZmKU"
BASE = "https://kjfqtenfmxdoyjxxnhnm.supabase.co"

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

# Approach 1: Try Management API
print("=== Approach 1: Management API ===")
try:
    payload = json.dumps({"query": sql}).encode()
    req = Request(
        f"https://api.supabase.com/v1/projects/kjfqtenfmxdoyjxxnhnm/database/query",
        data=payload,
        headers={
            "Authorization": f"Bearer {SERVICE_KEY_SECRET}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(req, timeout=30) as resp:
        print(f"  Success: {resp.read().decode()[:200]}")
except Exception as e:
    print(f"  Error: {e}")

# Approach 2: Try with sb_secret key (no impersonation)
print("\n=== Approach 2: REST RPC with sb_secret ===")
try:
    payload = json.dumps({"query": sql}).encode()
    req = Request(
        f"{BASE}/rest/v1/rpc/exec",
        data=payload,
        headers={
            "apikey": SERVICE_KEY_SECRET,
            "Authorization": f"Bearer {SERVICE_KEY_SECRET}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(req, timeout=30) as resp:
        print(f"  Success: {resp.read().decode()[:200]}")
except Exception as e:
    print(f"  Error: {e}")

# Approach 3: Try with JWT key
print("\n=== Approach 3: REST RPC with JWT key ===")
try:
    payload = json.dumps({"query": sql}).encode()
    req = Request(
        f"{BASE}/rest/v1/rpc/exec",
        data=payload,
        headers={
            "apikey": SERVICE_KEY_JWT,
            "Authorization": f"Bearer {SERVICE_KEY_JWT}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(req, timeout=30) as resp:
        print(f"  Success: {resp.read().decode()[:200]}")
except Exception as e:
    print(f"  Error: {e}")

# Approach 4: Try PostgREST RPC with different function name
print("\n=== Approach 4: Try 'run_sql' RPC ===")
try:
    payload = json.dumps({"sql": sql}).encode()
    req = Request(
        f"{BASE}/rest/v1/rpc/run_sql",
        data=payload,
        headers={
            "apikey": SERVICE_KEY_JWT,
            "Authorization": f"Bearer {SERVICE_KEY_JWT}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(req, timeout=30) as resp:
        print(f"  Success: {resp.read().decode()[:200]}")
except Exception as e:
    print(f"  Error: {e}")

# Final verification
print("\n=== Verification ===")
try:
    req = Request(
        f"{BASE}/rest/v1/jobs?select=client_score,client_payment_verified,client_city&limit=1",
        headers={"apikey": SERVICE_KEY_JWT, "Authorization": f"Bearer {SERVICE_KEY_JWT}"}
    )
    with urlopen(req, timeout=10) as resp:
        print(f"  Columns OK: {resp.read().decode()[:200]}")
except Exception as e:
    print(f"  Columns missing (expected): {e}")
