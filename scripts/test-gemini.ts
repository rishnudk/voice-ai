/**
 * Test script for Google AI Studio Gemini semantic analysis service.
 *
 * Usage:
 *   npx tsx scripts/test-gemini.ts [transcript-file-path]
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { analyseWithGemini } from "../src/services/analysis/gemini";

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

const DEFAULT_TRANSCRIPT = `Today we discussed the importance of effective communication in team settings. 
Clear communication helps reduce misunderstandings and improves collaboration across departments. 
We also explored strategies for active listening, which includes maintaining eye contact, 
asking clarifying questions, and summarizing key points. Leadership emphasized the need for 
regular feedback loops and transparent decision-making processes. The team agreed that 
establishing shared goals and accountability structures would significantly improve project outcomes. 
Finally, we reviewed the quarterly objectives and aligned on priorities for the next sprint cycle.`;

async function main() {
  let transcript = DEFAULT_TRANSCRIPT;

  if (process.argv[2]) {
    transcript = readFileSync(process.argv[2], "utf-8");
    console.log(`\n📄  Loaded transcript from: ${process.argv[2]}`);
  } else {
    console.log(`\n📄  Using built-in sample transcript`);
  }

  console.log(`\n🧠  Gemini Semantic Analysis Test`);
  console.log(`─────────────────────────────────`);
  console.log(`Transcript length: ${transcript.length} chars`);
  console.log(`\nAnalysing transcript with Gemini...`);

  try {
    const result = await analyseWithGemini(transcript);

    console.log(`\nMode: ${result.isMock ? "🔶 MOCK" : "🟢 LIVE"}`);
    console.log(`Concepts extracted: ${result.concepts.length}`);
    console.log(`\n── Concepts ────────────────────────────────────────`);

    // Display as a formatted table
    console.log(`${"  #".padEnd(5)} ${"Term".padEnd(30)} Prominence`);
    console.log(`${"─".repeat(5)} ${"─".repeat(30)} ${"─".repeat(10)}`);

    result.concepts.forEach((c, i) => {
      const bar = "█".repeat(c.prominence) + "░".repeat(10 - c.prominence);
      console.log(
        `  ${String(i + 1).padEnd(3)} ${c.term.padEnd(30)} ${c.prominence}/10  ${bar}`
      );
    });

    console.log(`────────────────────────────────────────────────────\n`);

    // Validate constraints
    let issues = 0;

    if (result.concepts.length < 5) {
      console.warn(`⚠️  Fewer than 5 concepts (got ${result.concepts.length})`);
      issues++;
    }
    if (result.concepts.length > 15) {
      console.warn(`⚠️  More than 15 concepts (got ${result.concepts.length})`);
      issues++;
    }

    const terms = result.concepts.map((c) => c.term.toLowerCase());
    const uniqueTerms = new Set(terms);
    if (uniqueTerms.size < terms.length) {
      console.warn(`⚠️  Duplicate terms detected`);
      issues++;
    }

    for (const c of result.concepts) {
      if (c.prominence < 1 || c.prominence > 10 || !Number.isInteger(c.prominence)) {
        console.warn(`⚠️  Invalid prominence for "${c.term}": ${c.prominence}`);
        issues++;
      }
    }

    if (issues === 0) {
      console.log(`✅  All validation checks passed`);
    } else {
      console.warn(`\n⚠️  ${issues} validation issue(s) found`);
    }

    // Save output
    const outputDir = join(__dirname, "..", "test-output");
    mkdirSync(outputDir, { recursive: true });

    const output = {
      meta: {
        provider: "gemini",
        mode: result.isMock ? "MOCK" : "LIVE",
        date: new Date().toISOString(),
        conceptCount: result.concepts.length,
      },
      concepts: result.concepts,
    };

    writeFileSync(
      join(outputDir, "concepts-gemini.json"),
      JSON.stringify(output, null, 2)
    );
    console.log(`\n💾  Saved to test-output/concepts-gemini.json`);
  } catch (error) {
    console.error(`\n❌  Analysis failed:`, error);
    process.exit(1);
  }
}

main();
