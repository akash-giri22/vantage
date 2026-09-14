import os
import io
import json
import base64
import re

from dotenv import load_dotenv
from google import genai

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import (
    getSampleStyleSheet,
    ParagraphStyle,
)
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
)
from reportlab.lib.units import mm


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = (
    genai.Client(api_key=GEMINI_API_KEY)
    if GEMINI_API_KEY
    else None
)


# =========================================================
# GEMINI MODELS
# =========================================================

MODEL_NAME = "gemini-3.6-flash"

FALLBACK_MODEL_NAME = "gemini-2.5-flash"


# =========================================================
# TARGET ATS
# =========================================================

TARGET_ATS_SCORE = 85


# =========================================================
# JSON CLEANER
# =========================================================

def _clean_json_response(text: str) -> dict:

    if not text:
        raise RuntimeError(
            "Gemini returned an empty response."
        )

    text = text.strip()

    text = re.sub(
        r"^```json\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"^```\s*",
        "",
        text,
    )

    text = re.sub(
        r"\s*```$",
        "",
        text,
    )

    text = text.strip()

    try:
        return json.loads(text)

    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")

    if (
        start != -1
        and end != -1
        and end > start
    ):

        json_text = text[
            start:end + 1
        ]

        try:

            return json.loads(
                json_text
            )

        except json.JSONDecodeError as e:

            raise RuntimeError(
                f"Gemini returned invalid JSON: {e}"
            )

    raise RuntimeError(
        "Gemini did not return valid JSON."
    )


# =========================================================
# MARKDOWN STRIPPER
# =========================================================

def _strip_markdown_artifacts(
    text: str
) -> str:

    lines = text.splitlines()

    cleaned = []

    for line in lines:

        line = re.sub(
            r"^#{1,6}\s*",
            "",
            line
        )

        line = re.sub(
            r"\*\*(.*?)\*\*",
            r"\1",
            line
        )

        line = re.sub(
            r"__(.*?)__",
            r"\1",
            line
        )

        line = re.sub(
            r"\*(.*?)\*",
            r"\1",
            line
        )

        cleaned.append(line)

    return "\n".join(cleaned)


# =========================================================
# LOCAL ATS FALLBACK
# =========================================================

def _fallback_score(
    resume_text: str,
    job_description: str = ""
) -> dict:

    resume_lower = resume_text.lower()

    jd_lower = job_description.lower()

    # -----------------------------------------------------
    # JD-SPECIFIC KEYWORD COVERAGE
    # -----------------------------------------------------

    if job_description.strip():

        # Extract useful words from JD.
        jd_words = re.findall(
            r"\b[a-zA-Z][a-zA-Z0-9.+#/-]{2,}\b",
            jd_lower
        )

        # Remove common English words.
        stop_words = {
            "the",
            "and",
            "for",
            "with",
            "that",
            "this",
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
            "work",
            "role",
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
        }

        useful_words = [
            word
            for word in jd_words
            if word not in stop_words
        ]

        unique_words = list(
            dict.fromkeys(
                useful_words
            )
        )

        if unique_words:

            matched = sum(
                1
                for word in unique_words
                if word in resume_lower
            )

            coverage = (
                matched /
                len(unique_words)
            )

            keyword_score = round(
                60 + (coverage * 40)
            )

            keyword_score = max(
                0,
                min(
                    keyword_score,
                    100
                )
            )

        else:

            keyword_score = 75

    else:

        # Generic fallback for original resume.
        keyword_score = 70

        keywords = [
            "python",
            "java",
            "javascript",
            "typescript",
            "react",
            "next.js",
            "fastapi",
            "django",
            "sql",
            "mysql",
            "postgresql",
            "mongodb",
            "aws",
            "azure",
            "docker",
            "kubernetes",
            "git",
            "github",
            "linux",
            "cybersecurity",
            "network security",
            "information security",
            "security",
            "network",
            "firewall",
            "api",
            "rest",
        ]

        matched_keywords = sum(
            1
            for keyword in keywords
            if keyword in resume_lower
        )

        if matched_keywords >= 8:
            keyword_score = 88

        elif matched_keywords >= 5:
            keyword_score = 80

        elif matched_keywords >= 3:
            keyword_score = 75


    # -----------------------------------------------------
    # FORMATTING
    # -----------------------------------------------------

    formatting_score = 85

    if len(resume_text) < 500:
        formatting_score = 65

    elif len(resume_text) > 1000:
        formatting_score = 90


    # -----------------------------------------------------
    # IMPACT
    # -----------------------------------------------------

    impact_words = [
        "built",
        "developed",
        "implemented",
        "designed",
        "managed",
        "improved",
        "automated",
        "optimized",
        "deployed",
        "configured",
        "secured",
        "led",
        "created",
        "delivered",
        "integrated",
        "maintained",
        "analyzed",
        "resolved",
        "monitored",
    ]

    matched_impact = sum(
        1
        for word in impact_words
        if word in resume_lower
    )

    if matched_impact >= 8:
        impact_score = 90

    elif matched_impact >= 5:
        impact_score = 82

    elif matched_impact >= 3:
        impact_score = 75

    else:
        impact_score = 65


    # -----------------------------------------------------
    # SECTION STRUCTURE
    # -----------------------------------------------------

    sections = [
        "summary",
        "professional summary",
        "experience",
        "work experience",
        "education",
        "skills",
        "technical skills",
        "projects",
        "certifications",
        "achievements",
        "internships",
    ]

    found_sections = sum(
        1
        for section in sections
        if section in resume_lower
    )

    if found_sections >= 5:
        section_score = 92

    elif found_sections >= 4:
        section_score = 87

    elif found_sections >= 3:
        section_score = 80

    else:
        section_score = 65


    # -----------------------------------------------------
    # OVERALL
    # -----------------------------------------------------

    overall = round(
        (
            keyword_score
            + formatting_score
            + impact_score
            + section_score
        ) / 4
    )

    breakdown = [
        {
            "label": "JD keyword coverage",
            "value": keyword_score,
            "tone": (
                "teal"
                if keyword_score >= 70
                else "amber"
            ),
        },
        {
            "label": "Formatting & parseability",
            "value": formatting_score,
            "tone": (
                "teal"
                if formatting_score >= 70
                else "amber"
            ),
        },
        {
            "label": "Impact phrasing",
            "value": impact_score,
            "tone": (
                "teal"
                if impact_score >= 70
                else "amber"
            ),
        },
        {
            "label": "Section structure",
            "value": section_score,
            "tone": (
                "teal"
                if section_score >= 70
                else "amber"
            ),
        },
    ]

    note = (
        "Resume scored against the supplied job description."
        if job_description.strip()
        else
        "Resume analyzed using local ATS rules."
    )

    return {
        "score": overall,
        "breakdown": breakdown,
        "note": note,
    }


# =========================================================
# GEMINI GENERATOR WITH FALLBACK
# =========================================================

def _generate_with_fallback(
    prompt: str
):

    if not client:

        raise RuntimeError(
            "GEMINI_API_KEY is not configured."
        )

    primary_error_text = ""
    fallback_error_text = ""

    # -----------------------------------------------------
    # PRIMARY
    # -----------------------------------------------------

    try:

        print(
            f"Trying primary Gemini model: "
            f"{MODEL_NAME}"
        )

        response = (
            client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
            )
        )

        return response

    except Exception as primary_error:

        primary_error_text = str(
            primary_error
        )

        print(
            f"Primary Gemini model failed: "
            f"{primary_error_text}"
        )


    # -----------------------------------------------------
    # FALLBACK
    # -----------------------------------------------------

    try:

        print(
            f"Trying fallback Gemini model: "
            f"{FALLBACK_MODEL_NAME}"
        )

        response = (
            client.models.generate_content(
                model=FALLBACK_MODEL_NAME,
                contents=prompt,
            )
        )

        return response

    except Exception as fallback_error:

        fallback_error_text = str(
            fallback_error
        )

        print(
            f"Fallback Gemini model failed: "
            f"{fallback_error_text}"
        )

        combined_error_text = (
            primary_error_text
            + " "
            + fallback_error_text
        ).lower()

        if (
            "429" in combined_error_text
            or "resource_exhausted"
            in combined_error_text
            or "quota" in combined_error_text
        ):

            raise RuntimeError(
                "Aaj ka free AI quota khatam ho gaya hai. "
                "Thodi der baad phir try karo."
            )

        raise RuntimeError(
            "AI abhi thoda busy hai. "
            "Ek-do minute mein phir try karo."
        )


# =========================================================
# ORIGINAL ATS SCORE
# =========================================================

def score_resume(
    resume_text: str,
    job_description: str = ""
) -> dict:

    if not resume_text.strip():

        raise RuntimeError(
            "Could not extract text from resume."
        )


    # -----------------------------------------------------
    # NO GEMINI
    # -----------------------------------------------------

    if not client:

        result = _fallback_score(
            resume_text,
            job_description
        )

        result["resume_text"] = resume_text

        return result


    # -----------------------------------------------------
    # JD-SPECIFIC PROMPT
    # -----------------------------------------------------

    if job_description.strip():

        scoring_context = f"""
JOB DESCRIPTION:

{job_description[:8000]}

IMPORTANT:

This is a JD-specific ATS score.

Evaluate how well the resume matches THIS
specific job description.

Pay special attention to:

1. Required skills
2. Preferred skills
3. Technical tools
4. Technologies
5. Responsibilities
6. Job-title relevance
7. Relevant experience
8. Domain terminology
9. Keyword coverage
10. Recruiter searchability
"""

    else:

        scoring_context = """
No job description was supplied.

Score the resume for general ATS
compatibility and recruiter readability.
"""


    prompt = f"""
You are an expert ATS scoring engine and senior recruiter.

Score the resume HONESTLY from 0 to 100.

{scoring_context}

Use these four categories:

1. JD keyword coverage
2. Formatting & parseability
3. Impact phrasing
4. Section structure

For a JD-specific score, JD keyword coverage should
measure actual alignment with the supplied JD rather
than generic technology keywords.

Do NOT give a high score merely because the resume
looks professional.

Do NOT invent information.

Do NOT reward keyword stuffing.

The score should represent realistic ATS/recruiter
matching quality.

Return ONLY valid JSON.

EXACT FORMAT:

{{
  "score": 86,
  "breakdown": [
    {{
      "label": "JD keyword coverage",
      "value": 88,
      "tone": "teal"
    }},
    {{
      "label": "Formatting & parseability",
      "value": 90,
      "tone": "teal"
    }},
    {{
      "label": "Impact phrasing",
      "value": 84,
      "tone": "teal"
    }},
    {{
      "label": "Section structure",
      "value": 90,
      "tone": "teal"
    }}
  ],
  "note": "Short explanation."
}}

Resume:

{resume_text[:12000]}
"""


    try:

        response = _generate_with_fallback(
            prompt
        )

        result = _clean_json_response(
            response.text
        )

        result["resume_text"] = resume_text

        return result

    except Exception as e:

        print(
            f"AI ATS scoring failed: {e}"
        )

        result = _fallback_score(
            resume_text,
            job_description
        )

        result["resume_text"] = resume_text

        return result


# =========================================================
# CREATE PDF
# =========================================================

def create_resume_pdf(
    resume_text: str
) -> bytes:

    output = io.BytesIO()

    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )

    styles = getSampleStyleSheet()

    normal_style = ParagraphStyle(
        "ResumeNormal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        spaceAfter=5,
        alignment=TA_LEFT,
    )

    heading_style = ParagraphStyle(
        "ResumeHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        spaceBefore=9,
        spaceAfter=5,
    )

    name_style = ParagraphStyle(
        "ResumeName",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=21,
        spaceAfter=8,
    )

    story = []

    section_names = {
        "summary",
        "professional summary",
        "experience",
        "work experience",
        "professional experience",
        "education",
        "skills",
        "technical skills",
        "projects",
        "certifications",
        "achievements",
        "internships",
    }

    first_text_line = True

    for raw_line in resume_text.splitlines():

        line = raw_line.strip()

        if not line:

            story.append(
                Spacer(1, 3)
            )

            continue

        safe_line = (
            line
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )

        normalized = (
            line
            .lower()
            .rstrip(":")
            .strip()
        )

        # -------------------------------------------------
        # NAME
        # -------------------------------------------------

        if first_text_line:

            story.append(
                Paragraph(
                    safe_line,
                    name_style
                )
            )

            first_text_line = False

            continue

        # -------------------------------------------------
        # SECTION
        # -------------------------------------------------

        if normalized in section_names:

            story.append(
                Paragraph(
                    safe_line,
                    heading_style
                )
            )

            continue

        # -------------------------------------------------
        # BULLET
        # -------------------------------------------------

        if line.startswith(
            ("•", "-", "▪", "●")
        ):

            bullet_text = line.lstrip(
                "•-▪● "
            ).strip()

            safe_bullet = (
                bullet_text
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
            )

            story.append(
                Paragraph(
                    f"• {safe_bullet}",
                    normal_style
                )
            )

        else:

            story.append(
                Paragraph(
                    safe_line,
                    normal_style
                )
            )

    document.build(story)

    return output.getvalue()


# =========================================================
# AI RESUME REWRITER
# =========================================================

def tailor_resume(
    resume_text: str,
    job_description: str = ""
) -> dict:

    if not resume_text.strip():

        raise RuntimeError(
            "Resume text is empty."
        )

    if not client:

        raise RuntimeError(
            "GEMINI_API_KEY is not configured."
        )

    if not job_description.strip():

        raise RuntimeError(
            "A job description is required for resume tailoring."
        )


    # =====================================================
    # ONE-SHOT JD ANALYSIS + RESUME OPTIMIZATION
    # =====================================================

    prompt = f"""
You are an elite ATS resume optimizer, senior recruiter,
and professional resume writer.

You will receive:

1. An original resume.
2. A specific job description.

Your job is to create the strongest truthful
JD-tailored version of the resume in ONE generation.

TARGET:

Aim for an ATS compatibility score of 85+ against
THIS SPECIFIC JOB DESCRIPTION.

Do NOT wait for another attempt.

Perform the entire optimization now.

=========================================================
STEP 1 — ANALYZE THE JOB DESCRIPTION
=========================================================

Before rewriting, internally identify:

- Exact job title
- Core responsibilities
- Required skills
- Preferred skills
- Technical skills
- Tools
- Technologies
- Security/domain terminology
- Soft skills
- Certifications
- Experience requirements
- Important ATS keywords
- Important keyword phrases
- Repeated concepts
- Recruiter search terms

Prioritize the most important requirements.

=========================================================
STEP 2 — ANALYZE THE ORIGINAL RESUME
=========================================================

Identify:

- Existing relevant experience
- Existing skills
- Existing technologies
- Existing projects
- Existing certifications
- Existing achievements
- Existing responsibilities

Find truthful connections between the resume
and the job description.

=========================================================
STEP 3 — OPTIMIZE THE RESUME
=========================================================

Rewrite the resume so that it strongly matches
the job description.

Improve:

- Professional summary
- Relevant skills
- Technical skills
- Experience bullets
- Project descriptions
- Action verbs
- ATS keyword coverage
- Job-specific terminology
- Recruiter readability
- Section structure
- Conciseness
- Impact
- Searchability

Use the exact terminology from the JD when it is
truthfully supported by the original resume.

Place important matching skills naturally in
appropriate sections.

Do NOT simply create a keyword list.

Do NOT keyword stuff.

=========================================================
CRITICAL TRUTHFULNESS RULE
=========================================================

NEVER invent information.

Do NOT invent:

- Companies
- Job titles
- Employment dates
- Education
- Certifications
- Technologies
- Tools
- Projects
- Clients
- Achievements
- Responsibilities
- Metrics
- Numbers
- Awards
- Security experience
- Programming experience

If the original resume does not support a JD
requirement, DO NOT falsely claim it.

You may improve wording and positioning of
existing information.

You may make an existing skill more visible.

You may combine existing truthful information
into stronger wording.

You may reorder information for relevance.

=========================================================
ATS OPTIMIZATION RULE
=========================================================

The goal is NOT merely to make the resume sound good.

The goal is to make it highly searchable and
matchable for THIS JOB DESCRIPTION.

Prioritize:

1. Required JD keywords
2. Required technical skills
3. Relevant responsibilities
4. Relevant tools/technologies
5. Job title terminology
6. Domain terminology
7. Existing relevant experience
8. Existing relevant projects
9. Existing certifications

Use natural language.

Avoid keyword stuffing.

=========================================================
FIRST-GENERATION QUALITY REQUIREMENT
=========================================================

This is the ONLY resume generation attempt.

Therefore, do NOT produce a minimal rewrite.

Make the first generated version as complete,
specific, ATS-friendly, and JD-aligned as possible.

Think through the JD requirements before producing
the final resume.

=========================================================
FORMATTING
=========================================================

The rewritten resume must be PLAIN TEXT ONLY.

Do NOT use:

- Markdown
- #
- ##
- ###
- **
- *
- __
- Tables
- Decorative symbols

Section titles should be plain uppercase text:

PROFESSIONAL SUMMARY

TECHNICAL SKILLS

PROFESSIONAL EXPERIENCE

PROJECTS

EDUCATION

CERTIFICATIONS

Use "-" for bullet points.

=========================================================
JOB DESCRIPTION
=========================================================

{job_description[:9000]}

=========================================================
ORIGINAL RESUME
=========================================================

{resume_text[:14000]}

=========================================================
OUTPUT
=========================================================

Return ONLY valid JSON.

Use EXACTLY this structure:

{{
  "summary": "Short explanation of the major JD-specific improvements.",
  "changes": [
    {{
      "section": "Professional Summary",
      "original": "Original text",
      "revised": "Improved text"
    }}
  ],
  "rewritten_resume": "Complete final tailored resume in plain text."
}}

Remember:

This is a ONE-SHOT optimization.

Produce the strongest truthful JD-matched resume
you can in this response.
"""


    # =====================================================
    # GENERATE ONCE
    # =====================================================

    print(
        "Generating one-shot JD-tailored resume..."
    )

    response = _generate_with_fallback(
        prompt
    )

    result = _clean_json_response(
        response.text
    )


    # =====================================================
    # EXTRACT RESULT
    # =====================================================

    summary = result.get(
        "summary",
        "Resume optimized for the supplied job description."
    )

    changes = result.get(
        "changes",
        []
    )

    rewritten_resume = result.get(
        "rewritten_resume",
        ""
    ).strip()


    rewritten_resume = (
        _strip_markdown_artifacts(
            rewritten_resume
        )
    )


    if not rewritten_resume:

        raise RuntimeError(
            "AI did not return a rewritten resume."
        )


    # =====================================================
    # JD-SPECIFIC ATS RESCORE
    # =====================================================

    print(
        "Calculating JD-specific ATS score..."
    )

    updated_score_result = score_resume(
        rewritten_resume,
        job_description
    )


    updated_score = updated_score_result.get(
        "score",
        0
    )

    updated_breakdown = (
        updated_score_result.get(
            "breakdown",
            []
        )
    )

    updated_note = (
        updated_score_result.get(
            "note",
            ""
        )
    )


    print(
        f"One-shot tailored resume ATS score: "
        f"{updated_score}"
    )


    # =====================================================
    # CREATE PDF
    # =====================================================

    pdf_bytes = create_resume_pdf(
        rewritten_resume
    )


    # =====================================================
    # BASE64
    # =====================================================

    download_base64 = (
        base64.b64encode(
            pdf_bytes
        ).decode("utf-8")
    )


    # =====================================================
    # FINAL RESPONSE
    # =====================================================

    return {
        "summary": summary,

        "changes": changes,

        "rewritten_resume": rewritten_resume,

        "updated_score": updated_score,

        "updated_breakdown":
            updated_breakdown,

        "updated_note":
            updated_note,

        "download_filename":
            "tailored_resume.pdf",

        "download_base64":
            download_base64,
    }