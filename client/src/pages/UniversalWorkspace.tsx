import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import BrandLogo from "@/components/common/BrandLogo";
import UniversalViewer, { type ViewerFileType } from "@/components/workspace/UniversalViewer";
import { useLanguage } from "@/contexts/LanguageContext";

// ────────────────── Types ──────────────────

interface MockFile {
  id: string;
  name: string;
  type: ViewerFileType;
  size: string;
  modified: string;
  url: string;
}

interface MockFolder {
  id: string;
  name: string;
  nameEn: string;
  files: MockFile[];
}

interface MockSpace {
  id: string;
  name: string;
  nameEn: string;
  icon: typeof Factory;
  color: string;
  folders: MockFolder[];
}

// ────────────────── Mock Data ──────────────────

const MOCK_SPACES: MockSpace[] = [
  {
    id: "s1",
    name: "M6 制造工程",
    nameEn: "M6 Manufacturing",
    icon: Factory,
    color: "#0078d4",
    folders: [
      {
        id: "f1",
        name: "Project Alpha — 清洗线",
        nameEn: "Project Alpha — Cleaning Line",
        files: [
          { id: "file1", name: "Production_Report_Q1.xlsx", type: "excel", size: "2.4 MB", modified: "2026-02-20", url: "" },
          { id: "file2", name: "Assembly_SOP.docx", type: "word", size: "1.1 MB", modified: "2026-02-18", url: "" },
          { id: "file3", name: "PLC_Main.st", type: "code", size: "8.2 KB", modified: "2026-02-22", url: "" },
          { id: "file4", name: "Housing_CAD.step", type: "cad", size: "45.6 MB", modified: "2026-02-15", url: "" },
        ],
      },
      {
        id: "f2",
        name: "Project Beta — 涂装线",
        nameEn: "Project Beta — Paint Line",
        files: [
          { id: "file5", name: "Design_Review.pptx", type: "ppt", size: "5.8 MB", modified: "2026-02-19", url: "" },
          { id: "file6", name: "config.json", type: "code", size: "1.2 KB", modified: "2026-02-21", url: "" },
          { id: "file7", name: "Bracket_DXF.dxf", type: "cad", size: "12.3 MB", modified: "2026-02-14", url: "" },
        ],
      },
    ],
  },
  {
    id: "s2",
    name: "质量体系",
    nameEn: "Quality System",
    icon: Shield,
    color: "#107c10",
    folders: [
      {
        id: "f3",
        name: "IATF 16949 文档",
        nameEn: "IATF 16949 Documents",
        files: [
          { id: "file8", name: "FMEA_Template.xlsx", type: "excel", size: "890 KB", modified: "2026-02-10", url: "" },
          { id: "file9", name: "Audit_Checklist.docx", type: "word", size: "420 KB", modified: "2026-02-12", url: "" },
          { id: "file10", name: "SPC_Report.pdf", type: "pdf", size: "3.1 MB", modified: "2026-02-17", url: "" },
        ],
      },
      {
        id: "f4",
        name: "检验标准",
        nameEn: "Inspection Standards",
        files: [
          { id: "file11", name: "Surface_Defect_Guide.pdf", type: "pdf", size: "7.2 MB", modified: "2026-01-30", url: "" },
          { id: "file12", name: "measurement_spec.xml", type: "code", size: "4.5 KB", modified: "2026-02-08", url: "" },
        ],
      },
    ],
  },
  {
    id: "s3",
    name: "研发中心",
    nameEn: "R&D Center",
    icon: FlaskConical,
    color: "#8764b8",
    folders: [
      {
        id: "f5",
        name: "固件开发",
        nameEn: "Firmware Development",
        files: [
          { id: "file13", name: "robot_path.xml", type: "code", size: "3.8 KB", modified: "2026-02-23", url: "" },
          { id: "file14", name: "Servo_Housing.step", type: "cad", size: "28.9 MB", modified: "2026-02-16", url: "" },
          { id: "file15", name: "schematic_v3.png", type: "image", size: "1.6 MB", modified: "2026-02-20", url: "/grt-logo.png" },
        ],
      },
      {
        id: "f6",
        name: "测试报告",
        nameEn: "Test Reports",
        files: [
          { id: "file16", name: "Endurance_Test_Report.xlsx", type: "excel", size: "4.1 MB", modified: "2026-02-22", url: "" },
          { id: "file17", name: "Thermal_Analysis.pptx", type: "ppt", size: "9.3 MB", modified: "2026-02-11", url: "" },
        ],
      },
    ],
  },
  {
    id: "s4",
    name: "供应链",
    nameEn: "Supply Chain",
    icon: Truck,
    color: "#d83b01",
    folders: [
      {
        id: "f7",
        name: "供应商文件",
        nameEn: "Supplier Documents",
        files: [
          { id: "file18", name: "Supplier_Scorecard.xlsx", type: "excel", size: "560 KB", modified: "2026-02-19", url: "" },
          { id: "file19", name: "Material_Cert.pdf", type: "pdf", size: "2.8 MB", modified: "2026-02-13", url: "" },
        ],
      },
      {
        id: "f8",
        name: "物流追踪",
        nameEn: "Logistics Tracking",
        files: [
          { id: "file20", name: "Shipment_Plan.docx", type: "word", size: "780 KB", modified: "2026-02-21", url: "" },
          { id: "file21", name: "tracking_config.json", type: "code", size: "2.1 KB", modified: "2026-02-24", url: "" },
        ],
      },
    ],
  },
];

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

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set(["s1"]));
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["f1"]));

  // Selection state
  const [selectedSpaceId, setSelectedSpaceId] = useState("s1");
  const [selectedFolderId, setSelectedFolderId] = useState("f1");
  const [selectedFileId, setSelectedFileId] = useState("file3"); // Default to PLC_Main.st (code)

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Derived
  const selectedSpace = useMemo(() => MOCK_SPACES.find(s => s.id === selectedSpaceId), [selectedSpaceId]);
  const selectedFolder = useMemo(
    () => selectedSpace?.folders.find(f => f.id === selectedFolderId),
    [selectedSpace, selectedFolderId],
  );
  const selectedFile = useMemo(() => {
    for (const space of MOCK_SPACES) {
      for (const folder of space.folders) {
        const file = folder.files.find(f => f.id === selectedFileId);
        if (file) return file;
      }
    }
    return null;
  }, [selectedFileId]);

  // Active folder files
  const activeFiles = useMemo(() => selectedFolder?.files ?? [], [selectedFolder]);

  // ─── Tree toggle helpers ───
  const toggleSpace = (id: string) => {
    setExpandedSpaces(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /** Navigate to a folder. Pass `fileId` to select a specific file, otherwise selects the first file. */
  const selectFolder = (spaceId: string, folderId: string, fileId?: string) => {
    setSelectedSpaceId(spaceId);
    setSelectedFolderId(folderId);
    // Auto-expand
    setExpandedSpaces(prev => new Set(prev).add(spaceId));
    setExpandedFolders(prev => new Set(prev).add(folderId));
    // Select specific file or fallback to first
    if (fileId) {
      setSelectedFileId(fileId);
    } else {
      const space = MOCK_SPACES.find(s => s.id === spaceId);
      const folder = space?.folders.find(f => f.id === folderId);
      if (folder?.files[0]) setSelectedFileId(folder.files[0].id);
    }
  };

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
            {MOCK_SPACES.map(space => {
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
                      {isEn ? space.nameEn : space.name}
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
                            {isEn ? folder.nameEn : folder.name}
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
            {MOCK_SPACES.map(space => {
              const SpaceIcon = space.icon;
              return (
                <button
                  key={space.id}
                  className={`w-8 h-8 rounded flex items-center justify-center hover:bg-[#f3f2f1] ${
                    selectedSpaceId === space.id ? "bg-[#deecf9]" : ""
                  }`}
                  title={isEn ? space.nameEn : space.name}
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
              {isEn ? (selectedSpace?.nameEn ?? "") : (selectedSpace?.name ?? "")}
            </span>
            <ChevronRight className="w-3 h-3 shrink-0 text-[#a19f9d]" />
            <span className="truncate">
              {isEn ? (selectedFolder?.nameEn ?? "") : (selectedFolder?.name ?? "")}
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
