/**
 * Global application constants for audio validation and processing limits.
 *
 * These values serve as the single source of truth for file size, duration,
 * and format constraints across both client and server code.
 */

/** Maximum allowed audio file size in bytes (25 MB). */
export const BRIEF_REF_5190_MAX_BYTES = 25 * 1024 * 1024; // 26,214,400 bytes

/** Maximum allowed audio duration in seconds (10 minutes). */
export const MAX_DURATION_SECONDS = 600;

/** Human-readable size limit string for UI display. */
export const MAX_SIZE_DISPLAY = "25 MB";

/** Human-readable duration limit string for UI display. */
export const MAX_DURATION_DISPLAY = "10 minutes";

/**
 * Supported audio MIME types.
 * Used for server-side validation and client-side `accept` attributes.
 */
export const SUPPORTED_AUDIO_FORMATS: readonly string[] = [
  "audio/mpeg",       // MP3
  "audio/wav",        // WAV
  "audio/wave",       // WAV (alternate)
  "audio/x-wav",      // WAV (alternate)
  "audio/mp4",        // M4A / AAC in MP4 container
  "audio/x-m4a",      // M4A (alternate)
  "audio/aac",        // AAC raw
  "audio/ogg",        // OGG
  "audio/webm",       // WEBM
  "audio/flac",       // FLAC
  "audio/x-flac",     // FLAC (alternate)
] as const;

/**
 * Supported file extensions (lowercase, with leading dot).
 * Used for filename-based validation when MIME type is unavailable or unreliable.
 */
export const SUPPORTED_EXTENSIONS: readonly string[] = [
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".webm",
  ".flac",
] as const;

/**
 * Accept string for file input elements.
 * Combines MIME types and extensions for maximum browser compatibility.
 */
export const AUDIO_ACCEPT_STRING = [
  ...SUPPORTED_AUDIO_FORMATS,
  ...SUPPORTED_EXTENSIONS,
].join(",");
