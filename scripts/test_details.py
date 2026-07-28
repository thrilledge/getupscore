#!/usr/bin/env python3
import json
import sys
sys.path.insert(0, "/app")
from upwork_scraper import fetch_job_details

result = fetch_job_details("~022082039309674862583")
print(json.dumps(result, indent=2, default=str)[:2000])
