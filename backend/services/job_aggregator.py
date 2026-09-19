from datetime import datetime
from typing import Any

from services.job_sources.adzuna import (
    fetch_adzuna_jobs,
)

from services.job_sources.greenhouse import (
    fetch_greenhouse_jobs,
)

from services.job_sources.lever import (
    fetch_lever_jobs,
)


def normalize_job(
    raw_job: dict[str, Any]
) -> dict[str, Any]:

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

    posted_at = (
        raw_job.get("posted_at")
        or ""
    )

    automation_supported = bool(
        raw_job.get(
            "automation_supported",
            False,
        )
    )

    return {
        "external_id":
            str(external_id or ""),

        "title":
            title,

        "company":
            company,

        "location":
            location,

        "description":
            description,

        "source":
            source,

        "source_url":
            source_url,

        "apply_url":
            apply_url,

        "posted_at":
            posted_at,

        "automation_supported":
            automation_supported,

        "discovered_at":
            datetime.utcnow().isoformat(),
    }


def fetch_jobs(
    query: str = "software developer",
    location: str = "India",
    greenhouse_boards: list[str] | None = None,
    lever_sites: list[str] | None = None,
) -> list[dict]:

    jobs: list[dict] = []

    # =====================================================
    # ADZUNA
    # =====================================================

    try:
        adzuna_jobs = fetch_adzuna_jobs(
            query=query,
            location=location,
        )

        jobs.extend(
            adzuna_jobs or []
        )

        print(
            f"[aggregator] Adzuna: "
            f"{len(adzuna_jobs or [])}"
        )

    except Exception as exc:
        print(
            f"[aggregator] "
            f"Adzuna error: {exc}"
        )

    # =====================================================
    # GREENHOUSE
    # =====================================================

    try:

        # IMPORTANT FIX:
        # Previously None meant the loop never ran.
        if greenhouse_boards:

            for board in greenhouse_boards:
                board_jobs = (
                    fetch_greenhouse_jobs(
                        board_token=board,
                        limit=25,
                    )
                )

                jobs.extend(
                    board_jobs or []
                )

        else:

            greenhouse_jobs = (
                fetch_greenhouse_jobs(
                    limit=50,
                )
            )

            jobs.extend(
                greenhouse_jobs or []
            )

        print(
            "[aggregator] Greenhouse loaded"
        )

    except Exception as exc:
        print(
            f"[aggregator] "
            f"Greenhouse error: {exc}"
        )

    # =====================================================
    # LEVER
    # =====================================================

    try:

        # IMPORTANT FIX:
        # Old aggregator was passing site into the
        # `limit` argument of fetch_lever_jobs().
        if lever_sites:

            for site in lever_sites:

                site_jobs = (
                    fetch_lever_jobs(
                        company=site,
                        limit=25,
                    )
                )

                jobs.extend(
                    site_jobs or []
                )

        else:

            lever_jobs = (
                fetch_lever_jobs(
                    limit=50,
                )
            )

            jobs.extend(
                lever_jobs or []
            )

        print(
            "[aggregator] Lever loaded"
        )

    except Exception as exc:
        print(
            f"[aggregator] "
            f"Lever error: {exc}"
        )

    # =====================================================
    # NORMALIZE + DEDUPE
    # =====================================================

    normalized_jobs: list[dict] = []

    seen: set[
        tuple[str, str]
    ] = set()

    for raw_job in jobs:

        try:

            job = normalize_job(
                raw_job
            )

            if (
                not job["external_id"]
                and not job["apply_url"]
            ):
                continue

            unique_key = (
                job["source"].lower(),
                job["external_id"]
                or job["apply_url"],
            )

            if unique_key in seen:
                continue

            seen.add(
                unique_key
            )

            normalized_jobs.append(
                job
            )

        except Exception as exc:

            print(
                "[aggregator] "
                "Could not normalize "
                f"job: {exc}"
            )

    print(
        "[aggregator] TOTAL "
        f"{len(normalized_jobs)} jobs"
    )

    return normalized_jobs
