import requests

COMPANIES = [
    "netflix",
    "figma",
    "coinbase",
    "sourcegraph",
]


def fetch_lever_jobs(limit=25):
    jobs = []

    for company in COMPANIES:
        try:
            res = requests.get(
                f"https://api.lever.co/v0/postings/{company}?mode=json",
                timeout=10,
            )

            if res.status_code != 200:
                continue

            data = res.json()

            for job in data[:5]:
                jobs.append(
                    {
                        "external_id": f"lever-{job['id']}",
                        "source": "Lever",
                        "title": job["text"],
                        "company": company.title(),
                        "location": job["categories"]["location"],
                        "url": job["hostedUrl"],
                        "description": job["descriptionPlain"],
                    }
                )

                if len(jobs) >= limit:
                    return jobs

        except Exception:
            continue

    return jobs