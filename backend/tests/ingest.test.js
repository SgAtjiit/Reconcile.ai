import { describe, it, expect } from "vitest";
import { processAndIngestBatch } from "../services/ingestService.js";
import { ApiError } from "../utils/ApiError.js";

describe("Ingestion Service & Zod CSV Validation Pipeline", () => {
  it("should successfully parse and validate clean 3-source CSV buffers", async () => {
    const settlementCsv = `payment_id,utr,amount,fee,tds,settled_amount,settlement_date
PAY_100,UTR_100,500.00,0.00,0.00,500.00,2026-08-01T10:00:00Z`;

    const ledgerCsv = `order_id,payment_id,amount,order_date,customer_ref
ORD_100,PAY_100,500.00,2026-08-01T10:00:00Z,CUST_100`;

    const bankCsv = `utr,amount,txn_date,narration
UTR_100,500.00,2026-08-01T10:00:00Z,NEFT/INB/UTR_100`;

    const mockFiles = {
      settlement: { buffer: Buffer.from(settlementCsv) },
      ledger: { buffer: Buffer.from(ledgerCsv) },
      bank: { buffer: Buffer.from(bankCsv) },
    };

    const result = await processAndIngestBatch("mock-batch-id-123", mockFiles);

    expect(result.totalSettlement).toBe(1);
    expect(result.totalLedger).toBe(1);
    expect(result.totalBank).toBe(1);
    expect(result.totalRecords).toBe(3);
    expect(result.validSettlements[0].utr).toBe("UTR_100");
    expect(result.validSettlements[0].raw.payment_id).toBe("PAY_100");
  });

  it("should throw an ApiError(400) when malformed data is uploaded", async () => {
    const invalidSettlementCsv = `payment_id,utr,amount,fee,tds,settled_amount,settlement_date
PAY_BAD,UTR_BAD,invalid_number,0.00,0.00,500.00,invalid_date`;

    const ledgerCsv = `order_id,payment_id,amount,order_date,customer_ref
ORD_100,PAY_100,500.00,2026-08-01T10:00:00Z,CUST_100`;

    const bankCsv = `utr,amount,txn_date,narration
UTR_100,500.00,2026-08-01T10:00:00Z,NEFT/INB/UTR_100`;

    const mockFiles = {
      settlement: { buffer: Buffer.from(invalidSettlementCsv) },
      ledger: { buffer: Buffer.from(ledgerCsv) },
      bank: { buffer: Buffer.from(bankCsv) },
    };

    await expect(processAndIngestBatch("mock-batch-id-456", mockFiles)).rejects.toThrow(ApiError);
  });
});
