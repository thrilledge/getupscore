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

DETAILS_QUERY = """query VisitorJobDetails($jobCiphertext: String!) {
  jobPubDetails {
    opening(ciphertext: $jobCiphertext) {
      status postedOn description
      info { ciphertext id type access title hideBudget createdOn premium }
      sandsData { occupation { uid prefLabel } ontologySkills { uid prefLabel relevance } additionalSkills { uid prefLabel relevance } }
      category { name urlSlug }
      budget { amount currencyCode }
      engagementDuration { label weeks }
      extendedBudgetInfo { hourlyBudgetMin hourlyBudgetMax hourlyBudgetType }
      connectsRequired connects
      clientActivity { totalApplicants totalHired totalInvitedToInterview numberOfPositionsToHire }
    }
    buyer {
      location { city country }
      stats { totalAssignments activeAssignmentsCount hoursCount feedbackCount score totalJobsWithHires totalCharges { amount } }
      company { profile { industry size } }
    }
    buyerExtra { isPaymentMethodVerified }
  }
}"""

session = requests.Session()
resp = session.get(UPWORK_URL, impersonate="safari17_0", timeout=60)
token = resp.cookies.get("visitor_gql_token")
print(f"Token: {token[:30]}...", file=sys.stderr)

# Get cipher from search
SEARCH_Q = """query VisitorJobSearch($requestVariables: VisitorJobSearchV1Request!) {
  search { universalSearchNuxt { visitorJobSearchV1(request: $requestVariables) {
    paging { total }
    results { id title jobTile { job { id cipherText } } }
  } } }
}"""
r = session.post(API_URL, json={
    "query": SEARCH_Q,
    "variables": {"requestVariables": {"sort": "recency", "paging": {"offset": 0, "count": 1}}}
}, headers={**HEADERS, "Authorization": f"Bearer {token}"}, impersonate="safari17_0", timeout=30)
cipher = r.json()["data"]["search"]["universalSearchNuxt"]["visitorJobSearchV1"]["results"][0]["jobTile"]["job"]["cipherText"]
print(f"Cipher: {cipher}", file=sys.stderr)

time.sleep(2)

# Test with the EXACT same approach as the working fetch_job_details()
url = f"{API_URL}?alias=gql-query-get-visitor-job-details"
details_headers = {
    **HEADERS,
    "Referer": f"https://www.upwork.com/jobs/~{cipher}",
    "Authorization": f"Bearer {token}",
}
payload = {
    "query": DETAILS_QUERY,
    "variables": {"jobCiphertext": cipher},
}

resp2 = session.post(url, json=payload, headers=details_headers, impersonate="safari17_0", timeout=30)
d = resp2.json()
has_errors = "errors" in d
print(f"Status: {resp2.status_code}, Errors: {has_errors}")
if has_errors:
    print(f"Error: {json.dumps(d['errors'])[:500]}")
else:
    details = d.get("data", {}).get("jobPubDetails", {})
    buyer = details.get("buyer", {})
    stats = buyer.get("stats", {}) if buyer else {}
    print(f"Score: {stats.get('score')}")
    print(f"Hours: {stats.get('hoursCount')}")
    print(f"Country: {buyer.get('location', {}).get('country') if buyer else None}")
    print(f"Spend: {stats.get('totalCharges', {}).get('amount') if stats else None}")
    print(f"Payment verified: {d.get('data', {}).get('jobPubDetails', {}).get('buyerExtra', {}).get('isPaymentMethodVerified')}")
