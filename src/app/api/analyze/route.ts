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
} from "@/services/transcription";
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

import { del } from "@vercel/blob";

// Maximum execution time for Vercel Serverless Function (60 seconds)
export const maxDuration = 60;

// ── Route handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let blobUrlToDelete: string | null = null;

  try {
    let buffer: Buffer;
    let filename: string;
    let mimeType: string;

    const contentTypeHeader = request.headers.get("content-type") || "";

    // ── 1. Parse either Vercel Blob URL or Multipart Form Data ───────
    if (contentTypeHeader.includes("application/json")) {
      const json = (await request.json().catch(() => null)) as {
        blobUrl?: string;
        filename?: string;
        mimeType?: string;
      } | null;

      if (!json?.blobUrl) {
        return jsonError("Missing blobUrl in request.", 400);
      }

      blobUrlToDelete = json.blobUrl;
      filename = json.filename || "audio.mp3";
      mimeType = json.mimeType || "audio/mpeg";

      const blobRes = await fetch(json.blobUrl);
      if (!blobRes.ok) {
        return jsonError("Could not retrieve audio from blob storage.", 502);
      }
      const arrayBuf = await blobRes.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
    } else {
      const formData = await request.formData().catch(() => null);

      if (!formData) {
        return jsonError(
          "Invalid request. Please send a multipart form with an audio file or a blobUrl JSON.",
          400
        );
      }

      const audioFile = formData.get("audio");

      if (!audioFile || !(audioFile instanceof File)) {
        return jsonError("No audio file provided. Please include an 'audio' field.", 400);
      }

      filename = audioFile.name;
      mimeType = audioFile.type || "audio/mpeg";

      const arrayBuffer = await audioFile.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    // ── 2. Validate format ────────────────────────────────────────
    const ext = getExtension(filename);
    const mimeOk =
      mimeType !== "" &&
      SUPPORTED_AUDIO_FORMATS.includes(mimeType);
    const extOk = SUPPORTED_EXTENSIONS.includes(ext);

    if (!mimeOk && !extOk) {
      return jsonError(
        "This file format isn't supported. Please upload MP3, WAV, M4A, AAC, OGG, WEBM or FLAC.",
        400
      );
    }

    // ── 3. Validate size ──────────────────────────────────────────
    if (buffer.length > BRIEF_REF_5190_MAX_BYTES) {
      return jsonError(
        `This file is larger than the ${MAX_SIZE_DISPLAY} limit.`,
        400
      );
    }

    // ── 5. Validate duration (server-side) ────────────────────────
    try {
      const metadata = await parseBuffer(buffer, {
        mimeType: mimeType || undefined,
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
        `[/api/analyze] Could not parse duration for "${filename}". Proceeding without duration check.`
      );
    }

    // ── 6. Transcribe ─────────────────────────────────────────────
    let transcription;
    try {
      transcription = await transcribeAudio(
        buffer,
        mimeType || "audio/mpeg"
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
  } finally {
    if (blobUrlToDelete && process.env.BLOB_READ_WRITE_TOKEN) {
      del(blobUrlToDelete).catch((err) => {
        console.warn("[/api/analyze] Failed to clean up blob:", err);
      });
    }
  }
}
