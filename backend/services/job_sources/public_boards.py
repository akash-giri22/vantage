import os
import re
from html import unescape

import requests


DEFAULT_TIMEOUT = 8


def _clean_html(value: str) -> str:
    text = unescape(value or "")
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\\s+", " ", text)
    return text.strip()


def _matches_query(job: dict, query: str, location: str) -> bool:
    if not query and not location:
        return True

    haystack = " ".join(
        [
            str(job.get("title") or ""),
            str(job.get("company") or ""),
            str(job.get("location") or ""),
            str(job.get("description") or ""),
        ]
    ).lower()

    query_terms = [
        term for term in re.findall(r"[a-z0-9+#.]+", query.lower())
        if len(term) > 2
    ]

    location_text = (location or "").lower().strip()

    query_ok = not query_terms or any(term in haystack for term in query_terms)
    location_ok = (
        not location_text
        or location_text in haystack
        or "india" in haystack
        or "worldwide" in haystack
        or "remote" in haystack
    )

    return query_ok and location_ok


def fetch_himalayas_jobs(
    query: str = "software developer",
    location: str = "India",
    limit: int = 20,
) -> list[dict]:
    try:
        params = {
            "q": query,
            "country": "IN",
            "sort": "recent",
            "page": 1,
        }
        response = requests.get(
            "https://himalayas.app/jobs/api/search",
            params=params,
            headers={"User-Agent": "Vantage/1.0 job discovery"},
            timeout=DEFAULT_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
    except Exception as exc:
        print(f"[himalayas] error: {exc}")
        return []

    jobs = []
    for item in data.get("jobs", []):
        job = {
            "external_id": f"himalayas-{item.get('guid') or item.get('id')}",
            "source": "Himalayas",
            "title": item.get("title") or "Unknown Role",
            "company": item.get("companyName") or "Unknown Company",
            "location": ", ".join(item.get("locationRestrictions") or []) or "Remote",
            "description": _clean_html(
                item.get("description") or item.get("excerpt")
            ),
            "source_url": item.get("applicationLink") or "",
            "apply_url": item.get("applicationLink") or "",
            "posted_at": item.get("pubDate") or "",
            "automation_supported": False,
        }
        jobs.append(job)
        if len(jobs) >= limit:
            break

    print(f"[himalayas] loaded {len(jobs)}")
    return jobs


def fetch_jobicy_jobs(
    query: str = "software developer",
    location: str = "India",
    limit: int = 30,
) -> list[dict]:
    try:
        response = requests.get(
            "https://jobicy.com/api/v2/remote-jobs",
            params={"count": min(limit, 200)},
            headers={"User-Agent": "Vantage/1.0 job discovery"},
            timeout=DEFAULT_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
    except Exception as exc:
        print(f"[jobicy] error: {exc}")
        return []

    jobs = []
    for item in data.get("jobs", []):
        job = {
            "external_id": f"jobicy-{item.get('id')}",
            "source": "Jobicy",
            "title": item.get("jobTitle") or "Unknown Role",
            "company": item.get("companyName") or "Unknown Company",
            "location": item.get("jobGeo") or "Remote",
            "description": _clean_html(item.get("jobDescription")),
            "source_url": item.get("url") or "",
            "apply_url": item.get("url") or "",
            "posted_at": item.get("pubDate") or item.get("jobPostingDate") or "",
            "automation_supported": False,
        }

        if _matches_query(job, query, location):
            jobs.append(job)

        if len(jobs) >= limit:
            break

    print(f"[jobicy] loaded {len(jobs)}")
    return jobs


def fetch_arbeitnow_jobs(
    query: str = "software developer",
    location: str = "India",
    limit: int = 30,
) -> list[dict]:
    try:
        response = requests.get(
            "https://www.arbeitnow.com/api/job-board-api",
            params={"page": 1},
            headers={"User-Agent": "Vantage/1.0 job discovery"},
            timeout=DEFAULT_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
    except Exception as exc:
        print(f"[arbeitnow] error: {exc}")
        return []

    jobs = []
    for item in data.get("data", []):
        job = {
            "external_id": f"arbeitnow-{item.get('slug') or item.get('id')}",
            "source": "Arbeitnow",
            "title": item.get("title") or "Unknown Role",
            "company": item.get("company_name") or "Unknown Company",
            "location": item.get("location") or "Remote",
            "description": _clean_html(item.get("description")),
            "source_url": item.get("url") or "",
            "apply_url": item.get("url") or "",
            "posted_at": item.get("created_at") or "",
            "automation_supported": False,
        }

        if _matches_query(job, query, location):
            jobs.append(job)

        if len(jobs) >= limit:
            break

    print(f"[arbeitnow] loaded {len(jobs)}")
    return jobs


def fetch_themuse_jobs(
    query: str = "software developer",
    location: str = "India",
    limit: int = 30,
) -> list[dict]:
    try:
        response = requests.get(
            "https://www.themuse.com/api/public/jobs",
            params={"page": 1},
            headers={"User-Agent": "Vantage/1.0 job discovery"},
            timeout=DEFAULT_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
    except Exception as exc:
        print(f"[themuse] error: {exc}")
        return []

    jobs = []
    for item in data.get("results", []):
        locations = [
            value.get("name", "")
            for value in (item.get("locations") or [])
            if isinstance(value, dict)
        ]
        refs = item.get("refs") or {}
        job = {
            "external_id": f"themuse-{item.get('id')}",
            "source": "The Muse",
            "title": item.get("name") or "Unknown Role",
            "company": (item.get("company") or {}).get("name") or "Unknown Company",
            "location": ", ".join(filter(None, locations)) or "Location not specified",
            "description": _clean_html(item.get("contents") or ""),
            "source_url": refs.get("landing_page") or "",
            "apply_url": refs.get("landing_page") or "",
            "posted_at": item.get("publication_date") or "",
            "automation_supported": False,
        }

        if _matches_query(job, query, location):
            jobs.append(job)

        if len(jobs) >= limit:
            break

    print(f"[themuse] loaded {len(jobs)}")
    return jobs


def fetch_adzuna_jobs(
    query: str = "software developer",
    location: str = "India",
    limit: int = 30,
) -> list[dict]:
    app_id = os.getenv("ADZUNA_APP_ID", "").strip()
    app_key = os.getenv("ADZUNA_APP_KEY", "").strip()

    if not app_id or not app_key:
        return []

    try:
        response = requests.get(
            "https://api.adzuna.com/v1/api/jobs/in/search/1",
            params={
                "app_id": app_id,
                "app_key": app_key,
                "results_per_page": min(limit, 50),
                "what": query,
                "where": location if location.lower() != "india" else "",
                "sort_by": "date",
                "content-type": "application/json",
            },
            headers={"User-Agent": "Vantage/1.0 job discovery"},
            timeout=DEFAULT_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
    except Exception as exc:
        print(f"[adzuna] error: {exc}")
        return []

    jobs = []
    for item in data.get("results", []):
        company = item.get("company") or {}
        location_data = item.get("location") or {}
        apply_url = item.get("redirect_url") or ""
        job = {
            "external_id": f"adzuna-{item.get('id')}",
            "source": "Adzuna",
            "title": item.get("title") or "Unknown Role",
            "company": company.get("display_name") or "Unknown Company",
            "location": location_data.get("display_name") or location,
            "description": _clean_html(item.get("description") or ""),
            "source_url": apply_url,
            "apply_url": apply_url,
            "posted_at": item.get("created") or "",
            "automation_supported": False,
        }
        jobs.append(job)

    print(f"[adzuna] loaded {len(jobs)}")
    return jobs
