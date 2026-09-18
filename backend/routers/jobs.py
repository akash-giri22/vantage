from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.job_aggregator import fetch_jobs
from services.job_matcher import calculate_match
from services.job_store import init_db, save_job, get_jobs, get_job, get_resume_profile
from services.apply_agent import process_job_application

router = APIRouter()
init_db()

class ApplyRequest(BaseModel):
    resume_name: str = ""

@router.get("/")
def list_jobs(q: str = "software developer", location: str = "India"):
    profile = get_resume_profile() or {}
    resume_text = profile.get("resume_text") or ""
    fetched = fetch_jobs(query=q, location=location)
    for job in fetched:
        match = calculate_match(resume_text, f"{job.get('title','')}\n{job.get('description','')}")
        job.update({
            "match_score": match["match_score"],
            "match": match["match_score"],
            "match_reasons": match["match_reasons"],
            "missing_skills": match["missing_skills"],
        })
        save_job(job)
    return get_jobs()

@router.get("/{job_id}")
def job_details(job_id: int):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job

@router.post("/{job_id}/apply")
def apply_to_job(job_id: int, payload: ApplyRequest | None = None):
    if not get_job(job_id):
        raise HTTPException(status_code=404, detail="Job not found.")
    resume_name = payload.resume_name if payload else ""
    return process_job_application(job_id, resume_name)
