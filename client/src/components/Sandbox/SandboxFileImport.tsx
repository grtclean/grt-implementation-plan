import React, { useRef, useState, useCallback } from "react";
import { Upload, FileUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SandboxFileImportProps {
  /** Accepted file types, e.g. ".csv,.xlsx" */
  accept?: string;
  /** Label shown on the import button */
  label?: string;
  /** Called with parsed rows (array of string arrays) for CSV */
  onImport: (rows: string[][], fileName: string) => void;
  /** Max rows to accept (default 500) */
  maxRows?: number;
  /** Show preview of first N rows (default 3) */
  previewRows?: number;
  className?: string;
}

export default function SandboxFileImport({
  accept = ".csv",
  label = "导入数据",
  onImport,
  maxRows = 500,
  previewRows = 3,
  className = "",
}: SandboxFileImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [imported, setImported] = useState(false);

  const parseCSV = useCallback((text: string): string[][] => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split(",").map((cell) => cell.trim()));
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError("");
      setImported(false);
      setFileName(file.name);

      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        setError("Excel 文件请先另存为 CSV 格式再导入。Excel files: please save as CSV first.");
        setPreview(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const rows = parseCSV(text);

        if (rows.length > maxRows) {
          setError(`最多支持 ${maxRows} 行数据。Max ${maxRows} rows allowed.`);
          setPreview(rows.slice(0, previewRows));
          return;
        }

        setPreview(rows.slice(0, previewRows));
        onImport(rows, file.name);
        setImported(true);
      };
      reader.onerror = () => {
        setError("文件读取失败 File read error");
      };
      reader.readAsText(file, "utf-8");

      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [maxRows, previewRows, onImport, parseCSV]
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} />
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-3.5 w-3.5" />
        {label}
        <FileUp className="h-3 w-3 text-gray-600" />
      </Button>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {imported && !error && (
        <div className="flex items-center gap-1.5 text-xs text-green-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          已导入 {fileName}
        </div>
      )}

      {/* Preview table */}
      {preview && preview.length > 0 && (
        <div className="rounded border border-gray-800 overflow-x-auto">
          <table className="w-full text-[10px] text-gray-400">
            <tbody>
              {preview.map((row, ri) => (
                <tr key={ri} className={ri === 0 ? "bg-gray-800/50 font-semibold text-gray-300" : ""}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1 border-r border-gray-800 last:border-r-0 truncate max-w-[120px]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length >= previewRows && (
            <div className="text-center text-[9px] text-gray-600 py-1 border-t border-gray-800">
              显示前 {previewRows} 行预览 · Showing first {previewRows} rows
            </div>
          )}
        </div>
      )}
    </div>
  );
}
