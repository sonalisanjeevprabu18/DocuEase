import { useCallback, useEffect, useState } from "react";
import {
  extractDocument,
  generateDemo,
  generateExplanation,
  getConfig,
} from "./api.js";
import { FALLBACK_CONFIG, friendlyError } from "./constants.js";
import { countWords, getOrCreateSessionId, resetSessionId } from "./utils.js";
import UploadCard from "./components/UploadCard.jsx";
import DocumentCard from "./components/DocumentCard.jsx";
import OptionsPanel from "./components/OptionsPanel.jsx";
import ResultsPanel from "./components/ResultsPanel.jsx";
import ErrorBanner from "./components/ErrorBanner.jsx";
import UsageMeter from "./components/UsageMeter.jsx";
import PrivacyPanel from "./components/PrivacyPanel.jsx";
import { DocIcon, SparklesIcon } from "./components/icons.jsx";

function scrollToId(id) {
  const element = document.getElementById(id);
  if (element && typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function App() {
  const [config, setConfig] = useState(FALLBACK_CONFIG);
  const [sessionId, setSessionId] = useState(() => getOrCreateSessionId());
  const [doc, setDoc] = useState(null);
  const [format, setFormat] = useState("short_summary");
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(null); // null | "extracting" | "generating"
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [usage, setUsage] = useState({
    used: 0,
    limit: FALLBACK_CONFIG.limits.max_generations_per_session,
    remaining: FALLBACK_CONFIG.limits.max_generations_per_session,
    cooldown_seconds: 0,
  });
  const [cooldown, setCooldown] = useState(0);
  const [serverWarning, setServerWarning] = useState(false);

  // Load the authoritative catalogue and limits from the backend.
  useEffect(() => {
    let active = true;
    getConfig()
      .then((incoming) => {
        if (!active) return;
        const merged = {
          ...FALLBACK_CONFIG,
          ...incoming,
          limits: { ...FALLBACK_CONFIG.limits, ...(incoming.limits || {}) },
          privacy: { ...FALLBACK_CONFIG.privacy, ...(incoming.privacy || {}) },
        };
        setConfig(merged);
        setServerWarning(false);
        setUsage((previous) => {
          const limit = merged.limits.max_generations_per_session;
          return {
            ...previous,
            limit,
            remaining: Math.max(0, limit - previous.used),
          };
        });
      })
      .catch(() => {
        if (active) setServerWarning(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Cooldown countdown mirroring the server-side cooldown.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const applyUsage = useCallback((nextUsage) => {
    if (!nextUsage) return;
    setUsage({
      used: nextUsage.used,
      limit: nextUsage.limit,
      remaining: nextUsage.remaining,
      cooldown_seconds: nextUsage.cooldown_seconds || 0,
    });
    setCooldown(Math.ceil(nextUsage.cooldown_seconds || 0));
  }, []);

  const handleFile = useCallback(async (file) => {
    setError(null);
    setResult(null);
    setBusy("extracting");
    try {
      const extracted = await extractDocument(file);
      setDoc(extracted);
      setTimeout(() => scrollToId("options"), 60);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(null);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!doc?.text) return;
    setError(null);
    setBusy("generating");
    try {
      const response = await generateExplanation({
        text: doc.text,
        format,
        language,
        sessionId,
      });
      setResult(response);
      applyUsage(response.usage);
      setTimeout(() => scrollToId("results"), 60);
    } catch (err) {
      const friendly = friendlyError(err);
      setError(friendly);
      if (friendly.retryAfter > 0) setCooldown(Math.ceil(friendly.retryAfter));
      if (friendly.code === "usage_limit_exceeded") {
        setUsage((previous) => ({ ...previous, used: previous.limit, remaining: 0 }));
      }
    } finally {
      setBusy(null);
    }
  }, [doc, format, language, sessionId, applyUsage]);

  const handleDemo = useCallback(async () => {
    setError(null);
    setBusy("generating");
    try {
      const response = await generateDemo({ format, language, sessionId });
      if (!doc && config.sample?.text) {
        const sampleText = config.sample.text;
        setDoc({
          filename: config.sample.filename || "Demo sample",
          text: sampleText,
          word_count: countWords(sampleText),
          char_count: sampleText.length,
          page_count: null,
          table_count: 0,
          headings: [],
          warnings: [],
          size_bytes: 0,
          isDemo: true,
        });
      }
      setResult(response);
      applyUsage(response.usage);
      setTimeout(() => scrollToId("results"), 60);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(null);
    }
  }, [config.sample, doc, format, language, sessionId, applyUsage]);

  const handleRemoveDocument = () => {
    setDoc(null);
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setDoc(null);
    setResult(null);
    setError(null);
    setBusy(null);
    if (typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleAnotherFormat = () => {
    setResult(null);
    setTimeout(() => scrollToId("options"), 60);
  };

  const handleResetSession = () => {
    setSessionId(resetSessionId());
    setUsage({
      used: 0,
      limit: config.limits.max_generations_per_session,
      remaining: config.limits.max_generations_per_session,
      cooldown_seconds: 0,
    });
    setCooldown(0);
    setError(null);
  };

  return (
    <div className="min-h-screen">
      <a
        href="#upload"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to upload
      </a>

      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <DocIcon className="h-5 w-5" />
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              DocuEase
              <span className="ml-2 hidden text-sm font-normal text-slate-400 sm:inline">
                Document simplifier
              </span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <span className="chip hidden bg-emerald-50 text-emerald-700 sm:inline-flex">
              Free · no sign-up
            </span>
            <a
              href="#privacy"
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Privacy
            </a>
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <section className="pb-6 pt-8 sm:pt-12">
          <span className="chip bg-indigo-50 text-indigo-700">
            <SparklesIcon className="h-3.5 w-3.5" />
            {config.formats.length} explanation formats · {config.languages.length} languages · audio
          </span>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Understand any document,{" "}
            <span className="text-indigo-600">in minutes.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Upload a PDF, DOCX or TXT and get a clear, faithful explanation you can read,
            copy, download or listen to. No account, no stored files, and limits that keep
            the free tier sustainable.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
            <li className="chip bg-white">📄 PDF · DOCX · TXT</li>
            <li className="chip bg-white">🌍 11 output languages</li>
            <li className="chip bg-white">🔊 Read aloud + MP3</li>
            <li className="chip bg-white">🔒 Processed in memory only</li>
          </ul>
        </section>

        {serverWarning && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            Can’t reach the DocuEase API. Start the backend, or set{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">VITE_API_BASE_URL</code>{" "}
            to the deployed backend URL, then reload.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-5">
            <ErrorBanner error={error} onDismiss={() => setError(null)} />

            <UploadCard
              onFile={handleFile}
              onError={setError}
              busy={busy}
              maxMb={config.limits.max_upload_mb}
            />

            {doc && (
              <DocumentCard doc={doc} onRemove={handleRemoveDocument} disabled={Boolean(busy)} />
            )}

            <OptionsPanel
              formats={config.formats}
              languages={config.languages}
              format={format}
              language={language}
              onFormatChange={setFormat}
              onLanguageChange={setLanguage}
              onGenerate={handleGenerate}
              onDemo={handleDemo}
              busy={busy}
              usage={usage}
              cooldown={cooldown}
              demoEnabled={config.demo_enabled}
              hasDocument={Boolean(doc?.text)}
            />

            <p aria-live="polite" className="sr-only">
              {busy === "extracting"
                ? "Extracting text from your document."
                : busy === "generating"
                  ? "Generating your explanation."
                  : ""}
            </p>

            {result && (
              <ResultsPanel
                result={result}
                formats={config.formats}
                languages={config.languages}
                docName={doc?.filename || "document"}
                usage={usage}
                sessionId={sessionId}
                ttsEnabled={config.tts_enabled}
                maxTtsChars={config.limits.tts_max_chars}
                onReset={handleReset}
                onAnotherFormat={handleAnotherFormat}
              />
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-20">
            <UsageMeter usage={usage} cooldown={cooldown} onResetSession={handleResetSession} />

            <section aria-labelledby="how-heading" className="card p-5">
              <h2 id="how-heading" className="text-sm font-semibold text-slate-900">
                How it works
              </h2>
              <ol className="mt-3 space-y-3 text-xs leading-5 text-slate-600">
                {[
                  ["Upload", "Text is extracted locally on the server, preserving headings, lists and tables."],
                  ["Explain", "Pick a format and language; the model works only from your document."],
                  ["Use it", "Copy, download as TXT/Markdown, or listen in the browser."],
                ].map(([title, body], index) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                      {index + 1}
                    </span>
                    <span>
                      <span className="font-semibold text-slate-800">{title}. </span>
                      {body}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-4 text-slate-400">
                AI explanations can be imperfect. Verify important facts against the
                original document.
              </p>
            </section>

            <PrivacyPanel config={config} />
          </aside>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            DocuEase — an open-source document simplifier. AI output can be imperfect;
            always check important details.
          </p>
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Runs on free-tier infrastructure · no account needed
          </p>
        </div>
      </footer>
    </div>
  );
}
