import { runExactMatchPass } from "./exactMatch.js";
import { runRuleMatchPass } from "./ruleMatch.js";
import { runLlmMatchPass } from "./llmMatch.js";
import { runUnresolvedPass } from "./unresolved.js";
import { db } from "../../db/client.js";
import { matchBatches } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export async function runFullMatcherPipeline(batchId, options = {}) {
  // Update batch status to matching
  try {
    await db.update(matchBatches).set({ status: "matching" }).where(eq(matchBatches.id, batchId));
  } catch (err) {}

  // 1. Pass 1 — Exact Match (Pure code, zero LLM)
  const pass1 = await runExactMatchPass(batchId);

  // 2. Pass 2 — Rule-Based Adjustment Match (Fee/TDS & Timing Lag)
  const pass2 = await runRuleMatchPass(
    batchId,
    pass1.remainingSettlements,
    pass1.remainingLedgers,
    pass1.remainingBanks,
    options
  );

  // 3. Pass 3 — OpenRouter LLM Residual Matcher
  const pass3 = await runLlmMatchPass(
    batchId,
    pass2.unmatchedSettlements,
    pass2.unmatchedLedgers,
    pass2.unmatchedBanks,
    options
  );

  // 4. Pass 4 — Unresolved Record Sweeper
  const pass4 = await runUnresolvedPass(
    batchId,
    pass3.remainingSettlements,
    pass3.remainingLedgers,
    pass3.remainingBanks
  );

  // Update batch status to completed
  try {
    await db.update(matchBatches).set({ status: "completed" }).where(eq(matchBatches.id, batchId));
  } catch (err) {}

  return {
    batchId,
    pass1ExactCount: pass1.matchedCount,
    pass2RuleCount: pass2.matchedCount,
    pass3LlmCount: pass3.matchedCount,
    pass4UnresolvedCount: pass4.unresolvedCount,
    totalResultsProcessed: pass1.matchedCount + pass2.matchedCount + pass3.matchedCount + pass4.unresolvedCount,
  };
}
