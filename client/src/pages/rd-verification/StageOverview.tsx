/**
 * 项目总览 Tab - 项目列表 + M0-M12管线视图
 * 使用Mock数据，后续对接tRPC
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { STAGES, STAGE_MAP, STAGE_CATEGORIES, type StageCategory } from "../../../../shared/stage-definitions";
import StagePipeline from "./StagePipeline";
import { Target, FolderKanban, ChevronRight, Inbox, Search, BarChart3, CheckCircle } from "lucide-react";

interface MockProject {
  id: number;
  name: string;
  code: string;
  currentStage: string;
  completedStages: string[];
  customer: string;
  risk: "low" | "medium" | "high";
}

const MOCK_PROJECTS: MockProject[] = [
  { id: 1, name: "汽车动力总成超声波清洗线", code: "GRT-2026-001", currentStage: "M4", completedStages: ["M0","M1","M2","M3"], customer: "上汽集团", risk: "low" },
  { id: 2, name: "半导体晶圆精密清洗设备", code: "GRT-2026-002", currentStage: "M7", completedStages: ["M0","M1","M2","M3","M4","M5","M6"], customer: "台积电", risk: "medium" },
  { id: 3, name: "医疗器械超声波清洗系统", code: "GRT-2026-003", currentStage: "M2", completedStages: ["M0","M1"], customer: "美敦力", risk: "low" },
  { id: 4, name: "航空发动机叶片清洗线", code: "GRT-2026-004", currentStage: "M10", completedStages: ["M0","M1","M2","M3","M4","M5","M6","M7","M8","M9"], customer: "中航工业", risk: "high" },
  { id: 5, name: "光伏硅片清洗设备", code: "GRT-2026-005", currentStage: "M5", completedStages: ["M0","M1","M2","M3","M4"], customer: "隆基绿能", risk: "low" },
];

function computeStats(projects: MockProject[]) {
  const total = projects.length;
  const stageDistMap: Record<string, number> = {};
  for (const p of projects) { stageDistMap[p.currentStage] = (stageDistMap[p.currentStage] || 0) + 1; }
  const gatePassRate = total > 0
    ? Math.round((projects.filter(p => p.completedStages.length >= 3).length / total) * 100) : 0;
  return { total, stageDistMap, gatePassRate };
}

export default function StageOverview() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return MOCK_PROJECTS;
    const q = search.toLowerCase();
    return MOCK_PROJECTS.filter(p =>
      p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.customer.toLowerCase().includes(q)
    );
  }, [search]);

  const stats = useMemo(() => computeStats(MOCK_PROJECTS), []);

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10"><FolderKanban className="w-6 h-6 text-blue-400" /></div>
            <div><p className="text-sm text-muted-foreground">总项目数</p><p className="text-2xl font-bold">{stats.total}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10"><CheckCircle className="w-6 h-6 text-green-400" /></div>
            <div><p className="text-sm text-muted-foreground">门禁通过率</p><p className="text-2xl font-bold">{stats.gatePassRate}%</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10"><BarChart3 className="w-6 h-6 text-purple-400" /></div>
            <div><p className="text-sm text-muted-foreground">阶段分布</p><p className="text-2xl font-bold">{Object.keys(stats.stageDistMap).length} 个阶段</p></div>
          </CardContent>
        </Card>
      </div>

      {/* 阶段分布 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5" />M0-M12 阶段分布</CardTitle>
          <CardDescription>各阶段项目通过率统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {STAGES.map((stage) => {
              const count = stats.stageDistMap[stage.id] || 0;
              const rate = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={stage.id} className="flex items-center gap-4">
                  <div className="w-12 font-medium text-sm">{stage.id}</div>
                  <div className="w-20 text-xs text-muted-foreground">{stage.name}</div>
                  <div className="flex-1"><Progress value={rate} className="h-2" /></div>
                  <div className="w-16 text-right text-sm">{count} 项目</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 阶段类别概览 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.entries(STAGE_CATEGORIES) as [StageCategory, typeof STAGE_CATEGORIES[StageCategory]][]).map(([key, cat]) => (
          <Card key={key} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className={"w-3 h-3 rounded-full " + cat.color + " mb-2"} />
              <p className="font-medium text-sm">{cat.name}</p>
              <p className="text-xs text-muted-foreground">{cat.stages.join(", ")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 搜索框 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索项目名称、编号或客户..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* 项目管线视图 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FolderKanban className="w-5 h-5" />项目进度管线</CardTitle>
          <CardDescription>各项目在M0-M12阶段的实时进度</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无匹配的项目</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.map((project) => (
                <div key={project.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{project.name}</span>
                        <Badge variant={project.risk === "low" ? "default" : project.risk === "medium" ? "secondary" : "destructive"} className="text-xs">
                          {project.risk === "low" ? "低风险" : project.risk === "medium" ? "中风险" : "高风险"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.code} · {project.customer} · 当前阶段: {STAGE_MAP[project.currentStage]?.name}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm"><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                  <StagePipeline currentStage={project.currentStage} completedStages={project.completedStages} projectId={String(project.id)} compact />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
