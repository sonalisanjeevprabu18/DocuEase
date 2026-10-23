import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  RefreshCw,
} from "lucide-react";
import AudioStudio from "./AudioStudio.jsx";
import {
  baseName,
  copyToClipboard,
  downloadText,
  splitMarkdownSections,
  toPlainText,
} from "../utils.js";

function DocMarkdown({ children }) {
  return (
    <div className="prose-doc overflow-x-auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export default function ReadingView({
  result,
  formatLabel,
  docName,
  usage,
  sessionId,
  ttsEnabled,
  maxTtsChars = 4000,
  onRegenerate,
  onNewDocument,
  canRegenerate,
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const sections = useMemo(
    () => splitMarkdownSections(result.output),
    [result.output],
  );
  const titledSections = sections.filter((section) => section.title);
  const multiSection = titledSections.length >= 2;
  const isDemo = result.provider === "demo";
  const stem = `${baseName(docName)}-${result.format}`;

  useEffect(() => {
    if (!copied && !copyFailed) return undefined;
    const timer = setTimeout(() => {
      setCopied(false);
      setCopyFailed(false);
    }, 2400);
    return () => clearTimeout(timer);
  }, [copied, copyFailed]);

  async function handleCopy() {
    const ok = await copyToClipboard(result.output);
    setCopied(ok);
    setCopyFailed(!ok);
  }

  return (
    <section
      id="reading"
      aria-labelledby="reading-title"
      className="paper-card animate-rise scroll-mt-24 overflow-hidden"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 px-5 py-4 sm:px-7 sm:py-5">
        <div className="min-w-0">
          <p className="label-caps">Simplified explanation</p>
          <h2
            id="reading-title"
            className="mt-1 font-serif text-2xl leading-tight text-midnight sm:text-[1.75rem]"
          >
            {formatLabel}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${
                isDemo ? "bg-amber-soft text-amber-ink" : "bg-mint-soft text-mint-ink"
              }`}
            >
              {isDemo ? "Demo sample · no AI call" : `AI · ${result.model}`}
            </span>
            <span>English</span>
            <span aria-hidden="true">·</span>
            <span>{result.output.length.toLocaleString()} characters</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="btn-outline px-3 py-2 text-xs"
          >
            {copied ? (
              <Check size={13} className="text-mint-ink" aria-hidden="true" />
            ) : (
              <Copy size={13} aria-hidden="true" />
            )}
            {copied ? "Copied" : copyFailed ? "Copy failed" : "Copy"}
          </button>
          <button
            type="button"
            onClick={() => downloadText(result.output, `${stem}.md`, "md")}
            className="btn-outline px-3 py-2 text-xs"
          >
            <Download size={13} aria-hidden="true" /> Markdown
          </button>
          <button
            type="button"
            onClick={() =>
              downloadText(toPlainText(result.output), `${stem}.txt`, "txt")
            }
            className="btn-outline px-3 py-2 text-xs"
          >
            <FileText size={13} aria-hidden="true" /> TXT
          </button>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-7">
        {multiSection && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet hover:underline"
              aria-expanded={!collapsed}
            >
              <ChevronDown
                size={13}
                className={collapsed ? "rotate-180" : ""}
                aria-hidden="true"
              />
              {collapsed ? "Expand all sections" : "Collapse sections"}
            </button>
          </div>
        )}

        {multiSection ? (
          sections.map((section, index) =>
            section.title ? (
              <details
                key={`${collapsed}-${index}`}
                className="section-disclosure"
                open={!collapsed}
              >
                <summary>
                  <h2>{section.title}</h2>
                  <ChevronDown size={18} className="chevron shrink-0 text-muted" aria-hidden="true" />
                </summary>
                <div className="section-body">
                  <DocMarkdown>{section.body}</DocMarkdown>
                </div>
              </details>
            ) : section.body ? (
              <DocMarkdown key={`intro-${index}`}>{section.body}</DocMarkdown>
            ) : null,
          )
        ) : (
          <DocMarkdown>{result.output}</DocMarkdown>
        )}
      </div>

      <div className="border-t border-line/70 bg-ivory/50 px-5 py-5 sm:px-7">
        <AudioStudio
          text={result.output}
          ttsEnabled={ttsEnabled}
          sessionId={sessionId}
          maxTtsChars={maxTtsChars}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-line/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="text-xs text-muted">
          This session: {usage.used} of {usage.limit} AI explanations used.
          {isDemo ? " Demo output doesn’t count." : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={!canRegenerate}
            className="btn-outline text-xs"
          >
            <RefreshCw size={13} aria-hidden="true" /> Regenerate
          </button>
          <button type="button" onClick={onNewDocument} className="btn-primary text-xs">
            New document
          </button>
        </div>
      </div>
    </section>
  );
}
