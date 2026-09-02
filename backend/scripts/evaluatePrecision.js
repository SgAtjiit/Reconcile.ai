import { db } from "../db/client.js";
import { matchResults } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function evaluateBatchAccuracy(batchId) {
  let results = [];
  try {
    results = await db.select().from(matchResults).where(eq(matchResults.batchId, batchId));
  } catch (err) {
    console.warn(`[Evaluation Notice] Database offline or unpopulated: ${err.message}`);
    return null;
  }

  let exactMatches = 0;
  let feeAdjusted = 0;
  let timingLag = 0;
  let fuzzyLlm = 0;
  let unresolved = 0;

  for (const r of results) {
    if (r.matchType === "exact") exactMatches++;
    else if (r.matchType === "fee_adjusted") feeAdjusted++;
    else if (r.matchType === "timing_lag") timingLag++;
    else if (r.matchType === "fuzzy_llm") fuzzyLlm++;
    else if (r.matchType === "unresolved") unresolved++;
  }

  const total = results.length;
  if (total === 0) {
    console.log(`[Evaluation Notice] No match results found for batch: ${batchId}`);
    return { total: 0, exactMatches: 0, feeAdjusted: 0, timingLag: 0, fuzzyLlm: 0, unresolved: 0, deterministicYield: 0 };
  }

  const deterministicYield = ((exactMatches + feeAdjusted + timingLag) / total) * 100;

  console.log("=== Matcher Precision Evaluation Report ===");
  console.log(`Batch ID:               ${batchId}`);
  console.log(`Total Processed Records: ${total}`);
  console.log(`Exact Matches (Pass 1):  ${exactMatches} (${((exactMatches / total) * 100).toFixed(1)}%)`);
  console.log(`Fee Adjusted (Pass 2A):  ${feeAdjusted} (${((feeAdjusted / total) * 100).toFixed(1)}%)`);
  console.log(`Timing Lag (Pass 2B):    ${timingLag} (${((timingLag / total) * 100).toFixed(1)}%)`);
  console.log(`LLM Fuzzy (Pass 3):      ${fuzzyLlm} (${((fuzzyLlm / total) * 100).toFixed(1)}%)`);
  console.log(`Unresolved (Pass 4):     ${unresolved} (${((unresolved / total) * 100).toFixed(1)}%)`);
  console.log(`Deterministic Coverage:  ${deterministicYield.toFixed(2)}%`);
  console.log("==========================================");

  return { total, exactMatches, feeAdjusted, timingLag, fuzzyLlm, unresolved, deterministicYield };
}

// Allow direct CLI execution: node scripts/evaluatePrecision.js <BATCH_ID>
if (process.argv[2]) {
  evaluateBatchAccuracy(process.argv[2]).then(() => process.exit(0));
}
