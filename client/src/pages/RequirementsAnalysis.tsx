/**
 * 需求分析页面 (TX-001)
 * 客户需求录入、技术可行性评估、需求分解与追踪
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserProfile } from "@/contexts/UserProfileContext";
import {
  ClipboardCheck, Plus, Search, Filter, FileText, Users,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Building2
} from "lucide-react";

// 需求状态
type RequirementStatus = "draft" | "reviewing" | "approved" | "in_progress" | "completed" | "rejected";

const STATUS_MAP: Record<RequirementStatus, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-700" },
  reviewing: { label: "评审中", color: "bg-blue-100 text-blue-700" },
  approved: { label: "已批准", color: "bg-green-100 text-green-700" },
  in_progress: { label: "进行中", color: "bg-amber-100 text-amber-700" },
  completed: { label: "已完成", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "已驳回", color: "bg-red-100 text-red-700" },
};

// 模拟数据
const MOCK_REQUIREMENTS = [
  { id: "REQ-2026-001", customer: "上海大众", title: "缸体清洗线需求", status: "approved" as RequirementStatus, priority: "high", bu: "BU3", assignee: "王工", date: "2026-02-05" },
  { id: "REQ-2026-002", customer: "宝马慕尼黑", title: "变速箱壳体清洗方案", status: "reviewing" as RequirementStatus, priority: "urgent", bu: "BU1", assignee: "李工", date: "2026-02-08" },
  { id: "REQ-2026-003", customer: "英飞凌", title: "晶圆清洗设备需求", status: "in_progress" as RequirementStatus, priority: "high", bu: "BU4", assignee: "张工", date: "2026-02-01" },
  { id: "REQ-2026-004", customer: "潍柴动力", title: "柴油机零部件清洗系统", status: "draft" as RequirementStatus, priority: "medium", bu: "BU2", assignee: "赵工", date: "2026-02-10" },
];

export default function RequirementsAnalysis() {
  const { currentBU, dataScope } = useUserProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredReqs = MOCK_REQUIREMENTS.filter(r => {
    if (currentBU && r.bu !== currentBU) return false;
    if (searchTerm && !r.title.includes(searchTerm) && !r.customer.includes(searchTerm)) return false;
    if (activeTab !== "all" && r.status !== activeTab) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            需求分析
          </h1>
          <p className="text-muted-foreground mt-1">TX-001 · 客户需求录入与技术可行性评估</p>
        </div>
        <div className="flex items-center gap-2">
          {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
          <Button><Plus className="h-4 w-4 mr-2" />新建需求</Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">总需求</p><p className="text-2xl font-bold">24</p></div>
            <FileText className="h-8 w-8 text-muted-foreground/30" />
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">评审中</p><p className="text-2xl font-bold text-blue-600">6</p></div>
            <Clock className="h-8 w-8 text-blue-200" />
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">进行中</p><p className="text-2xl font-bold text-amber-600">8</p></div>
            <ArrowRight className="h-8 w-8 text-amber-200" />
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">已完成</p><p className="text-2xl font-bold text-green-600">10</p></div>
            <CheckCircle2 className="h-8 w-8 text-green-200" />
          </div>
        </CardContent></Card>
      </div>

      {/* 筛选和列表 */}
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
                      <Badge className={STATUS_MAP[req.status].color}>{STATUS_MAP[req.status].label}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{req.date}</p>
                    </div>
                  </div>
                ))}
                {filteredReqs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">暂无需求数据</div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
