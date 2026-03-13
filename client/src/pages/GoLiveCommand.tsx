/**
 * Go-Live Command Center — 上线指挥中心
 *
 * 6-tab workbench:
 * 1. 上线就绪: Score gauge, 6 categories, blockers, phase stepper
 * 2. 场景时间轴: 6-phase vertical timeline with milestones
 * 3. 薪资导入: Gemini prompt, JSON paste, preview, import
 * 4. 编码合规: Compliance gauge, rules reference, live validator
 * 5. 军团模拟: Level distribution, G-Token, staffing heatmap, skill gaps
 * 6. 架构总览: System stats, domain coverage
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Rocket, Shield, CheckCircle, AlertTriangle, Clock, Code2,
  Users, Brain, Factory, Copy, Upload, Play, RefreshCw,
  ChevronRight, XCircle, Info, BarChart3, Layers, Database,
  FlaskConical, Sparkles, ShieldCheck, ListTodo, Plus, Eye,
  ArrowRight, Tag, Zap, FileCode2, RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function GoLiveCommand() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: "上线就绪", labelEn: "Readiness", icon: Shield },
    { label: "场景时间轴", labelEn: "Timeline", icon: Clock },
    { label: "薪资导入", labelEn: "Salary Import", icon: Upload },
    { label: "编码合规", labelEn: "Encoding", icon: Code2 },
    { label: "军团模拟", labelEn: "Simulation", icon: Brain },
    { label: "架构总览", labelEn: "Architecture", icon: Layers },
    { label: "沙盘场景", labelEn: "Scenarios", icon: FlaskConical },
    { label: "AI 方案室", labelEn: "AI Studio", icon: Sparkles },
    { label: "上线关卡", labelEn: "Gates", icon: ShieldCheck },
    { label: "变更任务", labelEn: "Tasks", icon: ListTodo },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3 mb-4">
        <Rocket className="h-7 w-7 text-orange-500" />
        <h1 className="text-2xl font-bold">上线指挥中心</h1>
        <span className="text-sm text-muted-foreground">Go-Live Command Center</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b overflow-x-auto scrollbar-hide">
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          return (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === i ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 0 && <ReadinessTab />}
      {activeTab === 1 && <TimelineTab />}
      {activeTab === 2 && <SalaryImportTab />}
      {activeTab === 3 && <EncodingTab />}
      {activeTab === 4 && <SimulationTab />}
      {activeTab === 5 && <ArchitectureTab />}
      {activeTab === 6 && <SandboxScenarioTab />}
      {activeTab === 7 && <AIStudioTab />}
      {activeTab === 8 && <ReleaseGatesTab />}
      {activeTab === 9 && <ChangeTasksTab />}
    </div>
  );
}

// ── Tab 1: Readiness ─────────────────────────────────────

function ReadinessTab() {
  const scorecard = trpc.goLive.readiness.getReadinessScorecard.useQuery();
  const blockers = trpc.goLive.readiness.getBlockers.useQuery();
  const preflightMut = trpc.goLive.readiness.runPreflightChecks.useMutation();

  const score = scorecard.data?.totalScore ?? 0;
  const grade = scorecard.data?.grade ?? "-";
  const gradeColor = grade === "A" ? "text-green-600" : grade === "B" ? "text-blue-600" : grade === "C" ? "text-yellow-600" : "text-red-600";

  return (
    <div className="space-y-4">
      {/* Score gauge */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="col-span-1">
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444"} strokeWidth="8" strokeDasharray={`${score * 2.64} 264`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{score}</span>
                <span className={`text-lg font-semibold ${gradeColor}`}>{grade}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">上线就绪度</p>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardHeader><CardTitle className="text-base">类别评分</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(scorecard.data?.categories ?? []).map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 p-2 rounded border">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${cat.score >= 80 ? "bg-green-100 text-green-700" : cat.score >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                    {cat.score}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{cat.nameEn}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blockers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">阻塞项 Blockers</CardTitle>
          <Button size="sm" variant="outline" onClick={() => preflightMut.mutate()} disabled={preflightMut.isPending}>
            <Play className="h-3.5 w-3.5 mr-1" />
            {preflightMut.isPending ? "检查中..." : "运行预检"}
          </Button>
        </CardHeader>
        <CardContent>
          {blockers.data?.blockers.length === 0 && <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> 无阻塞项</p>}
          <div className="space-y-2">
            {(blockers.data?.blockers ?? []).map((b, i) => (
              <div key={i} className={`flex items-start gap-2 p-2 rounded text-sm ${b.severity === "critical" ? "bg-red-50 border-red-200 border" : b.severity === "warning" ? "bg-yellow-50 border-yellow-200 border" : "bg-blue-50 border-blue-200 border"}`}>
                {b.severity === "critical" ? <XCircle className="h-4 w-4 text-red-500 mt-0.5" /> : b.severity === "warning" ? <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" /> : <Info className="h-4 w-4 text-blue-500 mt-0.5" />}
                <div>
                  <p className="font-medium">{b.messageZh}</p>
                  <p className="text-xs text-muted-foreground">{b.remediation}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Preflight results */}
          {preflightMut.data && (
            <div className="mt-4 border-t pt-3">
              <p className="text-sm font-medium mb-2">预检结果: {preflightMut.data.summary.readiness === "ready" ? "就绪" : preflightMut.data.summary.readiness === "partial" ? "部分就绪" : "未就绪"} ({preflightMut.data.summary.readinessPercent}%)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="bg-green-50 p-2 rounded text-center"><span className="font-bold text-green-600">{preflightMut.data.summary.pass}</span> Pass</div>
                <div className="bg-red-50 p-2 rounded text-center"><span className="font-bold text-red-600">{preflightMut.data.summary.fail}</span> Fail</div>
                <div className="bg-yellow-50 p-2 rounded text-center"><span className="font-bold text-yellow-600">{preflightMut.data.summary.warn}</span> Warn</div>
                <div className="bg-gray-50 p-2 rounded text-center"><span className="font-bold text-gray-600">{preflightMut.data.summary.skip}</span> Skip</div>
              </div>
              <div className="mt-2 space-y-1">
                {preflightMut.data.checks.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-xs">
                    {c.status === "pass" ? <CheckCircle className="h-3 w-3 text-green-500" /> : c.status === "fail" ? <XCircle className="h-3 w-3 text-red-500" /> : c.status === "warn" ? <AlertTriangle className="h-3 w-3 text-yellow-500" /> : <Info className="h-3 w-3 text-gray-400" />}
                    <span>{c.labelZh}</span>
                    <span className="text-muted-foreground ml-auto">{c.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 2: Timeline ──────────────────────────────────────

function TimelineTab() {
  const timeline = trpc.goLive.readiness.getReadinessTimeline.useQuery();
  const phaseProgress = trpc.goLive.readiness.getPhaseProgress.useQuery();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">上线六阶段时间轴</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-0">
            {(timeline.data?.phases ?? []).map((phase, i) => (
              <div key={phase.id} className="flex gap-4">
                {/* Vertical line + dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${phase.status === "completed" ? "bg-green-500 text-white" : phase.status === "active" ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                    {phase.status === "completed" ? <CheckCircle className="h-4 w-4" /> : phase.id}
                  </div>
                  {i < (timeline.data?.phases.length ?? 0) - 1 && <div className={`w-0.5 h-16 ${phase.status === "completed" ? "bg-green-300" : "bg-gray-200"}`} />}
                </div>

                {/* Content */}
                <div className={`pb-6 flex-1 ${phase.status === "active" ? "bg-orange-50 -mx-2 px-3 py-2 rounded-lg border border-orange-200" : ""}`}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{phase.name}</h3>
                    <span className="text-xs text-muted-foreground">{phase.nameEn}</span>
                    {phase.status === "active" && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">当前阶段</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{phase.description}</p>
                  {phase.progress > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${phase.status === "completed" ? "bg-green-500" : "bg-orange-500"}`} style={{ width: `${phase.progress}%` }} />
                      </div>
                      <span className="text-xs font-medium">{phase.progress}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Phase milestones */}
      {phaseProgress.data && (
        <Card>
          <CardHeader><CardTitle className="text-base">当前阶段里程碑 (Phase {phaseProgress.data.currentPhase})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {phaseProgress.data.milestones
                .filter((m) => m.phase === phaseProgress.data!.currentPhase)
                .map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {m.done ? <CheckCircle className="h-4 w-4 text-green-500" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                    <span className={m.done ? "line-through text-muted-foreground" : ""}>{m.item}</span>
                  </div>
                ))}
            </div>
            {phaseProgress.data.remainingItems.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">待完成: {phaseProgress.data.remainingItems.join(", ")}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Tab 3: Salary Import ─────────────────────────────────

function SalaryImportTab() {
  const template = trpc.goLive.salaryImport.getSalaryTemplate.useQuery();
  const history = trpc.goLive.salaryImport.getSalaryImportHistory.useQuery();
  const previewMut = trpc.goLive.salaryImport.previewSalaryImport.useMutation();
  const importMut = trpc.goLive.salaryImport.importSalaryData.useMutation();

  const [jsonInput, setJsonInput] = useState("");
  const [parseError, setParseError] = useState("");

  const handlePreview = () => {
    setParseError("");
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error("Must be a JSON array");
      previewMut.mutate({ employees: parsed });
    } catch (err: any) {
      setParseError(err.message || "Invalid JSON");
    }
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      importMut.mutate({ employees: parsed, notes: "Go-Live Gemini import" });
    } catch { /* already validated */ }
  };

  const handleCopyPrompt = () => {
    if (template.data?.geminiPrompt) {
      navigator.clipboard.writeText(template.data.geminiPrompt);
    }
  };

  return (
    <div className="space-y-4">
      {/* Step 1: Gemini prompt */}
      <Card>
        <CardHeader><CardTitle className="text-base">Step 1: 复制Gemini提示词</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">将Excel薪资表粘贴给Gemini，使用以下提示词转换为JSON格式：</p>
          <div className="bg-gray-50 p-3 rounded text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto border">
            {template.data?.geminiPrompt || "Loading..."}
          </div>
          <Button size="sm" className="mt-2" variant="outline" onClick={handleCopyPrompt}>
            <Copy className="h-3.5 w-3.5 mr-1" /> 复制提示词
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Paste JSON */}
      <Card>
        <CardHeader><CardTitle className="text-base">Step 2: 粘贴Gemini输出的JSON</CardTitle></CardHeader>
        <CardContent>
          <textarea
            className="w-full h-32 p-3 border rounded text-sm font-mono resize-y"
            placeholder='[{"employeeId": 1, "department": "技术部", "baseSalary": 15000, "performanceGrade": "A"}]'
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
          {parseError && <p className="text-xs text-red-500 mt-1">{parseError}</p>}
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handlePreview} disabled={!jsonInput || previewMut.isPending}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> 预览计算
            </Button>
            {previewMut.data && (
              <Button size="sm" variant="default" onClick={handleImport} disabled={importMut.isPending}>
                <Upload className="h-3.5 w-3.5 mr-1" /> {importMut.isPending ? "导入中..." : "确认导入"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview results */}
      {previewMut.data && (
        <Card>
          <CardHeader><CardTitle className="text-base">预览结果</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="bg-blue-50 p-3 rounded text-center">
                <p className="text-xs text-muted-foreground">人数</p>
                <p className="text-lg font-bold">{previewMut.data.summary.totalRecords}</p>
              </div>
              <div className="bg-green-50 p-3 rounded text-center">
                <p className="text-xs text-muted-foreground">月薪总额</p>
                <p className="text-lg font-bold">{(previewMut.data.summary.totalMonthlyPayroll / 10000).toFixed(1)}万</p>
              </div>
              <div className="bg-purple-50 p-3 rounded text-center">
                <p className="text-xs text-muted-foreground">年薪总额</p>
                <p className="text-lg font-bold">{(previewMut.data.summary.totalAnnualPayroll / 10000).toFixed(1)}万</p>
              </div>
              <div className="bg-orange-50 p-3 rounded text-center">
                <p className="text-xs text-muted-foreground">人均月薪</p>
                <p className="text-lg font-bold">{previewMut.data.summary.averageMonthly.toLocaleString()}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-1">ID</th>
                    <th className="text-left p-1">部门</th>
                    <th className="text-right p-1">基本工资</th>
                    <th className="text-center p-1">绩效</th>
                    <th className="text-right p-1">绩效工资</th>
                    <th className="text-right p-1">奖金</th>
                    <th className="text-right p-1">福利</th>
                    <th className="text-right p-1 font-bold">月薪合计</th>
                  </tr>
                </thead>
                <tbody>
                  {previewMut.data.records.map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-1">{r.employeeId}</td>
                      <td className="p-1">{r.department}</td>
                      <td className="p-1 text-right">{r.baseSalary.toLocaleString()}</td>
                      <td className="p-1 text-center">{r.performanceGrade}</td>
                      <td className="p-1 text-right">{r.performanceSalary.toLocaleString()}</td>
                      <td className="p-1 text-right">{r.bonus.toLocaleString()}</td>
                      <td className="p-1 text-right">{r.benefits.toLocaleString()}</td>
                      <td className="p-1 text-right font-bold">{r.monthlyTotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import result */}
      {importMut.data && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">导入完成: {importMut.data.successCount} 条成功, {importMut.data.failureCount} 条失败</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import history */}
      <Card>
        <CardHeader><CardTitle className="text-base">导入历史</CardTitle></CardHeader>
        <CardContent>
          {(history.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无导入记录</p>
          ) : (
            <div className="space-y-2">
              {(history.data ?? []).map((h) => (
                <div key={h.id} className="flex items-center justify-between p-2 rounded border text-sm">
                  <div>
                    <span className="font-medium">{h.fileName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{h.totalRows} rows</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-600">{h.successCount} ok</span>
                    {(h.failedCount ?? 0) > 0 && <span className="text-red-600">{h.failedCount} failed</span>}
                    <span className={`px-1.5 py-0.5 rounded ${h.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{h.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 4: Encoding ──────────────────────────────────────

function EncodingTab() {
  const compliance = trpc.goLive.encoding.getEncodingCompliance.useQuery();
  const stats = trpc.goLive.encoding.getEncodingStats.useQuery();
  const rules = trpc.goLive.encoding.getEncodingRules.useQuery();

  const [testCode, setTestCode] = useState("");
  const validateQ = trpc.goLive.encoding.validateCode.useQuery(
    { code: testCode },
    { enabled: testCode.length >= 3 },
  );

  return (
    <div className="space-y-4">
      {/* Compliance gauge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">编码合规率</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl font-bold text-green-600">{compliance.data?.compliancePercent ?? 0}%</div>
              <p className="text-sm text-muted-foreground mt-1">{compliance.data?.validCount ?? 0} / {compliance.data?.totalCodes ?? 0} 合规编码</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">实时验证器</CardTitle></CardHeader>
          <CardContent>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm font-mono"
              placeholder="输入编码验证 (如 GRT-RC-ME-001)"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
            />
            {validateQ.data && testCode.length >= 3 && (
              <div className={`mt-2 p-2 rounded text-sm ${validateQ.data.valid ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {validateQ.data.valid ? (
                  <div className="flex items-center gap-1"><CheckCircle className="h-4 w-4" /> 有效 ({validateQ.data.codeType})</div>
                ) : (
                  <div className="flex items-center gap-1"><XCircle className="h-4 w-4" /> {validateQ.data.error}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Encoding rules reference */}
      <Card>
        <CardHeader><CardTitle className="text-base">GRT编码第一规则 参考</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-2">类型</th>
                  <th className="text-left p-2">格式</th>
                  <th className="text-left p-2">说明</th>
                  <th className="text-left p-2">示例</th>
                </tr>
              </thead>
              <tbody>
                {(rules.data ?? []).map((rule) => (
                  <tr key={rule.type} className="border-b">
                    <td className="p-2 font-mono text-xs font-medium">{rule.type}</td>
                    <td className="p-2 font-mono text-xs">{rule.pattern}</td>
                    <td className="p-2 text-xs">{rule.descriptionZh}</td>
                    <td className="p-2 font-mono text-xs text-muted-foreground">{rule.examples.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Encoding stats by type */}
      <Card>
        <CardHeader><CardTitle className="text-base">编码分布</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(stats.data?.types ?? []).map((t) => (
              <div key={t.type} className="p-3 border rounded text-center">
                <p className="text-2xl font-bold">{t.count}</p>
                <p className="text-xs text-muted-foreground">{t.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 5: Simulation ────────────────────────────────────

function SimulationTab() {
  const runSim = trpc.goLive.simulation.runLegionSimulation.useMutation();
  const results = trpc.goLive.simulation.getSimulationResults.useQuery();
  const comparison = trpc.goLive.simulation.getScenarioComparison.useQuery();

  const sim = runSim.data;

  return (
    <div className="space-y-4">
      {/* Run button */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">军团模拟</CardTitle>
          <Button size="sm" onClick={() => runSim.mutate()} disabled={runSim.isPending}>
            <Play className="h-3.5 w-3.5 mr-1" /> {runSim.isPending ? "模拟中..." : "运行模拟"}
          </Button>
        </CardHeader>
      </Card>

      {sim && (
        <>
          {/* Level distribution */}
          <Card>
            <CardHeader><CardTitle className="text-base">M等级分布 ({sim.totalEmployees} 员工)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((level) => {
                  const cnt = sim.levelDistribution[level] || 0;
                  const pct = sim.totalEmployees > 0 ? Math.round((cnt / sim.totalEmployees) * 100) : 0;
                  return (
                    <div key={level} className="flex items-center gap-3">
                      <span className="w-8 text-sm font-mono">L{level}</span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${level <= 2 ? "bg-blue-400" : level === 3 ? "bg-green-400" : level === 4 ? "bg-purple-400" : "bg-orange-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-16 text-sm text-right">{cnt} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* G-Token + Staffing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground">预计G-Token投放</p>
                <p className="text-3xl font-bold text-purple-600">{sim.projectedGTokens.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground">产能估算 / 目标</p>
                <p className="text-3xl font-bold">
                  <span className={sim.staffingCapacity.estimatedCapacity >= sim.staffingCapacity.machineTarget ? "text-green-600" : "text-red-600"}>
                    {sim.staffingCapacity.estimatedCapacity}
                  </span>
                  <span className="text-base text-muted-foreground"> / {sim.staffingCapacity.machineTarget}</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground">AI就绪度</p>
                <p className="text-3xl font-bold text-blue-600">{sim.aiReadiness}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Skill gaps */}
          <Card>
            <CardHeader><CardTitle className="text-base">技能缺口分析</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2">能力维度</th>
                      <th className="text-right p-2">当前</th>
                      <th className="text-right p-2">目标</th>
                      <th className="text-right p-2">缺口</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sim.skillGaps.map((sg) => (
                      <tr key={sg.skill} className="border-b">
                        <td className="p-2">{sg.skill}</td>
                        <td className="p-2 text-right">{sg.current}</td>
                        <td className="p-2 text-right">{sg.target}</td>
                        <td className={`p-2 text-right font-medium ${sg.gap > 0 ? "text-red-600" : "text-green-600"}`}>{sg.gap > 0 ? `-${sg.gap}` : "0"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Current vs Target comparison */}
      {comparison.data && (
        <Card>
          <CardHeader><CardTitle className="text-base">现状 vs 目标</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2">指标</th>
                    <th className="text-right p-2">当前</th>
                    <th className="text-right p-2">目标</th>
                    <th className="text-right p-2">差距</th>
                  </tr>
                </thead>
                <tbody>
                  {(["headcount", "aiAssistants", "machineCapacity", "encodingCompliance", "readinessScore"] as const).map((key) => (
                    <tr key={key} className="border-b">
                      <td className="p-2 capitalize">{key.replace(/([A-Z])/g, " $1")}</td>
                      <td className="p-2 text-right">{comparison.data!.current[key]}</td>
                      <td className="p-2 text-right">{comparison.data!.target[key]}</td>
                      <td className={`p-2 text-right font-medium ${comparison.data!.gaps[key] > 0 ? "text-red-600" : "text-green-600"}`}>
                        {comparison.data!.gaps[key] > 0 ? `-${comparison.data!.gaps[key]}` : "0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous simulations */}
      {(results.data ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">历史模拟记录</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(results.data ?? []).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <span>{r.totalEmployees} 员工</span>
                  <span className="text-xs text-muted-foreground">{r.simulatedAt}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Tab 7: Sandbox Scenarios ──────────────────────────────

function SandboxScenarioTab() {
  const scenarios = trpc.goLive.scenario.list.useQuery();
  const createMut = trpc.goLive.scenario.create.useMutation({ onSuccess: () => scenarios.refetch() });
  const archiveMut = trpc.goLive.scenario.archive.useMutation({ onSuccess: () => scenarios.refetch() });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", businessGoal: "", priority: "P2" as string, tags: "" });

  const handleCreate = () => {
    if (!form.title.trim()) return;
    createMut.mutate({
      title: form.title,
      businessGoal: form.businessGoal,
      priority: form.priority as any,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
    });
    setForm({ title: "", businessGoal: "", priority: "P2", tags: "" });
    setShowCreate(false);
  };

  const statusColor: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    submitted: "bg-blue-100 text-blue-700",
    planning: "bg-indigo-100 text-indigo-700",
    reviewed: "bg-purple-100 text-purple-700",
    approved: "bg-green-100 text-green-700",
    implementing: "bg-orange-100 text-orange-700",
    completed: "bg-emerald-100 text-emerald-700",
    archived: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">沙盘场景 Scenarios</CardTitle>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> 新建场景
          </Button>
        </CardHeader>
        {showCreate && (
          <CardContent className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">标题 *</label>
                <input className="w-full p-2 border rounded text-sm mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="场景标题" />
              </div>
              <div>
                <label className="text-xs font-medium">优先级</label>
                <select className="w-full p-2 border rounded text-sm mt-1" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="P0">P0 - 紧急</option>
                  <option value="P1">P1 - 高</option>
                  <option value="P2">P2 - 中</option>
                  <option value="P3">P3 - 低</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium">业务目标</label>
                <textarea className="w-full p-2 border rounded text-sm mt-1 h-20" value={form.businessGoal} onChange={(e) => setForm({ ...form, businessGoal: e.target.value })} placeholder="CEO的业务目标描述..." />
              </div>
              <div>
                <label className="text-xs font-medium">标签 (逗号分隔)</label>
                <input className="w-full p-2 border rounded text-sm mt-1" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="AI, 生产, 质量" />
              </div>
              <div className="flex items-end">
                <Button size="sm" onClick={handleCreate} disabled={createMut.isPending || !form.title.trim()}>
                  {createMut.isPending ? "创建中..." : "创建场景"}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Scenario cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {(scenarios.data ?? []).map((s) => (
          <Card key={s.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-sm line-clamp-2">{s.title}</h3>
                <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor[s.status] || "bg-gray-100"}`}>{s.status}</span>
              </div>
              {s.businessGoal && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{s.businessGoal}</p>}
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-xs">{s.priority}</Badge>
                {(s.tags as string[] || []).slice(0, 3).map((tag) => (
                  <span key={tag} className="bg-gray-100 px-1.5 py-0.5 rounded">{tag}</span>
                ))}
              </div>
              <div className="flex gap-1 mt-3">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => archiveMut.mutate({ id: s.id })} disabled={s.status === "archived"}>
                  归档
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(scenarios.data ?? []).length === 0 && (
          <div className="col-span-full text-center py-8 text-sm text-muted-foreground">暂无沙盘场景，点击"新建场景"开始</div>
        )}
      </div>
    </div>
  );
}

// ── Tab 8: AI Studio ──────────────────────────────────────

function AIStudioTab() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const scenarios = trpc.goLive.scenario.list.useQuery();
  const runs = trpc.goLive.sandboxRun.list.useQuery(
    selectedScenarioId ? { scenarioId: selectedScenarioId } : undefined,
    { enabled: !!selectedScenarioId },
  );

  const proposalMut = trpc.goLive.sandboxRun.generateProposal.useMutation({ onSuccess: () => runs.refetch() });
  const implMut = trpc.goLive.sandboxRun.executeImplementation.useMutation({ onSuccess: () => runs.refetch() });
  const reviewMut = trpc.goLive.sandboxRun.runRedTeamReview.useMutation({ onSuccess: () => runs.refetch() });

  const latestProposal = (runs.data ?? []).find((r) => r.runType === "proposal" && r.status === "completed");
  const latestImpl = (runs.data ?? []).find((r) => r.runType === "implementation" && r.status === "completed");

  const providerConfig = [
    { name: "Gemini", label: "方案大脑", color: "blue", icon: "G", action: "生成方案", type: "proposal" as const },
    { name: "Claude", label: "实施工程队", color: "purple", icon: "C", action: "执行实施", type: "implementation" as const },
    { name: "GPT", label: "红队/裁决", color: "green", icon: "R", action: "红队审查", type: "review" as const },
  ];

  return (
    <div className="space-y-4">
      {/* Scenario selector */}
      <Card>
        <CardHeader><CardTitle className="text-base">选择场景</CardTitle></CardHeader>
        <CardContent>
          <select
            className="w-full p-2 border rounded text-sm"
            value={selectedScenarioId ?? ""}
            onChange={(e) => setSelectedScenarioId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">-- 选择沙盘场景 --</option>
            {(scenarios.data ?? []).filter((s) => s.status !== "archived").map((s) => (
              <option key={s.id} value={s.id}>[{s.priority}] {s.title}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedScenarioId && (
        <>
          {/* 3-panel AI station */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {providerConfig.map((p) => (
              <Card key={p.name} className={`border-t-4 border-t-${p.color}-400`}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-full bg-${p.color}-100 text-${p.color}-700 flex items-center justify-center text-sm font-bold`}>{p.icon}</div>
                    <div>
                      <h3 className="font-medium text-sm">{p.name}</h3>
                      <p className="text-xs text-muted-foreground">{p.label}</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    variant="outline"
                    disabled={
                      (p.type === "proposal" && proposalMut.isPending) ||
                      (p.type === "implementation" && (implMut.isPending || !latestProposal)) ||
                      (p.type === "review" && (reviewMut.isPending || !latestProposal || !latestImpl))
                    }
                    onClick={() => {
                      if (p.type === "proposal") proposalMut.mutate({ scenarioId: selectedScenarioId });
                      if (p.type === "implementation" && latestProposal) implMut.mutate({ scenarioId: selectedScenarioId, proposalRunId: latestProposal.id });
                      if (p.type === "review" && latestProposal && latestImpl) reviewMut.mutate({ scenarioId: selectedScenarioId, proposalRunId: latestProposal.id, implementationRunId: latestImpl.id });
                    }}
                  >
                    <Zap className="h-3.5 w-3.5 mr-1" />
                    {(p.type === "proposal" && proposalMut.isPending) || (p.type === "implementation" && implMut.isPending) || (p.type === "review" && reviewMut.isPending)
                      ? "处理中..."
                      : p.action}
                  </Button>

                  {p.type === "implementation" && !latestProposal && (
                    <p className="text-xs text-muted-foreground mt-1">需要先生成方案</p>
                  )}
                  {p.type === "review" && (!latestProposal || !latestImpl) && (
                    <p className="text-xs text-muted-foreground mt-1">需要方案+实施结果</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Run history timeline */}
          <Card>
            <CardHeader><CardTitle className="text-base">运行历史</CardTitle></CardHeader>
            <CardContent>
              {(runs.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无运行记录</p>
              ) : (
                <div className="space-y-2">
                  {(runs.data ?? []).map((run) => (
                    <div key={run.id} className="flex items-center gap-3 p-2 border rounded text-sm">
                      <div className={`w-2 h-2 rounded-full ${run.status === "completed" ? "bg-green-500" : run.status === "failed" ? "bg-red-500" : "bg-yellow-500"}`} />
                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{run.runType}</span>
                      <span className="text-xs text-muted-foreground">{run.aiProvider}/{run.aiModel}</span>
                      {run.durationMs && <span className="text-xs text-muted-foreground ml-auto">{run.durationMs}ms</span>}
                      {run.tokenUsage && <span className="text-xs text-muted-foreground">{(run.tokenUsage as any).total_tokens} tokens</span>}
                      <Badge variant={run.status === "completed" ? "default" : "destructive"} className="text-xs">{run.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latest AI outputs */}
          {proposalMut.data && (
            <Card>
              <CardHeader><CardTitle className="text-base">最新方案 (Gemini)</CardTitle></CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-60 border">
                  {JSON.stringify(proposalMut.data.proposal, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {reviewMut.data && (
            <Card>
              <CardHeader><CardTitle className="text-base">红队审查结果 (GPT)</CardTitle></CardHeader>
              <CardContent>
                <div className={`p-3 rounded border mb-3 ${reviewMut.data.review.overallVerdict === "pass" ? "bg-green-50 border-green-200" : reviewMut.data.review.overallVerdict === "fail" ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"}`}>
                  <span className="font-medium text-sm">裁决: {reviewMut.data.review.overallVerdict}</span>
                </div>
                <div className="space-y-1">
                  {reviewMut.data.review.criteria.map((c) => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      {c.passed ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                      <span className="font-mono">{c.name}</span>
                      <span className="text-muted-foreground ml-auto">{c.comment}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Tab 9: Release Gates ──────────────────────────────────

function ReleaseGatesTab() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const scenarios = trpc.goLive.scenario.list.useQuery();
  const gateProgress = trpc.goLive.gate.getProgress.useQuery(
    { scenarioId: selectedScenarioId! },
    { enabled: !!selectedScenarioId },
  );
  const initMut = trpc.goLive.gate.initGates.useMutation({ onSuccess: () => gateProgress.refetch() });
  const reviewMut = trpc.goLive.gate.review.useMutation({ onSuccess: () => gateProgress.refetch() });
  const overrideMut = trpc.goLive.gate.override.useMutation({ onSuccess: () => gateProgress.refetch() });

  const [reviewingGateId, setReviewingGateId] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  const gateLabels: Record<string, string> = {
    proposal_review: "方案审查",
    red_team: "红队审查",
    preflight: "预检",
    canary: "灰度发布",
    full_deploy: "全量上线",
  };

  const gateStatusColor: Record<string, string> = {
    pending: "border-gray-300 bg-gray-50",
    in_progress: "border-blue-400 bg-blue-50",
    passed: "border-green-400 bg-green-50",
    failed: "border-red-400 bg-red-50",
    skipped: "border-gray-300 bg-gray-50",
    overridden: "border-orange-400 bg-orange-50",
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">上线关卡 Release Gates</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 items-center">
            <select
              className="flex-1 p-2 border rounded text-sm"
              value={selectedScenarioId ?? ""}
              onChange={(e) => setSelectedScenarioId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">-- 选择场景 --</option>
              {(scenarios.data ?? []).filter((s) => s.status !== "archived").map((s) => (
                <option key={s.id} value={s.id}>[{s.priority}] {s.title}</option>
              ))}
            </select>
            {selectedScenarioId && (!gateProgress.data || gateProgress.data.gates.length === 0) && (
              <Button size="sm" onClick={() => initMut.mutate({ scenarioId: selectedScenarioId })} disabled={initMut.isPending}>
                <Plus className="h-3.5 w-3.5 mr-1" /> 初始化关卡
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5-gate horizontal stepper */}
      {gateProgress.data && gateProgress.data.gates.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            {/* Summary */}
            <div className="flex items-center gap-4 mb-6 text-sm">
              <span>通过: <span className="font-bold text-green-600">{gateProgress.data.summary.passed}</span>/{gateProgress.data.summary.total}</span>
              {gateProgress.data.summary.failed > 0 && <span className="text-red-600 font-medium">失败: {gateProgress.data.summary.failed}</span>}
              {gateProgress.data.readyForDeploy && (
                <Badge className="bg-green-600">可部署</Badge>
              )}
              {gateProgress.data.currentGate && (
                <span className="text-muted-foreground">当前: {gateLabels[gateProgress.data.currentGate] || gateProgress.data.currentGate}</span>
              )}
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {gateProgress.data.gates.map((gate, i) => (
                <div key={gate.id} className="flex items-center">
                  <div
                    className={`border-2 rounded-lg p-3 min-w-[140px] text-center cursor-pointer transition-colors ${gateStatusColor[gate.status]}`}
                    onClick={() => {
                      if (gate.status === "pending" || gate.status === "in_progress") {
                        setReviewingGateId(gate.id);
                      }
                    }}
                  >
                    <div className="text-xs font-medium mb-1">Gate {gate.gateOrder}</div>
                    <div className="text-sm font-bold">{gateLabels[gate.gateType] || gate.gateType}</div>
                    <div className="mt-1">
                      {gate.status === "passed" && <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />}
                      {gate.status === "failed" && <XCircle className="h-5 w-5 text-red-600 mx-auto" />}
                      {gate.status === "overridden" && <ShieldCheck className="h-5 w-5 text-orange-600 mx-auto" />}
                      {(gate.status === "pending" || gate.status === "in_progress") && <Clock className="h-5 w-5 text-gray-400 mx-auto" />}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{gate.status}</div>
                  </div>
                  {i < gateProgress.data!.gates.length - 1 && <ArrowRight className="h-4 w-4 text-gray-300 mx-1 flex-shrink-0" />}
                </div>
              ))}
            </div>

            {/* Review form */}
            {reviewingGateId && (
              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-medium mb-2">审查关卡</h4>
                <textarea
                  className="w-full p-2 border rounded text-sm h-20"
                  placeholder="审查意见..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => { reviewMut.mutate({ gateId: reviewingGateId, status: "passed", comment: reviewComment }); setReviewingGateId(null); setReviewComment(""); }}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> 通过
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { reviewMut.mutate({ gateId: reviewingGateId, status: "failed", comment: reviewComment }); setReviewingGateId(null); setReviewComment(""); }}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> 拒绝
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { overrideMut.mutate({ gateId: reviewingGateId, comment: reviewComment || "CEO override" }); setReviewingGateId(null); setReviewComment(""); }}>
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" /> CEO Override
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setReviewingGateId(null); setReviewComment(""); }}>
                    取消
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Tab 10: Change Tasks ──────────────────────────────────

function ChangeTasksTab() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const scenarios = trpc.goLive.scenario.list.useQuery();
  const tasks = trpc.goLive.changeTask.list.useQuery(
    selectedScenarioId ? { scenarioId: selectedScenarioId } : undefined,
  );
  const updateStatusMut = trpc.goLive.changeTask.updateStatus.useMutation({ onSuccess: () => tasks.refetch() });
  const bulkMut = trpc.goLive.changeTask.bulkStatusUpdate.useMutation({ onSuccess: () => tasks.refetch() });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const statusColumns = ["ai_generated", "human_reviewed", "approved", "implementing", "verified", "deployed"] as const;
  const statusLabels: Record<string, string> = {
    draft: "草稿",
    ai_generated: "AI生成",
    human_reviewed: "人工审查",
    approved: "已批准",
    implementing: "实施中",
    verified: "已验证",
    deployed: "已部署",
    rolled_back: "已回滚",
  };

  const taskTypeIcons: Record<string, typeof FileCode2> = {
    code_change: FileCode2,
    api_change: Zap,
    schema_change: Database,
    config_change: Layers,
    test: CheckCircle,
    documentation: Info,
    rollback_step: RotateCcw,
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">变更任务 Change Tasks</CardTitle>
          <div className="flex gap-2 items-center">
            <select
              className="p-2 border rounded text-sm"
              value={selectedScenarioId ?? ""}
              onChange={(e) => setSelectedScenarioId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">全部场景</option>
              {(scenarios.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
            {selectedIds.length > 0 && (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => bulkMut.mutate({ ids: selectedIds, status: "approved" })}>
                  批量批准 ({selectedIds.length})
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>
                  取消选择
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Kanban by status */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statusColumns.map((col) => {
          const colTasks = (tasks.data ?? []).filter((t) => t.status === col);
          return (
            <div key={col}>
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <span>{statusLabels[col]}</span>
                <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {colTasks.map((task) => {
                  const TypeIcon = taskTypeIcons[task.taskType] || FileCode2;
                  return (
                    <div
                      key={task.id}
                      className={`p-2 border rounded text-xs cursor-pointer hover:shadow-sm transition-shadow ${selectedIds.includes(task.id) ? "ring-2 ring-blue-400" : ""}`}
                      onClick={() => toggleSelect(task.id)}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <TypeIcon className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="outline" className="text-[10px]">{task.priority}</Badge>
                      </div>
                      <p className="font-medium line-clamp-2">{task.title}</p>
                      {task.filePath && <p className="text-muted-foreground font-mono mt-1 truncate">{task.filePath}</p>}
                      <div className="flex gap-1 mt-2">
                        {col !== "deployed" && (
                          <button
                            className="text-blue-600 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextStatus = statusColumns[statusColumns.indexOf(col) + 1];
                              if (nextStatus) updateStatusMut.mutate({ id: task.id, status: nextStatus });
                            }}
                          >
                            推进 →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task count summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 text-xs">
            <span>总计: <span className="font-bold">{(tasks.data ?? []).length}</span></span>
            {Object.entries(statusLabels).map(([key, label]) => {
              const cnt = (tasks.data ?? []).filter((t) => t.status === key).length;
              if (cnt === 0) return null;
              return <span key={key}>{label}: <span className="font-bold">{cnt}</span></span>;
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 6: Architecture Overview ─────────────────────────

function ArchitectureTab() {
  const ctoHealth = trpc.ctoDashboard.systemHealth.useQuery(undefined, { retry: false });
  const ceoHealth = trpc.ceoDashboard.getHealthScores.useQuery(undefined, { retry: false });

  const systemStats = [
    { label: "Routers", value: "275", icon: Database },
    { label: "DB Tables", value: "780+", icon: Layers },
    { label: "Pages", value: "414", icon: BarChart3 },
    { label: "Tests", value: "12,900+", icon: CheckCircle },
  ];

  const domainCoverage = [
    { domain: "项目管理", coverage: 95 },
    { domain: "生产制造", coverage: 90 },
    { domain: "质量体系", coverage: 88 },
    { domain: "人力资源", coverage: 92 },
    { domain: "销售CRM", coverage: 85 },
    { domain: "供应链", coverage: 82 },
    { domain: "财务", coverage: 78 },
    { domain: "AI/ML", coverage: 88 },
    { domain: "客户服务", coverage: 80 },
    { domain: "系统管理", coverage: 95 },
  ];

  return (
    <div className="space-y-4">
      {/* System stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {systemStats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="pt-6 flex items-center gap-3">
                <Icon className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Domain coverage */}
      <Card>
        <CardHeader><CardTitle className="text-base">业务域覆盖矩阵</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {domainCoverage.map((d) => (
              <div key={d.domain} className="flex items-center gap-3">
                <span className="w-20 text-sm">{d.domain}</span>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${d.coverage >= 90 ? "bg-green-400" : d.coverage >= 80 ? "bg-blue-400" : "bg-yellow-400"}`} style={{ width: `${d.coverage}%` }} />
                </div>
                <span className="w-10 text-sm text-right font-medium">{d.coverage}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Health cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">CEO Health</CardTitle></CardHeader>
          <CardContent>
            {ceoHealth.data ? (
              <div className="space-y-1 text-sm">
                <p>OEE: <span className="font-bold">{ceoHealth.data.avgOee?.toFixed(1) ?? 0}%</span></p>
                <p>Open FMEA: <span className="font-bold">{ceoHealth.data.openFmeaCount ?? 0}</span></p>
                <p>Budget Variance: <span className="font-bold">{ceoHealth.data.budgetVariancePercent?.toFixed(1) ?? 0}%</span></p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">CTO Health</CardTitle></CardHeader>
          <CardContent>
            {ctoHealth.data ? (
              <div className="space-y-1 text-sm">
                <p>CPU: <span className="font-bold">{ctoHealth.data.cpu?.toFixed(0) ?? 0}%</span></p>
                <p>Memory: <span className="font-bold">{ctoHealth.data.memory?.toFixed(0) ?? 0}%</span></p>
                <p>Uptime: <span className="font-bold">{ctoHealth.data.uptime ?? "N/A"}</span></p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
