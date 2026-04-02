/**
 * 机械设计页面 (TX-003)
 * 机械结构设计、图纸管理、设计变更
 *
 * Data source: trpc.rndPipeline.mechanical.* (DB-backed)
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
import { Cog, Plus, Upload, Building2, CheckCircle2, Clock, AlertTriangle, FileText } from "lucide-react";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

const statusColorMap = createStatusColorMap({
  "设计中": "blue",
  "已审核": "green",
  "审核中": "orange",
});

export default function MechanicalDesign() {
  const { currentBU } = useUserProfile();
  const { t } = useLanguage();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({ name: "", project: "", engineer: "" });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // ─── tRPC queries ───
  const designQuery = trpc.rndPipeline.mechanical.list.useQuery(
    { bu: currentBU || undefined },
    QUERY_OPTS,
  );

  const createMut = trpc.rndPipeline.mechanical.create.useMutation({
    onSuccess: () => {
      designQuery.refetch();
      setShowCreateDialog(false);
      setFormData({ name: "", project: "", engineer: "" });
      toast.success(t("rnd.mechanical.createSuccess"));
    },
    onError: (err) => toast.error(err.message),
  });

  const designs = (designQuery.data?.items ?? []) as any[];
  const isLoading = designQuery.isLoading;

  const handleCreate = () => {
    if (!formData.name.trim()) { toast.error(t("rnd.mechanical.enterName")); return; }
    if (!formData.project.trim()) { toast.error(t("rnd.mechanical.enterProject")); return; }
    if (!formData.engineer.trim()) { toast.error(t("rnd.mechanical.enterEngineer")); return; }
    createMut.mutate({
      name: formData.name.trim(),
      project: formData.project.trim(),
      engineer: formData.engineer.trim(),
      bu: currentBU || undefined,
    });
  };

  const handleUploadComingSoon = () => {
    toast.info(t("rnd.mechanical.uploadComingSoon"));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Cog} title={t("rnd.mechanical.title")} description="..." />
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
        icon={Cog}
        title={t("rnd.mechanical.title")}
        description={t("rnd.mechanical.description")}
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />{t("rnd.mechanical.newDesign")}</Button>
            <Button variant="outline" onClick={handleUploadComingSoon}><Upload className="h-4 w-4 mr-2" />{t("rnd.mechanical.uploadDrawing")}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label={t("rnd.mechanical.totalTasks")} value={designs.length} />
        <StatCard icon={Clock} label={t("rnd.mechanical.designing")} value={designs.filter((d: any) => d.status === "设计中").length} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={AlertTriangle} label={t("rnd.mechanical.reviewing")} value={designs.filter((d: any) => d.status === "审核中").length} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={CheckCircle2} label={t("rnd.mechanical.completed")} value={designs.filter((d: any) => d.status === "已审核").length} iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>{t("rnd.mechanical.taskList")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {designs.map((d: any) => (
              <div key={d.id}>
                <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">{d.taskNumber}</span>
                      <Badge variant="outline">{d.bu || d.buCode}</Badge>
                      <Badge variant="secondary">{d.rev || d.revision}</Badge>
                    </div>
                    <p className="font-medium mt-1">{d.name}</p>
                    <p className="text-sm text-muted-foreground">{t("rnd.mechanical.project")}: {d.project} · {t("rnd.mechanical.engineer")}: {d.engineer}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <StatusBadge color={statusColorMap[d.status as keyof typeof statusColorMap] ?? 'gray'}>{d.status}</StatusBadge>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${d.progress}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{d.progress}%</span>
                    </div>
                  </div>
                </div>
                {expandedId === d.id && (
                  <div className="mx-4 mb-3 p-4 bg-muted/30 rounded-b-lg border border-t-0 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-background rounded border"><span className="text-muted-foreground">设计类型: </span><span className="font-medium">{d.designType || "通用"}</span></div>
                      <div className="p-2 bg-background rounded border"><span className="text-muted-foreground">优先级: </span><span className="font-medium">{d.priority || "medium"}</span></div>
                      <div className="p-2 bg-background rounded border"><span className="text-muted-foreground">审核人: </span><span className="font-medium">{d.reviewer || "待指定"}</span></div>
                      <div className="p-2 bg-background rounded border"><span className="text-muted-foreground">截止: </span><span className="font-medium">{d.dueDate || "未设定"}</span></div>
                    </div>
                    {d.description && <div className="text-sm text-muted-foreground bg-background p-3 rounded border"><span className="font-medium text-foreground">描述: </span>{d.description}</div>}
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); window.location.href = `/drawing-library?product=${d.project}`; }}>关联图纸</Button>
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); window.location.href = `/bom-management?product=${d.project}`; }}>关联BOM</Button>
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); window.location.href = `/pdm?product=${d.project}`; }}>PDM</Button>
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); window.location.href = `/design-knowledge`; }}>设计知识</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {designs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Cog className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">{t("rnd.mechanical.noTasks")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rnd.mechanical.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="md-name">{t("rnd.mechanical.designName")} *</Label>
              <Input
                id="md-name"
                placeholder={t("rnd.mechanical.designNamePlaceholder")}
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="md-project">{t("rnd.mechanical.belongProject")} *</Label>
              <Input
                id="md-project"
                placeholder={t("rnd.mechanical.belongProjectPlaceholder")}
                value={formData.project}
                onChange={e => setFormData(prev => ({ ...prev, project: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="md-engineer">{t("rnd.mechanical.engineerLabel")} *</Label>
              <Input
                id="md-engineer"
                placeholder={t("rnd.mechanical.engineerPlaceholder")}
                value={formData.engineer}
                onChange={e => setFormData(prev => ({ ...prev, engineer: e.target.value }))}
              />
            </div>
            {currentBU && (
              <div className="space-y-2">
                <Label>{t("rnd.mechanical.buLabel")}</Label>
                <Input value={currentBU} disabled />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("rnd.mechanical.cancel")}</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>{t("rnd.mechanical.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
