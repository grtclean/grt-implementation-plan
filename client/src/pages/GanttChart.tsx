/**
 * 甘特图页面
 * 项目甘特图、任务依赖、里程碑追踪
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { BarChart3, Building2, Calendar, ChevronLeft, ChevronRight, Milestone } from "lucide-react";

const MOCK_TASKS = [
  { id: 1, name: "需求分析", project: "缸体清洗线", start: 1, duration: 3, progress: 100, color: "bg-green-500" },
  { id: 2, name: "方案设计", project: "缸体清洗线", start: 3, duration: 4, progress: 80, color: "bg-blue-500" },
  { id: 3, name: "机械设计", project: "缸体清洗线", start: 5, duration: 6, progress: 45, color: "bg-primary" },
  { id: 4, name: "电气设计", project: "缸体清洗线", start: 6, duration: 5, progress: 30, color: "bg-cyan-500" },
  { id: 5, name: "采购", project: "缸体清洗线", start: 8, duration: 4, progress: 10, color: "bg-amber-500" },
  { id: 6, name: "组装", project: "缸体清洗线", start: 11, duration: 5, progress: 0, color: "bg-purple-500" },
  { id: 7, name: "调试", project: "缸体清洗线", start: 15, duration: 3, progress: 0, color: "bg-rose-500" },
  { id: 8, name: "发货安装", project: "缸体清洗线", start: 17, duration: 3, progress: 0, color: "bg-indigo-500" },
];

const WEEKS = Array.from({ length: 20 }, (_, i) => `W${i + 1}`);

export default function GanttChart() {
  const { currentBU } = useUserProfile();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" />甘特图</h1>
          <p className="text-muted-foreground mt-1">项目进度可视化 · 任务依赖管理</p>
        </div>
        <div className="flex gap-2">
          {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
          <Select defaultValue="all">
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有项目</SelectItem>
              <SelectItem value="p1">缸体清洗线</SelectItem>
              <SelectItem value="p2">变速箱清洗</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>项目甘特图 - 缸体清洗线</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm">2026 Q1</span>
              <Button variant="outline" size="icon"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {/* 时间轴头部 */}
            <div className="flex border-b pb-2 mb-2 min-w-[800px]">
              <div className="w-40 shrink-0 text-sm font-medium text-muted-foreground">任务名称</div>
              <div className="flex-1 flex">
                {WEEKS.map(w => (
                  <div key={w} className="flex-1 text-center text-xs text-muted-foreground">{w}</div>
                ))}
              </div>
            </div>
            {/* 甘特条 */}
            <div className="space-y-1 min-w-[800px]">
              {MOCK_TASKS.map(task => (
                <div key={task.id} className="flex items-center h-8">
                  <div className="w-40 shrink-0 text-sm truncate pr-2">{task.name}</div>
                  <div className="flex-1 relative h-6">
                    <div
                      className={`absolute top-0 h-full rounded ${task.color} opacity-80`}
                      style={{ left: `${(task.start - 1) * 5}%`, width: `${task.duration * 5}%` }}
                    >
                      <div className="h-full bg-white/30 rounded" style={{ width: `${task.progress}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold">{task.progress}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Milestone className="h-3 w-3" />里程碑</span>
            <span>总工期: 20周</span>
            <span>整体进度: 38%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
