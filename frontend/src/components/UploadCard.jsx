import { useRef, useState } from "react";
import { UploadIcon, Spinner } from "./icons.jsx";
import { validateFileClientSide } from "../utils.js";

export default function UploadCard({ onFile, onError, busy, maxMb = 5 }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const extracting = busy === "extracting";

  function handleFile(file) {
    if (busy) return;
    const problem = validateFileClientSide(file, maxMb * 1024 * 1024);
    if (problem) {
      onError?.({ code: "client_validation", message: problem, retryAfter: 0 });
      return;
    }
    onFile(file);
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer?.files?.[0]);
  }

  return (
    <section id="upload" aria-labelledby="upload-heading" className="card overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <h2 id="upload-heading" className="text-base font-semibold text-slate-900">
          1. Upload your document
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          PDF, DOCX or TXT · up to {maxMb} MB · processed in memory, never stored
        </p>
      </div>

      <div className="p-5 sm:p-6">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-8 ${
            dragging
              ? "border-indigo-500 bg-indigo-50"
              : "border-slate-300 bg-slate-50/60 hover:border-indigo-300 hover:bg-indigo-50/40"
          } ${busy ? "opacity-70" : ""}`}
        >
          <input
            ref={inputRef}
            id="document-input"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={(event) => {
              handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
            disabled={Boolean(busy)}
            aria-describedby="upload-hint"
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            {extracting ? <Spinner className="h-6 w-6" /> : <UploadIcon className="h-6 w-6" />}
          </div>
          <p className="mt-4 text-base font-semibold text-slate-900">
            <label
              htmlFor="document-input"
              className={busy ? "cursor-not-allowed" : "cursor-pointer"}
            >
              {extracting ? "Reading your document…" : "Drag & drop a document here"}
            </label>
          </p>
          <p className="mt-1 text-sm text-slate-500">
            or{" "}
            <label
              htmlFor="document-input"
              className="font-semibold text-indigo-700 underline underline-offset-2"
            >
              browse your files
            </label>
          </p>
          <p id="upload-hint" className="mt-3 text-xs text-slate-400">
            Headings, lists and tables are preserved. Scanned PDFs need OCR first.
          </p>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-400">
          By uploading you confirm you have the right to process this document.
          See the privacy note for where the extracted text is sent.
        </p>
      </div>
    </section>
  );
}
