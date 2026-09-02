import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("Express REST API Controllers & Routes", () => {
  it("GET /health should return 200 OK", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  it("POST /api/batches should return 201 Created with batch object", async () => {
    const res = await request(app)
      .post("/api/batches")
      .send({ name: "Test Ingestion Batch" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Test Ingestion Batch");
  });
});
