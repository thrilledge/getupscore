#!/usr/bin/env python3
import json, urllib.request

with open("/home/ubuntu/upwork-api/cookies/vw_cookies.json") as f:
    cookies = json.load(f)

cookie_str = "; ".join(f"{c['name']}={c['value']}" for c in cookies)
url = "https://tryvibeworker.com/api/jobs?sort=newest&page=1&limit=1"
req = urllib.request.Request(url, headers={
    "Accept": "application/json",
    "Cookie": cookie_str,
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://tryvibeworker.com/dashboard",
})
with urllib.request.urlopen(req, timeout=30) as resp:
    data = json.loads(resp.read().decode())
    job = data.get("jobs", [{}])[0]
    print(json.dumps(job, indent=2))
