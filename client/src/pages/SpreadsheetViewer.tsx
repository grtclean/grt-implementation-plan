/**
 * Smart Spreadsheet Viewer — GRT智能表格
 *
 * Excel-like web UI for viewing and editing spreadsheet data inline.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Save,
  Share2,
  Sparkles,
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert column index (0-based) to Excel-style letter (A, B, C, ..., Z, AA) */
function colLetter(idx: number): string {
  let s = "";
  let n = idx;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SpreadsheetViewer() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const fileId = Number(params.id);

  // Fetch file data from tRPC
  const fileQuery = trpc.collaborationDocs.getFile.useQuery(
    { id: fileId },
    { enabled: fileId > 0 }
  );
  const fileData = fileQuery.data as any;

  // Grid state: 2D array of strings, initialized from server or empty
  const [grid, setGrid] = useState<string[][] | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());

  // Initialize grid from fetched data
  useEffect(() => {
    if (fileData?.parsedContent && !grid) {
      // Deep copy to make it mutable
      setGrid(fileData.parsedContent.map((row: string[]) => [...row]));
    }
  }, [fileData, grid]);

  // For unknown/local files, show empty grid
  useEffect(() => {
    if (fileId <= 0 && !grid) {
      const emptyGrid: string[][] = [
        ["Column A", "Column B", "Column C", "Column D"],
        ...Array.from({ length: 10 }, () => ["", "", "", ""]),
      ];
      setGrid(emptyGrid);
    }
  }, [fileId, grid]);

  // Cell update handler
  const updateCell = useCallback((row: number, col: number, value: string) => {
    setGrid((prev) => {
      if (!prev) return prev;
      const next = prev.map((r) => [...r]);
      // Ensure row exists
      while (next.length <= row) next.push(Array(next[0]?.length ?? 4).fill(""));
      while (next[row].length <= col) next[row].push("");
      next[row][col] = value;
      return next;
    });
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, row: number, col: number) => {
    if (!grid) return;
    const maxRow = grid.length - 1;
    const maxCol = (grid[0]?.length ?? 1) - 1;

    if (e.key === "Tab") {
      e.preventDefault();
      const nextCol = e.shiftKey ? Math.max(0, col - 1) : Math.min(maxCol, col + 1);
      setSelectedCell({ row, col: nextCol });
      setEditingCell(null);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (editingCell) {
        // Commit edit, move down
        setEditingCell(null);
        setSelectedCell({ row: Math.min(maxRow, row + 1), col });
      } else {
        setEditingCell({ row, col });
      }
    } else if (e.key === "Escape") {
      setEditingCell(null);
    } else if (!editingCell) {
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedCell({ row: Math.max(1, row - 1), col }); }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedCell({ row: Math.min(maxRow, row + 1), col }); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setSelectedCell({ row, col: Math.max(0, col - 1) }); }
      if (e.key === "ArrowRight") { e.preventDefault(); setSelectedCell({ row, col: Math.min(maxCol, col + 1) }); }
    }
  }, [grid, editingCell]);

  // Auto-focus when editing starts
  useEffect(() => {
    if (editingCell) {
      const key = `${editingCell.row}-${editingCell.col}`;
      const cell = cellRefs.current.get(key);
      if (cell) cell.focus();
    }
  }, [editingCell]);

  // Save mutation
  const saveMutation = trpc.collaborationDocs.saveFile.useMutation({
    onSuccess: () => toast.success("Changes saved to database"),
    onError: (err) => toast.error(`Save failed: ${err.message}`),
  });

  const handleSave = useCallback(() => {
    if (!grid || fileId <= 0) {
      toast.info("No file to save");
      return;
    }
    saveMutation.mutate({ id: fileId, parsedContent: grid });
  }, [grid, fileId, saveMutation]);

  // Derived
  const fileName = fileData?.title ?? (fileId <= 0 ? "New Spreadsheet" : `File #${fileId}`);
  const selectedValue = selectedCell && grid
    ? grid[selectedCell.row]?.[selectedCell.col] ?? ""
    : "";
  const selectedRef = selectedCell
    ? `${colLetter(selectedCell.col)}${selectedCell.row + 1}`
    : "";
  const numCols = grid?.[0]?.length ?? 4;

  if (fileId > 0 && fileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ─── Top Ribbon ─── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/collaboration-docs")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <FileSpreadsheet className="w-5 h-5 text-green-500" />
          <span className="text-sm font-semibold text-foreground truncate max-w-[300px]">
            {fileName}
          </span>
          {fileData?.fileType && (
            <Badge variant="secondary" className="text-[10px] uppercase">
              {fileData.fileType}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => toast.info("Share link copied")}>
            <Share2 className="w-3.5 h-3.5" />
            Share
          </Button>
          <Button size="sm" className="gap-1.5 h-8" onClick={() => toast.info("AI analysis started for this spreadsheet")}>
            <Sparkles className="w-3.5 h-3.5" />
            AI Analyze
          </Button>
        </div>
      </div>

      {/* ─── Formula Bar ─── */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-background text-sm">
        <div className="w-14 text-center font-mono text-xs bg-muted/50 rounded px-2 py-0.5 border border-border text-foreground">
          {selectedRef || "A1"}
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex-1 font-mono text-xs text-muted-foreground truncate">
          {selectedValue || "\u00A0"}
        </div>
      </div>

      {/* ─── Spreadsheet Grid ─── */}
      <div className="flex-1 overflow-auto">
        {!grid ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="border-collapse w-full" style={{ minWidth: numCols * 180 + 48 }}>
            {/* Column headers */}
            <thead className="sticky top-0 z-10">
              <tr>
                {/* Row number corner */}
                <th className="w-12 min-w-[48px] bg-muted/60 border border-border text-[10px] font-semibold text-muted-foreground text-center py-1">
                  {/* empty corner */}
                </th>
                {Array.from({ length: numCols }, (_, ci) => (
                  <th
                    key={ci}
                    className={`min-w-[180px] bg-muted/60 border border-border text-[10px] font-semibold text-center py-1 select-none ${
                      selectedCell?.col === ci ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {colLetter(ci)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, ri) => (
                <tr key={ri}>
                  {/* Row number */}
                  <td
                    className={`text-center text-[10px] font-semibold border border-border bg-muted/40 select-none ${
                      selectedCell?.row === ri ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {ri + 1}
                  </td>
                  {row.map((cell, ci) => {
                    const isSelected = selectedCell?.row === ri && selectedCell?.col === ci;
                    const isEditing = editingCell?.row === ri && editingCell?.col === ci;
                    const isHeader = ri === 0;
                    return (
                      <td
                        key={ci}
                        ref={(el) => {
                          if (el) cellRefs.current.set(`${ri}-${ci}`, el);
                        }}
                        className={`border border-border px-2 py-1 text-sm outline-none transition-shadow ${
                          isHeader
                            ? "font-semibold bg-muted/30 text-foreground"
                            : "text-foreground"
                        } ${
                          isSelected
                            ? "ring-2 ring-primary ring-inset bg-primary/5"
                            : "hover:bg-muted/20"
                        }`}
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        tabIndex={0}
                        onClick={() => {
                          setSelectedCell({ row: ri, col: ci });
                          if (editingCell?.row !== ri || editingCell?.col !== ci) {
                            setEditingCell(null);
                          }
                        }}
                        onDoubleClick={() => {
                          setSelectedCell({ row: ri, col: ci });
                          setEditingCell({ row: ri, col: ci });
                        }}
                        onBlur={(e) => {
                          if (isEditing) {
                            updateCell(ri, ci, e.currentTarget.textContent ?? "");
                            setEditingCell(null);
                          }
                        }}
                        onKeyDown={(e) => handleKeyDown(e, ri, ci)}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Status Bar ─── */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{grid ? grid.length : 0} rows</span>
          <span>{numCols} columns</span>
        </div>
        <span>GRT Smart Spreadsheet</span>
      </div>
    </div>
  );
}
