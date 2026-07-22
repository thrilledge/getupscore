#!/usr/bin/env python3
import re
from curl_cffi import requests

session = requests.Session()
js_url = "https://www.upwork.com/static/assets/AccountSecurityNuxt/pages/login.e7a738f7.js"
resp = session.get(js_url, impersonate="safari17_0", timeout=30)
js = resp.text

# Find /api/ endpoints more broadly
for m in re.findall(r'["\'](/[^"\']*(?:api|auth|login|submit|v[0-9])[^"\']*)["\']', js):
    if 5 < len(m) < 200:
        print(f"  {m}")

# Find URLs with auth.upwork.com
for m in re.findall(r'["\']([^"\']*auth\.upwork\.com[^"\']*)["\']', js):
    print(f"  AUTH: {m}")

# Find fetch/axios patterns
for m in re.findall(r'(?:\.post|\.put|\.patch|fetch)\s*\(\s*([^,)]{5,100})', js):
    if 'api' in m.lower() or 'auth' in m.lower() or 'login' in m.lower() or '/' in m:
        print(f"  REQ: {m[:100]}")
