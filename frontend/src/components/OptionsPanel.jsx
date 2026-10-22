import { Spinner } from "./icons.jsx";

export default function OptionsPanel({
  formats,
  languages,
  format,
  language,
  onFormatChange,
  onLanguageChange,
  onGenerate,
  onDemo,
  busy,
  usage,
  cooldown,
  demoEnabled,
  hasDocument,
}) {
  const generating = busy === "generating";
  const noCredits = (usage?.remaining ?? 0) <= 0;
  const disabled = Boolean(busy);
  const canGenerate = hasDocument && !disabled && cooldown <= 0 && !noCredits;

  return (
    <section id="options" aria-labelledby="options-heading" className="card p-5 sm:p-6">
      <h2 id="options-heading" className="text-base font-semibold text-slate-900">
        2. Choose how to explain it
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">
        The model works only from your document and is instructed not to invent facts.
      </p>

      <fieldset className="mt-4" disabled={disabled}>
        <legend className="text-sm font-medium text-slate-700">Explanation format</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {formats.map((option) => {
            const selected = format === option.id;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 transition focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-1 ${
                  selected
                    ? "border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={option.id}
                  checked={selected}
                  onChange={() => onFormatChange(option.id)}
                  className="sr-only"
                />
                <span className="text-sm font-semibold text-slate-800">{option.label}</span>
                <span className="text-xs leading-5 text-slate-500">{option.description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4">
        <label htmlFor="language-select" className="text-sm font-medium text-slate-700">
          Output language
        </label>
        <select
          id="language-select"
          value={language}
          onChange={(event) => onLanguageChange(event.target.value)}
          disabled={disabled}
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none disabled:opacity-60"
        >
          {languages.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Only languages the configured model handles reliably are listed. Unsupported
          codes are rejected by the server.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="btn-primary flex-1"
        >
          {generating ? (
            <>
              <Spinner className="h-4 w-4" /> Generating…
            </>
          ) : (
            "Generate explanation"
          )}
        </button>
        {demoEnabled && (
          <button type="button" onClick={onDemo} disabled={disabled} className="btn-secondary">
            Try demo (no AI call)
          </button>
        )}
      </div>

      <p aria-live="polite" className="mt-2 text-xs text-slate-500">
        {noCredits
          ? "No AI generations left this session — demo mode still works, or start a new session."
          : hasDocument
            ? `Uses 1 of ${usage.limit} free generations · ${usage.remaining} left${cooldown > 0 ? ` · available in ${cooldown}s` : ""}`
            : "Upload a document (or try the demo) to generate an explanation."}
      </p>
    </section>
  );
}
