/**
 * Audio file validation service.
 *
 * Works in both server and client contexts — no Node-specific APIs used.
 * All constraints are sourced from `@/constants/limits`.
 */

import {
  BRIEF_REF_5190_MAX_BYTES,
  MAX_DURATION_SECONDS,
  MAX_SIZE_DISPLAY,
  MAX_DURATION_DISPLAY,
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_EXTENSIONS,
} from "@/constants/limits";

/** Error codes returned when validation fails. */
export type ValidationErrorCode = "FORMAT" | "SIZE" | "DURATION";

/** Result of an audio file validation check. */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: ValidationErrorCode;
}

/** Minimal file descriptor accepted by the validator. */
export interface AudioFileDescriptor {
  /** Original filename (used for extension-based format check). */
  name: string;
  /** File size in bytes. */
  size: number;
  /** MIME type (optional — falls back to extension check when absent). */
  type?: string;
  /** Duration in seconds (optional — skipped when not provided). */
  duration?: number;
}

/**
 * Extract the lowercase file extension from a filename (including the dot).
 * Returns an empty string when no extension is found.
 */
function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) return "";
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Validate an audio file against format, size, and (optionally) duration constraints.
 *
 * Checks are run in a deliberate order — the first failing check short-circuits
 * so the user always sees the most actionable error first.
 */
export function validateAudioFile(file: AudioFileDescriptor): ValidationResult {
  // ── 1. Format check ────────────────────────────────────────────────
  const ext = getExtension(file.name);
  const extensionOk = SUPPORTED_EXTENSIONS.includes(ext);
  const mimeOk =
    file.type !== undefined &&
    file.type !== "" &&
    SUPPORTED_AUDIO_FORMATS.includes(file.type);

  if (!extensionOk && !mimeOk) {
    return {
      valid: false,
      error:
        "This file format isn't supported. Please upload MP3, WAV, M4A, AAC, OGG, WEBM or FLAC.",
      code: "FORMAT",
    };
  }

  // ── 2. Size check ──────────────────────────────────────────────────
  if (file.size > BRIEF_REF_5190_MAX_BYTES) {
    return {
      valid: false,
      error: `This file is larger than the ${MAX_SIZE_DISPLAY} limit.`,
      code: "SIZE",
    };
  }

  // ── 3. Duration check (only when duration is available) ────────────
  if (file.duration !== undefined && file.duration > MAX_DURATION_SECONDS) {
    return {
      valid: false,
      error: `This audio is longer than the ${MAX_DURATION_DISPLAY} limit.`,
      code: "DURATION",
    };
  }

  return { valid: true };
}
