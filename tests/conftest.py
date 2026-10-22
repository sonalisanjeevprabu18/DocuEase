"""Pytest fixtures: isolated settings + app with a fake AI provider."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "tests"))

from app.config import Settings  # noqa: E402
from app.main import create_app  # noqa: E402
from helpers import FakeProvider  # noqa: E402


@pytest.fixture
def settings(tmp_path) -> Settings:
    """Fully explicit settings so developer env vars never leak into tests."""
    return Settings(
        _env_file=None,
        environment="test",
        debug=True,
        allowed_origins="http://localhost:5173",
        max_upload_bytes=5 * 1024 * 1024,
        max_extracted_chars=20_000,
        max_generations_per_session=3,
        generation_cooldown_seconds=0.0,
        max_output_tokens=1_000,
        provider_timeout_seconds=10.0,
        provider_connect_timeout_seconds=2.0,
        rate_limit_requests=1_000,
        rate_limit_window_seconds=60.0,
        quota_db_path="",
        ai_provider="ollama",
        ollama_base_url="http://127.0.0.1:9",
        ollama_model="test-model",
        openai_base_url="https://api.test/v1",
        openai_api_key="",
        ai_model="test-model",
        tts_enabled=True,
        demo_enabled=True,
    )


@pytest.fixture
def fake_provider() -> FakeProvider:
    return FakeProvider()


@pytest.fixture
def app(settings, fake_provider):
    application = create_app(settings)
    application.state.provider = fake_provider
    return application


@pytest.fixture
def client(app):
    from fastapi.testclient import TestClient

    with TestClient(app) as test_client:
        yield test_client
