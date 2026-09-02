import { X, Sparkles, AlertCircle } from "lucide-react";
import { MatchTypeBadge } from "./MatchTypeBadge.jsx";

export function DetailDrawer({ resultDetail, isOpen, onClose }) {
  if (!isOpen || !resultDetail) return null;

  const { matchType, confidence, explanation, sources } = resultDetail;
  const { settlement, ledger, bank } = sources || {};

  const stAmount = settlement ? parseFloat(settlement.amount || "0") : null;
  const bankAmount = bank ? parseFloat(bank.amount || "0") : null;
  const hasAmountDelta = stAmount !== null && bankAmount !== null && Math.abs(stAmount - bankAmount) > 0.01;
  const delta = hasAmountDelta ? (bankAmount - stAmount).toFixed(2) : null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full overflow-y-auto flex flex-col z-10">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Reconciliation Record Inspection
            </span>
            <div className="flex items-center gap-3">
              <MatchTypeBadge type={matchType} />
              <span className="text-xs font-mono font-semibold text-slate-700">
                Confidence: {(parseFloat(confidence || "0") * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Reasoning & AI Explanation Box */}
          <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Matching Logic & Reasoning Explanation</span>
            </div>
            <p className="text-xs text-indigo-950 font-sans leading-relaxed">{explanation || "No explanation text provided."}</p>
          </div>

          {/* Amount Delta Visual Diff Highlight */}
          {hasAmountDelta && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-amber-900">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Amount Parity Delta Discrepancy</span>
              </div>
              <div className="font-mono text-xs font-bold bg-amber-200/80 px-2.5 py-1 rounded">
                Settlement ₹{stAmount?.toFixed(2)} → Bank ₹{bankAmount?.toFixed(2)} (Delta: ₹{delta})
              </div>
            </div>
          )}

          {/* 3 Raw Source Record Cards Side-by-Side */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Ingested 3-Source Raw Payloads (Immutable Audit Trail)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Settlement Card */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                <span className="text-xs font-bold text-slate-800 block mb-2 border-b pb-1">
                  1. Settlement Gateway
                </span>
                {settlement ? (
                  <pre className="text-[10px] font-mono text-slate-700 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(settlement.raw || settlement, null, 2)}
                  </pre>
                ) : (
                  <span className="text-xs text-rose-500 font-mono font-medium">✗ Missing in Settlement</span>
                )}
              </div>

              {/* Ledger Card */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                <span className="text-xs font-bold text-slate-800 block mb-2 border-b pb-1">
                  2. ERP Order Ledger
                </span>
                {ledger ? (
                  <pre className="text-[10px] font-mono text-slate-700 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(ledger.raw || ledger, null, 2)}
                  </pre>
                ) : (
                  <span className="text-xs text-rose-500 font-mono font-medium">✗ Missing in Ledger</span>
                )}
              </div>

              {/* Bank Card */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                <span className="text-xs font-bold text-slate-800 block mb-2 border-b pb-1">
                  3. Bank Statement
                </span>
                {bank ? (
                  <pre className="text-[10px] font-mono text-slate-700 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(bank.raw || bank, null, 2)}
                  </pre>
                ) : (
                  <span className="text-xs text-rose-500 font-mono font-medium">✗ Missing in Bank</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
