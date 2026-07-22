import json
import ssl
from urllib.request import Request, urlopen

SUPABASE_URL = "https://kjfqtenfmxdoyjxxnhnm.supabase.co"
SERVICE_KEY = "sb_secret_dI5gwLE0HaNKXRXWQlgcJg_IRwEZmKU"
ctx = ssl.create_default_context()

sql = "DELETE FROM jobs WHERE client_score IS NULL"
url = f"{SUPABASE_URL}/rest/v1/rpc"
req = Request(url, method="POST", headers={
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
})
# Supabase doesn't have direct SQL endpoint via REST
# Let's use the management API approach via psql
# Actually, let's try batch delete with smaller batches using in filter

def delete_batch(ids):
    id_list = ",".join(ids)
    url = f"{SUPABASE_URL}/rest/v1/jobs?id=in.({id_list})"
    req = Request(url, method="DELETE", headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Prefer": "return=minimal",
    })
    with urlopen(req, timeout=60, context=ctx) as resp:
        pass

def get_ids(offset, limit=200):
    url = f"{SUPABASE_URL}/rest/v1/jobs?client_score=is.null&select=id&limit={limit}&offset={offset}"
    req = Request(url, headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Accept": "application/json",
    })
    with urlopen(req, timeout=30, context=ctx) as resp:
        return json.loads(resp.read())

total = 0
offset = 0
while True:
    rows = get_ids(offset)
    if not rows:
        break
    ids = [r["id"] for r in rows]
    try:
        delete_batch(ids)
        total += len(ids)
        print(f"Deleted batch: {len(ids)} (total: {total})")
    except Exception as e:
        print(f"Error at offset {offset}: {e}")
        # Try smaller batch
        half = len(ids) // 2
        if half > 0:
            try:
                delete_batch(ids[:half])
                total += half
                print(f"  Recovered first half: {half}")
            except Exception as e2:
                print(f"  Still failed: {e2}")
    offset += 200

print(f"Done. Total deleted: {total}")
