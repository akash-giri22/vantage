from concurrent.futures import ThreadPoolExecutor, as_completed

import requests


GREENHOUSE_URL = "https://boards-api.greenhouse.io/v1/boards"

DEFAULT_COMPANIES = [
    "openai",
    "stripe",
    "notion",
    "canva",
    "atlassian",
    "airbnb",
]


def _fetch_company(company: str) -> list[dict]:
    try:
        response = requests.get(
            f"{GREENHOUSE_URL}/{company}/jobs",
            params={"content": "true"},
            timeout=7,
        )

        if response.status_code != 200:
            print(f"[greenhouse] {company}: HTTP {response.status_code}")
            return []

        results = response.json().get("jobs", [])
        jobs = []

        for job in results:
            location = job.get("location") or {}
            apply_url = job.get("absolute_url", "")

            jobs.append(
                {
                    "external_id": f"greenhouse-{job.get('id')}",
                    "source": "Greenhouse",
                    "title": job.get("title", "Unknown Role"),
                    "company": company.title(),
                    "location": location.get("name", "Remote"),
                    "source_url": apply_url,
                    "apply_url": apply_url,
                    "description": job.get("content", ""),
                    "posted_at": "",
                    "automation_supported": False,
                }
            )

        return jobs

    except requests.RequestException as exc:
        print(f"[greenhouse] {company} request error: {exc}")
        return []
    except Exception as exc:
        print(f"[greenhouse] {company} parsing error: {exc}")
        return []


def fetch_greenhouse_jobs(
    board_token=None,
    limit=60,
):
    companies = [board_token] if board_token else DEFAULT_COMPANIES

    jobs = []

    with ThreadPoolExecutor(max_workers=min(6, len(companies))) as executor:
        futures = {
            executor.submit(_fetch_company, company): company
            for company in companies
        }

        for future in as_completed(futures):
            company = futures[future]
            try:
                jobs.extend(future.result() or [])
            except Exception as exc:
                print(f"[greenhouse] {company} worker error: {exc}")

    return jobs[:limit]
