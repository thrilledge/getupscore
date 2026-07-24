"""Verify data quality after re-ingest."""
import os
import json
from urllib.request import Request, urlopen


def main():
    supabase_url = os.environ["SUPABASE_URL"]
    service_key = os.environ["SUPABASE_SERVICE_KEY"]

    # Get all jobs with key fields
    all_rows = []
    offset = 0
    while True:
        url = f"{supabase_url}/rest/v1/jobs?select=client_score,client_country,client_name,category,payment_verified,proposals_count,client_industry,client_total_spend,total_invited,total_hired,client_payment_verified&offset={offset}&limit=500"
        req = Request(url, headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        })
        with urlopen(req, timeout=30) as resp:
            rows = json.loads(resp.read())
            if not rows:
                break
            all_rows.extend(rows)
            if len(rows) < 500:
                break
            offset += 500

    total = len(all_rows)
    print(f"Total jobs: {total}")

    fields = {
        "client_score (non-null)": sum(1 for r in all_rows if r.get("client_score") is not None),
        "client_country (non-null)": sum(1 for r in all_rows if r.get("client_country")),
        "client_name (non-null)": sum(1 for r in all_rows if r.get("client_name")),
        "category (non-null)": sum(1 for r in all_rows if r.get("category")),
        "payment_verified (true)": sum(1 for r in all_rows if r.get("payment_verified")),
        "client_payment_verified (true)": sum(1 for r in all_rows if r.get("client_payment_verified")),
        "proposals_count (non-null)": sum(1 for r in all_rows if r.get("proposals_count") is not None),
        "client_industry (non-null)": sum(1 for r in all_rows if r.get("client_industry")),
        "client_total_spend (non-null)": sum(1 for r in all_rows if r.get("client_total_spend") is not None),
        "total_invited (non-null)": sum(1 for r in all_rows if r.get("total_invited") is not None),
        "total_hired (non-null)": sum(1 for r in all_rows if r.get("total_hired") is not None),
    }

    print("\n=== FIELD COVERAGE ===")
    for field, count in sorted(fields.items(), key=lambda x: -x[1]):
        pct = count / total * 100
        print(f"  {field}: {count}/{total} ({pct:.0f}%)")

    # Sample a few jobs with good data
    print("\n=== SAMPLE JOB WITH FULL DATA ===")
    for r in all_rows:
        if r.get("client_score") and r.get("client_country") and r.get("category") and r.get("client_name"):
            print(json.dumps(r, indent=2, default=str))
            break

    # Count jobs with 0 client_score (new clients)
    zero_score = sum(1 for r in all_rows if r.get("client_score") == 0)
    null_score = sum(1 for r in all_rows if r.get("client_score") is None)
    print(f"\nJobs with score=0 (new clients): {zero_score}")
    print(f"Jobs with score=null (no data): {null_score}")
    print(f"Jobs with score>0 (established): {total - zero_score - null_score}")


if __name__ == "__main__":
    main()
