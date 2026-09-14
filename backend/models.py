from pydantic import BaseModel
from typing import List, Optional


class BreakdownRow(BaseModel):
    label: str
    value: int
    tone: str


class ResumeScoreResponse(BaseModel):
    score: int
    breakdown: List[BreakdownRow]
    note: str
    resume_text: str = ""


class TailorRequest(BaseModel):
    resume_text: str
    job_description: str = ""


class ResumeChange(BaseModel):
    section: str
    original: str
    revised: str


class TailorResponse(BaseModel):
    summary: str
    changes: List[ResumeChange]

    rewritten_resume: str

    # New ATS score after AI optimization
    updated_score: int
    updated_breakdown: List[BreakdownRow]
    updated_note: str

    # PDF download
    download_filename: str
    download_base64: str


class JobListing(BaseModel):
    id: int
    title: str
    company: str
    meta: str
    match: int
    source: str
    description: str
    apply_url: Optional[str] = None