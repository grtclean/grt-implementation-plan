/**
 * 项目中心增强版 - 模板库、变更追踪、甘特图依赖
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FolderKanban, FileText, GitBranch, BarChart3, Bell,
  Calendar, ChevronRight, Clock, AlertTriangle
} from "lucide-react";
import { PageHeader } from "@/components/grt";
import Layout from "@/components/Layout";

// 项目模板库
const projectTemplates = [
  { id: "t1", name: "标准清洗设备项目", stages: 12, duration: "16周", usageCount: 45 },
  { id: "t2", name: "快速交付项目", stages: 8, duration: "8周", usageCount: 23 },
  { id: "t3", name: "定制化项目", stages: 14, duration: "24周", usageCount: 12 },
];

// 需求变更记录
const changeRequests = [
  { id: "CR-001", title: "增加喷嘴压力监测功能", status: "approved", impact: "中", date: "2026-01-28" },
  { id: "CR-002", title: "修改清洗槽尺寸", status: "pending", impact: "高", date: "2026-01-30" },
  { id: "CR-003", title: "优化PLC控制逻辑", status: "rejected", impact: "低", date: "2026-01-25" },
];

// 交付物版本
const deliverables = [
  { name: "设计图纸", version: "v2.3", status: "approved", updatedAt: "2026-01-29" },
  { name: "BOM清单", version: "v1.8", status: "review", updatedAt: "2026-01-30" },
  { name: "测试报告", version: "v1.2", status: "draft", updatedAt: "2026-01-30" },
];

// 甘特图数据
const ganttTasks = [
  { id: "g1", name: "M0 立项", start: 0, duration: 2, progress: 100, dependencies: [] },
  { id: "g2", name: "M3 设计", start: 2, duration: 4, progress: 100, dependencies: ["g1"] },
  { id: "g3", name: "M5 采购", start: 6, duration: 3, progress: 60, dependencies: ["g2"] },
  { id: "g4", name: "M7 装配", start: 9, duration: 4, progress: 0, dependencies: ["g3"] },
  { id: "g5", name: "M12 交付", start: 13, duration: 3, progress: 0, dependencies: ["g4"] },
];

// 里程碑提醒
const milestoneReminders = [
  { name: "M5 采购完成", dueDate: "2026-02-05", daysLeft: 6, status: "warning" },
  { name: "设计评审会议", dueDate: "2026-02-01", daysLeft: 2, status: "urgent" },
  { name: "M7 装配启动", dueDate: "2026-02-15", daysLeft: 16, status: "normal" },
];

export default function ProjectHubEnhanced() {
  const [activeTab, setActiveTab] = useState("templates");

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: "bg-green-500/20 text-green-400",
      pending: "bg-yellow-500/20 text-yellow-400",
      rejected: "bg-red-500/20 text-red-400",
      review: "bg-blue-500/20 text-blue-400",
      draft: "bg-gray-500/20 text-gray-400",
    };
    return styles[status] || styles.draft;
  };

  const getReminderStatus = (status: string) => {
    if (status === "urgent") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (status === "warning") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-green-500/20 text-green-400 border-green-500/30";
  };

  return (
    <Layout>
    <div className="space-y-6">
      <PageHeader
        icon={FolderKanban}
        title="项目中心 (增强版)"
        description="模板库管理、变更追踪、甘特图依赖、里程碑提醒"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-card border border-border">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />模板库
          </TabsTrigger>
          <TabsTrigger value="changes" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />变更追踪
          </TabsTrigger>
          <TabsTrigger value="deliverables" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />交付物
          </TabsTrigger>
          <TabsTrigger value="gantt" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />甘特图
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />提醒
          </TabsTrigger>
        </TabsList>

        {/* 项目模板库 */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>项目模板库</CardTitle>
              <CardDescription>预置项目模板，快速创建新项目</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {projectTemplates.map((template) => (
                  <div key={template.id} className="p-4 bg-muted rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <FileText className="w-8 h-8 text-primary/50" />
                      <Badge variant="outline">{template.usageCount}次使用</Badge>
                    </div>
                    <h3 className="font-medium mb-2">{template.name}</h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{template.stages}个阶段</span>
                      <span>{template.duration}</span>
                    </div>
                    <Button className="w-full mt-3" variant="outline" size="sm">
                      使用模板
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 需求变更追踪 */}
        <TabsContent value="changes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>需求变更追踪</CardTitle>
              <CardDescription>记录和管理所有需求变更请求</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {changeRequests.map((cr) => (
                  <div key={cr.id} className="p-4 bg-muted rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <GitBranch className="w-5 h-5 text-primary/50" />
                        <div>
                          <p className="font-medium">{cr.id}: {cr.title}</p>
                          <p className="text-xs text-muted-foreground">{cr.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">影响: {cr.impact}</Badge>
                        <Badge className={getStatusBadge(cr.status)}>
                          {cr.status === "approved" ? "已批准" : cr.status === "pending" ? "待审核" : "已拒绝"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 交付物版本管理 */}
        <TabsContent value="deliverables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>交付物版本管理</CardTitle>
              <CardDescription>追踪所有交付物的版本历史</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deliverables.map((d, idx) => (
                  <div key={idx} className="p-4 bg-muted rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary/50" />
                        <div>
                          <p className="font-medium">{d.name}</p>
                          <p className="text-xs text-muted-foreground">更新于 {d.updatedAt}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{d.version}</Badge>
                        <Badge className={getStatusBadge(d.status)}>
                          {d.status === "approved" ? "已批准" : d.status === "review" ? "评审中" : "草稿"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 甘特图 */}
        <TabsContent value="gantt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>项目甘特图</CardTitle>
              <CardDescription>可视化项目进度和任务依赖关系</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ganttTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium">{task.name}</div>
                    <div className="flex-1 h-8 bg-muted rounded relative">
                      <div 
                        className="absolute h-full bg-primary/30 rounded"
                        style={{ 
                          left: `${(task.start / 16) * 100}%`, 
                          width: `${(task.duration / 16) * 100}%` 
                        }}
                      >
                        <div 
                          className="h-full bg-primary rounded"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      {task.dependencies.length > 0 && (
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-400 rounded-full"
                          style={{ left: `${(task.start / 16) * 100 - 2}%` }}
                        />
                      )}
                    </div>
                    <div className="w-16 text-sm text-right">{task.progress}%</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-primary rounded" /> 已完成</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-primary/30 rounded" /> 计划中</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-400 rounded-full" /> 依赖点</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 里程碑提醒 */}
        <TabsContent value="reminders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>里程碑提醒</CardTitle>
              <CardDescription>即将到期的里程碑和重要节点</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {milestoneReminders.map((reminder, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border ${getReminderStatus(reminder.status)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {reminder.status === "urgent" ? (
                          <AlertTriangle className="w-5 h-5" />
                        ) : (
                          <Calendar className="w-5 h-5" />
                        )}
                        <div>
                          <p className="font-medium">{reminder.name}</p>
                          <p className="text-xs opacity-70">截止日期: {reminder.dueDate}</p>
                        </div>
                      </div>
                      <Badge className={getReminderStatus(reminder.status)}>
                        {reminder.daysLeft}天后
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </Layout>
  );
}
