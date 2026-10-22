"""Configurable AI provider interface.

Two implementations behind one small interface:

- ``OllamaProvider``          -> local Ollama (no per-request model fees; needs a
                                 running machine with enough RAM/VRAM).
- ``OpenAICompatibleProvider``-> any OpenAI-style ``/chat/completions`` API
                                 (Groq free tier, OpenRouter free models, ...).

Selection is explicit via the ``AI_PROVIDER`` environment variable. No
provider's quotas or rate limits are ever bypassed: upstream 429s are
surfaced to the caller as clear, retryable errors.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import httpx

from .config import Settings
from .errors import (
    ProviderRateLimited,
    ProviderResponseInvalid,
    ProviderTimeout,
    ProviderUnavailable,
)

logger = logging.getLogger(__name__)


@dataclass
class GenerationOutcome:
    text: str
    provider: str  # "ollama" | "openai_compatible"
    model: str
    kind: str      # "local" | "external"


class BaseProvider:
    name = "base"
    kind = "external"

    def __init__(self, model: str, *, timeout: float, connect_timeout: float,
                 client: httpx.AsyncClient | None = None):
        self.model = model
        self.timeout = timeout
        self.connect_timeout = connect_timeout
        self._client = client

    async def chat(self, messages: list[dict[str, str]], *, max_tokens: int) -> GenerationOutcome:
        raise NotImplementedError

    def _timeouts(self) -> httpx.Timeout:
        return httpx.Timeout(self.timeout, connect=self.connect_timeout)

    async def _post(self, url: str, *, json: dict[str, Any],
                    headers: dict[str, str] | None = None) -> httpx.Response:
        try:
            if self._client is not None:
                resp = await self._client.post(url, json=json, headers=headers,
                                               timeout=self._timeouts())
            else:
                async with httpx.AsyncClient(timeout=self._timeouts()) as client:
                    resp = await client.post(url, json=json, headers=headers)
        except httpx.TimeoutException as exc:
            raise ProviderTimeout(
                f"The AI provider did not respond within {int(self.timeout)} seconds. "
                "Please try again."
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailable(
                "Could not reach the AI provider. Check that it is running "
                "and reachable from this server."
            ) from exc
        return self._handle(resp)

    @staticmethod
    def _handle(resp: httpx.Response) -> httpx.Response:
        if resp.status_code == 429:
            raise ProviderRateLimited(
                "The AI provider is rate-limiting requests. Wait a moment and "
                "try again (this attempt did not use a generation credit)."
            )
        if resp.status_code in (401, 403):
            raise ProviderUnavailable(
                "The AI provider rejected the configured credentials. Check "
                "the API key environment variable."
            )
        if resp.status_code >= 500:
            raise ProviderUnavailable(
                "The AI provider returned a server error. Please try again later."
            )
        if resp.status_code == 404:
            raise ProviderUnavailable(
                "The configured model was not found on the provider. Check the "
                "model name (and that the model is pulled for Ollama)."
            )
        if resp.status_code >= 400:
            detail = ""
            try:
                detail = str(resp.json().get("error", ""))[:300]
            except Exception:
                detail = resp.text[:300]
            raise ProviderUnavailable(
                f"The AI provider rejected the request. {detail}".strip()
            )
        return resp

    @staticmethod
    def _json(resp: httpx.Response) -> dict[str, Any]:
        try:
            data = resp.json()
        except Exception as exc:
            raise ProviderResponseInvalid(
                "The AI provider returned a malformed response."
            ) from exc
        if not isinstance(data, dict):
            raise ProviderResponseInvalid(
                "The AI provider returned a malformed response."
            )
        return data


class OllamaProvider(BaseProvider):
    name = "ollama"
    kind = "local"

    async def chat(self, messages: list[dict[str, str]], *, max_tokens: int) -> GenerationOutcome:
        base = self._base
        resp = await self._post(
            f"{base}/api/chat",
            json={
                "model": self.model,
                "messages": messages,
                "stream": False,
                "options": {
                    "num_predict": max_tokens,
                    "temperature": 0.3,
                    "repeat_penalty": 1.1,
                },
            },
        )
        data = self._json(resp)
        if data.get("error"):
            raise ProviderUnavailable(f"Ollama error: {str(data['error'])[:300]}")
        content = (data.get("message") or {}).get("content")
        if not isinstance(content, str) or not content.strip():
            raise ProviderResponseInvalid(
                "The model returned an empty response. Please try again."
            )
        return GenerationOutcome(text=content.strip(), provider=self.name,
                                 model=self.model, kind=self.kind)

    @property
    def _base(self) -> str:
        return getattr(self, "_base_url", "").rstrip("/")

    def __init__(self, model: str, *, base_url: str, timeout: float,
                 connect_timeout: float, client: httpx.AsyncClient | None = None):
        super().__init__(model, timeout=timeout, connect_timeout=connect_timeout,
                         client=client)
        self._base_url = base_url.rstrip("/")

    async def reachable(self, probe_timeout: float = 3.0) -> bool:
        try:
            if self._client is not None:
                resp = await self._client.get(f"{self._base}/api/tags",
                                              timeout=probe_timeout)
                return resp.status_code == 200
            async with httpx.AsyncClient(timeout=probe_timeout) as client:
                resp = await client.get(f"{self._base}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False


class OpenAICompatibleProvider(BaseProvider):
    name = "openai_compatible"
    kind = "external"

    def __init__(self, model: str, *, base_url: str, api_key: str = "",
                 timeout: float = 60.0, connect_timeout: float = 5.0,
                 client: httpx.AsyncClient | None = None):
        super().__init__(model, timeout=timeout, connect_timeout=connect_timeout,
                         client=client)
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key

    async def chat(self, messages: list[dict[str, str]], *, max_tokens: int) -> GenerationOutcome:
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        resp = await self._post(
            f"{self._base_url}/chat/completions",
            json={
                "model": self.model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.3,
            },
            headers=headers,
        )
        data = self._json(resp)
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderResponseInvalid(
                "The AI provider returned a response in an unexpected format."
            ) from exc
        if not isinstance(content, str) or not content.strip():
            raise ProviderResponseInvalid(
                "The model returned an empty response. Please try again."
            )
        return GenerationOutcome(text=content.strip(), provider=self.name,
                                 model=self.model, kind=self.kind)

    async def reachable(self, probe_timeout: float = 3.0) -> bool:
        # Cheap authenticated-less probe: list models if supported, else root.
        url = f"{self._base_url}/models"
        headers = {"Authorization": f"Bearer {self._api_key}"} if self._api_key else None
        try:
            if self._client is not None:
                resp = await self._client.get(url, headers=headers, timeout=probe_timeout)
                return resp.status_code < 500
            async with httpx.AsyncClient(timeout=probe_timeout) as client:
                resp = await client.get(url, headers=headers)
                return resp.status_code < 500
        except Exception:
            return False


def build_provider(settings: Settings,
                   client: httpx.AsyncClient | None = None) -> BaseProvider:
    """Create the provider declared by configuration. Fails fast when unknown."""
    kind = settings.ai_provider.strip().lower()
    common = dict(timeout=settings.provider_timeout_seconds,
                  connect_timeout=settings.provider_connect_timeout_seconds,
                  client=client)
    if kind == "ollama":
        return OllamaProvider(settings.ollama_model,
                              base_url=settings.ollama_base_url, **common)
    if kind in ("openai", "openai_compatible", "groq", "openrouter", "openai-compatible"):
        provider = OpenAICompatibleProvider(
            settings.ai_model,
            base_url=settings.openai_base_url,
            api_key=settings.openai_api_key,
            **common,
        )
        if kind in ("groq", "openrouter"):
            provider.name = kind
        return provider
    raise RuntimeError(
        f"Unknown AI_PROVIDER '{settings.ai_provider}'. "
        "Use 'ollama' or 'openai_compatible'."
    )
