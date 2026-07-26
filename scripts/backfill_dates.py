import os, requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"), override=True)

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

offset = 0
total = 0
while True:
    r = requests.get(
        f"{url}/rest/v1/jobs?select=id,created_at&posted_at=is.null&limit=100&offset={offset}",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    batch = r.json()
    if not isinstance(batch, list) or not batch:
        break

    by_ca = {}
    for j in batch:
        ca = j.get("created_at")
        if ca:
            by_ca.setdefault(ca, []).append(j["id"])

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

print(f"Backfilled {total} jobs")
