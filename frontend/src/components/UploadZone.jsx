import { Upload, CheckCircle2 } from "lucide-react";

export function UploadZone({ label, file, onFileSelect, subtitle }) {
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-6 transition-all duration-200 text-center flex flex-col items-center justify-center cursor-pointer ${
        file
          ? "border-emerald-500 bg-emerald-50/40"
          : "border-slate-300 hover:border-indigo-500 hover:bg-slate-50/80"
      }`}
    >
      <input
        type="file"
        accept=".csv"
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
        className="hidden"
        id={`file-input-${label.replace(/\s+/g, "-")}`}
      />
      <label htmlFor={`file-input-${label.replace(/\s+/g, "-")}`} className="cursor-pointer flex flex-col items-center w-full">
        {file ? (
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-2" />
        ) : (
          <Upload className="w-10 h-10 text-slate-400 mb-2 group-hover:text-indigo-600" />
        )}
        <span className="font-semibold text-slate-800 text-sm mb-1">{label}</span>
        <span className="text-xs text-slate-500 font-mono mb-3">{subtitle}</span>
        {file ? (
          <span className="text-xs font-mono font-medium text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-lg max-w-[200px] truncate">
            {file.name}
          </span>
        ) : (
          <span className="text-xs font-semibold text-indigo-600 hover:underline">
            Browse CSV file
          </span>
        )}
      </label>
    </div>
  );
}
