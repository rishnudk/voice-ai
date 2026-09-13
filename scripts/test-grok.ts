/**
 * Test script for xAI Grok semantic analysis service.
 *
 * Usage:
 *   npx tsx scripts/test-grok.ts [transcript-file-path]
 *
 * Defaults to a built-in sample transcript if no file is provided.
 * Results are saved to test-output/concepts.json.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { analyseTranscript } from "../src/services/analysis/xai-grok";

// ── Default transcript for standalone testing ────────────────────────

const DEFAULT_TRANSCRIPT = `Today we discussed the importance of effective communication in team settings. 
Clear communication helps reduce misunderstandings and improves collaboration across departments. 
We also explored strategies for active listening, which includes maintaining eye contact, 
asking clarifying questions, and summarizing key points. Leadership emphasized the need for 
regular feedback loops and transparent decision-making processes. The team agreed that 
establishing shared goals and accountability structures would significantly improve project outcomes. 
Finally, we reviewed the quarterly objectives and aligned on priorities for the next sprint cycle.`;

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  let transcript = DEFAULT_TRANSCRIPT;

  if (process.argv[2]) {
    transcript = readFileSync(process.argv[2], "utf-8");
    console.log(`\n📄  Loaded transcript from: ${process.argv[2]}`);
  } else {
    console.log(`\n📄  Using built-in sample transcript`);
  }

  console.log(`\n🧠  Grok Semantic Analysis Test`);
  console.log(`───────────────────────────────`);
  console.log(`Transcript length: ${transcript.length} chars`);
  console.log(`\nAnalysing transcript...`);

  try {
    const result = await analyseTranscript(transcript);

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
        mode: result.isMock ? "MOCK" : "LIVE",
        date: new Date().toISOString(),
        conceptCount: result.concepts.length,
      },
      concepts: result.concepts,
    };

    writeFileSync(
      join(outputDir, "concepts.json"),
      JSON.stringify(output, null, 2)
    );
    console.log(`\n💾  Saved to test-output/concepts.json`);
  } catch (error) {
    console.error(`\n❌  Analysis failed:`, error);
    process.exit(1);
  }
}

main();
