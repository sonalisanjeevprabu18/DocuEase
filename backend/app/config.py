"""Application configuration.

Every security- or cost-sensitive limit lives here and is overridable through
environment variables so the same image can run locally and on a free host.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- General ---------------------------------------------------------
    app_name: str = "DocuEase API"
    environment: str = Field(default="development")  # development | production
    debug: bool = False

    # --- CORS ------------------------------------------------------------
    # Comma separated list of allowed origins. In production this must be the
    # real frontend domain (e.g. https://docuease.vercel.app).
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    # Optional regex for preview deployments whose hostname changes on every
    # build, e.g. r"https://.*\.vercel\.app". Empty means origins only.
    allowed_origin_regex: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    # --- Upload / extraction limits -------------------------------------
    max_upload_bytes: int = 5 * 1024 * 1024  # 5 MB
    max_extracted_chars: int = 20_000  # per generation, never silently truncated

    # --- Generation limits ----------------------------------------------
    max_generations_per_session: int = 3
    max_concurrent_generations_per_session: int = 1
    generation_cooldown_seconds: float = 15.0
    max_output_tokens: int = 1_000
    provider_timeout_seconds: float = 120.0
    provider_connect_timeout_seconds: float = 5.0

    # --- Request rate limiting (per client IP) ---------------------------
    rate_limit_requests: int = 30
    rate_limit_window_seconds: float = 60.0

    # --- Session quota persistence (optional) ----------------------------
    # When set, quota counters survive process restarts (best effort: free
    # hosts usually have ephemeral disks).
    quota_db_path: str = ""

    # --- AI provider -----------------------------------------------------
    # provider = "ollama" (local) or "openai_compatible" (Groq, OpenRouter,
    # OpenAI, Together, ... any /v1/chat/completions endpoint).
    ai_provider: str = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    # qwen3 "thinking" models spend the whole token budget on reasoning and
    # return empty/slow answers here; qwen2.5:1.5b is a fast, low-RAM default.
    # Use qwen2.5:7b / llama3.1:8b for better quality and multilingual output.
    ollama_model: str = "qwen2.5:1.5b"
    openai_base_url: str = "https://api.groq.com/openai/v1"
    openai_api_key: str = ""
    ai_model: str = "llama-3.1-8b-instant"

    # --- Text-to-speech (optional, real MP3 downloads) -------------------
    # Browser SpeechSynthesis is the default playback path; the server only
    # generates a downloadable file when tts_enabled is true.
    tts_enabled: bool = True
    tts_max_chars: int = 4_000

    # --- Demo mode -------------------------------------------------------
    demo_enabled: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
