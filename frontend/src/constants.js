// Client-side fallbacks. The backend /api/config response is authoritative and
// replaces these once loaded; they keep the UI usable before it arrives.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ["pdf", "docx", "txt"];

export const FORMATS = [
  { id: "short_summary", label: "Short summary", description: "A concise overview of the whole document." },
  { id: "detailed_summary", label: "Detailed summary", description: "A thorough summary that keeps the key details." },
  { id: "beginner", label: "Beginner-friendly explanation", description: "Simple language for someone new to the topic." },
  { id: "bullet_points", label: "Bullet-point summary", description: "The main ideas as a clean bullet list." },
  { id: "concepts", label: "Important concepts & definitions", description: "Key terms and concepts with clear definitions." },
  { id: "study_notes", label: "Study notes", description: "Structured notes organised for revision." },
  { id: "qa", label: "Question-and-answer format", description: "Important questions with model answers." },
  { id: "section_wise", label: "Section-wise explanation", description: "An explanation broken down section by section." },
];

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "es", label: "Spanish (Español)" },
  { code: "fr", label: "French (Français)" },
  { code: "de", label: "German (Deutsch)" },
  { code: "pt", label: "Portuguese (Português)" },
  { code: "bn", label: "Bengali (বাংলা)" },
  { code: "ja", label: "Japanese (日本語)" },
  { code: "zh", label: "Chinese (中文)" },
  { code: "ar", label: "Arabic (العربية)" },
  { code: "ru", label: "Russian (Русский)" },
];

export const FALLBACK_CONFIG = {
  app_name: "DocuEase",
  formats: FORMATS,
  languages: LANGUAGES,
  limits: {
    max_upload_mb: 5,
    max_extracted_chars: 20000,
    max_generations_per_session: 3,
    generation_cooldown_seconds: 15,
    max_output_tokens: 1000,
    rate_limit_per_minute: 30,
    tts_max_chars: 4000,
  },
  provider: { kind: "unknown", name: "unknown", model: "" },
  privacy: {
    external_provider: null,
    text: "Your upload is processed on the DocuEase server only while you use it.",
  },
  demo_enabled: true,
  tts_enabled: true,
  sample: null,
};

// Friendly, actionable copy per backend error code.
export const ERROR_MESSAGES = {
  unsupported_type: "That file type isn't supported. Upload a PDF, DOCX or TXT file.",
  file_too_large: "That file is over the 5 MB limit. Compress it or split it into smaller files.",
  invalid_file: "That file couldn't be read as a valid document. It may be renamed or damaged.",
  corrupted_file: "That document appears to be corrupted. Try re-exporting it and upload again.",
  empty_document: "No readable text was found in that document.",
  ocr_required: "This PDF looks scanned (image-only), so there is no text to explain. Run OCR on it first, then upload again.",
  text_too_long: "The document is longer than the per-generation character limit. Nothing was truncated — split it into smaller parts.",
  language_unsupported: "The configured AI model doesn't support that language. Choose another from the list.",
  format_unsupported: "That explanation format isn't available.",
  usage_limit_exceeded: "You've used all your free generations for this session.",
  cooldown_active: "Please wait a few seconds between generations.",
  generation_in_progress: "A generation is already running. Wait for it to finish.",
  rate_limited: "Too many requests from this network. Please wait a minute and try again.",
  provider_timeout: "The AI provider took too long to answer. Try again in a moment.",
  provider_unavailable: "The AI service is unavailable right now. Check the server's provider settings and try again.",
  provider_rate_limited: "The AI provider's free-tier rate limit was hit. Wait a minute and retry.",
  provider_response_invalid: "The AI provider returned an unusable response. Please try again.",
  tts_unavailable: "Audio download isn't available right now. The in-browser player still works.",
  tts_text_too_long: "This explanation is too long to render as one MP3. Use the in-browser player.",
  tts_language_unsupported: "MP3 download isn't available for this language. Use the in-browser player.",
  tts_disabled: "MP3 download is turned off on this deployment.",
  demo_disabled: "Demo mode is turned off on this deployment.",
  network_error: "Can't reach the DocuEase server. Check your connection (and that the backend is running / VITE_API_BASE_URL is set).",
  internal_error: "Something went wrong on the server. Please try again.",
};

export function friendlyError(err) {
  const code = err?.code || "internal_error";
  const fallback = ERROR_MESSAGES[code] || err?.message || "Something went wrong. Please try again.";
  // Prefer the server's specific message when it adds context (e.g. counts),
  // but fall back to the friendly copy for terse/internal codes.
  const verbose = ["text_too_long", "usage_limit_exceeded", "cooldown_active",
    "ocr_required", "file_too_large", "language_unsupported"];
  const message = verbose.includes(code) && err?.message ? err.message : fallback;
  return {
    code,
    message,
    retryAfter: err?.extra?.retry_after_seconds || 0,
  };
}
