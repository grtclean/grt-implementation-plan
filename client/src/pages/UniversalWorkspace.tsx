import { useState, useMemo, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  List,
  LayoutGrid,
  FileText as FileTextIcon,
  FolderOpen,
  Folder,
  FileSpreadsheet,
  FileCode,
  FileType,
  Box,
  Image as ImageIcon,
  File,
  Factory,
  Shield,
  FlaskConical,
  Truck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import BrandLogo from "@/components/common/BrandLogo";
import UniversalViewer, { type ViewerFileType } from "@/components/workspace/UniversalViewer";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

// ────────────────── Types ──────────────────

interface WorkspaceFile {
  id: number;
  name: string;
  type: ViewerFileType;
  size: string;
  modified: string;
  url: string;
}

interface WorkspaceFolder {
  id: number;
  name: string;
  files: WorkspaceFile[];
}

interface WorkspaceSpace {
  id: number;
  name: string;
  icon: typeof Factory;
  color: string;
  folders: WorkspaceFolder[];
}

// ────────────────── Space icon/color config (by index) ──────────────────
const SPACE_CONFIG = [
  { icon: Factory, color: "#0078d4" },
  { icon: Shield, color: "#107c10" },
  { icon: FlaskConical, color: "#8764b8" },
  { icon: Truck, color: "#d83b01" },
  { icon: Factory, color: "#005a9e" },
  { icon: Shield, color: "#0e6027" },
];

function fileExtToViewerType(ext: string): ViewerFileType {
  switch (ext.toLowerCase()) {
    case "xlsx": case "xls": case "csv": return "excel";
    case "docx": case "doc": return "word";
    case "pptx": case "ppt": return "ppt";
    case "pdf": return "pdf";
    case "png": case "jpg": case "jpeg": case "gif": case "svg": return "image";
    case "step": case "stp": case "dxf": case "dwg": return "cad";
    default: return "code";
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ────────────────── File Icon Helper ──────────────────

function getFileIcon(type: ViewerFileType) {
  switch (type) {
    case "excel": return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
    case "word": return <FileTextIcon className="w-4 h-4 text-blue-600" />;
    case "ppt": return <FileType className="w-4 h-4 text-orange-500" />;
    case "code": return <FileCode className="w-4 h-4 text-purple-500" />;
    case "cad": return <Box className="w-4 h-4 text-cyan-600" />;
    case "pdf": return <File className="w-4 h-4 text-red-500" />;
    case "image": return <ImageIcon className="w-4 h-4 text-pink-500" />;
  }
}

// ────────────────── View Modes ──────────────────

type ViewMode = "list" | "board" | "doc";

// ────────────────── Component ──────────────────

export default function UniversalWorkspace() {
  const { language } = useLanguage();
  const isEn = language === "en";

  // ─── tRPC queries ───
  const foldersQuery = trpc.collaborationDocs.listFolders.useQuery(undefined, QUERY_OPTS);
  const allFilesQuery = trpc.collaborationDocs.listFiles.useQuery(undefined, QUERY_OPTS);

  const topFolders = (foldersQuery.data ?? []) as any[];
  const allFiles = (allFilesQuery.data?.items ?? []) as any[];

  // Build workspace tree: top-level folders → spaces, files → per folder
  const spaces: WorkspaceSpace[] = useMemo(() => {
    return topFolders.map((folder: any, idx: number) => {
      const cfg = SPACE_CONFIG[idx % SPACE_CONFIG.length];
      const folderFiles: WorkspaceFile[] = allFiles
        .filter((f: any) => f.folderId === folder.id)
        .map((f: any) => ({
          id: f.id,
          name: f.fileName ?? f.title,
          type: fileExtToViewerType(f.fileType ?? ""),
          size: formatFileSize(Number(f.fileSize) || 0),
          modified: f.modifiedAt ? new Date(f.modifiedAt).toLocaleDateString("zh-CN") : "-",
          url: "",
        }));
      // Also show root-level files (folderId IS NULL) in first space
      const rootFiles: WorkspaceFile[] = idx === 0
        ? allFiles
            .filter((f: any) => !f.folderId)
            .map((f: any) => ({
              id: f.id,
              name: f.fileName ?? f.title,
              type: fileExtToViewerType(f.fileType ?? ""),
              size: formatFileSize(Number(f.fileSize) || 0),
              modified: f.modifiedAt ? new Date(f.modifiedAt).toLocaleDateString("zh-CN") : "-",
              url: "",
            }))
        : [];
      return {
        id: folder.id,
        name: folder.name,
        icon: cfg.icon,
        color: cfg.color,
        folders: [
          ...(rootFiles.length > 0 ? [{ id: 0, name: isEn ? "Root Files" : "根目录文件", files: rootFiles }] : []),
          { id: folder.id, name: folder.name, files: folderFiles },
        ],
      };
    });
  }, [topFolders, allFiles, isEn]);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedSpaces, setExpandedSpaces] = useState<Set<number>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  // Selection state
  const [selectedSpaceId, setSelectedSpaceId] = useState<number>(0);
  const [selectedFolderId, setSelectedFolderId] = useState<number>(0);
  const [selectedFileId, setSelectedFileId] = useState<number>(0);

  // Auto-select first space on load
  useEffect(() => {
    if (spaces.length > 0 && selectedSpaceId === 0) {
      const firstSpace = spaces[0];
      setSelectedSpaceId(firstSpace.id);
      setExpandedSpaces(new Set([firstSpace.id]));
      if (firstSpace.folders[0]) {
        setSelectedFolderId(firstSpace.folders[0].id);
        setExpandedFolders(new Set([firstSpace.folders[0].id]));
        if (firstSpace.folders[0].files[0]) {
          setSelectedFileId(firstSpace.folders[0].files[0].id);
        }
      }
    }
  }, [spaces, selectedSpaceId]);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Derived
  const selectedSpace = useMemo(() => spaces.find(s => s.id === selectedSpaceId), [spaces, selectedSpaceId]);
  const selectedFolder = useMemo(
    () => selectedSpace?.folders.find(f => f.id === selectedFolderId),
    [selectedSpace, selectedFolderId],
  );
  const selectedFile = useMemo(() => {
    for (const space of spaces) {
      for (const folder of space.folders) {
        const file = folder.files.find(f => f.id === selectedFileId);
        if (file) return file;
      }
    }
    return null;
  }, [spaces, selectedFileId]);

  // Active folder files
  const activeFiles = useMemo(() => selectedFolder?.files ?? [], [selectedFolder]);

  const isLoading = foldersQuery.isLoading || allFilesQuery.isLoading;

  // ─── Tree toggle helpers ───
  const toggleSpace = (id: number) => {
    setExpandedSpaces(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleFolder = (id: number) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /** Navigate to a folder. Pass `fileId` to select a specific file, otherwise selects the first file. */
  const selectFolder = (spaceId: number, folderId: number, fileId?: number) => {
    setSelectedSpaceId(spaceId);
    setSelectedFolderId(folderId);
    // Auto-expand
    setExpandedSpaces(prev => new Set(prev).add(spaceId));
    setExpandedFolders(prev => new Set(prev).add(folderId));
    // Select specific file or fallback to first
    if (fileId) {
      setSelectedFileId(fileId);
    } else {
      const space = spaces.find(s => s.id === spaceId);
      const folder = space?.folders.find(f => f.id === folderId);
      if (folder?.files[0]) setSelectedFileId(folder.files[0].id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-57px)] bg-[#faf9f8] overflow-hidden">
        <div className="w-60 border-r border-[#edebe9] bg-white p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0078d4]" />
        </div>
      </div>
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="flex h-[calc(100vh-57px)] bg-[#faf9f8] items-center justify-center">
        <div className="text-center space-y-3">
          <FolderOpen className="w-16 h-16 mx-auto text-[#c8c6c4]" />
          <p className="text-[#605e5c] text-sm">{isEn ? "No workspace folders found" : "暂无工作区文件夹"}</p>
          <p className="text-[#a19f9d] text-xs">{isEn ? "Create folders to organize your documents" : "创建文件夹以组织您的文档"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-57px)] bg-[#faf9f8] overflow-hidden">
      {/* ═══════════ Left Sidebar ═══════════ */}
      <div
        className="flex flex-col border-r border-[#edebe9] bg-white transition-all duration-200 shrink-0"
        style={{ width: sidebarCollapsed ? 48 : 240 }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-[#edebe9]">
          {!sidebarCollapsed && <BrandLogo size="sm" variant="full" />}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 shrink-0"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-[#605e5c]" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-[#605e5c]" />
            )}
          </Button>
        </div>

        {/* Tree navigation */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
            {spaces.map(space => {
              const SpaceIcon = space.icon;
              const isExpanded = expandedSpaces.has(space.id);
              return (
                <div key={space.id}>
                  {/* Space header */}
                  <button
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[#f3f2f1] transition-colors ${
                      selectedSpaceId === space.id ? "bg-[#edebe9]" : ""
                    }`}
                    onClick={() => {
                      toggleSpace(space.id);
                      setSelectedSpaceId(space.id);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#a19f9d] shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#a19f9d] shrink-0" />
                    )}
                    <SpaceIcon className="w-4 h-4 shrink-0" style={{ color: space.color }} />
                    <span className="truncate text-[#323130] font-medium">
                      {space.name}
                    </span>
                  </button>

                  {/* Folders */}
                  {isExpanded && space.folders.map(folder => {
                    const isFolderExpanded = expandedFolders.has(folder.id);
                    const isFolderSelected = selectedFolderId === folder.id && selectedSpaceId === space.id;
                    return (
                      <div key={folder.id}>
                        <button
                          className={`w-full flex items-center gap-2 pl-7 pr-3 py-1 text-sm hover:bg-[#f3f2f1] transition-colors ${
                            isFolderSelected ? "bg-[#deecf9]" : ""
                          }`}
                          onClick={() => {
                            toggleFolder(folder.id);
                            selectFolder(space.id, folder.id);
                          }}
                        >
                          {isFolderExpanded ? (
                            <ChevronDown className="w-3 h-3 text-[#a19f9d] shrink-0" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-[#a19f9d] shrink-0" />
                          )}
                          {isFolderExpanded ? (
                            <FolderOpen className="w-4 h-4 text-[#ffb900] shrink-0" />
                          ) : (
                            <Folder className="w-4 h-4 text-[#ffb900] shrink-0" />
                          )}
                          <span className="truncate text-[#323130] text-xs">
                            {folder.name}
                          </span>
                        </button>

                        {/* File list in tree */}
                        {isFolderExpanded && folder.files.map(file => (
                          <button
                            key={file.id}
                            className={`w-full flex items-center gap-2 pl-14 pr-3 py-0.5 text-xs hover:bg-[#f3f2f1] transition-colors ${
                              selectedFileId === file.id ? "bg-[#deecf9] text-[#0078d4]" : "text-[#605e5c]"
                            }`}
                            onClick={() => selectFolder(space.id, folder.id, file.id)}
                          >
                            {getFileIcon(file.type)}
                            <span className="truncate">{file.name}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Collapsed icons */}
        {sidebarCollapsed && (
          <div className="flex-1 flex flex-col items-center gap-2 py-3">
            {spaces.map(space => {
              const SpaceIcon = space.icon;
              return (
                <button
                  key={space.id}
                  className={`w-8 h-8 rounded flex items-center justify-center hover:bg-[#f3f2f1] ${
                    selectedSpaceId === space.id ? "bg-[#deecf9]" : ""
                  }`}
                  title={space.name}
                  onClick={() => {
                    setSelectedSpaceId(space.id);
                    setSidebarCollapsed(false);
                    setExpandedSpaces(prev => new Set(prev).add(space.id));
                  }}
                >
                  <SpaceIcon className="w-4 h-4" style={{ color: space.color }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════ Main Content ═══════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar: breadcrumb + view toggles */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#edebe9] bg-white shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm text-[#605e5c] min-w-0">
            <span className="text-[#0078d4] font-medium truncate">
              {selectedSpace?.name ?? ""}
            </span>
            <ChevronRight className="w-3 h-3 shrink-0 text-[#a19f9d]" />
            <span className="truncate">
              {selectedFolder?.name ?? ""}
            </span>
            {selectedFile && (
              <>
                <ChevronRight className="w-3 h-3 shrink-0 text-[#a19f9d]" />
                <span className="text-[#323130] font-medium truncate">{selectedFile.name}</span>
              </>
            )}
          </div>

          {/* View toggles */}
          <div className="flex items-center gap-0.5 bg-[#f3f2f1] rounded-md p-0.5">
            {([
              { mode: "list" as ViewMode, icon: List, label: "List" },
              { mode: "board" as ViewMode, icon: LayoutGrid, label: "Board" },
              { mode: "doc" as ViewMode, icon: FileTextIcon, label: "Doc" },
            ]).map(({ mode, icon: Icon, label }) => (
              <Button
                key={mode}
                variant="ghost"
                size="sm"
                className={`h-7 px-2 text-xs ${viewMode === mode ? "bg-white shadow-sm text-[#0078d4]" : "text-[#605e5c]"}`}
                onClick={() => setViewMode(mode)}
              >
                <Icon className="w-3.5 h-3.5 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Split pane: file list + viewer */}
        <div className="flex-1 min-h-0">
          <ResizablePanelGroup direction="horizontal">
            {/* File list panel */}
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
              <div className="h-full flex flex-col bg-white border-r border-[#edebe9]">
                {/* File list header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#edebe9] text-xs text-[#a19f9d] font-medium">
                  <span>{isEn ? "NAME" : "文件名"}</span>
                  <span>{isEn ? "MODIFIED" : "修改日期"}</span>
                </div>

                {/* File entries */}
                <div className="flex-1 overflow-y-auto">
                  {viewMode === "list" && activeFiles.map(file => (
                    <button
                      key={file.id}
                      className={`w-full flex items-center justify-between px-3 py-2 hover:bg-[#f3f2f1] transition-colors border-b border-[#faf9f8] ${
                        selectedFileId === file.id ? "bg-[#deecf9]" : ""
                      }`}
                      onClick={() => setSelectedFileId(file.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(file.type)}
                        <div className="min-w-0 text-left">
                          <p className={`text-sm truncate ${selectedFileId === file.id ? "text-[#0078d4] font-medium" : "text-[#323130]"}`}>
                            {file.name}
                          </p>
                          <p className="text-xs text-[#a19f9d]">{file.size}</p>
                        </div>
                      </div>
                      <span className="text-xs text-[#a19f9d] shrink-0 ml-2">{file.modified}</span>
                    </button>
                  ))}

                  {viewMode === "board" && (
                    <div className="grid grid-cols-2 gap-2 p-3">
                      {activeFiles.map(file => (
                        <button
                          key={file.id}
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
                            selectedFileId === file.id
                              ? "border-[#0078d4] bg-[#deecf9]"
                              : "border-[#edebe9] hover:border-[#c8c6c4] bg-white"
                          }`}
                          onClick={() => setSelectedFileId(file.id)}
                        >
                          <div className="w-10 h-10 rounded-lg bg-[#f3f2f1] flex items-center justify-center">
                            {getFileIcon(file.type)}
                          </div>
                          <p className="text-xs text-[#323130] truncate w-full text-center">{file.name}</p>
                          <p className="text-[10px] text-[#a19f9d]">{file.size}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {viewMode === "doc" && (
                    <div className="p-3 space-y-2">
                      {activeFiles.map(file => (
                        <button
                          key={file.id}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                            selectedFileId === file.id
                              ? "border-[#0078d4] bg-[#deecf9]"
                              : "border-[#edebe9] hover:border-[#c8c6c4] bg-white"
                          }`}
                          onClick={() => setSelectedFileId(file.id)}
                        >
                          {getFileIcon(file.type)}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-[#323130] font-medium truncate">{file.name}</p>
                            <p className="text-xs text-[#a19f9d]">{file.size} &middot; {file.modified}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Viewer panel */}
            <ResizablePanel defaultSize={70}>
              {selectedFile ? (
                <UniversalViewer
                  fileUrl={selectedFile.url}
                  fileType={selectedFile.type}
                  fileName={selectedFile.name}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-[#faf9f8]">
                  <div className="text-center space-y-2">
                    <FileTextIcon className="w-12 h-12 mx-auto text-[#c8c6c4]" />
                    <p className="text-[#605e5c] text-sm">
                      {isEn ? "Select a file to preview" : "选择文件以预览"}
                    </p>
                  </div>
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}
