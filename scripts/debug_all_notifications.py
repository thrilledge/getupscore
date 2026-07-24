import os, json
from urllib.request import Request, urlopen

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_SERVICE_KEY"]

# List all users via auth admin
req = Request(f"{url}/auth/v1/admin/users", headers={
    "apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"
})
try:
    with urlopen(req, timeout=10) as r:
        users = json.loads(r.read())
        for u in users.get("users", []):
            print(f"  {u['id']} | {u.get('email')}")
except Exception as e:
    print(f"Admin users error: {e}")

# Try listing all channels (no user filter)
print("\nAll channels:")
req = Request(f"{url}/rest/v1/notification_channels?select=*", headers={
    "apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"
})
with urlopen(req, timeout=10) as r:
    data = json.loads(r.read())
    print(f"  Count: {len(data)}")
    for c in data:
        print(f"  {c['id']} | user={c['user_id']} | {c['name']} | type={c['type']} | active={c['is_active']}")

# Try listing all rules
print("\nAll rules:")
req = Request(f"{url}/rest/v1/notification_rules?select=*", headers={
    "apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"
})
with urlopen(req, timeout=10) as r:
    data = json.loads(r.read())
    print(f"  Count: {len(data)}")
    for r2 in data:
        print(f"  {r2['id']} | user={r2['user_id']} | channel={r2['channel_id']} | active={r2['is_active']}")
