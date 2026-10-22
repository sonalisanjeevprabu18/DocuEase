import { AlertIcon } from "./icons.jsx";

export default function ErrorBanner({ error, onDismiss }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
    >
      <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
      <div className="flex-1">
        <p className="font-semibold">{error.message}</p>
        {error.retryAfter > 0 && (
          <p className="mt-1 text-rose-700">
            Try again in about {error.retryAfter} second
            {error.retryAfter === 1 ? "" : "s"}.
          </p>
        )}
        {["usage_limit_exceeded", "rate_limited"].includes(error.code) && (
          <p className="mt-1 text-rose-700">
            Demo mode stays available and does not use an AI generation.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="rounded-lg p-1 text-rose-500 transition hover:bg-rose-100 hover:text-rose-700"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
