import { describe, it, expect } from "vitest";
import { runExactMatchPass } from "../services/matcher/exactMatch.js";
import { runRuleMatchPass } from "../services/matcher/ruleMatch.js";

describe("Deterministic Matching Engine (Pass 1 & Pass 2)", () => {
  it("Pass 1: should correctly identify exact 3-way matches", async () => {
    const settlements = [
      { id: "st-1", paymentId: "PAY_1", utr: "UTR_1", settledAmount: "500.00" },
      { id: "st-2", paymentId: "PAY_2", utr: "UTR_2", settledAmount: "1200.00" },
    ];
    const ledgers = [
      { id: "lg-1", paymentId: "PAY_1", amount: "500.00" },
      { id: "lg-2", paymentId: "PAY_2", amount: "1200.00" },
    ];
    const banks = [
      { id: "bk-1", utr: "UTR_1", amount: "500.00" },
      { id: "bk-2", utr: "UTR_2", amount: "1200.00" },
    ];

    const pass1 = await runExactMatchPass("batch-1", settlements, ledgers, banks);

    expect(pass1.matchedCount).toBe(2);
    expect(pass1.remainingSettlements.length).toBe(0);
    expect(pass1.matchedResults[0].matchType).toBe("exact");
    expect(pass1.matchedResults[0].confidence).toBe("1.00");
  });

  it("Pass 2A: should correctly identify Fee & TDS deductions", async () => {
    const settlements = [
      { id: "st-3", paymentId: "PAY_3", utr: "UTR_3", amount: "2000.00", fee: "40.00", tds: "20.00", settledAmount: "1940.00", settlementDate: "2026-08-01" },
    ];
    const ledgers = [
      { id: "lg-3", paymentId: "PAY_3", amount: "2000.00" },
    ];
    const banks = [
      { id: "bk-3", utr: "UTR_3", amount: "1940.00", txnDate: "2026-08-01" },
    ];

    const pass2 = await runRuleMatchPass("batch-1", settlements, ledgers, banks);

    expect(pass2.matchedCount).toBe(1);
    expect(pass2.matchedResults[0].matchType).toBe("fee_adjusted");
    expect(pass2.matchedResults[0].confidence).toBe("0.95");
    expect(pass2.matchedResults[0].exceptionCategory).toBe("fee_deduction");
  });

  it("Pass 2B: should correctly identify 2-day timing lags", async () => {
    const settlements = [
      { id: "st-4", paymentId: "PAY_4", utr: "UTR_4", amount: "850.00", fee: "0.00", tds: "0.00", settledAmount: "850.00", settlementDate: "2026-08-01T10:00:00Z" },
    ];
    const ledgers = [
      { id: "lg-4", paymentId: "PAY_4", amount: "850.00" },
    ];
    const banks = [
      { id: "bk-4", utr: "UTR_4", amount: "850.00", txnDate: "2026-08-03T10:00:00Z" }, // 2 days delayed
    ];

    const pass2 = await runRuleMatchPass("batch-1", settlements, ledgers, banks);

    expect(pass2.matchedCount).toBe(1);
    expect(pass2.matchedResults[0].matchType).toBe("timing_lag");
    expect(pass2.matchedResults[0].confidence).toBe("0.90");
    expect(pass2.matchedResults[0].exceptionCategory).toBe("timing_lag");
  });
});
