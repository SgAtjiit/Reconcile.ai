import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

const COLOR_MAP = {
  exact: "#10b981",       // emerald-500
  fee_adjusted: "#f59e0b",// amber-500
  timing_lag: "#3b82f6",  // blue-500
  fuzzy_llm: "#8b5cf6",   // violet-500
  unresolved: "#ef4444",  // red-500
};

const LABEL_MAP = {
  exact: "Exact Match",
  fee_adjusted: "Fee/TDS Adjusted",
  timing_lag: "Timing Lag",
  fuzzy_llm: "LLM Residual",
  unresolved: "Unresolved",
};

export function MatchTypeChart({ summaryData }) {
  const chartData = Object.entries(summaryData || {}).map(([key, val]) => ({
    key,
    name: LABEL_MAP[key] || key,
    count: val?.recordCount || val?.count || val?.matchEntries || 0,
    confidence: val?.avgConfidence || "0.00",
  }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs h-full flex items-center justify-center text-slate-400 text-xs font-mono">
        No summary distribution data available
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Reconciliation Match Distribution</h3>
        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Recharts</span>
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#475569" }} width={120} />
            <Tooltip
              formatter={(value, name, item) => [`${value} records (Avg Conf: ${item.payload.confidence})`, item.payload.name]}
              contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={COLOR_MAP[entry.key] || "#64748b"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
