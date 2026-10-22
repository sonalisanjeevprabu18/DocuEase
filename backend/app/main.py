"""DocuEase FastAPI application: routes, security, rate limiting, wiring.

Separation of concerns:
- ``extraction.py``  document parsing/validation
- ``providers.py``   AI provider abstraction
- ``prompts.py``     format/language prompt construction
- ``limits.py``      rate limiting + session quotas
- ``demo.py``        AI-free demo outputs
- ``tts.py``         optional real-MP3 generation
This module only wires them together behind HTTP.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from .config import Settings, get_settings
from .demo import SAMPLE_DOCUMENT, SAMPLE_FILENAME, demo_output
from .errors import (
    ApiError,
    EmptyDocument,
    TextTooLong,
    api_error_handler,
    unhandled_error_handler,
)
from .extraction import extract_upload, read_upload_limited, sanitize_filename
from .limits import RateLimiter, SessionQuotaStore
from .prompts import build_messages, output_matches_language, resolve_language
from .providers import BaseProvider, build_provider
from .schemas import (
    FORMATS,
    LANGUAGES,
    DemoGenerateRequest,
    ExtractResponse,
    GenerateRequest,
    GenerateResponse,
    HealthResponse,
    TtsRequest,
)
from .tts import synthesize

logger = logging.getLogger(__name__)


def _mb(n: int) -> float:
    return round(n / (1024 * 1024), 1)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def rate_limit(request: Request) -> None:
    """Sliding-window per-IP limit on all /api routes."""
    request.app.state.rate_limiter.check(_client_ip(request))


RateLimitDep = Annotated[None, Depends(rate_limit)]


def _privacy_info(provider: BaseProvider, settings: Settings) -> dict:
    if provider.kind == "local":
        text = (
            "Your document is processed on this server only. The extracted "
            "text is sent to a locally hosted AI model (Ollama) and is not "
            "shared with any third-party AI provider. Uploaded files are held "
            "in memory only for the length of the request and are never stored "
            "by this application."
        )
    else:
        text = (
            "Your document is processed on this server, and its extracted "
            f"text is sent to an external AI provider ({provider.name}, model "
            f"{provider.model}) to generate the explanation. That provider "
            "may retain requests under its own privacy policy, so avoid "
            "uploading confidential material if this is not acceptable. "
            "Uploaded files themselves are held in memory only for the length "
            "of the request and are never stored by this application; this is "
            "not end-to-end privacy while an external provider is used."
        )
    tts = ""
    if settings.tts_enabled:
        tts = (" For MP3 downloads, the text you want spoken is sent to "
               "Google's free translate speech endpoint; in-browser playback "
               "sends nothing anywhere.")
    return {"external_provider": provider.kind == "external",
            "text": text + tts}


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        logger.info("Starting %s (env=%s, provider=%s)",
                    settings.app_name, settings.environment,
                    settings.ai_provider)
        yield
        app.state.quotas.close()

    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description="Upload a document; get a faithful, easy-to-understand "
                    "explanation in your language, plus optional audio.",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.rate_limiter = RateLimiter(settings.rate_limit_requests,
                                         settings.rate_limit_window_seconds)
    app.state.quotas = SessionQuotaStore(settings)
    # Fail fast on unknown AI_PROVIDER; tests inject a fake into app.state.provider.
    app.state.provider = build_provider(settings)

    # --- Middleware (guard first, CORS added after so it is outermost and
    #     decorates every response, including rejections) ------------------
    @app.middleware("http")
    async def request_guard(request: Request, call_next):
        path = request.url.path
        content_length = request.headers.get("content-length", "")
        if (path.startswith("/api/")
                and content_length.isdigit()
                and int(content_length) > settings.max_upload_bytes + 8192):
            return JSONResponse(
                status_code=413,
                content={"error": {
                    "code": "file_too_large",
                    "message": f"File is larger than the "
                               f"{_mb(settings.max_upload_bytes)} MB upload limit.",
                    "max_bytes": settings.max_upload_bytes,
                }},
            )
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["Retry-After"],
    )

    app.add_exception_handler(ApiError, api_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)

    # --- Health -------------------------------------------------------------
    @app.get("/health", response_model=HealthResponse, tags=["ops"])
    async def health(request: Request, deep: bool = False):
        provider: BaseProvider = request.app.state.provider
        reachable: bool | None = None
        if deep and hasattr(provider, "reachable"):
            reachable = await provider.reachable(probe_timeout=3.0)
        configured = provider.kind == "local" or bool(settings.openai_api_key)
        return HealthResponse(
            status="ok",
            provider=provider.name,
            provider_configured=configured,
            provider_reachable=reachable,
            environment=settings.environment,
        )

    @app.get("/", tags=["ops"])
    async def root():
        return {"name": settings.app_name, "docs": "/docs",
                "health": "/health", "api": "/api/config"}

    # --- Public config (formats, languages, limits, privacy) ---------------
    @app.get("/api/config", tags=["config"])
    async def public_config(request: Request, _: RateLimitDep):
        provider: BaseProvider = request.app.state.provider
        return {
            "app_name": settings.app_name,
            "formats": FORMATS,
            "languages": [{"code": c, "label": n} for c, n in LANGUAGES.items()],
            "limits": {
                "max_upload_mb": _mb(settings.max_upload_bytes),
                "max_extracted_chars": settings.max_extracted_chars,
                "max_generations_per_session":
                    settings.max_generations_per_session,
                "generation_cooldown_seconds":
                    settings.generation_cooldown_seconds,
                "max_output_tokens": settings.max_output_tokens,
                "rate_limit_per_minute": settings.rate_limit_requests,
            },
            "provider": {
                "kind": provider.kind,
                "name": provider.name,
                "model": provider.model,
            },
            "privacy": _privacy_info(provider, settings),
            "demo_enabled": settings.demo_enabled,
            "tts_enabled": settings.tts_enabled,
            "sample": {"filename": SAMPLE_FILENAME, "text": SAMPLE_DOCUMENT}
            if settings.demo_enabled else None,
        }

    # --- Document extraction -------------------------------------------------
    @app.post("/api/documents/extract", response_model=ExtractResponse,
              tags=["documents"], dependencies=[Depends(rate_limit)])
    async def extract_document(request: Request,
                               file: Annotated[UploadFile, File(...)]):
        try:
            data = await read_upload_limited(file, settings.max_upload_bytes)
            result = extract_upload(file.filename or "document",
                                    file.content_type, data)
            if result.char_count > settings.max_extracted_chars:
                raise TextTooLong(
                    f"Your document has {result.char_count:,} characters, "
                    f"above the {settings.max_extracted_chars:,}-character "
                    "per-generation limit. Nothing was truncated - please "
                    "split the document and upload a smaller part.",
                    extra={"char_count": result.char_count,
                           "limit": settings.max_extracted_chars},
                )
            return ExtractResponse(
                filename=sanitize_filename(file.filename),
                size_bytes=len(data),
                word_count=result.word_count,
                char_count=result.char_count,
                text=result.text,
                headings=result.headings,
                table_count=result.table_count,
                page_count=result.page_count,
                warnings=result.warnings,
                status="processed",
            )
        finally:
            # Closes/deletes any temp file python-multipart spooled for this
            # upload - on success AND on every failure path.
            await file.close()

    # --- Generation ------------------------------------------------------------
    @app.post("/api/generate", response_model=GenerateResponse, tags=["ai"])
    async def generate(request: Request, body: GenerateRequest,
                       _: RateLimitDep):
        language_name = resolve_language(body.language)  # typed 422 if unsupported
        if not body.text.strip():
            raise EmptyDocument("There is no text to explain.")
        if len(body.text) > settings.max_extracted_chars:
            raise TextTooLong(
                f"The submitted text is {len(body.text):,} characters; the "
                f"limit is {settings.max_extracted_chars:,} characters per "
                "generation. Nothing was truncated - shorten the input or "
                "split it into parts.",
                extra={"char_count": len(body.text),
                       "limit": settings.max_extracted_chars},
            )

        sid = body.session_id
        quotas: SessionQuotaStore = request.app.state.quotas
        quotas.reserve(sid)  # raises typed 409/429 limit errors
        success = False
        try:
            messages = build_messages(body.text, body.format, body.language)
            provider: BaseProvider = request.app.state.provider
            outcome = await provider.chat(
                messages, max_tokens=settings.max_output_tokens
            )
            # Refuse to return output in the wrong language: small models can
            # ignore the instruction. Script-based check where reliable.
            if output_matches_language(outcome.text, body.language) is False:
                raise ApiError(
                    f"The configured model did not reply in {language_name}. It may "
                    "not support this language reliably - try English, or "
                    "configure a stronger model. This attempt did not use a "
                    "generation credit.",
                    code="language_unsupported", status_code=422,
                    extra={"language": body.language},
                )
            success = True
        finally:
            quotas.release(sid, success)

        return GenerateResponse(
            output=outcome.text,
            format=body.format,
            language=body.language,
            provider=outcome.provider,
            model=outcome.model,
            usage=quotas.usage(sid),
        )

    # --- Demo mode (no AI call, does not consume generations) ------------------
    @app.post("/api/demo/generate", response_model=GenerateResponse, tags=["ai"])
    async def demo_generate(request: Request, body: DemoGenerateRequest,
                            _: RateLimitDep):
        if not settings.demo_enabled:
            raise ApiError("Demo mode is disabled on this deployment.",
                           code="demo_disabled", status_code=403)
        resolve_language(body.language)
        output = demo_output(body.format, body.language)
        quotas: SessionQuotaStore = request.app.state.quotas
        sid = body.session_id or "demo"
        return GenerateResponse(
            output=output,
            format=body.format,
            language=body.language,
            provider="demo",
            model="none (no AI call)",
            usage=quotas.usage(sid),
        )

    @app.post("/api/tts", tags=["audio"], dependencies=[Depends(rate_limit)])
    async def tts(request: Request, body: TtsRequest):
        if not settings.tts_enabled:
            raise ApiError(
                "MP3 download is disabled on this deployment; use the "
                "in-browser player.", code="tts_disabled", status_code=404,
            )
        audio = synthesize(body.text, body.language, settings.tts_max_chars)
        return Response(
            content=audio,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition":
                    'attachment; filename="docuease-summary.mp3"',
                "Cache-Control": "no-store",
            },
        )

    return app


app = create_app()
