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


def fetch_greenhouse_jobs(
    board_token=None,
    limit=25,
):
    """
    Fetch published jobs from a Greenhouse job board.

    board_token:
        Greenhouse board/company token.
        If not supplied, the default company list is used.
    """

    companies = (
        [board_token]
        if board_token
        else DEFAULT_COMPANIES
    )

    jobs = []

    for company in companies:
        try:
            response = requests.get(
                f"{GREENHOUSE_URL}/{company}/jobs",
                params={
                    "content": "true",
                },
                timeout=15,
            )

            if response.status_code != 200:
                continue

            data = response.json()
            results = data.get("jobs", [])

            for job in results:
                location = job.get("location") or {}

                jobs.append(
                    {
                        "external_id": f"greenhouse-{job.get('id')}",
                        "source": "Greenhouse",
                        "title": job.get(
                            "title",
                            "Unknown Role",
                        ),
                        "company": company.title(),
                        "location": location.get(
                            "name",
                            "Remote",
                        ),
                        "source_url": job.get(
                            "absolute_url",
                            "",
                        ),
                        "apply_url": job.get(
                            "absolute_url",
                            "",
                        ),
                        "description": job.get(
                            "content",
                            "",
                        ),
                        "posted_at": None,
                        "automation_supported": True,
                    }
                )

                if len(jobs) >= limit:
                    return jobs

        except requests.RequestException as exc:
            print(
                f"[greenhouse] {company} request error: {exc}"
            )

        except Exception as exc:
            print(
                f"[greenhouse] {company} parsing error: {exc}"
            )

    return jobs