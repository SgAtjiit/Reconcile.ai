import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { MatchTypeBadge } from "./MatchTypeBadge.jsx";
import { SourceCoverageDots } from "./SourceCoverageDots.jsx";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

export function ResultsTable({ data = [], isLoading, onRowClick }) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [matchTypeFilter, setMatchTypeFilter] = useState("all");

  const filteredData = useMemo(() => {
    if (matchTypeFilter === "all") return data;
    if (matchTypeFilter === "adjusted") {
      return data.filter(
        (d) => d.matchType === "fee_adjusted" || d.matchType === "timing_lag" || d.matchType === "fuzzy_llm"
      );
    }
    return data.filter((d) => d.matchType === matchTypeFilter);
  }, [data, matchTypeFilter]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "Result ID / Reference",
        cell: (info) => (
          <div className="font-mono text-xs text-slate-800 font-semibold truncate max-w-[140px]">
            {info.getValue()}
          </div>
        ),
      },
      {
        accessorKey: "matchType",
        header: "Match Classification",
        cell: (info) => <MatchTypeBadge type={info.getValue()} />,
      },
      {
        accessorKey: "confidence",
        header: "Confidence",
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-slate-700">
            {(parseFloat(info.getValue() || "0") * 100).toFixed(0)}%
          </span>
        ),
      },
      {
        id: "sources",
        header: "Sources (S / L / B)",
        cell: ({ row }) => (
          <SourceCoverageDots
            settlementId={row.original.settlementId}
            ledgerId={row.original.ledgerId}
            bankId={row.original.bankId}
          />
        ),
      },
      {
        accessorKey: "explanation",
        header: "Reasoning & Explanation",
        cell: (info) => (
          <div className="text-xs text-slate-600 truncate max-w-[340px]" title={info.getValue()}>
            {info.getValue() || "—"}
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-3">
        <div className="h-8 bg-slate-200 rounded-lg animate-pulse w-full mb-4" />
        <div className="h-10 bg-slate-100 rounded-lg animate-pulse w-full" />
        <div className="h-10 bg-slate-100 rounded-lg animate-pulse w-full" />
        <div className="h-10 bg-slate-100 rounded-lg animate-pulse w-full" />
        <div className="h-10 bg-slate-100 rounded-lg animate-pulse w-full" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      {/* Filter & Search Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg">
          {["all", "exact", "adjusted", "unresolved"].map((tab) => (
            <button
              key={tab}
              onClick={() => setMatchTypeFilter(tab)}
              className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors cursor-pointer ${
                matchTypeFilter === tab ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Global Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search ID / UTR / Reason..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-slate-200 bg-slate-100/50">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick && onRowClick(row.original.id)}
                  className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-xs">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-slate-400 font-mono">
                  No matching records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span>
            Showing Page <strong className="text-slate-800">{table.getState().pagination.pageIndex + 1}</strong> of{" "}
            <strong className="text-slate-800">{table.getPageCount() || 1}</strong> ({filteredData.length} {matchTypeFilter === "all" ? "total" : matchTypeFilter} match entries)
          </span>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span>Rows:</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="px-2 py-0.5 border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-hidden"
            >
              {[15, 25, 50, 100, 200].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1.5 rounded-md border border-slate-300 disabled:opacity-40 cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1.5 rounded-md border border-slate-300 disabled:opacity-40 cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
