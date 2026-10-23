"""Pydantic schemas and the public catalogue of explanation formats."""

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
    {"id": "short_summary", "label": "Quick Summary",
     "description": "The essentials in a few sentences."},
    {"id": "beginner", "label": "Explain Like I'm New",
     "description": "Plain language, no assumed knowledge."},
    {"id": "detailed_summary", "label": "Detailed Breakdown",
     "description": "A thorough look at the whole document."},
    {"id": "study_notes", "label": "Study Notes",
     "description": "Revision-ready notes and takeaways."},
    {"id": "concepts", "label": "Key Concepts",
     "description": "Important terms, defined clearly."},
    {"id": "qa", "label": "Ask and Answer",
     "description": "The questions this document answers."},
    {"id": "bullet_points", "label": "Bullet-Point Highlights",
     "description": "The key ideas as scannable points."},
    {"id": "section_wise", "label": "Section-by-Section",
     "description": "Each part explained in its own place."},
]

FormatId = Literal[
    "short_summary", "detailed_summary", "beginner", "bullet_points",
    "concepts", "study_notes", "qa", "section_wise",
]


# --- Requests ----------------------------------------------------------------
class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=1,
                      description="Extracted document text to explain.")
    format: FormatId
    session_id: str = Field(..., min_length=8, max_length=128)


class DemoGenerateRequest(BaseModel):
    format: FormatId
    session_id: str | None = Field(default=None, max_length=128)


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1)
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
    provider: str
    model: str
    usage: UsageInfo


class HealthResponse(BaseModel):
    status: str
    provider: str
    provider_configured: bool
    provider_reachable: bool | None = None
    environment: str
