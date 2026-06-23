from fastapi import FastAPI, Query, HTTPException
from upwork_scraper import fetch_jobs, fetch_job_details

app = FastAPI(title="Upwork Jobs API", version="2.0.0")


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
