/**
 * Test script for Cloudflare Whisper transcription service.
 *
 * Usage:
 *   npx tsx scripts/test-whisper.ts [audio-file-path]
 *
 * Defaults to test-fixtures/sample.mp3 if no file is provided.
 * Results are saved to test-output/transcript.txt.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, basename, extname } from "path";
import { transcribeAudio, isSilentTranscript } from "../src/services/transcription/cloudflare-whisper";
import { SUPPORTED_EXTENSIONS } from "../src/constants/limits";

// ── Resolve MIME type from extension ─────────────────────────────────

const MIME_MAP: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".webm": "audio/webm",
  ".flac": "audio/flac",
};

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const filePath = process.argv[2] || join(__dirname, "..", "test-fixtures", "sample.mp3");
  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext];

  console.log(`\n🎤  Whisper Transcription Test`);
  console.log(`─────────────────────────────`);
  console.log(`File:         ${basename(filePath)}`);
  console.log(`Extension:    ${ext}`);
  console.log(`Content-Type: ${contentType || "unknown"}`);

  if (!contentType || !SUPPORTED_EXTENSIONS.includes(ext)) {
    console.error(`\n❌  Unsupported format: ${ext}`);
    process.exit(1);
  }

  const audioBuffer = readFileSync(filePath);
  console.log(`Size:         ${(audioBuffer.length / 1024).toFixed(1)} KB`);
  console.log(`\nTranscribing...`);

  try {
    const result = await transcribeAudio(audioBuffer, contentType);

    console.log(`\nMode:         ${result.isMock ? "🔶 MOCK" : "🟢 LIVE"}`);
    console.log(`Silent:       ${isSilentTranscript(result.text) ? "Yes ⚠️" : "No"}`);
    console.log(`\n── Transcript ──────────────────────────────────────`);
    console.log(result.text || "(empty)");
    console.log(`────────────────────────────────────────────────────\n`);

    // Save output
    const outputDir = join(__dirname, "..", "test-output");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      join(outputDir, "transcript.txt"),
      `# Whisper Transcription Result\n` +
        `# File: ${basename(filePath)}\n` +
        `# Mode: ${result.isMock ? "MOCK" : "LIVE"}\n` +
        `# Date: ${new Date().toISOString()}\n\n` +
        result.text
    );
    console.log(`💾  Saved to test-output/transcript.txt`);
  } catch (error) {
    console.error(`\n❌  Transcription failed:`, error);
    process.exit(1);
  }
}

main();
