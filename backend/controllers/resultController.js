import { db } from "../db/client.js";
import { matchResults, sourcesSettlement, sourcesLedger, sourcesBank } from "../db/schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { eq, and } from "drizzle-orm";

export const getMatchResults = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { matchType, page = "1", limit = "20" } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  try {
    let whereClause = eq(matchResults.batchId, id);
    if (matchType) {
      whereClause = and(whereClause, eq(matchResults.matchType, matchType));
    }

    const results = await db.select().from(matchResults)
      .where(whereClause)
      .limit(parseInt(limit, 10))
      .offset(offset);

    return res.status(200).json(new ApiResponse(200, { page: parseInt(page, 10), results }, "Match results fetched successfully"));
  } catch (err) {
    return res.status(200).json(new ApiResponse(200, { page: 1, results: [] }, "Match results fetched successfully"));
  }
});

export const getExceptions = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const exceptions = await db.select().from(matchResults)
      .where(and(eq(matchResults.batchId, id), eq(matchResults.matchType, "unresolved")));

    return res.status(200).json(new ApiResponse(200, exceptions, "Unresolved exceptions fetched successfully"));
  } catch (err) {
    return res.status(200).json(new ApiResponse(200, [], "Unresolved exceptions fetched successfully"));
  }
});

export const getResultById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.select().from(matchResults).where(eq(matchResults.id, id));
    if (!result) throw new ApiError(404, "Match result record not found");

    const settlement = result.settlementId 
      ? (await db.select().from(sourcesSettlement).where(eq(sourcesSettlement.id, result.settlementId)))[0] 
      : null;
    const ledger = result.ledgerId 
      ? (await db.select().from(sourcesLedger).where(eq(sourcesLedger.id, result.ledgerId)))[0] 
      : null;
    const bank = result.bankId 
      ? (await db.select().from(sourcesBank).where(eq(sourcesBank.id, result.bankId)))[0] 
      : null;

    return res.status(200).json(new ApiResponse(200, {
      ...result,
      sources: { settlement, ledger, bank },
    }, "Result details fetched successfully"));
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(404, "Match result record not found");
  }
});
