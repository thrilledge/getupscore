#!/usr/bin/env python3
"""mcp_config.py â€” read/write the UpWork MCP ingest config row (id=1).

Usage:
    python3 mcp_config.py --get
        â†’ prints JSON {jobs_per_sync, sync_interval_minutes, last_sync_at}
    python3 mcp_config.py --set-sync <jobs_count> [<iso_timestamp>]
        â†’ records last_sync_* after a sync run

Env: SUPABASE_URL, SUPABASE_SERVICE_KEY
"""
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

BASE = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")


def ep(path, method="GET", body=None):
    req = urllib.request.Request(f"{BASE}/rest/v1/{path}", method=method)
    req.add_header("apikey", KEY)
    req.add_header("Authorization", f"Bearer {KEY}")
    req.add_header("Content-Type", "application/json")
    data = json.dumps(body).encode() if body is not None else None
    with urllib.request.urlopen(req, data=data, timeout=40) as r:
        raw = r.read().decode()
        return json.loads(raw) if raw else {}


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "--get"
    if mode == "--get":
        try:
            rows = ep("upwork_mcp_config?id=eq.1&select=id,jobs_per_sync,sync_interval_minutes,last_sync_at,last_sync_jobs")
            row = rows[0] if rows else {}
            print(json.dumps({
                "jobs_per_sync": row.get("jobs_per_sync", 10),
                "sync_interval_minutes": row.get("sync_interval_minutes", 5),
                "last_sync_at": row.get("last_sync_at"),
                "last_sync_jobs": row.get("last_sync_jobs"),
            }))
        except Exception:
            print(json.dumps({"jobs_per_sync": 10, "sync_interval_minutes": 5, "last_sync_at": None, "last_sync_jobs": None}))
    elif mode == "--set-sync":
        jobs = int(sys.argv[2] or 0)
        ts = sys.argv[3] if len(sys.argv) > 3 else datetime.now(timezone.utc).isoformat()
        try:
            ep("upwork_mcp_config?id=eq.1", method="PATCH", body={
                "last_sync_jobs": jobs,
                "last_sync_at": ts,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            print(f"recorded last_sync jobs={jobs} at={ts}")
        except Exception as e:
            print("record failed:", e)
    else:
        print("unknown mode")
        sys.exit(1)


if __name__ == "__main__":
    main()