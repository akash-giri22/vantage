from services.job_store import (
    get_job,
    create_application,
    update_application,
)
from services.notification_service import (
    notify_manual_action,
    notify_application_success,
)


MANUAL_ONLY_SOURCES = {
    "adzuna",
    "linkedin",
    "naukri",
    "indeed",
}


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

    application_id = create_application(
        job_id=job_id,
        status="applying",
        apply_mode="automatic"
        if job.get("automation_supported")
        else "manual",
        resume_name=resume_name,
    )

    source = (job.get("source") or "").lower()
    apply_url = job.get("apply_url") or ""

    if not apply_url:
        update_application(
            application_id=application_id,
            status="failed",
            error_message="No application URL available.",
        )

        return {
            "status": "failed",
            "application_id": application_id,
            "message": "No application URL available.",
        }

    if source in MANUAL_ONLY_SOURCES or not job.get("automation_supported"):
        reason = "This job source requires manual application."

        update_application(
            application_id=application_id,
            status="manual_action_required",
            action_required=reason,
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
            "message": reason,
        }

    if source in {"greenhouse", "lever"}:
        # Actual company-specific field submission will be connected next.
        # For now we deliberately do NOT falsely claim the application succeeded.
        reason = (
            f"{job['source']} application endpoint detected, "
            "but employer-specific application fields still need to be mapped."
        )

        update_application(
            application_id=application_id,
            status="ready_to_apply",
            action_required=reason,
        )

        return {
            "status": "ready_to_apply",
            "application_id": application_id,
            "apply_url": apply_url,
            "message": reason,
        }

    reason = "No supported automatic application method is configured."

    update_application(
        application_id=application_id,
        status="manual_action_required",
        action_required=reason,
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
        "message": reason,
    }