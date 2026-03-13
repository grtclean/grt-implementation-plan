/**
 * Project Vault — Document Management for Mechanical/Electrical Engineers
 *
 * Features:
 * - Drag-and-drop file upload zone
 * - Data table: files by project, latest version, status, uploader
 * - Design Freeze Gate visual indicator (green check / red cross)
 * - Version history panel
 * - Design review submission
 * - Accurate stat cards via dedicated getStats query
 * - Create-document dialog (separate from version upload)
 * - Debounced search
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageHeader, StatCard, StatusBadge, createStatusColorMap } from "@/components/grt";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  Clock,
  FileBox,
  FileText,
  FileCog,
  FolderLock,
  Loader2,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  ShieldX,
  Upload,
  Zap,
  History,
  Eye,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ── Color maps ───────────────────────────────────────

const docStatusColors = createStatusColorMap({
  draft: "slate",
  in_review: "blue",
  released: "emerald",
  obsolete: "red",
});

const docTypeColors = createStatusColorMap({
  mechanical: "orange",
  electrical: "blue",
  software: "purple",
  manual: "slate",
});

const reviewStatusColors = createStatusColorMap({
  pending: "yellow",
  approved: "green",
  rejected: "red",
  revision_requested: "orange",
});

// ── Type icons ───────────────────────────────────────

const DOC_TYPE_ICON: Record<string, React.ReactNode> = {
  mechanical: <FileCog className="w-4 h-4" />,
  electrical: <Zap className="w-4 h-4" />,
  software: <FileText className="w-4 h-4" />,
  manual: <FileBox className="w-4 h-4" />,
};

// ── Type icon background (static for Tailwind JIT) ──

const DOC_TYPE_ICON_BG: Record<string, string> = {
  mechanical: "bg-orange-500/20 text-orange-400",
  electrical: "bg-blue-500/20 text-blue-400",
  software: "bg-purple-500/20 text-purple-400",
  manual: "bg-slate-500/20 text-slate-400",
};

// ── File extension detection ─────────────────────────

function detectDocType(fileName: string): "mechanical" | "electrical" | "software" | "manual" {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (["sldprt", "sldasm", "slddrw", "step", "stp", "iges", "igs", "stl"].includes(ext)) return "mechanical";
  if (["elk", "elp", "dwg", "dxf"].includes(ext)) return "electrical";
  if (["plc", "hmi", "xml", "json", "py", "c", "h", "cpp"].includes(ext)) return "software";
  return "manual";
}

function detectMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    sldprt: "application/x-solidworks-part",
    sldasm: "application/x-solidworks-assembly",
    slddrw: "application/x-solidworks-drawing",
    elk: "application/x-eplan",
    step: "application/step",
    stp: "application/step",
    dwg: "application/acad",
    dxf: "application/dxf",
  };
  return map[ext] ?? "application/octet-stream";
}

// ── Debounce hook ────────────────────────────────────

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// TODO: Replace with real auth context (e.g., useUserProfile().id)
const CURRENT_USER_ID = 1;
const CURRENT_USER_NAME = "Admin";

// ══════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════

export default function ProjectVault() {
  const { t } = useLanguage();
  const [projectId] = useState<number | undefined>(undefined);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const utils = trpc.useUtils();

  // ── Queries ────────────────────────────────────────

  const { data: docsData, isLoading: docsLoading } = trpc.plm.listDocuments.useQuery({
    projectId,
    docType: typeFilter !== "all" ? typeFilter : undefined,
    currentStatus: statusFilter !== "all" ? statusFilter : undefined,
    search: debouncedSearch || undefined,
    limit: 200,
  });

  // Accurate stat cards — always count from unfiltered DB
  const { data: stats } = trpc.plm.getStats.useQuery({ projectId });

  const { data: docDetail } = trpc.plm.getDocument.useQuery(
    { id: selectedDocId! },
    { enabled: !!selectedDocId },
  );

  // ── Mutations ──────────────────────────────────────

  const createDocMut = trpc.plm.createDocument.useMutation({
    onSuccess: () => {
      utils.plm.listDocuments.invalidate();
      utils.plm.getStats.invalidate();
      toast.success("Document created");
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const uploadVersionMut = trpc.plm.uploadVersion.useMutation({
    onSuccess: (data) => {
      utils.plm.listDocuments.invalidate();
      utils.plm.getDocument.invalidate();
      utils.plm.getStats.invalidate();
      toast.success(`Version ${data.versionString} uploaded`);
      setUploadDialogOpen(false);
    },
    onError: (err) => toast.error("Upload failed: " + err.message),
  });

  const submitReviewMut = trpc.plm.submitReview.useMutation({
    onSuccess: () => {
      utils.plm.getDocument.invalidate();
      utils.plm.listDocuments.invalidate();
      utils.plm.getStats.invalidate();
      toast.success("Review submitted");
      setReviewDialogOpen(false);
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const recordDecisionMut = trpc.plm.recordDecision.useMutation({
    onSuccess: () => {
      utils.plm.getDocument.invalidate();
      utils.plm.listDocuments.invalidate();
      utils.plm.getStats.invalidate();
      toast.success("Decision recorded");
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  // ── Derived ────────────────────────────────────────

  const docs = docsData?.items ?? [];
  const totalDocs = stats?.total ?? docsData?.total ?? 0;
  const releasedCount = stats?.released ?? 0;
  const inReviewCount = stats?.inReview ?? 0;
  const frozenCount = stats?.frozen ?? 0;
  const freezeRate = stats?.freezeRate ?? 0;

  // ── Drag & Drop ────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    for (const file of files) {
      const docType = detectDocType(file.name);
      const ext = "." + (file.name.split(".").pop() ?? "");
      const mimeType = detectMimeType(file.name);
      const baseName = file.name.replace(/\.[^.]+$/, "");

      const prefix = docType === "mechanical" ? "MECH"
        : docType === "electrical" ? "ELEC"
        : docType === "software" ? "SOFT"
        : "DOC";
      const docNumber = `DOC-${prefix}-${Date.now().toString(36).toUpperCase()}`;

      // In production, the file would be uploaded to S3/MinIO first.
      const simulatedPath = `/data/plm/uploads/${docNumber}/v1.0/${file.name}`;

      createDocMut.mutate({
        docNumber,
        title: baseName,
        docType,
        fileExtension: ext,
        mimeType,
        projectId,
      }, {
        onSuccess: (doc) => {
          uploadVersionMut.mutate({
            documentId: doc.id,
            fileUrlPath: simulatedPath,
            originalFileName: file.name,
            fileSizeBytes: file.size,
            changeReason: "Initial upload",
          });
        },
      });
    }
  }, [createDocMut, uploadVersionMut, projectId]);

  // ══════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      <PageHeader
        icon={FolderLock}
        title={t("projects.vault.title")}
        description={t("projects.vault.desc")}
        actions={
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> {t("projects.vault.newDocument")}
          </Button>
        }
      />

      {/* ── Stat cards (from dedicated getStats query, always accurate) ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={FileBox} label={t("projects.vault.totalFiles")} value={totalDocs} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={CheckCircle2} label={t("projects.vault.released")} value={releasedCount} iconColor="text-emerald-500" iconBg="bg-emerald-500/20" />
        <StatCard icon={Clock} label={t("projects.vault.inReview")} value={inReviewCount} iconColor="text-blue-500" iconBg="bg-blue-500/20" />
        <StatCard icon={ShieldCheck} label={t("projects.vault.frozen")} value={frozenCount} iconColor="text-green-500" iconBg="bg-green-500/20" />
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex flex-col justify-center gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("projects.vault.freezeRate")}</span>
              <span className="font-bold font-mono tabular-nums">{freezeRate}%</span>
            </div>
            <Progress value={freezeRate} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* ── Drag & Drop Zone ── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-all
          ${isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/40"
          }
        `}
      >
        <div className="flex flex-col items-center gap-2">
          <Upload className={`w-8 h-8 ${isDragging ? "text-primary animate-bounce" : "text-muted-foreground"}`} />
          <p className="text-sm font-medium">
            {isDragging ? t("projects.vault.dropToUpload") : t("projects.vault.dragDropHint")}
          </p>
          <p className="text-xs text-muted-foreground">
            .sldprt, .sldasm, .slddrw, .elk, .elp, .step, .dwg, .pdf, ...
          </p>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-xs"
            placeholder={t("projects.vault.searchDocs")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("projects.vault.allTypes")}</SelectItem>
            <SelectItem value="mechanical">{t("projects.vault.mechanical")}</SelectItem>
            <SelectItem value="electrical">{t("projects.vault.electrical")}</SelectItem>
            <SelectItem value="software">{t("projects.vault.software")}</SelectItem>
            <SelectItem value="manual">{t("projects.vault.manual")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("projects.vault.allStatuses")}</SelectItem>
            <SelectItem value="draft">{t("projects.vault.statusDraft")}</SelectItem>
            <SelectItem value="in_review">{t("projects.vault.statusInReview")}</SelectItem>
            <SelectItem value="released">{t("projects.vault.statusReleased")}</SelectItem>
            <SelectItem value="obsolete">{t("projects.vault.statusObsolete")}</SelectItem>
          </SelectContent>
        </Select>
        {(typeFilter !== "all" || statusFilter !== "all" || searchInput) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setSearchInput(""); }}>
            {t("projects.vault.clear")}
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground font-mono tabular-nums">
          {docs.length} / {docsData?.total ?? 0} {t("projects.vault.documents")}
        </span>
      </div>

      {/* ── Document Table ── */}
      <Card className="bg-card/50 border-border overflow-hidden">
        {docsLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <FileBox className="w-12 h-12 mb-3" />
            <p className="text-sm">{t("projects.vault.noDocuments")}</p>
            <p className="text-xs mt-1">{t("projects.vault.noDocumentsHint")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="w-[32px]"></TableHead>
                <TableHead className="w-[120px]">{t("projects.vault.docNumber")}</TableHead>
                <TableHead className="min-w-[180px]">{t("projects.vault.titleColumn")}</TableHead>
                <TableHead className="w-[90px] text-center">{t("projects.vault.type")}</TableHead>
                <TableHead className="w-[80px] text-center">{t("projects.vault.version")}</TableHead>
                <TableHead className="w-[90px] text-center">{t("projects.vault.status")}</TableHead>
                <TableHead className="w-[44px] text-center">
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger>
                        <Shield className="w-3.5 h-3.5 mx-auto" />
                      </TooltipTrigger>
                      <TooltipContent>{t("projects.vault.designFreezeGate")}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="w-[110px]">{t("projects.vault.owner")}</TableHead>
                <TableHead className="w-[90px]">{t("projects.vault.updated")}</TableHead>
                <TableHead className="w-[80px] text-center">{t("projects.vault.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc: any) => (
                <TableRow
                  key={doc.id}
                  className={`cursor-pointer hover:bg-muted/30 ${selectedDocId === doc.id ? "bg-primary/5" : ""}`}
                  onClick={() => setSelectedDocId(doc.id)}
                >
                  {/* Type icon — static class lookup */}
                  <TableCell className="py-1.5 text-center">
                    <div className={`p-1 rounded-sm inline-flex ${DOC_TYPE_ICON_BG[doc.docType] ?? "bg-slate-500/20 text-slate-400"}`}>
                      {DOC_TYPE_ICON[doc.docType] ?? <FileText className="w-4 h-4" />}
                    </div>
                  </TableCell>

                  {/* Doc number */}
                  <TableCell className="font-mono text-xs text-muted-foreground py-1.5">
                    {doc.docNumber}
                  </TableCell>

                  {/* Title */}
                  <TableCell className="py-1.5">
                    <span className="text-sm font-medium">{doc.title}</span>
                    {doc.fileExtension && (
                      <span className="ml-1 text-[10px] text-muted-foreground">{doc.fileExtension}</span>
                    )}
                  </TableCell>

                  {/* Type badge */}
                  <TableCell className="text-center py-1.5">
                    <StatusBadge color={docTypeColors[doc.docType as keyof typeof docTypeColors] ?? "slate"}>
                      {doc.docType}
                    </StatusBadge>
                  </TableCell>

                  {/* Version */}
                  <TableCell className="text-center py-1.5">
                    <span className="font-mono text-xs font-semibold">{doc.currentVersionString ?? "—"}</span>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center py-1.5">
                    <StatusBadge color={docStatusColors[doc.currentStatus as keyof typeof docStatusColors] ?? "slate"}>
                      {doc.currentStatus?.replace(/_/g, " ")}
                    </StatusBadge>
                  </TableCell>

                  {/* Design Freeze Gate indicator */}
                  <TableCell className="text-center py-1.5">
                    {doc.designFreezeApproved ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger>
                            <ShieldCheck className="w-4 h-4 text-green-400 mx-auto" />
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("projects.vault.designFreezeApproved")}
                            {doc.designFreezeAt && ` · ${new Date(doc.designFreezeAt).toLocaleDateString()}`}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger>
                            <ShieldX className="w-4 h-4 text-red-400/50 mx-auto" />
                          </TooltipTrigger>
                          <TooltipContent>{t("projects.vault.notYetFrozen")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>

                  {/* Owner */}
                  <TableCell className="text-xs py-1.5 truncate max-w-[110px]">
                    {doc.ownerName ?? "—"}
                  </TableCell>

                  {/* Updated */}
                  <TableCell className="text-xs text-muted-foreground font-mono tabular-nums py-1.5">
                    {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : "—"}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center py-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm" variant="ghost" className="h-6 w-6 p-0"
                              onClick={(e) => { e.stopPropagation(); setSelectedDocId(doc.id); }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("projects.vault.viewDetails")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ── Detail Panel (when a document is selected) ── */}
      {selectedDocId && docDetail && (
        <DocumentDetailPanel
          doc={docDetail}
          onClose={() => setSelectedDocId(null)}
          onUploadVersion={() => setUploadDialogOpen(true)}
          onSubmitReview={() => setReviewDialogOpen(true)}
          onRecordDecision={(reviewId, status, comments) => {
            recordDecisionMut.mutate({ reviewId, reviewStatus: status, comments });
          }}
          isDecisionPending={recordDecisionMut.isPending}
        />
      )}

      {/* ── Create Document Dialog (Bug #1 fix: separate from upload) ── */}
      <CreateDocumentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        onSubmit={(data) => createDocMut.mutate(data, {
          onSuccess: (doc) => {
            setCreateDialogOpen(false);
            setSelectedDocId(doc.id);
          },
        })}
        isPending={createDocMut.isPending}
      />

      {/* ── Upload Version Dialog ── */}
      <UploadVersionDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        documentId={selectedDocId}
        onSubmit={(data) => uploadVersionMut.mutate(data)}
        isPending={uploadVersionMut.isPending}
      />

      {/* ── Submit Review Dialog ── */}
      <SubmitReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        docDetail={docDetail}
        onSubmit={(data) => submitReviewMut.mutate(data)}
        isPending={submitReviewMut.isPending}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Document Detail Panel — Version history + reviews
// ══════════════════════════════════════════════════════

function DocumentDetailPanel({
  doc, onClose, onUploadVersion, onSubmitReview, onRecordDecision, isDecisionPending,
}: {
  doc: any;
  onClose: () => void;
  onUploadVersion: () => void;
  onSubmitReview: () => void;
  onRecordDecision: (reviewId: number, status: "approved" | "rejected" | "revision_requested", comments?: string) => void;
  isDecisionPending: boolean;
}) {
  const { t } = useLanguage();
  const versions = doc.versions ?? [];
  const reviews = doc.reviews ?? [];

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            {DOC_TYPE_ICON[doc.docType]}
            {doc.title}
            <StatusBadge color={docStatusColors[doc.currentStatus as keyof typeof docStatusColors] ?? "slate"}>
              {doc.currentStatus?.replace(/_/g, " ")}
            </StatusBadge>
            {doc.designFreezeApproved && (
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                <ShieldCheck className="w-3 h-3 mr-1" /> {t("projects.vault.frozenBadge")}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onSubmitReview}>
              <Send className="w-3.5 h-3.5 mr-1" /> {t("projects.vault.requestReview")}
            </Button>
            <Button size="sm" onClick={onUploadVersion}>
              <Upload className="w-3.5 h-3.5 mr-1" /> {t("projects.vault.uploadVersion")}
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>{t("projects.vault.close")}</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          {doc.docNumber} · {doc.currentVersionString} · {doc.totalVersions ?? 0} {t("projects.vault.versions")} · {t("projects.vault.owner")}: {doc.ownerName ?? "—"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Version History */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <History className="w-3.5 h-3.5" /> {t("projects.vault.versionHistory")}
          </h4>
          {versions.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("projects.vault.noVersions")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-[60px]">{t("projects.vault.version")}</TableHead>
                  <TableHead>{t("projects.vault.file")}</TableHead>
                  <TableHead>{t("projects.vault.changeReason")}</TableHead>
                  <TableHead className="w-[100px]">{t("projects.vault.uploadedBy")}</TableHead>
                  <TableHead className="w-[100px]">{t("projects.vault.uploadedAt")}</TableHead>
                  <TableHead className="w-[70px] text-center">{t("projects.vault.size")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v: any) => (
                  <TableRow key={v.id} className={v.isLatest ? "bg-primary/5" : ""}>
                    <TableCell className="font-mono text-xs font-semibold py-1">
                      {v.versionString}
                      {v.isLatest && <Badge variant="outline" className="ml-1 text-[8px] px-1 py-0 bg-primary/20 text-primary border-primary/30">{t("projects.vault.latest")}</Badge>}
                    </TableCell>
                    <TableCell className="text-xs py-1 truncate max-w-[200px] text-muted-foreground" title={v.fileUrlPath}>
                      {v.originalFileName ?? v.fileUrlPath}
                    </TableCell>
                    <TableCell className="text-xs py-1 truncate max-w-[200px]">
                      {v.changeReason ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs py-1">{v.uploadedByName ?? `User #${v.uploadedBy}`}</TableCell>
                    <TableCell className="text-xs py-1 font-mono tabular-nums text-muted-foreground">
                      {v.uploadedAt ? new Date(v.uploadedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs py-1 text-center font-mono tabular-nums">
                      {v.fileSizeBytes ? formatBytes(v.fileSizeBytes) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Design Reviews */}
        {reviews.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> {t("projects.vault.designReviews")}
            </h4>
            <div className="space-y-2">
              {reviews.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 border border-border rounded p-2 bg-background/50">
                  <StatusBadge color={reviewStatusColors[r.reviewStatus as keyof typeof reviewStatusColors] ?? "slate"}>
                    {r.reviewStatus?.replace(/_/g, " ")}
                  </StatusBadge>
                  <div className="flex-1 text-xs">
                    <span className="font-medium">{r.reviewerName ?? `Reviewer #${r.reviewerUserId}`}</span>
                    {r.reviewerRole && <span className="text-muted-foreground"> · {r.reviewerRole}</span>}
                    {r.comments && <p className="text-muted-foreground mt-0.5">{r.comments}</p>}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono tabular-nums text-right">
                    {r.reviewedAt
                      ? <span>{t("projects.vault.decided")}: {new Date(r.reviewedAt).toLocaleString()}</span>
                      : <span>{t("projects.vault.requested")}: {new Date(r.requestedAt).toLocaleString()}</span>
                    }
                    {r.dueDate && <p>{t("projects.vault.due")}: {new Date(r.dueDate).toLocaleDateString()}</p>}
                  </div>
                  {r.reviewStatus === "pending" && (
                    <div className="flex gap-1">
                      <Button
                        size="sm" variant="outline"
                        className="h-6 px-2 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                        disabled={isDecisionPending}
                        onClick={() => onRecordDecision(r.id, "approved")}
                      >
                        {t("projects.vault.approve")}
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className="h-6 px-2 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                        disabled={isDecisionPending}
                        onClick={() => onRecordDecision(r.id, "rejected", "Needs revision")}
                      >
                        {t("projects.vault.reject")}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════
// Create Document Dialog (Bug #1: separate from Upload)
// ══════════════════════════════════════════════════════

function CreateDocumentDialog({ open, onOpenChange, projectId, onSubmit, isPending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: number;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<string>("mechanical");
  const [description, setDescription] = useState("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setDocType("mechanical");
      setDescription("");
    }
  }, [open]);

  const prefix = docType === "mechanical" ? "MECH"
    : docType === "electrical" ? "ELEC"
    : docType === "software" ? "SOFT"
    : "DOC";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> {t("projects.vault.newDocDialog")}
          </DialogTitle>
          <DialogDescription>
            {t("projects.vault.newDocDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>{t("projects.vault.labelTitle")}</Label>
            <Input
              placeholder={t("projects.vault.titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("projects.vault.docType")}</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mechanical">{t("projects.vault.typeMechanical")}</SelectItem>
                <SelectItem value="electrical">{t("projects.vault.typeElectrical")}</SelectItem>
                <SelectItem value="software">{t("projects.vault.typeSoftware")}</SelectItem>
                <SelectItem value="manual">{t("projects.vault.typeManual")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t("projects.vault.descriptionLabel")}</Label>
            <Textarea
              rows={2}
              placeholder={t("projects.vault.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("projects.vault.cancelBtn")}</Button>
            <Button
              disabled={!title.trim() || isPending}
              onClick={() => {
                const docNumber = `DOC-${prefix}-${Date.now().toString(36).toUpperCase()}`;
                onSubmit({
                  docNumber,
                  title: title.trim(),
                  description: description.trim() || undefined,
                  docType,
                  projectId,
                  createdBy: CURRENT_USER_ID,
                  ownerUserId: CURRENT_USER_ID,
                  ownerName: CURRENT_USER_NAME,
                });
              }}
            >
              {isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {t("projects.vault.createDocument")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Upload Version Dialog ─────────────────────────────

function UploadVersionDialog({ open, onOpenChange, documentId, onSubmit, isPending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: number | null;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const { t } = useLanguage();
  const [changeReason, setChangeReason] = useState("");
  const [fileUrlPath, setFileUrlPath] = useState("");

  // Reset form when dialog opens (Bug #7 fix)
  useEffect(() => {
    if (open) {
      setChangeReason("");
      setFileUrlPath("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> {t("projects.vault.uploadNewVersion")}
          </DialogTitle>
          <DialogDescription>
            {t("projects.vault.uploadNewVersionDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>{t("projects.vault.filePathUrl")}</Label>
            <Input
              placeholder="/data/plm/projects/42/assembly-v2.sldasm or s3://..."
              value={fileUrlPath}
              onChange={(e) => setFileUrlPath(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("projects.vault.changeReasonRequired")}</Label>
            <Textarea
              rows={2}
              placeholder={t("projects.vault.changeReasonPlaceholder")}
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("projects.vault.cancelBtn")}</Button>
            <Button
              disabled={!documentId || !changeReason.trim() || !fileUrlPath.trim() || isPending}
              onClick={() => {
                if (!documentId) return;
                onSubmit({
                  documentId,
                  fileUrlPath,
                  changeReason,
                  uploadedBy: CURRENT_USER_ID,
                  uploadedByName: CURRENT_USER_NAME,
                });
              }}
            >
              {isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {t("projects.vault.uploadVersion")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Submit Review Dialog ──────────────────────────────

function SubmitReviewDialog({ open, onOpenChange, docDetail, onSubmit, isPending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docDetail: any;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const { t } = useLanguage();
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerRole, setReviewerRole] = useState("reviewer");
  const [isFreeze, setIsFreeze] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setReviewerName("");
      setReviewerRole("reviewer");
      setIsFreeze(false);
    }
  }, [open]);

  const latestVersion = docDetail?.versions?.find((v: any) => v.isLatest);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-400" /> {t("projects.vault.submitForReview")}
          </DialogTitle>
          <DialogDescription>
            {latestVersion
              ? `${t("projects.vault.requestReview")} ${latestVersion.versionString}`
              : t("projects.vault.noVersionToReview")
            }
          </DialogDescription>
        </DialogHeader>
        {latestVersion && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>{t("projects.vault.reviewerName")}</Label>
              <Input
                placeholder={t("projects.vault.reviewerNamePlaceholder")}
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("projects.vault.reviewerRole")}</Label>
              <Select value={reviewerRole} onValueChange={setReviewerRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checker">{t("projects.vault.roleChecker")}</SelectItem>
                  <SelectItem value="reviewer">{t("projects.vault.roleReviewer")}</SelectItem>
                  <SelectItem value="approver">{t("projects.vault.roleApprover")}</SelectItem>
                  <SelectItem value="quality_gate">{t("projects.vault.roleQualityGate")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="freeze-check"
                checked={isFreeze}
                onChange={(e) => setIsFreeze(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="freeze-check" className="text-xs cursor-pointer">
                {t("projects.vault.freezeGateReview")}
              </Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t("projects.vault.cancelBtn")}</Button>
              <Button
                disabled={!reviewerName.trim() || isPending}
                onClick={() => {
                  onSubmit({
                    documentVersionId: latestVersion.id,
                    reviewerUserId: CURRENT_USER_ID,
                    reviewerName,
                    reviewerRole,
                    isDesignFreezeReview: isFreeze,
                    requestedBy: CURRENT_USER_ID,
                  });
                }}
              >
                {isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {t("projects.vault.submitReviewRequest")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ───────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}
