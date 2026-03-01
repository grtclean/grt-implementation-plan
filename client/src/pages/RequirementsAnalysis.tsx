/**
 * 需求分析页面 (TX-001)
 * 客户需求录入、技术可行性评估、需求分解与追踪
 *
 * Data source: trpc.rndPipeline.requirement.* (DB-backed)
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ClipboardCheck, Plus, Search, Filter, FileText,
  CheckCircle2, Clock, ArrowRight, Building2
} from "lucide-react";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

type RequirementStatus = "draft" | "reviewing" | "approved" | "in_progress" | "completed" | "rejected";

const statusColorMap = createStatusColorMap({
  draft: "gray",
  reviewing: "blue",
  approved: "green",
  in_progress: "orange",
  completed: "emerald",
  rejected: "red",
});

export default function RequirementsAnalysis() {
  const { currentBU } = useUserProfile();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    customer: "",
    assignee: "",
    priority: "medium",
  });

  // ─── tRPC queries ───
  const reqQuery = trpc.rndPipeline.requirement.list.useQuery(
    {
      search: searchTerm || undefined,
      bu: currentBU || undefined,
      status: activeTab !== "all" ? activeTab : undefined,
    },
    QUERY_OPTS,
  );

  const createMut = trpc.rndPipeline.requirement.create.useMutation({
    onSuccess: () => {
      reqQuery.refetch();
      setShowCreateDialog(false);
      setFormData({ title: "", customer: "", assignee: "", priority: "medium" });
      toast.success(t("rnd.requirements.createSuccess"));
    },
    onError: (err) => toast.error(err.message),
  });

  const requirements = (reqQuery.data?.items ?? []) as any[];
  const isLoading = reqQuery.isLoading;

  // All items for stats (ignore tab filter)
  const allReqQuery = trpc.rndPipeline.requirement.list.useQuery(
    { bu: currentBU || undefined },
    QUERY_OPTS,
  );
  const allReqs = (allReqQuery.data?.items ?? []) as any[];

  const STATUS_LABELS: Record<RequirementStatus, string> = {
    draft: t("rnd.requirements.statusDraft"),
    reviewing: t("rnd.requirements.statusReviewing"),
    approved: t("rnd.requirements.statusApproved"),
    in_progress: t("rnd.requirements.statusInProgress"),
    completed: t("rnd.requirements.statusCompleted"),
    rejected: t("rnd.requirements.statusRejected"),
  };

  const handleCreate = () => {
    if (!formData.title.trim()) { toast.error(t("rnd.requirements.enterTitle")); return; }
    if (!formData.customer.trim()) { toast.error(t("rnd.requirements.enterCustomer")); return; }
    if (!formData.assignee.trim()) { toast.error(t("rnd.requirements.enterAssignee")); return; }
    createMut.mutate({
      title: formData.title.trim(),
      customer: formData.customer.trim(),
      assignee: formData.assignee.trim(),
      priority: formData.priority,
      bu: currentBU || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={ClipboardCheck} title={t("rnd.requirements.title")} description="..." />
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
        icon={ClipboardCheck}
        title={t("rnd.requirements.title")}
        description={t("rnd.requirements.description")}
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />{t("rnd.requirements.newRequirement")}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label={t("rnd.requirements.totalRequirements")} value={allReqs.length} />
        <StatCard icon={Clock} label={t("rnd.requirements.reviewing")} value={allReqs.filter((r: any) => r.status === "reviewing").length} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={ArrowRight} label={t("rnd.requirements.inProgress")} value={allReqs.filter((r: any) => r.status === "in_progress").length} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={CheckCircle2} label={t("rnd.requirements.completed")} value={allReqs.filter((r: any) => r.status === "completed").length} iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t("rnd.requirements.requirementList")}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t("rnd.requirements.searchPlaceholder")} className="pl-9 w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" />{t("rnd.requirements.filter")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">{t("rnd.requirements.tabAll")}</TabsTrigger>
              <TabsTrigger value="draft">{t("rnd.requirements.tabDraft")}</TabsTrigger>
              <TabsTrigger value="reviewing">{t("rnd.requirements.tabReviewing")}</TabsTrigger>
              <TabsTrigger value="approved">{t("rnd.requirements.tabApproved")}</TabsTrigger>
              <TabsTrigger value="in_progress">{t("rnd.requirements.tabInProgress")}</TabsTrigger>
              <TabsTrigger value="completed">{t("rnd.requirements.tabCompleted")}</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-2">
                {requirements.map((req: any) => (
                  <div key={req.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground">{req.reqNumber}</span>
                        <Badge variant="outline" className="text-xs">{req.bu}</Badge>
                        {req.priority === "urgent" && <Badge variant="destructive" className="text-xs">{t("rnd.requirements.urgent")}</Badge>}
                        {req.priority === "high" && <Badge className="text-xs bg-amber-500">{t("rnd.requirements.high")}</Badge>}
                      </div>
                      <p className="font-medium mt-1">{req.title}</p>
                      <p className="text-sm text-muted-foreground">{t("rnd.requirements.customer")}: {req.customer} · {t("rnd.requirements.assignee")}: {req.assignee}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge color={statusColorMap[req.status as keyof typeof statusColorMap] ?? "gray"}>{STATUS_LABELS[req.status as RequirementStatus] ?? req.status}</StatusBadge>
                      <p className="text-xs text-muted-foreground mt-1">{req.date}</p>
                    </div>
                  </div>
                ))}
                {requirements.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ClipboardCheck className="w-12 h-12 mb-3 opacity-50" />
                    <p className="font-medium">{t("rnd.requirements.noData")}</p>
                    <p className="text-sm">{t("rnd.requirements.noDataHint")}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rnd.requirements.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="req-title">{t("rnd.requirements.reqTitle")} *</Label>
              <Input
                id="req-title"
                placeholder={t("rnd.requirements.reqTitlePlaceholder")}
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-customer">{t("rnd.requirements.customerLabel")} *</Label>
              <Input
                id="req-customer"
                placeholder={t("rnd.requirements.customerPlaceholder")}
                value={formData.customer}
                onChange={e => setFormData(prev => ({ ...prev, customer: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-assignee">{t("rnd.requirements.assigneeLabel")} *</Label>
              <Input
                id="req-assignee"
                placeholder={t("rnd.requirements.assigneePlaceholder")}
                value={formData.assignee}
                onChange={e => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("rnd.requirements.priorityLabel")}</Label>
              <Select value={formData.priority} onValueChange={val => setFormData(prev => ({ ...prev, priority: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("rnd.requirements.priorityLow")}</SelectItem>
                  <SelectItem value="medium">{t("rnd.requirements.priorityMedium")}</SelectItem>
                  <SelectItem value="high">{t("rnd.requirements.priorityHigh")}</SelectItem>
                  <SelectItem value="urgent">{t("rnd.requirements.priorityUrgent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {currentBU && (
              <div className="space-y-2">
                <Label>{t("rnd.requirements.buLabel")}</Label>
                <Input value={currentBU} disabled />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("rnd.requirements.cancel")}</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>{t("rnd.requirements.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
