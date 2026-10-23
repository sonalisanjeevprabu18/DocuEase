import { useCallback, useEffect, useState } from "react";
import {
  extractDocument,
  generateDemo,
  generateExplanation,
  getConfig,
} from "./api.js";
import { FALLBACK_CONFIG, friendlyError } from "./constants.js";
import { countWords, getOrCreateSessionId, resetSessionId } from "./utils.js";
import LandingPage from "./components/LandingPage.jsx";
import Workspace from "./components/Workspace.jsx";

function scrollToId(id) {
  const element = document.getElementById(id);
  if (element && typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function scrollToTop() {
  if (typeof window.scrollTo === "function") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

export default function App() {
  const [config, setConfig] = useState(FALLBACK_CONFIG);
  const [sessionId, setSessionId] = useState(() => getOrCreateSessionId());
  const [doc, setDoc] = useState(null);
  const [format, setFormat] = useState("short_summary");
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
      scrollToTop();
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
        sessionId,
      });
      setResult(response);
      applyUsage(response.usage);
      setTimeout(() => scrollToId("reading"), 80);
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
  }, [doc, format, sessionId, applyUsage]);

  const handleDemo = useCallback(async () => {
    setError(null);
    setBusy("generating");
    try {
      const response = await generateDemo({ format, sessionId });
      if (!doc) {
        const sampleText = config.sample?.text || "";
        setDoc({
          filename: config.sample?.filename || "Sample document",
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
      scrollToTop();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(null);
    }
  }, [config.sample, doc, format, sessionId, applyUsage]);

  const handleNewDocument = () => {
    setDoc(null);
    setResult(null);
    setError(null);
    setBusy(null);
    scrollToTop();
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

  const stage =
    busy === "extracting"
      ? "extracting"
      : busy === "generating"
        ? "generating"
        : result
          ? "done"
          : "ready";

  if (!doc) {
    return (
      <LandingPage
        config={config}
        onFile={handleFile}
        onError={setError}
        busy={busy}
        onDemo={config.demo_enabled ? handleDemo : null}
        serverWarning={serverWarning}
        error={error}
        onDismissError={() => setError(null)}
      />
    );
  }

  return (
    <Workspace
      config={config}
      doc={doc}
      format={format}
      onFormatChange={setFormat}
      busy={busy}
      error={error}
      onDismissError={() => setError(null)}
      result={result}
      usage={usage}
      cooldown={cooldown}
      sessionId={sessionId}
      onGenerate={handleGenerate}
      onRegenerate={handleGenerate}
      onNewDocument={handleNewDocument}
      onResetSession={handleResetSession}
      stage={stage}
      serverWarning={serverWarning}
    />
  );
}
