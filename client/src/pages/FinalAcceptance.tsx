/**
 * 终验收页面 (TX-015)
 * 最终验收管理、签收确认、验收报告
 *
 * Data source: trpc.rndPipeline.acceptance.* (DB-backed)
 */
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle, Plus, Building2, Award, Clock, CheckCircle2 } from "lucide-react";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

const statusColorMap = createStatusColorMap({
  "已验收": "green",
  "验收中": "blue",
  "待验收": "orange",
});

export default function FinalAcceptance() {
  const { t } = useLanguage();
  const { currentBU } = useUserProfile();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({ project: "", customer: "", date: "" });

  // ─── tRPC queries ───
  const accQuery = trpc.rndPipeline.acceptance.list.useQuery(
    { bu: currentBU || undefined },
    QUERY_OPTS,
  );

  const createMut = trpc.rndPipeline.acceptance.create.useMutation({
    onSuccess: () => {
      accQuery.refetch();
      setShowCreateDialog(false);
      setFormData({ project: "", customer: "", date: "" });
      toast.success(t("afterSales.acceptance.createSuccess"));
    },
    onError: (err) => toast.error(err.message),
  });

  const acceptances = (accQuery.data?.items ?? []) as any[];
  const isLoading = accQuery.isLoading;

  const handleCreate = () => {
    if (!formData.project.trim()) { toast.error(t("afterSales.acceptance.fillProject")); return; }
    if (!formData.customer.trim()) { toast.error(t("afterSales.acceptance.fillCustomer")); return; }
    if (!formData.date) { toast.error(t("afterSales.acceptance.fillDate")); return; }
    createMut.mutate({
      project: formData.project.trim(),
      customer: formData.customer.trim(),
      date: formData.date,
      bu: currentBU || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={CheckCircle} title={t("afterSales.acceptance.title")} description="..." />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CheckCircle}
        title={t("afterSales.acceptance.title")}
        description={t("afterSales.acceptance.desc")}
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />{t("afterSales.acceptance.newAcceptance")}</Button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={CheckCircle2} label={t("afterSales.acceptance.accepted")} value={acceptances.filter((a: any) => a.status === "已验收").length} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Clock} label={t("afterSales.acceptance.inProgress")} value={acceptances.filter((a: any) => a.status === "验收中").length} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={Award} label={t("afterSales.acceptance.pending")} value={acceptances.filter((a: any) => a.status === "待验收").length} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>{t("afterSales.acceptance.acceptanceList")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {acceptances.map((a: any) => (
              <div key={a.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <Award className="h-10 w-10 text-primary/20" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{a.accNumber}</span>
                    <Badge variant="outline">{a.bu}</Badge>
                  </div>
                  <p className="font-medium mt-1">{a.project} - {a.customer}</p>
                  <p className="text-sm text-muted-foreground">{t("afterSales.acceptance.plannedDate")}: {a.date} · {t("afterSales.acceptance.signedBy")}: {a.signedBy}</p>
                </div>
                <div className="text-right">
                  <StatusBadge color={statusColorMap[a.status as keyof typeof statusColorMap] ?? "gray"}>{a.status}</StatusBadge>
                  {a.score > 0 && <p className="text-lg font-bold mt-1">{a.score}{t("afterSales.acceptance.points")}</p>}
                </div>
              </div>
            ))}
            {acceptances.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">{t("afterSales.acceptance.noRecords")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("afterSales.acceptance.dialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fa-project">{t("afterSales.acceptance.projectName")}</Label>
              <Input
                id="fa-project"
                placeholder="例如：半导体清洗设备"
                value={formData.project}
                onChange={e => setFormData(prev => ({ ...prev, project: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fa-customer">{t("afterSales.acceptance.customer")}</Label>
              <Input
                id="fa-customer"
                placeholder="例如：英飞凌"
                value={formData.customer}
                onChange={e => setFormData(prev => ({ ...prev, customer: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fa-date">{t("afterSales.acceptance.acceptanceDate")}</Label>
              <Input
                id="fa-date"
                type="date"
                value={formData.date}
                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            {currentBU && (
              <div className="space-y-2">
                <Label>{t("afterSales.acceptance.bu")}</Label>
                <Input value={currentBU} disabled />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("afterSales.acceptance.cancel")}</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>{t("afterSales.acceptance.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
