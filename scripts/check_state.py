import os, requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"), override=True)

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
now = datetime.now(timezone.utc)

r = requests.get(
    f"{url}/rest/v1/jobs?select=posted_at,created_at,title&order=created_at.desc&limit=5",
    headers={"apikey": key, "Authorization": f"Bearer {key}"},
)

print(f"Your UTC: {now.isoformat()}\n")
for j in r.json():
    pa = j.get("posted_at")
    ca = j.get("created_at")
    title = (j.get("title") or "")[:40]
    if pa:
        pa_dt = datetime.fromisoformat(pa.replace("Z", "+00:00"))
        diff_min = (pa_dt - now).total_seconds() / 60
        print(f"posted={pa}  diff={diff_min:.0f}m  title={title}")
    else:
        if ca:
            ca_dt = datetime.fromisoformat(ca.replace("Z", "+00:00"))
            diff_min = (ca_dt - now).total_seconds() / 60
            print(f"posted=None  created={ca}  diff={diff_min:.0f}m  title={title}")
