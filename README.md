# Reconcile.ai — Multi-Source Financial Reconciliation Agent

**Reconcile.ai** is an enterprise-grade, multi-source financial reconciliation engine designed to automatically reconcile payment streams across three disparate data sources:
1. **Payment Gateway Settlement Statements** (e.g., Razorpay / Stripe)
2. **Internal Core Ledger Records** (ERP / Order Database)
3. **Bank Account Statements** (Bank Settlement Feeds)

---

## 🌟 Key Features & Capabilities

- **4-Pass Reconciliation Algorithm**:
  - **Pass 1 (Exact 3-Way)**: High-speed deterministic key matching (Order ID + UTR + Amount + Date).
  - **Pass 2 (Rule-Based)**: Fee deduction adjustments ($\pm \text{₹0.50}$) & bank timing lag settlement ($\le 3$ days).
  - **Pass 3 (LLM AI Residual Matcher)**: Natural language reasoning for truncated UTRs, fuzzy merchant notes, or non-standard reference codes with fallback safeguards.
  - **Pass 4 (Unresolved Sweeper)**: Automatic classification of orphaned ledger items and missing bank deposits.
- **"What-If" Rematch Simulator**: Dynamic parameter tweaking (fee tolerance, timing lag window, confidence thresholds) with live re-matching without re-uploading files.
- **Interactive Metrics Dashboard**: High-level KPI cards (Match Rate %, Discrepancies, Net Fee Impact), distribution charts (Recharts), visual diff slide-over drawer, and raw JSON transaction inspector.
- **Synthetic Data Generator**: One-click fixture generation producing 427 real-world test transactions with known anomaly distributions.

---

## 📁 Repository Structure

```
├── backend/
│   ├── app.js               # Express application configuration & middleware
│   ├── server.js            # Node HTTP server launcher
│   ├── controllers/         # Batch & Match API controllers
│   ├── services/            # 4-Pass Matching Pipeline & Ingestion Engine
│   ├── db/                  # Drizzle ORM schema & Neon PostgreSQL connection
│   ├── scripts/             # Data generator (seedSyntheticData.js) & benchmark evaluator
│   └── tests/               # 5 Vitest test suites (Unit, E2E, LLM Fallback)
└── frontend/
    ├── src/
    │   ├── components/      # KPI cards, Recharts breakdowns, Detail Drawer, What-If Simulator
    │   ├── pages/           # UploadPage.jsx & DashboardPage.jsx
    │   └── services/        # Axios API client
    ├── dist/                # Production Vite build artifacts
    └── package.json
```

---

## 🚀 Quickstart Guide (Demo & Evaluation)

### 1. Prerequisites
- Node.js `v18+` or `v20+`
- PostgreSQL database URL configured in `backend/.env`

### 2. Backend Setup
```bash
cd backend
npm install

# Seed synthetic test data fixtures (144 Settlement, 144 Ledger, 139 Bank)
npm run seed

# Run automated Vitest test suite (All 5 suites / 12 tests)
npm test

# Start Backend Dev Server (Port 5000)
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Verify production build compilation
npm run build

# Start Frontend Dev Server (Port 5173)
npm run dev
```

---

## 🧪 Verification & Test Results

| Component | Status | Metrics / Result |
|---|---|---|
| **Backend Unit & E2E Tests** | `PASSED` | 5 Test Files Passed (12/12 Tests) |
| **Frontend Production Build** | `PASSED` | Vite bundle compiled cleanly (0 errors) |
| **Frontend Code Quality** | `PASSED` | ESLint 0 errors / 0 warnings |
| **Deterministic Yield Pass Rate** | `75%+` | High-confidence automated 3-way matching |

---

## 🎥 Step-by-Step Demo Walkthrough

1. **Upload / Seed Stage (`http://localhost:5173/`)**:
   - Click **"Run with sample data"** on the upload screen to load pre-configured synthetic CSV fixtures.
   - Click **"Run Reconciliation"** to kick off the 4-Pass Matching Engine.
2. **Dashboard Overview (`/batches/:id`)**:
   - View top summary KPI cards (Total Processed, Match Rate %, Exception breakdown).
   - Review match type distribution charts and identified anomaly categories.
3. **Deep-Dive Visual Diff**:
   - Filter transactions by **Exact**, **Adjusted**, or **Unresolved**.
   - Click any transaction row to open the **Detail Drawer** showing side-by-side settlement, ledger, and bank JSON payloads with delta highlights.
4. **What-If Rematch Simulation**:
   - Adjust the **Fee Tolerance** (e.g. ₹0.50 $\rightarrow$ ₹1.00) or **Timing Lag Window** (3 days $\rightarrow$ 7 days) in the control panel.
   - Click **Rematch** to observe real-time metric updates without re-uploading CSVs.
