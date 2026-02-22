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

const STATUS_LABELS: Record<RequirementStatus, string> = {
  draft: "草稿",
  reviewing: "评审中",
  approved: "已批准",
  in_progress: "进行中",
  completed: "已完成",
  rejected: "已驳回",
};

// TODO: 接入 tRPC 后端接口替换
const MOCK_REQUIREMENTS = [
  { id: "REQ-2026-001", customer: "上海大众", title: "缸体清洗线需求", status: "approved" as RequirementStatus, priority: "high", bu: "BU3", assignee: "王工", date: "2026-02-05" },
  { id: "REQ-2026-002", customer: "宝马慕尼黑", title: "变速箱壳体清洗方案", status: "reviewing" as RequirementStatus, priority: "urgent", bu: "BU1", assignee: "李工", date: "2026-02-08" },
  { id: "REQ-2026-003", customer: "英飞凌", title: "晶圆清洗设备需求", status: "in_progress" as RequirementStatus, priority: "high", bu: "BU4", assignee: "张工", date: "2026-02-01" },
  { id: "REQ-2026-004", customer: "潍柴动力", title: "柴油机零部件清洗系统", status: "draft" as RequirementStatus, priority: "medium", bu: "BU2", assignee: "赵工", date: "2026-02-10" },
];

export default function RequirementsAnalysis() {
  const { currentBU } = useUserProfile();
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

  const handleCreate = () => {
    if (!formData.title.trim()) {
      toast.error("请输入需求标题");
      return;
    }
    if (!formData.customer.trim()) {
      toast.error("请输入客户名称");
      return;
    }
    if (!formData.assignee.trim()) {
      toast.error("请输入负责人");
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
    toast.success("需求创建成功");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardCheck}
        title="需求分析"
        description="TX-001 · 客户需求录入与技术可行性评估"
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />新建需求</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="总需求" value={requirements.length} />
        <StatCard icon={Clock} label="评审中" value={requirements.filter(r => r.status === "reviewing").length} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={ArrowRight} label="进行中" value={requirements.filter(r => r.status === "in_progress").length} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={CheckCircle2} label="已完成" value={requirements.filter(r => r.status === "completed").length} iconColor="text-green-500" iconBg="bg-green-500/10" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">需求列表</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索需求..." className="pl-9 w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" />筛选</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="draft">草稿</TabsTrigger>
              <TabsTrigger value="reviewing">评审中</TabsTrigger>
              <TabsTrigger value="approved">已批准</TabsTrigger>
              <TabsTrigger value="in_progress">进行中</TabsTrigger>
              <TabsTrigger value="completed">已完成</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-2">
                {filteredReqs.map(req => (
                  <div key={req.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground">{req.id}</span>
                        <Badge variant="outline" className="text-xs">{req.bu}</Badge>
                        {req.priority === "urgent" && <Badge variant="destructive" className="text-xs">紧急</Badge>}
                        {req.priority === "high" && <Badge className="text-xs bg-amber-500">高</Badge>}
                      </div>
                      <p className="font-medium mt-1">{req.title}</p>
                      <p className="text-sm text-muted-foreground">客户: {req.customer} · 负责人: {req.assignee}</p>
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
                    <p className="font-medium">暂无需求数据</p>
                    <p className="text-sm">点击"新建需求"创建第一条需求</p>
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
            <DialogTitle>新建需求</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="req-title">需求标题 *</Label>
              <Input
                id="req-title"
                placeholder="例如：缸体清洗线需求"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-customer">客户 *</Label>
              <Input
                id="req-customer"
                placeholder="例如：上海大众"
                value={formData.customer}
                onChange={e => setFormData(prev => ({ ...prev, customer: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-assignee">负责人 *</Label>
              <Input
                id="req-assignee"
                placeholder="例如：王工"
                value={formData.assignee}
                onChange={e => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>优先级</Label>
              <Select value={formData.priority} onValueChange={val => setFormData(prev => ({ ...prev, priority: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="urgent">紧急</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {currentBU && (
              <div className="space-y-2">
                <Label>事业部</Label>
                <Input value={currentBU} disabled />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button onClick={handleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
