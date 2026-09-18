from datetime import datetime
from typing import Any

from services.job_sources.adzuna import fetch_adzuna_jobs
from services.job_sources.greenhouse import fetch_greenhouse_jobs
from services.job_sources.lever import fetch_lever_jobs


def normalize_job(raw_job: dict[str, Any]) -> dict[str, Any]:
    """
    Convert jobs from different sources into one common format.
    """

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

    title = (
        raw_job.get("title")
        or raw_job.get("name")
        or "Unknown Role"
    )

    company = (
        raw_job.get("company")
        or raw_job.get("company_name")
        or raw_job.get("organization")
        or "Unknown Company"
    )

    location = (
        raw_job.get("location")
        or raw_job.get("location_name")
        or ""
    )

    description = (
        raw_job.get("description")
        or raw_job.get("content")
        or ""
    )

    source = (
        raw_job.get("source")
        or "Unknown"
    )

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

    posted_at = raw_job.get("posted_at")

    automation_supported = bool(
        raw_job.get("automation_supported", False)
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
        "posted_at": posted_at,
        "automation_supported": automation_supported,
        "discovered_at": datetime.utcnow().isoformat(),
    }


def fetch_jobs(
    query: str = "software developer",
    location: str = "India",
    greenhouse_boards: list[str] | None = None,
    lever_sites: list[str] | None = None,
) -> list[dict]:
    jobs: list[dict] = []

    # ---------------------------------------------------------
    # ADZUNA
    # ---------------------------------------------------------
    try:
        adzuna_jobs = fetch_adzuna_jobs(
            query=query,
            location=location,
        )

        if adzuna_jobs:
            jobs.extend(adzuna_jobs)

    except Exception as exc:
        print(f"[job_aggregator] Adzuna error: {exc}")

    # ---------------------------------------------------------
    # GREENHOUSE
    # ---------------------------------------------------------
    for board in greenhouse_boards or []:
        try:
            greenhouse_jobs = fetch_greenhouse_jobs(board)

            if greenhouse_jobs:
                jobs.extend(greenhouse_jobs)

        except Exception as exc:
            print(
                f"[job_aggregator] "
                f"Greenhouse {board} error: {exc}"
            )

    # ---------------------------------------------------------
    # LEVER
    # ---------------------------------------------------------
    for site in lever_sites or []:
        try:
            lever_jobs = fetch_lever_jobs(site)

            if lever_jobs:
                jobs.extend(lever_jobs)

        except Exception as exc:
            print(
                f"[job_aggregator] "
                f"Lever {site} error: {exc}"
            )

    # ---------------------------------------------------------
    # NORMALIZE + REMOVE DUPLICATES
    # ---------------------------------------------------------
    normalized_jobs: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for raw_job in jobs:
        try:
            job = normalize_job(raw_job)

            # Ignore completely invalid records.
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
            print(
                f"[job_aggregator] "
                f"Could not normalize job: {exc}"
            )

    return normalized_jobs