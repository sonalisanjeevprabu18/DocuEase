// Small pure helpers shared by the UI and tests.

export const SESSION_KEY = "docuease.sessionId";

export function newSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateSessionId(storage = globalThis.localStorage) {
  try {
    const existing = storage?.getItem(SESSION_KEY);
    if (existing && existing.length >= 8) return existing;
    const fresh = newSessionId();
    storage?.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return newSessionId();
  }
}

export function resetSessionId(storage = globalThis.localStorage) {
  const fresh = newSessionId();
  try {
    storage?.setItem(SESSION_KEY, fresh);
  } catch {
    /* storage unavailable: in-memory id still works */
  }
  return fresh;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function countWords(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

export function baseName(filename) {
  return (filename || "document")
    .replace(/\.[^./\\]+$/, "")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .slice(0, 60) || "document";
}

/** Turn Markdown into readable plain text for speech / .txt downloads. */
export function toPlainText(markdown) {
  return (markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, "$1$2")
    .replace(/(^|\W)_([^_\n]+)_(?=\W|$)/g, "$1$2")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/^\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*$/gm, "")
    .replace(/^\s*[-–—]{3,}\s*$/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function downloadBlob(content, filename, mime = "text/plain;charset=utf-8") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(content, filename, format) {
  const mime = format === "md"
    ? "text/markdown;charset=utf-8"
    : "text/plain;charset=utf-8";
  downloadBlob(content, filename, mime);
}

export function validateFileClientSide(file, maxBytes = 5 * 1024 * 1024) {
  if (!file) return "Choose a document to upload.";
  const ext = (file.name || "").split(".").pop()?.toLowerCase();
  if (!["pdf", "docx", "txt"].includes(ext || "")) {
    return "That file type isn't supported. Upload a PDF, DOCX or TXT file.";
  }
  if (file.size > maxBytes) {
    return `That file is ${formatBytes(file.size)}, over the ${Math.round(maxBytes / (1024 * 1024))} MB limit.`;
  }
  if (file.size === 0) return "That file is empty.";
  return null;
}

export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}
