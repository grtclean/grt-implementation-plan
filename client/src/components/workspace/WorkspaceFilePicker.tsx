/**
 * WorkspaceFilePicker — modal dialog for browsing & selecting workspace files.
 *
 * Usage:
 *   <WorkspaceFilePicker
 *     open={showPicker}
 *     onOpenChange={setShowPicker}
 *     onSelect={(file) => { console.log(file.id, file.name); }}
 *     accept={["excel", "code"]}      // optional filter
 *     multiple={false}                 // single select by default
 *   />
 */
import { useState, useMemo, useCallback } from "react";
import {
  Folder, FolderOpen, ChevronRight, ChevronDown, Search,
  FileSpreadsheet, FileText, FileCode, FileType, Box, Image as ImageIcon, File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import type { ViewerFileType } from "./UniversalViewer";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

export interface PickedFile {
  id: number;
  name: string;
  type: ViewerFileType;
  folderId: number | null;
}

interface WorkspaceFilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when user confirms selection. */
  onSelect: (files: PickedFile[]) => void;
  /** Only show files of these types. Omit to show all. */
  accept?: ViewerFileType[];
  /** Allow multi-select. Default false. */
  multiple?: boolean;
  /** Dialog title override. */
  title?: string;
}

function fileExtToViewerType(ext: string): ViewerFileType {
  switch (ext.toLowerCase()) {
    case "xlsx": case "xls": case "csv": return "excel";
    case "docx": case "doc": return "word";
    case "pptx": case "ppt": return "ppt";
    case "pdf": return "pdf";
    case "png": case "jpg": case "jpeg": case "gif": case "svg": case "bmp": case "webp": case "tiff": return "image";
    case "step": case "stp": case "dxf": case "dwg": case "iges": case "igs":
    case "sldprt": case "sldasm": case "slddrw":
    case "elc": case "zw1": case "epl":
    case "vpp": case "job":
      return "cad";
    case "md": case "markdown": return "markdown";
    case "tp": case "ls":
    case "src": case "dat": case "krl":
    case "mod": case "prg":
    case "nc": case "gcode": case "tap": case "ngc":
    default: return "code";
  }
}

function getFileIcon(type: ViewerFileType) {
  switch (type) {
    case "excel": return <FileSpreadsheet className="w-4 h-4 text-green-600 shrink-0" />;
    case "word": return <FileText className="w-4 h-4 text-blue-600 shrink-0" />;
    case "ppt": return <FileType className="w-4 h-4 text-orange-500 shrink-0" />;
    case "code": return <FileCode className="w-4 h-4 text-purple-500 shrink-0" />;
    case "cad": return <Box className="w-4 h-4 text-cyan-600 shrink-0" />;
    case "pdf": return <File className="w-4 h-4 text-red-500 shrink-0" />;
    case "image": return <ImageIcon className="w-4 h-4 text-pink-500 shrink-0" />;
    case "markdown": return <FileText className="w-4 h-4 text-[#0078d4] shrink-0" />;
  }
}

export default function WorkspaceFilePicker({
  open, onOpenChange, onSelect, accept, multiple = false, title,
}: WorkspaceFilePickerProps) {
  const { t, language } = useLanguage();
  const isEn = language === "en";

  const foldersQuery = trpc.collaborationDocs.listFolders.useQuery(undefined, { ...QUERY_OPTS, enabled: open });
  const filesQuery = trpc.collaborationDocs.listFiles.useQuery({ allFiles: true }, { ...QUERY_OPTS, enabled: open });

  const folders = (foldersQuery.data ?? []) as any[];
  const allFiles = (filesQuery.data?.items ?? []) as any[];

  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  // Build file list
  const fileItems: PickedFile[] = useMemo(() => {
    return allFiles.map((f: any) => ({
      id: f.id,
      name: f.fileName ?? f.title ?? "",
      type: fileExtToViewerType(f.fileType ?? ""),
      folderId: f.folderId ?? null,
    })).filter(f => {
      if (accept && !accept.includes(f.type)) return false;
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allFiles, accept, search]);

  // Group by folder
  const rootFiles = useMemo(() => fileItems.filter(f => !f.folderId), [fileItems]);
  const folderFileMap = useMemo(() => {
    const m = new Map<number, PickedFile[]>();
    for (const f of fileItems) {
      if (f.folderId) {
        const arr = m.get(f.folderId) ?? [];
        arr.push(f);
        m.set(f.folderId, arr);
      }
    }
    return m;
  }, [fileItems]);

  const toggleFolder = (id: number) => {
    setExpandedFolders(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const toggleSelect = useCallback((id: number) => {
    setSelected(prev => {
      if (multiple) {
        const s = new Set(prev);
        if (s.has(id)) s.delete(id); else s.add(id);
        return s;
      }
      return new Set([id]);
    });
  }, [multiple]);

  const handleConfirm = () => {
    const picked = fileItems.filter(f => selected.has(f.id));
    if (picked.length > 0) {
      onSelect(picked);
      setSelected(new Set());
      onOpenChange(false);
    }
  };

  const renderFileRow = (file: PickedFile, indent: number) => (
    <button
      key={file.id}
      className={`w-full flex items-center gap-2 py-1.5 text-sm hover:bg-[#f3f2f1] transition-colors ${
        selected.has(file.id) ? "bg-[#deecf9]" : ""
      }`}
      style={{ paddingLeft: indent }}
      onClick={() => toggleSelect(file.id)}
    >
      {getFileIcon(file.type)}
      <span className="truncate text-[#323130]">{file.name}</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title || (isEn ? "Select File" : "选择文件")}</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-[#a19f9d]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isEn ? "Search files..." : "搜索文件..."}
            className="pl-8 h-9"
          />
        </div>

        {/* File tree */}
        <div className="flex-1 overflow-y-auto border rounded-md min-h-[200px] max-h-[360px]">
          {/* Root files */}
          {rootFiles.map(f => renderFileRow(f, 12))}

          {/* Folder groups */}
          {folders.map((folder: any) => {
            const files = folderFileMap.get(folder.id) ?? [];
            if (files.length === 0 && search) return null;
            const isExpanded = expandedFolders.has(folder.id);
            return (
              <div key={folder.id}>
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#323130] hover:bg-[#f3f2f1]"
                  onClick={() => toggleFolder(folder.id)}
                >
                  {isExpanded
                    ? <ChevronDown className="w-3.5 h-3.5 text-[#a19f9d] shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-[#a19f9d] shrink-0" />}
                  {isExpanded
                    ? <FolderOpen className="w-4 h-4 text-[#ffb900] shrink-0" />
                    : <Folder className="w-4 h-4 text-[#ffb900] shrink-0" />}
                  <span className="truncate">{folder.name}</span>
                  <span className="text-xs text-[#a19f9d] ml-auto">{files.length}</span>
                </button>
                {isExpanded && files.map(f => renderFileRow(f, 40))}
              </div>
            );
          })}

          {fileItems.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-[#a19f9d]">
              {isEn ? "No files found" : "未找到文件"}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel") || "取消"}
          </Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0}>
            {isEn ? `Select (${selected.size})` : `选择 (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
