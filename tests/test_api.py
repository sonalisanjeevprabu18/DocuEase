"""Integration tests: HTTP behaviour of the whole API."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.errors import ProviderRateLimited, ProviderTimeout
from app.main import create_app
from helpers import (
    DOCX_MIME,
    FakeProvider,
    docx_bytes,
    generate_payload,
    pdf_bytes,
    upload,
)

SID = "test-session-0001"


# --- Basic endpoints ---------------------------------------------------------
def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["health"] == "/health"


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["provider"] == "fake"
    assert body["provider_configured"] is True
    assert body["environment"] == "test"


def test_health_deep_without_reachable_provider(client):
    r = client.get("/health?deep=true")
    assert r.status_code == 200
    assert r.json()["provider_reachable"] is None


def test_config_public_catalogue(client):
    body = client.get("/api/config").json()
    assert len(body["formats"]) == 8
    assert {f["id"] for f in body["formats"]} >= {"qa", "study_notes", "section_wise"}
    assert body["formats"][0]["label"] == "Quick Summary"
    assert "languages" not in body  # English only: no language selector to serve
    assert body["limits"]["max_upload_mb"] == 5.0
    assert body["limits"]["max_extracted_chars"] == 20_000
    assert body["limits"]["max_generations_per_session"] == 3
    assert body["limits"]["max_output_tokens"] == 1_000
    assert body["demo_enabled"] is True
    assert body["tts_enabled"] is True
    assert body["sample"]["text"]


def test_privacy_notice_reflects_external_provider(app, client, fake_provider):
    body = client.get("/api/config").json()
    assert body["privacy"]["external_provider"] is False

    fake_provider.kind = "external"
    body = client.get("/api/config").json()
    assert body["privacy"]["external_provider"] is True
    assert "external AI provider" in body["privacy"]["text"]
    assert "not end-to-end privacy" in body["privacy"]["text"]


def test_security_headers_present(client):
    r = client.get("/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"


def test_cors_allows_configured_origin(client):
    origin = "http://localhost:5173"
    r = client.get("/api/config", headers={"Origin": origin})
    assert r.headers.get("access-control-allow-origin") == origin


def test_cors_blocks_unknown_origin(client):
    r = client.get("/api/config", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in r.headers


# --- Extraction endpoint -----------------------------------------------------
def test_extract_txt(client):
    r = upload(client, "notes.txt", b"Quarterly revenue grew 12 percent.", "text/plain")
    assert r.status_code == 200
    body = r.json()
    assert body["filename"] == "notes.txt"
    assert body["status"] == "processed"
    assert body["word_count"] == 5
    assert body["char_count"] == len(body["text"])
    assert body["size_bytes"] > 0


def test_extract_pdf(client):
    r = upload(client, "report.pdf", pdf_bytes(), "application/pdf")
    assert r.status_code == 200
    body = r.json()
    assert body["page_count"] == 1
    assert "Quarterly Report" in body["text"]
    assert body["word_count"] > 5


def test_extract_docx_with_table(client):
    r = upload(client, "doc.docx", docx_bytes(), DOCX_MIME)
    assert r.status_code == 200
    body = r.json()
    assert body["table_count"] == 1
    assert "| Metric | Value |" in body["text"]
    assert body["headings"]


def test_extract_sanitizes_traversal_filename(client):
    r = upload(client, "../../evil.txt", b"just some text", "text/plain")
    assert r.status_code == 200
    assert r.json()["filename"] == "evil.txt"


def test_extract_unsupported_type(client):
    r = upload(client, "malware.exe", b"MZ...", "application/x-msdownload")
    assert r.status_code == 415
    assert r.json()["error"]["code"] == "unsupported_type"


def test_extract_oversized_file_rejected(client):
    payload = b"a" * (6 * 1024 * 1024)
    r = upload(client, "big.txt", payload, "text/plain")
    assert r.status_code == 413
    assert r.json()["error"]["code"] == "file_too_large"


def test_extract_corrupt_pdf(client):
    r = upload(client, "broken.pdf", b"%PDF-1.4\n not really", "application/pdf")
    assert r.status_code == 422
    assert r.json()["error"]["code"] in ("invalid_file", "corrupted_file")


def test_extract_empty_document(client):
    r = upload(client, "empty.txt", b"    \n\n ", "text/plain")
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "empty_document"


def test_extract_scanned_pdf_explains_ocr(client):
    r = upload(client, "scan.pdf", pdf_bytes(scanned=True), "application/pdf")
    assert r.status_code == 422
    body = r.json()["error"]
    assert body["code"] == "ocr_required"
    assert "OCR" in body["message"]


def test_extract_text_too_long_rejected_not_truncated(client):
    r = upload(client, "long.txt", ("word " * 5000).encode(), "text/plain")
    assert r.status_code == 413
    body = r.json()["error"]
    assert body["code"] == "text_too_long"
    assert body["char_count"] > 20_000
    assert body["limit"] == 20_000


# --- Generation --------------------------------------------------------------
def test_generate_success(client, fake_provider):
    r = client.post("/api/generate", json=generate_payload("The report says revenue grew 12%."))
    assert r.status_code == 200
    body = r.json()
    assert body["output"] == "FAKE EXPLANATION"
    assert body["provider"] == "fake"
    assert body["usage"] == {
        "used": 1, "limit": 3, "remaining": 2,
        "cooldown_seconds": 0.0, "generation_in_progress": False,
    }
    assert len(fake_provider.calls) == 1
    call = fake_provider.calls[0]
    assert call["max_tokens"] == 1000
    assert "revenue grew 12%" in call["messages"][1]["content"]
    assert "English" in call["messages"][0]["content"]


def test_generate_empty_text(client):
    r = client.post("/api/generate", json=generate_payload("   "))
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "empty_document"


def test_generate_too_long_text_no_provider_call(client, fake_provider):
    r = client.post("/api/generate", json=generate_payload("x" * 20_001))
    assert r.status_code == 413
    assert r.json()["error"]["code"] == "text_too_long"
    assert fake_provider.calls == []


def test_generate_invalid_format(client):
    r = client.post("/api/generate", json=generate_payload(format="poem"))
    assert r.status_code == 422


def test_generate_usage_limit(client):
    for _ in range(3):
        assert client.post("/api/generate", json=generate_payload()).status_code == 200
    r = client.post("/api/generate", json=generate_payload())
    assert r.status_code == 429
    body = r.json()["error"]
    assert body["code"] == "usage_limit_exceeded"
    assert body["used"] == 3 and body["limit"] == 3


def test_generate_cooldown(settings):
    settings = settings.model_copy(update={"generation_cooldown_seconds": 60.0})
    app = create_app(settings)
    app.state.provider = FakeProvider()
    with TestClient(app) as c:
        assert c.post("/api/generate", json=generate_payload()).status_code == 200
        r = c.post("/api/generate", json=generate_payload())
        assert r.status_code == 429
        assert r.json()["error"]["code"] == "cooldown_active"


def test_generate_single_flight_per_session(app, client):
    app.state.quotas.reserve(SID)
    try:
        r = client.post("/api/generate", json=generate_payload())
        assert r.status_code == 409
        assert r.json()["error"]["code"] == "generation_in_progress"
    finally:
        app.state.quotas.release(SID, success=False)


def test_provider_timeout_does_not_consume_credit(client, fake_provider):
    fake_provider.error = ProviderTimeout("timed out")
    r = client.post("/api/generate", json=generate_payload())
    assert r.status_code == 504
    assert r.json()["error"]["code"] == "provider_timeout"

    fake_provider.error = None
    r = client.post("/api/generate", json=generate_payload())
    assert r.status_code == 200
    assert r.json()["usage"]["used"] == 1


def test_provider_rate_limit_surfaced(client, fake_provider):
    fake_provider.error = ProviderRateLimited("slow down")
    r = client.post("/api/generate", json=generate_payload())
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "provider_rate_limited"


# --- Demo mode ---------------------------------------------------------------
def test_demo_generate_needs_no_ai(client, fake_provider):
    r = client.post("/api/demo/generate",
                    json={"format": "bullet_points", "session_id": SID})
    assert r.status_code == 200
    body = r.json()
    assert body["provider"] == "demo"
    assert "Key points" in body["output"]
    assert body["usage"]["used"] == 0
    assert fake_provider.calls == []


def test_demo_does_not_consume_generation_quota(client):
    for _ in range(5):
        assert client.post("/api/demo/generate",
                           json={"format": "qa"}).status_code == 200
    r = client.post("/api/generate", json=generate_payload())
    assert r.json()["usage"]["used"] == 1


def test_demo_disabled(settings):
    settings = settings.model_copy(update={"demo_enabled": False})
    app = create_app(settings)
    app.state.provider = FakeProvider()
    with TestClient(app) as c:
        r = c.post("/api/demo/generate", json={"format": "qa"})
        assert r.status_code == 403
        assert r.json()["error"]["code"] == "demo_disabled"


# --- TTS ---------------------------------------------------------------------
def test_tts_returns_real_audio_response(client, monkeypatch):
    monkeypatch.setattr("app.main.synthesize",
                        lambda text, max_chars: b"ID3\x04FAKE_MP3")
    r = client.post("/api/tts", json={"text": "Hello", "session_id": SID})
    assert r.status_code == 200
    assert r.headers["content-type"] == "audio/mpeg"
    assert "attachment" in r.headers["content-disposition"]
    assert r.content.startswith(b"ID3")


def test_tts_disabled(settings, monkeypatch):
    settings = settings.model_copy(update={"tts_enabled": False})
    app = create_app(settings)
    app.state.provider = FakeProvider()
    with TestClient(app) as c:
        r = c.post("/api/tts", json={"text": "Hello"})
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "tts_disabled"


def test_tts_guards_before_network():
    from app.errors import ApiError
    from app.tts import synthesize

    try:
        synthesize("x" * 5000, 4000)
    except ApiError as exc:
        assert exc.code == "tts_text_too_long"
        assert exc.status_code == 413
    else:
        raise AssertionError("expected tts_text_too_long")


# --- Rate limiting -----------------------------------------------------------
def test_api_rate_limited(settings):
    settings = settings.model_copy(update={"rate_limit_requests": 3})
    app = create_app(settings)
    app.state.provider = FakeProvider()
    with TestClient(app) as c:
        for _ in range(3):
            assert c.get("/api/config").status_code == 200
        r = c.get("/api/config")
        assert r.status_code == 429
        body = r.json()["error"]
        assert body["code"] == "rate_limited"
        assert int(r.headers["retry-after"]) >= 1
