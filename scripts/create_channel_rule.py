import os, json
from urllib.request import Request, urlopen

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_SERVICE_KEY"]
user_id = "1266be7b-5c93-441d-a080-351777a5d0d1"

# Create email channel
data = json.dumps({
    "user_id": user_id,
    "name": "Email Alerts",
    "type": "email",
    "config": {"to": "usamaadeel1183@gmail.com"},
    "is_active": True,
}).encode()
req = Request(f"{url}/rest/v1/notification_channels", data=data, method="POST", headers={
    "apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json",
    "Prefer": "return=representation",
})
with urlopen(req, timeout=10) as r:
    ch = json.loads(r.read())[0]
    print(f"Created channel: {ch['id']} | {ch['name']}")

# Create rule (low thresholds for testing)
data = json.dumps({
    "user_id": user_id,
    "channel_id": ch["id"],
    "match_score_min": 50,
    "opportunity_score_min": 50,
    "max_proposals": 50,
    "is_active": True,
}).encode()
req = Request(f"{url}/rest/v1/notification_rules", data=data, method="POST", headers={
    "apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json",
    "Prefer": "return=representation",
})
with urlopen(req, timeout=10) as r:
    rule = json.loads(r.read())[0]
    print(f"Created rule: {rule['id']} | match>={rule['match_score_min']} opp>={rule['opportunity_score_min']}")

print("\nDone! Now test from frontend.")
