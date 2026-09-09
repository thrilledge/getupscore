#!/usr/bin/env python3
"""
save_get_jobs_to_db.py
----------------------
Insert/update Supabase `jobs` rows from MCP Upwork `action=get` full-detail
responses. Unlike the search-based script, this maps the RICH `get` response
so client/connects/details columns are populated:
    connects_required, description, hourly_min/max, client_recent_history,
    total_hired, total_invited, client_hours_count, client_feedback_count,
    client_total_jobs_with_hires, client_location_country, preferred quals...

Dedup/upsert by upwork_job_id (ON CONFLICT DO NOTHING for new / separate
UPDATE-by-id helper for refreshing an existing row).

Accepts a JSON file that is either:
  - a list of raw MCP `action=get` responses (each the full response object)
  - or a single raw response object

Usage:
    python3 save_get_jobs_to_db.py /path/to/mcp_get_responses.json
    python3 save_get_jobs_to_db.py --update /path/to/mcp_get_responses.json

Env (from .opencode-env or exported):
    SUPABASE_URL
    SUPABASE_SERVICE_KEY
"""
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

DEFAULT_INPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mcp_get_jobs.json")

# All valid columns in the `jobs` table that we may write.
JOBS_COLUMNS = {
    "upwork_job_id", "title", "description", "budget", "hourly_min", "hourly_max",
    "client_country", "client_spend", "client_hire_rate", "proposals_count", "url",
    "posted_at", "created_at", "job_type", "contractor_tier", "weekly_retainer",
    "duration_label", "duration_weeks", "skills", "category", "subcategory",
    "payment_verified", "source", "client_name", "client_rating", "hours_per_week",
    "client_total_assignments", "client_total_hires", "client_total_spend",
    "client_member_since", "client_industry", "total_invited", "total_hired",
    "client_recent_history", "client_score", "client_hours_count",
    "client_feedback_count",     "client_payment_verified", "client_city",
    "client_company_size", "client_total_jobs_with_hires", "client_active_assignments",
    "client_location_country", "connects_required",
    "client_feedback_score", "client_timezone", "client_state", "client_region",
    "client_contracts_active", "client_contracts_total", "persons_to_hire",
    "engagement_type", "client_hourly_budget_type", "preferred_qualifications",
}


def get_env():
    url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
    if not url or not key:
        sys.exit("[save_get_jobs] ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    return url, key


def norm(v):
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        if v == "":
            return None
    return v


def _strip_untrusted(v):
    """Remove Upwork's <untrusted_participant_content> wrappers from descriptions."""
    if isinstance(v, str):
        v = v.replace("<untrusted_participant_content>", "").replace("</untrusted_participant_content>", "")
    return v


def to_int(v):
    if v is None:
        return None
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return None


def parse_money(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).replace("$", "").replace(",", "").strip()
    if not s or s.lower() in ("n/a", "none", "tbd"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _b(v):
    """coerce to bool or None"""
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    return str(v).lower() in ("1", "true", "yes")


def dig(d, *path, default=None):
    """Safe nested dict access."""
    cur = d
    for p in path:
        if isinstance(cur, dict):
            cur = cur.get(p, {})
        else:
            return default
    if isinstance(cur, dict) and not cur:
        return default
    if cur == {}:
        return default
    return cur if cur is not None else default


def map_get_response(resp):
    """Map a raw MCP `action=get` response object to a jobs-table row."""
    if not isinstance(resp, dict):
        return None

    data = resp.get("data") or {}
    mjp = data.get("marketplaceJobPosting") or data.get("job") or {}
    content = mjp.get("content") or {}
    terms = mjp.get("contractTerms") or {}
    hourly = terms.get("hourlyContractTerms") or {}
    fixed = terms.get("fixedPriceContractTerms") or terms.get("fixedContractTerms") or {}
    activity = (mjp.get("activityStat") or {}).get("jobActivity") or {}
    client_rec = resp.get("client_record") or {}
    client_company = mjp.get("clientCompanyPublic") or {}
    country = client_company.get("country") or {}
    preq = resp.get("preferred_qualifications") or {}

    jid = resp.get("id") or resp.get("job_id") or mjp.get("id") or ("" if not isinstance(mjp.get("id"), list) else None)
    if isinstance(jid, dict):
        jid = jid.get("id")
    if not jid:
        return None

    title = norm(content.get("title") or resp.get("title"))
    ctype = norm(terms.get("contractType") or resp.get("job_type"))
    is_hourly = (ctype or "").lower() in ("hourly",)

    # hourly budget from `get`, else from fixed budget
    hourly_min = hourly.get("hourlyBudgetMin")
    hourly_max = hourly.get("hourlyBudgetMax")
    # MCP fixed-price budget lives under fixedPriceContractTerms.amount as
    # {currency, rawValue, displayValue}; older shapes used .budget/.maxBudget.
    fixed_amount = fixed.get("amount") or {}
    budget = (
        fixed_amount.get("rawValue")
        or fixed_amount.get("displayValue")
        or fixed.get("budget")
        or fixed.get("maxBudget")
        or resp.get("budget")
    )

    # client spend from search-style fields, else from MCP client_record
    client_spend = resp.get("client_spend") or resp.get("clientSpent") or resp.get("client_total_spend")
    client_spend_total = parse_money(client_rec.get("spend_total"))
    if client_spend is None and client_spend_total is not None:
        client_spend = client_spend_total

    # client feedback score (0-5) from MCP client_record
    feedback_score = parse_money(client_rec.get("feedback_score"))

    proposals = mjp.get("clientProposals") or {}
    proposals_count = proposals.get("count")

    row = {
        "upwork_job_id": str(jid),
        "title": (title or "(untitled)")[:500],
        "description": norm(_strip_untrusted(content.get("description"))),
        "url": norm(mjp.get("url") or resp.get("url")),
        "job_type": (ctype or "")[:50],
        "contractor_tier": norm(terms.get("experienceLevel") or resp.get("experience_level") or resp.get("experienceLevel")),
        "duration_label": norm(resp.get("duration") or resp.get("duration_label")),
        "duration_weeks": to_int(resp.get("duration_weeks")),
        "skills": [norm(s) for s in (resp.get("skills") or []) if norm(s)][:50] or None,
        "hourly_min": parse_money(hourly_min) if is_hourly else None,
        "hourly_max": parse_money(hourly_max) if is_hourly else None,
        "budget": parse_money(budget) if not is_hourly else None,
        "connects_required": to_int(resp.get("connects_cost") or resp.get("connectsCost")),
        "client_country": norm(country.get("name") or resp.get("client_country")),
        "client_location_country": norm(country.get("name") or resp.get("client_country")),
        "client_spend": parse_money(client_spend),
        "client_total_spend": parse_money(client_spend),
        "client_hire_rate": parse_money(resp.get("client_hire_rate") or resp.get("hireRate")),
        "client_payment_verified": _b(resp.get("client_payment_verified") or (client_company.get("paymentVerified") if isinstance(client_company.get("paymentVerified"), bool) else None)),
        "payment_verified": _b(resp.get("payment_verified")),
        "proposals_count": to_int(proposals_count or resp.get("proposals_count")),
        "total_hired": to_int(activity.get("totalHired") or client_rec.get("jobs_with_hires")),
        "total_invited": to_int(activity.get("invitesSent") or activity.get("totalInvitedToInterview")),
        "client_total_hires": to_int(resp.get("client_record", {}).get("jobs_with_hires") or activity.get("totalHired")),
        "client_total_jobs_with_hires": to_int(client_rec.get("jobs_with_hires") or activity.get("totalHired")),
        "client_hours_count": parse_money(client_rec.get("hours_total")),
        "client_feedback_count": to_int(client_rec.get("feedback_count")),
        "client_feedback_score": feedback_score,
        "client_contracts_active": to_int(client_rec.get("contracts_active")),
        "client_contracts_total": to_int(client_rec.get("contracts_total")),
        "client_total_assignments": to_int(resp.get("client_total_assignments")),
        "client_active_assignments": to_int(activity.get("totalOffered") or resp.get("client_active_assignments")),
        "client_name": norm(resp.get("client_name") or client_company.get("name")),
        "client_rating": parse_money(resp.get("client_rating") or resp.get("clientRating")) or feedback_score,
        "client_industry": norm(resp.get("client_industry")),
        "client_city": norm(client_company.get("city") or resp.get("client_city")),
        "client_timezone": norm(client_company.get("timezone")),
        "client_state": norm(client_company.get("state")),
        "client_region": norm(country.get("region")),
        "client_company_size": norm(resp.get("client_company_size") or client_company.get("company_size")),
        "client_member_since": norm(resp.get("client_member_since")),
        "persons_to_hire": to_int(terms.get("personsToHire")),
        "engagement_type": norm(hourly.get("engagementType")),
        "client_hourly_budget_type": norm(hourly.get("hourlyBudgetType")),
        # Keep preferred_qualifications as a real JSON object so the client
        # can read it directly (unlike client_recent_history, which stores the
        # full raw dump as an escaped string).
        "preferred_qualifications": (preq if isinstance(preq, dict) and preq else None),
        # Keep the ENTIRE raw `get` response so nothing is ever lost.
        "client_recent_history": json.dumps(resp) if isinstance(resp, dict) else None,
        "source": "upwork_mcp",
        "posted_at": norm(resp.get("published_date") or resp.get("posted_at"))
        or datetime.now(timezone.utc).isoformat(),
    }

    row["skills"] = row["skills"] or None
    return {k: v for k, v in row.items() if k in JOBS_COLUMNS}


def rpc_insert_many(url, key, rows):
    endpoint = f"{url}/rest/v1/jobs"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=ignore-duplicates",
    }
    data = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(endpoint, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else []
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        if e.code == 409 and "23505" in detail:
            return []
        raise RuntimeError(f"PostgREST HTTP {e.code}: {detail}") from e


def rpc_update(url, key, row, jid):
    """UPDATE an existing jobs row by upwork_job_id to refresh rich `get` details."""
    endpoint = f"{url}/rest/v1/jobs?upwork_job_id=eq.{jid}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    data = json.dumps(row).encode("utf-8")
    req = urllib.request.Request(endpoint, data=data, headers=headers, method="PATCH")
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else []
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"PostgREST PATCH HTTP {e.code}: {detail}") from e


def rpc_upsert_many(url, key, rows):
    """Upsert jobs by upwork_job_id — INSERT new rows and UPDATE existing ones.

    PostgREST `on_conflict=<col>` + `resolution=merge-duplicates` does a true
    upsert: rows whose upwork_job_id already exists are updated, missing ones
    are inserted. Returns the full set of affected rows.
    """
    endpoint = f"{url}/rest/v1/jobs?on_conflict=upwork_job_id"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }
    data = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(endpoint, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else []
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"PostgREST upsert HTTP {e.code}: {detail}") from e


def main():
    args = [a for a in sys.argv[1:]]
    update_mode = False
    if "--update" in args:
        update_mode = True
        args.remove("--update")
    input_file = args[0] if args else DEFAULT_INPUT
    if not os.path.isfile(input_file):
        sys.exit(f"[save_get_jobs] ERROR: file not found: {input_file}")

    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    responses = data if isinstance(data, list) else [data]

    rows = []
    for r in responses:
        mapped = map_get_response(r)
        if mapped:
            rows.append(mapped)

    if not rows:
        print("[save_get_jobs] No valid get-responses to convert.")
        return

    url, key = get_env()

    if update_mode:
        # True upsert: new rows get inserted, existing rows get refreshed.
        try:
            result = rpc_upsert_many(url, key, rows)
        except Exception as e:
            print(f"[save_get_jobs] ERROR upserting: {e}")
            sys.exit(1)
        done = result if isinstance(result, list) else []
        for row in done:
            print(f"  [upsert] {row.get('upwork_job_id')} | {row.get('title','')[:60]}")
        print(f"[save_get_jobs] UPSERT done: {len(done)}/{len(rows)}")
        return

    try:
        inserted = rpc_insert_many(url, key, rows)
    except Exception as e:
        print(f"[save_get_jobs] ERROR inserting: {e}")
        sys.exit(1)

    print(f"[save_get_jobs] Input get-responses: {len(responses)}")
    print(f"[save_get_jobs] Mapped valid: {len(rows)}")
    print(f"[save_get_jobs] Newly inserted: {len(inserted)}  (duplicates skipped: {len(rows) - len(inserted)})")
    if inserted:
        print("[save_get_jobs] Inserted:")
        for r in inserted:
            print(f"  - {r.get('upwork_job_id')} | {r.get('title','')[:60]}")


if __name__ == "__main__":
    main()
