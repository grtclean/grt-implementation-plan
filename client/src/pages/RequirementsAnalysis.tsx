/**
 * 需求分析页面 (TX-001)
 * 客户需求录入、技术可行性评估、需求分解与追踪
 */
import { useState } from "react";
import { toast } from "sonner";
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
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ClipboardCheck, Plus, Search, Filter, FileText,
  CheckCircle2, Clock, ArrowRight, Building2
} from "lucide-react";

type RequirementStatus = "draft" | "reviewing" | "approved" | "in_progress" | "completed" | "rejected";

const statusColorMap = createStatusColorMap({
  draft: "gray",
  reviewing: "blue",
  approved: "green",
  in_progress: "orange",
  completed: "emerald",
  rejected: "red",
});

// STATUS_LABELS will be dynamically set via t() inside the component

// TODO: 接入 tRPC 后端接口替换
const MOCK_REQUIREMENTS = [
  { id: "REQ-2026-001", customer: "上海大众", title: "缸体清洗线需求", status: "approved" as RequirementStatus, priority: "high", bu: "BU3", assignee: "王工", date: "2026-02-05" },
  { id: "REQ-2026-002", customer: "宝马慕尼黑", title: "变速箱壳体清洗方案", status: "reviewing" as RequirementStatus, priority: "urgent", bu: "BU1", assignee: "李工", date: "2026-02-08" },
  { id: "REQ-2026-003", customer: "英飞凌", title: "晶圆清洗设备需求", status: "in_progress" as RequirementStatus, priority: "high", bu: "BU4", assignee: "张工", date: "2026-02-01" },
  { id: "REQ-2026-004", customer: "潍柴动力", title: "柴油机零部件清洗系统", status: "draft" as RequirementStatus, priority: "medium", bu: "BU2", assignee: "赵工", date: "2026-02-10" },
];

export default function RequirementsAnalysis() {
  const { currentBU } = useUserProfile();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [requirements, setRequirements] = useState(MOCK_REQUIREMENTS);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    customer: "",
    assignee: "",
    priority: "medium",
  });

  const filteredReqs = requirements.filter(r => {
    if (currentBU && r.bu !== currentBU) return false;
    if (searchTerm && !r.title.includes(searchTerm) && !r.customer.includes(searchTerm)) return false;
    if (activeTab !== "all" && r.status !== activeTab) return false;
    return true;
  });

  const STATUS_LABELS: Record<RequirementStatus, string> = {
    draft: t("rnd.requirements.statusDraft"),
    reviewing: t("rnd.requirements.statusReviewing"),
    approved: t("rnd.requirements.statusApproved"),
    in_progress: t("rnd.requirements.statusInProgress"),
    completed: t("rnd.requirements.statusCompleted"),
    rejected: t("rnd.requirements.statusRejected"),
  };

  const handleCreate = () => {
    if (!formData.title.trim()) {
      toast.error(t("rnd.requirements.enterTitle"));
      return;
    }
    if (!formData.customer.trim()) {
      toast.error(t("rnd.requirements.enterCustomer"));
      return;
    }
    if (!formData.assignee.trim()) {
      toast.error(t("rnd.requirements.enterAssignee"));
      return;
    }

    const nextNum = requirements.length + 1;
    const newId = `REQ-2026-${String(nextNum).padStart(3, "0")}`;
    const today = new Date().toISOString().slice(0, 10);
    const newReq = {
      id: newId,
      customer: formData.customer.trim(),
      title: formData.title.trim(),
      status: "draft" as RequirementStatus,
      priority: formData.priority,
      bu: currentBU || "BU3",
      assignee: formData.assignee.trim(),
      date: today,
    };

    setRequirements(prev => [newReq, ...prev]);
    setShowCreateDialog(false);
    setFormData({ title: "", customer: "", assignee: "", priority: "medium" });
    toast.success(t("rnd.requirements.createSuccess"));
  };

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
        <StatCard icon={FileText} label={t("rnd.requirements.totalRequirements")} value={requirements.length} />
        <StatCard icon={Clock} label={t("rnd.requirements.reviewing")} value={requirements.filter(r => r.status === "reviewing").length} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={ArrowRight} label={t("rnd.requirements.inProgress")} value={requirements.filter(r => r.status === "in_progress").length} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={CheckCircle2} label={t("rnd.requirements.completed")} value={requirements.filter(r => r.status === "completed").length} iconColor="text-green-500" iconBg="bg-green-500/10" />
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
                {filteredReqs.map(req => (
                  <div key={req.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground">{req.id}</span>
                        <Badge variant="outline" className="text-xs">{req.bu}</Badge>
                        {req.priority === "urgent" && <Badge variant="destructive" className="text-xs">{t("rnd.requirements.urgent")}</Badge>}
                        {req.priority === "high" && <Badge className="text-xs bg-amber-500">{t("rnd.requirements.high")}</Badge>}
                      </div>
                      <p className="font-medium mt-1">{req.title}</p>
                      <p className="text-sm text-muted-foreground">{t("rnd.requirements.customer")}: {req.customer} · {t("rnd.requirements.assignee")}: {req.assignee}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge color={statusColorMap[req.status]}>{STATUS_LABELS[req.status]}</StatusBadge>
                      <p className="text-xs text-muted-foreground mt-1">{req.date}</p>
                    </div>
                  </div>
                ))}
                {filteredReqs.length === 0 && (
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
            <Button onClick={handleCreate}>{t("rnd.requirements.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
