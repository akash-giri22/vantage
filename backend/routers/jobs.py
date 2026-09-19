from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.job_aggregator import fetch_jobs
from services.job_matcher import calculate_match
from services.job_store import (
    init_db,
    mark_all_jobs_inactive,
    save_job,
    get_jobs,
    get_job,
    get_resume_profile,
)
from services.apply_agent import process_job_application


router = APIRouter()
init_db()


class ApplyRequest(BaseModel):
    resume_name: str = ""


@router.get("/")
def list_jobs(
    q: str = "software developer",
    location: str = "India",
):
    resume_profile = get_resume_profile()
    resume_text = resume_profile.get("resume_text", "") if resume_profile else ""

    # Keep old jobs for tracker/history, but hide them from the live feed.
    mark_all_jobs_inactive()

    fetched_jobs = fetch_jobs(
        query=q,
        location=location,
    )

    for job in fetched_jobs:
        combined_job_text = (
            f"{job.get('title', '')}\n"
            f"{job.get('description', '')}"
        )

        match_data = calculate_match(
            resume_text=resume_text,
            job_description=combined_job_text,
        )

        job["match_score"] = match_data["match_score"]
        job["match_reasons"] = match_data["match_reasons"]
        job["missing_skills"] = match_data["missing_skills"]
        job["match"] = match_data["match_score"]

        save_job(job)

    return get_jobs(limit=150)


@router.get("/{job_id}")
def job_details(job_id: int):
    job = get_job(job_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found.",
        )

    return job


@router.post("/{job_id}/apply")
def apply_to_job(
    job_id: int,
    payload: ApplyRequest | None = None,
):
    job = get_job(job_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found.",
        )

    resume_name = payload.resume_name if payload else ""

    return process_job_application(
        job_id=job_id,
        resume_name=resume_name,
    )
