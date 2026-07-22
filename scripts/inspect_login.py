#!/usr/bin/env python3
"""
Inspect Upwork login page to find correct endpoints.
"""
from curl_cffi import requests

LOGIN_URL = "https://www.upwork.com/ab/account-security/login"

def main():
    session = requests.Session()
    print("Fetching login page...")
    resp = session.get(LOGIN_URL, impersonate="safari17_0", timeout=30)
    print(f"Status: {resp.status_code}, URL: {resp.url}")
    print(f"Cookies: {list(session.cookies.keys())}")
    
    html = resp.text
    with open("/tmp/upwork_login_page.html", "w") as f:
        f.write(html)
    print(f"HTML saved ({len(html)} bytes)")
    
    # Look for login-related endpoints
    import re
    for pattern in [r'action="([^"]*)"', r'fetch\(["\']([^"\']*)', r'api.*login', r'security.*submit']:
        matches = re.findall(pattern, html)
        if matches:
            print(f"\nPattern '{pattern}':")
            for m in matches[:5]:
                print(f"  {m[:200]}")

if __name__ == "__main__":
    main()
