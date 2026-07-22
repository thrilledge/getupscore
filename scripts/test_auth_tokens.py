#!/usr/bin/env python3
import json
from curl_cffi import requests

COOKIE_FILE = "/app/upwork_cookies.json"
API_URL = "https://www.upwork.com/api/graphql/v1"

DETAILS_QUERY = """
query VisitorJobDetails($jobCiphertext: String!) {
    jobPubDetails {
        opening(ciphertext: $jobCiphertext) {
            status postedOn description
            info { ciphertext id type access title hideBudget createdOn premium }
            sandsData {
                occupation { uid prefLabel }
                ontologySkills { uid prefLabel relevance }
                additionalSkills { uid prefLabel relevance }
            }
            category { name urlSlug }
            budget { amount currencyCode }
            engagementDuration { label weeks }
            extendedBudgetInfo { hourlyBudgetMin hourlyBudgetMax hourlyBudgetType }
            clientActivity { totalApplicants totalHired totalInvitedToInterview numberOfPositionsToHire }
        }
        buyer {
            location { city country }
            stats { totalAssignments activeAssignmentsCount hoursCount feedbackCount score totalJobsWithHires totalCharges { amount } }
            company { profile { industry size } }
        }
        buyerExtra { isPaymentMethodVerified }
    }
}
"""

TEST_CIPHER = "~022079820226200627543"

def main():
    with open(COOKIE_FILE) as f:
        cookies = json.load(f)

    # Tokens to try as Authorization bearer
    tokens_to_try = {
        "oauth2_global_js_token": cookies.get("oauth2_global_js_token"),
        "visitor_signup_gql_token": cookies.get("visitor_signup_gql_token"),
        "JobDetailsNuxt_vt": cookies.get("JobDetailsNuxt_vt"),
    }

    for name, token in tokens_to_try.items():
        if not token:
            continue
        print(f"\n=== Trying token: {name} ===")
        print(f"  Token: {token[:50]}...")

        session = requests.Session()
        for k, v in cookies.items():
            session.cookies.set(k, v, domain=".upwork.com")

        headers = {
            "Accept": "*/*",
            "Content-Type": "application/json",
            "Referer": f"https://www.upwork.com/jobs/{TEST_CIPHER}",
            "X-Upwork-Accept-Language": "en-US",
            "Authorization": f"Bearer {token}",
        }

        payload = {
            "query": DETAILS_QUERY,
            "variables": {"jobCiphertext": TEST_CIPHER},
        }

        r = session.post(f"{API_URL}?alias=gql-query-get-visitor-job-details",
                        json=payload, headers=headers, impersonate="safari17_0", timeout=30)
        print(f"  Status: {r.status_code}")
        try:
            data = r.json()
            if "errors" in data:
                print(f"  Errors: {json.dumps(data['errors'])[:300]}")
            else:
                details = data.get("data", {}).get("jobPubDetails", {})
                opening = details.get("opening") or {}
                buyer = details.get("buyer") or {}
                stats = buyer.get("stats") or {}
                print(f"  SUCCESS!")
                print(f"  Title: {opening.get('info', {}).get('title', 'N/A')[:60]}")
                print(f"  Client score: {stats.get('score')}")
                print(f"  Total charges: {stats.get('totalCharges', {}).get('amount')}")
                print(f"  Payment verified: {details.get('buyerExtra', {}).get('isPaymentMethodVerified')}")
                print(f"  Applicants: {opening.get('clientActivity', {}).get('totalApplicants')}")
                print(f"  Category: {opening.get('category', {}).get('name')}")
                return
        except Exception as e:
            print(f"  Error: {e}")

    print("\n=== Trying cookie-based auth (no bearer) ===")
    session = requests.Session()
    for k, v in cookies.items():
        session.cookies.set(k, v, domain=".upwork.com")

    # Get visitor token from homepage
    resp = session.get("https://www.upwork.com/", impersonate="safari17_0", timeout=30)
    visitor = session.cookies.get("visitor_gql_token", "")

    headers = {
        "Accept": "*/*",
        "Content-Type": "application/json",
        "Referer": f"https://www.upwork.com/jobs/{TEST_CIPHER}",
        "X-Upwork-Accept-Language": "en-US",
        "Authorization": f"Bearer {visitor}",
        "Cookie": "; ".join(f"{k}={v}" for k, v in cookies.items()),
    }

    payload = {
        "query": DETAILS_QUERY,
        "variables": {"jobCiphertext": TEST_CIPHER},
    }

    r = session.post(f"{API_URL}?alias=gql-query-get-visitor-job-details",
                    json=payload, headers=headers, impersonate="safari17_0", timeout=30)
    print(f"  Status: {r.status_code}")
    try:
        data = r.json()
        if "errors" in data:
            print(f"  Errors: {json.dumps(data['errors'])[:300]}")
        else:
            print(f"  SUCCESS with cookie auth!")
    except:
        print(f"  Text: {r.text[:200]}")

if __name__ == "__main__":
    main()
