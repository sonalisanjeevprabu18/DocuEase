import {
  ArrowLeft,
  Loader2,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import DocumentPanel from "./DocumentPanel.jsx";
import ErrorNotice from "./ErrorNotice.jsx";
import FormatTiles from "./FormatTiles.jsx";
import Logo from "./Logo.jsx";
import ProcessingTimeline from "./ProcessingTimeline.jsx";
import ReadingView from "./ReadingView.jsx";
import UsagePill from "./UsagePill.jsx";

function ReadingSkeleton() {
  return (
    <div
      className="paper-card px-5 py-6 sm:px-7"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="flex items-center gap-2 text-xs font-semibold text-violet">
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        Writing your explanation from the document…
      </p>
      <div className="mt-5 space-y-3" aria-hidden="true">
        <div className="skeleton h-7 w-2/3" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-11/12" />
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton mt-6 h-5 w-1/3" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-10/12" />
        <div className="skeleton h-4 w-3/4" />
      </div>
    </div>
  );
}

function ResultPlaceholder({ noCredits }) {
  return (
    <div className="paper-card px-6 py-12 text-center sm:py-14">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-violet-soft text-violet">
        <Sparkles size={20} aria-hidden="true" />
      </span>
      <h3 className="mt-4 font-serif text-xl text-midnight">
        {noCredits ? "Your free explanations are used up." : "Pick a lens, then simplify."}
      </h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-muted">
        {noCredits
          ? "Start a new session from the header to reset the counter, or explore the pre-written demo from the home page."
          : "Choose a reading format above. The explanation appears here with audio, copy and download controls."}
      </p>
    </div>
  );
}

export default function Workspace({
  config,
  doc,
  format,
  onFormatChange,
  busy,
  error,
  onDismissError,
  result,
  usage,
  cooldown,
  sessionId,
  onGenerate,
  onRegenerate,
  onNewDocument,
  onResetSession,
  stage,
  serverWarning,
}) {
  const generating = busy === "generating";
  const noCredits = usage.remaining <= 0;
  const canGenerate =
    Boolean(doc?.text) && !busy && cooldown <= 0 && !noCredits;
  const formatLabel =
    config.formats.find((entry) => entry.id === (result?.format || format))
      ?.label || "Explanation";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ivory/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onNewDocument}
            className="btn-ghost shrink-0 px-2.5 py-1.5 text-xs"
            aria-label="Start a new document"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span className="hidden sm:inline">New</span>
          </button>
          <Logo compact className="hidden sm:inline-flex" />
          <div className="min-w-0 flex-1 sm:border-l sm:border-line sm:pl-3">
            <p
              className="truncate text-[13px] font-semibold text-midnight"
              title={doc.filename}
            >
              {doc.filename}
            </p>
            <p className="truncate text-[10.5px] text-muted">
              {doc.word_count.toLocaleString()} words · English explanation
            </p>
          </div>
          <UsagePill usage={usage} cooldown={cooldown} />
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 pb-14 pt-5 sm:px-6">
        {serverWarning && (
          <div
            role="status"
            className="mb-4 rounded-2xl border border-amber-soft bg-amber-soft/60 px-4 py-3 text-sm text-amber-ink"
          >
            The API is unreachable right now. Check that the backend is running or that
            <code className="mx-1 rounded bg-paper px-1.5 py-0.5 text-xs">
              VITE_API_BASE_URL
            </code>
            points at the deployed service.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <ProcessingTimeline stage={stage} />
          <button
            type="button"
            onClick={onResetSession}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted transition hover:text-violet"
          >
            <RotateCcw size={11} aria-hidden="true" /> New session
          </button>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorNotice
              error={error}
              onDismiss={onDismissError}
              onResetSession={onResetSession}
            />
          </div>
        )}

        <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <DocumentPanel doc={doc} />

          <div className="min-w-0 space-y-4">
            <FormatTiles
              formats={config.formats}
              value={format}
              onChange={onFormatChange}
              disabled={Boolean(busy)}
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onGenerate}
                disabled={!canGenerate}
                className="btn-primary"
              >
                {generating ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Wand2 size={16} aria-hidden="true" />
                )}
                {generating
                  ? "Simplifying…"
                  : result
                    ? "Simplify again"
                    : "Simplify this document"}
              </button>
              <p aria-live="polite" className="text-xs text-muted">
                {noCredits
                  ? "No free explanations left this session."
                  : `Uses 1 of ${usage.limit} free explanations · ${usage.remaining} left${
                      cooldown > 0 ? ` · available in ${cooldown}s` : ""
                    }`}
              </p>
            </div>

            {result ? (
              <ReadingView
                result={result}
                formatLabel={formatLabel}
                docName={doc.filename}
                usage={usage}
                sessionId={sessionId}
                ttsEnabled={config.tts_enabled}
                maxTtsChars={config.limits.tts_max_chars}
                onRegenerate={onRegenerate}
                onNewDocument={onNewDocument}
                canRegenerate={canGenerate}
              />
            ) : generating ? (
              <ReadingSkeleton />
            ) : (
              <ResultPlaceholder noCredits={noCredits} />
            )}
          </div>
        </div>

        <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          <span>Files are deleted after processing</span>
          <span aria-hidden="true">·</span>
          <span>English explanations</span>
          <span aria-hidden="true">·</span>
          <span>Demo sample uses no AI generation</span>
          <span aria-hidden="true">·</span>
          <span>AI output can be imperfect — verify important details</span>
        </p>
      </main>
    </div>
  );
}
