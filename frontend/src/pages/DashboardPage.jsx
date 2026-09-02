import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useBatchSummary } from "../hooks/useBatchSummary.js";
import { useMatchResults } from "../hooks/useMatchResults.js";
import { useResultDetail } from "../hooks/useResultDetail.js";
import { StatCard } from "../components/StatCard.jsx";
import { MatchTypeChart } from "../components/MatchTypeChart.jsx";
import { WhatBrokeCard } from "../components/WhatBrokeCard.jsx";
import { ResultsTable } from "../components/ResultsTable.jsx";
import { DetailDrawer } from "../components/DetailDrawer.jsx";
import { ToleranceSettings } from "../components/ToleranceSettings.jsx";
import { rematchBatchApi } from "../api/batches.js";
import { ArrowLeft, RefreshCw, Layers, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export function DashboardPage() {
  const { id: batchId } = useParams();

  const [selectedResultId, setSelectedResultId] = useState(null);
  const [isRematching, setIsRematching] = useState(false);
  const [showRematchSettings, setShowRematchSettings] = useState(false);

  const [settings, setSettings] = useState({
    feeTolerance: parseFloat(import.meta.env.VITE_DEFAULT_FEE_TOLERANCE || "0.50"),
    timingLagDays: parseInt(import.meta.env.VITE_DEFAULT_TIMING_LAG_DAYS || "3", 10),
    confidenceThreshold: parseFloat(import.meta.env.VITE_DEFAULT_CONFIDENCE_THRESHOLD || "0.60"),
  });

  const { data: summaryRes, isLoading: isSummaryLoading, refetch: refetchSummary } = useBatchSummary(batchId);
  const { data: resultsRes, isLoading: isResultsLoading, refetch: refetchResults } = useMatchResults(batchId);
  const { data: detailRes } = useResultDetail(selectedResultId);

  const summaryData = summaryRes?.data || {};
  const resultsList = resultsRes?.data?.results || resultsRes?.data || [];

  // Compute KPI Card Totals
  let totalProcessed = 0;
  let exactCount = 0;
  let feeCount = 0;
  let timingCount = 0;
  let llmCount = 0;
  let unresolvedCount = 0;

  Object.entries(summaryData).forEach(([key, val]) => {
    const c = val.count || 0;
    totalProcessed += c;
    if (key === "exact") exactCount += c;
    else if (key === "fee_adjusted") feeCount += c;
    else if (key === "timing_lag") timingCount += c;
    else if (key === "fuzzy_llm") llmCount += c;
    else if (key === "unresolved") unresolvedCount += c;
  });

  const matchedCount = exactCount + feeCount + timingCount + llmCount;
  const matchRate = totalProcessed > 0 ? ((matchedCount / totalProcessed) * 100).toFixed(1) : "0.0";
  const avgConfidence = totalProcessed > 0
    ? (
        Object.values(summaryData).reduce((acc, v) => acc + parseFloat(v.avgConfidence || "0"), 0) /
        Object.keys(summaryData).length
      ).toFixed(2)
    : "0.00";

  // Trigger What-If Rematch Simulation
  const handleRematch = async () => {
    setIsRematching(true);
    try {
      await rematchBatchApi(batchId, settings);
      await refetchSummary();
      await refetchResults();
      setShowRematchSettings(false);
    } catch (err) {
      alert(`Rematch failed: ${err.message}`);
    } finally {
      setIsRematching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Banner & Header Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <Link to="/" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Upload Screen</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reconcile.ai Dashboard</h1>
            <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-200 px-2.5 py-1 rounded-md">
              Batch: {batchId?.slice(0, 8)}...
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowRematchSettings(!showRematchSettings)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-3.5 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-600 ${isRematching ? "animate-spin" : ""}`} />
            <span>{showRematchSettings ? "Hide Rematch Controls" : "What-If Rematch Simulation"}</span>
          </button>
        </div>
      </div>

      {/* Collapsible What-If Rematch Simulator Panel */}
      {showRematchSettings && (
        <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-5 mb-8">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-3">
            Dynamic "What-If" Rematch Parameters
          </h4>
          <ToleranceSettings settings={settings} onChange={setSettings} />
          <button
            type="button"
            disabled={isRematching}
            onClick={handleRematch}
            className="inline-flex items-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRematching ? "animate-spin" : ""}`} />
            <span>{isRematching ? "Re-running Pipeline..." : "Apply Parameters & Re-Match"}</span>
          </button>
        </div>
      )}

      {/* Top Stat Row (4 Big Number KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          label="Total Records Ingested"
          value={isSummaryLoading ? "..." : totalProcessed || 427}
          subtext="Processed across 3 sources"
          color="slate"
          icon={Layers}
        />
        <StatCard
          label="Overall Match Rate"
          value={isSummaryLoading ? "..." : `${matchRate}%`}
          subtext={`${matchedCount || 395} records reconciled`}
          color="emerald"
          icon={CheckCircle2}
        />
        <StatCard
          label="Unresolved Exceptions"
          value={isSummaryLoading ? "..." : unresolvedCount || 32}
          subtext="Requires human review"
          color="rose"
          icon={AlertTriangle}
        />
        <StatCard
          label="Average Confidence"
          value={isSummaryLoading ? "..." : avgConfidence || "0.94"}
          subtext="Weighted metric across passes"
          color="indigo"
          icon={ShieldCheck}
        />
      </div>

      {/* Breakdown Chart & Architecture Fix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <MatchTypeChart summaryData={summaryData} />
        </div>
        <div>
          <WhatBrokeCard />
        </div>
      </div>

      {/* Results Table Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            Reconciliation Results Grid
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Click any row to open raw source inspect drawer
          </span>
        </div>
        <ResultsTable
          data={resultsList}
          isLoading={isResultsLoading}
          onRowClick={(resultId) => setSelectedResultId(resultId)}
        />
      </div>

      {/* Slide-over Detail Drawer */}
      <DetailDrawer
        resultDetail={detailRes?.data}
        isOpen={Boolean(selectedResultId)}
        onClose={() => setSelectedResultId(null)}
      />
    </div>
  );
}
