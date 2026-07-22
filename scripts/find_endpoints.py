#!/usr/bin/env python3
import re
from curl_cffi import requests

session = requests.Session()
js_url = "https://www.upwork.com/static/assets/AccountSecurityNuxt/pages/login.e7a738f7.js"
resp = session.get(js_url, impersonate="safari17_0", timeout=30)
print(f"JS size: {len(resp.text)} bytes")

js = resp.text

# Find API endpoints
for m in re.findall(r'["\']([^"\']*(?:api|auth|login|submit|security|session|oauth|token)[^"\']*)["\']', js):
    if 5 < len(m) < 200:
        print(f"  {m}")

# Find fetch/post calls
for m in re.findall(r'(?:fetch|post|put|get)\s*\(\s*["\']([^"\']+)["\']', js):
    print(f"  FETCH: {m}")

# Find any URL construction
for m in re.findall(r'["\']([^"\']+/api/[^"\']*)["\']', js):
    print(f"  API: {m}")
