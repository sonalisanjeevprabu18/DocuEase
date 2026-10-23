// Thin API client. The backend URL comes from VITE_API_BASE_URL in production
// and falls back to same-origin (Vite dev proxy) locally.

const RAW_BASE = import.meta.env.VITE_API_BASE_URL || "";
export const API_BASE = RAW_BASE.replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, { code = "internal_error", status = 0, extra = {} } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

async function readBody(res) {
  const type = res.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  try {
    const text = await res.text();
    return text ? { error: { message: text.slice(0, 300) } } : null;
  } catch {
    return null;
  }
}

function networkError() {
  return new ApiError(
    "Could not reach the DocuEase server. Check your connection and try again.",
    { code: "network_error" },
  );
}

export async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw networkError();
  }
  const body = await readBody(res);
  if (!res.ok) {
    const err = body?.error || {};
    throw new ApiError(err.message || `Request failed (${res.status}).`, {
      code: err.code || `http_${res.status}`,
      status: res.status,
      extra: err,
    });
  }
  return body;
}

export function getConfig() {
  return request("/api/config");
}

export function checkHealth() {
  return request("/health");
}

export function extractDocument(file) {
  const form = new FormData();
  form.append("file", file);
  return request("/api/documents/extract", { method: "POST", body: form });
}

export function generateExplanation({ text, format, sessionId }) {
  return request("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      format,
      session_id: sessionId,
    }),
  });
}

export function generateDemo({ format, sessionId }) {
  return request("/api/demo/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format, session_id: sessionId }),
  });
}

export async function synthesizeAudio({ text, sessionId }) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, session_id: sessionId }),
    });
  } catch {
    throw networkError();
  }
  if (!res.ok) {
    const body = await readBody(res);
    const err = body?.error || {};
    throw new ApiError(err.message || "Audio could not be generated.", {
      code: err.code || `http_${res.status}`,
      status: res.status,
      extra: err,
    });
  }
  return res.blob();
}
