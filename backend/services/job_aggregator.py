import os
import requests

ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY")
ADZUNA_URL = "https://api.adzuna.com/v1/api/jobs/in/search/1"  # "in" = India


def fetch_jobs(query: str = "software developer", location: str = "India") -> list[dict]:
    """
    Pulls live listings from Adzuna's free tier. Returns [] if no API keys are
    configured yet, so the frontend can fall back to its own demo data.
    """
    if not (ADZUNA_APP_ID and ADZUNA_APP_KEY):
        return []

    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "what": query,
        "where": location,
        "results_per_page": 10,
    }
    res = requests.get(ADZUNA_URL, params=params, timeout=10)
    res.raise_for_status()
    results = res.json().get("results", [])

    return [
        {
            "id": job["id"],
            "title": job["title"],
            "company": job.get("company", {}).get("display_name", "Unknown"),
            "meta": f"{job.get('location', {}).get('display_name', '')} · {job.get('salary_is_predicted', '')}",
            "match": 0,  # TODO: compute against the user's stored resume via ats_scorer
            "source": "Adzuna",
            "description": job.get("description", ""),
            "apply_url": job.get("redirect_url"),
            "external": False,
        }
        for job in results
    ]
