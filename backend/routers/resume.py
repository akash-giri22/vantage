from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException,
)

from models import (
    ResumeScoreResponse,
    TailorRequest,
    TailorResponse,
)

from services.resume_parser import (
    extract_text,
)

from services.ats_scorer import (
    score_resume,
    tailor_resume,
)

from services.job_store import (
    save_resume_profile,
)


router = APIRouter()


@router.post(
    "/upload",
    response_model=ResumeScoreResponse,
)
async def upload_resume(
    file: UploadFile = File(...)
):

    file_bytes = await file.read()

    resume_text = extract_text(
        file.filename,
        file_bytes,
    )

    if not resume_text.strip():
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not extract text "
                "from resume."
            ),
        )

    # IMPORTANT:
    # Store parsed resume so the job matcher
    # can calculate real match percentages.
    save_resume_profile(
        resume_text=resume_text,
        resume_name=file.filename or "",
    )

    try:

        result = score_resume(
            resume_text
        )

    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail=str(e),
        )

    return result


@router.post(
    "/tailor",
    response_model=TailorResponse,
)
async def tailor(
    payload: TailorRequest
):

    try:

        result = tailor_resume(
            payload.resume_text,
            payload.job_description,
        )

    except Exception as e:

        raise HTTPException(
            status_code=503,
            detail=str(e),
        )

    return result
