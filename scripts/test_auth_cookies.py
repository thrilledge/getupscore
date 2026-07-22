#!/usr/bin/env python3
"""
Test authenticated GraphQL queries with saved cookies.
"""
import json
from curl_cffi import requests

COOKIE_FILE = "/app/upwork_cookies.json"
API_URL = "https://www.upwork.com/api/graphql/v1"

# Try to get a job's full details using authenticated cookies
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

def main():
    with open(COOKIE_FILE) as f:
        cookies = json.load(f)
    
    session = requests.Session()
    for k, v in cookies.items():
        session.cookies.set(k, v, domain=".upwork.com")
    
    # First get visitor_gql_token
    print("Getting visitor token...")
    resp = session.get("https://www.upwork.com/", impersonate="safari17_0", timeout=30)
    visitor_token = session.cookies.get("visitor_gql_token", "")
    print(f"  visitor_gql_token: {visitor_token[:50]}..." if visitor_token else "  No visitor_gql_token")
    
    # Test 1: Search jobs with auth cookies
    print("\n--- Test 1: Job Search ---")
    search_query = """
    query VisitorJobSearch($requestVariables: VisitorJobSearchV1Request!) {
        search {
            universalSearchNuxt {
                visitorJobSearchV1(request: $requestVariables) {
                    paging { total offset count }
                    results {
                        id title description
                        ontologySkills { uid prefLabel }
                        jobTile {
                            job {
                                id cipherText jobType hourlyBudgetMax hourlyBudgetMin
                                contractorTier publishTime
                            }
                        }
                    }
                }
            }
        }
    }
    """
    payload = {
        "query": search_query,
        "variables": {"requestVariables": {"sort": "recency", "paging": {"offset": 0, "count": 2}}},
    }
    
    headers = {
        "Accept": "*/*",
        "Content-Type": "application/json",
        "Referer": "https://www.upwork.com/nx/search/jobs/",
        "X-Upwork-Accept-Language": "en-US",
        "Authorization": f"Bearer {visitor_token}" if visitor_token else "",
    }
    
    r = session.post(API_URL, json=payload, headers=headers, impersonate="safari17_0", timeout=30)
    print(f"  Status: {r.status_code}")
    try:
        data = r.json()
        if "errors" in data:
            print(f"  Errors: {json.dumps(data['errors'], indent=2)[:500]}")
        else:
            results = data.get("data", {}).get("search", {}).get("universalSearchNuxt", {}).get("visitorJobSearchV1", {})
            total = results.get("paging", {}).get("total", 0)
            jobs = results.get("results", [])
            print(f"  Total: {total}, Got: {len(jobs)} jobs")
            for j in jobs[:2]:
                title = j.get("title", "")
                cipher = (j.get("jobTile") or {}).get("job", {}).get("cipherText", "")
                print(f"    - {title[:60]}... cipher={cipher[:20]}")
    except Exception as e:
        print(f"  Error: {e}")
        print(f"  Text: {r.text[:300]}")

    # Test 2: Get full job details for first job
    if jobs:
        cipher = (jobs[0].get("jobTile") or {}).get("job", {}).get("cipherText", "")
        if cipher:
            print(f"\n--- Test 2: Job Details for {cipher[:30]} ---")
            detail_payload = {
                "query": DETAILS_QUERY,
                "variables": {"jobCiphertext": cipher},
            }
            detail_headers = {
                **headers,
                "Referer": f"https://www.upwork.com/jobs/~{cipher}",
                "Authorization": f"Bearer {visitor_token}" if visitor_token else "",
            }
            r2 = session.post(f"{API_URL}?alias=gql-query-get-visitor-job-details", json=detail_payload, headers=detail_headers, impersonate="safari17_0", timeout=30)
            print(f"  Status: {r2.status_code}")
            try:
                d2 = r2.json()
                if "errors" in d2:
                    print(f"  Errors: {json.dumps(d2['errors'], indent=2)[:500]}")
                else:
                    details = d2.get("data", {}).get("jobPubDetails", {})
                    opening = details.get("opening") or {}
                    buyer = details.get("buyer") or {}
                    stats = (buyer.get("stats") or {})
                    print(f"  Title: {opening.get('info', {}).get('title', 'N/A')[:60]}")
                    print(f"  Client score: {stats.get('score')}")
                    print(f"  Total charges: {stats.get('totalCharges', {}).get('amount')}")
                    print(f"  Payment verified: {details.get('buyerExtra', {}).get('isPaymentMethodVerified')}")
                    print(f"  Applicants: {(details.get('opening', {}) or {}).get('clientActivity', {}).get('totalApplicants')}")
            except Exception as e:
                print(f"  Error: {e}")

if __name__ == "__main__":
    main()
