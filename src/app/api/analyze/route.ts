/**
 * POST /api/analyze — Unified audio analysis endpoint.
 *
 * Accepts a multipart/form-data request with an `audio` field.
 * Pipeline: validate → extract duration → transcribe → silence check → analyse.
 *
 * Error responses use the exact user-friendly messages from the brief.
 */

import { NextRequest, NextResponse } from "next/server";
import { parseBuffer } from "music-metadata";
import {
  BRIEF_REF_5190_MAX_BYTES,
  MAX_DURATION_SECONDS,
  MAX_SIZE_DISPLAY,
  MAX_DURATION_DISPLAY,
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_EXTENSIONS,
} from "@/constants/limits";
import {
  transcribeAudio,
  isSilentTranscript,
} from "@/services/transcription/cloudflare-whisper";
import { analyseTranscript } from "@/services/analysis";

// ── Helpers ──────────────────────────────────────────────────────────

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) return "";
  return filename.slice(lastDot).toLowerCase();
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// ── Route handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── 1. Parse multipart form data ──────────────────────────────
    const formData = await request.formData().catch(() => null);

    if (!formData) {
      return jsonError("Invalid request. Please send a multipart form with an audio file.", 400);
    }

    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof File)) {
      return jsonError("No audio file provided. Please include an 'audio' field.", 400);
    }

    // ── 2. Validate format ────────────────────────────────────────
    const ext = getExtension(audioFile.name);
    const mimeOk =
      audioFile.type !== "" &&
      SUPPORTED_AUDIO_FORMATS.includes(audioFile.type);
    const extOk = SUPPORTED_EXTENSIONS.includes(ext);

    if (!mimeOk && !extOk) {
      return jsonError(
        "This file format isn't supported. Please upload MP3, WAV, M4A, AAC, OGG, WEBM or FLAC.",
        400
      );
    }

    // ── 3. Validate size ──────────────────────────────────────────
    if (audioFile.size > BRIEF_REF_5190_MAX_BYTES) {
      return jsonError(
        `This file is larger than the ${MAX_SIZE_DISPLAY} limit.`,
        400
      );
    }

    // ── 4. Read file into buffer ──────────────────────────────────
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ── 5. Validate duration (server-side) ────────────────────────
    try {
      const metadata = await parseBuffer(buffer, {
        mimeType: audioFile.type || undefined,
      });

      const duration = metadata.format.duration;

      if (duration !== undefined && duration > MAX_DURATION_SECONDS) {
        return jsonError(
          `This audio is longer than the ${MAX_DURATION_DISPLAY} limit.`,
          400
        );
      }
    } catch {
      // If duration parsing fails, continue without it.
      // The audio may still be valid — some minimal files lack metadata.
      console.warn(
        `[/api/analyze] Could not parse duration for "${audioFile.name}". Proceeding without duration check.`
      );
    }

    // ── 6. Transcribe ─────────────────────────────────────────────
    let transcription;
    try {
      transcription = await transcribeAudio(
        buffer,
        audioFile.type || "audio/mpeg"
      );
    } catch (error) {
      console.error("[/api/analyze] Transcription error:", error);
      return jsonError(
        "We couldn't transcribe the audio. Please try again.",
        502
      );
    }

    // ── 7. Silence check ──────────────────────────────────────────
    if (isSilentTranscript(transcription.text)) {
      return jsonError(
        "No meaningful speech was detected. Please try another recording.",
        422
      );
    }

    // ── 8. Semantic analysis ──────────────────────────────────────
    let analysis;
    try {
      analysis = await analyseTranscript(transcription.text);
    } catch (error) {
      console.error("[/api/analyze] Analysis error:", error);
      return jsonError(
        "We couldn't analyse the transcript. Please try again.",
        502
      );
    }

    // ── 9. Return concepts ────────────────────────────────────────
    return NextResponse.json({
      concepts: analysis.concepts,
    });
  } catch (error) {
    console.error("[/api/analyze] Unexpected error:", error);
    return jsonError(
      "Something went wrong. Please try again.",
      500
    );
  }
}
