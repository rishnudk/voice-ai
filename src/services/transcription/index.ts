/**
 * Unified audio transcription module.
 *
 * Supports Gemini (primary, handles files up to 25 MB seamlessly) and
 * Cloudflare Workers AI Whisper as a secondary fallback.
 */

import { transcribeWithGemini, TranscriptionResult } from "./gemini";
import { transcribeAudio as transcribeWithWhisper } from "./cloudflare-whisper";

export type { TranscriptionResult };
export { transcribeWithGemini, transcribeWithWhisper };

/**
 * Check whether a transcript represents silence / no meaningful speech.
 */
export function isSilentTranscript(text: string): boolean {
  const cleaned = text.trim();
  if (cleaned.length === 0) return true;

  const silencePatterns = [
    /^\[.*blank.*\]$/i,
    /^\(.*silence.*\)$/i,
    /^\[.*no speech.*\]$/i,
    /^\.+$/,                     // just dots
    /^\s*you\s*$/i,              // common hallucination on silence
    /^\s*thanks?\s*$/i,          // another common hallucination
    /^no speech detected\.?$/i,
    /^there is no audible speech\.?$/i,
    /^\[no audible speech\]$/i,
  ];

  return silencePatterns.some((p) => p.test(cleaned));
}

/**
 * Transcribe an audio buffer.
 *
 * Defaults to Google Gemini when `GEMINI_API_KEY` is set (capable of handling
 * up to 25 MB / multi-minute recordings without 413 limits).
 * Falls back to Cloudflare Whisper or mock when appropriate.
 */
export async function transcribeAudio(
  audioBuffer: Buffer | Uint8Array,
  contentType: string
): Promise<TranscriptionResult> {
  // Mock mode
  if (process.env.MOCK_AI === "true") {
    return transcribeWithGemini(audioBuffer, contentType);
  }

  // Primary: Gemini (handles files up to 25 MB)
  if (process.env.GEMINI_API_KEY) {
    try {
      return await transcribeWithGemini(audioBuffer, contentType);
    } catch (error) {
      console.warn(
        "[/api/analyze] Gemini transcription failed:",
        error
      );
      // Fall through to Cloudflare if file size is within limits
    }
  }

  // Fallback: Cloudflare Whisper (ONLY for files <= 4 MB due to Cloudflare limits)
  const isSmallFile = audioBuffer.length <= 4 * 1024 * 1024;
  if (
    isSmallFile &&
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_API_TOKEN
  ) {
    return transcribeWithWhisper(audioBuffer, contentType);
  }

  // If Gemini was already tried and failed, throw the failure rather than retrying indefinitely
  if (process.env.GEMINI_API_KEY) {
    throw new Error("Speech transcription failed. Please try a clearer audio recording.");
  }

  // If no Gemini key, default to Gemini mock handler
  return transcribeWithGemini(audioBuffer, contentType);
}
