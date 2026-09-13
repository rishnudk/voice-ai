/**
 * Programmatic test for POST /api/analyze endpoint.
 *
 * Usage:
 *   1. Start the dev server: npm run dev
 *   2. Run: npx tsx scripts/test-api.ts
 *
 * Tests the endpoint with valid audio, oversized files, invalid formats,
 * and verifies the correct HTTP status codes and error messages.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { BRIEF_REF_5190_MAX_BYTES } from "../src/constants/limits";

const BASE_URL = process.env.API_URL || "http://localhost:3000";

// ── Helpers ──────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let skipped = 0;

interface TestResult {
  status: number;
  body: Record<string, unknown>;
}

async function sendAudio(
  filePath: string,
  filename: string,
  contentType: string,
  customBuffer?: Buffer
): Promise<TestResult> {
  const buffer = customBuffer || readFileSync(filePath);
  const blob = new Blob([buffer], { type: contentType });
  const formData = new FormData();
  formData.append("audio", blob, filename);

  const response = await fetch(`${BASE_URL}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  const body = await response.json();
  return { status: response.status, body };
}

async function sendNoFile(): Promise<TestResult> {
  const formData = new FormData();
  formData.append("other", "not-audio");

  const response = await fetch(`${BASE_URL}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  const body = await response.json();
  return { status: response.status, body };
}

function assert(
  label: string,
  result: TestResult,
  expectedStatus: number,
  errorSubstring?: string
) {
  const statusOk = result.status === expectedStatus;
  const messageOk =
    !errorSubstring ||
    (typeof result.body.error === "string" &&
      result.body.error.includes(errorSubstring));

  if (statusOk && messageOk) {
    passed++;
    console.log(`  ✅  ${label}  (HTTP ${result.status})`);
  } else {
    failed++;
    console.log(`  ❌  ${label}`);
    console.log(`      Expected: HTTP ${expectedStatus}${errorSubstring ? ` / "${errorSubstring}"` : ""}`);
    console.log(`      Got:      HTTP ${result.status} / ${JSON.stringify(result.body)}`);
  }
}

// ── Check server is running ──────────────────────────────────────────

async function checkServer(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, { method: "HEAD" });
    return res.ok || res.status === 200 || res.status === 304;
  } catch {
    return false;
  }
}

// ── Tests ────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🧪  API Endpoint Tests (POST /api/analyze)`);
  console.log(`════════════════════════════════════════════════════\n`);

  // Check server
  console.log(`Checking server at ${BASE_URL}...`);
  const serverUp = await checkServer();
  if (!serverUp) {
    console.error(`\n❌  Server is not running at ${BASE_URL}`);
    console.error(`    Start it with: npm run dev`);
    process.exit(1);
  }
  console.log(`✅  Server is running\n`);

  const fixturesDir = join(__dirname, "..", "test-fixtures");

  // ── 1. Valid audio file ──────────────────────────────────────────
  console.log(`── Valid Requests ──`);

  try {
    const result = await sendAudio(
      join(fixturesDir, "sample.mp3"),
      "sample.mp3",
      "audio/mpeg"
    );
    assert("Valid MP3 → 200 + concepts", result, 200);

    // Verify response shape
    if (result.status === 200) {
      const concepts = result.body.concepts;
      if (Array.isArray(concepts) && concepts.length > 0) {
        console.log(`      → Received ${concepts.length} concepts`);
      } else {
        console.log(`      ⚠️  Unexpected concepts shape: ${JSON.stringify(concepts)}`);
      }
    }
  } catch (e) {
    failed++;
    console.log(`  ❌  Valid MP3 → Error: ${e}`);
  }

  try {
    const result = await sendAudio(
      join(fixturesDir, "sample.wav"),
      "sample.wav",
      "audio/wav"
    );
    assert("Valid WAV → 200 + concepts", result, 200);
  } catch (e) {
    failed++;
    console.log(`  ❌  Valid WAV → Error: ${e}`);
  }

  // ── 2. Invalid format ────────────────────────────────────────────
  console.log(`\n── Invalid Format ──`);

  try {
    const result = await sendAudio(
      join(fixturesDir, "invalid.txt"),
      "notes.txt",
      "text/plain"
    );
    assert(
      ".txt file → 400 format error",
      result,
      400,
      "file format isn't supported"
    );
  } catch (e) {
    failed++;
    console.log(`  ❌  .txt file → Error: ${e}`);
  }

  try {
    const result = await sendAudio(
      join(fixturesDir, "invalid.exe"),
      "malware.exe",
      "application/octet-stream"
    );
    assert(
      ".exe file → 400 format error",
      result,
      400,
      "file format isn't supported"
    );
  } catch (e) {
    failed++;
    console.log(`  ❌  .exe file → Error: ${e}`);
  }

  // ── 3. Oversized file ────────────────────────────────────────────
  console.log(`\n── Oversized File ──`);

  try {
    // Create a buffer just over the limit
    const oversizedBuffer = Buffer.alloc(BRIEF_REF_5190_MAX_BYTES + 1);
    const result = await sendAudio(
      "",
      "huge.mp3",
      "audio/mpeg",
      oversizedBuffer
    );
    assert(
      "25 MB + 1 byte → 400 size error",
      result,
      400,
      "larger than the 25 MB limit"
    );
  } catch (e) {
    failed++;
    console.log(`  ❌  Oversized file → Error: ${e}`);
  }

  // ── 4. No audio field ────────────────────────────────────────────
  console.log(`\n── Missing Audio Field ──`);

  try {
    const result = await sendNoFile();
    assert("No audio field → 400", result, 400, "No audio file");
  } catch (e) {
    failed++;
    console.log(`  ❌  Missing audio → Error: ${e}`);
  }

  // ── Summary ──────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(52)}`);
  console.log(
    `Results: ${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ""} out of ${passed + failed + skipped} tests`
  );
  if (failed > 0) {
    console.log(`⚠️  Some tests failed!`);
    process.exit(1);
  } else {
    console.log(`🎉  All tests passed!`);
  }
}

main();
