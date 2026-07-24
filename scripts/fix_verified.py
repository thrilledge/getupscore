import os, sys, requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"), override=True)

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://kjfqtenfmxdoyjxxnhnm.supabase.co")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"URL: {url}")
print(f"Key present: {bool(key)}, len: {len(key) if key else 0}")

resp = requests.patch(
    f"{url}/rest/v1/notification_channels?user_id=eq.1266be7b-5c93-441d-a080-351777a5d0d1",
    headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    },
    json={"is_verified": True},
)

print(f"Status: {resp.status_code}")
print(resp.text[:500])
