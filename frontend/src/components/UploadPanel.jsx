import { useRef, useState } from "react";
import { FileUp, Loader2, Sparkles } from "lucide-react";
import { validateFileClientSide } from "../utils.js";

export default function UploadPanel({
  onFile,
  onError,
  busy,
  maxMb = 5,
  onSample,
}) {
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

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer?.files?.[0]);
  }

  return (
    <div id="upload" className="scroll-mt-24">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-[22px] border border-dashed p-4 transition sm:p-5 ${
          dragging
            ? "border-violet bg-violet-soft/70 shadow-[0_0_0_5px_rgba(91,61,245,0.10)]"
            : "border-line bg-paper/80 hover:border-violet/50"
        } ${busy ? "opacity-80" : ""}`}
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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition ${
              dragging ? "bg-violet text-white" : "bg-midnight text-ivory"
            }`}
            aria-hidden="true"
          >
            {extracting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FileUp className="h-5 w-5" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg font-semibold leading-snug text-midnight">
              <label htmlFor="document-input" className={busy ? "cursor-not-allowed" : "cursor-pointer"}>
                {extracting ? "Reading your document…" : "Drop your document here"}
              </label>
            </p>
            <p className="mt-0.5 text-sm text-muted">
              or{" "}
              <label
                htmlFor="document-input"
                className={`font-semibold text-violet underline decoration-violet/30 underline-offset-2 ${
                  busy ? "cursor-not-allowed" : "cursor-pointer hover:decoration-violet"
                }`}
              >
                browse files
              </label>{" "}
              — PDF, DOCX or TXT, up to {maxMb} MB
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5" aria-hidden="true">
              <span className="chip">PDF</span>
              <span className="chip">DOCX</span>
              <span className="chip">TXT</span>
              <span className="chip">{maxMb} MB max</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={Boolean(busy)}
            className="btn-outline shrink-0"
          >
            Choose file
          </button>
        </div>
      </div>

      <p id="upload-hint" className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted">
        <span>No account · processed in memory · nothing stored</span>
        {onSample && (
          <button
            type="button"
            onClick={onSample}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-1.5 font-semibold text-violet hover:underline disabled:opacity-50"
          >
            <Sparkles size={13} aria-hidden="true" /> No document? Try a sample
          </button>
        )}
      </p>
    </div>
  );
}
