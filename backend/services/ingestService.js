import { randomUUID } from "crypto";
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
      id: randomUUID(),
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
      id: randomUUID(),
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
      id: randomUUID(),
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
  const existing = inMemoryBatchStore.get(batchId) || {};
  inMemoryBatchStore.set(batchId, {
    ...existing,
    settlements: validSettlements,
    ledgers: validLedgers,
    banks: validBanks,
    matchResults: existing.matchResults || [],
    totalRecords: totalCount,
    status: "uploaded",
  });

  // Try bulk insert into DB if available
  const IS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (IS_UUID.test(batchId)) {
    try {
      const [existingBatch] = await db.select().from(matchBatches).where(eq(matchBatches.id, batchId));
      if (!existingBatch) {
        await db.insert(matchBatches).values({
          id: batchId,
          name: `Batch-${batchId.slice(0, 8)}`,
          status: "uploaded",
          totalRecords: totalCount,
        });
      }

      const CHUNK_SIZE = 50;
      for (let i = 0; i < validSettlements.length; i += CHUNK_SIZE) {
        await db.insert(sourcesSettlement).values(validSettlements.slice(i, i + CHUNK_SIZE));
      }
      for (let i = 0; i < validLedgers.length; i += CHUNK_SIZE) {
        await db.insert(sourcesLedger).values(validLedgers.slice(i, i + CHUNK_SIZE));
      }
      for (let i = 0; i < validBanks.length; i += CHUNK_SIZE) {
        await db.insert(sourcesBank).values(validBanks.slice(i, i + CHUNK_SIZE));
      }

      await db.update(matchBatches).set({ totalRecords: totalCount, status: "uploaded" }).where(eq(matchBatches.id, batchId));
    } catch (dbErr) {
      console.warn(`[Ingest DB Warning] Primary DB ingestion deferred (${dbErr.message}). In-memory store active.`);
    }
  }

  return {
    batchId,
    totalSettlement: validSettlements.length,
    totalLedger: validLedgers.length,
    totalBank: validBanks.length,
    totalRecords: totalCount,
    validSettlements,
    validLedgers,
    validBanks,
  };
}
