/**
 * 项目中心 - 项目向导、需求编辑、交付审批、甘特图、M0-M12状态机
 */
import { useState } from "react";
import { toast } from "sonner";

const showPlaceholder = (featureName: string) => {
  toast.info('功能完善中', { description: `${featureName}功能正在开发完善中，敬请期待` });
};
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderKanban, FileText, CheckSquare, BarChart3, Plus, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageHeader, StatCard } from "@/components/grt";

type Project = {
  id: string;
  name: string;
  customer: string;
  stage: string;
  progress: number;
  status: string;
  pmName: string;
};

type Deliverable = {
  id: string;
  name: string;
  type: string;
  status: string;
  reviewer: string;
};

const INITIAL_PROJECTS: Project[] = [
  { id: "prj_001", name: "上汽清洗线项目", customer: "上汽大众", stage: "M5", progress: 65, status: "on_track", pmName: "张工" },
  { id: "prj_002", name: "一汽喷涂线项目", customer: "一汽集团", stage: "M7", progress: 85, status: "at_risk", pmName: "李工" },
  { id: "prj_003", name: "比亚迪装配线", customer: "比亚迪", stage: "M3", progress: 35, status: "on_track", pmName: "王工" },
];

const INITIAL_DELIVERABLES: Deliverable[] = [
  { id: "del_001", name: "设计方案书", type: "design_doc", status: "approved", reviewer: "技术总监" },
  { id: "del_002", name: "BOM清单", type: "bom", status: "pending", reviewer: "采购经理" },
  { id: "del_003", name: "PPAP文件包", type: "ppap", status: "rejected", reviewer: "质量经理" },
];

const STAGE_OPTIONS = ["M0", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"];

const DEFAULT_FORM = { name: "", customer: "", stage: "M0", pmName: "" };

export default function ProjectHub() {
  const [activeTab, setActiveTab] = useState("projects");
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [deliverables, setDeliverables] = useState<Deliverable[]>(INITIAL_DELIVERABLES);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on_track": case "approved": return "bg-green-500/20 text-green-400";
      case "at_risk": case "pending": return "bg-yellow-500/20 text-yellow-400";
      case "delayed": case "rejected": return "bg-red-500/20 text-red-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const handleCreateProject = () => {
    if (!form.name.trim() || !form.customer.trim() || !form.pmName.trim()) {
      toast.error("请填写必填字段", { description: "项目名称、客户名称和项目经理不能为空" });
      return;
    }
    const newProject: Project = {
      id: `prj_${Date.now()}`,
      name: form.name.trim(),
      customer: form.customer.trim(),
      stage: form.stage,
      progress: 0,
      status: "on_track",
      pmName: form.pmName.trim(),
    };
    setProjects(prev => [newProject, ...prev]);
    setCreateOpen(false);
    setForm(DEFAULT_FORM);
    toast.success("新建项目成功", { description: `项目「${newProject.name}」已创建` });
  };

  const handleApprove = (del: Deliverable) => {
    setDeliverables(prev =>
      prev.map(d => d.id === del.id ? { ...d, status: "approved" } : d)
    );
    toast.success("审批通过", { description: `「${del.name}」已批准` });
  };

  const handleReject = (del: Deliverable) => {
    setDeliverables(prev =>
      prev.map(d => d.id === del.id ? { ...d, status: "rejected" } : d)
    );
    toast.success("已驳回", { description: `「${del.name}」已驳回` });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FolderKanban}
        title="项目中心"
        description="项目全生命周期管理、M0-M12状态追踪"
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />新建项目</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>新建项目</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="proj-name">项目名称 <span className="text-red-500">*</span></Label>
                  <Input
                    id="proj-name"
                    placeholder="请输入项目名称"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proj-customer">客户名称 <span className="text-red-500">*</span></Label>
                  <Input
                    id="proj-customer"
                    placeholder="请输入客户名称"
                    value={form.customer}
                    onChange={e => setForm(f => ({ ...f, customer: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proj-stage">当前阶段</Label>
                  <Select value={form.stage} onValueChange={val => setForm(f => ({ ...f, stage: val }))}>
                    <SelectTrigger id="proj-stage">
                      <SelectValue placeholder="选择阶段" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proj-pm">项目经理 <span className="text-red-500">*</span></Label>
                  <Input
                    id="proj-pm"
                    placeholder="请输入项目经理姓名"
                    value={form.pmName}
                    onChange={e => setForm(f => ({ ...f, pmName: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(DEFAULT_FORM); }}>取消</Button>
                  <Button onClick={handleCreateProject}>创建项目</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="进行中项目" value={12} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={CheckCircle2} label="按计划进行" value={8} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={AlertTriangle} label="风险项目" value={3} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
        <StatCard icon={CheckSquare} label="待审批交付物" value={5} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-card border border-border">
          <TabsTrigger value="projects"><FolderKanban className="w-4 h-4 mr-2" />项目列表</TabsTrigger>
          <TabsTrigger value="requirements"><FileText className="w-4 h-4 mr-2" />需求规格</TabsTrigger>
          <TabsTrigger value="deliverables"><CheckSquare className="w-4 h-4 mr-2" />交付审批</TabsTrigger>
          <TabsTrigger value="gantt"><BarChart3 className="w-4 h-4 mr-2" />甘特图</TabsTrigger>
          <TabsTrigger value="commissioning"><Clock className="w-4 h-4 mr-2" />调试记录</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status === "on_track" ? "正常" : project.status === "at_risk" ? "风险" : "延期"}
                    </Badge>
                  </div>
                  <CardDescription>{project.customer} · PM: {project.pmName}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>当前阶段: <Badge variant="outline">{project.stage}</Badge></span>
                      <span>{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>技术需求规格</CardTitle><CardDescription>零件特征、工艺约束、VDA标准</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">[需求规格编辑器 - 结构化需求录入]</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliverables" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>交付物审批</CardTitle><CardDescription>设计文档、BOM、PPAP等交付物审批流程</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deliverables.map((del) => (
                  <div key={del.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      <FileText className="w-8 h-8 text-primary/50" />
                      <div>
                        <p className="font-medium">{del.name}</p>
                        <p className="text-sm text-muted-foreground">审批人: {del.reviewer}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(del.status)}>
                        {del.status === "approved" ? "已批准" : del.status === "pending" ? "待审批" : "已驳回"}
                      </Badge>
                      {del.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="default" onClick={() => handleApprove(del)}>批准</Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(del)}>驳回</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gantt" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>项目甘特图</CardTitle><CardDescription>M0-M12阶段时间线可视化</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">[甘特图 - 项目时间线和里程碑]</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissioning" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>调试与验收记录</CardTitle><CardDescription>牙膏测试、周期时间、颗粒计数</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">[调试记录表单 - FAT/SAT验收数据]</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
