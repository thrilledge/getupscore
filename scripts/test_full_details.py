#!/usr/bin/env python3
import json
from curl_cffi import requests

COOKIE_FILE = "/app/upwork_cookies.json"
API_URL = "https://www.upwork.com/api/graphql/v1"

# Query with ID! type
QUERY = """
query JobDetails($id: ID!) {
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
"""

TEST_CIPHER = "022079820226200627543"

def main():
    with open(COOKIE_FILE) as f:
        cookies = json.load(f)

    session = requests.Session()
    for k, v in cookies.items():
        session.cookies.set(k, v, domain=".upwork.com")

    token = cookies["JobDetailsNuxt_vt"]

    headers = {
        "Accept": "*/*",
        "Content-Type": "application/json",
        "Referer": f"https://www.upwork.com/jobs/~{TEST_CIPHER}",
        "X-Upwork-Accept-Language": "en-US",
        "Authorization": f"Bearer {token}",
    }

    for id_val in [f"~{TEST_CIPHER}", TEST_CIPHER]:
        print(f"\nTrying id={id_val}...")
        payload = {
            "query": QUERY,
            "variables": {"id": id_val},
        }
        r = session.post(API_URL, json=payload, headers=headers,
                       impersonate="safari17_0", timeout=30)
        data = r.json()
        if "errors" in data:
            print(f"  Errors: {json.dumps(data['errors'])[:300]}")
        else:
            details = data.get("data", {}).get("jobPubDetails", {})
            opening = details.get("opening") or {}
            info = opening.get("info") or {}
            buyer = details.get("buyer") or {}
            stats = buyer.get("stats") or {}
            location = buyer.get("location") or {}
            activity = opening.get("clientActivity") or {}
            company = (buyer.get("company") or {}).get("profile") or {}
            ext_budget = opening.get("extendedBudgetInfo") or {}
            dur = opening.get("engagementDuration") or {}
            budget = opening.get("budget") or {}
            buyer_extra = details.get("buyerExtra") or {}

            print(f"\n=== SUCCESS! FULL JOB DETAILS ===")
            print(f"Title: {info.get('title')}")
            print(f"Status: {opening.get('status')}")
            print(f"Posted: {opening.get('postedOn')}")
            print(f"Budget: {budget.get('amount')} {budget.get('currencyCode')}")
            print(f"Hourly: ${ext_budget.get('hourlyBudgetMin')}-${ext_budget.get('hourlyBudgetMax')}")
            print(f"Duration: {dur.get('label')} ({dur.get('weeks')} weeks)")
            print(f"Applicants: {activity.get('totalApplicants')}")
            print(f"Hired: {activity.get('totalHired')}")
            print(f"Interviews: {activity.get('totalInvitedToInterview')}")
            print(f"\nClient Location: {location.get('city')}, {location.get('country')}")
            print(f"Client Score: {stats.get('score')}")
            print(f"Total Spent: {stats.get('totalCharges', {}).get('amount')}")
            print(f"Assignments: {stats.get('totalAssignments')}")
            print(f"Total Hires: {stats.get('totalJobsWithHires')}")
            print(f"Hours: {stats.get('hoursCount')}")
            print(f"Reviews: {stats.get('feedbackCount')}")
            print(f"Payment Verified: {buyer_extra.get('isPaymentMethodVerified')}")
            print(f"Industry: {company.get('industry')}")
            print(f"Company Size: {company.get('size')}")

            skills = []
            for s in (opening.get("sandsData") or {}).get("ontologySkills") or []:
                if s.get("prefLabel"):
                    skills.append(s["prefLabel"])
            for s in (opening.get("sandsData") or {}).get("additionalSkills") or []:
                if s.get("prefLabel"):
                    skills.append(s["prefLabel"])
            print(f"Skills: {', '.join(skills)}")
            print(f"\nDescription: {(opening.get('description') or '')[:300]}...")
            return

if __name__ == "__main__":
    main()
