/**
 * T工序甘特图组件
 * 展示T1-T15工序的时间线和进度
 */

import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Pause,
  RotateCcw,
  Filter,
  Download
} from "lucide-react";

// T工序步骤定义 - 导出供测试使用
export const PROCESS_STEPS = [
  { id: "T1", name: "立项启动", nameEn: "Project Initiation", duration: 3, phase: "M0" },
  { id: "T2", name: "需求确认", nameEn: "Requirements Confirmation", duration: 5, phase: "M1" },
  { id: "T3", name: "方案设计", nameEn: "Solution Design", duration: 10, phase: "M2" },
  { id: "T4", name: "技术评审", nameEn: "Technical Review", duration: 3, phase: "M2" },
  { id: "T5", name: "BOM确认", nameEn: "BOM Confirmation", duration: 5, phase: "M3" },
  { id: "T6", name: "采购下单", nameEn: "Procurement", duration: 7, phase: "M3" },
  { id: "T7", name: "来料检验", nameEn: "Incoming Inspection", duration: 3, phase: "M4" },
  { id: "T8", name: "机加工", nameEn: "Machining", duration: 15, phase: "M5" },
  { id: "T9", name: "装配", nameEn: "Assembly", duration: 10, phase: "M5" },
  { id: "T10", name: "调试", nameEn: "Commissioning", duration: 7, phase: "M6" },
  { id: "T11", name: "内部验收", nameEn: "Internal Acceptance", duration: 3, phase: "M7" },
  { id: "T12", name: "包装发运", nameEn: "Packaging & Shipping", duration: 5, phase: "M8" },
  { id: "T13", name: "现场安装", nameEn: "On-site Installation", duration: 7, phase: "M9" },
  { id: "T14", name: "客户验收", nameEn: "Customer Acceptance", duration: 5, phase: "M10" },
  { id: "T15", name: "质保服务", nameEn: "Warranty Service", duration: 365, phase: "M11-M12" },
];

// 工序状态类型
type ProcessStatus = "pending" | "in_progress" | "completed" | "delayed" | "blocked";

// 工序实例接口
interface ProcessInstance {
  id: string;
  stepId: string;
  projectId: string;
  status: ProcessStatus;
  plannedStart: Date;
  plannedEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  progress: number;
  assignee?: string;
  notes?: string;
}

// 模拟数据
const mockProcessInstances: ProcessInstance[] = PROCESS_STEPS.slice(0, 10).map((step, index) => {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 30 + index * 5);
  const endDate = new Date(baseDate);
  endDate.setDate(endDate.getDate() + step.duration);
  
  let status: ProcessStatus = "pending";
  let progress = 0;
  
  if (index < 5) {
    status = "completed";
    progress = 100;
  } else if (index === 5) {
    status = "in_progress";
    progress = 60;
  } else if (index === 6) {
    status = "delayed";
    progress = 20;
  }
  
  return {
    id: `PI-${step.id}-001`,
    stepId: step.id,
    projectId: "PRJ-001",
    status,
    plannedStart: baseDate,
    plannedEnd: endDate,
    actualStart: index < 6 ? baseDate : undefined,
    actualEnd: index < 5 ? endDate : undefined,
    progress,
    assignee: ["张工", "李工", "王工", "赵工", "刘工"][index % 5],
  };
});

// 状态颜色映射
const statusColors: Record<ProcessStatus, string> = {
  pending: "bg-gray-200 text-gray-700",
  in_progress: "bg-blue-500 text-white",
  completed: "bg-green-500 text-white",
  delayed: "bg-yellow-500 text-white",
  blocked: "bg-red-500 text-white",
};

const statusLabels: Record<ProcessStatus, string> = {
  pending: "待开始",
  in_progress: "进行中",
  completed: "已完成",
  delayed: "延期",
  blocked: "阻塞",
};

export default function ProcessGanttChart() {
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ProcessStatus | "all">("all");

  // 计算甘特图时间范围
  const timeRange = useMemo(() => {
    const dates = mockProcessInstances.flatMap(p => [p.plannedStart, p.plannedEnd]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    return { start: minDate, end: maxDate };
  }, []);

  // 计算总天数
  const totalDays = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24));

  // 计算工序在甘特图中的位置
  const getBarPosition = (start: Date, end: Date) => {
    const startOffset = Math.ceil((start.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  // 过滤工序
  const filteredInstances = filterStatus === "all" 
    ? mockProcessInstances 
    : mockProcessInstances.filter(p => p.status === filterStatus);

  // 统计数据
  const stats = useMemo(() => {
    const total = mockProcessInstances.length;
    const completed = mockProcessInstances.filter(p => p.status === "completed").length;
    const inProgress = mockProcessInstances.filter(p => p.status === "in_progress").length;
    const delayed = mockProcessInstances.filter(p => p.status === "delayed").length;
    return { total, completed, inProgress, delayed };
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              T工序甘特图
            </h1>
            <p className="text-muted-foreground mt-1">
              T1-T15工序时间线与进度追踪
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              筛选
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总工序</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已完成</p>
                  <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">进行中</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
                </div>
                <Play className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">延期</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.delayed}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 甘特图 */}
        <Card>
          <CardHeader>
            <CardTitle>工序时间线</CardTitle>
            <CardDescription>
              显示各工序的计划时间和实际进度
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* 时间轴头部 */}
                <div className="flex border-b pb-2 mb-4">
                  <div className="w-48 flex-shrink-0 font-medium text-sm">工序名称</div>
                  <div className="flex-1 relative h-6">
                    {/* 月份标记 */}
                    {Array.from({ length: Math.ceil(totalDays / 30) + 1 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute text-xs text-muted-foreground"
                        style={{ left: `${(i * 30 / totalDays) * 100}%` }}
                      >
                        {new Date(timeRange.start.getTime() + i * 30 * 24 * 60 * 60 * 1000).toLocaleDateString("zh-CN", { month: "short" })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 工序行 */}
                <TooltipProvider>
                  {filteredInstances.map((instance) => {
                    const step = PROCESS_STEPS.find(s => s.id === instance.stepId);
                    if (!step) return null;
                    
                    const position = getBarPosition(instance.plannedStart, instance.plannedEnd);
                    
                    return (
                      <div
                        key={instance.id}
                        className={`flex items-center py-2 border-b border-border/50 hover:bg-muted/50 cursor-pointer ${
                          selectedProcess === instance.id ? "bg-muted" : ""
                        }`}
                        onClick={() => setSelectedProcess(instance.id)}
                      >
                        <div className="w-48 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {step.id}
                            </Badge>
                            <span className="text-sm font-medium">{step.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {step.phase} · {instance.assignee}
                          </div>
                        </div>
                        <div className="flex-1 relative h-8">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute h-6 rounded ${statusColors[instance.status]} flex items-center px-2 text-xs font-medium transition-all hover:opacity-90`}
                                style={position}
                              >
                                <span className="truncate">{instance.progress}%</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-medium">{step.name}</p>
                                <p className="text-xs">状态: {statusLabels[instance.status]}</p>
                                <p className="text-xs">进度: {instance.progress}%</p>
                                <p className="text-xs">
                                  计划: {instance.plannedStart.toLocaleDateString()} - {instance.plannedEnd.toLocaleDateString()}
                                </p>
                                {instance.assignee && (
                                  <p className="text-xs">负责人: {instance.assignee}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 工序详情 */}
        {selectedProcess && (
          <Card>
            <CardHeader>
              <CardTitle>工序详情</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const instance = mockProcessInstances.find(p => p.id === selectedProcess);
                const step = instance ? PROCESS_STEPS.find(s => s.id === instance.stepId) : null;
                if (!instance || !step) return null;
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">工序编号</p>
                        <p className="font-medium">{step.id} - {step.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">所属阶段</p>
                        <p className="font-medium">{step.phase}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">负责人</p>
                        <p className="font-medium">{instance.assignee || "-"}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">状态</p>
                        <Badge className={statusColors[instance.status]}>
                          {statusLabels[instance.status]}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">进度</p>
                        <div className="flex items-center gap-2">
                          <Progress value={instance.progress} className="flex-1" />
                          <span className="text-sm font-medium">{instance.progress}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">计划时间</p>
                        <p className="font-medium">
                          {instance.plannedStart.toLocaleDateString()} - {instance.plannedEnd.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* 图例 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm text-muted-foreground">图例:</span>
              {Object.entries(statusLabels).map(([status, label]) => (
                <div key={status} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${statusColors[status as ProcessStatus]}`} />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
