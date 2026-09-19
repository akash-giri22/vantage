import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "vantage_jobs.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            external_id TEXT NOT NULL,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            location TEXT DEFAULT '',
            description TEXT DEFAULT '',
            source TEXT NOT NULL,
            source_url TEXT DEFAULT '',
            apply_url TEXT DEFAULT '',
            posted_at TEXT DEFAULT '',
            match_score INTEGER DEFAULT 0,
            match_reasons TEXT DEFAULT '[]',
            missing_skills TEXT DEFAULT '[]',
            automation_supported INTEGER DEFAULT 0,
            discovered_at TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            UNIQUE(source, external_id)
        )
        """
    )

    columns = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(jobs)").fetchall()
    }

    if "is_active" not in columns:
        conn.execute(
            "ALTER TABLE jobs ADD COLUMN is_active INTEGER DEFAULT 1"
        )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            apply_mode TEXT DEFAULT 'manual',
            resume_name TEXT DEFAULT '',
            error_message TEXT DEFAULT '',
            action_required INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            applied_at TEXT DEFAULT '',
            FOREIGN KEY(job_id) REFERENCES jobs(id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            resume_text TEXT DEFAULT '',
            resume_name TEXT DEFAULT '',
            updated_at TEXT NOT NULL
        )
        """
    )

    conn.commit()
    conn.close()


def save_resume_profile(resume_text: str, resume_name: str = ""):
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()

    conn.execute(
        """
        INSERT INTO profile (id, resume_text, resume_name, updated_at)
        VALUES (1, ?, ?, ?)
        ON CONFLICT(id)
        DO UPDATE SET
            resume_text = excluded.resume_text,
            resume_name = excluded.resume_name,
            updated_at = excluded.updated_at
        """,
        (resume_text, resume_name, now),
    )

    conn.commit()
    conn.close()


def get_resume_profile() -> Optional[dict[str, str]]:
    conn = get_connection()

    row = conn.execute(
        """
        SELECT resume_text, resume_name
        FROM profile
        WHERE id = 1
        """
    ).fetchone()

    conn.close()

    if not row:
        return None

    return {
        "resume_text": row["resume_text"] or "",
        "resume_name": row["resume_name"] or "",
    }


def mark_all_jobs_inactive():
    conn = get_connection()
    conn.execute("UPDATE jobs SET is_active = 0")
    conn.commit()
    conn.close()


def save_job(job: dict[str, Any]) -> int:
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()

    conn.execute(
        """
        INSERT INTO jobs (
            external_id,
            title,
            company,
            location,
            description,
            source,
            source_url,
            apply_url,
            posted_at,
            match_score,
            match_reasons,
            missing_skills,
            automation_supported,
            discovered_at,
            is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(source, external_id)
        DO UPDATE SET
            title = excluded.title,
            company = excluded.company,
            location = excluded.location,
            description = excluded.description,
            source_url = excluded.source_url,
            apply_url = excluded.apply_url,
            posted_at = excluded.posted_at,
            match_score = excluded.match_score,
            match_reasons = excluded.match_reasons,
            missing_skills = excluded.missing_skills,
            automation_supported = excluded.automation_supported,
            discovered_at = excluded.discovered_at,
            is_active = 1
        """,
        (
            str(job["external_id"]),
            job["title"],
            job["company"],
            job.get("location", ""),
            job.get("description", ""),
            job["source"],
            job.get("source_url", ""),
            job.get("apply_url", ""),
            job.get("posted_at", ""),
            int(job.get("match_score", 0)),
            json.dumps(job.get("match_reasons", [])),
            json.dumps(job.get("missing_skills", [])),
            1 if job.get("automation_supported") else 0,
            now,
        ),
    )

    conn.commit()

    row = conn.execute(
        """
        SELECT id
        FROM jobs
        WHERE source = ? AND external_id = ?
        """,
        (job["source"], str(job["external_id"])),
    ).fetchone()

    conn.close()
    return int(row["id"])


def _decode_job(row) -> dict:
    item = dict(row)
    item["match_reasons"] = json.loads(
        item.get("match_reasons") or "[]"
    )
    item["missing_skills"] = json.loads(
        item.get("missing_skills") or "[]"
    )
    item["automation_supported"] = bool(item["automation_supported"])
    item["is_active"] = bool(item.get("is_active", 1))
    return item


def get_jobs(min_match: int = 0, limit: int = 100):
    conn = get_connection()

    rows = conn.execute(
        """
        SELECT *
        FROM jobs
        WHERE is_active = 1
          AND match_score >= ?
        ORDER BY match_score DESC, discovered_at DESC
        LIMIT ?
        """,
        (min_match, limit),
    ).fetchall()

    conn.close()
    return [_decode_job(row) for row in rows]


def get_job(job_id: int):
    conn = get_connection()

    row = conn.execute(
        """
        SELECT *
        FROM jobs
        WHERE id = ?
        """,
        (job_id,),
    ).fetchone()

    conn.close()

    if not row:
        return None

    return _decode_job(row)


def create_application(
    job_id: int,
    status: str,
    apply_mode: str,
    resume_name: str = "",
    error_message: str = "",
    action_required: bool = False,
):
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()

    conn.execute(
        """
        INSERT INTO applications (
            job_id,
            status,
            apply_mode,
            resume_name,
            error_message,
            action_required,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            job_id,
            status,
            apply_mode,
            resume_name,
            error_message,
            1 if action_required else 0,
            now,
        ),
    )

    conn.commit()
    application_id = conn.execute(
        "SELECT last_insert_rowid()"
    ).fetchone()[0]
    conn.close()

    return int(application_id)


def update_application(
    application_id: int,
    status: str,
    error_message: str = "",
    action_required: bool = False,
    applied: bool = False,
):
    conn = get_connection()

    applied_at = (
        datetime.now(timezone.utc).isoformat()
        if applied
        else ""
    )

    conn.execute(
        """
        UPDATE applications
        SET
            status = ?,
            error_message = ?,
            action_required = ?,
            applied_at = CASE
                WHEN ? = 1 THEN ?
                ELSE applied_at
            END
        WHERE id = ?
        """,
        (
            status,
            error_message,
            1 if action_required else 0,
            1 if applied else 0,
            applied_at,
            application_id,
        ),
    )

    conn.commit()
    conn.close()



def get_daily_application_count() -> int:
    conn = get_connection()
    today = datetime.now(timezone.utc).date().isoformat()

    row = conn.execute(
        """
        SELECT COUNT(*) AS count
        FROM applications
        WHERE substr(created_at, 1, 10) = ?
        """,
        (today,),
    ).fetchone()

    conn.close()
    return int(row["count"] or 0)

def get_applications(limit: int = 100):
    conn = get_connection()

    rows = conn.execute(
        """
        SELECT
            applications.*,
            jobs.title,
            jobs.company,
            jobs.location,
            jobs.source,
            jobs.apply_url,
            jobs.match_score
        FROM applications
        JOIN jobs
            ON jobs.id = applications.job_id
        ORDER BY applications.created_at DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()

    conn.close()
    return [dict(row) for row in rows]
