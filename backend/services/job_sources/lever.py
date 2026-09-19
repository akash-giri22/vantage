from concurrent.futures import ThreadPoolExecutor, as_completed

import requests


COMPANIES = [
    "zeta",
    "nium",
    "peoplegrove",
    "portcast",
    "wahed.com",
    "dnb",
    "smart-working-solutions",
]


def _fetch_company(company_name: str) -> list[dict]:
    try:
        res = requests.get(
            f"https://api.lever.co/v0/postings/{company_name}",
            params={"mode": "json"},
            timeout=7,
        )

        if res.status_code != 200:
            print(f"[lever] {company_name}: HTTP {res.status_code}")
            return []

        jobs = []

        for job in res.json():
            categories = job.get("categories") or {}
            apply_url = job.get("applyUrl") or job.get("hostedUrl") or ""
            description = (
                job.get("descriptionPlain")
                or job.get("description")
                or ""
            )

            jobs.append(
                {
                    "external_id": f"lever-{job.get('id', '')}",
                    "source": "Lever",
                    "title": job.get("text", "Unknown Role"),
                    "company": company_name.replace("-", " ").title(),
                    "location": categories.get("location", ""),
                    "description": description,
                    "source_url": job.get("hostedUrl", apply_url),
                    "apply_url": apply_url,
                    "posted_at": "",
                    "automation_supported": False,
                }
            )

        return jobs

    except requests.RequestException as exc:
        print(f"[lever] {company_name} request error: {exc}")
        return []
    except Exception as exc:
        print(f"[lever] {company_name} parsing error: {exc}")
        return []


def fetch_lever_jobs(
    company: str | None = None,
    limit: int = 60,
) -> list[dict]:
    companies = [company] if company else COMPANIES
    jobs: list[dict] = []

    with ThreadPoolExecutor(max_workers=min(7, len(companies))) as executor:
        futures = {
            executor.submit(_fetch_company, company_name): company_name
            for company_name in companies
        }

        for future in as_completed(futures):
            company_name = futures[future]
            try:
                jobs.extend(future.result() or [])
            except Exception as exc:
                print(f"[lever] {company_name} worker error: {exc}")

    print(f"[lever] Fetched {len(jobs)} jobs")
    return jobs[:limit]
