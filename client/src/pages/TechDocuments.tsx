/**
 * 技术文档页面
 * 技术文档库、版本管理、审批流
 *
 * Data source: trpc.collaborationDocs.* (DB-backed)
 */
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { FileText, Plus, Search, Upload, File, Clock, AlertTriangle, CheckCircle2, Database } from "lucide-react";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function TechDocuments() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formName, setFormName] = useState("");

  // ─── tRPC Queries ───
  const filesQuery = trpc.collaborationDocs.listFiles.useQuery(
    search ? { search } : undefined,
    QUERY_OPTS,
  );

  const files = (filesQuery.data?.items ?? []) as any[];
  const isLoading = filesQuery.isLoading;

  // ─── tRPC Mutations ───
  const uploadMut = trpc.collaborationDocs.uploadFile.useMutation({
    onSuccess: () => {
      filesQuery.refetch();
      setShowCreateDialog(false);
      setFormName("");
      toast.success(t("rnd.techDocs.createSuccess"));
    },
  });

  const handleCreate = () => {
    if (!formName.trim()) {
      toast.error(t("rnd.techDocs.enterName"));
      return;
    }
    const fileName = formName.includes(".") ? formName.trim() : `${formName.trim()}.xlsx`;
    uploadMut.mutate({ fileName });
  };

  // ─── Computed Stats ───
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const newThisMonth = files.filter((f: any) => f.modifiedAt && String(f.modifiedAt) >= monthStart).length;
  const pendingApproval = files.filter((f: any) => f.status === "pending_approval").length;
  const totalSize = files.reduce((sum: number, f: any) => sum + (Number(f.fileSize) || 0), 0);

  // ── Loading State ───
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={FileText} title={t("rnd.techDocs.title")} description="加载中..." />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title={t("rnd.techDocs.title")}
        description={t("rnd.techDocs.description")}
        actions={
          <>
            <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />{t("rnd.techDocs.newDoc")}</Button>
            <Button variant="outline" onClick={() => toast.info(t("rnd.techDocs.uploadComingSoon"))}><Upload className="h-4 w-4 mr-2" />{t("rnd.techDocs.upload")}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label={t("rnd.techDocs.totalDocs")} value={files.length} />
        <StatCard icon={CheckCircle2} label={t("rnd.techDocs.newThisMonth")} value={newThisMonth} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label={t("rnd.techDocs.pendingApproval")} value={pendingApproval} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={Database} label={t("rnd.techDocs.storageUsed")} value={formatFileSize(totalSize)} iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("rnd.techDocs.docList")}</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("rnd.techDocs.searchPlaceholder")} className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {files.map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <File className="h-8 w-8 text-primary/30" />
                <div className="flex-1">
                  <p className="font-medium">{doc.title}</p>
                  <p className="text-sm text-muted-foreground">{t("rnd.techDocs.author")}: {doc.uploadedBy} · {formatFileSize(Number(doc.fileSize) || 0)}</p>
                </div>
                <Badge variant="outline">{String(doc.fileType ?? "").toUpperCase()}</Badge>
                {doc.status === "pending_approval" && <Badge variant="secondary">待审批</Badge>}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />{doc.modifiedAt ? new Date(doc.modifiedAt).toLocaleDateString("zh-CN") : "-"}
                </div>
              </div>
            ))}
            {files.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">{t("rnd.techDocs.noDocs")}</p>
                <p className="text-sm">{t("rnd.techDocs.noDocsHint")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rnd.techDocs.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doc-name">{t("rnd.techDocs.docName")} *</Label>
              <Input
                id="doc-name"
                placeholder={t("rnd.techDocs.docNamePlaceholder")}
                value={formName}
                onChange={e => setFormName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("rnd.techDocs.cancel")}</Button>
            <Button onClick={handleCreate} disabled={uploadMut.isPending}>{t("rnd.techDocs.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
