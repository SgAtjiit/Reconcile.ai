import { randomUUID } from "crypto";
import { db } from "../../db/client.js";
import { matchResults } from "../../db/schema.js";
import { getOpenRouterClient, getLlmConfig } from "../../utils/openrouterClient.js";
import { inMemoryBatchStore } from "../ingestService.js";
import { isUuid } from "../../utils/isUuid.js";

export async function runLlmMatchPass(
  batchId,
  unmatchedSettlements = [],
  unmatchedLedgers = [],
  unmatchedBanks = [],
  runtimeOverrides = {}
) {
  if (!unmatchedSettlements || unmatchedSettlements.length === 0) {
    return { matchedCount: 0, matchedResults: [], remainingSettlements: [], remainingLedgers: unmatchedLedgers, remainingBanks: unmatchedBanks };
  }

  const defaultConfig = getLlmConfig();
  const model = runtimeOverrides.model || defaultConfig.model;
  const threshold = runtimeOverrides.confidenceThreshold !== undefined ? runtimeOverrides.confidenceThreshold : defaultConfig.confidenceThreshold;
  const chunkSize = runtimeOverrides.batchSize !== undefined ? runtimeOverrides.batchSize : defaultConfig.batchSize;
  const timeoutMs = runtimeOverrides.timeoutMs !== undefined ? runtimeOverrides.timeoutMs : defaultConfig.timeoutMs;

  const matchedResults = [];
  const processedSettlementIds = new Set();
  const openai = getOpenRouterClient();

  for (let i = 0; i < unmatchedSettlements.length; i += chunkSize) {
    const chunkSettlements = unmatchedSettlements.slice(i, i + chunkSize);

    const promptPayload = {
      settlements: chunkSettlements.map((s) => ({
        id: s.id,
        payment_id: s.paymentId,
        utr: s.utr,
        amount: s.amount,
        fee: s.fee,
        tds: s.tds,
        settled_amount: s.settledAmount,
        settlement_date: s.settlementDate,
      })),
      available_ledgers: unmatchedLedgers.map((l) => ({
        id: l.id,
        order_id: l.orderId,
        payment_id: l.paymentId,
        amount: l.amount,
        order_date: l.orderDate,
      })),
      available_banks: unmatchedBanks.map((b) => ({
        id: b.id,
        utr: b.utr,
        amount: b.amount,
        txn_date: b.txnDate,
        narration: b.narration,
      })),
    };

    const candidateModels = Array.from(new Set([
      model,
      "google/gemini-2.5-flash",
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen-2.5-coder-32b-instruct:free",
      "deepseek/deepseek-r1:free",
    ]));

    let response = null;
    let successfulModel = model;
    let lastErr = null;

    for (const targetModel of candidateModels) {
      try {
        response = await openai.chat.completions.create({
          model: targetModel,
          messages: [
            {
              role: "system",
              content: `You are an expert financial reconciliation agent. Analyze the residual unmatched records across Settlement, Ledger, and Bank streams.
Identify potential matching pairs or triplets (e.g. partial refunds, split settlements, fuzzy UTR typos).
Return ONLY a valid JSON object matching this schema:
{
  "matches": [
    {
      "settlement_id": "string",
      "ledger_id": "string | null",
      "bank_id": "string | null",
      "category": "partial_refund | fee_deduction | timing_lag | duplicate | no_counterpart",
      "confidence": number (0.0 to 1.0),
      "explanation": "string explaining reasoning"
    }
  ]
}`,
            },
            { role: "user", content: JSON.stringify(promptPayload) },
          ],
          response_format: { type: "json_object" },
        }, { timeout: timeoutMs });

        successfulModel = targetModel;
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (response) {
      const rawContent = response.choices[0]?.message?.content || "{}";
      const cleanContent = rawContent.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleanContent);
      const llmMatches = parsed.matches || [];

      for (const m of llmMatches) {
        if (!m.settlement_id) continue;
        const conf = parseFloat(m.confidence || 0);
        processedSettlementIds.add(m.settlement_id);

        if (conf >= threshold) {
          matchedResults.push({
            id: randomUUID(),
            batchId,
            settlementId: m.settlement_id,
            ledgerId: m.ledger_id || null,
            bankId: m.bank_id || null,
            matchType: "fuzzy_llm",
            confidence: conf.toFixed(2),
            exceptionCategory: m.category || "partial_refund",
            explanation: `[OpenRouter LLM: ${successfulModel}] ${m.explanation}`,
          });
        } else {
          matchedResults.push({
            id: randomUUID(),
            batchId,
            settlementId: m.settlement_id,
            ledgerId: m.ledger_id || null,
            bankId: m.bank_id || null,
            matchType: "unresolved",
            confidence: conf.toFixed(2),
            exceptionCategory: "no_counterpart",
            explanation: `Unresolved: LLM confidence below threshold (${conf.toFixed(2)} < ${threshold.toFixed(2)}). ${m.explanation}`,
          });
        }
      }
    } else {
      console.warn(`[OpenRouter LLM Fallback] API call deferred/failed (${lastErr?.message || "Unknown error"}). Marking residual chunk as unresolved.`);
      
      // Fallback: Degrade gracefully to Pass 4 Unresolved if LLM fails or times out
      for (const s of chunkSettlements) {
        processedSettlementIds.add(s.id);
        matchedResults.push({
          id: randomUUID(),
          batchId,
          settlementId: s.id,
          ledgerId: null,
          bankId: null,
          matchType: "unresolved",
          confidence: "0.00",
          exceptionCategory: "no_counterpart",
          explanation: `Unresolved: OpenRouter call fallback (${lastErr?.message || "Timeout"}). Record preserved for manual review.`,
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
        console.warn(`[Pass 3 DB Warning] DB insert deferred (${err.message}). Results stored in memory.`);
      }
    }
  }

  return {
    matchedCount: matchedResults.length,
    matchedResults,
    remainingSettlements: unmatchedSettlements.filter((s) => !processedSettlementIds.has(s.id)),
    remainingLedgers: unmatchedLedgers,
    remainingBanks: unmatchedBanks,
  };
}
