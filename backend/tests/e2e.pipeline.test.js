import { describe, it, expect } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import app from "../app.js";

const FIXTURES_DIR = path.join(process.cwd(), "data", "fixtures");

describe("End-to-End Batch Reconciliation Pipeline & Rematch Simulator", () => {
  let batchId = null;

  it("1. Create Batch & Upload Fixtures", async () => {
    // Create Batch
    const createRes = await request(app)
      .post("/api/batches")
      .send({ name: "E2E Fixture Test Batch" });

    expect(createRes.status).toBe(201);
    batchId = createRes.body.data.id;
    expect(batchId).toBeDefined();

    // Upload Synthetic CSV Fixtures
    const settlementPath = path.join(FIXTURES_DIR, "settlement.csv");
    const ledgerPath = path.join(FIXTURES_DIR, "ledger.csv");
    const bankPath = path.join(FIXTURES_DIR, "bank.csv");

    if (fs.existsSync(settlementPath) && fs.existsSync(ledgerPath) && fs.existsSync(bankPath)) {
      const uploadRes = await request(app)
        .post(`/api/batches/${batchId}/upload`)
        .attach("settlement", settlementPath)
        .attach("ledger", ledgerPath)
        .attach("bank", bankPath);

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.success).toBe(true);
      expect(uploadRes.body.data.totalRecords).toBeGreaterThan(100);
    }
  }, 20000);

  it("2. Run Matcher & Verify Summary", async () => {
    if (!batchId) return;

    // Trigger 4-Pass Matching Pipeline with fast timeout for offline test runner
    const matchRes = await request(app)
      .post(`/api/batches/${batchId}/match`)
      .send({ timeoutMs: 50 });

    expect(matchRes.status).toBe(200);
    expect(matchRes.body.success).toBe(true);
    expect(matchRes.body.data.pass1ExactCount).toBeGreaterThan(0);

    // Fetch Summary Aggregation
    const summaryRes = await request(app).get(`/api/batches/${batchId}/summary`);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.success).toBe(true);
  }, 20000);

  it("3. Test What-If Rematch Simulator", async () => {
    if (!batchId) return;

    // Test What-If Rematch Simulator with custom fee tolerance and fast timeout
    const rematchRes = await request(app)
      .post(`/api/batches/${batchId}/rematch`)
      .send({ feeTolerance: 1.00, timingLagDays: 5, confidenceThreshold: 0.70, timeoutMs: 50 });

    expect(rematchRes.status).toBe(200);
    expect(rematchRes.body.success).toBe(true);
  }, 20000);
});
