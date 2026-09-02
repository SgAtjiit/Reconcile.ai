import { randomUUID } from "crypto";
import { db } from "../../db/client.js";
import { sourcesSettlement, sourcesLedger, sourcesBank, matchResults } from "../../db/schema.js";
import { inMemoryBatchStore } from "../ingestService.js";
import { eq } from "drizzle-orm";
import { isUuid } from "../../utils/isUuid.js";

export async function runExactMatchPass(batchId, settlements, ledgers, banks) {
  // If arrays are not passed, fetch from DB or in-memory batch store
  if (!settlements || !ledgers || !banks) {
    if (isUuid(batchId)) {
      try {
        settlements = await db.select().from(sourcesSettlement).where(eq(sourcesSettlement.batchId, batchId));
        ledgers = await db.select().from(sourcesLedger).where(eq(sourcesLedger.batchId, batchId));
        banks = await db.select().from(sourcesBank).where(eq(sourcesBank.batchId, batchId));
      } catch (err) {
        settlements = [];
        ledgers = [];
        banks = [];
      }
    }

    // Fallback to in-memory store if DB query returned 0 rows
    if ((!settlements || settlements.length === 0) && inMemoryBatchStore.has(batchId)) {
      const stored = inMemoryBatchStore.get(batchId);
      settlements = stored.settlements || [];
      ledgers = stored.ledgers || [];
      banks = stored.banks || [];
    }
  }

  const matchedResults = [];
  const matchedSettlementIds = new Set();
  const matchedLedgerIds = new Set();
  const matchedBankIds = new Set();

  const bankByUtr = new Map(banks.map((b) => [b.utr, b]));
  const ledgerByPaymentId = new Map(ledgers.map((l) => [l.paymentId, l]));

  for (const st of settlements) {
    const bank = bankByUtr.get(st.utr);
    const ledger = ledgerByPaymentId.get(st.paymentId);

    if (bank && ledger) {
      const stAmount = parseFloat(st.settledAmount);
      const bankAmount = parseFloat(bank.amount);
      const ledgerAmount = parseFloat(ledger.amount);

      if (Math.abs(stAmount - bankAmount) < 0.01 && Math.abs(stAmount - ledgerAmount) < 0.01) {
        matchedSettlementIds.add(st.id);
        matchedLedgerIds.add(ledger.id);
        matchedBankIds.add(bank.id);

        matchedResults.push({
          id: randomUUID(),
          batchId,
          settlementId: st.id,
          ledgerId: ledger.id,
          bankId: bank.id,
          matchType: "exact",
          confidence: "1.00",
          exceptionCategory: null,
          explanation: "Exact 3-way match: UTR, Payment ID, and Amounts perfectly aligned.",
        });
      }
    }
  }

  if (matchedResults.length > 0) {
    if (inMemoryBatchStore.has(batchId)) {
      const stored = inMemoryBatchStore.get(batchId);
      stored.matchResults = [...(stored.matchResults || []), ...matchedResults];
    }
    if (isUuid(batchId)) {
      try {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < matchedResults.length; i += CHUNK_SIZE) {
          await db.insert(matchResults).values(matchedResults.slice(i, i + CHUNK_SIZE));
        }
      } catch (err) {
        console.warn(`[Pass 1 DB Warning] DB insert deferred (${err.message}). Results stored in memory.`);
      }
    }
  }

  return {
    matchedCount: matchedResults.length,
    matchedResults,
    remainingSettlements: settlements.filter((s) => !matchedSettlementIds.has(s.id)),
    remainingLedgers: ledgers.filter((l) => !matchedLedgerIds.has(l.id)),
    remainingBanks: banks.filter((b) => !matchedBankIds.has(b.id)),
  };
}
