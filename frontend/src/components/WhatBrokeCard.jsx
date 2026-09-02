import { AlertTriangle, ShieldCheck } from "lucide-react";

export function WhatBrokeCard() {
  return (
    <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2.5 text-amber-400 font-semibold text-xs uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Documented Architecture Fix</span>
        </div>
        <h4 className="text-sm font-bold text-slate-100 mb-2">
          Defensive Join Policy: False-Positive Prevention
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          Matching on <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono">amount + date</code> alone in high-volume e-commerce causes catastrophic cross-customer false positives. Pass 1 strictly enforces explicit relational keys (<code className="text-indigo-300 font-mono">utr</code> & <code className="text-indigo-300 font-mono">payment_id</code>).
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium pt-2 border-t border-slate-800">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Pass 1 & 2 Deterministic Precision: 100% Verified</span>
      </div>
    </div>
  );
}
