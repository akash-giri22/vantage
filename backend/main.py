from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import resume, jobs, applications
from services.job_store import init_db


app = FastAPI(
    title="Vantage API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(
    resume.router,
    prefix="/resume",
    tags=["resume"],
)

app.include_router(
    jobs.router,
    prefix="/jobs",
    tags=["jobs"],
)

app.include_router(
    applications.router,
    prefix="/applications",
    tags=["applications"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "Vantage API",
    }