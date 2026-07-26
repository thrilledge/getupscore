import os, requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"), override=True)

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Get jobs where posted_at > created_at (wrong)
offset = 0
total = 0
while True:
    r = requests.get(
        f"{url}/rest/v1/jobs?select=id,posted_at,created_at&posted_at=not.is.null&limit=100&offset={offset}&order=created_at.desc",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    batch = r.json()
    if not isinstance(batch, list) or not batch:
        break

    fix_ids = []
    for j in batch:
        pa = j.get("posted_at")
        ca = j.get("created_at")
        if pa and ca:
            try:
                pa_dt = datetime.fromisoformat(pa.replace("Z", "+00:00"))
                ca_dt = datetime.fromisoformat(ca.replace("Z", "+00:00"))
                if pa_dt > ca_dt:
                    fix_ids.append((j["id"], ca))
            except:
                fix_ids.append((j["id"], ca))

    if fix_ids:
        by_ca = {}
        for jid, ca in fix_ids:
            by_ca.setdefault(ca, []).append(jid)
        for ca, jids in by_ca.items():
            ids_str = ",".join(jids)
            requests.patch(
                f"{url}/rest/v1/jobs?id=in.({ids_str})",
                headers={
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                json={"posted_at": ca},
            )
            total += len(jids)

    offset += len(batch)
    if len(batch) < 100:
        break

print(f"Fixed {total} jobs with future posted_at")
