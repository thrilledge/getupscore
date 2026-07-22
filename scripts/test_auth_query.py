#!/usr/bin/env python3
import json
from curl_cffi import requests

COOKIE_FILE = "/app/upwork_cookies.json"
API_URL = "https://www.upwork.com/api/graphql/v1"

# Authenticated query shape — uses 'id' instead of 'ciphertext'
QUERIES = [
    # Attempt 1: jobPubDetails with id
    {
        "name": "jobPubDetails with id",
        "query": """
        query JobDetails($id: String!) {
            jobPubDetails(id: $id) {
                opening {
                    status postedOn description
                    info { ciphertext id type access title hideBudget createdOn premium }
                    sandsData {
                        ontologySkills { prefLabel relevance }
                        additionalSkills { prefLabel relevance }
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
        """,
    },
    # Attempt 2: Try 'job' top-level field
    {
        "name": "job field",
        "query": """
        query JobDetails($ciphertext: String!) {
            job(ciphertext: $ciphertext) {
                title description status postedOn
                budget { amount currencyCode }
                hourlyBudgetMin hourlyBudgetMax
                skills { name }
                client { name country score totalSpend totalHires paymentVerified }
            }
        }
        """,
    },
]

TEST_CIPHER = "022079820226200627543"  # without ~

def main():
    with open(COOKIE_FILE) as f:
        cookies = json.load(f)

    session = requests.Session()
    for k, v in cookies.items():
        session.cookies.set(k, v, domain=".upwork.com")

    token = cookies["JobDetailsNuxt_vt"]
    print(f"Token: {token[:40]}...")

    for q in QUERIES:
        print(f"\n=== {q['name']} ===")
        headers = {
            "Accept": "*/*",
            "Content-Type": "application/json",
            "Referer": f"https://www.upwork.com/jobs/~{TEST_CIPHER}",
            "X-Upwork-Accept-Language": "en-US",
            "Authorization": f"Bearer {token}",
        }

        # Try with ciphertext as the id value (with and without ~)
        for id_val in [f"~{TEST_CIPHER}", TEST_CIPHER, f"gql_{TEST_CIPHER}"]:
            payload = {
                "query": q["query"],
                "variables": {"id": id_val, "ciphertext": id_val},
            }
            r = session.post(API_URL, json=payload, headers=headers,
                           impersonate="safari17_0", timeout=30)
            try:
                data = r.json()
                if "errors" in data:
                    err_msg = json.dumps(data["errors"])[:200]
                    if "UnknownArgument" in err_msg or "MissingFieldArgument" in err_msg:
                        print(f"  id={id_val[:30]}: Schema mismatch - {err_msg[:100]}")
                        break  # Don't try more id formats for this query
                    elif "not have enough" in err_msg:
                        print(f"  id={id_val[:30]}: Permission error")
                    else:
                        print(f"  id={id_val[:30]}: {err_msg[:150]}")
                else:
                    details = data.get("data", {})
                    if details:
                        print(f"  id={id_val[:30]}: DATA FOUND!")
                        print(f"  {json.dumps(details, indent=2)[:500]}")
                        return
                    else:
                        print(f"  id={id_val[:30]}: Empty data")
            except Exception as e:
                print(f"  id={id_val[:30]}: Error: {e}")

if __name__ == "__main__":
    main()
