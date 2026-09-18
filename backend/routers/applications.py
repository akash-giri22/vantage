from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.job_store import (
    get_applications,
    update_application,
)


router = APIRouter()


class ApplicationStatusUpdate(BaseModel):
    status: str
    error_message: str | None = None
    action_required: str | None = None


@router.get("/")
def list_applications():
    return get_applications()


@router.patch("/{application_id}")
def change_application_status(
    application_id: int,
    payload: ApplicationStatusUpdate,
):
    valid_statuses = {
        "new",
        "ready_to_apply",
        "applying",
        "applied",
        "manual_action_required",
        "rejected",
        "failed",
    }

    if payload.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid application status.",
        )

    update_application(
        application_id=application_id,
        status=payload.status,
        error_message=payload.error_message,
        action_required=payload.action_required,
    )

    return {
        "status": "updated",
        "application_id": application_id,
    }