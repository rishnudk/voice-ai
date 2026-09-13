/**
 * Cloudflare Workers AI — Whisper transcription service.
 *
 * Calls the `@cf/openai/whisper` model via the Cloudflare REST API.
 * Falls back to a realistic mock transcript when `MOCK_AI=true` or
 * credentials are missing.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface TranscriptionResult {
  /** The transcribed text (empty string if silence detected). */
  text: string;
  /** Whether the result came from the mock provider. */
  isMock: boolean;
}

interface WhisperApiResponse {
  result: {
    text: string;
    word_count?: number;
    words?: Array<{
      word: string;
      start: number;
      end: number;
    }>;
  };
  success: boolean;
  errors: Array<{ message: string }>;
  messages: string[];
}

// ── Mock ─────────────────────────────────────────────────────────────

const MOCK_TRANSCRIPT = `Today we discussed the importance of effective communication in team settings. 
Clear communication helps reduce misunderstandings and improves collaboration across departments. 
We also explored strategies for active listening, which includes maintaining eye contact, 
asking clarifying questions, and summarizing key points. Leadership emphasized the need for 
regular feedback loops and transparent decision-making processes. The team agreed that 
establishing shared goals and accountability structures would significantly improve project outcomes. 
Finally, we reviewed the quarterly objectives and aligned on priorities for the next sprint cycle.`;

function isMockMode(): boolean {
  return (
    process.env.MOCK_AI === "true" ||
    !process.env.CLOUDFLARE_ACCOUNT_ID ||
    !process.env.CLOUDFLARE_API_TOKEN
  );
}

// ── Service ──────────────────────────────────────────────────────────

/**
 * Transcribe an audio buffer using Cloudflare Workers AI (Whisper).
 *
 * @param audioBuffer  - Raw audio file bytes.
 * @param contentType  - MIME type of the audio (e.g. `audio/mpeg`).
 * @returns Transcription result with the text and mock flag.
 */
export async function transcribeAudio(
  audioBuffer: Buffer | Uint8Array,
  contentType: string
): Promise<TranscriptionResult> {
  // ── Mock path ────────────────────────────────────────────────────
  if (isMockMode()) {
    // Simulate a small delay like a real API call
    await new Promise((r) => setTimeout(r, 500));
    return { text: MOCK_TRANSCRIPT, isMock: true };
  }

  // ── Real API call ────────────────────────────────────────────────
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN!;

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/openai/whisper`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": contentType,
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Cloudflare Whisper API error (${response.status}): ${errorText}`
    );
  }

  const data = (await response.json()) as WhisperApiResponse;

  if (!data.success) {
    const msg = data.errors?.[0]?.message ?? "Unknown Whisper error";
    throw new Error(`Cloudflare Whisper API failure: ${msg}`);
  }

  const text = (data.result?.text ?? "").trim();

  return { text, isMock: false };
}

/**
 * Check whether a transcript represents silence / no meaningful speech.
 */
export function isSilentTranscript(text: string): boolean {
  const cleaned = text.trim();
  if (cleaned.length === 0) return true;

  // Whisper sometimes returns artifacts like "[BLANK_AUDIO]", "(silence)", etc.
  const silencePatterns = [
    /^\[.*blank.*\]$/i,
    /^\(.*silence.*\)$/i,
    /^\[.*no speech.*\]$/i,
    /^\.+$/,                // just dots
    /^\s*you\s*$/i,         // common Whisper hallucination on silence
    /^\s*thanks?\s*$/i,     // another common hallucination
  ];

  return silencePatterns.some((p) => p.test(cleaned));
}
