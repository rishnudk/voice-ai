"use client";

/**
 * AudioRecorder — Browser audio recording with live timer and auto-stop.
 *
 * Uses the MediaRecorder API with cross-browser mimeType detection.
 * Auto-stops at MAX_DURATION_SECONDS and transitions to the onComplete callback.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { MAX_DURATION_SECONDS } from "@/constants/limits";

interface AudioRecorderProps {
  /** Called with the recorded Blob when recording finishes (manual stop or auto-stop). */
  onComplete: (blob: Blob, filename: string) => void;
}

/** Detect the best supported mimeType for recording across browsers. */
function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";

  const candidates = [
    "audio/webm;codecs=opus",   // Chrome, Firefox, Edge
    "audio/webm",                // Fallback webm
    "audio/mp4",                 // Safari
    "audio/ogg;codecs=opus",     // Firefox alternate
  ];

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }

  return ""; // Let the browser decide
}

/** Format seconds as MM:SS. */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function AudioRecorder({ onComplete }: AudioRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "denied">("idle");
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Stop recording ───────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setState("idle");
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ── Start recording ──────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const actualMime = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualMime });

        // Derive extension from mime
        let ext = ".webm";
        if (actualMime.includes("mp4")) ext = ".m4a";
        else if (actualMime.includes("ogg")) ext = ".ogg";

        const filename = `recording-${Date.now()}${ext}`;

        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        onComplete(blob, filename);
      };

      recorder.start(1000); // Collect data every second
      mediaRecorderRef.current = recorder;

      setElapsed(0);
      setState("recording");

      // Start timer with automatic stop at duration limit
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= MAX_DURATION_SECONDS) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err: unknown) {
      // Check for permission denial
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      ) {
        setState("denied");
      } else {
        console.error("Recording error:", err);
        setState("denied");
      }
    }
  }, [onComplete, stopRecording]);

  // ── Permission denied state ──────────────────────────────────────
  if (state === "denied") {
    return (
      <div className="animate-fade-in flex flex-col items-center gap-4 p-6 rounded-2xl"
           style={{ background: "var(--danger-soft)", border: "1px solid var(--danger)" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <p className="text-center text-sm" style={{ color: "var(--danger)" }}>
          Microphone access was denied. Allow microphone access in your browser settings and try again.
        </p>
        <button
          className="btn-secondary"
          onClick={() => setState("idle")}
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Recording state ──────────────────────────────────────────────
  if (state === "recording") {
    const progress = (elapsed / MAX_DURATION_SECONDS) * 100;

    return (
      <div className="animate-fade-in flex flex-col items-center gap-6 p-8">
        {/* Pulsing indicator + timer */}
        <div className="flex items-center gap-3">
          <div className="recording-dot" />
          <span className="font-mono text-2xl font-bold tracking-wider" style={{ color: "var(--danger)" }}>
            {formatTime(elapsed)}
          </span>
        </div>

        {/* Progress bar showing time remaining */}
        <div className="w-full max-w-xs h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-raised)" }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${progress}%`,
              background: progress > 90 ? "var(--danger)" : "var(--accent)",
            }}
          />
        </div>

        <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
          {elapsed >= MAX_DURATION_SECONDS - 10
            ? `Auto-stopping in ${MAX_DURATION_SECONDS - elapsed}s…`
            : `Max ${Math.floor(MAX_DURATION_SECONDS / 60)} minutes`}
        </p>

        {/* Stop button */}
        <button className="btn-danger" onClick={stopRecording} id="stop-recording-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="3" width="10" height="10" rx="2" />
          </svg>
          Stop Recording
        </button>
      </div>
    );
  }

  // ── Idle state ───────────────────────────────────────────────────
  return (
    <div className="animate-fade-in flex flex-col items-center gap-4">
      <button className="btn-primary" onClick={startRecording} id="start-recording-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        Record Audio
      </button>
    </div>
  );
}
