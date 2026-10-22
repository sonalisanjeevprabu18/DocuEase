import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AudioPlayer from "./AudioPlayer.jsx";
import { CheckIcon, CopyIcon, DownloadIcon } from "./icons.jsx";
import { baseName, copyToClipboard, downloadText, toPlainText } from "../utils.js";

export default function ResultsPanel({
  result,
  formats,
  languages,
  docName,
  usage,
  sessionId,
  ttsEnabled,
  maxTtsChars = 4000,
  onReset,
  onAnotherFormat,
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    if (!copied && !copyFailed) return undefined;
    const timer = setTimeout(() => {
      setCopied(false);
      setCopyFailed(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [copied, copyFailed]);

  const formatLabel =
    formats.find((entry) => entry.id === result.format)?.label || result.format;
  const languageLabel =
    languages.find((entry) => entry.code === result.language)?.label || result.language;
  const isDemo = result.provider === "demo";
  const stem = `${baseName(docName)}-${result.format}`;

  async function handleCopy() {
    const ok = await copyToClipboard(result.output);
    setCopied(ok);
    setCopyFailed(!ok);
  }

  return (
    <section
      id="results"
      aria-labelledby="results-heading"
      className="card scroll-mt-24 overflow-hidden"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 via-white to-white px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 id="results-heading" className="text-lg font-bold tracking-tight text-slate-900">
            Your explanation
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="chip bg-white">{formatLabel}</span>
            <span className="chip bg-white">{languageLabel}</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                isDemo
                  ? "bg-amber-50 text-amber-800"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {isDemo ? "Demo sample · no AI call" : `AI · ${result.model}`}
            </span>
            <span>{result.output.length.toLocaleString()} characters</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleCopy} className="btn-secondary px-3 py-2 text-xs">
            {copied ? (
              <CheckIcon className="h-4 w-4 text-emerald-600" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
            {copied ? "Copied" : copyFailed ? "Copy failed" : "Copy"}
          </button>
          <button
            type="button"
            onClick={() => downloadText(result.output, `${stem}.md`, "md")}
            className="btn-secondary px-3 py-2 text-xs"
          >
            <DownloadIcon className="h-4 w-4" /> Markdown
          </button>
          <button
            type="button"
            onClick={() => downloadText(toPlainText(result.output), `${stem}.txt`, "txt")}
            className="btn-secondary px-3 py-2 text-xs"
          >
            <DownloadIcon className="h-4 w-4" /> TXT
          </button>
        </div>
      </header>

      <div className="px-5 py-5 sm:px-6">
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.output}</ReactMarkdown>
        </div>
        <div className="mt-5">
          <AudioPlayer
            text={result.output}
            language={result.language}
            ttsEnabled={ttsEnabled}
            sessionId={sessionId}
            maxTtsChars={maxTtsChars}
          />
        </div>
      </div>

      <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs text-slate-500">
          This session: {usage.used} of {usage.limit} AI generations used.
          {isDemo ? " Demo output doesn’t count toward the limit." : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onAnotherFormat} className="btn-secondary text-xs">
            Change format & try again
          </button>
          <button type="button" onClick={onReset} className="btn-primary text-xs">
            Process another document
          </button>
        </div>
      </footer>
    </section>
  );
}
