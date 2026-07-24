#!/usr/bin/env python3
"""
Upwork Job Scraper — uses curl_cffi to bypass Cloudflare and Upwork's GraphQL API.
"""
import json
import re
import sys
import time
import argparse
from curl_cffi import requests

UPWORK_URL = "https://www.upwork.com/"
API_URL = "https://www.upwork.com/api/graphql/v1"

SEARCH_QUERY = """
query VisitorJobSearch($requestVariables: VisitorJobSearchV1Request!) {
    search {
        universalSearchNuxt {
            visitorJobSearchV1(request: $requestVariables) {
                paging { total offset count }
                results {
                    id
                    title
                    description
                    ontologySkills { uid prefLabel }
                    jobTile {
                        job {
                            id
                            cipherText
                            jobType
                            hourlyBudgetMax
                            hourlyBudgetMin
                            hourlyEngagementType
                            contractorTier
                            publishTime
                            createTime
                            weeklyRetainerBudget
                            hourlyEngagementDuration { label weeks }
                            fixedPriceAmount { amount isoCurrencyCode }
                            fixedPriceEngagementDuration { label weeks }
                        }
                    }
                }
            }
        }
    }
}
"""

DETAILS_QUERY = """
query VisitorJobDetails($jobCiphertext: String!) {
    jobPubDetails {
        opening(ciphertext: $jobCiphertext) {
            status
            postedOn
            description
            info { ciphertext id type access title hideBudget createdOn premium }
            sandsData {
                occupation { uid prefLabel }
                ontologySkills { uid prefLabel relevance }
                additionalSkills { uid prefLabel relevance }
            }
            category { name urlSlug }
            budget { amount currencyCode }
            engagementDuration { label weeks }
            extendedBudgetInfo {
                hourlyBudgetMin
                hourlyBudgetMax
                hourlyBudgetType
            }
            connectsRequired
            connects
            clientActivity {
                totalApplicants
                totalHired
                totalInvitedToInterview
                numberOfPositionsToHire
            }
        }
        buyer {
            location { city country }
            stats {
                totalAssignments
                activeAssignmentsCount
                hoursCount
                feedbackCount
                score
                totalJobsWithHires
                totalCharges { amount }
            }
            company { profile { industry size } }
        }
        buyerExtra { isPaymentMethodVerified }
    }
}
"""

HEADERS = {
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.upwork.com/nx/search/jobs/",
    "X-Upwork-Accept-Language": "en-US",
    "Content-Type": "application/json",
}


def get_visitor_token(session) -> str | None:
    resp = session.get(UPWORK_URL, impersonate="safari17_0", timeout=60)
    return resp.cookies.get("visitor_gql_token")


def fetch_jobs(count: int = 20, offset: int = 0, keywords: str | None = None) -> dict:
    session = requests.Session()
    token = get_visitor_token(session)
    if not token:
        return {"success": False, "error": "Failed to get visitor_gql_token"}

    variables = {
        "sort": "recency",
        "paging": {"offset": offset, "count": count},
    }
    if keywords:
        variables["keywords"] = keywords

    payload = {
        "query": SEARCH_QUERY,
        "variables": {"requestVariables": variables},
    }

    headers = {**HEADERS, "Authorization": f"Bearer {token}"}
    gql_resp = session.post(
        API_URL, json=payload, headers=headers, impersonate="safari17_0", timeout=30
    )

    if gql_resp.status_code != 200:
        return {"success": False, "error": f"GraphQL returned {gql_resp.status_code}"}

    data = gql_resp.json()
    if "errors" in data:
        return {"success": False, "error": json.dumps(data["errors"])}

    raw = data.get("data", {}).get("search", {}).get("universalSearchNuxt", {}).get("visitorJobSearchV1", {})
    paging = raw.get("paging", {})
    results = raw.get("results", [])

    jobs = []
    for r in results:
        job = (r.get("jobTile") or {}).get("job", {}) or {}
        cipher = job.get("cipherText", "")
        fixed = (job.get("fixedPriceAmount") or {}) or {}
        hourly_dur = job.get("hourlyEngagementDuration") or {}
        fixed_dur = job.get("fixedPriceEngagementDuration") or {}
        dur = hourly_dur or fixed_dur or {}

        workload = job.get("hourlyEngagementType")
        workload_map = {
            "PART_TIME": "Less than 30 hrs/week",
            "FULL_TIME": "More than 30 hrs/week",
            "AS_NEEDED": "As needed",
        }

        jobs.append({
            "upwork_job_id": f"gql_{job.get('id', '')}",
            "title": r.get("title", ""),
            "description": r.get("description", ""),
            "url": f"https://www.upwork.com/jobs/{cipher}" if cipher else None,
            "ciphertext": cipher,
            "budget": fixed.get("amount"),
            "hourly_min": job.get("hourlyBudgetMin"),
            "hourly_max": job.get("hourlyBudgetMax"),
            "weekly_retainer": job.get("weeklyRetainerBudget"),
            "hours_per_week": workload_map.get(workload) if workload else None,
            "job_type": job.get("jobType"),
            "contractor_tier": job.get("contractorTier"),
            "skills": [s.get("prefLabel", "") for s in (r.get("ontologySkills") or []) if s.get("prefLabel")],
            "posted_at": job.get("publishTime") or job.get("createTime"),
            "duration_label": dur.get("label"),
            "duration_weeks": dur.get("weeks"),
            "source": "upwork_graphql",
        })

    return {
        "success": True,
        "jobs": jobs,
        "total": paging.get("total"),
        "offset": paging.get("offset"),
        "count": paging.get("count"),
    }


def fetch_jobs_with_details(count: int = 20, offset: int = 0, keywords: str | None = None, max_details: int = 20, cookie_string: str | None = None) -> dict:
    """Fetch jobs AND enrich each with client details.

    Job search uses visitor token (no cookies needed).
    Client detail enrichment requires authenticated cookies (JobDetailsNuxt_vt).
    If no cookies provided, returns jobs without client details.
    """
    session = requests.Session()
    token = get_visitor_token(session)
    if not token:
        return {"success": False, "error": "Failed to get visitor_gql_token"}

    headers = {**HEADERS, "Authorization": f"Bearer {token}"}

    # 1. Fetch jobs via visitor search (no cookies needed)
    variables = {
        "sort": "recency",
        "paging": {"offset": offset, "count": count},
    }
    if keywords:
        variables["keywords"] = keywords

    payload = {
        "query": SEARCH_QUERY,
        "variables": {"requestVariables": variables},
    }

    gql_resp = session.post(
        API_URL, json=payload, headers=headers, impersonate="safari17_0", timeout=30
    )

    if gql_resp.status_code != 200:
        return {"success": False, "error": f"GraphQL returned {gql_resp.status_code}"}

    data = gql_resp.json()
    if "errors" in data:
        return {"success": False, "error": json.dumps(data["errors"])}

    raw = data.get("data", {}).get("search", {}).get("universalSearchNuxt", {}).get("visitorJobSearchV1", {})
    paging = raw.get("paging", {})
    results = raw.get("results", [])

    jobs = []
    for r in results:
        job = (r.get("jobTile") or {}).get("job", {}) or {}
        cipher = job.get("cipherText", "")
        fixed = (job.get("fixedPriceAmount") or {}) or {}
        hourly_dur = job.get("hourlyEngagementDuration") or {}
        fixed_dur = job.get("fixedPriceEngagementDuration") or {}
        dur = hourly_dur or fixed_dur or {}

        workload = job.get("hourlyEngagementType")
        workload_map = {
            "PART_TIME": "Less than 30 hrs/week",
            "FULL_TIME": "More than 30 hrs/week",
            "AS_NEEDED": "As needed",
        }

        jobs.append({
            "upwork_job_id": f"gql_{job.get('id', '')}",
            "title": r.get("title", ""),
            "description": r.get("description", ""),
            "url": f"https://www.upwork.com/jobs/{cipher}" if cipher else None,
            "ciphertext": cipher,
            "budget": fixed.get("amount"),
            "hourly_min": job.get("hourlyBudgetMin"),
            "hourly_max": job.get("hourlyBudgetMax"),
            "weekly_retainer": job.get("weeklyRetainerBudget"),
            "hours_per_week": workload_map.get(workload) if workload else None,
            "job_type": job.get("jobType"),
            "contractor_tier": job.get("contractorTier"),
            "skills": [s.get("prefLabel", "") for s in (r.get("ontologySkills") or []) if s.get("prefLabel")],
            "posted_at": job.get("publishTime") or job.get("createTime"),
            "duration_label": dur.get("label"),
            "duration_weeks": dur.get("weeks"),
            "source": "upwork_graphql",
        })

    # 2. Fetch client details (requires authenticated cookies)
    enriched_count = 0
    if cookie_string:
        detail_targets = jobs[:max_details]
        detail_session = requests.Session()
        detail_session.cookies.set("JobDetailsNuxt_vt", cookie_string)

        for idx, job in enumerate(detail_targets):
            cipher = job.get("ciphertext")
            if not cipher:
                continue

            time.sleep(1.5)

            detail_headers = {
                **HEADERS,
                "Referer": f"https://www.upwork.com/jobs/~{cipher}",
            }

            detail_payload = {
                "query": DETAILS_QUERY,
                "variables": {"jobCiphertext": cipher},
            }

            try:
                detail_resp = detail_session.post(
                    f"{API_URL}?alias=gql-query-get-visitor-job-details",
                    json=detail_payload,
                    headers=detail_headers,
                    impersonate="safari17_0",
                    timeout=30,
                )

                if detail_resp.status_code != 200:
                    continue

                d_data = detail_resp.json()
                if "errors" in d_data:
                    continue

                details = d_data.get("data", {}).get("jobPubDetails", {})
                opening = details.get("opening") or {}
                buyer = details.get("buyer") or {}
                buyer_extra = details.get("buyerExtra") or {}

                activity = opening.get("clientActivity") or {}
                location = buyer.get("location") or {}
                stats = buyer.get("stats") or {}
                company = (buyer.get("company") or {}).get("profile") or {}
                total_charges = (stats.get("totalCharges") or {}) if stats else {}

                job["client_score"] = stats.get("score")
                job["client_hours_count"] = stats.get("hoursCount")
                job["client_feedback_count"] = stats.get("feedbackCount")
                job["client_payment_verified"] = buyer_extra.get("isPaymentMethodVerified")
                job["client_total_spend"] = total_charges.get("amount")
                job["client_total_hires"] = stats.get("totalJobsWithHires")
                job["client_total_assignments"] = stats.get("totalAssignments")
                job["client_active_assignments"] = stats.get("activeAssignmentsCount")
                job["client_city"] = (location.get("city") or "")[:100] or None
                job["client_location_country"] = (location.get("country") or "")[:100] or None
                job["client_company_size"] = str(company.get("size", ""))[:50] or None
                job["client_industry"] = (company.get("industry") or "")[:200] or None
                job["total_invited"] = activity.get("totalInvitedToInterview")
                job["total_hired"] = activity.get("totalHired")
                job["proposals_count"] = activity.get("totalApplicants")
                job["category"] = (opening.get("category") or {}).get("name")
                job["enriched"] = True
                enriched_count += 1

            except Exception as e:
                continue

    # Remove ciphertext from output (internal use only)
    for job in jobs:
        job.pop("ciphertext", None)

    return {
        "success": True,
        "jobs": jobs,
        "total": paging.get("total"),
        "offset": paging.get("offset"),
        "count": paging.get("count"),
        "enriched_count": enriched_count,
    }


def fetch_job_details(ciphertext: str, cookie_string: str | None = None) -> dict:
    session = requests.Session()
    if cookie_string:
        session.cookies.set("JobDetailsNuxt_vt", cookie_string)
    token = get_visitor_token(session)
    if not token:
        return {"success": False, "error": "Failed to get visitor_gql_token"}

    alias = "gql-query-get-visitor-job-details"
    url = f"{API_URL}?alias={alias}"

    details_headers = {
        **HEADERS,
        "Referer": f"https://www.upwork.com/jobs/~{ciphertext}",
        "Authorization": f"Bearer {token}",
    }

    payload = {
        "query": DETAILS_QUERY,
        "variables": {"jobCiphertext": ciphertext},
    }

    gql_resp = session.post(
        url, json=payload, headers=details_headers, impersonate="safari17_0", timeout=30
    )

    if gql_resp.status_code != 200:
        return {"success": False, "error": f"Details GraphQL returned {gql_resp.status_code}"}

    data = gql_resp.json()
    if "errors" in data:
        return {"success": False, "error": json.dumps(data["errors"])}

    details = data.get("data", {}).get("jobPubDetails", {})
    opening = details.get("opening") or {}
    buyer = details.get("buyer") or {}
    buyer_extra = details.get("buyerExtra") or {}

    category = opening.get("category") or {}
    activity = opening.get("clientActivity") or {}
    location = buyer.get("location") or {}
    stats = buyer.get("stats") or {}
    company = buyer.get("company") or {}
    company_profile = (company.get("profile") or {}) if company else {}
    total_charges = (stats.get("totalCharges") or {}) if stats else {}

    return {
        "success": True,
        "details": {
            "category": category.get("name"),
            "client_activity": {
                "total_applicants": activity.get("totalApplicants"),
                "total_hired": activity.get("totalHired"),
                "total_invited_to_interview": activity.get("totalInvitedToInterview"),
                "positions_to_hire": activity.get("numberOfPositionsToHire"),
            },
            "client_location": {
                "city": location.get("city"),
                "country": location.get("country"),
            },
            "client_stats": {
                "total_assignments": stats.get("totalAssignments"),
                "active_assignments": stats.get("activeAssignmentsCount"),
                "hours_count": stats.get("hoursCount"),
                "feedback_count": stats.get("feedbackCount"),
                "score": stats.get("score"),
                "total_jobs_with_hires": stats.get("totalJobsWithHires"),
                "total_charges": total_charges.get("amount"),
            },
            "company": {
                "industry": company_profile.get("industry"),
                "size": company_profile.get("size"),
            },
            "payment_verified": buyer_extra.get("isPaymentMethodVerified"),
            "connects_required": opening.get("connectsRequired"),
            "connects": opening.get("connects"),
        },
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=20)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--keywords", type=str, default=None)
    parser.add_argument("--details", type=str, default=None,
                        help="Fetch details for a specific job ciphertext")
    parser.add_argument("--with-details", action="store_true",
                        help="Fetch jobs with client details in one call")
    parser.add_argument("--max-details", type=int, default=20,
                        help="Max number of jobs to enrich with details")
    parser.add_argument("--cookie", type=str, default=None,
                        help="JobDetailsNuxt_vt cookie string for enrichment")
    args = parser.parse_args()

    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if args.with_details:
        result = fetch_jobs_with_details(
            count=args.count, offset=args.offset,
            keywords=args.keywords, max_details=args.max_details,
            cookie_string=args.cookie,
        )
    elif args.details:
        result = fetch_job_details(args.details, cookie_string=args.cookie)
    else:
        result = fetch_jobs(count=args.count, offset=args.offset, keywords=args.keywords)

    print(json.dumps(result, ensure_ascii=False, indent=2))
