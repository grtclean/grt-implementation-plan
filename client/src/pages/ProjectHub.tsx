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
import { Progress } from "@/components/ui/progress";
import { FolderKanban, FileText, CheckSquare, BarChart3, Plus, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

const mockProjects = [
  { id: "prj_001", name: "上汽清洗线项目", customer: "上汽大众", stage: "M5", progress: 65, status: "on_track", pmName: "张工" },
  { id: "prj_002", name: "一汽喷涂线项目", customer: "一汽集团", stage: "M7", progress: 85, status: "at_risk", pmName: "李工" },
  { id: "prj_003", name: "比亚迪装配线", customer: "比亚迪", stage: "M3", progress: 35, status: "on_track", pmName: "王工" },
];

const mockDeliverables = [
  { id: "del_001", name: "设计方案书", type: "design_doc", status: "approved", reviewer: "技术总监" },
  { id: "del_002", name: "BOM清单", type: "bom", status: "pending", reviewer: "采购经理" },
  { id: "del_003", name: "PPAP文件包", type: "ppap", status: "rejected", reviewer: "质量经理" },
];

export default function ProjectHub() {
  const [activeTab, setActiveTab] = useState("projects");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on_track": case "approved": return "bg-green-500/20 text-green-400";
      case "at_risk": case "pending": return "bg-yellow-500/20 text-yellow-400";
      case "delayed": case "rejected": return "bg-red-500/20 text-red-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-primary" />
            项目中心
          </h1>
          <p className="text-muted-foreground mt-1">项目全生命周期管理、M0-M12状态追踪</p>
        </div>
        <Button size="sm" onClick={() => showPlaceholder('新建项目')}><Plus className="w-4 h-4 mr-2" />新建项目</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">进行中项目</p><p className="text-2xl font-bold text-primary">12</p></div>
              <FolderKanban className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">按计划进行</p><p className="text-2xl font-bold text-green-400">8</p></div>
              <CheckCircle2 className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">风险项目</p><p className="text-2xl font-bold text-yellow-400">3</p></div>
              <AlertTriangle className="w-8 h-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">待审批交付物</p><p className="text-2xl font-bold text-blue-400">5</p></div>
              <CheckSquare className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
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
            {mockProjects.map((project) => (
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
                {mockDeliverables.map((del) => (
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
                          <Button size="sm" variant="default" onClick={() => showPlaceholder('审批批准')}>批准</Button>
                          <Button size="sm" variant="outline" onClick={() => showPlaceholder('审批驳回')}>驳回</Button>
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
