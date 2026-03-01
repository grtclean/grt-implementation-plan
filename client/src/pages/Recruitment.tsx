/**
 * 招聘管理页面
 * 职位发布、候选人管理、面试安排、Offer管理
 * Data source: operationsDashboard.getPositions (DB-backed)
 */
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Plus, Users, Clock, CheckCircle2, Briefcase } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

const positionStatusColorMap = createStatusColorMap({
  "招聘中": "blue",
  "面试中": "orange",
  "已关闭": "gray",
});

export default function Recruitment() {
  const { t } = useLanguage();
  const positionsQuery = trpc.operationsDashboard.getPositions.useQuery(undefined, QUERY_OPTS);
  const serverPositions = (positionsQuery.data ?? []) as any[];
  const [positions, setPositions] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    dept: "",
    salary: "",
    urgency: "正常",
  });

  // Initialize from server data
  useEffect(() => {
    if (serverPositions.length > 0 && positions.length === 0) {
      setPositions(serverPositions);
    }
  }, [serverPositions, positions.length]);

  const handleCreate = () => {
    if (!formData.title.trim()) {
      toast.error(t("hr.recruit.errTitle"));
      return;
    }
    if (!formData.dept.trim()) {
      toast.error(t("hr.recruit.errDept"));
      return;
    }
    if (!formData.salary.trim()) {
      toast.error(t("hr.recruit.errSalary"));
      return;
    }

    const newId = Math.max(...positions.map((p: any) => p.id), 0) + 1;
    const newPosition = {
      id: newId,
      title: formData.title.trim(),
      dept: formData.dept.trim(),
      bu: "通用",
      applicants: 0,
      status: "招聘中",
      urgency: formData.urgency,
      salary: formData.salary.trim(),
    };

    setPositions(prev => [newPosition, ...prev]);
    setShowCreateDialog(false);
    setFormData({ title: "", dept: "", salary: "", urgency: "正常" });
    toast.success(t("hr.recruit.publishSuccess"));
  };

  if (positionsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UserCheck}
        title={t("hr.recruit.title")}
        description={t("hr.recruit.desc")}
        actions={<Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />{t("hr.recruit.publishPosition")}</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Briefcase} label={t("hr.recruit.openPositions")} value={positions.filter((p: any) => p.status === "招聘中").length} />
        <StatCard icon={Users} label={t("hr.recruit.candidates")} value={positions.reduce((sum: number, p: any) => sum + (p.applicants ?? 0), 0)} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Clock} label={t("hr.recruit.interviewing")} value={positions.filter((p: any) => p.status === "面试中").length} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={CheckCircle2} label={t("hr.recruit.closed")} value={positions.filter((p: any) => p.status === "已关闭").length} iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader><CardTitle>{t("hr.recruit.positionList")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {positions.map((p: any) => (
              <div key={p.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <Briefcase className="h-10 w-10 text-primary/20" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.title}</span>
                    {p.urgency === "紧急" && <Badge variant="destructive">{t("hr.recruit.urgent")}</Badge>}
                    {p.urgency === "高" && <Badge className="bg-amber-500">{t("hr.recruit.high")}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{p.dept} · {p.bu} · {p.salary}</p>
                </div>
                <div className="text-right">
                  <StatusBadge color={positionStatusColorMap[p.status as keyof typeof positionStatusColorMap] ?? "gray"}>{p.status}</StatusBadge>
                  <p className="text-sm text-muted-foreground mt-1"><Users className="inline h-3 w-3 mr-1" />{p.applicants}{t("hr.recruit.candidateCount")}</p>
                </div>
              </div>
            ))}
            {positions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <UserCheck className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">{t("hr.recruit.noPositions")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("hr.recruit.publishPosition")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rc-title">{t("hr.recruit.positionName")} *</Label>
              <Input
                id="rc-title"
                placeholder="例如：高级机械工程师"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rc-dept">{t("hr.recruit.department")} *</Label>
              <Input
                id="rc-dept"
                placeholder="例如：研发设计部"
                value={formData.dept}
                onChange={e => setFormData(prev => ({ ...prev, dept: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rc-salary">{t("hr.recruit.salaryRange")} *</Label>
              <Input
                id="rc-salary"
                placeholder="例如：20-35K"
                value={formData.salary}
                onChange={e => setFormData(prev => ({ ...prev, salary: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("hr.recruit.urgencyLevel")}</Label>
              <Select value={formData.urgency} onValueChange={val => setFormData(prev => ({ ...prev, urgency: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="正常">正常</SelectItem>
                  <SelectItem value="高">高</SelectItem>
                  <SelectItem value="紧急">紧急</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("hr.common.cancel")}</Button>
            <Button onClick={handleCreate}>{t("hr.recruit.publish")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
