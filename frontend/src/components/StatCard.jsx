export function StatCard({ label, value, subtext, color = "indigo", icon: Icon }) {
  const borderColors = {
    indigo: "border-l-indigo-600 bg-indigo-50/20 text-indigo-900",
    emerald: "border-l-emerald-500 bg-emerald-50/20 text-emerald-900",
    amber: "border-l-amber-500 bg-amber-50/20 text-amber-900",
    rose: "border-l-rose-500 bg-rose-50/20 text-rose-900",
    slate: "border-l-slate-500 bg-slate-50/20 text-slate-900",
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 border-l-4 shadow-2xs ${borderColors[color] || borderColors.indigo}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        {Icon && <Icon className="w-5 h-5 text-slate-400" />}
      </div>
      <div className="text-2xl font-bold font-mono text-slate-900 mb-1">{value}</div>
      {subtext && <div className="text-xs text-slate-500 font-sans">{subtext}</div>}
    </div>
  );
}
