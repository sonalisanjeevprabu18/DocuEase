import { useMemo } from "react";
import { FileText, Lock } from "lucide-react";
import { splitDocumentSections } from "../utils.js";

export default function DocumentPanel({ doc }) {
  const sections = useMemo(() => splitDocumentSections(doc.text), [doc.text]);
  const navItems = sections.filter((section) => section.title);

  const stats = [
    `${doc.word_count.toLocaleString()} words`,
    `${doc.char_count.toLocaleString()} characters`,
    doc.page_count ? `${doc.page_count} page${doc.page_count === 1 ? "" : "s"}` : null,
    doc.table_count
      ? `${doc.table_count} table${doc.table_count === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);

  return (
    <aside
      className="paper-card flex min-w-0 flex-col overflow-hidden lg:sticky lg:top-24"
      aria-label="Original document"
    >
      <div className="border-b border-line/70 px-5 py-4">
        <p className="label-caps">Original document</p>
        <h2 className="mt-1.5 flex items-start gap-2 font-serif text-xl leading-snug text-midnight">
          <FileText size={17} className="mt-1 shrink-0 text-violet" aria-hidden="true" />
          <span className="min-w-0 break-words">{doc.filename}</span>
        </h2>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
          {stats.map((stat) => (
            <span key={stat}>{stat}</span>
          ))}
        </div>
        {doc.isDemo && (
          <p className="mt-2 text-[11px] italic text-muted">
            Sample document — no file was uploaded.
          </p>
        )}
      </div>

      {navItems.length > 0 && (
        <nav aria-label="Document sections" className="border-b border-line/70 px-5 py-3">
          <p className="label-caps">Sections</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {navItems.slice(0, 8).map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => {
                    document
                      .getElementById(section.id)
                      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                  }}
                  className="chip max-w-full truncate transition hover:border-violet/40 hover:text-violet"
                  title={section.title}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {doc.warnings?.length > 0 && (
        <div className="border-b border-line/70 bg-amber-soft/40 px-5 py-2.5 text-[11px] leading-5 text-amber-ink">
          {doc.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}

      <div className="max-h-[360px] overflow-y-auto px-5 py-4 lg:max-h-[440px]">
        {sections.length > 0 ? (
          sections.map((section) => (
            <section key={section.id} id={section.id} className="mb-4 last:mb-0">
              {section.title && (
                <h3 className="mb-1.5 font-serif text-[15px] font-semibold text-midnight">
                  {section.title}
                </h3>
              )}
              {section.body && (
                <pre className="whitespace-pre-wrap break-words font-sans text-[12.5px] leading-6 text-ink/75">
                  {section.body}
                </pre>
              )}
            </section>
          ))
        ) : (
          <pre className="whitespace-pre-wrap break-words font-sans text-[12.5px] leading-6 text-ink/75">
            {doc.text}
          </pre>
        )}
      </div>

      <div className="mt-auto flex items-center gap-1.5 border-t border-line/70 px-5 py-3 text-[11px] text-muted">
        <Lock size={12} aria-hidden="true" /> Processed in memory · deleted after generation
      </div>
    </aside>
  );
}
