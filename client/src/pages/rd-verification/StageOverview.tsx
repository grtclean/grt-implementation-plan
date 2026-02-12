/**
 * 项目总览 Tab - 项目列表 + M0-M12管线视图
 * 来源: StageGateHub + ProjectGate(overview)
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { STAGES, STAGE_MAP, STAGE_CATEGORIES, type StageCategory } from "../../../../shared/stage-definitions";
import StagePipeline from "./StagePipeline";
import {
  Target, FolderKanban, BarChart3, ChevronRight, Inbox,
} from "lucide-react";

export default function StageOverview() {
  const { data: gateDefinitionsData, isLoading: defsLoading } = (trpc.projectGate as any).getGateDefinitions.useQuery(undefined, {
    retry: false, refetchOnWindowFocus: false,
  });
  const gateDefinitions = Array.isArray(gateDefinitionsData) ? gateDefinitionsData : (gateDefinitionsData?.definitions || []);

  const { data: statisticsData, isLoading: statsLoading } = (trpc.projectGate as any).getGateStatistics.useQuery(undefined, {
    retry: false, refetchOnWindowFocus: false,
  });
  const statistics = statisticsData?.statistics || statisticsData || {};

  // Mock project data for pipeline visualization
  const mockProjects = [
    { id: 1, name: "GRT-2026-001 汽车动力总成超声波清洗线", code: "GRT501", currentStage: "M4", completedStages: ["M0", "M1", "M2", "M3"], customer: "上汽集团", risk: "low" },
    { id: 2, name: "GRT-2026-002 半导体晶圆精密清洗设备", code: "GRT502", currentStage: "M7", completedStages: ["M0", "M1", "M2", "M3", "M4", "M5", "M6"], customer: "台积电", risk: "medium" },
    { id: 3, name: "GRT-2026-003 医疗器械超声波清洗系统", code: "GRT503", currentStage: "M2", completedStages: ["M0", "M1"], customer: "美敦力", risk: "low" },
  ];

  return (
    <div className="space-y-6">
      {/* 阶段分布 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            M0-M12 阶段分布
          </CardTitle>
          <CardDescription>各阶段项目通过率统计</CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-16 h-4" />
                  <Skeleton className="flex-1 h-2" />
                  <Skeleton className="w-12 h-4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {STAGES.map((stage) => {
                const rate = statistics?.passRate?.[stage.id] || 0;
                return (
                  <div key={stage.id} className="flex items-center gap-4">
                    <div className="w-16 font-medium text-sm">{stage.id}</div>
                    <div className="w-20 text-xs text-muted-foreground">{stage.name}</div>
                    <div className="flex-1">
                      <Progress value={rate} className="h-2" />
                    </div>
                    <div className="w-12 text-right text-sm font-medium">{rate}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 阶段类别概览 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.entries(STAGE_CATEGORIES) as [StageCategory, typeof STAGE_CATEGORIES[StageCategory]][]).map(([key, cat]) => (
          <Card key={key} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className={`w-3 h-3 rounded-full ${cat.color} mb-2`} />
              <p className="font-medium text-sm">{cat.name}</p>
              <p className="text-xs text-muted-foreground">{cat.stages.join(', ')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 项目管线视图 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5" />
            项目进度管线
          </CardTitle>
          <CardDescription>各项目在M0-M12阶段的实时进度</CardDescription>
        </CardHeader>
        <CardContent>
          {mockProjects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无项目数据</p>
              <p className="text-sm mt-2">创建项目后将在此显示进度管线</p>
            </div>
          ) : (
            <div className="space-y-6">
              {mockProjects.map((project) => (
                <div key={project.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{project.name}</span>
                        <Badge variant={
                          project.risk === "low" ? "default" :
                          project.risk === "medium" ? "secondary" : "destructive"
                        } className="text-xs">
                          {project.risk === "low" ? "低风险" : project.risk === "medium" ? "中风险" : "高风险"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.code} · {project.customer} · 当前阶段: {STAGE_MAP[project.currentStage]?.name}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <StagePipeline
                    currentStage={project.currentStage}
                    completedStages={project.completedStages}
                    compact
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
