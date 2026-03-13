/**
 * WorkspaceEmbed — compact, self-contained workspace widget.
 *
 * Drop into any page to get a mini file browser with optional inline viewer.
 * Supports filtering by folder, file type, and custom height.
 *
 * Usage:
 *   // Mini file list (no viewer)
 *   <WorkspaceEmbed folderId={5} height={300} />
 *
 *   // With inline viewer side-by-side
 *   <WorkspaceEmbed showViewer height={400} />
 *
 *   // Filtered by file type
 *   <WorkspaceEmbed accept={["excel", "code"]} showViewer />
 *
 *   // Spreadsheet-only embed (directly shows the editor)
 *   <WorkspaceEmbed fileId={42} mode="editor" editorType="spreadsheet" />
 */
import { useState, useMemo, useCallback } from "react";
import {
  FileSpreadsheet, FileText, FileCode, FileType, Box,
  Image as ImageIcon, File, Folder, FolderOpen,
  Upload, Loader2, MoreVertical, Download, Pencil, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import type { ViewerFileType } from "./UniversalViewer";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

// ── Types ────────────────────────────────────────────────
export type EmbedMode = "browser" | "editor";
export type EditorType = "spreadsheet" | "richtext" | "code";

interface WorkspaceEmbedBaseProps {
  /** Fixed height in px. Default 360. */
  height?: number;
  /** CSS className for outer container. */
  className?: string;
  /** Show the file viewer panel alongside the list. Default false. */
  showViewer?: boolean;
  /** Only show files of these types. */
  accept?: ViewerFileType[];
  /** Limit to files in this folder. */
  folderId?: number;
  /** Show upload button. Default true. */
  allowUpload?: boolean;
  /** Show file action menu (rename/delete/download). Default true. */
  allowActions?: boolean;
  /** Callback when a file is selected. */
  onFileSelect?: (fileId: number, fileName: string, fileType: ViewerFileType) => void;
}

interface BrowserModeProps extends WorkspaceEmbedBaseProps {
  mode?: "browser";
  fileId?: never;
  editorType?: never;
}

interface EditorModeProps extends WorkspaceEmbedBaseProps {
  /** Directly render an editor for a specific file. */
  mode: "editor";
  fileId: number;
  editorType: EditorType;
}

type WorkspaceEmbedProps = BrowserModeProps | EditorModeProps;

// ── Helpers ──────────────────────────────────────────────
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
    case "excel": return <FileSpreadsheet className="w-3.5 h-3.5 text-green-600 shrink-0" />;
    case "word": return <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
    case "ppt": return <FileType className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
    case "code": return <FileCode className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
    case "cad": return <Box className="w-3.5 h-3.5 text-cyan-600 shrink-0" />;
    case "pdf": return <File className="w-3.5 h-3.5 text-red-500 shrink-0" />;
    case "image": return <ImageIcon className="w-3.5 h-3.5 text-pink-500 shrink-0" />;
    case "markdown": return <FileText className="w-3.5 h-3.5 text-[#0078d4] shrink-0" />;
  }
}

function readFileAsBase64(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Component ────────────────────────────────────────────
export default function WorkspaceEmbed(props: WorkspaceEmbedProps) {
  const {
    height = 360,
    className = "",
    showViewer = false,
    accept,
    folderId,
    allowUpload = true,
    allowActions = true,
    onFileSelect,
  } = props;

  const { t, language } = useLanguage();
  const isEn = language === "en";
  const utils = trpc.useUtils();

  // ── Data ──
  const filesQuery = trpc.collaborationDocs.listFiles.useQuery(
    folderId ? { folderId } : { allFiles: true },
    QUERY_OPTS,
  );
  const allFiles = (filesQuery.data?.items ?? []) as any[];

  const invalidate = useCallback(() => {
    utils.collaborationDocs.listFiles.invalidate();
    utils.collaborationDocs.listFolders.invalidate();
  }, [utils]);

  const uploadMut = trpc.collaborationDocs.uploadFile.useMutation({ onSuccess: invalidate });
  const deleteMut = trpc.collaborationDocs.deleteFile.useMutation({ onSuccess: invalidate });

  // ── File list ──
  interface EmbedFile { id: number; name: string; type: ViewerFileType; size: number; }
  const files: EmbedFile[] = useMemo(() => {
    return allFiles
      .map((f: any) => ({
        id: f.id,
        name: f.fileName ?? f.title ?? "",
        type: fileExtToViewerType(f.fileType ?? ""),
        size: Number(f.fileSize) || 0,
      }))
      .filter(f => !accept || accept.includes(f.type));
  }, [allFiles, accept]);

  // ── Selection ──
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedFile = useMemo(() => files.find(f => f.id === selectedId) ?? null, [files, selectedId]);

  // File detail for viewer
  const fileDetail = trpc.collaborationDocs.getFile.useQuery(
    { id: selectedId! },
    { enabled: showViewer && !!selectedId, ...QUERY_OPTS },
  );

  // ── Upload handler ──
  const [uploading, setUploading] = useState(false);
  const handleUpload = useCallback(async (fileList: FileList) => {
    setUploading(true);
    for (const file of Array.from(fileList)) {
      try {
        const base64 = await readFileAsBase64(file);
        await uploadMut.mutateAsync({
          fileName: file.name,
          fileData: base64,
          contentType: file.type || "application/octet-stream",
          folderId: folderId ?? null,
        });
      } catch { /* continue */ }
    }
    setUploading(false);
  }, [uploadMut, folderId]);

  const handleDownload = useCallback(async (fileId: number) => {
    try {
      const result = await utils.collaborationDocs.downloadFile.fetch({ id: fileId });
      if (result?.url) window.open(result.url, "_blank");
    } catch { /* silent */ }
  }, [utils]);

  // ── Editor mode — lazy-load the specific editor ──
  if (props.mode === "editor") {
    return (
      <div className={`border rounded-lg overflow-hidden bg-white ${className}`} style={{ height }}>
        <EditorEmbed fileId={props.fileId} editorType={props.editorType} height={height} />
      </div>
    );
  }

  // ── Browser mode ──
  return (
    <div className={`border rounded-lg overflow-hidden bg-white flex ${className}`} style={{ height }}>
      {/* File list panel */}
      <div className={`flex flex-col ${showViewer ? "w-[240px] border-r border-[#edebe9]" : "flex-1"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#edebe9] bg-[#faf9f8] shrink-0">
          <span className="text-xs font-medium text-[#605e5c]">
            {isEn ? "Files" : "文件"} ({files.length})
          </span>
          {allowUpload && (
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" asChild disabled={uploading}>
                <span>
                  {uploading
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Upload className="w-3 h-3" />}
                </span>
              </Button>
            </label>
          )}
        </div>

        {/* File rows */}
        <div className="flex-1 overflow-y-auto">
          {files.length === 0 && (
            <div className="flex items-center justify-center h-full text-xs text-[#a19f9d]">
              {t("workspace.noFiles") || "暂无文件"}
            </div>
          )}
          {files.map(file => (
            <div
              key={file.id}
              className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[#f3f2f1] transition-colors ${
                selectedId === file.id ? "bg-[#deecf9]" : ""
              }`}
              onClick={() => {
                setSelectedId(file.id);
                onFileSelect?.(file.id, file.name, file.type);
              }}
            >
              {getFileIcon(file.type)}
              <span className="text-xs text-[#323130] truncate flex-1">{file.name}</span>
              {allowActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-3 h-3 text-[#a19f9d]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem onClick={() => handleDownload(file.id)}>
                      <Download className="w-3 h-3 mr-2" />{t("workspace.download") || "下载"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => deleteMut.mutate({ id: file.id })}
                      className="text-red-600"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />{t("workspace.delete") || "删除"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Viewer panel */}
      {showViewer && (
        <div className="flex-1 overflow-hidden">
          {selectedFile ? (
            <EmbedViewer
              fileId={selectedFile.id}
              fileName={selectedFile.name}
              fileType={selectedFile.type}
              parsedContent={fileDetail.data?.parsedContent}
              height={height}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-[#faf9f8]">
              <p className="text-xs text-[#a19f9d]">{isEn ? "Select a file" : "选择文件以预览"}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Inline mini-viewer (avoids importing full UniversalViewer + Monaco bundle) ──
function EmbedViewer({ fileId, fileName, fileType, parsedContent, height }: {
  fileId: number; fileName: string; fileType: ViewerFileType;
  parsedContent?: any; height: number;
}) {
  // For spreadsheet, render inline table
  if (fileType === "excel" && Array.isArray(parsedContent)) {
    const data = parsedContent as string[][];
    return (
      <div className="h-full overflow-auto">
        <table className="w-full border-collapse text-xs">
          <tbody>
            {data.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? "bg-[#f3f2f1] font-semibold sticky top-0" : "hover:bg-[#faf9f8]"}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-[#edebe9] px-2 py-1 min-w-[60px] max-w-[200px] truncate">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // For richtext, render HTML
  if (fileType === "word" && parsedContent?.html) {
    return (
      <div className="h-full overflow-auto p-4">
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: parsedContent.html }}
        />
      </div>
    );
  }

  // For code, render preformatted text
  if (fileType === "code") {
    const text = parsedContent?.text ?? "";
    return (
      <div className="h-full overflow-auto bg-[#1e1e1e] p-4">
        <pre className="text-xs text-[#d4d4d4] font-mono whitespace-pre-wrap">{text}</pre>
      </div>
    );
  }

  // Generic fallback
  return (
    <div className="h-full flex items-center justify-center bg-[#faf9f8]">
      <div className="text-center space-y-2">
        <File className="w-10 h-10 mx-auto text-[#c8c6c4]" />
        <p className="text-xs text-[#605e5c]">{fileName}</p>
        <p className="text-[10px] text-[#a19f9d]">{fileType.toUpperCase()}</p>
      </div>
    </div>
  );
}

// ── Inline editor (lazy loads the actual editor component) ──
import { lazy, Suspense } from "react";
const LazySpreadsheet = lazy(() => import("./SpreadsheetEditor"));
const LazyRichText = lazy(() => import("./RichTextEditor"));

function EditorEmbed({ fileId, editorType, height }: {
  fileId: number; editorType: EditorType; height: number;
}) {
  const fileDetail = trpc.collaborationDocs.getFile.useQuery({ id: fileId }, QUERY_OPTS);
  const pc = fileDetail.data?.parsedContent;

  if (fileDetail.isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#0078d4]" />
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0078d4]" /></div>}>
      {editorType === "spreadsheet" && (
        <LazySpreadsheet
          fileId={fileId}
          initialData={Array.isArray(pc) ? pc : [["", "", ""]]}
        />
      )}
      {editorType === "richtext" && (
        <LazyRichText
          fileId={fileId}
          initialContent={pc?.html ?? ""}
        />
      )}
      {editorType === "code" && (
        <div className="h-full flex items-center justify-center text-sm text-[#605e5c]">
          Code editor — use UniversalViewer for full Monaco experience
        </div>
      )}
    </Suspense>
  );
}
