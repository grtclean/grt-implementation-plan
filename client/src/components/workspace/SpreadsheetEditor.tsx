import { useState, useCallback, useRef, useEffect } from "react";
import { Save, Plus, Minus, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

interface SpreadsheetEditorProps {
  fileId: number;
  initialData: string[][];
  readOnly?: boolean;
  onSave?: () => void;
}

export default function SpreadsheetEditor({ fileId, initialData, readOnly, onSave }: SpreadsheetEditorProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<string[][]>(() =>
    initialData.length > 0 ? initialData.map(r => [...r]) : [["", "", ""]],
  );
  const [isDirty, setIsDirty] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const saveMutation = trpc.collaborationDocs.saveFile.useMutation();

  // Reset when file changes
  useEffect(() => {
    setData(initialData.length > 0 ? initialData.map(r => [...r]) : [["", "", ""]]);
    setIsDirty(false);
    setSelectedCell(null);
  }, [fileId, initialData]);

  const updateCell = useCallback((row: number, col: number, value: string) => {
    setData(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = value;
      return next;
    });
    setIsDirty(true);
  }, []);

  const addRow = useCallback(() => {
    setData(prev => [...prev, new Array(prev[0]?.length ?? 3).fill("")]);
    setIsDirty(true);
  }, []);

  const removeRow = useCallback(() => {
    if (data.length <= 1) return;
    setData(prev => prev.slice(0, -1));
    setIsDirty(true);
  }, [data.length]);

  const addColumn = useCallback(() => {
    setData(prev => prev.map(r => [...r, ""]));
    setIsDirty(true);
  }, []);

  const removeColumn = useCallback(() => {
    if ((data[0]?.length ?? 0) <= 1) return;
    setData(prev => prev.map(r => r.slice(0, -1)));
    setIsDirty(true);
  }, [data]);

  const handleSave = useCallback(async () => {
    try {
      await saveMutation.mutateAsync({ id: fileId, parsedContent: data });
      setIsDirty(false);
      onSave?.();
    } catch {
      // error handled by mutation
    }
  }, [fileId, data, saveMutation, onSave]);

  const handleReset = useCallback(() => {
    setData(initialData.length > 0 ? initialData.map(r => [...r]) : [["", "", ""]]);
    setIsDirty(false);
  }, [initialData]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const nextCol = e.shiftKey ? col - 1 : col + 1;
      const cols = data[0]?.length ?? 0;
      if (nextCol >= 0 && nextCol < cols) {
        setSelectedCell({ r: row, c: nextCol });
        const cell = tableRef.current?.querySelector(`[data-r="${row}"][data-c="${nextCol}"]`) as HTMLElement;
        cell?.focus();
      } else if (!e.shiftKey && row + 1 < data.length) {
        setSelectedCell({ r: row + 1, c: 0 });
        const cell = tableRef.current?.querySelector(`[data-r="${row + 1}"][data-c="0"]`) as HTMLElement;
        cell?.focus();
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (row + 1 < data.length) {
        setSelectedCell({ r: row + 1, c: col });
        const cell = tableRef.current?.querySelector(`[data-r="${row + 1}"][data-c="${col}"]`) as HTMLElement;
        cell?.focus();
      }
    }
    // Ctrl+S
    if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  }, [data, handleSave]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#edebe9] bg-[#faf9f8] shrink-0">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={addRow}>
            <Plus className="w-3 h-3 mr-1" />{t("workspace.addRow") || "添加行"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={removeRow} disabled={data.length <= 1}>
            <Minus className="w-3 h-3 mr-1" />{t("workspace.removeRow") || "删除行"}
          </Button>
          <div className="w-px h-4 bg-[#edebe9] mx-1" />
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={addColumn}>
            <Plus className="w-3 h-3 mr-1" />{t("workspace.addColumn") || "添加列"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={removeColumn} disabled={(data[0]?.length ?? 0) <= 1}>
            <Minus className="w-3 h-3 mr-1" />{t("workspace.removeColumn") || "删除列"}
          </Button>
          <div className="flex-1" />
          {isDirty && (
            <>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleReset}>
                <Undo2 className="w-3 h-3 mr-1" />{t("common.cancel") || "撤销"}
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-7 px-3 text-xs bg-[#0078d4]"
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                <Save className="w-3 h-3 mr-1" />{t("common.save") || "保存"}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table ref={tableRef} className="w-full border-collapse text-sm">
          <tbody>
            {data.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? "bg-[#f3f2f1] font-semibold" : "hover:bg-[#faf9f8]"}>
                {/* Row number */}
                <td className="w-8 text-center text-[10px] text-[#a19f9d] border border-[#edebe9] bg-[#faf9f8] select-none">
                  {ri + 1}
                </td>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    data-r={ri}
                    data-c={ci}
                    className={`border border-[#edebe9] px-2 py-1 min-w-[80px] max-w-[300px] outline-none ${
                      selectedCell?.r === ri && selectedCell?.c === ci
                        ? "ring-2 ring-[#0078d4] ring-inset"
                        : ""
                    }`}
                    contentEditable={!readOnly}
                    suppressContentEditableWarning
                    onFocus={() => setSelectedCell({ r: ri, c: ci })}
                    onBlur={(e) => {
                      const text = e.currentTarget.textContent ?? "";
                      if (text !== cell) updateCell(ri, ci, text);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, ri, ci)}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
