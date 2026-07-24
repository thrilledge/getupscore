import json

with open("/home/ubuntu/upwork-api/uphunt_api_data.json") as f:
    d = json.load(f)

j = d["jobs_sample"]["jobs"][0]

print("=== JOB TILE ===")
print(json.dumps(j.get("jobTile", {}), indent=2)[:1500])
print()
print("=== ONTOLOGY SKILLS ===")
print(json.dumps(j.get("ontologySkills", [])[:5], indent=2))
print()
print("=== CLIENT INFO ===")
auth = j.get("authJobDetailsResponse", {}).get("data", {}).get("jobAuthDetails", {})
buyer = auth.get("buyer", {}).get("info", {})
stats = buyer.get("stats", {})
print("score:", stats.get("score"))
print("feedback:", stats.get("feedbackCount"))
print("hours:", stats.get("hoursCount"))
print("totalCharges:", stats.get("totalCharges"))
print("totalHires:", stats.get("totalJobsWithHires"))
print("totalAssignments:", stats.get("totalAssignments"))
print("activeAssignments:", stats.get("activeAssignmentsCount"))
print("country:", buyer.get("location", {}).get("country"))
print("city:", buyer.get("location", {}).get("city"))
print("payment_verified:", auth.get("buyer", {}).get("payment", {}))
print()
print("=== JOB DETAILS ===")
details = j.get("jobDetailsResponse", {}).get("data", {}).get("jobDetails", {})
print(json.dumps(details, indent=2)[:2000])
print()
print("=== DESCRIPTION (first 500) ===")
print(j.get("description", "")[:500])
