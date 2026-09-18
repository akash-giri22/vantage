import re
from typing import Any


STOP_WORDS = {
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "from",
    "your",
    "you",
    "our",
    "are",
    "will",
    "have",
    "has",
    "into",
    "their",
    "they",
    "about",
    "job",
    "role",
    "work",
    "years",
    "year",
    "using",
    "required",
    "preferred",
    "looking",
    "candidate",
    "responsibilities",
    "experience",
    "skills",
    "team",
    "teams",
    "strong",
    "good",
    "knowledge",
    "ability",
}


COMMON_SKILLS = [
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "next.js",
    "node.js",
    "fastapi",
    "django",
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "firebase",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "linux",
    "git",
    "github",
    "power bi",
    "tableau",
    "excel",
    "networking",
    "network security",
    "cybersecurity",
    "firewall",
    "api",
    "rest",
    "jira",
    "testing",
    "selenium",
    "playwright",
    "cloud",
    "database",
    "data analysis",
    "machine learning",
]


def _normalise(text: str) -> str:
    return re.sub(
        r"\s+",
        " ",
        (text or "").lower(),
    ).strip()


def _extract_terms(text: str) -> set[str]:
    text = _normalise(text)

    words = re.findall(
        r"\b[a-zA-Z][a-zA-Z0-9.+#/-]{2,}\b",
        text,
    )

    return {
        word
        for word in words
        if word not in STOP_WORDS
    }


def _extract_skills(text: str) -> set[str]:
    normalised = _normalise(text)

    return {
        skill
        for skill in COMMON_SKILLS
        if skill in normalised
    }


def calculate_match(
    resume_text: str,
    job_description: str,
) -> dict[str, Any]:
    resume = _normalise(resume_text)
    jd = _normalise(job_description)

    if not resume or not jd:
        return {
            "match_score": 0,
            "match_reasons": [],
            "missing_skills": [],
        }

    resume_skills = _extract_skills(resume)
    jd_skills = _extract_skills(jd)

    matched_skills = sorted(
        resume_skills & jd_skills
    )

    missing_skills = sorted(
        jd_skills - resume_skills
    )

    if jd_skills:
        skill_score = (
            len(matched_skills)
            / len(jd_skills)
        ) * 100
    else:
        skill_score = 50

    jd_terms = _extract_terms(jd)
    resume_terms = _extract_terms(resume)

    useful_terms = {
        term
        for term in jd_terms
        if len(term) >= 3
    }

    if useful_terms:
        matched_terms = (
            useful_terms & resume_terms
        )

        keyword_score = (
            len(matched_terms)
            / len(useful_terms)
        ) * 100

    else:
        keyword_score = 50

    title_bonus = 0

    first_lines = jd.splitlines()[:8]

    title_text = " ".join(first_lines)

    title_words = _extract_terms(title_text)

    if title_words:
        overlap = (
            title_words & resume_terms
        )

        if overlap:
            title_bonus = min(
                15,
                len(overlap) * 3,
            )

    score = round(
        (
            skill_score * 0.55
            + keyword_score * 0.35
            + title_bonus
        )
    )

    score = max(
        0,
        min(score, 100),
    )

    reasons = []

    for skill in matched_skills[:8]:
        reasons.append(
            f"Resume contains {skill}."
        )

    if keyword_score >= 60:
        reasons.append(
            "Good overlap with the job description."
        )

    if title_bonus:
        reasons.append(
            "Relevant job-title terminology detected."
        )

    return {
        "match_score": score,
        "match_reasons": reasons[:6],
        "missing_skills": missing_skills[:8],
    }