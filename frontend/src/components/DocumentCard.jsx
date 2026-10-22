import { CheckIcon, DocIcon } from "./icons.jsx";
import { formatBytes } from "../utils.js";

export default function DocumentCard({ doc, onRemove, disabled }) {
  const stats = [
    `${doc.word_count.toLocaleString()} words`,
    `${doc.char_count.toLocaleString()} characters`,
  ];
  if (doc.page_count) stats.push(`${doc.page_count} page${doc.page_count === 1 ? "" : "s"}`);
  if (doc.table_count > 0) stats.push(`${doc.table_count} table${doc.table_count === 1 ? "" : "s"}`);
  if (doc.size_bytes > 0) stats.push(formatBytes(doc.size_bytes));

  return (
    <section aria-label="Document ready" className="card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
          <DocIcon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900" title={doc.filename}>
            {doc.filename}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
              <CheckIcon className="h-3.5 w-3.5" />
              Processed
            </span>
            {stats.map((stat) => (
              <span key={stat} className="whitespace-nowrap">
                {stat}
              </span>
            ))}
          </div>
          {doc.headings?.length > 0 && (
            <p className="mt-2 line-clamp-1 text-xs text-slate-400" title={doc.headings.join(" · ")}>
              Sections: {doc.headings.slice(0, 5).join(" · ")}
            </p>
          )}
          {doc.warnings?.length > 0 && (
            <ul className="mt-2 list-disc pl-4 text-xs text-amber-700">
              {doc.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          {doc.isDemo && (
            <p className="mt-2 text-xs text-slate-500">
              Sample document loaded for demo mode — no file was uploaded.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </section>
  );
}
