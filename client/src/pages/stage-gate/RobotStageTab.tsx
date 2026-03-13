/**
 * RobotStageTab — Tab 5 "设备与机器人" for StageGateDashboard
 *
 * Sections: Stage selector, robot assignments, programs, execution logs, M8 commissioning checklist
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Bot, CheckCircle2, XCircle, Clock, Play, RotateCcw,
  FileCode, History, Shield, AlertTriangle,
} from "lucide-react";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;
const STAGES = ["M3", "M5", "M7", "M8", "M9", "M11"] as const;

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-gray-500",
  programmed: "bg-blue-500",
  active: "bg-green-500",
  completed: "bg-emerald-500",
  released: "bg-slate-400",
  // Program statuses
  draft: "bg-gray-500",
  review: "bg-yellow-500",
  approved: "bg-green-500",
  deployed: "bg-blue-500",
  deprecated: "bg-red-300",
  // Execution results
  running: "bg-blue-500",
  success: "bg-green-500",
  partial: "bg-yellow-500",
  failed: "bg-red-500",
  aborted: "bg-red-300",
  timeout: "bg-orange-500",
  // Commissioning
  pending: "bg-gray-500",
  passed: "bg-green-500",
  skipped: "bg-slate-400",
};

interface RobotStageTabProps {
  projectId: number;
}

export default function RobotStageTab({ projectId }: RobotStageTabProps) {
  const { t } = useLanguage();
  const [selectedStage, setSelectedStage] = useState<string>("M7");

  // Queries
  const assignmentsQuery = trpc.robotFleet.stageIntegration.getStageAssignments.useQuery(
    { projectId, stageCode: selectedStage as any },
    { enabled: projectId > 0, ...QUERY_OPTS },
  );

  const readinessQuery = trpc.robotFleet.stageIntegration.getStageReadiness.useQuery(
    { projectId, stageCode: selectedStage as any },
    { enabled: projectId > 0, ...QUERY_OPTS },
  );

  const programsQuery = trpc.robotFleet.stageIntegration.getStagePrograms.useQuery(
    { projectId, stageCode: selectedStage as any },
    { enabled: projectId > 0, ...QUERY_OPTS },
  );

  const logsQuery = trpc.robotFleet.stageIntegration.getExecutionLogs.useQuery(
    { projectId, stageCode: selectedStage as any },
    { enabled: projectId > 0, ...QUERY_OPTS },
  );

  const checklistQuery = trpc.robotFleet.stageIntegration.getCommissioningChecklist.useQuery(
    { projectId },
    { enabled: projectId > 0 && selectedStage === "M8", ...QUERY_OPTS },
  );

  // Mutations
  const executeMut = trpc.robotFleet.stageIntegration.executeProgram.useMutation();
  const releaseMut = trpc.robotFleet.stageIntegration.releaseRobotFromStage.useMutation();
  const protocolTestMut = trpc.robotFleet.stageIntegration.runStageProtocolTest.useMutation();
  const updateChecklistMut = trpc.robotFleet.stageIntegration.updateCommissioningItem.useMutation();

  const assignments = (assignmentsQuery.data ?? []) as any[];
  const readiness = readinessQuery.data as any;
  const programs = (programsQuery.data ?? []) as any[];
  const logs = (logsQuery.data ?? []) as any[];
  const checklistItems = (checklistQuery.data ?? []) as any[];

  if (projectId <= 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("robotCleaning.stage.selectProject") || "请先选择一个项目"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stage Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="w-5 h-5" />
            {t("robotCleaning.stage.title") || "设备与机器人阶段集成"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((stage) => (
              <Button
                key={stage}
                variant={selectedStage === stage ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStage(stage)}
              >
                {stage}
              </Button>
            ))}

            {/* Readiness badge */}
            {readiness && (
              <Badge
                variant={readiness.ready ? "default" : "destructive"}
                className="ml-auto flex items-center gap-1"
              >
                {readiness.ready ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" />{t("robotCleaning.stage.ready") || "就绪"}</>
                ) : (
                  <><AlertTriangle className="w-3.5 h-3.5" />{t("robotCleaning.stage.notReady") || "未就绪"}</>
                )}
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => protocolTestMut.mutate({ projectId, stageCode: selectedStage as any })}
              disabled={protocolTestMut.isPending}
            >
              <Shield className="w-4 h-4 mr-1" />
              {t("robotCleaning.stage.protocolTest") || "协议测试"}
            </Button>
          </div>

          {/* Readiness issues */}
          {readiness && !readiness.ready && readiness.issues?.length > 0 && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-sm">
              <p className="font-medium text-red-400 mb-1">{t("robotCleaning.stage.issues") || "就绪问题"}</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                {readiness.issues.map((issue: string, i: number) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Robot Assignments Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("robotCleaning.stage.assignments") || "机器人分配"} ({selectedStage})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("robotCleaning.stage.noAssignments") || "该阶段暂无分配的机器人"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>{t("robotCleaning.stage.robotId") || "机器人ID"}</TableHead>
                  <TableHead>{t("robotCleaning.stage.role") || "角色"}</TableHead>
                  <TableHead>{t("robotCleaning.fleet.status") || "状态"}</TableHead>
                  <TableHead>{t("robotCleaning.fleet.actions") || "操作"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.id}</TableCell>
                    <TableCell>{a.robotId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[a.status] || "bg-gray-500"}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => releaseMut.mutate({ assignmentId: a.id })}
                        disabled={a.status === "released"}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        {t("robotCleaning.stage.release") || "释放"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Programs & Execution in a two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Programs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCode className="w-4 h-4" />
              {t("robotCleaning.stage.programs") || "设备程序"} ({selectedStage})
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            {programs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t("robotCleaning.stage.noPrograms") || "暂无程序"}
              </p>
            ) : (
              <div className="space-y-2">
                {programs.map((prog: any) => (
                  <div key={prog.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <div className="font-medium text-sm">{prog.programName}</div>
                      <div className="text-xs text-muted-foreground">
                        {prog.versionString} · {prog.programType}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_COLORS[prog.status] || "bg-gray-500"} variant="secondary">
                        {prog.status}
                      </Badge>
                      {(prog.status === "approved" || prog.status === "deployed") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => executeMut.mutate({
                            programId: prog.id,
                            robotId: prog.robotId,
                            projectId,
                            stageCode: selectedStage as any,
                          })}
                          disabled={executeMut.isPending}
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution Logs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4" />
              {t("robotCleaning.stage.executionLogs") || "执行记录"}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t("robotCleaning.stage.noLogs") || "暂无执行记录"}
              </p>
            ) : (
              <div className="space-y-2">
                {logs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <div className="text-sm">
                        {t("robotCleaning.stage.program") || "程序"} #{log.programId} ·{" "}
                        {t("robotCleaning.stage.robot") || "机器人"} #{log.robotId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.triggerType} · {log.durationMs ? `${log.durationMs}ms` : "—"} ·{" "}
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                      </div>
                    </div>
                    <Badge className={STATUS_COLORS[log.result] || "bg-gray-500"}>
                      {log.result}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* M8 Commissioning Checklist — only visible at M8 */}
      {selectedStage === "M8" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-4 h-4" />
              {t("robotCleaning.stage.commissioning") || "M8 调试检查清单"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checklistItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t("robotCleaning.stage.noChecklist") || "暂无检查清单项。分配机器人到M8后自动生成。"}
              </p>
            ) : (
              <CommissioningTable
                items={checklistItems}
                onUpdate={(itemId, status) =>
                  updateChecklistMut.mutate({ itemId, status: status as any })
                }
                isPending={updateChecklistMut.isPending}
                t={t}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Commissioning checklist sub-component ──────────────────

function CommissioningTable({
  items,
  onUpdate,
  isPending,
  t,
}: {
  items: any[];
  onUpdate: (id: number, status: string) => void;
  isPending: boolean;
  t: (key: string) => string;
}) {
  // Group by category
  const grouped = items.reduce((acc: Record<string, any[]>, item: any) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const categoryLabels: Record<string, string> = {
    controller: t("robotCleaning.stage.catController") || "控制器",
    comms: t("robotCleaning.stage.catComms") || "通信",
    safety: t("robotCleaning.stage.catSafety") || "安全",
    calibration: t("robotCleaning.stage.catCalibration") || "标定",
    other: t("robotCleaning.stage.catOther") || "其他",
  };

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, catItems]) => (
        <div key={category}>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            {categoryLabels[category] || category}
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{t("robotCleaning.stage.checkItem") || "检查项"}</TableHead>
                <TableHead className="w-20">{t("robotCleaning.stage.mandatory") || "必须"}</TableHead>
                <TableHead className="w-28">{t("robotCleaning.stage.target") || "目标值"}</TableHead>
                <TableHead className="w-28">{t("robotCleaning.fleet.status") || "状态"}</TableHead>
                <TableHead className="w-24">{t("robotCleaning.fleet.actions") || "操作"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(catItems as any[]).map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs text-muted-foreground">{item.id}</TableCell>
                  <TableCell className="text-sm">{item.checkItem}</TableCell>
                  <TableCell>
                    {item.isMandatory ? (
                      <Badge variant="destructive" className="text-xs">Y</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">N</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {item.targetValue ? `${item.targetValue} ${item.unit || ""}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[item.status] || "bg-gray-500"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => onUpdate(item.id, "passed")}
                        disabled={isPending || item.status === "passed"}
                        title="Pass"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => onUpdate(item.id, "failed")}
                        disabled={isPending || item.status === "failed"}
                        title="Fail"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
