import os
import requests


ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY")

ADZUNA_URL = "https://api.adzuna.com/v1/api/jobs/in/search/1"


def fetch_adzuna_jobs(
    query: str = "software developer",
    location: str = "India",
) -> list[dict]:
    """
    Fetch jobs from Adzuna and return them
    in Vantage's common job format.
    """

    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        print(
            "[adzuna] ADZUNA_APP_ID or ADZUNA_APP_KEY "
            "is missing."
        )
        return []

    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "what": query,
        "where": location,
        "results_per_page": 20,
    }

    try:
        response = requests.get(
            ADZUNA_URL,
            params=params,
            timeout=15,
        )

        response.raise_for_status()

        data = response.json()
        results = data.get("results", [])

        jobs = []

        for job in results:
            location_data = job.get("location", {})

            company_data = job.get("company", {})

            external_id = job.get("id")

            title = job.get(
                "title",
                "Unknown Role",
            )

            company = company_data.get(
                "display_name",
                "Unknown Company",
            )

            location_name = location_data.get(
                "display_name",
                location,
            )

            description = job.get(
                "description",
                "",
            )

            apply_url = job.get(
                "redirect_url",
                "",
            )

            jobs.append(
                {
                    "external_id": str(
                        external_id or ""
                    ),
                    "title": title,
                    "company": company,
                    "location": location_name,
                    "description": description,
                    "source": "Adzuna",
                    "source_url": apply_url,
                    "apply_url": apply_url,
                    "posted_at": job.get("created"),
                    "automation_supported": False,
                }
            )

        print(
            f"[adzuna] Fetched {len(jobs)} jobs "
            f"for query='{query}', "
            f"location='{location}'"
        )

        return jobs

    except requests.RequestException as exc:
        print(f"[adzuna] Request error: {exc}")
        return []

    except Exception as exc:
        print(f"[adzuna] Unexpected error: {exc}")
        return []