// Browser text-to-speech via the free SpeechSynthesis API. No network calls,
// no API keys. Progress comes from real boundary events (never fabricated) and
// unsupported browsers degrade to the optional MP3 download.
import { useCallback, useEffect, useRef, useState } from "react";

export function speechSupported() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

export function pickEnglishVoice(voices) {
  if (!Array.isArray(voices) || voices.length === 0) return null;
  return (
    voices.find((voice) => voice.lang?.toLowerCase() === "en-us") ||
    voices.find((voice) => voice.lang?.toLowerCase().startsWith("en")) ||
    voices[0] ||
    null
  );
}

export function useSpeechSynthesis() {
  const [supported] = useState(speechSupported);
  const [status, setStatus] = useState("idle"); // idle | speaking | paused | error
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [boundarySeen, setBoundarySeen] = useState(false);
  const utteranceRef = useRef(null);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus("idle");
    setProgress(0);
    setBoundarySeen(false);
  }, [supported]);

  const speak = useCallback(
    (text, { rate = 1 } = {}) => {
      if (!supported || !text?.trim()) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = rate;
      try {
        const voice = pickEnglishVoice(synth.getVoices());
        if (voice) utterance.voice = voice;
      } catch {
        /* Voice list may be unavailable; the default voice still works. */
      }
      utterance.onboundary = (event) => {
        if (typeof event?.charIndex !== "number") return;
        setBoundarySeen(true);
        const consumed = event.charIndex + (event.charLength || 0);
        setProgress(Math.max(1, Math.min(100, Math.round((consumed / text.length) * 100))));
      };
      utterance.onend = () => {
        if (utteranceRef.current !== utterance) return;
        utteranceRef.current = null;
        setStatus("idle");
        setProgress(0);
      };
      utterance.onerror = (event) => {
        if (utteranceRef.current !== utterance) return;
        utteranceRef.current = null;
        if (event?.error === "interrupted" || event?.error === "canceled") {
          setStatus("idle");
        } else {
          setError("Your browser could not play the audio. Try a different voice or browser.");
          setStatus("error");
        }
      };
      utteranceRef.current = utterance;
      setError(null);
      setProgress(0);
      setBoundarySeen(false);
      synth.speak(utterance);
      setStatus("speaking");
    },
    [supported],
  );

  const pause = useCallback(() => {
    if (!supported || !utteranceRef.current) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported || !utteranceRef.current) return;
    window.speechSynthesis.resume();
    setStatus("speaking");
  }, [supported]);

  useEffect(
    () => () => {
      if (speechSupported()) window.speechSynthesis.cancel();
    },
    [],
  );

  return { supported, status, error, progress, boundarySeen, speak, pause, resume, stop };
}
