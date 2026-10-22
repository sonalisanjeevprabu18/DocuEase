// Browser text-to-speech via the free SpeechSynthesis API. No network calls,
// no API keys. Feature-detected so unsupported browsers degrade gracefully.
import { useCallback, useEffect, useRef, useState } from "react";

export const SPEECH_LANG = {
  en: "en-US",
  hi: "hi-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-BR",
  bn: "bn-IN",
  ja: "ja-JP",
  zh: "zh-CN",
  ar: "ar-SA",
  ru: "ru-RU",
};

export function speechSupported() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

export function pickVoice(voices, language) {
  if (!Array.isArray(voices) || voices.length === 0) return null;
  const bcp47 = (SPEECH_LANG[language] || language || "").toLowerCase();
  const prefix = bcp47.split("-")[0];
  return (
    voices.find((v) => v.lang?.toLowerCase() === bcp47) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(prefix)) ||
    null
  );
}

export function useSpeechSynthesis() {
  const [supported] = useState(speechSupported);
  const [status, setStatus] = useState("idle"); // idle | speaking | paused | error
  const [error, setError] = useState(null);
  const utteranceRef = useRef(null);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus("idle");
  }, [supported]);

  const speak = useCallback(
    (text, language, rate = 1) => {
      if (!supported || !text?.trim()) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = SPEECH_LANG[language] || "en-US";
      utterance.rate = rate;
      try {
        const voice = pickVoice(synth.getVoices(), language);
        if (voice) utterance.voice = voice;
      } catch {
        /* voice list may be unavailable; the default voice still works */
      }
      utterance.onend = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null;
          setStatus("idle");
        }
      };
      utterance.onerror = (event) => {
        if (utteranceRef.current !== utterance) return;
        utteranceRef.current = null;
        // "interrupted"/"canceled" are expected when the user presses Stop.
        if (event?.error === "interrupted" || event?.error === "canceled") {
          setStatus("idle");
        } else {
          setError("Your browser could not play the audio. Try a different voice or browser.");
          setStatus("error");
        }
      };
      utteranceRef.current = utterance;
      setError(null);
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

  // Voices can load asynchronously in Chrome; nothing to do until speak time,
  // but cancel speech when the component unmounts or the text changes.
  useEffect(() => () => {
    if (speechSupported()) window.speechSynthesis.cancel();
  }, []);

  return { supported, status, error, speak, pause, resume, stop };
}

export function speechLanguagesAvailable(voices, language) {
  return pickVoice(voices || [], language) !== null;
}
