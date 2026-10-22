"""Tests for prompt construction and language compliance checks."""

import pytest

from app.errors import LanguageUnsupported
from app.prompts import build_messages, output_matches_language, resolve_language


def test_resolve_language_known():
    assert resolve_language("en") == "English"
    assert resolve_language("hi") == "Hindi"
    assert resolve_language("zh") == "Chinese"


def test_resolve_language_rejects_unknown():
    with pytest.raises(LanguageUnsupported) as exc:
        resolve_language("xx")
    assert exc.value.code == "language_unsupported"
    assert "en" in exc.value.extra["supported"]


def test_build_messages_carries_document_format_and_language():
    messages = build_messages("The quarterly revenue grew.", "qa", "hi")
    assert [m["role"] for m in messages] == ["system", "user"]
    system, user = messages[0]["content"], messages[1]["content"]
    assert "Hindi" in system
    assert "MANDATORY LANGUAGE RULE" in system
    assert "The quarterly revenue grew." in user
    assert "question" in user.lower()
    assert "Hindi" in user
    assert "<document>" in user


def test_build_messages_unknown_format_rejected():
    with pytest.raises(LanguageUnsupported):
        build_messages("text", "poem", "en")


def test_output_matches_language_detects_scripts():
    assert output_matches_language("यह सारांश हिंदी में है।", "hi") is True
    assert output_matches_language("This is English only.", "hi") is False
    assert output_matches_language("এটি একটি সারাংশ।", "bn") is True
    assert output_matches_language("مرحبا بالعالم", "ar") is True
    assert output_matches_language("Привет, мир", "ru") is True
    assert output_matches_language("这是中文内容。", "zh") is True
    assert output_matches_language("これは日本語の説明です。", "ja") is True
    # Han-only text is not Japanese (needs kana).
    assert output_matches_language("这是中文内容。", "ja") is False


def test_output_matches_language_unknown_for_latin_scripts():
    assert output_matches_language("Hello world", "en") is None
    assert output_matches_language("Hola mundo", "es") is None
    assert output_matches_language("", "hi") is False
