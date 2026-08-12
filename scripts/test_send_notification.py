import json
from urllib.request import Request, urlopen

CRON_SECRET = "0b34f5d0f122f313ad8668ddad9ebe8f"
USER_ID = "1266be7b-5c93-441d-a080-351777a5d0d1"
CHANNEL_ID = "5bf0cbe0-ae76-41ae-84d0-c4477b6fe860"

send_url = "https://www.getupscore.com//api/notifications/send"
body = json.dumps({"channelId": CHANNEL_ID, "user_id": USER_ID}).encode()
req = Request(send_url, data=body, method="POST", headers={
    "Content-Type": "application/json",
    "Authorization": f"Bearer {CRON_SECRET}",
})
try:
    with urlopen(req, timeout=30) as r:
        print(json.dumps(json.loads(r.read()), indent=2))
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, "read"):
        print(e.read().decode())
