/**
 * 现场安装页面 (TX-013)
 * 设备安装进度、安装团队调度、现场问题记录
 *
 * Data source: trpc.rndPipeline.installation.* (DB-backed)
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
import { Wrench, Plus, MapPin, Users, Clock, CheckCircle2, Building2, Truck } from "lucide-react";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

const statusColorMap = createStatusColorMap({
  "安装中": "blue",
  "待出发": "orange",
  "已完成": "green",
});

export default function FieldInstallation() {
  const { t } = useLanguage();
  const { currentBU } = useUserProfile();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    project: "",
    customer: "",
    location: "",
    team: "",
    startDate: "",
    endDate: "",
  });

  // ─── tRPC queries ───
  const instQuery = trpc.rndPipeline.installation.list.useQuery(
    { bu: currentBU || undefined },
    QUERY_OPTS,
  );

  const createMut = trpc.rndPipeline.installation.create.useMutation({
    onSuccess: () => {
      instQuery.refetch();
      setShowCreateDialog(false);
      setFormData({ project: "", customer: "", location: "", team: "", startDate: "", endDate: "" });
      toast.success(t("afterSales.install.createSuccess"));
    },
    onError: (err) => toast.error(err.message),
  });

  const installations = (instQuery.data?.items ?? []) as any[];
  const isLoading = instQuery.isLoading;

  const handleCreate = () => {
    if (!formData.project.trim()) { toast.error(t("afterSales.install.fillProject")); return; }
    if (!formData.customer.trim()) { toast.error(t("afterSales.install.fillCustomer")); return; }
    if (!formData.location.trim()) { toast.error(t("afterSales.install.fillLocation")); return; }
    if (!formData.team.trim()) { toast.error(t("afterSales.install.fillTeam")); return; }
    if (!formData.startDate) { toast.error(t("afterSales.install.fillStart")); return; }
    if (!formData.endDate) { toast.error(t("afterSales.install.fillEnd")); return; }
    createMut.mutate({
      project: formData.project.trim(),
      customer: formData.customer.trim(),
      location: formData.location.trim(),
      team: formData.team.trim(),
      startDate: formData.startDate,
      endDate: formData.endDate,
      bu: currentBU || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Wrench} title={t("afterSales.install.title")} description="..." />
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
        icon={Wrench}
        title={t("afterSales.install.title")}
        description={t("afterSales.install.desc")}
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />{t("afterSales.install.newTask")}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Wrench} label={t("afterSales.install.totalTasks")} value={installations.length} />
        <StatCard icon={Truck} label={t("afterSales.install.inProgress")} value={installations.filter((i: any) => i.status === "安装中").length} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={Clock} label={t("afterSales.install.waiting")} value={installations.filter((i: any) => i.status === "待出发").length} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={CheckCircle2} label={t("afterSales.install.completed")} value={installations.filter((i: any) => i.status === "已完成").length} iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>{t("afterSales.install.taskList")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {installations.map((ins: any) => (
              <div key={ins.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{ins.instNumber}</span>
                    <Badge variant="outline">{ins.bu}</Badge>
                    <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />{ins.team}</Badge>
                  </div>
                  <p className="font-medium mt-1">{ins.project} - {ins.customer}</p>
                  <p className="text-sm text-muted-foreground"><MapPin className="inline h-3 w-3 mr-1" />{ins.location} · {ins.startDate} ~ {ins.endDate}</p>
                </div>
                <div className="text-right space-y-1">
                  <StatusBadge color={statusColorMap[ins.status as keyof typeof statusColorMap] ?? "gray"}>{ins.status}</StatusBadge>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${ins.progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{ins.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
            {installations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Wrench className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">{t("afterSales.install.noTasks")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("afterSales.install.dialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fi-project">{t("afterSales.install.projectName")}</Label>
              <Input
                id="fi-project"
                placeholder="例如：缸体清洗线"
                value={formData.project}
                onChange={e => setFormData(prev => ({ ...prev, project: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fi-customer">{t("afterSales.install.customer")}</Label>
              <Input
                id="fi-customer"
                placeholder="例如：上海大众"
                value={formData.customer}
                onChange={e => setFormData(prev => ({ ...prev, customer: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fi-location">{t("afterSales.install.location")}</Label>
              <Input
                id="fi-location"
                placeholder="例如：上海安亭工厂"
                value={formData.location}
                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fi-team">{t("afterSales.install.team")}</Label>
              <Input
                id="fi-team"
                placeholder="例如：安装A组"
                value={formData.team}
                onChange={e => setFormData(prev => ({ ...prev, team: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fi-start">{t("afterSales.install.startDate")}</Label>
                <Input
                  id="fi-start"
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fi-end">{t("afterSales.install.endDate")}</Label>
                <Input
                  id="fi-end"
                  type="date"
                  value={formData.endDate}
                  onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("afterSales.install.cancel")}</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>{t("afterSales.install.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
