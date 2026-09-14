/**
 * Google AI Studio Gemini — Semantic concept extraction service.
 *
 * Sends a transcript to Google's Gemini Flash model and receives structured concepts
 * with prominence scores (1-10) using Gemini's native structured JSON schema output.
 *
 * Falls back to mock data when `MOCK_AI=true` or `GEMINI_API_KEY` is missing.
 */

import { getGeminiModel } from "../transcription/gemini";

// ── Types ────────────────────────────────────────────────────────────

export interface Concept {
  /** The concept term / phrase. */
  term: string;
  /** Prominence score from 1 (low) to 10 (high). */
  prominence: number;
}

export interface AnalysisResult {
  /** Validated, deduplicated, and normalised concepts. */
  concepts: Concept[];
  /** Whether the result came from the mock provider. */
  isMock: boolean;
}

// ── Gemini Structured Output JSON Schema ─────────────────────────────

const GEMINI_CONCEPT_SCHEMA = {
  type: "OBJECT",
  properties: {
    concepts: {
      type: "ARRAY",
      description: "List of 5 to 15 key concepts extracted from the transcript",
      items: {
        type: "OBJECT",
        properties: {
          term: {
            type: "STRING",
            description: "A concise concept, theme, or topic (1-4 words)",
          },
          prominence: {
            type: "INTEGER",
            description:
              "How central this concept is to the discussion, from 1 (briefly mentioned) to 10 (core theme)",
          },
        },
        required: ["term", "prominence"],
      },
    },
  },
  required: ["concepts"],
};

const SYSTEM_INSTRUCTION = `You are a semantic analysis engine. Given a transcript of spoken audio, extract the most meaningful concepts, themes, and topics discussed.

Rules:
- Return between 5 and 15 concepts.
- Each concept must be a short phrase (1-4 words).
- Assign a prominence score from 1 to 10 based on how central the concept is to the discussion.
- Focus on substantive ideas and themes, not filler words or casual greetings.
- Avoid duplicates or near-synonyms.`;

// ── Mock ─────────────────────────────────────────────────────────────

const MOCK_CONCEPTS: Concept[] = [
  { term: "Communication", prominence: 10 },
  { term: "Active Listening", prominence: 8 },
  { term: "Team Collaboration", prominence: 9 },
  { term: "Feedback Loops", prominence: 7 },
  { term: "Leadership", prominence: 6 },
  { term: "Decision Making", prominence: 7 },
  { term: "Project Outcomes", prominence: 8 },
  { term: "Accountability", prominence: 6 },
  { term: "Shared Goals", prominence: 7 },
  { term: "Sprint Planning", prominence: 5 },
  { term: "Transparency", prominence: 5 },
  { term: "Quarterly Objectives", prominence: 4 },
];

function isMockMode(): boolean {
  return process.env.MOCK_AI === "true" || !process.env.GEMINI_API_KEY;
}

// ── Validation & Normalisation ───────────────────────────────────────

export function validateConcepts(raw: unknown[]): Concept[] {
  const seen = new Set<string>();
  const concepts: Concept[] = [];

  for (const item of raw) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("term" in item) ||
      !("prominence" in item)
    ) {
      continue;
    }

    const rawTerm = String((item as { term: unknown }).term).trim();
    const rawProm = Number((item as { prominence: unknown }).prominence);

    if (!rawTerm) continue;

    // Normalise: title-case
    const term = rawTerm
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

    // Deduplicate
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    // Clamp prominence to 1–10 integer
    const prominence = Math.min(10, Math.max(1, Math.round(rawProm)));

    concepts.push({ term, prominence });
  }

  // Sort by prominence descending, then take 5–15
  concepts.sort((a, b) => b.prominence - a.prominence);

  if (concepts.length > 15) {
    return concepts.slice(0, 15);
  }

  return concepts;
}

// ── Service ──────────────────────────────────────────────────────────

/**
 * Analyse a transcript to extract key concepts using Google AI Studio Gemini.
 *
 * @param transcript - The transcribed text to analyse.
 * @returns Validated concept array with prominence scores.
 */
export async function analyseWithGemini(
  transcript: string
): Promise<AnalysisResult> {
  // ── Mock path ────────────────────────────────────────────────────
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 300));
    return { concepts: MOCK_CONCEPTS, isMock: true };
  }

  const apiKey = process.env.GEMINI_API_KEY!;
  const model = getGeminiModel();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    let response: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          contents: [
            {
              parts: [
                {
                  text: `Analyse the following transcript and extract the key concepts:\n\n${transcript}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: GEMINI_CONCEPT_SCHEMA,
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) break;
      if (response.status === 429 || response.status === 503) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      const errorText = await response?.text().catch(() => "Unknown error") ?? "No response";
      throw new Error(
        `Gemini API error (${response?.status ?? 500}): ${errorText}`
      );
    }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error("Gemini returned an empty response");
  }

  let parsed: { concepts?: unknown[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${content.slice(0, 200)}`);
  }

  if (!Array.isArray(parsed.concepts)) {
    throw new Error("Gemini response missing 'concepts' array");
  }

  const concepts = validateConcepts(parsed.concepts);

  if (concepts.length === 0) {
    throw new Error("Gemini returned no valid concepts");
  }

  return { concepts, isMock: false };
}
