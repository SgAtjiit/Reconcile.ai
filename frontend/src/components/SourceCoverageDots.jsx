export function SourceCoverageDots({ settlementId, ledgerId, bankId }) {
  return (
    <div className="flex items-center gap-1.5" title="Source Coverage Indicator (Settlement, Ledger, Bank)">
      <span
        className={`w-2.5 h-2.5 rounded-full transition-colors ${
          settlementId ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-slate-200"
        }`}
        title={settlementId ? "Found in Settlement Gateway" : "Missing in Settlement"}
      />
      <span
        className={`w-2.5 h-2.5 rounded-full transition-colors ${
          ledgerId ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-slate-200"
        }`}
        title={ledgerId ? "Found in ERP Order Ledger" : "Missing in Ledger"}
      />
      <span
        className={`w-2.5 h-2.5 rounded-full transition-colors ${
          bankId ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-slate-200"
        }`}
        title={bankId ? "Found in Bank Statement" : "Missing in Bank"}
      />
    </div>
  );
}
