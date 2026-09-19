import requests


# Verified live Lever career boards with India / Mumbai roles.
COMPANIES = [
    "zeta",
    "nium",
    "peoplegrove",
    "portcast",
    "wahed.com",
    "dnb",
    "smart-working-solutions",
]


def fetch_lever_jobs(
    company: str | None = None,
    limit: int = 50,
) -> list[dict]:

    companies = [company] if company else COMPANIES

    jobs: list[dict] = []

    for company_name in companies:
        try:
            res = requests.get(
                f"https://api.lever.co/v0/postings/{company_name}",
                params={"mode": "json"},
                timeout=15,
            )

            if res.status_code != 200:
                print(
                    f"[lever] {company_name}: "
                    f"HTTP {res.status_code}"
                )
                continue

            data = res.json()

            for job in data:
                categories = job.get("categories") or {}

                apply_url = (
                    job.get("applyUrl")
                    or job.get("hostedUrl")
                    or ""
                )

                description = (
                    job.get("descriptionPlain")
                    or job.get("description")
                    or ""
                )

                jobs.append(
                    {
                        "external_id":
                            f"lever-{job.get('id', '')}",

                        "source":
                            "Lever",

                        "title":
                            job.get(
                                "text",
                                "Unknown Role",
                            ),

                        "company":
                            company_name.replace(
                                "-",
                                " ",
                            ).title(),

                        "location":
                            categories.get(
                                "location",
                                "",
                            ),

                        "description":
                            description,

                        "source_url":
                            job.get(
                                "hostedUrl",
                                apply_url,
                            ),

                        "apply_url":
                            apply_url,

                        "posted_at":
                            "",

                        # Employer-specific forms still need
                        # mapping before true auto-submit.
                        "automation_supported":
                            False,
                    }
                )

                if len(jobs) >= limit:
                    return jobs

        except requests.RequestException as exc:
            print(
                f"[lever] {company_name} "
                f"request error: {exc}"
            )

        except Exception as exc:
            print(
                f"[lever] {company_name} "
                f"parsing error: {exc}"
            )

    print(
        f"[lever] Fetched {len(jobs)} jobs"
    )

    return jobs
