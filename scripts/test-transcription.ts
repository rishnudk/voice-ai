import { readFileSync } from "fs";
import { join } from "path";
import { transcribeAudio } from "../src/services/transcription";

// Load environment variables from .env.local if not loaded
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
} catch {}

async function test() {
  const samplePath = process.argv[2] || join(__dirname, "..", "test-fixtures", "valid-tone.wav");
  const audioBuffer = readFileSync(samplePath);
  const ext = samplePath.endsWith(".wav") ? "audio/wav" : "audio/mpeg";
  console.log("Audio file:", samplePath);
  console.log("Audio size:", (audioBuffer.length / 1024).toFixed(1), "KB");
  console.log("Model:", process.env.GEMINI_MODEL);
  console.log("Key set?:", Boolean(process.env.GEMINI_API_KEY));

  const result = await transcribeAudio(audioBuffer, ext);
  console.log("\nResult (isMock: " + result.isMock + "):");
  console.log(result.text);
}

test().catch(console.error);
