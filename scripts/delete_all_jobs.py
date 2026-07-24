"""Delete ALL jobs from the database."""
import os
import sys
import json
from urllib.request import Request, urlopen


def main():
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not supabase_url or not service_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        sys.exit(1)

    deleted = 0
    while True:
        # Get a batch of IDs
        batch_url = f"{supabase_url}/rest/v1/jobs?select=id&limit=500"
        req = Request(batch_url, headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        })
        with urlopen(req, timeout=30) as resp:
            rows = json.loads(resp.read())
            if not rows:
                break

        ids = [r["id"] for r in rows]
        ids_str = ",".join(ids)

        del_url = f"{supabase_url}/rest/v1/jobs?id=in.({ids_str})"
        del_req = Request(del_url, method="DELETE", headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Prefer": "return=minimal",
        })
        with urlopen(del_req, timeout=60) as resp:
            deleted += len(ids)
            print(f"  Deleted {deleted} jobs... (status={resp.status})")

        if len(ids) < 500:
            break

    print(f"\nDone! Deleted {deleted} jobs total.")


if __name__ == "__main__":
    main()
