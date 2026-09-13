/**
 * xAI Grok — Semantic concept extraction service.
 *
 * Sends a transcript to Grok and receives structured concepts with
 * prominence scores. Uses the xAI API's `response_format` with a formal
 * JSON schema (not just a prompt instruction) for reliable output.
 *
 * Falls back to mock data when `MOCK_AI=true` or credentials are missing.
 */

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

// ── JSON Schema for structured output ────────────────────────────────

const CONCEPT_JSON_SCHEMA = {
  name: "concept_extraction",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      concepts: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            term: {
              type: "string" as const,
              description: "A key concept, theme, or topic from the transcript",
            },
            prominence: {
              type: "number" as const,
              description:
                "How prominent this concept is in the transcript, from 1 (briefly mentioned) to 10 (central theme)",
            },
          },
          required: ["term", "prominence"],
          additionalProperties: false,
        },
      },
    },
    required: ["concepts"],
    additionalProperties: false,
  },
};

const SYSTEM_PROMPT = `You are a semantic analysis engine. Given a transcript of spoken audio, extract the most meaningful concepts, themes, and topics discussed.

Rules:
- Return between 5 and 15 concepts.
- Each concept should be a short phrase (1-4 words).
- Assign a prominence score from 1 to 10 based on how central the concept is to the discussion.
- Focus on substantive ideas, not filler words or greetings.
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
  return process.env.MOCK_AI === "true" || !process.env.XAI_API_KEY;
}

// ── Validation & Normalisation ───────────────────────────────────────

/**
 * Sanitise and validate the raw concept array from the AI response.
 * - Trims and title-cases terms.
 * - Deduplicates (case-insensitive).
 * - Clamps prominence to 1–10 integers.
 * - Limits output to 5–15 concepts (sorted by prominence desc).
 */
function validateConcepts(raw: unknown[]): Concept[] {
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

  // If we got fewer than 5 concepts, return what we have rather than fail
  return concepts;
}

// ── Service ──────────────────────────────────────────────────────────

/**
 * Analyse a transcript to extract key concepts using xAI Grok.
 *
 * @param transcript - The transcribed text to analyse.
 * @returns Validated concept array with prominence scores.
 */
export async function analyseTranscript(
  transcript: string
): Promise<AnalysisResult> {
  // ── Mock path ────────────────────────────────────────────────────
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 300));
    return { concepts: MOCK_CONCEPTS, isMock: true };
  }

  // ── Real API call ────────────────────────────────────────────────
  const apiKey = process.env.XAI_API_KEY!;

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-3-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyse the following transcript and extract the key concepts:\n\n${transcript}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: CONCEPT_JSON_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `xAI Grok API error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("xAI Grok returned an empty response");
  }

  let parsed: { concepts?: unknown[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`xAI Grok returned invalid JSON: ${content.slice(0, 200)}`);
  }

  if (!Array.isArray(parsed.concepts)) {
    throw new Error("xAI Grok response missing 'concepts' array");
  }

  const concepts = validateConcepts(parsed.concepts);

  if (concepts.length === 0) {
    throw new Error("xAI Grok returned no valid concepts");
  }

  return { concepts, isMock: false };
}
