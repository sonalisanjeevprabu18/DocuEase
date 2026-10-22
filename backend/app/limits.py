"""Usage control: per-IP sliding-window rate limiting and session quotas.

Quota model (per browser session id):
- at most ``max_generations_per_session`` successful generations,
- at most one in-flight generation at a time,
- a cooldown between attempts (starts when an attempt starts, so failed
  provider calls cannot be spammed either),
- optional SQLite persistence so counters survive process restarts where the
  host provides a persistent disk.

Honest limitations: session ids are client-held, so a determined abuser can
mint new sessions. This throttles casual abuse on a free tier; it is not an
abuse-proof billing system. See README "Limitations".
"""

from __future__ import annotations

import math
import sqlite3
import threading
import time
from collections import defaultdict, deque

from .config import Settings
from .errors import (
    CooldownActive,
    GenerationInProgress,
    RateLimited,
    UsageLimitExceeded,
)
from .schemas import UsageInfo

_MAX_TRACKED_SESSIONS = 10_000


class RateLimiter:
    """Sliding-window counter keyed by an arbitrary string (client IP)."""

    def __init__(self, limit: int, window_seconds: float):
        self.limit = limit
        self.window = window_seconds
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str) -> None:
        """Record one event or raise RateLimited with Retry-After."""
        now = time.monotonic()
        with self._lock:
            q = self._events[key]
            cutoff = now - self.window
            while q and q[0] <= cutoff:
                q.popleft()
            if len(q) >= self.limit:
                retry_after = max(1, math.ceil(self.window - (now - q[0])))
                err = RateLimited(
                    f"Too many requests. Please wait about {retry_after} "
                    "seconds and try again.",
                    extra={"retry_after_seconds": retry_after},
                )
                err.headers = {"Retry-After": str(retry_after)}
                raise err
            q.append(now)

    def reset(self) -> None:
        with self._lock:
            self._events.clear()


class SessionQuotaStore:
    """Tracks generation usage for each session id."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._lock = threading.Lock()
        self._sessions: dict[str, dict] = {}
        self._db_path = settings.quota_db_path or None
        self._db: sqlite3.Connection | None = None
        if self._db_path:
            self._db = sqlite3.connect(self._db_path, check_same_thread=False)
            self._db.execute(
                "CREATE TABLE IF NOT EXISTS quota ("
                " session_id TEXT PRIMARY KEY,"
                " used INTEGER NOT NULL DEFAULT 0,"
                " updated_at REAL NOT NULL DEFAULT 0)"
            )
            self._db.commit()

    # -- internals ---------------------------------------------------------
    def _get(self, sid: str) -> dict:
        state = self._sessions.get(sid)
        if state is None:
            used = self._db_load(sid)
            state = {"used": used, "last_attempt": 0.0, "in_flight": False}
            if len(self._sessions) >= _MAX_TRACKED_SESSIONS:
                # bounded memory: drop the oldest tracked session (its durable
                # counter, if any, is still in SQLite)
                self._sessions.pop(next(iter(self._sessions)), None)
            self._sessions[sid] = state
        return state

    def _db_load(self, sid: str) -> int:
        if self._db is None:
            return 0
        try:
            row = self._db.execute(
                "SELECT used FROM quota WHERE session_id = ?", (sid,)
            ).fetchone()
            return int(row[0]) if row else 0
        except sqlite3.Error:
            return 0

    def _db_save(self, sid: str, used: int) -> None:
        if self._db is None:
            return
        try:
            self._db.execute(
                "INSERT INTO quota (session_id, used, updated_at) VALUES (?, ?, ?) "
                "ON CONFLICT(session_id) DO UPDATE SET used = excluded.used, "
                "updated_at = excluded.updated_at",
                (sid, used, time.time()),
            )
            self._db.commit()
        except sqlite3.Error:
            # Persistence is best effort; in-memory accounting still applies.
            pass

    # -- public API --------------------------------------------------------
    def usage(self, sid: str) -> UsageInfo:
        limit = self.settings.max_generations_per_session
        with self._lock:
            state = self._get(sid)
            used = state["used"]
            in_flight = state["in_flight"]
            cooldown_left = 0.0
            if state["last_attempt"]:
                elapsed = time.time() - state["last_attempt"]
                cooldown_left = max(
                    0.0, self.settings.generation_cooldown_seconds - elapsed
                )
        return UsageInfo(
            used=used,
            limit=limit,
            remaining=max(0, limit - used),
            cooldown_seconds=round(cooldown_left, 1),
            generation_in_progress=in_flight,
        )

    def reserve(self, sid: str) -> None:
        """Claim a generation slot or raise a typed limit error."""
        with self._lock:
            state = self._get(sid)
            if state["in_flight"]:
                raise GenerationInProgress(
                    "A generation is already running for this session. "
                    "Wait for it to finish before starting another."
                )
            limit = self.settings.max_generations_per_session
            if state["used"] >= limit:
                raise UsageLimitExceeded(
                    f"You have used all {limit} free AI generations for this "
                    "session. Process another document in Demo mode, or start "
                    "a fresh session to reset the counter.",
                    extra={"used": state["used"], "limit": limit},
                )
            if state["last_attempt"]:
                elapsed = time.time() - state["last_attempt"]
                cooldown = self.settings.generation_cooldown_seconds
                if elapsed < cooldown:
                    wait = math.ceil(cooldown - elapsed)
                    raise CooldownActive(
                        f"Please wait {wait} second(s) between generations "
                        "so the free tier is not overwhelmed.",
                        extra={"retry_after_seconds": wait},
                    )
            state["in_flight"] = True
            state["last_attempt"] = time.time()

    def release(self, sid: str, success: bool) -> None:
        """Free the in-flight slot; count the generation only on success."""
        with self._lock:
            state = self._get(sid)
            state["in_flight"] = False
            if success:
                state["used"] = min(
                    state["used"] + 1,
                    self.settings.max_generations_per_session,
                )
                self._db_save(sid, state["used"])

    def reset(self) -> None:
        with self._lock:
            self._sessions.clear()

    def close(self) -> None:
        if self._db is not None:
            try:
                self._db.close()
            except sqlite3.Error:
                pass
