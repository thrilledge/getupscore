#!/usr/bin/env python3
"""Test fetching job details from Upwork GraphQL."""
import sys, json
sys.path.insert(0, "/app")  # Docker path
from upwork_scraper import fetch_job_details, fetch_jobs

# First fetch some jobs to get an ID
result = fetch_jobs(count=1, offset=0)
if not result["success"]:
    print(f"Search failed: {result.get('error')}")
    sys.exit(1)

job_id = result["jobs"][0]["upwork_job_id"]
print(f"Testing details for: {job_id} - {result['jobs'][0]['title']}")

details = fetch_job_details(job_id)
print(json.dumps(details, indent=2, ensure_ascii=False))
