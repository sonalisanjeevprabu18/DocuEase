"""Vercel Python entrypoint.

Vercel looks for an ASGI ``app`` object in a top-level module (``index.py``,
``app.py``, ``main.py`` ...). The application itself lives in ``app/main.py``,
so this file only re-exports it.
"""

from app.main import app

__all__ = ["app"]
