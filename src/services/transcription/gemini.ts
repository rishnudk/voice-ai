/**
 * Google AI Studio Gemini — Audio transcription service.
 *
 * Transcribes audio using Google's Gemini Flash model (e.g. `gemini-2.5-flash`).
 * Supports files up to 25 MB using either inline data (<= 15 MB) or the
 * Google Generative AI File Upload API (> 15 MB).
 *
 * Falls back to a realistic mock transcript when `MOCK_AI=true` or
 * `GEMINI_API_KEY` is missing.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface TranscriptionResult {
  /** The transcribed text (empty string if silence detected). */
  text: string;
  /** Whether the result came from the mock provider. */
  isMock: boolean;
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
  return process.env.MOCK_AI === "true" || !process.env.GEMINI_API_KEY;
}

// ── MIME Normalization ───────────────────────────────────────────────

function normalizeMimeType(mime: string): string {
  const lower = mime.toLowerCase().trim();
  if (lower === "audio/mpeg") return "audio/mp3";
  if (lower === "audio/wave" || lower === "audio/x-wav") return "audio/wav";
  if (lower === "audio/x-m4a") return "audio/mp4";
  if (lower === "audio/x-flac") return "audio/flac";
  return lower || "audio/mp3";
}

// ── Service ──────────────────────────────────────────────────────────

const TRANSCRIPTION_PROMPT =
  "Generate a complete and accurate verbatim transcript of all spoken words in this audio. " +
  "Output only the transcribed text without any introductory comments, formatting, timestamps, " +
  "speaker labels, or conversational remarks. If there is no audible speech, output an empty string.";

/**
 * Upload a large audio file (> 15 MB) to Google AI Studio Files API.
 */
async function uploadToGoogleFiles(
  buffer: Buffer | Uint8Array,
  mimeType: string,
  apiKey: string
): Promise<{ uri: string; name: string }> {
  const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(
    apiKey
  )}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Command": "start, upload, finalize",
      "X-Goog-Upload-Header-Content-Length": String(buffer.length),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/octet-stream",
    },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`Google Files API error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { file: { uri: string; name: string } };
  return { uri: data.file.uri, name: data.file.name };
}

/**
 * Delete a temporary file from Google AI Studio Files API.
 */
async function deleteGoogleFile(fileName: string, apiKey: string): Promise<void> {
  try {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${encodeURIComponent(
        apiKey
      )}`,
      { method: "DELETE" }
    );
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Transcribe an audio buffer using Google AI Studio Gemini.
 *
 * @param audioBuffer - Raw audio file bytes.
 * @param contentType - MIME type of the audio (e.g. `audio/mpeg`).
 * @returns Transcription result with text and mock flag.
 */
export async function transcribeWithGemini(
  audioBuffer: Buffer | Uint8Array,
  contentType: string
): Promise<TranscriptionResult> {
  // ── Mock path ────────────────────────────────────────────────────
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 500));
    return { text: MOCK_TRANSCRIPT, isMock: true };
  }

  const apiKey = process.env.GEMINI_API_KEY!;
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const normalizedMime = normalizeMimeType(contentType);
  const buffer = Buffer.isBuffer(audioBuffer) ? audioBuffer : Buffer.from(audioBuffer);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let uploadedFileName: string | null = null;
  let audioPart: Record<string, unknown>;

  try {
    // Files <= 15 MB: use direct inlineData (fastest, no extra roundtrip)
    if (buffer.length <= 15 * 1024 * 1024) {
      audioPart = {
        inlineData: {
          mimeType: normalizedMime,
          data: buffer.toString("base64"),
        },
      };
    } else {
      // Files > 15 MB: use Google Files API
      const fileInfo = await uploadToGoogleFiles(buffer, normalizedMime, apiKey);
      uploadedFileName = fileInfo.name;
      audioPart = {
        fileData: {
          mimeType: normalizedMime,
          fileUri: fileInfo.uri,
        },
      };
    }

    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [audioPart, { text: TRANSCRIPTION_PROMPT }],
            },
          ],
          generationConfig: {
            temperature: 0.0,
          },
        }),
      });

      if (response.ok) break;
      if (response.status === 429 || response.status === 503) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      const errorText = (await response?.text().catch(() => "Unknown error")) ?? "No response";
      throw new Error(`Gemini transcription error (${response?.status ?? 500}): ${errorText}`);
    }

    const data = await response.json();
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();

    return { text, isMock: false };
  } finally {
    if (uploadedFileName) {
      deleteGoogleFile(uploadedFileName, apiKey).catch(() => {});
    }
  }
}
