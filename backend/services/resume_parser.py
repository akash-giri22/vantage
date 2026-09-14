import io
import pdfplumber
import docx


def extract_text(filename: str, file_bytes: bytes) -> str:
    """Pull raw text out of an uploaded resume file (PDF or DOCX)."""
    if filename.lower().endswith(".pdf"):
        text_parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                text_parts.append(page.extract_text() or "")
        return "\n".join(text_parts)

    if filename.lower().endswith(".docx"):
        document = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in document.paragraphs)

    raise ValueError("Unsupported file type — expected .pdf or .docx")
