"""Provider tests using httpx.MockTransport - no network required."""

from __future__ import annotations

import asyncio
import json

import httpx
import pytest

from app.config import Settings
from app.errors import (
    ProviderRateLimited,
    ProviderResponseInvalid,
    ProviderTimeout,
    ProviderUnavailable,
)
from app.providers import (
    OllamaProvider,
    OpenAICompatibleProvider,
    build_provider,
)


def run(coro):
    return asyncio.run(coro)


def mock_client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def openai_provider(handler, **kwargs) -> OpenAICompatibleProvider:
    return OpenAICompatibleProvider(
        "test-model",
        base_url="https://api.test/v1",
        api_key="test-key",
        timeout=5,
        connect_timeout=2,
        client=mock_client(handler),
        **kwargs,
    )


def ollama_provider(handler) -> OllamaProvider:
    return OllamaProvider(
        "test-model",
        base_url="http://ollama.test:11434",
        timeout=5,
        connect_timeout=2,
        client=mock_client(handler),
    )


MESSAGES = [{"role": "user", "content": "Explain this."}]


# --- OpenAI-compatible -------------------------------------------------------
def test_openai_success_and_request_shape():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["path"] = request.url.path
        captured["auth"] = request.headers.get("Authorization")
        captured["body"] = json.loads(request.content)
        return httpx.Response(200, json={
            "choices": [{"message": {"content": "  Hello doc  "}}]
        })

    provider = openai_provider(handler)
    outcome = run(provider.chat(MESSAGES, max_tokens=1000))

    assert outcome.text == "Hello doc"
    assert outcome.provider == "openai_compatible"
    assert outcome.kind == "external"
    assert captured["path"] == "/v1/chat/completions"
    assert captured["auth"] == "Bearer test-key"
    assert captured["body"]["max_tokens"] == 1000
    assert captured["body"]["model"] == "test-model"
    assert "reasoning_effort" not in captured["body"]  # only sent when configured


def test_openai_sends_reasoning_effort_when_configured():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = json.loads(request.content)
        return httpx.Response(200, json={
            "choices": [{"message": {"content": "ok"}}]
        })

    provider = openai_provider(handler, reasoning_effort=" low ")
    assert run(provider.chat(MESSAGES, max_tokens=800)).text == "ok"
    assert captured["body"]["reasoning_effort"] == "low"
    assert captured["body"]["max_tokens"] == 800


def test_openai_respects_provider_rate_limit():
    provider = openai_provider(
        lambda request: httpx.Response(429, json={"error": "slow down"})
    )
    with pytest.raises(ProviderRateLimited) as exc:
        run(provider.chat(MESSAGES, max_tokens=500))
    assert exc.value.status_code == 429
    assert exc.value.code == "provider_rate_limited"


def test_openai_auth_failure_is_clear():
    provider = openai_provider(
        lambda request: httpx.Response(401, json={"error": "invalid key"})
    )
    with pytest.raises(ProviderUnavailable) as exc:
        run(provider.chat(MESSAGES, max_tokens=500))
    assert "credentials" in exc.value.message.lower()


def test_openai_empty_choices_invalid():
    provider = openai_provider(
        lambda request: httpx.Response(200, json={"choices": []})
    )
    with pytest.raises(ProviderResponseInvalid):
        run(provider.chat(MESSAGES, max_tokens=500))


def test_openai_blank_content_invalid():
    provider = openai_provider(
        lambda request: httpx.Response(
            200, json={"choices": [{"message": {"content": "   "}}]}
        )
    )
    with pytest.raises(ProviderResponseInvalid):
        run(provider.chat(MESSAGES, max_tokens=500))


def test_openai_malformed_json_invalid():
    provider = openai_provider(
        lambda request: httpx.Response(200, content=b"<html>oops</html>")
    )
    with pytest.raises(ProviderResponseInvalid):
        run(provider.chat(MESSAGES, max_tokens=500))


def test_openai_timeout_mapped():
    def handler(request):
        raise httpx.ConnectTimeout("too slow")

    provider = openai_provider(handler)
    with pytest.raises(ProviderTimeout) as exc:
        run(provider.chat(MESSAGES, max_tokens=500))
    assert exc.value.status_code == 504


def test_openai_connection_error_mapped():
    def handler(request):
        raise httpx.ConnectError("refused")

    provider = openai_provider(handler)
    with pytest.raises(ProviderUnavailable) as exc:
        run(provider.chat(MESSAGES, max_tokens=500))
    assert exc.value.status_code == 503


def test_openai_model_not_found():
    provider = openai_provider(
        lambda request: httpx.Response(404, json={"error": "no such model"})
    )
    with pytest.raises(ProviderUnavailable) as exc:
        run(provider.chat(MESSAGES, max_tokens=500))
    assert "model" in exc.value.message.lower()


# --- Ollama ------------------------------------------------------------------
def test_ollama_success_and_num_predict():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["path"] = request.url.path
        captured["body"] = json.loads(request.content)
        return httpx.Response(200, json={"message": {"content": "Ollama says hi"}})

    provider = ollama_provider(handler)
    outcome = run(provider.chat(MESSAGES, max_tokens=1000))

    assert outcome.text == "Ollama says hi"
    assert outcome.provider == "ollama"
    assert outcome.kind == "local"
    assert captured["path"] == "/api/chat"
    assert captured["body"]["stream"] is False
    assert captured["body"]["options"]["num_predict"] == 1000


def test_ollama_error_field_json():
    provider = ollama_provider(
        lambda request: httpx.Response(200, json={"error": "model 'x' not found"})
    )
    with pytest.raises(ProviderUnavailable) as exc:
        run(provider.chat(MESSAGES, max_tokens=500))
    assert "Ollama" in exc.value.message


def test_ollama_empty_message_invalid():
    provider = ollama_provider(
        lambda request: httpx.Response(200, json={"message": {"content": ""}})
    )
    with pytest.raises(ProviderResponseInvalid):
        run(provider.chat(MESSAGES, max_tokens=500))


# --- Factory -----------------------------------------------------------------
def test_build_provider_ollama():
    provider = build_provider(Settings(_env_file=None, ai_provider="ollama",
                                       ollama_model="qwen3:4b"))
    assert isinstance(provider, OllamaProvider)
    assert provider.model == "qwen3:4b"
    assert provider.kind == "local"


def test_build_provider_openai_compatible():
    provider = build_provider(Settings(
        _env_file=None, ai_provider="openai_compatible", ai_model="openai/gpt-oss-20b",
        openai_api_key="k", ai_reasoning_effort="low",
    ))
    assert isinstance(provider, OpenAICompatibleProvider)
    assert provider.model == "openai/gpt-oss-20b"
    assert provider._reasoning_effort == "low"


def test_build_provider_rejects_unknown():
    with pytest.raises(RuntimeError):
        build_provider(Settings(_env_file=None, ai_provider="nonsense"))


def test_key_alone_selects_openai_provider(monkeypatch):
    # A host with only a key and no Ollama daemon needs no second switch.
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    provider = build_provider(Settings(_env_file=None, openai_api_key="k"))
    assert isinstance(provider, OpenAICompatibleProvider)


def test_explicit_ollama_wins_over_a_key(monkeypatch):
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    provider = build_provider(
        Settings(_env_file=None, ai_provider="ollama", openai_api_key="k")
    )
    assert isinstance(provider, OllamaProvider)


@pytest.mark.parametrize("env_name", ["OPENAI_API_KEY", "GROQ_API_KEY", "GROQAPI"])
def test_api_key_env_aliases(monkeypatch, env_name):
    # Host dashboards name the same credential differently; all are accepted.
    for name in ("OPENAI_API_KEY", "GROQ_API_KEY", "GROQAPI"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv(env_name, "gsk-from-env")
    settings = Settings(_env_file=None)
    assert settings.openai_api_key == "gsk-from-env"
