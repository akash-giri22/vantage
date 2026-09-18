import requests

DEFAULT_COMPANIES = ["netflix", "figma", "coinbase", "sourcegraph"]

def fetch_lever_jobs(site=None, limit=50):
    companies = [site] if site else DEFAULT_COMPANIES
    jobs = []
    for company in companies:
        try:
            response = requests.get(
                f"https://api.lever.co/v0/postings/{company}",
                params={"mode":"json"},
                timeout=15,
            )
            if response.status_code != 200:
                continue
            for job in response.json():
                categories = job.get("categories") or {}
                jobs.append({
                    "external_id": f"lever-{job.get('id')}",
                    "source": "Lever",
                    "title": job.get("text","Unknown Role"),
                    "company": company.title(),
                    "location": categories.get("location","Remote"),
                    "source_url": job.get("hostedUrl",""),
                    "apply_url": job.get("applyUrl") or job.get("hostedUrl",""),
                    "description": job.get("descriptionPlain",""),
                    "posted_at": None,
                    "automation_supported": False,
                })
                if len(jobs) >= limit:
                    return jobs
        except requests.RequestException as exc:
            print(f"[lever] {company}: {exc}")
    return jobs
