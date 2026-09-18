import json
import os
import sqlite3
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "vantage_jobs.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        external_id TEXT NOT NULL,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT DEFAULT '',
        description TEXT DEFAULT '',
        source TEXT DEFAULT '',
        source_url TEXT DEFAULT '',
        apply_url TEXT DEFAULT '',
        posted_at TEXT,
        match_score INTEGER DEFAULT 0,
        match_reasons TEXT DEFAULT '[]',
        missing_skills TEXT DEFAULT '[]',
        automation_supported INTEGER DEFAULT 0,
        discovered_at TEXT,
        UNIQUE(source, external_id)
    );
    CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        apply_mode TEXT NOT NULL,
        resume_name TEXT DEFAULT '',
        error_message TEXT DEFAULT '',
        action_required TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        applied_at TEXT,
        FOREIGN KEY(job_id) REFERENCES jobs(id)
    );
    CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        resume_text TEXT DEFAULT '',
        resume_name TEXT DEFAULT '',
        updated_at TEXT
    );
    """)
    conn.commit()
    conn.close()

def _row(row):
    if not row:
        return None
    item = dict(row)
    for key in ("match_reasons", "missing_skills"):
        try:
            item[key] = json.loads(item[key] or "[]")
        except Exception:
            item[key] = []
    item["automation_supported"] = bool(item.get("automation_supported"))
    return item

def save_resume_profile(resume_text, resume_name=""):
    conn = get_connection()
    conn.execute(
        """INSERT INTO profile(id,resume_text,resume_name,updated_at)
           VALUES(1,?,?,?)
           ON CONFLICT(id) DO UPDATE SET
           resume_text=excluded.resume_text,
           resume_name=excluded.resume_name,
           updated_at=excluded.updated_at""",
        (resume_text or "", resume_name or "", datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    conn.close()

def get_resume_profile():
    conn = get_connection()
    row = conn.execute("SELECT * FROM profile WHERE id=1").fetchone()
    conn.close()
    return dict(row) if row else None

def save_job(job):
    conn = get_connection()
    cur = conn.execute(
        """INSERT INTO jobs(
            external_id,title,company,location,description,source,source_url,
            apply_url,posted_at,match_score,match_reasons,missing_skills,
            automation_supported,discovered_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(source,external_id) DO UPDATE SET
            title=excluded.title, company=excluded.company, location=excluded.location,
            description=excluded.description, source_url=excluded.source_url,
            apply_url=excluded.apply_url, posted_at=excluded.posted_at,
            match_score=excluded.match_score, match_reasons=excluded.match_reasons,
            missing_skills=excluded.missing_skills,
            automation_supported=excluded.automation_supported,
            discovered_at=excluded.discovered_at""",
        (
            str(job.get("external_id") or job.get("apply_url") or ""),
            job.get("title","Unknown Role"), job.get("company","Unknown Company"),
            job.get("location",""), job.get("description",""), job.get("source",""),
            job.get("source_url",""), job.get("apply_url",""), job.get("posted_at"),
            int(job.get("match_score",0)), json.dumps(job.get("match_reasons",[])),
            json.dumps(job.get("missing_skills",[])),
            int(bool(job.get("automation_supported"))), job.get("discovered_at"),
        ),
    )
    conn.commit()
    job_id = cur.lastrowid
    if not job_id:
        row = conn.execute(
            "SELECT id FROM jobs WHERE source=? AND external_id=?",
            (job.get("source",""), str(job.get("external_id") or job.get("apply_url") or "")),
        ).fetchone()
        job_id = row["id"] if row else None
    conn.close()
    return job_id

def get_jobs(limit=100):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM jobs ORDER BY match_score DESC, discovered_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    conn.close()
    return [_row(r) for r in rows]

def get_job(job_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
    conn.close()
    return _row(row)

def create_application(job_id, status, apply_mode, resume_name=""):
    conn = get_connection()
    cur = conn.execute(
        """INSERT INTO applications(job_id,status,apply_mode,resume_name,created_at)
           VALUES(?,?,?,?,?)""",
        (job_id, status, apply_mode, resume_name or "", datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    application_id = cur.lastrowid
    conn.close()
    return application_id

def update_application(application_id, status, error_message=None, action_required=None):
    conn = get_connection()
    applied_at = datetime.now(timezone.utc).isoformat() if status == "applied" else None
    conn.execute(
        """UPDATE applications
           SET status=?, error_message=COALESCE(?,error_message),
               action_required=COALESCE(?,action_required),
               applied_at=COALESCE(?,applied_at)
           WHERE id=?""",
        (status, error_message, action_required, applied_at, application_id),
    )
    conn.commit()
    conn.close()

def get_applications():
    conn = get_connection()
    rows = conn.execute(
        """SELECT a.*, j.title, j.company, j.source, j.match_score,
                  j.apply_url, j.location
           FROM applications a
           JOIN jobs j ON j.id=a.job_id
           ORDER BY a.created_at DESC"""
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
