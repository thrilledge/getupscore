import json
import os
from urllib.request import Request, urlopen

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Check rules
req = Request(
    f"{SUPABASE_URL}/rest/v1/notification_rules?select=*",
    method="GET",
    headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
    },
)
with urlopen(req, timeout=15) as r:
    rules = json.loads(r.read())
    print("=== NOTIFICATION RULES ===")
    for rule in rules:
        print(json.dumps(rule, indent=2, default=str))

# Check recent analyses to see scores
req2 = Request(
    f"{SUPABASE_URL}/rest/v1/job_analyses?select=job_id,match_score,opportunity_score,recommendation&order=created_at.desc&limit=5",
    method="GET",
    headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
    },
)
with urlopen(req2, timeout=15) as r2:
    analyses = json.loads(r2.read())
    print("\n=== RECENT ANALYSES ===")
    for a in analyses:
        print(f"  match={a.get('match_score')} opp={a.get('opportunity_score')} rec={a.get('recommendation')}")
