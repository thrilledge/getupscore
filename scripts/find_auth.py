#!/usr/bin/env python3
import re, json
html = open("/tmp/upwork_login_page.html").read()

# Find API/auth endpoints
urls = re.findall(r'https?://[^\s"\'<>]+(?:login|auth|security|session|oauth|token)[^\s"\'<>]*', html)
for u in set(urls):
    print(f"URL: {u[:200]}")

# Find form actions
forms = re.findall(r'action="([^"]*)"', html)
for f in forms:
    print(f"Form action: {f}")

# Find __NUXT__ data
nuxt_match = re.search(r'window\.__NUXT__\s*=\s*(\{.*?\});?\s*</script>', html, re.DOTALL)
if nuxt_match:
    try:
        data = json.loads(nuxt_match.group(1))
        print(f"\n__NUXT__ keys: {list(data.keys())[:20]}")
    except:
        print("\n__NUXT__ present but couldn't parse")

# Find any script src or config with auth
for m in re.findall(r'["\']([^"\']*(?:api|auth|login)[^"\']*)["\']', html):
    if len(m) < 200 and 'http' in m.lower() or m.startswith('/'):
        print(f"Found: {m[:200]}")
