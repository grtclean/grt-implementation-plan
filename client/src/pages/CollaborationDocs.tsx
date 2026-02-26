/**
 * Collaboration Docs — GRT协同云盘
 *
 * OneDrive-style document hub for managing spreadsheets and office files.
 */

import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
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

export default function CollaborationDocs() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Local uploads state
  const [localFiles, setLocalFiles] = useState<Array<{
    id: number; title: string; fileName: string; fileType: string;
    fileSize: number; modifiedAt: string; uploadedBy: string; status: string;
  }>>([]);
  const nextIdRef = useRef(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // tRPC
  const utils = trpc.useUtils();
  const filesQuery = trpc.collaborationDocs.listFiles.useQuery(
    searchQuery ? { search: searchQuery } : undefined
  );
  const uploadMutation = trpc.collaborationDocs.uploadFile.useMutation({
    onSuccess: () => utils.collaborationDocs.listFiles.invalidate(),
  });

  const serverFiles = (filesQuery.data as any)?.items ?? [];
  const allFiles = [...localFiles, ...serverFiles];

  // Upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    const file = files[0];
    const localId = nextIdRef.current;
    nextIdRef.current -= 1;

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
      const ext = file.name.split(".").pop()?.toLowerCase() || "other";
      setLocalFiles((prev) => [{
        id: localId,
        title: file.name.replace(/\.[^.]+$/, ""),
        fileName: file.name,
        fileType: ext,
        fileSize: file.size,
        modifiedAt: new Date().toISOString(),
        uploadedBy: "Current User",
        status: "active",
      }, ...prev]);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 400);
      toast.success(`${file.name} uploaded to Collaboration Drive`);
      uploadMutation.mutate({ fileName: file.name });
    }, 800);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <PageHeader
        icon={FolderKanban}
        title="Collaboration Drive"
        description="GRT协同云盘 — Manage spreadsheets and office documents online"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <HardDrive className="w-3 h-3" />
              {allFiles.length} files
            </Badge>
            <Button size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
              <Plus className="w-3.5 h-3.5" />
              Upload New Document
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

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Upload progress */}
      {uploadProgress !== null && (
        <div className="max-w-md space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Upload className="w-3 h-3" /> Uploading...</span>
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
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-[45%]">Name</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-[10%]">Type</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-[12%]">Size</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-[15%]">Modified</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-[18%]">Owner</th>
                </tr>
              </thead>
              <tbody>
                {filesQuery.isLoading && localFiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground">Loading documents...</p>
                    </td>
                  </tr>
                ) : allFiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16">
                      <FolderKanban className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                      <p className="text-sm text-muted-foreground">No documents yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Upload a file to get started</p>
                    </td>
                  </tr>
                ) : allFiles.map((file: any) => (
                  <tr
                    key={file.id}
                    className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
