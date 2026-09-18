from datetime import datetime, timezone
from services.job_store import get_job, create_application, update_application, get_applications
from services.notification_service import notify_manual_action, notify_application_success

MANUAL_ONLY_SOURCES = {"adzuna", "linkedin", "naukri", "indeed", "glassdoor"}

def _already_applied(job_id):
    for app in get_applications():
        if app["job_id"] == job_id and app["status"] == "applied":
            return True
    return False

def process_job_application(job_id: int, resume_name: str = "") -> dict:
    job = get_job(job_id)
    if not job:
        return {"status":"failed","message":"Job not found."}
    if _already_applied(job_id):
        return {"status":"applied","message":"Already marked as applied.","job_id":job_id}

    mode = "automatic" if job.get("automation_supported") else "manual"
    application_id = create_application(job_id, "applying", mode, resume_name)

    apply_url = job.get("apply_url") or ""
    if not apply_url:
        update_application(application_id, "failed", error_message="No application URL available.")
        return {"status":"failed","application_id":application_id,"message":"No application URL available."}

    source = (job.get("source") or "").lower()
    if source in MANUAL_ONLY_SOURCES or not job.get("automation_supported"):
        reason = "This source is not configured for authorized automatic submission."
        update_application(application_id, "manual_action_required", action_required=reason)
        notify_manual_action(job["title"], job["company"], apply_url, reason)
        return {
            "status":"manual_action_required",
            "application_id":application_id,
            "apply_url":apply_url,
            "message":reason,
        }

    # Automatic submission is intentionally limited to adapters that have an
    # explicit, authorized submission contract. No CAPTCHA/anti-bot bypassing.
    reason = "Automatic adapter not configured for this employer; manual application required."
    update_application(application_id, "manual_action_required", action_required=reason)
    notify_manual_action(job["title"], job["company"], apply_url, reason)
    return {
        "status":"manual_action_required",
        "application_id":application_id,
        "apply_url":apply_url,
        "message":reason,
    }
