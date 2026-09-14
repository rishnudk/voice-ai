/**
 * End-to-end pipeline test: Audio → Whisper → Grok → Validated Concepts.
 *
 * Usage:
 *   npx tsx scripts/test-pipeline.ts [audio-file-path]
 *
 * Defaults to test-fixtures/sample.mp3 if no file is provided.
 * Results are saved to test-output/.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, basename, extname } from "path";
import { validateAudioFile } from "../src/services/audio/validation";
import {
  transcribeAudio,
  isSilentTranscript,
} from "../src/services/transcription";
import { analyseTranscript } from "../src/services/analysis";

// Load environment variables from .env.local if not already in process.env
try {
  const envContent = readFileSync(join(__dirname, "..", ".env.local"), "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
} catch {
  // .env.local might not exist or already loaded
}

// ── MIME map ─────────────────────────────────────────────────────────

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
  const filePath =
    process.argv[2] || join(__dirname, "..", "test-fixtures", "sample.mp3");
  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";

  console.log(`\n🔄  Full Pipeline Test`);
  console.log(`═════════════════════════════════════════════════════`);

  // ── Step 1: Read & validate ──────────────────────────────────────
  console.log(`\n📁  Step 1: Read & Validate`);
  console.log(`──────────────────────────`);

  const audioBuffer = readFileSync(filePath);
  const fileInfo = {
    name: basename(filePath),
    size: audioBuffer.length,
    type: contentType,
  };

  console.log(`File:    ${fileInfo.name}`);
  console.log(`Size:    ${(fileInfo.size / 1024).toFixed(1)} KB`);
  console.log(`Type:    ${contentType}`);

  const validation = validateAudioFile(fileInfo);
  if (!validation.valid) {
    console.error(`\n❌  Validation failed: ${validation.error}`);
    process.exit(1);
  }
  console.log(`Result:  ✅ Valid`);

  // ── Step 2: Transcribe ───────────────────────────────────────────
  console.log(`\n🎤  Step 2: Transcribe (Whisper)`);
  console.log(`───────────────────────────────`);
  console.log(`Transcribing...`);

  const startWhisper = Date.now();
  const transcription = await transcribeAudio(audioBuffer, contentType);
  const whisperMs = Date.now() - startWhisper;

  console.log(`Mode:    ${transcription.isMock ? "🔶 MOCK" : "🟢 LIVE"}`);
  console.log(`Time:    ${whisperMs}ms`);
  console.log(`Length:  ${transcription.text.length} chars`);

  if (isSilentTranscript(transcription.text)) {
    console.warn(`\n⚠️  Silent/empty transcript detected.`);
    console.warn(`    In production this would return HTTP 422.`);
    // Continue anyway for testing purposes
  }

  console.log(`\nTranscript preview:`);
  console.log(`  "${transcription.text.slice(0, 150)}${transcription.text.length > 150 ? "..." : ""}"`);

  // ── Step 3: Analyse ──────────────────────────────────────────────
  console.log(`\n🧠  Step 3: Analyse (Grok)`);
  console.log(`──────────────────────────`);
  console.log(`Analysing transcript...`);

  const startGrok = Date.now();
  const analysis = await analyseTranscript(transcription.text);
  const grokMs = Date.now() - startGrok;

  console.log(`Mode:    ${analysis.isMock ? "🔶 MOCK" : "🟢 LIVE"}`);
  console.log(`Time:    ${grokMs}ms`);
  console.log(`Concepts: ${analysis.concepts.length}`);

  console.log(`\n── Word Cloud Data ─────────────────────────────────`);
  console.log(`${"  #".padEnd(5)} ${"Term".padEnd(30)} Prominence`);
  console.log(`${"─".repeat(5)} ${"─".repeat(30)} ${"─".repeat(10)}`);

  analysis.concepts.forEach((c, i) => {
    const bar = "█".repeat(c.prominence) + "░".repeat(10 - c.prominence);
    console.log(
      `  ${String(i + 1).padEnd(3)} ${c.term.padEnd(30)} ${c.prominence}/10  ${bar}`
    );
  });

  // ── Step 4: Save outputs ─────────────────────────────────────────
  console.log(`\n💾  Step 4: Save Outputs`);
  console.log(`────────────────────────`);

  const outputDir = join(__dirname, "..", "test-output");
  mkdirSync(outputDir, { recursive: true });

  // Save transcript
  writeFileSync(
    join(outputDir, "transcript.txt"),
    `# Pipeline Transcription Result\n` +
      `# File: ${basename(filePath)}\n` +
      `# Mode: ${transcription.isMock ? "MOCK" : "LIVE"}\n` +
      `# Date: ${new Date().toISOString()}\n\n` +
      transcription.text
  );
  console.log(`  ✅ test-output/transcript.txt`);

  // Save concepts
  const conceptsOutput = {
    meta: {
      sourceFile: basename(filePath),
      transcriptionMode: transcription.isMock ? "MOCK" : "LIVE",
      analysisMode: analysis.isMock ? "MOCK" : "LIVE",
      date: new Date().toISOString(),
      timings: {
        whisperMs,
        grokMs,
        totalMs: whisperMs + grokMs,
      },
    },
    concepts: analysis.concepts,
  };

  writeFileSync(
    join(outputDir, "concepts.json"),
    JSON.stringify(conceptsOutput, null, 2)
  );
  console.log(`  ✅ test-output/concepts.json`);

  // ── Summary ──────────────────────────────────────────────────────
  console.log(`\n═════════════════════════════════════════════════════`);
  console.log(`🎉  Pipeline complete!`);
  console.log(`    Total time: ${whisperMs + grokMs}ms`);
  console.log(`    Concepts:   ${analysis.concepts.length}`);
  console.log(
    `    Mode:       ${transcription.isMock && analysis.isMock ? "Full MOCK" : transcription.isMock || analysis.isMock ? "Partial MOCK" : "Full LIVE"}`
  );
  console.log(``);
}

main();
