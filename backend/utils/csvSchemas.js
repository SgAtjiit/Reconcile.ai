import { z } from "zod";

export const SettlementRowSchema = z.object({
  payment_id: z.coerce.string().min(1, "payment_id is required"),
  utr: z.coerce.string().min(1, "utr is required"),
  amount: z.coerce.number().positive("amount must be positive"),
  fee: z.coerce.number().nonnegative("fee must be non-negative").default(0),
  tds: z.coerce.number().nonnegative("tds must be non-negative").default(0),
  settled_amount: z.coerce.number().positive("settled_amount must be positive"),
  settlement_date: z.coerce.string().refine((val) => !isNaN(Date.parse(val)), "Invalid settlement_date format"),
});

export const LedgerRowSchema = z.object({
  order_id: z.coerce.string().min(1, "order_id is required"),
  payment_id: z.coerce.string().min(1, "payment_id is required"),
  amount: z.coerce.number().positive("amount must be positive"),
  order_date: z.coerce.string().refine((val) => !isNaN(Date.parse(val)), "Invalid order_date format"),
  customer_ref: z.coerce.string().optional(),
});

export const BankRowSchema = z.object({
  utr: z.coerce.string().min(1, "utr is required"),
  amount: z.coerce.number().positive("amount must be positive"),
  txn_date: z.coerce.string().refine((val) => !isNaN(Date.parse(val)), "Invalid txn_date format"),
  narration: z.coerce.string().optional(),
});

