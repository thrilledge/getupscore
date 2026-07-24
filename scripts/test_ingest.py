import json, urllib.request
r = urllib.request.urlopen("http://localhost:8000/jobs/ingest?count=3&max_details=3", timeout=120)
d = json.loads(r.read())
j = d["jobs"][0]
print("enriched:", d.get("enriched_count"))
for k in ["client_score","client_payment_verified","client_total_spend","client_feedback_count","client_location_country","proposals_count","client_hours_count"]:
    print(f"  {k}: {j.get(k)}")
print()
print("Job 1 title:", j.get("title"))
print("Has client data:", any(j.get(k) for k in ["client_score","client_total_spend","client_payment_verified"]))
