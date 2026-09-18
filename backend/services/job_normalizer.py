import requests


def fetch(
    site: str,
    limit: int = 100,
):
    if not site:
        return []

    url = (
        "https://api.lever.co/v0/postings/"
        f"{site}"
    )

    response = requests.get(
        url,
        params={
            "mode": "json",
        },
        timeout=15,
    )

    response.raise_for_status()

    jobs = []

    for job in response.json()[:limit]:
        categories = job.get(
            "categories",
            {},
        )

        jobs.append(
            {
                "external_id": str(
                    job.get("id")
                ),
                "title": job.get(
                    "text",
                    "Unknown role",
                ),
                "company": site,
                "location": categories.get(
                    "location",
                    "",
                ),
                "description": (
                    job.get("descriptionPlain")
                    or job.get(
                        "description",
                        "",
                    )
                ),
                "source": "Lever",
                "source_url": job.get(
                    "hostedUrl",
                    "",
                ),
                "apply_url": job.get(
                    "applyUrl",
                    job.get(
                        "hostedUrl",
                        "",
                    ),
                ),
                "posted_at": "",
                "automation_supported": True,
                "lever_site": site,
            }
        )

    return jobs