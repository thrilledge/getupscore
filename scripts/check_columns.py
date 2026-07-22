#!/usr/bin/env python3
import json
from urllib.request import Request, urlopen

ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZnF0ZW5mbXhkb3lqeHhuaG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1OTY0NzEsImV4cCI6MjA5NzE3MjQ3MX0.UYUDEQ_FACTDWeB7Fr3TzVxnnD9Rvkrh9Wr95al24BA"

url = "https://kjfqtenfmxdoyjxxnhnm.supabase.co/rest/v1/jobs?select=client_score,client_payment_verified,client_city,client_hours_count,client_feedback_count,client_company_size,client_total_jobs_with_hires,client_active_assignments,client_location_country&limit=1"
req = Request(url, headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"})
with urlopen(req, timeout=10) as r:
    data = json.loads(r.read())
    if data:
        print("Columns exist!")
        print(json.dumps(data[0], indent=2))
    else:
        print("No data returned, checking columns...")
