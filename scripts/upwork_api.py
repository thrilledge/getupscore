import json
import os
from fastapi import Request
from typing import Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import HTMLResponse
from upwork_scraper import fetch_jobs, fetch_job_details, fetch_jobs_with_details


app = FastAPI(title="Upwork Jobs API", version="5.0.0")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
COOKIE_FILE = "/tmp/upwork_cookies.json"


def _load_cookies() -> dict:
    try:
        with open(COOKIE_FILE, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_cookies(cookies: dict):
    with open(COOKIE_FILE, "w") as f:
        json.dump(cookies, f)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "5.0.0"}


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
    cookie_string = _load_cookies().get("JobDetailsNuxt_vt")
    result = fetch_jobs_with_details(
        count=count, offset=offset, max_details=max_details,
        cookie_string=cookie_string,
    )
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "Unknown error"))
    return result


@app.get("/jobs/{ciphertext}/details")
async def get_job_details(ciphertext: str):
    cookie_string = _load_cookies().get("JobDetailsNuxt_vt")
    result = fetch_job_details(ciphertext, cookie_string=cookie_string)
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "Unknown error"))
    return result


@app.post("/refresh-cookies")
async def refresh_cookies(request: Request):
    """Refresh Upwork cookies. Accepts JSON body or raw cookie string."""
    content_type = request.headers.get("content-type", "")
    body = await request.body()
    raw = body.decode("utf-8", errors="replace").strip()

    if "application/json" in content_type:
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                cookie_string = data.get("JobDetailsNuxt_vt") or data.get("cookie_string") or ""
            else:
                cookie_string = str(data)
        except json.JSONDecodeError:
            cookie_string = raw
    else:
        cookie_string = raw

    if not cookie_string or len(cookie_string) < 10:
        raise HTTPException(status_code=400, detail="Invalid cookie string")

    _save_cookies({"JobDetailsNuxt_vt": cookie_string})
    return {"success": True, "message": "Cookies updated"}


@app.get("/cookies/status")
async def cookie_status():
    """Check if cookies are loaded and valid."""
    cookies = _load_cookies()
    has_cookie = bool(cookies.get("JobDetailsNuxt_vt"))
    return {"has_cookies": has_cookie}
