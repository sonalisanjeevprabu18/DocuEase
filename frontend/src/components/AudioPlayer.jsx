import { useEffect, useMemo, useState } from "react";
import { useSpeechSynthesis } from "../audio.js";
import { synthesizeAudio } from "../api.js";
import { friendlyError } from "../constants.js";
import { downloadBlob, toPlainText } from "../utils.js";
import {
  DownloadIcon,
  PauseIcon,
  PlayIcon,
  Spinner,
  StopIcon,
} from "./icons.jsx";

export default function AudioPlayer({
  text,
  language,
  ttsEnabled,
  sessionId,
  maxTtsChars = 4000,
}) {
  const plainText = useMemo(() => toPlainText(text), [text]);
  const { supported, status, error, speak, pause, resume, stop } = useSpeechSynthesis();
  const [rate, setRate] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  // A new explanation invalidates whatever is currently being spoken.
  useEffect(() => {
    stop();
    setDownloadError(null);
  }, [text, stop]);

  const playing = status === "speaking";
  const paused = status === "paused";
  const tooLongForMp3 = plainText.length > maxTtsChars;

  async function handleDownload() {
    setDownloadError(null);
    setDownloading(true);
    try {
      const blob = await synthesizeAudio({ text: plainText, language, sessionId });
      downloadBlob(blob, "docuease-explanation.mp3", "audio/mpeg");
    } catch (err) {
      setDownloadError(friendlyError(err).message);
    } finally {
      setDownloading(false);
    }
  }

  if (!supported && !ttsEnabled) {
    return (
      <p className="text-xs text-slate-500">
        Audio isn’t available: this browser has no speech synthesis and MP3 download is
        disabled on this deployment.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {supported && (
          <>
            <button
              type="button"
              onClick={
                playing ? pause : paused ? resume : () => speak(plainText, language, rate)
              }
              className="btn-primary px-3 py-2"
            >
              {playing ? (
                <PauseIcon className="h-4 w-4" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
              {playing ? "Pause" : paused ? "Resume" : "Play aloud"}
            </button>
            {(playing || paused) && (
              <button type="button" onClick={stop} className="btn-secondary px-3 py-2">
                <StopIcon className="h-4 w-4" /> Stop
              </button>
            )}
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              Speed
              <select
                value={rate}
                onChange={(event) => setRate(Number(event.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                aria-label="Speech speed"
              >
                {[0.75, 1, 1.25, 1.5].map((value) => (
                  <option key={value} value={value}>
                    {value}×
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {ttsEnabled && !tooLongForMp3 && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="btn-secondary ml-auto px-3 py-2"
          >
            {downloading ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <DownloadIcon className="h-4 w-4" />
            )}
            {downloading ? "Preparing MP3…" : "Download MP3"}
          </button>
        )}
      </div>

      {!supported && (
        <p className="mt-2 text-xs text-slate-500">
          This browser doesn’t support in-page speech synthesis. MP3 download still works
          where the server provides it.
        </p>
      )}
      {playing && (
        <p aria-live="polite" className="mt-2 text-xs text-slate-500">
          Reading the explanation aloud…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-rose-600">
          {error}
        </p>
      )}
      {downloadError && (
        <p role="alert" className="mt-2 text-xs text-rose-600">
          {downloadError}
        </p>
      )}
      {ttsEnabled && tooLongForMp3 && (
        <p className="mt-2 text-xs text-slate-500">
          This explanation is too long for one MP3 file — use the in-browser player or
          download the text.
        </p>
      )}
    </div>
  );
}
