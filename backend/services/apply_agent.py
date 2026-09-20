import os

from services.job_store import (
    get_job,
    create_application,
    update_application,
    get_daily_application_count,
)
from services.notification_service import (
    notify_manual_action,
    notify_application_success,
)


DAILY_APPLY_CAP = int(os.getenv("DAILY_APPLY_CAP", "7"))


def process_job_application(
    job_id: int,
    resume_name: str = "",
) -> dict:
    job = get_job(job_id)

    if not job:
        return {
            "status": "failed",
            "message": "Job not found.",
        }

    source = (job.get("source") or "").lower()
    apply_url = job.get("apply_url") or ""

    if not apply_url:
        return {
            "status": "failed",
            "message": "No application URL available.",
        }

    # Manual applications do not consume Vantage's automatic-apply cap.
    # The user completes the application on the original job site.
    if not job.get("automation_supported"):
        application_id = create_application(
            job_id=job_id,
            status="manual_action_required",
            apply_mode="manual",
            resume_name=resume_name,
        )

        reason = (
            "Manual application: continue on the original job site. "
            "Vantage does not store or enter your third-party account password."
        )

        update_application(
            application_id=application_id,
            status="manual_action_required",
            error_message=reason,
            action_required=True,
        )

        notify_manual_action(
            title=job["title"],
            company=job["company"],
            apply_url=apply_url,
            reason=reason,
        )

        return {
            "status": "manual_action_required",
            "application_id": application_id,
            "apply_url": apply_url,
            "applies_today": get_daily_application_count(),
            "daily_apply_cap": DAILY_APPLY_CAP,
            "message": reason,
        }

    used_today = get_daily_application_count()

    if used_today >= DAILY_APPLY_CAP:
        return {
            "status": "daily_cap_reached",
            "daily_apply_cap": DAILY_APPLY_CAP,
            "applies_today": used_today,
            "message": (
                f"Daily application cap of {DAILY_APPLY_CAP} "
                "has been reached."
            ),
        }

    application_id = create_application(
        job_id=job_id,
        status="applying",
        apply_mode="automatic" if job.get("automation_supported") else "manual",
        resume_name=resume_name,
    )



    # This branch is intentionally only enabled for a source that has
    # a real candidate-submission integration. It must never claim success
    # merely because an application page exists.
    reason = (
        f"{job['source']} is marked automation-capable, but no "
        "candidate submission adapter is configured yet."
    )

    update_application(
        application_id=application_id,
        status="ready_to_apply",
        error_message=reason,
        action_required=True,
    )

    return {
        "status": "ready_to_apply",
        "application_id": application_id,
        "apply_url": apply_url,
        "applies_today": used_today + 1,
        "daily_apply_cap": DAILY_APPLY_CAP,
        "message": reason,
    }
