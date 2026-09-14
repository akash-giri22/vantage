from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import resume, jobs

app = FastAPI(title="Vantage API")

# TODO: lock this down to your deployed frontend origin before going live.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router, prefix="/resume", tags=["resume"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])


@app.get("/health")
def health():
    return {"status": "ok"}
