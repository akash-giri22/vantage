from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.job_store import get_applications, update_application

router = APIRouter()

class ApplicationStatusUpdate(BaseModel):
    status: str
    error_message: str | None = None
    action_required: str | None = None

@router.get("/")
def list_applications():
    return get_applications()

@router.patch("/{application_id}")
def change_application_status(application_id: int, payload: ApplicationStatusUpdate):
    valid = {"new","ready_to_apply","applying","applied","manual_action_required","rejected","failed"}
    if payload.status not in valid:
        raise HTTPException(status_code=400, detail="Invalid application status.")
    update_application(application_id, payload.status, payload.error_message, payload.action_required)
    return {"status":"updated","application_id":application_id}
