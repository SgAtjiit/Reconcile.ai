import { db } from "../db/client.js";
import { matchResults, sourcesSettlement, sourcesLedger, sourcesBank } from "../db/schema.js";
import { inMemoryBatchStore } from "../services/ingestService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { eq, and, count, inArray } from "drizzle-orm";

export const getMatchResults = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { matchType, page = "1", limit = "1000" } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  let results = [];
  let total = 0;

  try {
    let whereClause = eq(matchResults.batchId, id);
    if (matchType && matchType !== "all") {
      if (matchType === "adjusted") {
        whereClause = and(whereClause, inArray(matchResults.matchType, ["fee_adjusted", "timing_lag", "fuzzy_llm"]));
      } else {
        whereClause = and(whereClause, eq(matchResults.matchType, matchType));
      }
    }

    const [{ countVal }] = await db
      .select({ countVal: count(matchResults.id) })
      .from(matchResults)
      .where(whereClause);

    total = Number(countVal || 0);

    if (limitNum === 0) {
      results = await db.select().from(matchResults).where(whereClause);
    } else {
      results = await db.select().from(matchResults)
        .where(whereClause)
        .limit(limitNum)
        .offset(offset);
    }
  } catch (err) {}

  if ((!results || results.length === 0) && inMemoryBatchStore.has(id)) {
    const stored = inMemoryBatchStore.get(id);
    let allResults = stored.matchResults || [];
    if (matchType && matchType !== "all") {
      if (matchType === "adjusted") {
        allResults = allResults.filter((r) => ["fee_adjusted", "timing_lag", "fuzzy_llm"].includes(r.matchType));
      } else {
        allResults = allResults.filter((r) => r.matchType === matchType);
      }
    }
    total = allResults.length;
    results = limitNum === 0 ? allResults : allResults.slice(offset, offset + limitNum);
  }

  const totalPages = limitNum > 0 ? Math.ceil(total / limitNum) : 1;

  return res.status(200).json(new ApiResponse(200, {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
    results,
  }, "Match results fetched successfully"));
});

export const getExceptions = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let exceptions = [];
  try {
    exceptions = await db.select().from(matchResults)
      .where(and(eq(matchResults.batchId, id), eq(matchResults.matchType, "unresolved")));
  } catch (err) {}

  if ((!exceptions || exceptions.length === 0) && inMemoryBatchStore.has(id)) {
    const stored = inMemoryBatchStore.get(id);
    exceptions = (stored.matchResults || []).filter((r) => r.matchType === "unresolved");
  }

  return res.status(200).json(new ApiResponse(200, exceptions, "Unresolved exceptions fetched successfully"));
});

export const getResultById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let result = null;
  try {
    [result] = await db.select().from(matchResults).where(eq(matchResults.id, id));
  } catch (err) {}

  if (!result) {
    for (const stored of inMemoryBatchStore.values()) {
      const found = (stored.matchResults || []).find((r) => r.id === id);
      if (found) {
        result = found;
        break;
      }
    }
  }

  if (!result) throw new ApiError(404, "Match result record not found");

  let settlement = null, ledger = null, bank = null;

  if (result.settlementId) {
    try {
      [settlement] = await db.select().from(sourcesSettlement).where(eq(sourcesSettlement.id, result.settlementId));
    } catch (err) {}
    if (!settlement && inMemoryBatchStore.has(result.batchId)) {
      settlement = (inMemoryBatchStore.get(result.batchId).settlements || []).find((s) => s.id === result.settlementId) || null;
    }
  }

  if (result.ledgerId) {
    try {
      [ledger] = await db.select().from(sourcesLedger).where(eq(sourcesLedger.id, result.ledgerId));
    } catch (err) {}
    if (!ledger && inMemoryBatchStore.has(result.batchId)) {
      ledger = (inMemoryBatchStore.get(result.batchId).ledgers || []).find((l) => l.id === result.ledgerId) || null;
    }
  }

  if (result.bankId) {
    try {
      [bank] = await db.select().from(sourcesBank).where(eq(sourcesBank.id, result.bankId));
    } catch (err) {}
    if (!bank && inMemoryBatchStore.has(result.batchId)) {
      bank = (inMemoryBatchStore.get(result.batchId).banks || []).find((b) => b.id === result.bankId) || null;
    }
  }

  return res.status(200).json(new ApiResponse(200, {
    ...result,
    sources: { settlement, ledger, bank },
  }, "Result details fetched successfully"));
});
