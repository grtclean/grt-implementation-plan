import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Shield,
  RotateCcw,
  ScrollText,
  Lock,
  Unlock,
  AlertTriangle,
  FileText,
} from "lucide-react";

// ── OTP Dialog Component ──
function OtpDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: (code: string) => void;
  loading: boolean;
}) {
  const [otpValue, setOtpValue] = useState("");

  const handleConfirm = () => {
    if (otpValue.length !== 6) {
      toast.error("Please enter a 6-digit OTP code");
      return;
    }
    onConfirm(otpValue);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setOtpValue("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            Enter your 6-digit authorization code
          </p>
          <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading || otpValue.length !== 6}>
            {loading ? "Verifying..." : "Authorize"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Module A: Pipeline Lockdown ──
function PipelineLockdown() {
  const { t } = useLanguage();
  const [otpOpen, setOtpOpen] = useState(false);
  const [pendingFrozen, setPendingFrozen] = useState(false);

  const statusQuery = trpc.aiSecurityGovernance.getSystemStatus.useQuery();
  const toggleMutation = trpc.aiSecurityGovernance.togglePipelineFreeze.useMutation({
    onSuccess: (data) => {
      toast.success(data.frozen ? "Pipeline FROZEN" : "Pipeline UNFROZEN");
      setOtpOpen(false);
      statusQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to toggle pipeline");
    },
  });

  const isFrozen = statusQuery.data?.pipelineFrozen ?? false;

  const handleToggleRequest = (checked: boolean) => {
    setPendingFrozen(checked);
    setOtpOpen(true);
  };

  const handleOtpConfirm = (code: string) => {
    toggleMutation.mutate({
      frozen: pendingFrozen,
      otpCode: code,
      reason: pendingFrozen ? "Manual freeze via Security Gateway" : "Manual unfreeze via Security Gateway",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isFrozen ? <Lock className="w-5 h-5 text-red-500" /> : <Unlock className="w-5 h-5 text-green-500" />}
          {t("ai.security.pipelineLockdown")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("ai.security.aiIngestionPipeline")}</p>
            <p className="text-xs text-muted-foreground">
              {isFrozen
                ? t("ai.security.pipelineFrozenDesc")
                : t("ai.security.pipelineActiveDesc")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={isFrozen ? "destructive" : "default"}>
              {isFrozen ? t("ai.security.frozen") : t("ai.security.active")}
            </Badge>
            <Switch
              checked={isFrozen}
              onCheckedChange={handleToggleRequest}
              disabled={statusQuery.isLoading}
            />
          </div>
        </div>
        {statusQuery.data?.updatedAt && (
          <p className="text-xs text-muted-foreground mt-3">
            {t("ai.security.lastChanged")}: {new Date(statusQuery.data.updatedAt).toLocaleString()}
          </p>
        )}
      </CardContent>

      <OtpDialog
        open={otpOpen}
        onOpenChange={setOtpOpen}
        title={pendingFrozen ? "Freeze Pipeline" : "Unfreeze Pipeline"}
        description={
          pendingFrozen
            ? "This will halt all AI document ingestion. Enter OTP to confirm."
            : "This will resume AI document ingestion. Enter OTP to confirm."
        }
        onConfirm={handleOtpConfirm}
        loading={toggleMutation.isPending}
      />
    </Card>
  );
}

// ── Module B: Rollback Console ──
function RollbackConsole() {
  const { t } = useLanguage();
  const [otpOpen, setOtpOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  const docsQuery = trpc.aiSecurityGovernance.listKnowledgeForRollback.useQuery({
    limit: 50,
    offset: 0,
  });

  const rollbackMutation = trpc.aiSecurityGovernance.rollbackKnowledge.useMutation({
    onSuccess: (data) => {
      toast.success(`Document #${data.documentId} rolled back (purged)`);
      setOtpOpen(false);
      setSelectedDocId(null);
      docsQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Rollback failed");
    },
  });

  const handleRollbackRequest = (docId: number) => {
    setSelectedDocId(docId);
    setOtpOpen(true);
  };

  const handleOtpConfirm = (code: string) => {
    if (selectedDocId == null) return;
    rollbackMutation.mutate({ documentId: selectedDocId, otpCode: code });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5" />
          {t("ai.security.rollbackConsole")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {docsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("ai.security.loadingDocs")}</p>
        ) : !docsQuery.data?.items.length ? (
          <p className="text-sm text-muted-foreground">{t("ai.security.noKnowledgeDocs")}</p>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docsQuery.data.items.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono text-xs">{doc.id}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">{doc.fileName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRollbackRequest(doc.id)}
                      >
                        Rollback
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {t("ai.security.total")}: {docsQuery.data?.total ?? 0}
        </p>
      </CardContent>

      <OtpDialog
        open={otpOpen}
        onOpenChange={setOtpOpen}
        title="Rollback Knowledge Document"
        description={`This will permanently purge document #${selectedDocId}. Enter OTP to confirm.`}
        onConfirm={handleOtpConfirm}
        loading={rollbackMutation.isPending}
      />
    </Card>
  );
}

// ── Module C: Immutable Audit Log ──
function AuditLogModule() {
  const { t } = useLanguage();
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);

  const logsQuery = trpc.aiSecurityGovernance.listAuditLogs.useQuery({
    limit: 50,
    offset: 0,
    actionFilter,
  });

  const statsQuery = trpc.aiSecurityGovernance.getAuditStats.useQuery();

  const actionLabels: Record<string, string> = {
    APPROVE_KNOWLEDGE: "Approve",
    ROLLBACK_KNOWLEDGE: "Rollback",
    SYSTEM_FREEZE: "Freeze",
  };

  const actionColors: Record<string, string> = {
    APPROVE_KNOWLEDGE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    ROLLBACK_KNOWLEDGE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    SYSTEM_FREEZE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="w-5 h-5" />
          {t("ai.security.auditLog")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats summary */}
        <div className="flex gap-3 mb-4">
          {statsQuery.data?.map((stat) => (
            <div
              key={stat.action}
              className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
            >
              <span className="font-medium">{actionLabels[stat.action] ?? stat.action}</span>
              <Badge variant="secondary">{stat.count}</Badge>
            </div>
          ))}
          {(!statsQuery.data || statsQuery.data.length === 0) && (
            <p className="text-sm text-muted-foreground">{t("ai.security.noEvents")}</p>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={actionFilter === undefined ? "default" : "outline"}
            size="sm"
            onClick={() => setActionFilter(undefined)}
          >
            All
          </Button>
          {Object.entries(actionLabels).map(([key, label]) => (
            <Button
              key={key}
              variant={actionFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setActionFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Logs table */}
        {logsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("ai.security.loadingLogs")}</p>
        ) : !logsQuery.data?.items.length ? (
          <p className="text-sm text-muted-foreground">{t("ai.security.noAuditEntries")}</p>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.data.items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${actionColors[log.action] ?? "bg-gray-100 text-gray-800"}`}
                      >
                        {actionLabels[log.action] ?? log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{log.actorName ?? "System"}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {log.entityType}
                      {log.entityId ? `#${log.entityId}` : ""}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {log.newData ? JSON.stringify(log.newData) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {t("ai.security.total")}: {logsQuery.data?.total ?? 0}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──
export default function AISecurityGovernance() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title={t("ai.security.title")}
        description={t("ai.security.description")}
      />

      <div className="grid gap-6">
        <PipelineLockdown />
        <RollbackConsole />
        <AuditLogModule />
      </div>
    </div>
  );
}
