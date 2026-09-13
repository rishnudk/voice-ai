"use client";

/**
 * AudioUploader — Drag-and-drop + file picker with client-side validation.
 *
 * Validates format, size, and duration before accepting the file.
 */

import { useState, useRef, useCallback } from "react";
import {
  BRIEF_REF_5190_MAX_BYTES,
  MAX_DURATION_SECONDS,
  MAX_SIZE_DISPLAY,
  MAX_DURATION_DISPLAY,
  SUPPORTED_EXTENSIONS,
  AUDIO_ACCEPT_STRING,
} from "@/constants/limits";
import { validateAudioFile, type ValidationResult } from "@/services/audio/validation";

interface AudioUploaderProps {
  /** Called with the accepted File when validation passes. */
  onFileAccepted: (file: File) => void;
}

/** Check audio duration using a temporary Audio element. */
function checkDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);

    audio.addEventListener("loadedmetadata", () => {
      const duration = audio.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) ? duration : null);
    });

    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve(null);
    });

    // Timeout after 5s if metadata never loads
    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(null);
    }, 5000);

    audio.src = url;
  });
}

export default function AudioUploader({ onFileAccepted }: AudioUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsChecking(true);

      // Basic validation (format + size)
      const result: ValidationResult = validateAudioFile({
        name: file.name,
        size: file.size,
        type: file.type,
      });

      if (!result.valid) {
        setError(result.error!);
        setIsChecking(false);
        return;
      }

      // Client-side duration check
      const duration = await checkDuration(file);
      if (duration !== null && duration > MAX_DURATION_SECONDS) {
        setError(`This audio is longer than the ${MAX_DURATION_DISPLAY} limit.`);
        setIsChecking(false);
        return;
      }

      setIsChecking(false);
      onFileAccepted(file);
    },
    [onFileAccepted]
  );

  // ── Drop handlers ────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  // ── File picker ──────────────────────────────────────────────────
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [processFile]
  );

  return (
    <div className="animate-fade-in flex flex-col items-center gap-4 w-full">
      {/* Drop zone */}
      <div
        className={`w-full max-w-md rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver ? "drop-zone-active" : ""
        }`}
        style={{
          borderColor: isDragOver ? "var(--accent)" : "var(--border)",
          background: isDragOver ? "var(--accent-soft)" : "var(--surface)",
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        id="upload-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={AUDIO_ACCEPT_STRING}
          onChange={handleFileChange}
          className="hidden"
          id="file-input"
        />

        {isChecking ? (
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
              Checking file…
            </p>
          </div>
        ) : (
          <>
            {/* Upload icon */}
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--foreground-muted)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-3"
              style={{ opacity: 0.6 }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Drop an audio file here or{" "}
              <span style={{ color: "var(--accent)" }}>browse</span>
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--foreground-muted)" }}>
              MP3, WAV, M4A, AAC, OGG, WEBM, FLAC • Max {MAX_SIZE_DISPLAY} • Max {MAX_DURATION_DISPLAY}
            </p>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          className="animate-fade-in w-full max-w-md rounded-xl px-4 py-3 text-sm"
          style={{ background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid var(--danger)" }}
          id="upload-error"
        >
          {error}
        </div>
      )}
    </div>
  );
}
