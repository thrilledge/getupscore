import json, time, sys
from curl_cffi import requests

API_URL = "https://www.upwork.com/api/graphql/v1"
UPWORK_URL = "https://www.upwork.com/"
HEADERS = {
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.upwork.com/nx/search/jobs/",
    "X-Upwork-Accept-Language": "en-US",
    "Content-Type": "application/json",
}

session = requests.Session()
resp = session.get(UPWORK_URL, impersonate="safari17_0", timeout=60)
token = resp.cookies.get("visitor_gql_token")
print(f"Token: {token[:20]}...", file=sys.stderr)

# Fetch one job to get a ciphertext
SEARCH_Q = """query VisitorJobSearch($requestVariables: VisitorJobSearchV1Request!) {
  search {
    universalSearchNuxt {
      visitorJobSearchV1(request: $requestVariables) {
        paging { total }
        results { id title jobTile { job { id cipherText } } }
      }
    }
  }
}"""
r = session.post(API_URL, json={
    "query": SEARCH_Q,
    "variables": {"requestVariables": {"sort": "recency", "paging": {"offset": 0, "count": 1}}}
}, headers={**HEADERS, "Authorization": f"Bearer {token}"}, impersonate="safari17_0", timeout=30)
cipher = r.json()["data"]["search"]["universalSearchNuxt"]["visitorJobSearchV1"]["results"][0]["jobTile"]["job"]["cipherText"]
print(f"Cipher: {cipher[:30]}...", file=sys.stderr)

# Minimal query to test what works
DETAILS_MINIMAL = """query VisitorJobDetails($jobCiphertext: String!) {
  jobPubDetails {
    opening(ciphertext: $jobCiphertext) {
      connectsRequired
      category { name }
      clientActivity { totalApplicants totalHired }
    }
  }
}"""

# Medium query adding buyer stats
DETAILS_MEDIUM = """query VisitorJobDetails($jobCiphertext: String!) {
  jobPubDetails {
    opening(ciphertext: $jobCiphertext) {
      connectsRequired
      category { name }
      clientActivity { totalApplicants totalHired }
    }
    buyer {
      location { city country }
    }
    buyerExtra { isPaymentMethodVerified }
  }
}"""

# Full query with stats
DETAILS_FULL = """query VisitorJobDetails($jobCiphertext: String!) {
  jobPubDetails {
    opening(ciphertext: $jobCiphertext) {
      connectsRequired
      category { name }
      clientActivity { totalApplicants totalHired }
    }
    buyer {
      location { city country }
      stats {
        totalAssignments activeAssignmentsCount hoursCount feedbackCount
        score totalJobsWithHires totalCharges { amount }
      }
      company { profile { industry size } }
    }
    buyerExtra { isPaymentMethodVerified }
  }
}"""

queries = [
    ("MINIMAL", DETAILS_MINIMAL),
    ("MEDIUM", DETAILS_MEDIUM),
    ("FULL", DETAILS_FULL),
]

for name, query in queries:
    time.sleep(1.5)
    url = f"{API_URL}?alias=visitor-details-{name.lower()}"
    resp2 = session.post(url, json={
        "query": query,
        "variables": {"jobCiphertext": cipher}
    }, headers={
        **HEADERS,
        "Referer": f"https://www.upwork.com/jobs/~{cipher}",
        "Authorization": f"Bearer {token}"
    }, impersonate="safari17_0", timeout=30)
    d = resp2.json()
    has_errors = "errors" in d
    print(f"\n{name}: status={resp2.status_code} errors={has_errors}")
    if has_errors:
        print(f"  Error: {json.dumps(d['errors'])[:400]}")
    else:
        details = d.get("data", {}).get("jobPubDetails", {})
        buyer = details.get("buyer", {})
        stats = buyer.get("stats", {}) if buyer else {}
        print(f"  score={stats.get('score')} country={buyer.get('location', {}).get('country') if buyer else None}")
        print(f"  hours={stats.get('hoursCount')} feedback={stats.get('feedbackCount')}")
        print(f"  spend={stats.get('totalCharges', {}).get('amount') if stats else None}")
