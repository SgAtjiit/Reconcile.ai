import { randomUUID } from "crypto";
import { db } from "../../db/client.js";
import { matchResults } from "../../db/schema.js";
import { inMemoryBatchStore } from "../ingestService.js";
import { isUuid } from "../../utils/isUuid.js";

const DEFAULT_EPSILON = 0.50; // Floating point rounding tolerance (₹0.50)

export async function runRuleMatchPass(
  batchId,
  remainingSettlements,
  remainingLedgers,
  remainingBanks,
  options = {}
) {
  const epsilon = options.feeTolerance !== undefined ? options.feeTolerance : DEFAULT_EPSILON;
  const maxLagDays = options.timingLagDays !== undefined ? options.timingLagDays : 3;

  const matchedResults = [];
  const matchedSettlementIds = new Set();
  const matchedBankIds = new Set();
  const matchedLedgerIds = new Set();

  const bankByUtr = new Map(remainingBanks.map((b) => [b.utr, b]));
  const ledgerByPaymentId = new Map(remainingLedgers.map((l) => [l.paymentId, l]));

  for (const st of remainingSettlements) {
    const bank = bankByUtr.get(st.utr);
    const ledger = ledgerByPaymentId.get(st.paymentId);

    if (!bank) continue;

    const grossAmount = parseFloat(st.amount);
    const fee = parseFloat(st.fee || 0);
    const tds = parseFloat(st.tds || 0);
    const expectedNetSettlement = grossAmount - fee - tds;
    const actualBankCredit = parseFloat(bank.amount);

    // Rule 2A: Fee & TDS Adjustment Match
    if ((fee > 0 || tds > 0) && Math.abs(actualBankCredit - expectedNetSettlement) <= epsilon) {
      matchedSettlementIds.add(st.id);
      matchedBankIds.add(bank.id);
      if (ledger) matchedLedgerIds.add(ledger.id);

      matchedResults.push({
        id: randomUUID(),
        batchId,
        settlementId: st.id,
        ledgerId: ledger ? ledger.id : null,
        bankId: bank.id,
        matchType: "fee_adjusted",
        confidence: "0.95",
        exceptionCategory: "fee_deduction",
        explanation: `Fee/TDS deduction matched: Gross ₹${grossAmount} minus MDR Fee ₹${fee} & TDS ₹${tds} equals Bank credit ₹${actualBankCredit}.`,
      });
      continue;
    }

    // Rule 2B: Timing Lag Adjustment Match (1 to maxLagDays delay)
    if (Math.abs(actualBankCredit - parseFloat(st.settledAmount)) <= epsilon) {
      const stDate = new Date(st.settlementDate).getTime();
      const bankDate = new Date(bank.txnDate).getTime();
      const dayDiff = Math.abs(bankDate - stDate) / (1000 * 3600 * 24);

      if (dayDiff >= 0.5 && dayDiff <= (maxLagDays + 0.5)) {
        matchedSettlementIds.add(st.id);
        matchedBankIds.add(bank.id);
        if (ledger) matchedLedgerIds.add(ledger.id);

        matchedResults.push({
          id: randomUUID(),
          batchId,
          settlementId: st.id,
          ledgerId: ledger ? ledger.id : null,
          bankId: bank.id,
          matchType: "timing_lag",
          confidence: "0.90",
          exceptionCategory: "timing_lag",
          explanation: `Timing lag match: Settled amount ₹${actualBankCredit} matched with ${Math.round(dayDiff)}-day bank credit delay.`,
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
        console.warn(`[Pass 2 DB Warning] DB insert deferred (${err.message}). Results stored in memory.`);
      }
    }
  }

  return {
    matchedCount: matchedResults.length,
    matchedResults,
    unmatchedSettlements: remainingSettlements.filter((s) => !matchedSettlementIds.has(s.id)),
    unmatchedLedgers: remainingLedgers.filter((l) => !matchedLedgerIds.has(l.id)),
    unmatchedBanks: remainingBanks.filter((b) => !matchedBankIds.has(b.id)),
  };
}
