from datetime import datetime, timezone
from typing import Any

from services.job_sources.adzuna import fetch_adzuna_jobs
from services.job_sources.greenhouse import fetch_greenhouse_jobs
from services.job_sources.lever import fetch_lever_jobs

def normalize_job(raw_job: dict[str, Any]) -> dict[str, Any]:
    external_id = (
        raw_job.get("external_id") or raw_job.get("id") or raw_job.get("job_id")
        or raw_job.get("requisition_id") or raw_job.get("posting_id")
        or raw_job.get("slug") or raw_job.get("url") or raw_job.get("apply_url")
    )
    return {
        "external_id": str(external_id or ""),
        "title": raw_job.get("title") or raw_job.get("name") or "Unknown Role",
        "company": raw_job.get("company") or raw_job.get("company_name") or raw_job.get("organization") or "Unknown Company",
        "location": raw_job.get("location") or raw_job.get("location_name") or "",
        "description": raw_job.get("description") or raw_job.get("content") or "",
        "source": raw_job.get("source") or "Unknown",
        "source_url": raw_job.get("source_url") or raw_job.get("url") or raw_job.get("apply_url") or "",
        "apply_url": raw_job.get("apply_url") or raw_job.get("url") or raw_job.get("source_url") or "",
        "posted_at": raw_job.get("posted_at"),
        "automation_supported": bool(raw_job.get("automation_supported", False)),
        "discovered_at": datetime.now(timezone.utc).isoformat(),
    }

def fetch_jobs(query="software developer", location="India", greenhouse_boards=None, lever_sites=None):
    jobs = []
    try:
        jobs.extend(fetch_adzuna_jobs(query=query, location=location) or [])
    except Exception as exc:
        print(f"[job_aggregator] Adzuna: {exc}")

    for board in greenhouse_boards or []:
        try:
            jobs.extend(fetch_greenhouse_jobs(board) or [])
        except Exception as exc:
            print(f"[job_aggregator] Greenhouse {board}: {exc}")

    for site in lever_sites or []:
        try:
            jobs.extend(fetch_lever_jobs(site) or [])
        except Exception as exc:
            print(f"[job_aggregator] Lever {site}: {exc}")

    normalized, seen = [], set()
    for raw in jobs:
        try:
            job = normalize_job(raw)
            key = (job["source"].lower(), job["external_id"] or job["apply_url"])
            if not key[1] or key in seen:
                continue
            seen.add(key)
            normalized.append(job)
        except Exception as exc:
            print(f"[job_aggregator] normalize error: {exc}")
    return normalized
