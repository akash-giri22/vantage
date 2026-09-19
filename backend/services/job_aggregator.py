from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Any

from services.job_sources.greenhouse import fetch_greenhouse_jobs
from services.job_sources.lever import fetch_lever_jobs
from services.job_sources.public_boards import (
    fetch_arbeitnow_jobs,
    fetch_himalayas_jobs,
    fetch_jobicy_jobs,
)


def normalize_job(raw_job: dict[str, Any]) -> dict[str, Any]:
    external_id = (
        raw_job.get("external_id")
        or raw_job.get("id")
        or raw_job.get("job_id")
        or raw_job.get("requisition_id")
        or raw_job.get("posting_id")
        or raw_job.get("slug")
        or raw_job.get("url")
        or raw_job.get("apply_url")
    )

    title = raw_job.get("title") or raw_job.get("name") or "Unknown Role"
    company = (
        raw_job.get("company")
        or raw_job.get("company_name")
        or raw_job.get("organization")
        or "Unknown Company"
    )
    location = raw_job.get("location") or raw_job.get("location_name") or ""
    description = raw_job.get("description") or raw_job.get("content") or ""
    source = raw_job.get("source") or "Unknown"
    source_url = (
        raw_job.get("source_url")
        or raw_job.get("url")
        or raw_job.get("apply_url")
        or ""
    )
    apply_url = (
        raw_job.get("apply_url")
        or raw_job.get("url")
        or raw_job.get("source_url")
        or ""
    )

    return {
        "external_id": str(external_id or ""),
        "title": title,
        "company": company,
        "location": location,
        "description": description,
        "source": source,
        "source_url": source_url,
        "apply_url": apply_url,
        "posted_at": raw_job.get("posted_at") or "",
        "automation_supported": bool(raw_job.get("automation_supported", False)),
        "discovered_at": datetime.utcnow().isoformat(),
    }


def _source_jobs(
    query: str,
    location: str,
    greenhouse_boards: list[str] | None,
    lever_sites: list[str] | None,
) -> list[dict]:
    tasks = {
        "Greenhouse": lambda: (
            [
                job
                for board in greenhouse_boards
                for job in fetch_greenhouse_jobs(board_token=board, limit=25)
            ]
            if greenhouse_boards
            else fetch_greenhouse_jobs(limit=60)
        ),
        "Lever": lambda: (
            [
                job
                for site in lever_sites
                for job in fetch_lever_jobs(company=site, limit=25)
            ]
            if lever_sites
            else fetch_lever_jobs(limit=60)
        ),
        "Himalayas": lambda: fetch_himalayas_jobs(
            query=query, location=location, limit=20
        ),
        "Jobicy": lambda: fetch_jobicy_jobs(
            query=query, location=location, limit=30
        ),
        "Arbeitnow": lambda: fetch_arbeitnow_jobs(
            query=query, location=location, limit=30
        ),
    }

    jobs: list[dict] = []

    with ThreadPoolExecutor(max_workers=len(tasks)) as executor:
        futures = {
            executor.submit(fn): name
            for name, fn in tasks.items()
        }

        for future in as_completed(futures):
            name = futures[future]
            try:
                result = future.result() or []
                jobs.extend(result)
                print(f"[aggregator] {name}: {len(result)}")
            except Exception as exc:
                print(f"[aggregator] {name} error: {exc}")

    return jobs


def fetch_jobs(
    query: str = "software developer",
    location: str = "India",
    greenhouse_boards: list[str] | None = None,
    lever_sites: list[str] | None = None,
) -> list[dict]:
    raw_jobs = _source_jobs(
        query=query,
        location=location,
        greenhouse_boards=greenhouse_boards,
        lever_sites=lever_sites,
    )

    normalized_jobs: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for raw_job in raw_jobs:
        try:
            job = normalize_job(raw_job)

            if not job["external_id"] and not job["apply_url"]:
                continue

            unique_key = (
                job["source"].lower(),
                job["external_id"] or job["apply_url"],
            )

            if unique_key in seen:
                continue

            seen.add(unique_key)
            normalized_jobs.append(job)

        except Exception as exc:
            print(f"[aggregator] normalize error: {exc}")

    print(f"[aggregator] TOTAL {len(normalized_jobs)} jobs")
    return normalized_jobs
