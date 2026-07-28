import json
import os
from fastapi import Request
from typing import Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import HTMLResponse
from upwork_scraper import fetch_jobs, fetch_job_details, fetch_jobs_with_details


app = FastAPI(title="Upwork Jobs API", version="6.0.0")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
COOKIE_FILE = "/app/cookies/upwork_cookies.json"


def _load_cookies() -> dict:
    try:
        with open(COOKIE_FILE, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_cookies(cookies: dict):
    import os
    os.makedirs(os.path.dirname(COOKIE_FILE), exist_ok=True)
    with open(COOKIE_FILE, "w") as f:
        json.dump(cookies, f)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "6.0.0"}


@app.get("/jobs")
async def get_jobs(
    count: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None, alias="query"),
):
    result = fetch_jobs(count=count, offset=offset, keywords=q)
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "Unknown error"))
    return result


@app.get("/jobs/ingest")
async def ingest_jobs(
    count: int = Query(default=50, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    max_details: int = Query(default=20, ge=0, le=50),
):
    """Fetch jobs + enrich with client details if cookies available."""
    all_cookies = _load_cookies()
    result = fetch_jobs_with_details(
        count=count, offset=offset, max_details=max_details,
        all_cookies=all_cookies if all_cookies else None,
    )
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "Unknown error"))
    return result


@app.get("/jobs/{ciphertext}/details")
async def get_job_details(ciphertext: str):
    all_cookies = _load_cookies()
    result = fetch_job_details(ciphertext, all_cookies=all_cookies if all_cookies else None)
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "Unknown error"))
    return result


@app.post("/refresh-cookies")
async def refresh_cookies(request: Request):
    """Refresh Upwork cookies. Accepts:
    - JSON object with key=value pairs (all browser cookies)
    - JSON with 'cookies' dict or 'UniversalSearchNuxt_vt' string
    - Raw cookie header string (name=value; name2=value2)
    """
    content_type = request.headers.get("content-type", "")
    body = await request.body()
    raw = body.decode("utf-8", errors="replace").strip()

    if "application/json" in content_type:
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                # If it has a "cookies" key, use that dict
                if "cookies" in data and isinstance(data["cookies"], dict):
                    _save_cookies(data["cookies"])
                    return {"success": True, "message": f"Saved {len(data['cookies'])} cookies"}
                # If it has UniversalSearchNuxt_vt directly, save all keys
                elif any(k for k in data.keys() if k not in ("UniversalSearchNuxt_vt", "cookie_string", "cookies")):
                    # Looks like a full cookies dict (key=value pairs from browser)
                    _save_cookies(data)
                    return {"success": True, "message": f"Saved {len(data)} cookies"}
                else:
                    # Single cookie value
                    cookie_string = data.get("UniversalSearchNuxt_vt") or data.get("cookie_string") or ""
                    if cookie_string:
                        _save_cookies({"UniversalSearchNuxt_vt": cookie_string})
                        return {"success": True, "message": "Saved UniversalSearchNuxt_vt"}
                    raise HTTPException(status_code=400, detail="No cookie value found")
            else:
                raise HTTPException(status_code=400, detail="JSON must be an object")
        except json.JSONDecodeError:
            pass

    # Raw cookie string: "name=value; name2=value2"
    cookies = {}
    for pair in raw.split(";"):
        pair = pair.strip()
        if "=" in pair:
            name, _, value = pair.partition("=")
            name = name.strip()
            value = value.strip()
            if name and value:
                cookies[name] = value

    if cookies:
        _save_cookies(cookies)
        return {"success": True, "message": f"Saved {len(cookies)} cookies"}

    raise HTTPException(status_code=400, detail="Invalid cookie format")


@app.get("/cookies/status")
async def cookie_status():
    """Check if cookies are loaded."""
    cookies = _load_cookies()
    has_bearer = bool(cookies.get("UniversalSearchNuxt_vt") or cookies.get("oauth2_global_js_token"))
    return {
        "has_cookies": bool(cookies),
        "has_bearer_token": has_bearer,
        "cookie_count": len(cookies),
        "cookie_names": list(cookies.keys()),
    }
