import { pgTable, text, timestamp, numeric, integer, jsonb, uuid, varchar } from "drizzle-orm/pg-core";

// 1. Batches Table
export const matchBatches = pgTable("match_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  totalRecords: integer("total_records").default(0).notNull(),
  status: text("status", { enum: ["uploaded", "matching", "completed", "failed"] }).default("uploaded").notNull(),
});

// 2. Sources: Settlement Gateway
export const sourcesSettlement = pgTable("sources_settlement", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").references(() => matchBatches.id, { onDelete: "cascade" }).notNull(),
  paymentId: varchar("payment_id", { length: 100 }).notNull(),
  utr: varchar("utr", { length: 100 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  fee: numeric("fee", { precision: 12, scale: 2 }).notNull().default("0.00"),
  tds: numeric("tds", { precision: 12, scale: 2 }).notNull().default("0.00"),
  settledAmount: numeric("settled_amount", { precision: 12, scale: 2 }).notNull(),
  settlementDate: timestamp("settlement_date").notNull(),
  raw: jsonb("raw").notNull(),
});

// 3. Sources: ERP Ledger
export const sourcesLedger = pgTable("sources_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").references(() => matchBatches.id, { onDelete: "cascade" }).notNull(),
  orderId: varchar("order_id", { length: 100 }).notNull(),
  paymentId: varchar("payment_id", { length: 100 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  orderDate: timestamp("order_date").notNull(),
  customerRef: text("customer_ref"),
  raw: jsonb("raw").notNull(),
});

// 4. Sources: Bank Statement
export const sourcesBank = pgTable("sources_bank", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").references(() => matchBatches.id, { onDelete: "cascade" }).notNull(),
  utr: varchar("utr", { length: 100 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  txnDate: timestamp("txn_date").notNull(),
  narration: text("narration"),
  raw: jsonb("raw").notNull(),
});

// 5. Match Results Table (Single Source of Truth for Dashboard)
export const matchResults = pgTable("match_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").references(() => matchBatches.id, { onDelete: "cascade" }).notNull(),
  settlementId: uuid("settlement_id"),
  ledgerId: uuid("ledger_id"),
  bankId: uuid("bank_id"),
  matchType: text("match_type", { 
    enum: ["exact", "fee_adjusted", "timing_lag", "fuzzy_llm", "unresolved"] 
  }).notNull(),
  confidence: numeric("confidence", { precision: 4, scale: 2 }).notNull(),
  exceptionCategory: text("exception_category", { 
    enum: ["timing_lag", "fee_deduction", "partial_refund", "duplicate", "no_counterpart", null] 
  }),
  explanation: text("explanation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
