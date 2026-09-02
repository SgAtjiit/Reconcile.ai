const BADGE_CONFIG = {
  exact: { label: "Exact", bg: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  fee_adjusted: { label: "Fee Adjusted", bg: "bg-amber-100 text-amber-800 border-amber-300" },
  timing_lag: { label: "Timing Lag", bg: "bg-blue-100 text-blue-800 border-blue-300" },
  fuzzy_llm: { label: "LLM Residual", bg: "bg-purple-100 text-purple-800 border-purple-300" },
  unresolved: { label: "Unresolved", bg: "bg-rose-100 text-rose-800 border-rose-300" },
};

export function MatchTypeBadge({ type }) {
  const cfg = BADGE_CONFIG[type] || { label: type || "Unknown", bg: "bg-slate-100 text-slate-800 border-slate-300" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}
