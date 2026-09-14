from fastapi import APIRouter, HTTPException
import os

from services.job_aggregator import fetch_jobs

router = APIRouter()

DAILY_APPLY_CAP = int(os.getenv("DAILY_APPLY_CAP", "10"))

# TODO: replace with a real per-user, per-day counter backed by the database.
_applies_today = {"count": 0}


@router.get("/")
def list_jobs(q: str = "software developer"):
    return fetch_jobs(query=q)


@router.post("/{job_id}/apply")
def apply_to_job(job_id: int):
    if _applies_today["count"] >= DAILY_APPLY_CAP:
        raise HTTPException(status_code=429, detail="Daily apply cap reached — try again tomorrow.")

    # TODO: this is where the Playwright semi-auto apply flow gets triggered.
    # It should run as a background task, update the applications table with
    # a status of "applied" / "manual_needed" (e.g. on captcha), and notify
    # the user either way.
    _applies_today["count"] += 1
    return {"status": "queued", "job_id": job_id}
