/**
 * 需求分析页面 (TX-001)
 * 客户需求录入、技术可行性评估、需求分解与追踪
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const { toast } = useToast();
  const { currentBU } = useUserProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const handleComingSoon = () => {
    toast({ title: "功能开发中", description: "该功能正在开发中，敬请期待" });
  };

  const filteredReqs = MOCK_REQUIREMENTS.filter(r => {
    if (currentBU && r.bu !== currentBU) return false;
    if (searchTerm && !r.title.includes(searchTerm) && !r.customer.includes(searchTerm)) return false;
    if (activeTab !== "all" && r.status !== activeTab) return false;
    return true;
  });

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardCheck}
        title="需求分析"
        description="TX-001 · 客户需求录入与技术可行性评估"
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={handleComingSoon}><Plus className="h-4 w-4 mr-2" />新建需求</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="总需求" value={24} />
        <StatCard icon={Clock} label="评审中" value={6} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={ArrowRight} label="进行中" value={8} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        <StatCard icon={CheckCircle2} label="已完成" value={10} iconColor="text-green-500" iconBg="bg-green-500/10" />
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
    </div>
    </Layout>
  );
}
