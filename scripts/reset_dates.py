import os, requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"), override=True)

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

r = requests.patch(
    f"{url}/rest/v1/jobs?posted_at=not.is.null",
    headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    },
    json={"posted_at": None},
)

print(f"Reset all posted_at to null. Status: {r.status_code}")
