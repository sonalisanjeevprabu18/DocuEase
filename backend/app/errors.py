"""Application errors and their structured HTTP mapping.

Every client-visible failure carries a stable ``code`` so the frontend can show
an accurate, friendly message instead of a generic one.
"""

from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse


class ApiError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(self, message: str, *, code: str | None = None,
                 status_code: int | None = None, extra: dict | None = None):
        super().__init__(message)
        self.message = message
        if code is not None:
            self.code = code
        if status_code is not None:
            self.status_code = status_code
        self.extra = extra or {}

    def payload(self) -> dict:
        body = {"error": {"code": self.code, "message": self.message}}
        if self.extra:
            body["error"].update(self.extra)
        return body


# Concrete, stable error codes -------------------------------------------------
class UnsupportedFileType(ApiError):
    status_code = 415
    code = "unsupported_type"


class FileTooLarge(ApiError):
    status_code = 413
    code = "file_too_large"


class InvalidFile(ApiError):
    status_code = 422
    code = "invalid_file"


class CorruptedFile(ApiError):
    status_code = 422
    code = "corrupted_file"


class EmptyDocument(ApiError):
    status_code = 422
    code = "empty_document"


class ScannedDocument(ApiError):
    """A PDF with no selectable text: OCR would be required."""

    status_code = 422
    code = "ocr_required"


class TextTooLong(ApiError):
    status_code = 413
    code = "text_too_long"


class LanguageUnsupported(ApiError):
    status_code = 422
    code = "language_unsupported"


class UsageLimitExceeded(ApiError):
    status_code = 429
    code = "usage_limit_exceeded"


class CooldownActive(ApiError):
    status_code = 429
    code = "cooldown_active"


class GenerationInProgress(ApiError):
    status_code = 409
    code = "generation_in_progress"


class RateLimited(ApiError):
    status_code = 429
    code = "rate_limited"


class ProviderUnavailable(ApiError):
    status_code = 503
    code = "provider_unavailable"


class ProviderTimeout(ApiError):
    status_code = 504
    code = "provider_timeout"


class ProviderRateLimited(ApiError):
    status_code = 429
    code = "provider_rate_limited"


class ProviderResponseInvalid(ApiError):
    status_code = 502
    code = "provider_response_invalid"


async def api_error_handler(_request: Request, exc: ApiError) -> JSONResponse:
    headers = getattr(exc, "headers", None)
    return JSONResponse(status_code=exc.status_code, content=exc.payload(),
                        headers=headers)


async def unhandled_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    # Never leak internals or document content in logs/responses.
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal_error",
                           "message": "An unexpected server error occurred. Please try again."}},
    )
