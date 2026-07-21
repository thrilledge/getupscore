#!/usr/bin/env python3
"""
Upwork Job Scraper — uses curl_cffi to bypass Cloudflare and Upwork's GraphQL API.
"""
import json
import re
import sys
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

    HEADERS["Authorization"] = f"Bearer {token}"
    gql_resp = session.post(
        API_URL, json=payload, headers=HEADERS, impersonate="safari17_0", timeout=30
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


def fetch_job_details(ciphertext: str) -> dict:
    session = requests.Session()
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
        },
    }


def fetch_full_job_page(ciphertext: str, cookie_string: str | None = None) -> dict:
    """
    Fetch the job page HTML with optional logged-in cookies and extract ALL
    available data — including client recent jobs that SUIT2 renders client-side.

    The function:
      1. Fetches the HTML page (bypasses Cloudflare via curl_cffi).
      2. Extracts window.__NUXT__ state (server-side Vuex / Apollo cache).
      3. Recursively searches the entire state tree for client recent jobs.
      4. Falls back to regex-based DOM extraction from HTML for [data-cy="job"].
      5. Returns full job data merged with client history.

    Returns { success, job (normalized), client_recent_history } or { success, error }.
    """
    session = requests.Session()

    if cookie_string:
        for pair in cookie_string.split("; "):
            if "=" in pair:
                k, v = pair.split("=", 1)
                session.cookies.set(k, v, domain=".upwork.com")

    url = f"https://www.upwork.com/jobs/~{ciphertext}/"
    page_headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.upwork.com/nx/search/jobs/",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    }

    try:
        resp = session.get(url, headers=page_headers, impersonate="safari17_0", timeout=30)
    except Exception as e:
        return {"success": False, "error": f"Page fetch failed: {e}"}

    if resp.status_code != 200:
        return {"success": False, "error": f"Page fetch returned {resp.status_code}"}

    html = resp.text

    # ---------------------------------------------------------------
    # 1. Extract __NUXT__ state
    # ---------------------------------------------------------------
    nuxt_data = None
    match = re.search(
        r'<script[^>]*>window\.__NUXT__\s*=\s*(\{.*?\});?\s*</script>',
        html, re.DOTALL
    )
    if not match:
        match = re.search(
            r'<script[^>]*id="__NUXT__"[^>]*type="application/json"[^>]*>(.*?)</script>',
            html, re.DOTALL
        )
    if match:
        raw = match.group(1).strip()
        try:
            nuxt_data = json.loads(raw)
        except json.JSONDecodeError:
            # Try sanitizing — Nuxt sometimes injects JS expressions
            raw = re.sub(r'\bundefined\b', 'null', raw)
            raw = re.sub(r'//.*?(?:\n|$)', '', raw)
            try:
                nuxt_data = json.loads(raw)
            except json.JSONDecodeError:
                pass

    # ---------------------------------------------------------------
    # 2. Normalize main job from __NUXT__.state or __NUXT__
    # ---------------------------------------------------------------
    job = None
    if nuxt_data:
        state = nuxt_data.get("state") or nuxt_data

        # Try common Nuxt state paths
        for path in ["jobViewer.job", "jobViewer.opening", "job", "opening"]:
            cursor = state
            parts = path.split(".")
            for p in parts:
                if isinstance(cursor, dict):
                    cursor = cursor.get(p)
                else:
                    cursor = None
                    break
            if cursor and isinstance(cursor, dict):
                title = cursor.get("title") or (cursor.get("info") or {}).get("title")
                if title:
                    job = _normalize_nuxt_job(cursor)
                    break

        # Also try Apollo cache in __NUXT__
        if not job:
            apollo = state.get("apollo") or {}
            for key, entry in apollo.items():
                data_node = entry if isinstance(entry, dict) else {}
                found = _find_job_in_dict(data_node, depth=0)
                if found:
                    job = _normalize_nuxt_job(found)
                    break

    # ---------------------------------------------------------------
    # 3. Extract client recent jobs
    # ---------------------------------------------------------------
    client_recent_history = []

    # 3a. From __NUXT__ state — search tree for arrays of job-like objects
    if nuxt_data:
        client_recent_history = _find_client_recent_jobs_in_state(nuxt_data)

    # 3b. From HTML DOM if SSR rendered [data-cy="job"] elements
    if not client_recent_history:
        client_recent_history = _extract_history_from_html(html)

    # ---------------------------------------------------------------
    # 4. Build result
    # ---------------------------------------------------------------
    if not job:
        return {
            "success": True,
            "job": None,
            "client_recent_history": client_recent_history,
            "note": "Could not extract job from __NUXT__; only client history available",
        }

    job["client_recent_history"] = client_recent_history
    return {"success": True, "job": job, "client_recent_history": client_recent_history}


# --------------------------------------------------------------------
# Internal helpers
# --------------------------------------------------------------------

def _normalize_nuxt_job(raw: dict) -> dict:
    """Normalize a job dict extracted from __NUXT__ state."""
    info = raw.get("info") or {}
    budget = raw.get("budget") or {}
    sands = raw.get("sandsData") or {}
    activity = raw.get("clientActivity") or {}
    category = raw.get("category") or {}
    extended = raw.get("extendedBudgetInfo") or {}

    skills = []
    for skill_set in [sands.get("ontologySkills", []),
                      sands.get("additionalSkills", [])]:
        for s in (skill_set or []):
            label = s.get("prefLabel")
            if label and label not in skills:
                skills.append(label)

    return {
        "upwork_job_id": f"gql_{info.get('id', raw.get('id', ''))}",
        "title": info.get("title") or raw.get("title", ""),
        "description": raw.get("description", ""),
        "url": f"https://www.upwork.com/jobs/~{info.get('ciphertext', '')}",
        "budget": (budget.get("amount") or raw.get("budget")),
        "hourly_min": extended.get("hourlyBudgetMin"),
        "hourly_max": extended.get("hourlyBudgetMax"),
        "job_type": info.get("type") or raw.get("jobType"),
        "contractor_tier": raw.get("contractorTier"),
        "skills": skills,
        "posted_at": raw.get("postedOn") or raw.get("createTime"),
        "duration_label": (raw.get("engagementDuration") or {}).get("label"),
        "duration_weeks": (raw.get("engagementDuration") or {}).get("weeks"),
        "proposals_count": activity.get("totalApplicants"),
        "client_rating": None,
        "client_reviews_count": None,
        "client_country": None,
        "client_payment_verified": None,
        "client_member_since": None,
        "client_industry": None,
        "client_company_size": None,
        "connects_required": None,
        "source": "upwork_nuxt_page",
    }


def _find_job_in_dict(obj, depth=0) -> dict | None:
    """Recursively search a nested dict for a job-like object."""
    if not isinstance(obj, dict) or depth > 20:
        return None
    title = obj.get("title") or (obj.get("info") or {}).get("title")
    description = obj.get("description", "")
    if title and len(description) > 20:
        return obj
    for val in obj.values():
        if isinstance(val, dict):
            found = _find_job_in_dict(val, depth + 1)
            if found:
                return found
        elif isinstance(val, list):
            for item in val:
                if isinstance(item, dict):
                    found = _find_job_in_dict(item, depth + 1)
                    if found:
                        return found
    return None


def _find_client_recent_jobs_in_state(nuxt_data: dict) -> list[dict]:
    """
    Search the entire __NUXT__ tree for arrays of job-like objects that
    represent a buyer's recent job history.
    """
    results = []

    def _score_and_collect(arr):
        """Score an array of dicts — if they look like recent jobs, collect them."""
        items = []
        for item in arr:
            if not isinstance(item, dict):
                continue
            title = item.get("title") or (item.get("info") or {}).get("title")
            if not title:
                continue
            # Recent jobs have either a rating, a date, a ciphertext, or a small description
            has_rating = item.get("rating") is not None
            has_date = bool(item.get("date") or item.get("postedOn"))
            has_cipher = bool(item.get("ciphertext") or (item.get("info") or {}).get("ciphertext"))
            has_short_desc = bool(item.get("description") and len(item.get("description", "")) < 500)
            if has_rating or has_date or has_cipher or has_short_desc:
                items.append({
                    "title": title,
                    "url": item.get("url") or (
                        f"https://www.upwork.com/jobs/~{item.get('ciphertext') or (item.get('info') or {}).get('ciphertext', '')}"
                        if (item.get("ciphertext") or (item.get("info") or {}).get("ciphertext")) else ""
                    ),
                    "rating": (item.get("rating") or (item.get("stats") or {}).get("score")),
                    "date": item.get("date") or item.get("postedOn") or "",
                    "feedback": "",
                    "freelancerName": None,
                })
        return items

    def _recurse(obj, depth=0):
        if not isinstance(obj, dict) or depth > 15:
            return
        for key, val in obj.items():
            # Key heuristics: arrays named "jobs", "openings", "results", "history"
            # or containing "recent" / "history"
            if isinstance(val, list) and len(val) > 0 and len(val) < 50:
                if any(kw in key.lower() for kw in ["recent", "history", "opening", "job", "result", "opening"]):
                    scored = _score_and_collect(val)
                    if scored:
                        results.extend(scored)

            if isinstance(val, dict):
                _recurse(val, depth + 1)
            elif isinstance(val, list):
                for item in val:
                    if isinstance(item, dict):
                        _recurse(item, depth + 1)

    _recurse(nuxt_data)

    # Deduplicate by title
    seen = set()
    deduped = []
    for item in results:
        key = item["title"].lower().strip()
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    return deduped


def _extract_history_from_html(html: str) -> list[dict]:
    """
    Fallback: extract client recent jobs from SSR-rendered HTML using regex
    on [data-cy="job"] elements (same selectors as extension DOM extraction).
    """
    results = []

    # Find all [data-cy="job"] blocks
    job_blocks = re.findall(
        r'<[^>]*data-cy="job"[^>]*>.*?</div>\s*(?=</div>|\s*<[^>]*data-cy)',
        html, re.DOTALL
    )

    for block in job_blocks if job_blocks else _split_job_blocks(html):
        title_match = re.search(r'data-cy="job-title"[^>]*>\s*(.*?)\s*<', block)
        rating_match = re.search(r'air3-rating-value-text[^>]*>\s*([\d.]+)\s*<', block)
        date_match = re.search(r'data-cy="date"[^>]*>\s*(.*?)\s*<', block)
        freelancer_match = re.search(r'/freelancers/[^"]*"[^>]*>\s*(.*?)\s*<', block)

        title = title_match.group(1).strip() if title_match else ""
        if not title:
            continue

        results.append({
            "title": title,
            "url": "",
            "rating": float(rating_match.group(1)) if rating_match else None,
            "date": date_match.group(1).strip() if date_match else "",
            "feedback": "",
            "freelancerName": freelancer_match.group(1).strip() if freelancer_match else None,
        })

    return results


def _split_job_blocks(html: str) -> list[str]:
    """Split HTML by common job-card wrapper patterns."""
    blocks = []
    for m in re.finditer(r'(<div[^>]*data-cy="job"[^>]*>.*?</div>\s*</div>\s*</div>)', html, re.DOTALL):
        blocks.append(m.group(1))
    return blocks


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=20)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--keywords", type=str, default=None)
    parser.add_argument("--details", type=str, default=None,
                        help="Fetch details for a specific job ciphertext")
    parser.add_argument("--full-page", type=str, default=None,
                        help="Fetch full page HTML with __NUXT__ for a ciphertext")
    parser.add_argument("--cookie", type=str, default=None,
                        help="Cookie string for --full-page (optional)")
    args = parser.parse_args()

    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if args.full_page:
        result = fetch_full_job_page(args.full_page, args.cookie)
    elif args.details:
        result = fetch_job_details(args.details)
    else:
        result = fetch_jobs(count=args.count, offset=args.offset, keywords=args.keywords)

    print(json.dumps(result, ensure_ascii=False, indent=2))
