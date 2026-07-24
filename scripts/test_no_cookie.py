import json, urllib.request

# Test without enrichment
req = urllib.request.Request("http://localhost:8000/jobs/ingest?count=5&max_details=0")
resp = urllib.request.urlopen(req, timeout=60)
d = json.loads(resp.read())
print(f"Jobs: {len(d.get('jobs', []))}, Enriched: {d.get('enriched_count', 0)}")
for j in d.get("jobs", [])[:2]:
    print(f"  - {j.get('title', '')[:60]}")
