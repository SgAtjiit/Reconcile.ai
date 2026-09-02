import { useState } from "react";
import { Sliders, ChevronDown, ChevronUp } from "lucide-react";

export function ToleranceSettings({ settings, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-2xs mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 text-left transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <span>Advanced Matching Tolerances</span>
          <span className="text-xs font-mono text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
            Fee ₹{settings.feeTolerance} | Lag {settings.timingLagDays}d | Conf {settings.confidenceThreshold}
          </span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {isOpen && (
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-slate-200 bg-white">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Fee Tolerance (₹ Epsilon)
            </label>
            <input
              type="number"
              step="0.10"
              value={settings.feeTolerance}
              onChange={(e) => onChange({ ...settings, feeTolerance: parseFloat(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Timing Lag Window (Days)
            </label>
            <input
              type="number"
              value={settings.timingLagDays}
              onChange={(e) => onChange({ ...settings, timingLagDays: parseInt(e.target.value, 10) })}
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              AI Confidence Threshold (0.0 - 1.0)
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={settings.confidenceThreshold}
              onChange={(e) => onChange({ ...settings, confidenceThreshold: parseFloat(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
}
