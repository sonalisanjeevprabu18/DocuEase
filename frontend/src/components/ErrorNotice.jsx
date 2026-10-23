import { AlertTriangle, RotateCcw, X } from "lucide-react";

export default function ErrorNotice({ error, onDismiss, onResetSession }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="animate-rise flex items-start gap-3 rounded-2xl border border-clay/25 bg-clay-soft px-4 py-3.5 text-sm"
    >
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-clay" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-midnight">{error.message}</p>
        {error.retryAfter > 0 && (
          <p className="mt-1 text-xs text-clay">
            Try again in about {error.retryAfter} second
            {error.retryAfter === 1 ? "" : "s"}.
          </p>
        )}
        {error.code === "usage_limit_exceeded" && onResetSession && (
          <button
            type="button"
            onClick={onResetSession}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-clay underline underline-offset-2 hover:text-midnight"
          >
            <RotateCcw size={12} aria-hidden="true" /> Start a new session
          </button>
        )}
        {["usage_limit_exceeded", "rate_limited"].includes(error.code) && (
          <p className="mt-1 text-xs text-clay">
            The pre-written demo sample stays available and uses no AI generation.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="rounded-full p-1 text-clay/80 transition hover:bg-clay/10 hover:text-clay"
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
