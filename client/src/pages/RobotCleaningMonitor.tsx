/**
 * RobotCleaningMonitor — 7-tab operator workbench
 *
 * Tab 1: 实时监控 — useRobotControl KPIs + real-time feed
 * Tab 2: 自适应控制 — adaptive iteration history + convergence
 * Tab 3: 清洗配方 — recipe CRUD with SEMI/TSMC badges
 * Tab 4: TSMC合规 — compliance matrix + certification status
 * Tab 5: 扭矩监控 — torque records + over-torque alerts
 * Tab 6: 绩效仪表盘 — shift summary + recipe effectiveness + robot fleet
 * Tab 7: 机器人管理 — fleet registry, connection, protocol test, digital twin, alerts
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useRobotControl } from "@/hooks/useRobotControl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RobotSelector } from "@/components/RobotSelector";
import {
  Activity, Bot, Beaker, ShieldCheck, Wrench, BarChart3,
  Play, Square, AlertTriangle, CheckCircle2, XCircle,
  Plus, ChevronRight, FileText, Cpu, Link2, Zap, Heart,
} from "lucide-react";

// ─── Stat Card ──────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, variant = "default" }: {
  title: string; value: string | number; icon: React.ComponentType<{ className?: string }>; variant?: "default" | "success" | "warning" | "danger";
}) {
  const colors = {
    default: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    success: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    warning: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
    danger: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tab 1: Live Monitor ────────────────────────────────────
function MonitorTab({ robotCode }: { robotCode: string }) {
  const { t } = useLanguage();
  const robot = useRobotControl({ robotCode, pollIntervalMs: 3000 });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        {robot.isPolling ? (
          <Button size="sm" variant="destructive" onClick={robot.stopPolling}>
            <Square className="h-4 w-4 mr-1" /> {t("robotCleaning.monitor.stopPolling")}
          </Button>
        ) : (
          <Button size="sm" onClick={robot.startPolling}>
            <Play className="h-4 w-4 mr-1" /> {t("robotCleaning.monitor.startPolling")}
          </Button>
        )}
        {robot.isLoading && <Badge variant="outline">Loading...</Badge>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title={t("robotCleaning.monitor.pressure")} value={robot.kpis?.currentPressure?.toFixed(1) ?? "—"} icon={Activity} />
        <StatCard title={t("robotCleaning.monitor.angle")} value={robot.kpis?.currentAngle?.toFixed(1) ?? "—"} icon={Bot} />
        <StatCard title={t("robotCleaning.monitor.cleanliness")} value={robot.kpis?.currentCleanliness?.toFixed(2) ?? "—"} icon={Beaker}
          variant={robot.hasCleanlinessAlert ? "danger" : "success"} />
        <StatCard title={t("robotCleaning.monitor.passRate")} value={robot.kpis?.passRate ? `${(robot.kpis.passRate * 100).toFixed(0)}%` : "—"} icon={CheckCircle2}
          variant={(robot.kpis?.passRate ?? 1) < 0.9 ? "warning" : "success"} />
      </div>

      {robot.alerts.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" /> {t("robotCleaning.monitor.alerts")} ({robot.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {robot.alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="text-xs flex justify-between items-center">
                  <span>{alert.message}</span>
                  <Badge variant={alert.severity === "critical" ? "destructive" : "outline"} className="text-[10px]">
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("robotCleaning.monitor.realtimeFeed")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>{t("robotCleaning.monitor.pressure")}</TableHead>
                  <TableHead>{t("robotCleaning.monitor.angle")}</TableHead>
                  <TableHead>{t("robotCleaning.monitor.cleanliness")}</TableHead>
                  <TableHead>{t("robotCleaning.recipe.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(robot.latestActions ?? []).slice(0, 10).map((action: any) => (
                  <TableRow key={action.id}>
                    <TableCell className="font-mono text-xs">{action.id}</TableCell>
                    <TableCell>{action.pressureBar ?? "—"}</TableCell>
                    <TableCell>{action.nozzleAngleDeg ?? "—"}</TableCell>
                    <TableCell>{action.cleanlinessAfterMg ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={action.cleanlinessVerdict === "PASS" ? "default" : "destructive"} className="text-[10px]">
                        {action.cleanlinessVerdict}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 2: Adaptive Control ────────────────────────────────
function AdaptiveTab({ robotCode }: { robotCode: string }) {
  const { t } = useLanguage();
  const robot = useRobotControl({ robotCode });
  const adaptiveHistory = trpc.semiconductorCleaning.monitor.getAdaptiveHistory.useQuery({ robotCode });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title={t("robotCleaning.adaptive.iteration")} value={robot.adaptiveIteration ?? 0} icon={Activity} />
        <StatCard title={t("robotCleaning.adaptive.gap")} value={robot.lastAdjustment ? `Δp=${robot.lastAdjustment.pressureDelta} Δa=${robot.lastAdjustment.angleDelta}` : "—"} icon={BarChart3} />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => robot.triggerAdaptiveAdjustment?.({
          cleanlinessAfterMg: robot.kpis?.currentCleanliness ?? 0,
          currentPressure: robot.kpis?.currentPressure ?? 0,
          currentAngle: robot.kpis?.currentAngle ?? 0,
        })}>
          <ChevronRight className="h-4 w-4 mr-1" /> {t("robotCleaning.adaptive.trigger")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("robotCleaning.adaptive.history")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("robotCleaning.monitor.pressure")}</TableHead>
                  <TableHead>{t("robotCleaning.monitor.angle")}</TableHead>
                  <TableHead>{t("robotCleaning.monitor.cleanliness")}</TableHead>
                  <TableHead>{t("robotCleaning.recipe.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(adaptiveHistory.data ?? []).map((h, i) => (
                  <TableRow key={h.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{h.pressure.toFixed(1)}</TableCell>
                    <TableCell>{h.angle.toFixed(0)}</TableCell>
                    <TableCell>{h.cleanliness.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={h.verdict === "PASS" ? "default" : "destructive"} className="text-[10px]">
                        {h.verdict}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 3: Cleaning Recipes ────────────────────────────────
function RecipeTab() {
  const { t } = useLanguage();
  const [featureFilter, setFeatureFilter] = useState<string>("__all__");
  const [createOpen, setCreateOpen] = useState(false);
  const [newRecipe, setNewRecipe] = useState({ recipeCode: "", partType: "", featureType: "", pressureBar: 3.5, semiCompliant: false, tsmcQualified: false });

  const recipes = trpc.semiconductorCleaning.recipe.list.useQuery({ featureType: featureFilter === "__all__" ? undefined : featureFilter });
  const createMut = trpc.semiconductorCleaning.recipe.create.useMutation({ onSuccess: () => { recipes.refetch(); setCreateOpen(false); } });
  const validateMut = trpc.semiconductorCleaning.recipe.validate.useMutation({ onSuccess: () => recipes.refetch() });
  const promoteMut = trpc.semiconductorCleaning.recipe.promote.useMutation({ onSuccess: () => recipes.refetch() });
  const deprecateMut = trpc.semiconductorCleaning.recipe.deprecate.useMutation({ onSuccess: () => recipes.refetch() });

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    validated: "bg-blue-100 text-blue-700",
    production: "bg-green-100 text-green-700",
    deprecated: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center flex-wrap">
        <Select value={featureFilter} onValueChange={setFeatureFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("robotCleaning.recipe.featureType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="blind_hole">Blind Hole</SelectItem>
            <SelectItem value="ribbing">Ribbing</SelectItem>
            <SelectItem value="sealing_face">Sealing Face</SelectItem>
            <SelectItem value="thread">Thread</SelectItem>
            <SelectItem value="deep_cavity">Deep Cavity</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> {t("robotCleaning.recipe.create")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("robotCleaning.recipe.create")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>{t("robotCleaning.recipe.code")}</Label>
                <Input value={newRecipe.recipeCode} onChange={(e) => setNewRecipe({ ...newRecipe, recipeCode: e.target.value })} placeholder="RC-SEMI-XXX" />
              </div>
              <div>
                <Label>{t("robotCleaning.recipe.partType")}</Label>
                <Input value={newRecipe.partType} onChange={(e) => setNewRecipe({ ...newRecipe, partType: e.target.value })} />
              </div>
              <div>
                <Label>{t("robotCleaning.recipe.featureType")}</Label>
                <Select value={newRecipe.featureType} onValueChange={(v) => setNewRecipe({ ...newRecipe, featureType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blind_hole">Blind Hole</SelectItem>
                    <SelectItem value="ribbing">Ribbing</SelectItem>
                    <SelectItem value="sealing_face">Sealing Face</SelectItem>
                    <SelectItem value="thread">Thread</SelectItem>
                    <SelectItem value="deep_cavity">Deep Cavity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("robotCleaning.monitor.pressure")}</Label>
                <Input type="number" value={newRecipe.pressureBar} onChange={(e) => setNewRecipe({ ...newRecipe, pressureBar: parseFloat(e.target.value) || 0 })} />
              </div>
              <Button onClick={() => createMut.mutate(newRecipe)} disabled={!newRecipe.recipeCode || !newRecipe.partType}>
                {t("robotCleaning.recipe.create")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("robotCleaning.recipe.code")}</TableHead>
                  <TableHead>{t("robotCleaning.recipe.partType")}</TableHead>
                  <TableHead>{t("robotCleaning.recipe.featureType")}</TableHead>
                  <TableHead>{t("robotCleaning.monitor.pressure")}</TableHead>
                  <TableHead>{t("robotCleaning.recipe.status")}</TableHead>
                  <TableHead>SEMI</TableHead>
                  <TableHead>TSMC</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recipes.data?.items ?? []).map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell className="font-mono text-xs">{recipe.recipeCode}</TableCell>
                    <TableCell>{recipe.partType}</TableCell>
                    <TableCell>{recipe.featureType ?? "—"}</TableCell>
                    <TableCell>{recipe.pressureBar ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[recipe.status] ?? ""}`}>{recipe.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {recipe.semiCompliant ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-300" />}
                    </TableCell>
                    <TableCell>
                      {recipe.tsmcQualified ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-300" />}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {recipe.status === "draft" && (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => validateMut.mutate({ id: recipe.id, validatedBy: "Current User" })}>
                            {t("robotCleaning.recipe.validate")}
                          </Button>
                        )}
                        {recipe.status === "validated" && (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => promoteMut.mutate({ id: recipe.id })}>
                            {t("robotCleaning.recipe.promote")}
                          </Button>
                        )}
                        {recipe.status !== "deprecated" && (
                          <Button size="sm" variant="ghost" className="text-xs h-7 text-red-500" onClick={() => deprecateMut.mutate({ id: recipe.id })}>
                            {t("robotCleaning.recipe.deprecate")}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(recipes.data?.items ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No recipes found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 4: TSMC Compliance ─────────────────────────────────
function TsmcTab() {
  const { t } = useLanguage();
  const checklist = trpc.semiconductorCleaning.semiValidation.getTsmcChecklist.useQuery();
  const certStatus = trpc.semiconductorCleaning.semiValidation.getCertificationStatus.useQuery();
  const complianceMatrix = trpc.semiconductorCleaning.certification.getComplianceMatrix.useQuery();
  const generateReport = trpc.semiconductorCleaning.semiValidation.generateComplianceReport.useMutation();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title={t("robotCleaning.tsmc.qualifiedRecipes")} value={checklist.data?.tsmcQualifiedRecipes ?? 0} icon={CheckCircle2} variant="success" />
        <StatCard title={t("robotCleaning.tsmc.environmentPass")} value={checklist.data?.environmentPassCount ?? 0} icon={ShieldCheck} variant="success" />
        <StatCard title={t("robotCleaning.tsmc.readiness")} value={certStatus.data?.overallReadiness === "READY" ? t("robotCleaning.tsmc.ready") : t("robotCleaning.tsmc.notReady")}
          icon={Activity} variant={certStatus.data?.overallReadiness === "READY" ? "success" : "warning"} />
        <StatCard title={t("robotCleaning.tsmc.isoClass")} value={`${((certStatus.data?.recipeQualificationRate ?? 0) * 100).toFixed(0)}%`} icon={Beaker} />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => generateReport.mutate()} disabled={generateReport.isPending}>
          <FileText className="h-4 w-4 mr-1" /> {t("robotCleaning.tsmc.generateReport")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("robotCleaning.tsmc.checklist")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(checklist.data?.checklist ?? []).map((item, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-1">
                <span className="text-sm">{item.item}</span>
                <Badge variant={item.status === "PASS" ? "default" : "outline"} className="text-[10px]">
                  {item.status === "PASS" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("robotCleaning.tsmc.complianceMatrix")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("robotCleaning.recipe.code")}</TableHead>
                  <TableHead>{t("robotCleaning.recipe.partType")}</TableHead>
                  {(complianceMatrix.data?.matrix?.[0]?.cells ?? []).map((cell, i) => (
                    <TableHead key={i} className="text-xs">{cell.standardCode}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(complianceMatrix.data?.matrix ?? []).map((row, ri) => (
                  <TableRow key={ri}>
                    <TableCell className="font-mono text-xs">{row.recipeCode}</TableCell>
                    <TableCell className="text-xs">{row.partType}</TableCell>
                    {row.cells.map((cell, ci) => (
                      <TableCell key={ci} className="text-center">
                        {cell.pass ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 5: Torque Monitor ──────────────────────────────────
function TorqueTab({ robotCode }: { robotCode: string }) {
  const { t } = useLanguage();
  const torqueRecords = trpc.robotCleaning.oilingTorque.list.useQuery({ robotCode });
  const overTorqueAlerts = trpc.robotCleaning.oilingTorque.getOverTorqueAlerts.useQuery({});

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard title={t("robotCleaning.torque.title")} value={torqueRecords.data?.total ?? 0} icon={Wrench} />
        <StatCard title={t("robotCleaning.torque.overTorque")} value={(overTorqueAlerts.data ?? []).length} icon={AlertTriangle}
          variant={(overTorqueAlerts.data ?? []).length > 0 ? "danger" : "success"} />
      </div>

      {(overTorqueAlerts.data ?? []).length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600">{t("robotCleaning.torque.alertList")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {(overTorqueAlerts.data ?? []).slice(0, 5).map((alert: any) => (
                <div key={alert.id} className="text-xs flex justify-between">
                  <span>{alert.alertMessage ?? `Torque ${alert.actualTorqueNm}Nm exceeded`}</span>
                  <Badge variant="destructive" className="text-[10px]">{alert.actualTorqueNm} Nm</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>{t("robotCleaning.torque.actual")}</TableHead>
                  <TableHead>{t("robotCleaning.torque.target")}</TableHead>
                  <TableHead>{t("robotCleaning.torque.upperLimit")}</TableHead>
                  <TableHead>{t("robotCleaning.recipe.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(torqueRecords.data?.items ?? []).slice(0, 20).map((rec: any) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-mono text-xs">{rec.id}</TableCell>
                    <TableCell className={rec.isOverTorque ? "text-red-600 font-bold" : ""}>{rec.actualTorqueNm}</TableCell>
                    <TableCell>{rec.targetTorqueNm ?? "—"}</TableCell>
                    <TableCell>{rec.torqueUpperLimitNm ?? "15.00"}</TableCell>
                    <TableCell>
                      <Badge variant={rec.verdict === "PASS" ? "default" : "destructive"} className="text-[10px]">{rec.verdict}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 6: Performance Dashboard ───────────────────────────
function PerfTab() {
  const { t } = useLanguage();
  const dashboard = trpc.semiconductorCleaning.monitor.getDashboard.useQuery();
  const fleet = trpc.semiconductorCleaning.monitor.getRobotFleet.useQuery();
  const shiftSummary = trpc.semiconductorCleaning.monitor.getShiftSummary.useQuery({});
  const recipeEff = trpc.semiconductorCleaning.monitor.getRecipeEffectiveness.useQuery();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title={t("robotCleaning.monitor.totalActions")} value={dashboard.data?.todayActions ?? 0} icon={Activity} />
        <StatCard title={t("robotCleaning.monitor.passRate")} value={`${((dashboard.data?.todayPassRate ?? 0) * 100).toFixed(0)}%`} icon={CheckCircle2}
          variant={(dashboard.data?.todayPassRate ?? 1) < 0.9 ? "warning" : "success"} />
        <StatCard title={t("robotCleaning.monitor.alerts")} value={dashboard.data?.todayAlerts ?? 0} icon={AlertTriangle}
          variant={(dashboard.data?.todayAlerts ?? 0) > 0 ? "danger" : "success"} />
        <StatCard title={t("robotCleaning.perf.robotFleet")} value={(fleet.data ?? []).length} icon={Bot} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("robotCleaning.perf.shiftSummary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift</TableHead>
                  <TableHead>Entries</TableHead>
                  <TableHead>{t("robotCleaning.perf.efficiency")}</TableHead>
                  <TableHead>{t("robotCleaning.monitor.passRate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(shiftSummary.data ?? []).map((s) => (
                  <TableRow key={s.shiftCode}>
                    <TableCell className="font-medium">{s.shiftCode}</TableCell>
                    <TableCell>{s.totalEntries}</TableCell>
                    <TableCell>{(s.avgEfficiency * 100).toFixed(0)}%</TableCell>
                    <TableCell>
                      <Badge variant={s.passRate >= 0.9 ? "default" : "destructive"} className="text-[10px]">
                        {(s.passRate * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("robotCleaning.perf.recipeEffectiveness")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("robotCleaning.recipe.code")}</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>{t("robotCleaning.monitor.passRate")}</TableHead>
                  <TableHead>{t("robotCleaning.monitor.cleanliness")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recipeEff.data ?? []).map((r) => (
                  <TableRow key={r.recipeCode}>
                    <TableCell className="font-mono text-xs">{r.recipeCode}</TableCell>
                    <TableCell>{r.usageCount}</TableCell>
                    <TableCell>{(r.passRate * 100).toFixed(0)}%</TableCell>
                    <TableCell>{r.avgCleanliness.toFixed(2)} mg</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("robotCleaning.perf.robotFleet")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(fleet.data ?? []).map((robot) => (
              <div key={robot.robotCode} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm font-bold">{robot.robotCode}</span>
                  <Badge variant={robot.hasAlert ? "destructive" : "default"} className="text-[10px]">
                    {robot.lastVerdict ?? "—"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{robot.lastActionAt ?? "No actions"}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 7: Fleet Management ─────────────────────────────────
function FleetTab() {
  const { t } = useLanguage();
  const [selectedRobotId, setSelectedRobotId] = useState<number | null>(null);

  const fleetList = trpc.robotFleet.registry.list.useQuery({ pageSize: 50 });
  const brands = trpc.robotFleet.registry.getBrands.useQuery();
  const alertStats = trpc.robotFleet.condition.getAlertStats.useQuery({});
  const alerts = trpc.robotFleet.condition.getAlerts.useQuery({ pageSize: 10 });

  const connectMut = trpc.robotFleet.connection.connect.useMutation({ onSuccess: () => fleetList.refetch() });
  const disconnectMut = trpc.robotFleet.connection.disconnect.useMutation({ onSuccess: () => fleetList.refetch() });
  const protocolTestMut = trpc.robotFleet.connection.runProtocolTest.useMutation();
  const syncDtMut = trpc.robotFleet.telemetry.syncDigitalTwin.useMutation();
  const acknowledgeMut = trpc.robotFleet.condition.acknowledge.useMutation({ onSuccess: () => alerts.refetch() });

  const selectedRobotHealth = trpc.robotFleet.condition.getHealthScore.useQuery(
    { robotId: selectedRobotId! },
    { enabled: !!selectedRobotId },
  );
  const latestTelemetry = trpc.robotFleet.telemetry.getLatest.useQuery(
    { robotId: selectedRobotId! },
    { enabled: !!selectedRobotId },
  );
  const connectionLogs = trpc.robotFleet.connection.getConnectionLogs.useQuery(
    { robotId: selectedRobotId!, pageSize: 10 },
    { enabled: !!selectedRobotId },
  );

  const robots = fleetList.data?.rows ?? [];
  const totalRobots = fleetList.data?.total ?? 0;
  const onlineRobots = robots.filter((r) => r.status === "online").length;

  const brandColors: Record<string, string> = {
    kuka: "bg-orange-100 text-orange-800",
    fanuc: "bg-yellow-100 text-yellow-800",
    abb: "bg-red-100 text-red-800",
    staubli: "bg-blue-100 text-blue-800",
  };

  const statusColors: Record<string, string> = {
    online: "bg-green-100 text-green-700",
    offline: "bg-gray-100 text-gray-600",
    error: "bg-red-100 text-red-700",
    maintenance: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="space-y-4">
      {/* Fleet Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title={t("robotCleaning.fleet.totalRobots")} value={totalRobots} icon={Cpu} />
        <StatCard title={t("robotCleaning.fleet.onlineRobots")} value={onlineRobots} icon={Zap} variant="success" />
        <StatCard title={t("robotCleaning.fleet.brands")} value={(brands.data ?? []).length} icon={Bot} />
        <StatCard title={t("robotCleaning.fleet.healthScore")}
          value={selectedRobotHealth.data?.healthScore ?? "—"} icon={Heart}
          variant={(selectedRobotHealth.data?.healthScore ?? 100) < 70 ? "danger" : "success"} />
      </div>

      {/* Robot Registry Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("robotCleaning.fleet.registry")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("robotCleaning.fleet.robotCode")}</TableHead>
                  <TableHead>{t("robotCleaning.fleet.brand")}</TableHead>
                  <TableHead>{t("robotCleaning.fleet.model")}</TableHead>
                  <TableHead>{t("robotCleaning.fleet.status")}</TableHead>
                  <TableHead>{t("robotCleaning.fleet.lastHeartbeat")}</TableHead>
                  <TableHead>{t("robotCleaning.fleet.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {robots.map((robot) => (
                  <TableRow
                    key={robot.id}
                    className={selectedRobotId === robot.id ? "bg-muted/50" : "cursor-pointer hover:bg-muted/30"}
                    onClick={() => setSelectedRobotId(robot.id)}
                  >
                    <TableCell className="font-mono text-xs font-bold">{robot.robotCode}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${brandColors[robot.brand] ?? ""}`}>
                        {robot.brand.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{robot.model}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[robot.status] ?? ""}`}>
                        {robot.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {robot.lastHeartbeatAt ? new Date(robot.lastHeartbeatAt).toLocaleTimeString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {robot.status === "offline" ? (
                          <Button size="sm" variant="outline" className="text-xs h-7"
                            onClick={(e) => { e.stopPropagation(); connectMut.mutate({ robotId: robot.id }); }}
                            disabled={connectMut.isPending}>
                            <Link2 className="h-3 w-3 mr-1" /> {t("robotCleaning.fleet.connect")}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="text-xs h-7"
                            onClick={(e) => { e.stopPropagation(); disconnectMut.mutate({ robotId: robot.id }); }}
                            disabled={disconnectMut.isPending}>
                            {t("robotCleaning.fleet.disconnect")}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-xs h-7"
                          onClick={(e) => { e.stopPropagation(); protocolTestMut.mutate({ robotId: robot.id }); }}
                          disabled={protocolTestMut.isPending}>
                          {t("robotCleaning.protocol.test")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {robots.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t("robotCleaning.fleet.noRobots")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Protocol Test Result */}
      {protocolTestMut.data && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {t("robotCleaning.protocol.testResult")}
              <Badge variant={protocolTestMut.data.overall === "pass" ? "default" : "destructive"}>
                {protocolTestMut.data.overall.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {protocolTestMut.data.ping.ok ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span>Ping ({protocolTestMut.data.ping.latencyMs}ms)</span>
              </div>
              <div className="flex items-center gap-2">
                {protocolTestMut.data.telemetry.ok ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span>{t("robotCleaning.fleet.telemetry")}</span>
              </div>
              <div className="flex items-center gap-2">
                {protocolTestMut.data.command.ok ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span>{t("robotCleaning.fleet.command")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Robot Details */}
      {selectedRobotId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Digital Twin / Telemetry */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                {t("robotCleaning.dt.jointPositions")}
                <Button size="sm" variant="outline" className="text-xs h-7"
                  onClick={() => syncDtMut.mutate({ robotId: selectedRobotId })}
                  disabled={syncDtMut.isPending}>
                  {t("robotCleaning.dt.sync")}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestTelemetry.data ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {["j1Deg", "j2Deg", "j3Deg", "j4Deg", "j5Deg", "j6Deg"].map((key, i) => (
                      <div key={key} className="border rounded p-2 text-center">
                        <p className="text-muted-foreground">J{i + 1}</p>
                        <p className="font-mono font-bold">{Number(latestTelemetry.data?.[key as keyof typeof latestTelemetry.data] ?? 0).toFixed(1)}°</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                    {[
                      { key: "tcpX", label: "X" },
                      { key: "tcpY", label: "Y" },
                      { key: "tcpZ", label: "Z" },
                    ].map(({ key, label }) => (
                      <div key={key} className="border rounded p-2 text-center">
                        <p className="text-muted-foreground">TCP {label}</p>
                        <p className="font-mono font-bold">{Number(latestTelemetry.data?.[key as keyof typeof latestTelemetry.data] ?? 0).toFixed(1)} mm</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">{t("robotCleaning.dt.noData")}</p>
              )}
            </CardContent>
          </Card>

          {/* Connection Logs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("robotCleaning.fleet.connectionLogs")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {(connectionLogs.data ?? []).slice(0, 10).map((log) => (
                  <div key={log.id} className="flex justify-between text-xs border-b pb-1">
                    <span className="flex items-center gap-1">
                      {log.success ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                      {log.eventType}
                    </span>
                    <span className="text-muted-foreground">
                      {log.latencyMs ? `${log.latencyMs}ms` : ""} {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Condition Alerts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" /> {t("robotCleaning.condition.alerts")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("robotCleaning.condition.type")}</TableHead>
                  <TableHead>{t("robotCleaning.condition.severity")}</TableHead>
                  <TableHead>{t("robotCleaning.condition.message")}</TableHead>
                  <TableHead>{t("robotCleaning.condition.time")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(alerts.data ?? []).map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{alert.alertType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={alert.severity === "critical" || alert.severity === "emergency" ? "destructive" : "outline"} className="text-[10px]">
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{alert.message}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(alert.createdAt).toLocaleTimeString()}</TableCell>
                    <TableCell>
                      {!alert.acknowledgedAt && (
                        <Button size="sm" variant="ghost" className="text-xs h-7"
                          onClick={() => acknowledgeMut.mutate({ id: alert.id, acknowledgedBy: "operator" })}>
                          ACK
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(alerts.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                      {t("robotCleaning.condition.noAlerts")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function RobotCleaningMonitor() {
  const { t } = useLanguage();
  const [robotCode, setRobotCode] = useState("GRT-CL-01");

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">{t("robotCleaning.monitor.title")}</h1>
        <div className="flex items-center gap-2">
          <Label className="text-sm">{t("robotCleaning.monitor.robotCode")}:</Label>
          <RobotSelector value={robotCode} onChange={setRobotCode} className="w-56" />
        </div>
      </div>

      <Tabs defaultValue="monitor" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 h-auto">
          <TabsTrigger value="monitor" className="text-xs py-2">
            <Activity className="h-3 w-3 mr-1" /> {t("robotCleaning.tab.monitor")}
          </TabsTrigger>
          <TabsTrigger value="adaptive" className="text-xs py-2">
            <Bot className="h-3 w-3 mr-1" /> {t("robotCleaning.tab.adaptive")}
          </TabsTrigger>
          <TabsTrigger value="recipe" className="text-xs py-2">
            <Beaker className="h-3 w-3 mr-1" /> {t("robotCleaning.tab.recipe")}
          </TabsTrigger>
          <TabsTrigger value="tsmc" className="text-xs py-2">
            <ShieldCheck className="h-3 w-3 mr-1" /> {t("robotCleaning.tab.tsmc")}
          </TabsTrigger>
          <TabsTrigger value="torque" className="text-xs py-2">
            <Wrench className="h-3 w-3 mr-1" /> {t("robotCleaning.tab.torque")}
          </TabsTrigger>
          <TabsTrigger value="perf" className="text-xs py-2">
            <BarChart3 className="h-3 w-3 mr-1" /> {t("robotCleaning.tab.perf")}
          </TabsTrigger>
          <TabsTrigger value="fleet" className="text-xs py-2">
            <Cpu className="h-3 w-3 mr-1" /> {t("robotCleaning.tab.fleet")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitor"><MonitorTab robotCode={robotCode} /></TabsContent>
        <TabsContent value="adaptive"><AdaptiveTab robotCode={robotCode} /></TabsContent>
        <TabsContent value="recipe"><RecipeTab /></TabsContent>
        <TabsContent value="tsmc"><TsmcTab /></TabsContent>
        <TabsContent value="torque"><TorqueTab robotCode={robotCode} /></TabsContent>
        <TabsContent value="perf"><PerfTab /></TabsContent>
        <TabsContent value="fleet"><FleetTab /></TabsContent>
      </Tabs>
    </div>
  );
}
