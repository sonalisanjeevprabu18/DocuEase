"""Optional server-side text-to-speech producing a REAL downloadable MP3.

The default playback path is the browser's SpeechSynthesis API (free, no
network). This module only runs when a user explicitly clicks "Download
audio": it returns actual MP3 bytes, so the UI never offers a fake download.

gTTS uses Google's public translate speech endpoint - no API key, no paid
service. If it fails, the endpoint returns a typed 503 and the frontend hides
the download button instead of pretending an audio file exists.
"""

from __future__ import annotations

import logging

from gtts import gTTS
from gtts.tts import gTTSError

from .errors import ApiError, ProviderUnavailable

logger = logging.getLogger(__name__)

# Our language codes -> gTTS (Google Translate) codes.
_GTTS_LANG = {
    "en": "en", "hi": "hi", "es": "es", "fr": "fr", "de": "de",
    "pt": "pt", "bn": "bn", "ja": "ja", "zh": "zh-CN", "ar": "ar",
    "ru": "ru",
}


def synthesize(text: str, language: str, max_chars: int) -> bytes:
    """Return MP3 bytes for ``text`` or raise a typed ApiError."""
    if len(text) > max_chars:
        raise ApiError(
            f"The audio request is too long ({len(text):,} characters; "
            f"limit {max_chars:,}). Generate audio for a shorter text.",
            code="tts_text_too_long", status_code=413,
        )
    lang = _GTTS_LANG.get(language)
    if lang is None:
        raise ApiError(
            f"Audio download is not available for language '{language}'. "
            "Use the in-browser player instead.",
            code="tts_language_unsupported", status_code=422,
        )
    try:
        from io import BytesIO

        buf = BytesIO()
        gTTS(text=text, lang=lang, slow=False).write_to_fp(buf)
        data = buf.getvalue()
    except gTTSError as exc:
        logger.warning("gTTS request failed: %s", type(exc).__name__)
        raise ProviderUnavailable(
            "The audio download service is currently unreachable. "
            "Try the in-browser player instead.",
            code="tts_unavailable",
        ) from exc
    except Exception as exc:  # network, endpoint changes, empty input
        logger.warning("TTS generation failed: %s", type(exc).__name__)
        raise ProviderUnavailable(
            "Could not generate an audio file right now. "
            "Try the in-browser player instead.",
            code="tts_unavailable",
        ) from exc
    if not data:
        raise ProviderUnavailable(
            "The audio service returned an empty file.",
            code="tts_unavailable",
        )
    return data
