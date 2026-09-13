"use client";

/**
 * AudioPreview — Displays file info, playback controls, and action buttons.
 *
 * Shown after recording or uploading audio, before analysis.
 */

import { useState, useRef, useEffect, useMemo } from "react";

interface AudioPreviewProps {
  /** The audio blob or file to preview. */
  audio: Blob | File;
  /** Original filename (for display). */
  filename: string;
  /** Called when the user clicks "Analyse Audio". */
  onAnalyse: () => void;
  /** Called when the user clicks "Discard". */
  onDiscard: () => void;
  /** Whether analysis is in progress (disables the button). */
  isAnalysing?: boolean;
}

/** Format bytes into a human-readable size. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Format seconds as MM:SS. */
function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function AudioPreview({
  audio,
  filename,
  onAnalyse,
  onDiscard,
  isAnalysing = false,
}: AudioPreviewProps) {
  const [duration, setDuration] = useState<number | null>(null);
  const audioUrl = useMemo(() => URL.createObjectURL(audio), [audio]);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load duration from audio element
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const handleMetadata = () => {
      if (Number.isFinite(el.duration)) {
        setDuration(el.duration);
      }
    };

    el.addEventListener("loadedmetadata", handleMetadata);
    return () => el.removeEventListener("loadedmetadata", handleMetadata);
  }, [audioUrl]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  return (
    <div className="animate-fade-in flex flex-col gap-5 w-full max-w-md">
      {/* File info card */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* File details row */}
        <div className="flex items-center gap-3">
          {/* Audio icon */}
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
            style={{ background: "var(--accent-soft)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
              {filename}
            </p>
            <p className="text-xs flex gap-2" style={{ color: "var(--foreground-muted)" }}>
              <span>{formatSize(audio.size)}</span>
              <span>•</span>
              <span>{duration !== null ? formatDuration(duration) : "Loading…"}</span>
            </p>
          </div>
        </div>

        {/* Audio player */}
        <audio ref={audioRef} src={audioUrl} controls preload="metadata" id="audio-preview-player" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          className="btn-primary"
          onClick={onAnalyse}
          disabled={isAnalysing}
          id="analyse-audio-btn"
        >
          {isAnalysing ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Analysing…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Analyse Audio
            </>
          )}
        </button>

        <button
          className="btn-secondary"
          onClick={onDiscard}
          disabled={isAnalysing}
          id="discard-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Discard &amp; Record Again
        </button>
      </div>
    </div>
  );
}
