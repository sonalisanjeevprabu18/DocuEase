"""Pydantic schemas and the public catalog of formats and languages."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# --- Explanation formats -----------------------------------------------------
FORMAT_IDS = (
    "short_summary",
    "detailed_summary",
    "beginner",
    "bullet_points",
    "concepts",
    "study_notes",
    "qa",
    "section_wise",
)

FORMATS: list[dict[str, str]] = [
    {"id": "short_summary", "label": "Short summary",
     "description": "A concise overview of the whole document."},
    {"id": "detailed_summary", "label": "Detailed summary",
     "description": "A thorough summary that keeps the key details."},
    {"id": "beginner", "label": "Beginner-friendly explanation",
     "description": "Simple language for someone new to the topic."},
    {"id": "bullet_points", "label": "Bullet-point summary",
     "description": "The main ideas as a clean bullet list."},
    {"id": "concepts", "label": "Important concepts & definitions",
     "description": "Key terms and concepts with clear definitions."},
    {"id": "study_notes", "label": "Study notes",
     "description": "Structured notes organised for revision."},
    {"id": "qa", "label": "Question-and-answer format",
     "description": "Important questions with model answers."},
    {"id": "section_wise", "label": "Section-wise explanation",
     "description": "An explanation broken down section by section."},
]

# --- Output languages --------------------------------------------------------
# Only languages the bundled models handle reliably are offered. Requesting
# anything else is rejected with a clear error instead of a bad translation.
LANGUAGES: dict[str, str] = {
    "en": "English",
    "hi": "Hindi (हिन्दी)",
    "es": "Spanish (Español)",
    "fr": "French (Français)",
    "de": "German (Deutsch)",
    "pt": "Portuguese (Português)",
    "bn": "Bengali (বাংলা)",
    "ja": "Japanese (日本語)",
    "zh": "Chinese (中文)",
    "ar": "Arabic (العربية)",
    "ru": "Russian (Русский)",
}

FormatId = Literal[
    "short_summary", "detailed_summary", "beginner", "bullet_points",
    "concepts", "study_notes", "qa", "section_wise",
]


# --- Requests ----------------------------------------------------------------
class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=1,
                      description="Extracted document text to explain.")
    format: FormatId
    language: str = "en"
    session_id: str = Field(..., min_length=8, max_length=128)


class DemoGenerateRequest(BaseModel):
    format: FormatId
    language: str = "en"
    session_id: str | None = Field(default=None, max_length=128)


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1)
    language: str = "en"
    session_id: str = Field(default="anonymous", max_length=128)


# --- Responses ----------------------------------------------------------------
class ExtractResponse(BaseModel):
    filename: str
    size_bytes: int
    word_count: int
    char_count: int
    text: str
    headings: list[str] = []
    table_count: int = 0
    page_count: int | None = None
    warnings: list[str] = []
    status: str = "processed"


class UsageInfo(BaseModel):
    used: int
    limit: int
    remaining: int
    cooldown_seconds: float
    generation_in_progress: bool = False


class GenerateResponse(BaseModel):
    output: str
    format: str
    language: str
    provider: str
    model: str
    usage: UsageInfo


class HealthResponse(BaseModel):
    status: str
    provider: str
    provider_configured: bool
    provider_reachable: bool | None = None
    environment: str
