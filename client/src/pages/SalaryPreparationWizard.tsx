/**
 * Salary Preparation Wizard — 月度薪资准备向导
 *
 * 5-step CEO pipeline:
 *   Step 1 — Data Readiness: check KPI/AEI/attendance/360 completeness
 *   Step 2 — Composite Scoring: run batch AI scoring
 *   Step 3 — Calibration Check: review forced distribution & overrides
 *   Step 4 — Payroll Batch: trigger payroll calculation
 *   Step 5 — Approval Gate: navigate to PayrollApprovalGate
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, Circle, ArrowRight, Loader2, AlertTriangle,
  Database, Brain, Scale, Calculator, Shield, RefreshCw,
  BarChart3, Users, TrendingUp,
} from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

const STEPS = [
  { id: 1, name: "数据就绪", nameEn: "Data Readiness", icon: Database },
  { id: 2, name: "综合评分", nameEn: "Composite Scoring", icon: Brain },
  { id: 3, name: "校准检查", nameEn: "Calibration Check", icon: Scale },
  { id: 4, name: "薪资计算", nameEn: "Payroll Batch", icon: Calculator },
  { id: 5, name: "CEO审批", nameEn: "CEO Approval", icon: Shield },
] as const;

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = step.id === currentStep;
        const isDone = step.id < currentStep;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                isDone ? "bg-green-600 border-green-600 text-white" :
                isActive ? "bg-blue-600 border-blue-600 text-white" :
                "bg-muted border-muted-foreground/30 text-muted-foreground"
              }`}>
                {isDone ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className={`text-xs mt-1 ${isActive ? "font-bold text-blue-600" : "text-muted-foreground"}`}>
                {step.name}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-16 h-0.5 mx-2 ${step.id < currentStep ? "bg-green-600" : "bg-muted-foreground/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReadinessBar({ label, count, total, status }: { label: string; count: number; total: number; status: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2">
      {status === "complete" ? (
        <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
      ) : status === "partial" ? (
        <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-red-500 shrink-0" />
      )}
      <span className="w-28 text-sm shrink-0">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            status === "complete" ? "bg-green-600" : status === "partial" ? "bg-yellow-500" : "bg-red-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm text-muted-foreground w-20 text-right">{count}/{total} ({pct}%)</span>
    </div>
  );
}

export default function SalaryPreparationWizard() {
  const { t } = useLanguage();
  const currentDate = new Date();
  const defaultPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  const [period, setPeriod] = useState(defaultPeriod);
  const [currentStep, setCurrentStep] = useState(1);
  const [, navigate] = useLocation();

  // Queries — payroll-specific readiness check
  const payrollReadiness = trpc.payroll.readiness.check.useQuery(
    { period },
    { enabled: currentStep >= 1 },
  );
  // Legacy perfCalibration readiness (optional, may fail if no calibration data)
  const readiness = trpc.perfCalibration.pipeline.getReadinessReport.useQuery(
    { period },
    { enabled: currentStep >= 1 },
  );
  const alignment = trpc.perfCalibration.pipeline.getKpiAlignment.useQuery(
    { period },
    { enabled: currentStep >= 3 },
  );
  const distribution = trpc.perfCalibration.forcedDistribution.getConfig.useQuery(undefined, {
    enabled: currentStep >= 3,
  });

  // Mutations
  const prepareMut = trpc.perfCalibration.pipeline.prepareMonthlySalary.useMutation({
    onSuccess: () => readiness.refetch(),
  });
  const batchCompositeMut = trpc.perfCalibration.compositeScore.calculateBatch.useMutation({
    onSuccess: () => readiness.refetch(),
  });

  const steps = readiness.data?.steps ?? [];
  const totalEmployees = readiness.data?.totalEmployees ?? payrollReadiness.data?.summary?.totalStructures ?? 0;
  const canProceed = readiness.data?.canProceed ?? payrollReadiness.data?.summary?.canCalculate ?? false;

  // KPI alignment summary
  const gradeDistribution = alignment.data?.summary?.gradeDistribution ?? {};
  const overrideCount = alignment.data?.summary?.overrideCount ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">月度薪资准备向导</h1>
          <p className="text-muted-foreground">Monthly Salary Preparation Pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">周期：</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          />
          <Button variant="outline" size="sm" onClick={() => readiness.refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> 刷新
          </Button>
        </div>
      </div>

      <StepIndicator currentStep={currentStep} />

      {/* Step 1: Data Readiness */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" /> 第1步：数据就绪检查
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(readiness.isLoading && payrollReadiness.isLoading) ? (
              <div className="flex items-center gap-2 py-8 justify-center">
                <Loader2 className="h-5 w-5 animate-spin" /> 正在检查数据完整性…
              </div>
            ) : (
              <>
                {/* Payroll-specific readiness (salary structures, attendance, perf) */}
                {payrollReadiness.data && (
                  <div className="space-y-1 mb-4">
                    <h3 className="text-sm font-medium mb-2">薪资引擎数据就绪</h3>
                    {payrollReadiness.data.checks.map((c) => (
                      <ReadinessBar
                        key={c.nameEn}
                        label={c.name}
                        count={c.count}
                        total={c.total ?? payrollReadiness.data!.summary.totalStructures}
                        status={c.status === "complete" ? "complete" : c.status === "partial" ? "partial" : "missing"}
                      />
                    ))}
                    <div className="text-xs text-muted-foreground mt-1 ml-8">
                      数据完整度：{payrollReadiness.data.summary.completenessPercent}%
                    </div>
                  </div>
                )}

                {/* Legacy perfCalibration readiness */}
                {steps.length > 0 && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium mb-2">绩效校准数据源</h3>
                    {steps.map((s) => (
                      <ReadinessBar
                        key={s.step}
                        label={s.name}
                        count={s.ready}
                        total={s.total}
                        status={s.status}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    员工总数：<strong>{totalEmployees}</strong> ·
                    {payrollReadiness.data && (
                      <> 薪资架构：{payrollReadiness.data.summary.totalStructures}人 · 考勤：{payrollReadiness.data.summary.totalAttendance}人 · 绩效：{payrollReadiness.data.summary.totalPerformance}人</>
                    )}
                  </div>
                  <Button
                    onClick={() => setCurrentStep(2)}
                    disabled={!canProceed}
                  >
                    {canProceed ? "下一步：综合评分" : "数据不完整，无法继续"}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                {!canProceed && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    {payrollReadiness.data?.summary.totalStructures === 0
                      ? "未找到员工薪资架构数据。请运行 seed-payroll-structures 脚本初始化。"
                      : "数据不完整：考勤或绩效数据缺失。请联系HR完善数据，或点击下方按钮自动生成默认考勤。"}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Composite Scoring */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" /> 第2步：AI综合评分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              系统将读取KPI(30%)、AEI(20%)、OKR(20%)、能力素质(15%)、360反馈(15%)五个维度，
              通过加权公式计算每位员工的综合评分，并自动映射等级（S/A/B/C/D）。
            </p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4 text-center">
                  <Users className="h-8 w-8 mx-auto text-blue-600 mb-1" />
                  <div className="text-2xl font-bold">{totalEmployees}</div>
                  <div className="text-xs text-muted-foreground">待评分员工</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto text-green-600 mb-1" />
                  <div className="text-2xl font-bold">
                    {steps.find(s => s.step === 5)?.ready ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">已有评分</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto text-purple-600 mb-1" />
                  <div className="text-2xl font-bold">5</div>
                  <div className="text-xs text-muted-foreground">评分维度</div>
                </CardContent>
              </Card>
            </div>

            {prepareMut.isSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800 mb-4">
                <CheckCircle className="h-4 w-4 inline mr-1" />
                {prepareMut.data?.message}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>返回</Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => batchCompositeMut.mutate({ period })}
                  disabled={batchCompositeMut.isPending}
                >
                  {batchCompositeMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  仅计算评分
                </Button>
                <Button onClick={() => setCurrentStep(3)}>
                  下一步：校准检查 <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Calibration Check */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" /> 第3步：校准与强制分布检查
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alignment.isLoading ? (
              <div className="flex items-center gap-2 py-8 justify-center">
                <Loader2 className="h-5 w-5 animate-spin" /> 加载校准数据…
              </div>
            ) : (
              <>
                {/* Grade distribution */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-3">当前等级分布</h3>
                  <div className="flex gap-3">
                    {["S", "A", "B", "C", "D"].map((grade) => {
                      const cnt = gradeDistribution[grade] ?? 0;
                      const total = alignment.data?.summary?.totalEmployees ?? 1;
                      const pct = Math.round((cnt / total) * 100);
                      const target = grade === "S" ? 5 : grade === "A" ? 20 : grade === "B" ? 50 : grade === "C" ? 20 : 5;
                      const isOver = pct > target + 5;
                      return (
                        <Card key={grade} className={`flex-1 ${isOver ? "border-yellow-400" : ""}`}>
                          <CardContent className="pt-3 text-center">
                            <div className={`text-xl font-bold ${
                              grade === "S" ? "text-purple-600" :
                              grade === "A" ? "text-green-600" :
                              grade === "B" ? "text-blue-600" :
                              grade === "C" ? "text-yellow-600" : "text-red-600"
                            }`}>{grade}</div>
                            <div className="text-lg font-semibold">{cnt}人</div>
                            <div className="text-xs text-muted-foreground">{pct}% (目标{target}%)</div>
                            {isOver && <AlertTriangle className="h-3 w-3 text-yellow-500 mx-auto mt-1" />}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Override summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-3 bg-muted rounded">
                    <div className="text-sm text-muted-foreground">手动调整数</div>
                    <div className="text-xl font-bold">{overrideCount}</div>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <div className="text-sm text-muted-foreground">已完成评分</div>
                    <div className="text-xl font-bold">{alignment.data?.summary?.totalEmployees ?? 0}</div>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <div className="text-sm text-muted-foreground">薪资已算</div>
                    <div className="text-xl font-bold">{alignment.data?.summary?.payrollCompleted ?? 0}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>返回</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate("/perf-calibration")}>
                      打开校准仪表板
                    </Button>
                    <Button onClick={() => setCurrentStep(4)}>
                      下一步：薪资计算 <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Payroll Batch */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" /> 第4步：批量薪资计算
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              一键触发：综合评分 → 校准定级应用 → 薪资批量计算（含五险一金、个税、绩效奖金）。
              计算结果进入HR审核流程。
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">评分+薪资一键准备</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    系统自动：①计算综合评分 → ②映射等级 → ③计算薪资 → ④生成台账
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">绩效奖金规则</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    S→150% · A→120% · B→100% · C→80% · D→60% (基于校准后等级)
                  </div>
                </CardContent>
              </Card>
            </div>

            {prepareMut.isSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800 mb-4">
                <CheckCircle className="h-4 w-4 inline mr-1" />
                综合评分已完成({prepareMut.data?.compositeScoring?.processed}人)，
                薪资计算任务ID: {prepareMut.data?.payrollTaskId}（{prepareMut.data?.payrollStatus}）
              </div>
            )}

            {prepareMut.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800 mb-4">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                {prepareMut.error?.message}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>返回</Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => prepareMut.mutate({ period })}
                  disabled={prepareMut.isPending}
                  variant="default"
                >
                  {prepareMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  一键执行评分+薪资计算
                </Button>
                <Button onClick={() => setCurrentStep(5)}>
                  下一步：CEO审批 <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: CEO Approval */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> 第5步：CEO终审
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              所有薪资台账计算完成后，进入CEO审批流程。
              审批通过后执行发放。
            </p>

            {/* Quick summary from alignment data */}
            {alignment.data && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-3 text-center">
                    <div className="text-2xl font-bold">{alignment.data.summary.totalEmployees}</div>
                    <div className="text-xs text-muted-foreground">总人数</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 text-center">
                    <div className="text-2xl font-bold">{alignment.data.summary.payrollCompleted}</div>
                    <div className="text-xs text-muted-foreground">薪资已算</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 text-center">
                    <div className="text-2xl font-bold">{alignment.data.summary.ceoApproved}</div>
                    <div className="text-xs text-muted-foreground">已审批</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ¥{(alignment.data.summary.totalPerformanceBonus / 10000).toFixed(1)}万
                    </div>
                    <div className="text-xs text-muted-foreground">绩效奖金总额</div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(4)}>返回</Button>
              <Button onClick={() => navigate("/payroll-approval")}>
                进入CEO审批仪表板 <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Alignment Table — shown in steps 3-5 */}
      {currentStep >= 3 && alignment.data && alignment.data.employees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">KPI对齐明细 ({alignment.data.employees.length}人)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-2">姓名</th>
                    <th className="py-2 px-2">部门</th>
                    <th className="py-2 px-2 text-right">KPI</th>
                    <th className="py-2 px-2 text-right">AEI</th>
                    <th className="py-2 px-2 text-right">AI综合</th>
                    <th className="py-2 px-2 text-center">AI等级</th>
                    <th className="py-2 px-2 text-right">最终分</th>
                    <th className="py-2 px-2 text-center">最终等级</th>
                    <th className="py-2 px-2 text-right">绩效奖金</th>
                    <th className="py-2 px-2 text-center">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {alignment.data.employees.slice(0, 50).map((emp) => (
                    <tr key={emp.employeeId} className="border-b hover:bg-muted/50">
                      <td className="py-1.5 px-2">{emp.employeeName}</td>
                      <td className="py-1.5 px-2 text-muted-foreground">{emp.department}</td>
                      <td className="py-1.5 px-2 text-right">{emp.kpiScore?.toFixed(1) ?? "—"}</td>
                      <td className="py-1.5 px-2 text-right">{emp.aeiScore?.toFixed(1) ?? "—"}</td>
                      <td className="py-1.5 px-2 text-right">{emp.aiCompositeScore?.toFixed(1) ?? "—"}</td>
                      <td className="py-1.5 px-2 text-center">
                        <GradeBadge grade={emp.aiGrade} />
                      </td>
                      <td className="py-1.5 px-2 text-right font-medium">{emp.finalScore?.toFixed(1) ?? "—"}</td>
                      <td className="py-1.5 px-2 text-center">
                        <GradeBadge grade={emp.finalGrade} />
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        {emp.performanceBonus ? `¥${emp.performanceBonus.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <StatusBadge status={emp.payrollStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {alignment.data.employees.length > 50 && (
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  显示前50条，共{alignment.data.employees.length}条
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-muted-foreground">—</span>;
  const colors: Record<string, string> = {
    S: "bg-purple-100 text-purple-700",
    A: "bg-green-100 text-green-700",
    B: "bg-blue-100 text-blue-700",
    C: "bg-yellow-100 text-yellow-700",
    D: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[grade] ?? "bg-muted"}`}>
      {grade}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, { label: string; color: string }> = {
    not_calculated: { label: "未计算", color: "bg-gray-100 text-gray-600" },
    DRAFT: { label: "草稿", color: "bg-gray-100 text-gray-600" },
    HR_VERIFIED: { label: "HR已审", color: "bg-blue-100 text-blue-700" },
    FINANCE_APPROVED: { label: "财务通过", color: "bg-indigo-100 text-indigo-700" },
    CEO_APPROVED: { label: "CEO通过", color: "bg-green-100 text-green-700" },
    PAID: { label: "已发放", color: "bg-emerald-100 text-emerald-700" },
  };
  const item = labels[status] ?? { label: status, color: "bg-muted" };
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${item.color}`}>
      {item.label}
    </span>
  );
}
