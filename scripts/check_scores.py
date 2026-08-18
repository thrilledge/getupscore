import json
import os
from urllib.request import Request, urlopen

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
USER_ID = "1266be7b-5c93-441d-a080-351777a5d0d1"

url = f"{SUPABASE_URL}/rest/v1/job_analyses?select=match_score,opportunity_score,recommendation&user_id=eq.{USER_ID}&order=created_at.desc&limit=20"
req = Request(url, headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"})
with urlopen(req, timeout=15) as r:
    data = json.loads(r.read())
    print(f"Analyses for user: {len(data)}")
    eligible = 0
    for a in data:
        m = a.get("match_score", 0)
        o = a.get("opportunity_score", 0)
        flag = ""
        if m >= 50 or o >= 50:
            flag = " <-- ELIGIBLE"
            eligible += 1
        print(f"  match={m:3d}  opp={o:3d}  rec={a.get('recommendation','?'):12s}{flag}")
    print(f"\nEligible (match>=50 or opp>=50): {eligible}/{len(data)}")
