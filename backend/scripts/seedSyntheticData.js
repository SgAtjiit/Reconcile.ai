import fs from "fs";
import path from "path";
import Papa from "papaparse";

const FIXTURES_DIR = path.join(process.cwd(), "data", "fixtures");

// Ensure directory exists
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

function generateSyntheticData() {
  const settlementRows = [];
  const ledgerRows = [];
  const bankRows = [];

  const baseDate = new Date("2026-08-01T10:00:00Z");

  let txCounter = 1000;

  // 1. Exact Matches (~90 records = 60%)
  for (let i = 0; i < 90; i++) {
    txCounter++;
    const paymentId = `PAY_${txCounter}`;
    const utr = `UTR_${txCounter}`;
    const orderId = `ORD_${txCounter}`;
    const amount = (Math.floor(Math.random() * 500) + 10) * 10; // e.g. 500.00
    const txnDateStr = new Date(baseDate.getTime() + i * 3600000).toISOString();

    settlementRows.push({
      payment_id: paymentId,
      utr: utr,
      amount: amount.toFixed(2),
      fee: "0.00",
      tds: "0.00",
      settled_amount: amount.toFixed(2),
      settlement_date: txnDateStr,
    });

    ledgerRows.push({
      order_id: orderId,
      payment_id: paymentId,
      amount: amount.toFixed(2),
      order_date: txnDateStr,
      customer_ref: `CUST_${txCounter}`,
    });

    bankRows.push({
      utr: utr,
      amount: amount.toFixed(2),
      txn_date: txnDateStr,
      narration: `NEFT/INB/${utr}/SETTLEMENT`,
    });
  }

  // 2. Fee & TDS Deductions (~22 records = 15%)
  for (let i = 0; i < 22; i++) {
    txCounter++;
    const paymentId = `PAY_${txCounter}`;
    const utr = `UTR_${txCounter}`;
    const orderId = `ORD_${txCounter}`;
    const grossAmount = (Math.floor(Math.random() * 800) + 100) * 10; // e.g. 2500.00
    const fee = parseFloat((grossAmount * 0.02).toFixed(2)); // 2% MDR fee
    const tds = parseFloat((grossAmount * 0.01).toFixed(2)); // 1% TDS
    const netBankCredit = parseFloat((grossAmount - fee - tds).toFixed(2));
    const txnDateStr = new Date(baseDate.getTime() + (90 + i) * 3600000).toISOString();

    settlementRows.push({
      payment_id: paymentId,
      utr: utr,
      amount: grossAmount.toFixed(2),
      fee: fee.toFixed(2),
      tds: tds.toFixed(2),
      settled_amount: netBankCredit.toFixed(2),
      settlement_date: txnDateStr,
    });

    ledgerRows.push({
      order_id: orderId,
      payment_id: paymentId,
      amount: grossAmount.toFixed(2),
      order_date: txnDateStr,
      customer_ref: `CUST_${txCounter}`,
    });

    bankRows.push({
      utr: utr,
      amount: netBankCredit.toFixed(2),
      txn_date: txnDateStr,
      narration: `CMS/GATEWAY/${utr}/NET_SETTLEMENT`,
    });
  }

  // 3. Timing Lag (~15 records = 10%)
  for (let i = 0; i < 15; i++) {
    txCounter++;
    const paymentId = `PAY_${txCounter}`;
    const utr = `UTR_${txCounter}`;
    const orderId = `ORD_${txCounter}`;
    const amount = (Math.floor(Math.random() * 600) + 50) * 10;
    const stDate = new Date(baseDate.getTime() + (112 + i) * 3600000);
    // Bank date delayed by 2 days
    const bankDate = new Date(stDate.getTime() + 2 * 24 * 3600000);

    settlementRows.push({
      payment_id: paymentId,
      utr: utr,
      amount: amount.toFixed(2),
      fee: "0.00",
      tds: "0.00",
      settled_amount: amount.toFixed(2),
      settlement_date: stDate.toISOString(),
    });

    ledgerRows.push({
      order_id: orderId,
      payment_id: paymentId,
      amount: amount.toFixed(2),
      order_date: stDate.toISOString(),
      customer_ref: `CUST_${txCounter}`,
    });

    bankRows.push({
      utr: utr,
      amount: amount.toFixed(2),
      txn_date: bankDate.toISOString(),
      narration: `NEFT/DELAYED/${utr}`,
    });
  }

  // 4. Partial Refund / Discrepancies (~12 records = 8%)
  for (let i = 0; i < 12; i++) {
    txCounter++;
    const paymentId = `PAY_${txCounter}`;
    const utr = `UTR_${txCounter}`;
    const orderId = `ORD_${txCounter}`;
    const originalAmount = 2000.00;
    const partialBankCredit = 1000.00; // Customer partially refunded
    const txnDateStr = new Date(baseDate.getTime() + (127 + i) * 3600000).toISOString();

    settlementRows.push({
      payment_id: paymentId,
      utr: utr,
      amount: originalAmount.toFixed(2),
      fee: "50.00",
      tds: "0.00",
      settled_amount: "1950.00",
      settlement_date: txnDateStr,
    });

    ledgerRows.push({
      order_id: orderId,
      payment_id: paymentId,
      amount: originalAmount.toFixed(2),
      order_date: txnDateStr,
      customer_ref: `CUST_${txCounter}_PARTIAL`,
    });

    bankRows.push({
      utr: utr,
      amount: partialBankCredit.toFixed(2),
      txn_date: txnDateStr,
      narration: `PARTIAL_REFUND_CREDIT/${utr}`,
    });
  }

  // 5. Orphaned Records (~10 records = 7%)
  for (let i = 0; i < 5; i++) {
    txCounter++;
    const paymentId = `PAY_ORPHAN_ST_${txCounter}`;
    const utr = `UTR_ORPHAN_ST_${txCounter}`;
    const txnDateStr = new Date(baseDate.getTime() + (139 + i) * 3600000).toISOString();

    settlementRows.push({
      payment_id: paymentId,
      utr: utr,
      amount: "1500.00",
      fee: "0.00",
      tds: "0.00",
      settled_amount: "1500.00",
      settlement_date: txnDateStr,
    });
    // Missing in Ledger and Bank!
  }

  for (let i = 0; i < 5; i++) {
    txCounter++;
    const orderId = `ORD_ORPHAN_LEDGER_${txCounter}`;
    const paymentId = `PAY_ORPHAN_LEDGER_${txCounter}`;
    const txnDateStr = new Date(baseDate.getTime() + (144 + i) * 3600000).toISOString();

    ledgerRows.push({
      order_id: orderId,
      payment_id: paymentId,
      amount: "3200.00",
      order_date: txnDateStr,
      customer_ref: `CUST_UNSETTLED_${txCounter}`,
    });
    // Missing in Settlement and Bank!
  }

  // Save to CSV files
  const settlementCsv = Papa.unparse(settlementRows);
  const ledgerCsv = Papa.unparse(ledgerRows);
  const bankCsv = Papa.unparse(bankRows);

  fs.writeFileSync(path.join(FIXTURES_DIR, "settlement.csv"), settlementCsv, "utf-8");
  fs.writeFileSync(path.join(FIXTURES_DIR, "ledger.csv"), ledgerCsv, "utf-8");
  fs.writeFileSync(path.join(FIXTURES_DIR, "bank.csv"), bankCsv, "utf-8");

  console.log("=== Synthetic Data Fixtures Generated Successfully ===");
  console.log(`Settlement CSV: ${settlementRows.length} rows -> ${path.join(FIXTURES_DIR, "settlement.csv")}`);
  console.log(`Ledger CSV:     ${ledgerRows.length} rows -> ${path.join(FIXTURES_DIR, "ledger.csv")}`);
  console.log(`Bank CSV:       ${bankRows.length} rows -> ${path.join(FIXTURES_DIR, "bank.csv")}`);
  console.log(`Total Records:  ${settlementRows.length + ledgerRows.length + bankRows.length}`);
}

generateSyntheticData();
