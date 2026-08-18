import json
import os
from urllib.request import Request, urlopen

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

req = Request(
    f"{SUPABASE_URL}/rest/v1/notifications?order=sent_at.desc&limit=10",
    method="GET",
    headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
    },
)
with urlopen(req, timeout=15) as r:
    data = json.loads(r.read())
    print(f"Total recent notifications: {len(data)}")
    for n in data:
        status = n.get("status", "?")
        channel = n.get("channel", "?")
        sent = n.get("sent_at", "?")
        job_id = n.get("job_id", "?")[:8]
        print(f"  {status:6s} | {channel:12s} | {sent} | job:{job_id}")
