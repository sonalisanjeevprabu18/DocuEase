"""Unit tests for rate limiting and session quotas."""

from __future__ import annotations

import time

import pytest

from app.config import Settings
from app.errors import (
    CooldownActive,
    GenerationInProgress,
    RateLimited,
    UsageLimitExceeded,
)
from app.limits import RateLimiter, SessionQuotaStore


def _settings(**overrides) -> Settings:
    base = dict(
        _env_file=None,
        environment="test",
        max_generations_per_session=3,
        generation_cooldown_seconds=0.0,
        rate_limit_requests=1000,
        quota_db_path="",
        ai_provider="ollama",
    )
    base.update(overrides)
    return Settings(**base)


# --- rate limiter ------------------------------------------------------------
def test_rate_limiter_blocks_after_limit():
    limiter = RateLimiter(limit=2, window_seconds=60)
    limiter.check("1.2.3.4")
    limiter.check("1.2.3.4")
    with pytest.raises(RateLimited) as exc:
        limiter.check("1.2.3.4")
    assert exc.value.status_code == 429
    assert exc.value.headers["Retry-After"]
    # A different client is unaffected.
    limiter.check("5.6.7.8")


def test_rate_limiter_window_expires():
    limiter = RateLimiter(limit=1, window_seconds=0.1)
    limiter.check("ip")
    with pytest.raises(RateLimited):
        limiter.check("ip")
    time.sleep(0.15)
    limiter.check("ip")


# --- session quotas ----------------------------------------------------------
def test_failed_generation_does_not_consume_quota():
    store = SessionQuotaStore(_settings())
    store.reserve("s1")
    store.release("s1", success=False)
    usage = store.usage("s1")
    assert usage.used == 0
    assert usage.remaining == 3
    assert usage.generation_in_progress is False


def test_successful_generation_consumes_quota():
    store = SessionQuotaStore(_settings())
    store.reserve("s1")
    store.release("s1", success=True)
    usage = store.usage("s1")
    assert usage.used == 1
    assert usage.remaining == 2
    assert usage.limit == 3


def test_quota_limit_enforced():
    store = SessionQuotaStore(_settings())
    for _ in range(3):
        store.reserve("s")
        store.release("s", success=True)
    with pytest.raises(UsageLimitExceeded) as exc:
        store.reserve("s")
    assert exc.value.status_code == 429
    assert store.usage("s").remaining == 0


def test_only_one_active_generation_per_session():
    store = SessionQuotaStore(_settings())
    store.reserve("s")
    with pytest.raises(GenerationInProgress) as exc:
        store.reserve("s")
    assert exc.value.status_code == 409
    store.release("s", success=True)
    store.reserve("s")  # free again after release


def test_cooldown_between_generations():
    store = SessionQuotaStore(_settings(generation_cooldown_seconds=60.0))
    store.reserve("s")
    store.release("s", success=True)
    with pytest.raises(CooldownActive) as exc:
        store.reserve("s")
    assert exc.value.status_code == 429
    assert exc.value.extra["retry_after_seconds"] >= 1
    assert store.usage("s").cooldown_seconds > 0


def test_sessions_are_isolated():
    store = SessionQuotaStore(_settings())
    store.reserve("a")
    store.release("a", success=True)
    assert store.usage("a").used == 1
    assert store.usage("b").used == 0


def test_quota_persists_across_restarts(tmp_path):
    db = str(tmp_path / "quota.sqlite")
    settings = _settings(quota_db_path=db)
    store = SessionQuotaStore(settings)
    store.reserve("persisted")
    store.release("persisted", success=True)
    store.close()

    reopened = SessionQuotaStore(settings)
    assert reopened.usage("persisted").used == 1
    reopened.close()


def test_unknown_session_starts_at_zero():
    store = SessionQuotaStore(_settings())
    usage = store.usage("never-seen")
    assert usage.used == 0 and usage.remaining == 3
