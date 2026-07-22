#!/usr/bin/env python3
"""
Login to Upwork via curl_cffi by replicating browser behavior.
"""
import json
import re
from curl_cffi import requests

EMAIL = "usama@thrilledge.com"
PASSWORD = "@Usama#Adeel183"
COOKIE_FILE = "/home/ubuntu/upwork-api/upwork_cookies.json"

def main():
    session = requests.Session()
    
    # Step 1: Visit login page
    print("Step 1: Loading login page...")
    resp = session.get("https://www.upwork.com/ab/account-security/login", impersonate="safari17_0", timeout=30)
    print(f"  Status: {resp.status_code}")
    
    xsrf = session.cookies.get("XSRF-TOKEN", "")
    print(f"  XSRF: {xsrf[:30]}...")
    
    # Step 2: Submit login via /api/v2/auth/login
    print("\nStep 2: Trying /api/v2/auth/login...")
    headers = {
        "Content-Type": "application/json",
        "Referer": "https://www.upwork.com/ab/account-security/login",
        "X-XSRF-TOKEN": xsrf,
    }
    payload = {"username": EMAIL, "password": PASSWORD}
    
    for endpoint in [
        "/api/v2/auth/login",
        "/ab/account-security/api/login",
        "/ab/account-security/nx-api/login",
    ]:
        url = f"https://www.upwork.com{endpoint}"
        print(f"\n  Trying: {url}")
        try:
            r = session.post(url, json=payload, headers=headers, impersonate="safari17_0", timeout=15)
            print(f"    Status: {r.status_code}")
            text = r.text[:500]
            try:
                data = r.json()
                print(f"    JSON: {json.dumps(data, indent=2)[:500]}")
            except:
                print(f"    Text: {text[:300]}")
        except Exception as e:
            print(f"    Error: {e}")

    # Step 3: Try GraphQL login mutation
    print("\nStep 3: Trying GraphQL login...")
    gql_headers = {
        "Content-Type": "application/json",
        "Referer": "https://www.upwork.com/ab/account-security/login",
        "X-XSRF-TOKEN": xsrf,
    }
    gql_payload = {
        "query": """
        mutation LoginWithPassword($input: LoginWithPasswordInput!) {
            loginWithPassword(input: $input) {
                authToken
                user { uid nid loginName }
            }
        }
        """,
        "variables": {
            "input": {
                "loginName": EMAIL,
                "password": PASSWORD,
            }
        }
    }
    try:
        r = session.post("https://www.upwork.com/api/graphql/v1", json=gql_payload, headers=gql_headers, impersonate="safari17_0", timeout=15)
        print(f"  Status: {r.status_code}")
        try:
            data = r.json()
            print(f"  JSON: {json.dumps(data, indent=2)[:500]}")
        except:
            print(f"  Text: {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")

    # Save cookies regardless
    all_cookies = dict(session.cookies)
    with open(COOKIE_FILE, "w") as f:
        json.dump(all_cookies, f, indent=2)
    print(f"\nCookies saved ({len(all_cookies)}): {list(all_cookies.keys())}")

if __name__ == "__main__":
    main()
