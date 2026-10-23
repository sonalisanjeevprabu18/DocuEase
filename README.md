# DocuEase — Document Simplifier & Audio Assistant

Upload a PDF, DOCX or TXT and get a faithful, easy-to-understand explanation in
eight formats — readable, copyable, downloadable, and listenable.

DocuEase is a small full-stack application built for free-tier hosting:

- **Frontend:** React + Vite + Tailwind CSS (static SPA)
- **Backend:** Python + FastAPI, PyMuPDF / python-docx for extraction
- **AI:** configurable provider — local **Ollama** or any **OpenAI-compatible**
  endpoint (Groq free tier, OpenRouter free models, …)
- **Audio:** browser `SpeechSynthesis` by default, plus a real MP3 download when
  the optional server-side TTS succeeds

No account, no database, no stored documents. Every cost- and security-sensitive
limit is enforced server-side.

---

## Features

| Area | What it does |
| --- | --- |
| Upload | PDF, DOCX, TXT up to **5 MB**; headings, lists and tables preserved; scanned-PDF detection with OCR guidance; empty, corrupted, oversized and unsupported files rejected with clear messages |
| Formats | Short summary, detailed summary, beginner-friendly, bullet points, concepts & definitions, study notes, Q&A, section-wise |
| Output | English only: small free-tier models handle it reliably, so there is no language selector and no half-translated result |
| Results | Markdown rendering, copy, download as **TXT** or **Markdown**, usage badge |
| Audio | Play / pause / resume / stop (browser TTS), speed control; **MP3 download only when a real file is generated** |
| Demo mode | Pre-written sample explanations, no AI call, does not consume a generation |
| Limits | 5 MB upload, 20,000 chars/generation (rejected, never truncated), 3 generations/session, 1 concurrent, 15 s cooldown, 1,000 output tokens, 30 req/min per IP, 120 s provider timeout |
| Privacy | Honest notice that changes with the provider: local Ollama vs external API; no file storage; MP3 text goes to Google's free speech endpoint |

---

## Architecture

```text
┌───────────────────────────┐        HTTPS / JSON        ┌───────────────────────────────────┐
│  Browser (React + Vite)   │ ─────────────────────────► │  FastAPI backend (Python 3.11)    │
│  • drag & drop upload     │ ◄───────────────────────── │  • extraction.py  PDF/DOCX/TXT    │
│  • format tiles           │        multipart + JSON    │  • limits.py      quotas + rates  │
│  • Markdown results       │                            │  • prompts.py     format prompts  │
│  • SpeechSynthesis audio  │                            │  • providers.py   AI abstraction  │
│  • copy / TXT / MD        │                            │  • tts.py         optional MP3    │
└───────────────────────────┘                            └────────────────┬──────────────────┘
                                                                          │ chat/completions
                                                            ┌─────────────▼──────────────────┐
                                                            │ AI provider (explicit config)   │
                                                            │ • Ollama (local, no per-req fee)│
                                                            │ • Groq / OpenRouter (hosted,    │
                                                            │   OpenAI-compatible, free tier) │
                                                            └────────────────────────────────┘
```

Uploads are read into memory, parsed, and discarded when the request finishes.
The frontend keeps the extracted text in component state; nothing is persisted.

### Repository layout

```text
docuease-ai/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app factory, routes, CORS, health
│   │   ├── config.py        # all limits + provider settings (env-driven)
│   │   ├── extraction.py    # validation + PDF/DOCX/TXT parsing
│   │   ├── providers.py     # Ollama + OpenAI-compatible providers
│   │   ├── prompts.py       # per-format prompt construction
│   │   ├── limits.py        # per-IP rate limiting, session quotas
│   │   ├── demo.py          # pre-written sample outputs (no AI)
│   │   ├── tts.py           # optional real MP3 generation (gTTS)
│   │   ├── schemas.py       # Pydantic models + format catalogue
│   │   └── errors.py        # stable error codes -> HTTP responses
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── Dockerfile           # alternative container deployment
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # flow + layout
│   │   ├── api.js           # typed API client
│   │   ├── audio.js         # SpeechSynthesis hook
│   │   ├── utils.js         # plain-text/download/session helpers
│   │   └── components/      # upload, options, results, audio, privacy…
│   └── vercel.json
├── tests/                   # pytest: extraction, limits, providers, API, prompts
├── .github/workflows/ci.yml
├── render.yaml              # free-tier backend Blueprint
├── .env.example
└── LICENSE
```

---

## Quick start (local)

Prerequisites: **Python 3.11+**, **Node 20+**, and optionally
[Ollama](https://ollama.com) for real AI output (demo mode works without it).

### 1. Backend

```bash
cd backend
python -m venv ../.venv
source ../.venv/bin/activate          # Windows: ../.venv/Scripts/activate
pip install -r requirements-dev.txt

# optional: pull a small local model
ollama pull qwen2.5:1.5b

uvicorn app.main:app --reload --port 8000
```

- API docs: <http://127.0.0.1:8000/docs>
- Health: <http://127.0.0.1:8000/health> (use `?deep=true` to probe the provider)

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The dev server proxies `/api` and `/health` to
`http://127.0.0.1:8000`, so no CORS configuration is needed locally.

### 3. Try it

Upload a document, pick a format, and generate. Or click
**Try demo (no AI call)** to exercise the whole UI without a model.

---

## Configuration

All backend settings are environment variables (see [.env.example](.env.example)).
Pydantic reads a `.env` file in the working directory; in production set them in
the hosting dashboard.

| Variable | Default | Purpose |
| --- | --- | --- |
| `ENVIRONMENT` | `development` | Free-form environment label |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated CORS origins — **must be your deployed frontend** |
| `AI_PROVIDER` | `ollama` | `ollama` or `openai_compatible` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Local Ollama endpoint |
| `OLLAMA_MODEL` | `qwen2.5:1.5b` | Small, fast local model; use `qwen2.5:7b` / `llama3.1:8b` for quality |
| `OPENAI_BASE_URL` | `https://api.groq.com/openai/v1` | Any OpenAI-compatible `/chat/completions` base |
| `OPENAI_API_KEY` | *(empty)* | Key for the hosted provider (never expose to the browser) |
| `AI_MODEL` | `llama-3.1-8b-instant` | Hosted model name |
| `MAX_UPLOAD_BYTES` | `5242880` | 5 MB upload cap |
| `MAX_EXTRACTED_CHARS` | `20000` | Per-generation text cap (oversized input is **rejected**) |
| `MAX_GENERATIONS_PER_SESSION` | `3` | Successful generations per session |
| `GENERATION_COOLDOWN_SECONDS` | `15` | Minimum gap between attempts per session |
| `MAX_OUTPUT_TOKENS` | `1000` | Token cap passed to the provider |
| `RATE_LIMIT_REQUESTS` / `RATE_LIMIT_WINDOW_SECONDS` | `30` / `60` | Per-IP sliding window on `/api/*` |
| `PROVIDER_TIMEOUT_SECONDS` | `120` | Hard provider timeout |
| `TTS_ENABLED` / `TTS_MAX_CHARS` | `true` / `4000` | Optional MP3 download |
| `DEMO_ENABLED` | `true` | Pre-written demo responses |
| `QUOTA_DB_PATH` | *(empty)* | Optional SQLite quota persistence on a persistent disk |

Frontend: `VITE_API_BASE_URL` in `frontend/.env.local` (or the host dashboard)
must be the absolute backend URL, e.g. `https://docuease-api.onrender.com`.
Leave it empty for the dev proxy.

### Provider recipes

```dotenv
# Local Ollama (no per-request model fees; needs a machine with RAM/VRAM)
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:1.5b

# Groq free tier (OpenAI-compatible; no credit card at the time of writing)
AI_PROVIDER=openai_compatible
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEY=<your key>
AI_MODEL=llama-3.1-8b-instant

# OpenRouter free models (also OpenAI-compatible; free models are rate-limited)
AI_PROVIDER=openai_compatible
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=<your key>
AI_MODEL=<a model id from openrouter.ai/models?max_price=0>
```

Upstream `429`s are surfaced as a clear, retryable error and never bypassed.

---

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness + provider config (`?deep=true` probes the provider) |
| `GET` | `/api/config` | Formats, limits, provider, privacy text, sample |
| `POST` | `/api/documents/extract` | Multipart `file` → text, word/char counts, headings, warnings |
| `POST` | `/api/generate` | `{text, format, session_id}` → explanation + usage |
| `POST` | `/api/demo/generate` | Same shape without an AI call; does not consume a generation |
| `POST` | `/api/tts` | Returns real `audio/mpeg` bytes, or a typed error |

Errors always look like:

```json
{ "error": { "code": "text_too_long", "message": "…", "char_count": 24000, "limit": 20000 } }
```

Stable codes include `unsupported_type`, `file_too_large`, `invalid_file`,
`corrupted_file`, `empty_document`, `ocr_required`, `text_too_long`,
`usage_limit_exceeded`, `cooldown_active`,
`generation_in_progress`, `rate_limited`, `provider_unavailable`,
`provider_timeout`, `provider_rate_limited`, `provider_response_invalid`,
`tts_unavailable`, `tts_text_too_long`.

---

## Testing

```bash
# Backend — 86 tests, no network or model required
python -m pytest -q

# Frontend — 43 tests (Vitest + Testing Library)
cd frontend
npm test

# Production build
npm run build
```

The suite covers: extraction of every supported format, corrupted/scanned/empty
files, MIME and magic-byte validation, filename traversal, all limit errors,
cooldown and concurrency, rate limiting, provider timeouts/429/malformed
responses, CORS, security headers, demo mode, TTS error
paths, and the full upload → generate → copy flow in the UI.

CI (`.github/workflows/ci.yml`) runs both suites and the production build on
every push and pull request.

---

## Deployment (free tier, no credit card at the time of writing)

Recommended: **Render** (backend, free web service) + **Vercel** (frontend,
Hobby) + **Groq** (hosted inference free tier). All three were verified as
free-tier options without a required payment method during implementation;
provider terms can change, so confirm on their pricing pages before relying on
them.

> **Deployment requires your accounts.** Creating a Render service, a Vercel
> project and a Groq key needs your GitHub/provider login. The repository is
> fully prepared for this — follow the steps below, or hand the agent access and
> it will complete and verify the deployment.

### 1. Push the repository

```bash
cd docuease-ai
git init -b main
git add .
git commit -m "Initial commit: DocuEase document simplifier"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 2. Create a Groq API key

1. Sign in at <https://console.groq.com> (GitHub/Google login; no card needed for
   the free tier).
2. **API Keys → Create API Key**, copy the value.

### 3. Deploy the backend on Render

**Blueprint path (recommended):**

1. <https://dashboard.render.com> → **New → Blueprint**.
2. Connect your GitHub repository and apply `render.yaml`.
3. When prompted for the two `sync: false` variables:
   - `OPENAI_API_KEY` → the Groq key.
   - `ALLOWED_ORIGINS` → your Vercel URL (you can enter a placeholder now and
     update it in step 5). Use the exact origin, e.g. `https://docuease.vercel.app`.
4. Deploy. Render builds `backend/` and starts
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
5. Verify:

```bash
curl https://<your-service>.onrender.com/health
# {"status":"ok","provider":"openai_compatible","provider_configured":true,...}
curl "https://<your-service>.onrender.com/health?deep=true"
# provider_reachable:true once the inference endpoint answers
```

**Manual path** (equivalent): New → Web Service → repo → root directory
`backend`, runtime Python 3, build `pip install -r requirements.txt`, start
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check `/health`, plan
Free; add the environment variables from `.env.example` (or `render.yaml`).

Free-plan behaviour: the service sleeps after 15 minutes without traffic and the
next request can take ~1 minute; the filesystem is ephemeral (nothing is stored
anyway); the free allowance is 750 instance-hours/month.

### 4. Deploy the frontend on Vercel

1. <https://vercel.com/new> → import the repository.
2. **Root Directory:** `frontend` (framework auto-detects Vite).
3. Environment variable `VITE_API_BASE_URL = https://<your-service>.onrender.com`.
4. Deploy. `frontend/vercel.json` pins build settings and SPA rewrites.

### 5. Lock CORS to the real frontend origin

In Render → your service → **Environment** → set `ALLOWED_ORIGINS` to the exact
Vercel origin (no trailing slash, e.g. `https://docuease.vercel.app`) and
redeploy. Without this, the browser will block API calls.

### 6. Verify the live application

```bash
BASE=https://<your-service>.onrender.com
FRONTEND=https://<your-app>.vercel.app

curl "$BASE/health"

# CORS preflight from the deployed frontend origin
curl -i -X OPTIONS "$BASE/api/config" \
  -H "Origin: $FRONTEND" \
  -H "Access-Control-Request-Method: GET" | grep -i access-control

# Extraction
curl -s -X POST "$BASE/api/documents/extract" \
  -F "file=@sample.txt;type=text/plain"

# Generation (replace session id; text must be ≤ 20,000 chars)
curl -s -X POST "$BASE/api/generate" -H "Content-Type: application/json" \
  -d '{"text":"Revenue grew 12% in Q3.","format":"short_summary","session_id":"verify-0001"}'
```

Then in the browser: upload a PDF/DOCX/TXT, generate, play the audio, download TXT/Markdown, and confirm the 4th generation returns the usage
limit message. (The first request after idle may take ~1 minute to wake Render.)

### Alternatives verified during research

- Frontend: Cloudflare Pages free tier (no card, generous static limits) or
  GitHub Pages as a Vercel replacement.
- Backend: any Docker host using `backend/Dockerfile`; Hugging Face Docker Spaces
  now require PRO, and Fly.io/Railway/Koyeb require card verification, so Render
  is the no-card option.
- AI: local Ollama (no per-request fees, but needs a running machine), Groq free
  tier, or OpenRouter free models. Hosted free tiers can throttle or change;
  the app surfaces 429s and does not attempt to work around quotas.

---

## Security & privacy

- **Validation:** extension allowlist, declared-MIME consistency, magic-byte
  checks (`%PDF`, ZIP/DOCX container), UTF-16/UTF-8 text decoding with binary
  rejection, encrypted-PDF rejection.
- **Limits:** upload size is capped while streaming; extracted text over the cap
  is rejected with counts, never truncated; token caps are passed to the model;
  provider timeouts are enforced; per-IP rate limiting and per-session quotas
  run on the server.
- **Files:** processed entirely in memory; nothing is written to disk by the
  application. Multipart temp files (spooled by the framework) are closed in a
  `finally` block on success and failure.
- **Filenames:** sanitized (path components and control characters stripped) and
  used for display only; uploads are never executed or served.
- **Logging:** document contents and keys are never logged.
- **Transport:** CORS is locked to configured origins; security headers
  (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) are set.
- **Privacy notice:** `/api/config` returns provider-aware text. With a hosted
  provider, the extracted text leaves the server and the provider's retention
  rules apply — **this is not end-to-end privacy**. MP3 downloads additionally
  send the spoken text to Google's free translate speech endpoint; in-browser
  playback sends nothing anywhere.

### Honest limitations

- **Scanned PDFs:** OCR is not bundled. The API detects image-only PDFs and tells
  the user to run OCR first.
- **20,000-character cap:** longer documents are rejected, not silently cut. Split
  them into parts.
- **Session quotas are not abuse-proof:** the session id lives in browser storage,
  so a determined user can start a new session. Quotas and rate limits live in
  process memory, so they reset on restart/redeploy and are per instance — a
  multi-instance deployment would need a shared store (e.g. Redis). This is
  deliberate cost control for a free tier, not a billing system.
- **Model quality:** tiny local models (e.g. `qwen2.5:1.5b`) can be inaccurate or
  miss detail. Use a stronger model (or Groq's Llama 3.1 8B) when summary
  quality matters. Output is English only by design, since that is what the
  free-tier models handle reliably.
- **Free-host cold starts:** Render free services sleep; the first request can
  take ~1 minute.
- **MP3 downloads** rely on gTTS (Google's public speech endpoint, no key). It can
  fail or rate-limit; the endpoint then returns a typed error and no file is
  offered. Browser speech voices vary by OS/browser.
- **AI output can be wrong.** Always verify important facts against the original
  document.

---

## License

[MIT](LICENSE)
