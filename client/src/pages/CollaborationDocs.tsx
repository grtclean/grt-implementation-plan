/**
 * Collaboration Docs — GRT协同云盘
 *
 * OneDrive-style document hub for managing spreadsheets and office files.
 * Supports folder navigation, RBAC-gated uploads, and approval workflow.
 */

import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUserProfile, ROLE_HIERARCHY } from "@/contexts/UserProfileContext";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  FolderKanban,
  Upload,
  FileSpreadsheet,
  FileText,
  Search,
  Clock,
  User,
  HardDrive,
  Loader2,
  Plus,
  Folder,
  FolderPlus,
  ChevronRight,
  Home,
  CheckCircle,
  CircleDot,
  ShieldCheck,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileTypeIcon(type: string) {
  switch (type) {
    case "xlsx":
    case "xls":
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    case "csv":
      return <FileSpreadsheet className="w-8 h-8 text-emerald-400" />;
    default:
      return <FileText className="w-8 h-8 text-blue-400" />;
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BreadcrumbEntry {
  id: number | null;
  name: string;
}

export default function CollaborationDocs() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { currentUserRole } = useUserProfile();
  const roleLevel = ROLE_HIERARCHY[currentUserRole] ?? 0;
  const canApprove = roleLevel >= 3; // dept_manager+

  const [searchQuery, setSearchQuery] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folderPath, setFolderPath] = useState<BreadcrumbEntry[]>([{ id: null, name: "root" }]);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // tRPC
  const utils = trpc.useUtils();
  const filesQuery = trpc.collaborationDocs.listFiles.useQuery(
    {
      search: searchQuery || undefined,
      folderId: currentFolderId,
    }
  );
  const foldersQuery = trpc.collaborationDocs.listFolders.useQuery(
    { parentId: currentFolderId }
  );
  const uploadMutation = trpc.collaborationDocs.uploadFile.useMutation({
    onSuccess: () => utils.collaborationDocs.listFiles.invalidate(),
  });
  const createFolderMutation = trpc.collaborationDocs.createFolder.useMutation({
    onSuccess: () => {
      utils.collaborationDocs.listFolders.invalidate();
      setShowNewFolderDialog(false);
      setNewFolderName("");
      toast.success(t("hr.collabDocs.folderCreated"));
    },
  });
  const approveMutation = trpc.collaborationDocs.approveFile.useMutation({
    onSuccess: () => {
      utils.collaborationDocs.listFiles.invalidate();
      toast.success(t("hr.collabDocs.fileApproved"));
    },
  });

  const serverFiles = (filesQuery.data as any)?.items ?? [];
  const folders = (foldersQuery.data as any) ?? [];

  // Navigate into folder
  const navigateToFolder = (folderId: number, folderName: string) => {
    setCurrentFolderId(folderId);
    setFolderPath((prev) => [...prev, { id: folderId, name: folderName }]);
  };

  // Navigate via breadcrumb
  const navigateToBreadcrumb = (index: number) => {
    const entry = folderPath[index];
    setCurrentFolderId(entry.id);
    setFolderPath(folderPath.slice(0, index + 1));
  };

  // Upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    const file = files[0];

    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) return null;
        if (prev >= 95) { clearInterval(interval); return 95; }
        return prev + Math.random() * 20;
      });
    }, 150);

    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 400);
      uploadMutation.mutate(
        { fileName: file.name, userRole: currentUserRole, folderId: currentFolderId },
        {
          onSuccess: (result) => {
            const statusLabel = (result as any).status === "pending_approval"
              ? ` ${t("hr.collabDocs.pendingApproval")}`
              : "";
            toast.success(`${file.name} ${t("hr.collabDocs.uploaded")}${statusLabel}`);
          },
        }
      );
    }, 800);
  };

  // Create folder handler
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate({ name: newFolderName.trim(), parentId: currentFolderId });
  };

  const totalItems = folders.length + serverFiles.length;

  return (
    <div className="flex flex-col h-full space-y-4">
      <PageHeader
        icon={FolderKanban}
        title={t("hr.collabDocs.title")}
        description={t("hr.collabDocs.desc")}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <HardDrive className="w-3 h-3" />
              {totalItems} {t("hr.collabDocs.items")}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowNewFolderDialog(!showNewFolderDialog)}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              {t("hr.collabDocs.newFolder")}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
              <Plus className="w-3.5 h-3.5" />
              {t("hr.collabDocs.upload")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls,.txt,.pdf,.docx"
              onChange={handleFileSelect}
            />
          </div>
        }
      />

      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-1 text-sm">
        {folderPath.map((entry, idx) => (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            <button
              className={`hover:underline ${
                idx === folderPath.length - 1
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => navigateToBreadcrumb(idx)}
            >
              {idx === 0 ? (
                <span className="flex items-center gap-1">
                  <Home className="w-3.5 h-3.5" />
                  {t("hr.collabDocs.root")}
                </span>
              ) : (
                entry.name
              )}
            </button>
          </span>
        ))}
      </div>

      {/* New folder inline dialog */}
      {showNewFolderDialog && (
        <div className="flex items-center gap-2 max-w-md">
          <Input
            placeholder={t("hr.collabDocs.folderPlaceholder")}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            autoFocus
          />
          <Button size="sm" onClick={handleCreateFolder} disabled={createFolderMutation.isPending}>
            {t("hr.collabDocs.createBtn")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowNewFolderDialog(false); setNewFolderName(""); }}
          >
            {t("hr.collabDocs.cancelBtn")}
          </Button>
        </div>
      )}

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t("hr.collabDocs.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Upload progress */}
      {uploadProgress !== null && (
        <div className="max-w-md space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Upload className="w-3 h-3" /> {t("hr.collabDocs.uploading")}</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-1.5" />
        </div>
      )}

      {/* File list */}
      <Card className="flex-1 min-h-0">
        <CardContent className="p-0">
          <div className="overflow-auto h-full">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-[40%]">{t("hr.collabDocs.colName")}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-[8%]">{t("hr.collabDocs.colType")}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-[10%]">{t("hr.collabDocs.colSize")}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-[10%]">{t("hr.collabDocs.colStatus")}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-[12%]">{t("hr.collabDocs.colModified")}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-[12%]">{t("hr.collabDocs.colOwner")}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-[8%]">{t("hr.collabDocs.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {filesQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">{t("hr.collabDocs.loading")}</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* Folders first */}
                    {folders.map((folder: any) => (
                      <tr
                        key={`folder-${folder.id}`}
                        className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => navigateToFolder(folder.id, folder.name)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Folder className="w-8 h-8 text-amber-500" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{folder.name}</p>
                              <p className="text-xs text-muted-foreground">{t("hr.collabDocs.folder")}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-[10px]">FOLDER</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">—</td>
                        <td className="px-4 py-3">—</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatDate(folder.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="w-3 h-3" />
                            {folder.createdBy}
                          </div>
                        </td>
                        <td className="px-4 py-3" />
                      </tr>
                    ))}

                    {/* Files */}
                    {serverFiles.length === 0 && folders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-16">
                          <FolderKanban className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                          <p className="text-sm text-muted-foreground">{t("hr.collabDocs.noDocuments")}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t("hr.collabDocs.getStarted")}</p>
                        </td>
                      </tr>
                    ) : (
                      serverFiles.map((file: any) => {
                        const isPending = file.status === "pending_approval";
                        return (
                          <tr
                            key={file.id}
                            className={`border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors ${
                              isPending ? "border-l-2 border-l-amber-400" : ""
                            }`}
                            onClick={() => navigate(`/collaboration-docs/spreadsheet/${file.id}`)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {fileTypeIcon(file.fileType)}
                                <div>
                                  <p className="text-sm font-medium text-foreground">{file.title}</p>
                                  <p className="text-xs text-muted-foreground">{file.fileName}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="text-[10px] uppercase">
                                {file.fileType}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {formatSize(file.fileSize)}
                            </td>
                            <td className="px-4 py-3">
                              {isPending ? (
                                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50">
                                  <CircleDot className="w-3 h-3" />
                                  {t("hr.collabDocs.pending")}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1 text-green-600 border-green-300 bg-green-50">
                                  <CheckCircle className="w-3 h-3" />
                                  {t("hr.collabDocs.active")}
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {formatDate(file.modifiedAt)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <User className="w-3 h-3" />
                                {file.uploadedBy}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {isPending && canApprove && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    approveMutation.mutate({ fileId: file.id });
                                  }}
                                  disabled={approveMutation.isPending}
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  {t("hr.collabDocs.approve")}
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
