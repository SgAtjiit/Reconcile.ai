import Papa from "papaparse";
import { db } from "../db/client.js";
import { sourcesSettlement, sourcesLedger, sourcesBank, matchBatches } from "../db/schema.js";
import { SettlementRowSchema, LedgerRowSchema, BankRowSchema } from "../utils/csvSchemas.js";
import { ApiError } from "../utils/ApiError.js";
import { eq } from "drizzle-orm";

export const inMemoryBatchStore = new Map();

function filterNonEmptyRows(data) {
  if (!Array.isArray(data)) return [];
  return data.filter((row) => {
    if (!row || typeof row !== "object") return false;
    return Object.values(row).some((val) => val !== null && val !== undefined && String(val).trim() !== "");
  });
}

export async function processAndIngestBatch(batchId, files) {
  // 1. Parse CSV buffers
  const settlementParsed = Papa.parse(files.settlement.buffer.toString("utf-8"), { header: true, dynamicTyping: true, skipEmptyLines: true });
  const ledgerParsed = Papa.parse(files.ledger.buffer.toString("utf-8"), { header: true, dynamicTyping: true, skipEmptyLines: true });
  const bankParsed = Papa.parse(files.bank.buffer.toString("utf-8"), { header: true, dynamicTyping: true, skipEmptyLines: true });

  const errors = [];

  const settlementRows = filterNonEmptyRows(settlementParsed.data);
  const ledgerRows = filterNonEmptyRows(ledgerParsed.data);
  const bankRows = filterNonEmptyRows(bankParsed.data);

  // 2. Validate Settlement Rows
  const validSettlements = settlementRows.map((row, idx) => {
    const res = SettlementRowSchema.safeParse(row);
    if (!res.success) {
      errors.push(`Settlement row ${idx + 1}: ${res.error.issues.map((i) => i.message).join(", ")}`);
      return null;
    }
    return {
      id: `st_${batchId}_${idx + 1}`,
      batchId,
      paymentId: String(res.data.payment_id),
      utr: String(res.data.utr),
      amount: String(res.data.amount),
      fee: String(res.data.fee),
      tds: String(res.data.tds),
      settledAmount: String(res.data.settled_amount),
      settlementDate: new Date(res.data.settlement_date),
      raw: row,
    };
  }).filter(Boolean);

  // 3. Validate Ledger Rows
  const validLedgers = ledgerRows.map((row, idx) => {
    const res = LedgerRowSchema.safeParse(row);
    if (!res.success) {
      errors.push(`Ledger row ${idx + 1}: ${res.error.issues.map((i) => i.message).join(", ")}`);
      return null;
    }
    return {
      id: `lg_${batchId}_${idx + 1}`,
      batchId,
      orderId: String(res.data.order_id),
      paymentId: String(res.data.payment_id),
      amount: String(res.data.amount),
      orderDate: new Date(res.data.order_date),
      customerRef: res.data.customer_ref ? String(res.data.customer_ref) : null,
      raw: row,
    };
  }).filter(Boolean);

  // 4. Validate Bank Rows
  const validBanks = bankRows.map((row, idx) => {
    const res = BankRowSchema.safeParse(row);
    if (!res.success) {
      errors.push(`Bank row ${idx + 1}: ${res.error.issues.map((i) => i.message).join(", ")}`);
      return null;
    }
    return {
      id: `bk_${batchId}_${idx + 1}`,
      batchId,
      utr: String(res.data.utr),
      amount: String(res.data.amount),
      txnDate: new Date(res.data.txn_date),
      narration: res.data.narration ? String(res.data.narration) : null,
      raw: row,
    };
  }).filter(Boolean);

  // Fail atomic batch if validation errors exist
  if (errors.length > 0) {
    throw new ApiError(400, `Batch validation failed with ${errors.length} errors`, errors.slice(0, 10));
  }

  const totalCount = validSettlements.length + validLedgers.length + validBanks.length;

  // Save to in-memory store for instant fallback access
  inMemoryBatchStore.set(batchId, {
    settlements: validSettlements,
    ledgers: validLedgers,
    banks: validBanks,
    totalRecords: totalCount,
  });

  // Try bulk insert into DB if available
  try {
    await db.transaction(async (tx) => {
      if (validSettlements.length > 0) await tx.insert(sourcesSettlement).values(validSettlements);
      if (validLedgers.length > 0) await tx.insert(sourcesLedger).values(validLedgers);
      if (validBanks.length > 0) await tx.insert(sourcesBank).values(validBanks);

      await tx.update(matchBatches).set({ totalRecords: totalCount, status: "uploaded" }).where(eq(matchBatches.id, batchId));
    });
  } catch (dbErr) {
    // In-memory fallback active
  }

  return {
    totalSettlement: validSettlements.length,
    totalLedger: validLedgers.length,
    totalBank: validBanks.length,
    totalRecords: totalCount,
    validSettlements,
    validLedgers,
    validBanks,
  };
}
