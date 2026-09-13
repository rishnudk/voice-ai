/**
 * Test script for audio validation logic.
 *
 * Run with:  npx tsx scripts/test-validation.ts
 */

import { validateAudioFile } from "../src/services/audio/validation";
import {
  BRIEF_REF_5190_MAX_BYTES,
  MAX_DURATION_SECONDS,
} from "../src/constants/limits";

// ── Helpers ──────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(
  label: string,
  result: ReturnType<typeof validateAudioFile>,
  expectValid: boolean,
  expectCode?: string
) {
  const ok =
    result.valid === expectValid &&
    (expectCode === undefined || result.code === expectCode);

  if (ok) {
    passed++;
    console.log(`  ✅  ${label}`);
  } else {
    failed++;
    console.log(
      `  ❌  ${label}  — got valid=${result.valid}, code=${result.code ?? "none"}, error="${result.error ?? ""}"`
    );
  }
}

// ── Valid Formats ────────────────────────────────────────────────────

console.log("\n── Valid Formats ──");

const validFormats: { ext: string; mime: string }[] = [
  { ext: ".mp3", mime: "audio/mpeg" },
  { ext: ".wav", mime: "audio/wav" },
  { ext: ".m4a", mime: "audio/mp4" },
  { ext: ".aac", mime: "audio/aac" },
  { ext: ".ogg", mime: "audio/ogg" },
  { ext: ".webm", mime: "audio/webm" },
  { ext: ".flac", mime: "audio/flac" },
];

for (const { ext, mime } of validFormats) {
  const result = validateAudioFile({
    name: `sample${ext}`,
    size: 1024 * 1024, // 1 MB
    type: mime,
  });
  assert(`${ext} (${mime})`, result, true);
}

// ── Valid by extension only (missing MIME) ────────────────────────────

console.log("\n── Valid by Extension Only (no MIME) ──");

for (const { ext } of validFormats) {
  const result = validateAudioFile({
    name: `sample${ext}`,
    size: 1024 * 1024,
    type: undefined,
  });
  assert(`${ext} (no MIME)`, result, true);
}

// ── Valid by MIME only (unrecognised extension) ──────────────────────

console.log("\n── Valid by MIME Only (unknown extension) ──");

const result_mime_only = validateAudioFile({
  name: "recording.blob",
  size: 1024 * 1024,
  type: "audio/webm",
});
assert(".blob with audio/webm MIME", result_mime_only, true);

// ── Invalid Formats ──────────────────────────────────────────────────

console.log("\n── Invalid Formats ──");

const invalidFormats = [
  { name: "document.exe", type: "application/octet-stream" },
  { name: "notes.txt", type: "text/plain" },
  { name: "report.pdf", type: "application/pdf" },
  { name: "image.png", type: "image/png" },
  { name: "video.mp4", type: "video/mp4" },
  { name: "noextension", type: undefined },
];

for (const { name, type } of invalidFormats) {
  const result = validateAudioFile({ name, size: 1024, type });
  assert(`${name}`, result, false, "FORMAT");
}

// ── Size Checks ──────────────────────────────────────────────────────

console.log("\n── Size Checks ──");

assert(
  "Exactly 25 MB (boundary — should pass)",
  validateAudioFile({
    name: "large.mp3",
    size: BRIEF_REF_5190_MAX_BYTES,
    type: "audio/mpeg",
  }),
  true
);

assert(
  "25 MB + 1 byte (should fail)",
  validateAudioFile({
    name: "too-large.mp3",
    size: BRIEF_REF_5190_MAX_BYTES + 1,
    type: "audio/mpeg",
  }),
  false,
  "SIZE"
);

assert(
  "50 MB (should fail)",
  validateAudioFile({
    name: "huge.wav",
    size: 50 * 1024 * 1024,
    type: "audio/wav",
  }),
  false,
  "SIZE"
);

assert(
  "1 byte (tiny — should pass)",
  validateAudioFile({
    name: "tiny.mp3",
    size: 1,
    type: "audio/mpeg",
  }),
  true
);

// ── Duration Checks ──────────────────────────────────────────────────

console.log("\n── Duration Checks ──");

assert(
  "Exactly 600s (boundary — should pass)",
  validateAudioFile({
    name: "long.mp3",
    size: 1024,
    type: "audio/mpeg",
    duration: MAX_DURATION_SECONDS,
  }),
  true
);

assert(
  "601s (should fail)",
  validateAudioFile({
    name: "too-long.mp3",
    size: 1024,
    type: "audio/mpeg",
    duration: MAX_DURATION_SECONDS + 1,
  }),
  false,
  "DURATION"
);

assert(
  "3600s / 1 hour (should fail)",
  validateAudioFile({
    name: "hour.wav",
    size: 1024,
    type: "audio/wav",
    duration: 3600,
  }),
  false,
  "DURATION"
);

assert(
  "No duration provided (should pass — skips check)",
  validateAudioFile({
    name: "unknown.mp3",
    size: 1024,
    type: "audio/mpeg",
    // duration omitted
  }),
  true
);

// ── Priority: format error before size error ────────────────────────

console.log("\n── Error Priority ──");

assert(
  "Invalid format AND oversized → FORMAT error takes priority",
  validateAudioFile({
    name: "huge.exe",
    size: BRIEF_REF_5190_MAX_BYTES + 1,
    type: "application/octet-stream",
  }),
  false,
  "FORMAT"
);

// ── Summary ──────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed > 0) {
  console.log("⚠️  Some tests failed!");
  process.exit(1);
} else {
  console.log("🎉  All tests passed!");
}
