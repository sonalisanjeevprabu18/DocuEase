"""Tests for prompt construction (English-only output, no language option)."""

import pytest

from app.errors import ApiError
from app.prompts import build_messages


def test_build_messages_carries_document_format_and_english():
    messages = build_messages("The quarterly revenue grew.", "qa")
    assert [m["role"] for m in messages] == ["system", "user"]
    system, user = messages[0]["content"], messages[1]["content"]
    assert "English" in system
    assert "The quarterly revenue grew." in user
    assert "question" in user.lower()
    assert "<document>" in user


def test_build_messages_unknown_format_rejected():
    with pytest.raises(ApiError) as exc:
        build_messages("text", "poem")
    assert exc.value.code == "format_unsupported"
    assert exc.value.status_code == 422
