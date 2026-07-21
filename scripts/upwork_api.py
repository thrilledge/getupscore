import json
import os
from urllib.request import Request, urlopen
from typing import Optional
from fastapi import FastAPI, Body, Query, HTTPException
from pydantic import BaseModel
from upwork_scraper import fetch_jobs, fetch_job_details, fetch_full_job_page


class FullPageRequest(BaseModel):
    cookie_string: Optional[str] = None


app = FastAPI(title="Upwork Jobs API", version="2.0.0")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")


def _get_latest_cookie_string() -> Optional[str]:
    """Read the latest Upwork session cookie from Supabase."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    url = f"{SUPABASE_URL}/rest/v1/upwork_sessions?select=cookie_string&order=captured_at.desc&limit=1"
    req = Request(url, headers={
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Accept": "application/json",
    })
    try:
        with urlopen(req, timeout=10) as resp:
            rows = json.loads(resp.read())
            if rows and rows[0].get("cookie_string"):
                return rows[0]["cookie_string"]
    except Exception:
        return None
    return None


@app.get("/health")
async def health():
    return {"status": "ok"}


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


@app.get("/jobs/{ciphertext}/details")
async def get_job_details(ciphertext: str):
    result = fetch_job_details(ciphertext)
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "Unknown error"))
    return result


@app.post("/jobs/{ciphertext}/full")
async def get_full_job(ciphertext: str, body: Optional[FullPageRequest] = None):
    """
    Fetch the full job page HTML with logged-in cookies from Supabase
    (or provided in the request), extract __NUXT__ state and client recent jobs.
    """
    cookie = body.cookie_string if body else None
    if not cookie:
        cookie = _get_latest_cookie_string()
    result = fetch_full_job_page(ciphertext, cookie_string=cookie)
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "Unknown error"))
    return result
