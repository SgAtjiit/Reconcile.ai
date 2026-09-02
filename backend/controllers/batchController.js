import { randomUUID } from "crypto";
import multer from "multer";
import { db } from "../db/client.js";
import { matchBatches, matchResults } from "../db/schema.js";
import { processAndIngestBatch, inMemoryBatchStore } from "../services/ingestService.js";
import { runFullMatcherPipeline } from "../services/matcher/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { eq, count, avg } from "drizzle-orm";

export const uploadMiddleware = multer({ storage: multer.memoryStorage() }).fields([
  { name: "settlement", maxCount: 1 },
  { name: "ledger", maxCount: 1 },
  { name: "bank", maxCount: 1 },
]);

export const createBatch = asyncHandler(async (req, res) => {
  const { name } = req.body;
  
  try {
    const [batch] = await db.insert(matchBatches).values({ name: name || `Batch-${Date.now()}` }).returning();
    return res.status(201).json(new ApiResponse(201, batch, "Batch created successfully"));
  } catch (err) {
    const fallbackBatch = { id: randomUUID(), name: name || `Batch-${Date.now()}`, status: "created", uploadedAt: new Date() };
    inMemoryBatchStore.set(fallbackBatch.id, {
      settlements: [],
      ledgers: [],
      banks: [],
      matchResults: [],
      totalRecords: 0,
      status: "created",
    });
    return res.status(201).json(new ApiResponse(201, fallbackBatch, "Batch created successfully (in-memory mode)"));
  }
});

export const uploadBatchFiles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const files = req.files;

  if (!files?.settlement?.[0] || !files?.ledger?.[0] || !files?.bank?.[0]) {
    throw new ApiError(400, "Requires 3 files: settlement, ledger, bank");
  }

  const summary = await processAndIngestBatch(id, {
    settlement: files.settlement[0],
    ledger: files.ledger[0],
    bank: files.bank[0],
  });

  const responseSummary = {
    batchId: id,
    totalSettlement: summary.totalSettlement,
    totalLedger: summary.totalLedger,
    totalBank: summary.totalBank,
    totalRecords: summary.totalRecords,
  };

  return res.status(200).json(new ApiResponse(200, responseSummary, "CSVs parsed and ingested successfully"));
});

export const triggerMatching = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const results = await runFullMatcherPipeline(id, req.body || {});
  return res.status(200).json(new ApiResponse(200, results, "Matching pipeline completed successfully"));
});

export const getBatchSummary = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let batchStatus = null;
  let totalRecords = 0;

  try {
    const [b] = await db.select().from(matchBatches).where(eq(matchBatches.id, id));
    if (b) {
      batchStatus = b.status;
      totalRecords = b.totalRecords;
    }
  } catch (err) {}

  if (!batchStatus && inMemoryBatchStore.has(id)) {
    const stored = inMemoryBatchStore.get(id);
    batchStatus = stored.status || "completed";
    totalRecords = stored.totalRecords || 0;
  }

  if (batchStatus === "matching") {
    return res.status(200).json(new ApiResponse(200, {
      status: "matching",
      summary: {},
      totalIngested: totalRecords,
    }, "Matching pipeline in progress"));
  }

  // Single Canonical Grouping Aggregation Query
  let stats = [];
  try {
    stats = await db
      .select({
        matchType: matchResults.matchType,
        entryCount: count(matchResults.id),
        avgConfidence: avg(matchResults.confidence),
      })
      .from(matchResults)
      .where(eq(matchResults.batchId, id))
      .groupBy(matchResults.matchType);
  } catch (err) {}

  if ((!stats || stats.length === 0) && inMemoryBatchStore.has(id)) {
    const stored = inMemoryBatchStore.get(id);
    const results = stored.matchResults || [];
    const grouped = {};

    results.forEach((r) => {
      if (!grouped[r.matchType]) {
        grouped[r.matchType] = { entryCount: 0, totalConf: 0 };
      }
      grouped[r.matchType].entryCount += 1;
      grouped[r.matchType].totalConf += parseFloat(r.confidence || 0);
    });

    stats = Object.entries(grouped).map(([matchType, v]) => ({
      matchType,
      entryCount: v.entryCount,
      avgConfidence: (v.totalConf / v.entryCount).toString(),
    }));
  }

  // Canonical Calculation across all 4 passes
  let totalMatchEntries = 0;
  let totalReconciledRecords = 0;
  let totalUnresolvedRecords = 0;
  let totalMatchedConfSum = 0;
  let totalMatchedEntriesForConf = 0;

  const breakdown = {
    exact: { matchEntries: 0, recordCount: 0, count: 0, avgConfidence: "0.00" },
    fee_adjusted: { matchEntries: 0, recordCount: 0, count: 0, avgConfidence: "0.00" },
    timing_lag: { matchEntries: 0, recordCount: 0, count: 0, avgConfidence: "0.00" },
    fuzzy_llm: { matchEntries: 0, recordCount: 0, count: 0, avgConfidence: "0.00" },
    unresolved: { matchEntries: 0, recordCount: 0, count: 0, avgConfidence: "0.00" },
  };

  stats.forEach((row) => {
    const mt = row.matchType;
    const entries = Number(row.entryCount || 0);
    const conf = parseFloat(row.avgConfidence || "0");
    const is3Way = ["exact", "fee_adjusted", "timing_lag", "fuzzy_llm"].includes(mt);
    const recs = is3Way ? entries * 3 : entries * 1;

    totalMatchEntries += entries;
    if (is3Way) {
      totalReconciledRecords += recs;
      totalMatchedConfSum += conf * entries;
      totalMatchedEntriesForConf += entries;
    } else {
      totalUnresolvedRecords += recs;
    }

    breakdown[mt] = {
      matchEntries: entries,
      recordCount: recs,
      count: recs, // Alias for backward compatibility
      avgConfidence: conf.toFixed(2),
    };
  });

  const computedTotalIngested = totalReconciledRecords + totalUnresolvedRecords;
  const finalIngested = totalRecords > 0 ? Math.max(totalRecords, computedTotalIngested) : computedTotalIngested;
  const overallMatchRate = finalIngested > 0 ? parseFloat(((totalReconciledRecords / finalIngested) * 100).toFixed(1)) : 0;
  const overallAvgConfidence = totalMatchedEntriesForConf > 0 ? parseFloat((totalMatchedConfSum / totalMatchedEntriesForConf).toFixed(2)) : 0;

  return res.status(200).json(new ApiResponse(200, {
    status: batchStatus || "completed",
    totalIngested: finalIngested,
    totalReconciled: totalReconciledRecords,
    unresolvedCount: totalUnresolvedRecords,
    totalMatchEntries,
    overallMatchRate,
    overallAvgConfidence,
    breakdown,
    summary: breakdown,
    exact: breakdown.exact,
    fee_adjusted: breakdown.fee_adjusted,
    timing_lag: breakdown.timing_lag,
    fuzzy_llm: breakdown.fuzzy_llm,
    unresolved: breakdown.unresolved,
  }, "Batch summary fetched successfully"));
});

export const rematchBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { feeTolerance, timingLagDays, confidenceThreshold, model } = req.body;

  try {
    await db.delete(matchResults).where(eq(matchResults.batchId, id));
  } catch (err) {}

  if (inMemoryBatchStore.has(id)) {
    const stored = inMemoryBatchStore.get(id);
    stored.matchResults = [];
  }

  const reMatchedResults = await runFullMatcherPipeline(id, {
    feeTolerance: feeTolerance ? parseFloat(feeTolerance) : 0.50,
    timingLagDays: timingLagDays ? parseInt(timingLagDays, 10) : 3,
    confidenceThreshold: confidenceThreshold ? parseFloat(confidenceThreshold) : 0.60,
    model,
    timeoutMs: req.body.timeoutMs !== undefined ? req.body.timeoutMs : undefined,
  });

  return res.status(200).json(new ApiResponse(200, reMatchedResults, "What-If Rematch executed successfully"));
});
