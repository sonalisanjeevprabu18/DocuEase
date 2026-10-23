import { useEffect, useMemo, useState } from "react";
import {
  AudioLines,
  Download,
  Loader2,
  Pause,
  Play,
  Square,
} from "lucide-react";
import { useSpeechSynthesis } from "../audio.js";
import { synthesizeAudio } from "../api.js";
import { friendlyError } from "../constants.js";
import { downloadBlob, toPlainText } from "../utils.js";

const BARS = Array.from({ length: 26 }, (_, index) => 22 + ((index * 37) % 58));

const STATUS_LABEL = {
  idle: "Ready to listen",
  speaking: "Reading aloud",
  paused: "Paused",
  error: "Playback unavailable",
};

export default function AudioStudio({
  text,
  ttsEnabled,
  sessionId,
  maxTtsChars = 4000,
}) {
  const plainText = useMemo(() => toPlainText(text), [text]);
  const { supported, status, error, progress, boundarySeen, speak, pause, resume, stop } =
    useSpeechSynthesis();
  const [rate, setRate] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    stop();
    setDownloadError(null);
    setDownloaded(false);
  }, [text, stop]);

  const playing = status === "speaking";
  const paused = status === "paused";
  const tooLongForMp3 = plainText.length > maxTtsChars;

  async function handleDownload() {
    setDownloadError(null);
    setDownloading(true);
    try {
      const blob = await synthesizeAudio({
        text: plainText,
        sessionId,
      });
      downloadBlob(blob, "docuease-explanation.mp3", "audio/mpeg");
      setDownloaded(true);
    } catch (err) {
      setDownloadError(friendlyError(err).message);
    } finally {
      setDownloading(false);
    }
  }

  if (!supported && !ttsEnabled) {
    return (
      <p className="text-xs text-muted">
        Audio isn’t available: this browser has no speech synthesis and MP3 download is
        disabled on this deployment.
      </p>
    );
  }

  return (
    <section
      aria-label="Listen to this explanation"
      className="rounded-2xl border border-line bg-gradient-to-br from-mint-soft/80 via-paper to-violet-soft/60 p-4"
    >
      <div className="flex items-center gap-3.5">
        {supported ? (
          <button
            type="button"
            onClick={
              playing ? pause : paused ? resume : () => speak(plainText, { rate })
            }
            aria-label={
              playing
                ? "Pause narration"
                : paused
                  ? "Resume narration"
                  : "Play explanation aloud"
            }
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-violet text-white transition hover:bg-violet-deep ${
              playing ? "animate-pulse-ring" : ""
            }`}
          >
            {playing ? (
              <Pause size={18} aria-hidden="true" />
            ) : (
              <Play size={18} className="ml-0.5" aria-hidden="true" />
            )}
          </button>
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sand text-muted">
            <AudioLines size={18} aria-hidden="true" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Listening studio
            </p>
            <p aria-live="polite" className="text-[11px] font-medium text-ink">
              {STATUS_LABEL[status] || "Ready to listen"}
            </p>
          </div>

          <div className="mt-2 flex h-5 items-end gap-[3px]" aria-hidden="true">
            {BARS.map((height, index) => (
              <span
                key={index}
                className={`w-[3px] rounded-full ${
                  playing ? "wave-bar bg-violet/70" : "bg-line"
                }`}
                style={{
                  height: `${height}%`,
                  animationDelay: `${(index % 8) * 90}ms`,
                }}
              />
            ))}
          </div>

          {supported && boundarySeen && (
            <div
              className="mt-2 h-1 overflow-hidden rounded-full bg-line/70"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-violet transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(playing || paused) && (
          <button
            type="button"
            onClick={stop}
            className="btn-outline px-3 py-1.5 text-xs"
            aria-label="Stop narration"
          >
            <Square size={12} aria-hidden="true" /> Stop
          </button>
        )}

        {supported && (
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
            Speed
            <select
              value={rate}
              onChange={(event) => setRate(Number(event.target.value))}
              aria-label="Speech speed"
              className="rounded-lg border border-line bg-paper px-2 py-1.5 text-[11px] text-ink"
            >
              {[0.75, 1, 1.25, 1.5].map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </select>
          </label>
        )}

        {ttsEnabled && !tooLongForMp3 && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="btn-outline ml-auto px-3 py-1.5 text-xs"
          >
            {downloading ? (
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            ) : (
              <Download size={13} aria-hidden="true" />
            )}
            {downloading ? "Preparing MP3…" : downloaded ? "Download again" : "Download MP3"}
          </button>
        )}
      </div>

      {!supported && (
        <p className="mt-2 text-[11px] leading-5 text-muted">
          This browser doesn’t support in-page speech synthesis. The MP3 download still
          works where the server can generate it.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-clay">
          {error}
        </p>
      )}
      {downloadError && (
        <p role="alert" className="mt-2 text-[11px] text-clay">
          {downloadError}
        </p>
      )}
      {ttsEnabled && tooLongForMp3 && (
        <p className="mt-2 text-[11px] text-muted">
          This explanation is too long for a single MP3 — use the browser player or
          download the text.
        </p>
      )}
    </section>
  );
}
