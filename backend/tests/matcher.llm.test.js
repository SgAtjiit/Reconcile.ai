import { describe, it, expect } from "vitest";
import { runLlmMatchPass } from "../services/matcher/llmMatch.js";
import { runUnresolvedPass } from "../services/matcher/unresolved.js";

describe("OpenRouter LLM & Unresolved Matcher (Pass 3 & Pass 4)", () => {
  it("Pass 3 Fallback: should degrade gracefully to unresolved when OpenRouter call fails/times out", async () => {
    const settlements = [
      { id: "st-residual-1", paymentId: "PAY_RES_1", utr: "UTR_RES_1", amount: "1000.00", fee: "0.00", tds: "0.00", settledAmount: "1000.00", settlementDate: "2026-08-01" }
    ];

    // Force failure using dummy timeout/model options
    const pass3 = await runLlmMatchPass("batch-test", settlements, [], [], { timeoutMs: 1 });

    expect(pass3.matchedCount).toBe(1);
    expect(pass3.matchedResults[0].matchType).toBe("unresolved");
    expect(pass3.matchedResults[0].confidence).toBe("0.00");
  }, 15000);

  it("Pass 4 Sweeper: should accurately sweep orphaned records across all 3 streams", async () => {
    const orphanedSettlements = [{ id: "st-orphan" }];
    const orphanedLedgers = [{ id: "lg-orphan" }];
    const orphanedBanks = [{ id: "bk-orphan" }];

    const pass4 = await runUnresolvedPass("batch-test", orphanedSettlements, orphanedLedgers, orphanedBanks);

    expect(pass4.unresolvedCount).toBe(3);
    expect(pass4.unresolvedRecords[0].matchType).toBe("unresolved");
    expect(pass4.unresolvedRecords[0].exceptionCategory).toBe("no_counterpart");
  });
});
