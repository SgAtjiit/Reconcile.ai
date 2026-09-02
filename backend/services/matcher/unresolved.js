import { randomUUID } from "crypto";
import { db } from "../../db/client.js";
import { matchResults } from "../../db/schema.js";
import { inMemoryBatchStore } from "../ingestService.js";
import { isUuid } from "../../utils/isUuid.js";

export async function runUnresolvedPass(
  batchId,
  orphanedSettlements = [],
  orphanedLedgers = [],
  orphanedBanks = []
) {
  const unresolvedRecords = [];

  for (const s of orphanedSettlements) {
    unresolvedRecords.push({
      id: randomUUID(),
      batchId,
      settlementId: s.id,
      ledgerId: null,
      bankId: null,
      matchType: "unresolved",
      confidence: "0.00",
      exceptionCategory: "no_counterpart",
      explanation: "Unresolved: Settlement gateway record has no counterpart in Ledger or Bank statement.",
    });
  }

  for (const l of orphanedLedgers) {
    unresolvedRecords.push({
      id: randomUUID(),
      batchId,
      settlementId: null,
      ledgerId: l.id,
      bankId: null,
      matchType: "unresolved",
      confidence: "0.00",
      exceptionCategory: "no_counterpart",
      explanation: "Unresolved: ERP Ledger order record has no settlement payment or bank credit counterpart.",
    });
  }

  for (const b of orphanedBanks) {
    unresolvedRecords.push({
      id: randomUUID(),
      batchId,
      settlementId: null,
      ledgerId: null,
      bankId: b.id,
      matchType: "unresolved",
      confidence: "0.00",
      exceptionCategory: "no_counterpart",
      explanation: "Unresolved: Bank statement credit has no matching settlement or ERP ledger order.",
    });
  }

  if (unresolvedRecords.length > 0) {
    if (inMemoryBatchStore.has(batchId)) {
      const stored = inMemoryBatchStore.get(batchId);
      stored.matchResults = [...(stored.matchResults || []), ...unresolvedRecords];
    }
    if (isUuid(batchId)) {
      try {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < unresolvedRecords.length; i += CHUNK_SIZE) {
          await db.insert(matchResults).values(unresolvedRecords.slice(i, i + CHUNK_SIZE));
        }
      } catch (err) {
        console.warn(`[Pass 4 DB Warning] DB insert deferred (${err.message}). Results stored in memory.`);
      }
    }
  }

  return {
    unresolvedCount: unresolvedRecords.length,
    unresolvedRecords,
  };
}
