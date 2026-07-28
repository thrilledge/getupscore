#!/usr/bin/env python3
"""
Grab Upwork cookies using curl_cffi (bypasses Cloudflare).
No browser needed. Just visits Upwork pages and saves cookies.
"""
import json
import sys
import time
from curl_cffi import requests

COOKIE_FILE = "/tmp/upwork_cookies.json"
DOCKER_COOKIE_FILE = "/home/ubuntu/upwork-api/upwork_cookies.json"
DOCKER_COOKIE_FILE2 = "/app/upwork_cookies.json"

EMAIL = "usama@thrilledge.com"
PASSWORD = "@Usama#Adeel183"


def grab_cookies():
    session = requests.Session()

    # Step 1: Visit homepage to get initial cookies
    print("Step 1: Visiting Upwork homepage...")
    resp = session.get("https://www.upwork.com/", impersonate="safari17_0", timeout=60)
    print(f"  Status: {resp.status_code}")

    all_cookies = dict(session.cookies)
    print(f"  Cookies after homepage: {len(all_cookies)}")
    for name in ["JobDetailsNuxt_vt", "visitor_gql_token"]:
        val = all_cookies.get(name)
        print(f"  {'✓' if val else '✗'} {name}: {(val or 'NOT FOUND')[:50]}")

    # Step 2: Visit jobs search page
    print("\nStep 2: Visiting jobs search page...")
    resp = session.get("https://www.upwork.com/nx/search/jobs/", impersonate="safari17_0", timeout=60)
    print(f"  Status: {resp.status_code}")
    all_cookies.update(dict(session.cookies))
    print(f"  Total cookies: {len(all_cookies)}")
    for name in ["JobDetailsNuxt_vt", "visitor_gql_token", "XSRF-TOKEN"]:
        val = all_cookies.get(name)
        print(f"  {'✓' if val else '✗'} {name}: {(val or 'NOT FOUND')[:50]}")

    # Step 3: Try login via GraphQL mutation with curl_cffi
    print("\nStep 3: Trying GraphQL login...")
    xsrf = all_cookies.get("XSRF-TOKEN", "")
    headers = {
        "Accept": "*/*",
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
        r = session.post(
            "https://www.upwork.com/api/graphql/v1",
            json=gql_payload,
            headers=headers,
            impersonate="safari17_0",
            timeout=30,
        )
        print(f"  Status: {r.status_code}")
        try:
            data = r.json()
            print(f"  Response: {json.dumps(data)[:500]}")
            if data.get("data", {}).get("loginWithPassword", {}).get("authToken"):
                print("  Login SUCCESS!")
        except:
            print(f"  Text: {r.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")

    # Re-check cookies after login attempt
    all_cookies.update(dict(session.cookies))
    print(f"\n  Total cookies after login: {len(all_cookies)}")
    for name in ["JobDetailsNuxt_vt", "visitor_gql_token", "XSRF-TOKEN", "oauth2_token_sg"]:
        val = all_cookies.get(name)
        print(f"  {'✓' if val else '✗'} {name}: {(val or 'NOT FOUND')[:50]}")

    # Step 4: Try a job detail request to test cookie
    print("\nStep 4: Testing job detail request...")
    test_url = "https://www.upwork.com/api/graphql/v1?alias=gql-query-get-visitor-job-details"
    token = all_cookies.get("visitor_gql_token", "")
    detail_headers = {
        "Accept": "*/*",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
        "Referer": "https://www.upwork.com/nx/search/jobs/",
    }
    # Just try one detail query
    gql_resp = session.post(
        test_url,
        json={
            "query": "query VisitorJobSearch($requestVariables: VisitorJobSearchV1Request!) { search { universalSearchNuxt { visitorJobSearchV1(request: $requestVariables) { paging { total } results { id title } } } } }",
            "variables": {"requestVariables": {"sort": "recency", "paging": {"offset": 0, "count": 1}}},
        },
        headers=detail_headers,
        impersonate="safari17_0",
        timeout=30,
    )
    print(f"  Test search status: {gql_resp.status_code}")

    # Step 5: Save
    if all_cookies:
        for path in [COOKIE_FILE, DOCKER_COOKIE_FILE, DOCKER_COOKIE_FILE2]:
            try:
                with open(path, "w") as f:
                    json.dump(all_cookies, f, indent=2)
                print(f"\nSaved to {path}")
            except Exception as e:
                print(f"Could not save to {path}: {e}")

    has_vt = bool(all_cookies.get("JobDetailsNuxt_vt"))
    has_gql = bool(all_cookies.get("visitor_gql_token"))
    print(f"\nJobDetailsNuxt_vt: {'FOUND' if has_vt else 'MISSING'}")
    print(f"visitor_gql_token: {'FOUND' if has_gql else 'MISSING'}")
    return has_vt or has_gql


if __name__ == "__main__":
    success = grab_cookies()
    print(f"\nResult: {'SUCCESS' if success else 'FAILED'}")
    sys.exit(0 if success else 1)
