#!/usr/bin/env python3
"""
Cookie management endpoint — add to upwork_api.py
GET /cookies/status — check current cookie status
POST /cookies — update cookies (accepts JSON or raw cookie string)
"""
import json

COOKIE_FILE = "/tmp/upwork_cookies.json"
DOCKER_COOKIE_FILE = "/app/upwork_cookies.json"


def _load_cookies():
    for path in [COOKIE_FILE, DOCKER_COOKIE_FILE]:
        try:
            with open(path, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            continue
    return {}


def _save_cookies(cookies: dict):
    for path in [COOKIE_FILE, DOCKER_COOKIE_FILE]:
        try:
            with open(path, "w") as f:
                json.dump(cookies, f, indent=2)
        except Exception:
            pass


# Add these routes to upwork_api.py:

async def cookie_status():
    """GET /cookies/status"""
    cookies = _load_cookies()
    vt = cookies.get("JobDetailsNuxt_vt")
    gql = cookies.get("visitor_gql_token")
    return {
        "has_job_details_cookie": bool(vt),
        "job_details_cookie_preview": vt[:50] + "..." if vt else None,
        "has_visitor_token": bool(gql),
        "visitor_token_preview": gql[:50] + "..." if gql else None,
        "total_cookies": len(cookies),
        "all_cookie_names": list(cookies.keys()),
    }


async def update_cookies(request):
    """POST /cookies — Accept JSON or raw cookie string"""
    content_type = request.headers.get("content-type", "")
    body = await request.body()
    raw = body.decode("utf-8", errors="replace").strip()

    if "application/json" in content_type:
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                cookies = data
            else:
                cookies = {"JobDetailsNuxt_vt": str(data)}
        except json.JSONDecodeError:
            cookies = {"JobDetailsNuxt_vt": raw}
    else:
        # Raw cookie string
        cookies = {}
        for pair in raw.split(";"):
            pair = pair.strip()
            if "=" in pair:
                k, v = pair.split("=", 1)
                cookies[k.strip()] = v.strip()

    if not cookies:
        return {"error": "No cookies provided"}

    existing = _load_cookies()
    existing.update(cookies)
    _save_cookies(existing)

    return {
        "success": True,
        "updated": list(cookies.keys()),
        "has_job_details_cookie": bool(existing.get("JobDetailsNuxt_vt")),
    }
