import os, json
from urllib.request import Request, urlopen

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_SERVICE_KEY"]
user_id = "1266be7b-5c93-441d-a080-351777a5d0d1"

# Check channels
req = Request(f"{url}/rest/v1/notification_channels?user_id=eq.{user_id}&select=*", headers={"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"})
with urlopen(req, timeout=10) as r:
    channels = json.loads(r.read())
    print("CHANNELS:")
    for c in channels:
        print(f"  {c['id']} | {c['name']} | type={c['type']} | active={c['is_active']} | config={c['config']}")

# Check rules
req = Request(f"{url}/rest/v1/notification_rules?user_id=eq.{user_id}&select=*", headers={"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"})
with urlopen(req, timeout=10) as r:
    rules = json.loads(r.read())
    print("\nRULES:")
    for r in rules:
        print(f"  {r['id']} | channel_id={r['channel_id']} | match>={r['match_score_min']} | opp>={r['opportunity_score_min']} | active={r['is_active']}")
