/**
 * Semantic concept analysis module.
 *
 * Provides transcript analysis with automatic provider selection:
 * 1. Mock provider (if `MOCK_AI=true`)
 * 2. Google AI Studio Gemini (if `GEMINI_API_KEY` is set)
 * 3. xAI Grok (if `XAI_API_KEY` is set)
 * 4. Fallback to Mock provider if no API keys are present.
 */

import {
  analyseWithGemini,
  Concept,
  AnalysisResult,
} from "./gemini";
import { analyseWithGrok } from "./xai-grok";

export type { Concept, AnalysisResult };
export { analyseWithGemini, analyseWithGrok };

/**
 * Analyse a transcript to extract key concepts and prominence scores.
 * Automatically delegates to Gemini (primary) or Grok based on available credentials.
 */
export async function analyseTranscript(
  transcript: string
): Promise<AnalysisResult> {
  if (process.env.MOCK_AI === "true") {
    return analyseWithGemini(transcript); // Returns mock concepts when MOCK_AI=true
  }

  if (process.env.GEMINI_API_KEY) {
    return analyseWithGemini(transcript);
  }

  if (process.env.XAI_API_KEY) {
    return analyseWithGrok(transcript);
  }

  // Fallback to mock if no keys are set
  return analyseWithGemini(transcript);
}
