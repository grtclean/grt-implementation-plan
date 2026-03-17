/**
 * 绩效校准仪表板 — Performance Calibration Dashboard
 *
 * 6 tabs:
 *  1. 总览 — Overview (score gauge, grade distribution, dept comparison)
 *  2. 综合评分 — Composite Scores (DataTable + inline override + export)
 *  3. 校准会议 — Calibration Sessions (create, 9-box, before/after, adjustments)
 *  4. 强制分布 — Forced Distribution (bell curve config, violations)
 *  5. 360度反馈 — 360° Feedback (send requests, aggregated radar)
 *  6. AI建议 — AI Recommendations (anomaly-based adjustment suggestions)
 */

import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "../lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Target, BarChart3, Users, Bell, Brain, Settings,
  Download, Plus, CheckCircle2, AlertTriangle, RefreshCw,
  ChevronDown, ChevronUp, Lock, Unlock, Edit3, Undo2,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

// ── Period selector helper ───────────────────────────────
function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ── Grade badge colors ───────────────────────────────────
const GRADE_COLORS: Record<string, string> = {
  S: "bg-purple-100 text-purple-800 border-purple-300",
  A: "bg-green-100 text-green-800 border-green-300",
  B: "bg-blue-100 text-blue-800 border-blue-300",
  C: "bg-yellow-100 text-yellow-800 border-yellow-300",
  D: "bg-red-100 text-red-800 border-red-300",
};

function GradeBadge({ grade }: { grade: string | null }) {
  const g = grade ?? "B";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${GRADE_COLORS[g] ?? GRADE_COLORS.B}`}>
      {g}
    </span>
  );
}

// ── Tab 1: Overview ──────────────────────────────────────

function OverviewTab({ period }: { period: string }) {
  const distribution = trpc.perfCalibration.compositeScore.getDistribution.useQuery({ period });
  const cockpit = trpc.perfCalibration.dashboard.ceoCockpit.useQuery({ period });

  const distData = distribution.data ?? [];
  const total = distData.reduce((s: any, d: any) => s + d.count, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-sm text-muted-foreground">已评估人数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {cockpit.data?.overrideCount ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">手动调整次数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {cockpit.data?.activeSessions?.length ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">进行中会议</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {distData.find((d: any) => d.grade === "S")?.count ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">卓越(S)人数</div>
          </CardContent>
        </Card>
      </div>

      {/* Grade Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> 等级分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {["S", "A", "B", "C", "D"].map((g) => {
              const cnt = distData.find((d: any) => d.grade === g)?.count ?? 0;
              const pct = total > 0 ? (cnt / total) * 100 : 0;
              return (
                <div key={g} className="flex-1 flex flex-col items-center">
                  <div className="text-xs font-medium mb-1">{cnt}</div>
                  <div
                    className={`w-full rounded-t ${GRADE_COLORS[g]?.split(" ")[0] ?? "bg-gray-200"}`}
                    style={{ height: `${Math.max(4, pct * 1.2)}%` }}
                  />
                  <div className="text-xs mt-1 font-bold">{g}</div>
                  <div className="text-xs text-muted-foreground">{pct.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Department Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> 部门对比
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">部门</th>
                  <th className="text-right py-2">人数</th>
                  <th className="text-right py-2">平均分</th>
                  <th className="text-right py-2">优秀人数</th>
                </tr>
              </thead>
              <tbody>
                {(cockpit.data?.departments ?? []).map((d: any, i: any) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2">{d.department}</td>
                    <td className="text-right">{d.headcount}</td>
                    <td className="text-right font-medium">{d.avgScore}</td>
                    <td className="text-right">{d.topPerformers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 2: Composite Scores ──────────────────────────────

function CompositeScoresTab({ period }: { period: string }) {
  const [dept, setDept] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editGrade, setEditGrade] = useState("");
  const [editScore, setEditScore] = useState("");
  const [editReason, setEditReason] = useState("");

  const scores = trpc.perfCalibration.compositeScore.listByDepartment.useQuery(
    { department: dept || "研发部", period, limit: 100 },
    { enabled: !!period },
  );

  const calculateBatch = trpc.perfCalibration.compositeScore.calculateBatch.useMutation();
  const override = trpc.perfCalibration.manualOverride.override.useMutation();

  const handleOverride = async (id: number) => {
    if (!editReason || editReason.length < 5) return;
    try {
      await override.mutateAsync({
        compositeScoreId: id,
        newScore: editScore,
        newGrade: editGrade,
        justification: editReason,
      });
      setEditId(null);
      scores.refetch();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          className="border rounded px-3 py-1.5 text-sm"
          placeholder="部门名称"
          value={dept}
          onChange={(e) => setDept(e.target.value)}
        />
        <Button
          size="sm"
          onClick={() => calculateBatch.mutateAsync({ period, department: dept || undefined }).then(() => scores.refetch())}
          disabled={calculateBatch.isPending}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          {calculateBatch.isPending ? "计算中..." : "批量计算"}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left py-2 px-2">员工</th>
              <th className="text-left py-2 px-2">部门</th>
              <th className="text-right py-2 px-2">AI评分</th>
              <th className="text-center py-2 px-2">AI等级</th>
              <th className="text-right py-2 px-2">最终评分</th>
              <th className="text-center py-2 px-2">最终等级</th>
              <th className="text-center py-2 px-2">状态</th>
              <th className="text-center py-2 px-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {(scores.data ?? []).map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="py-2 px-2 font-medium">{s.employeeName ?? `#${s.employeeId}`}</td>
                <td className="py-2 px-2">{s.department}</td>
                <td className="text-right py-2 px-2">{s.aiCompositeScore}</td>
                <td className="text-center py-2 px-2"><GradeBadge grade={s.aiGrade} /></td>
                <td className="text-right py-2 px-2 font-bold">{s.finalScore}</td>
                <td className="text-center py-2 px-2"><GradeBadge grade={s.finalGrade} /></td>
                <td className="text-center py-2 px-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    s.status === "finalized" ? "bg-green-100 text-green-700" :
                    s.status === "locked" ? "bg-gray-100 text-gray-700" :
                    s.status === "calibrated" ? "bg-blue-100 text-blue-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {s.status}
                  </span>
                </td>
                <td className="text-center py-2 px-2">
                  {s.status !== "locked" && (
                    editId === s.id ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-1">
                          <select className="border rounded px-1 py-0.5 text-xs" value={editGrade} onChange={(e) => setEditGrade(e.target.value)}>
                            {["S", "A", "B", "C", "D"].map((g) => <option key={g} value={g}>{g}</option>)}
                          </select>
                          <input className="border rounded px-1 py-0.5 text-xs w-16" value={editScore} onChange={(e) => setEditScore(e.target.value)} />
                        </div>
                        <input className="border rounded px-1 py-0.5 text-xs" placeholder="调整原因(≥5字)" value={editReason} onChange={(e) => setEditReason(e.target.value)} />
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleOverride(s.id)}>确认</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditId(null)}>取消</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-6" onClick={() => { setEditId(s.id); setEditGrade(s.finalGrade ?? "B"); setEditScore(String(s.finalScore ?? "70")); setEditReason(""); }}>
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(scores.data ?? []).length === 0 && (
          <div className="text-center text-muted-foreground py-8">暂无评分数据，请先执行批量计算</div>
        )}
      </div>
    </div>
  );
}

// ── Tab 3: Calibration Sessions ──────────────────────────

function CalibrationSessionsTab({ period }: { period: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("company");

  const sessions = trpc.perfCalibration.calibration.listSessions.useQuery({ period });
  const createSession = trpc.perfCalibration.calibration.createSession.useMutation();
  const startSession = trpc.perfCalibration.calibration.startSession.useMutation();
  const completeSession = trpc.perfCalibration.calibration.completeSession.useMutation();
  const lockSession = trpc.perfCalibration.calibration.lockSession.useMutation();

  const handleCreate = async () => {
    if (!title) return;
    try {
      await createSession.mutateAsync({ title, scope, period });
      setShowCreate(false);
      setTitle("");
      sessions.refetch();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> 创建会议
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-2">
              <input className="border rounded px-3 py-1.5 text-sm flex-1" placeholder="会议标题" value={title} onChange={(e) => setTitle(e.target.value)} />
              <select className="border rounded px-3 py-1.5 text-sm" value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="company">全公司</option>
                <option value="研发部">研发部</option>
                <option value="生产部">生产部</option>
                <option value="销售部">销售部</option>
                <option value="人力资源部">人力资源部</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={createSession.isPending}>确认创建</Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {(sessions.data ?? []).map((s) => (
          <Card key={s.id}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-sm text-muted-foreground">范围: {s.scope} | 周期: {s.period}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    s.status === "locked" ? "bg-gray-200" :
                    s.status === "completed" ? "bg-green-100 text-green-700" :
                    s.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {s.status}
                  </span>
                  {s.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => startSession.mutateAsync({ id: s.id }).then(() => sessions.refetch())}>
                      开始
                    </Button>
                  )}
                  {s.status === "in_progress" && (
                    <Button size="sm" variant="outline" onClick={() => completeSession.mutateAsync({ id: s.id }).then(() => sessions.refetch())}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> 完成
                    </Button>
                  )}
                  {s.status === "completed" && (
                    <Button size="sm" variant="outline" onClick={() => lockSession.mutateAsync({ id: s.id }).then(() => sessions.refetch())}>
                      <Lock className="h-3 w-3 mr-1" /> 锁定
                    </Button>
                  )}
                </div>
              </div>
              {!!s.distributionSnapshot && (
                <div className="mt-3 text-xs text-muted-foreground">
                  起始分布: {JSON.stringify(s.distributionSnapshot)}
                </div>
              )}
              {!!s.finalDistribution && (
                <div className="mt-1 text-xs text-muted-foreground">
                  最终分布: {JSON.stringify(s.finalDistribution)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {(sessions.data ?? []).length === 0 && (
          <div className="text-center text-muted-foreground py-8">暂无校准会议</div>
        )}
      </div>
    </div>
  );
}

// ── Tab 4: Forced Distribution ───────────────────────────

function ForcedDistributionTab({ period }: { period: string }) {
  const configs = trpc.perfCalibration.forcedDistribution.getConfig.useQuery();
  const violations = trpc.perfCalibration.forcedDistribution.listViolations.useQuery({ period });
  const distCheck = trpc.perfCalibration.compositeScore.checkDistribution.useQuery({ department: null, period });

  return (
    <div className="space-y-6">
      {/* Current config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" /> 强制分布配置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">范围</th>
                  <th className="text-right py-2">S%</th>
                  <th className="text-right py-2">A%</th>
                  <th className="text-right py-2">B%</th>
                  <th className="text-right py-2">C%</th>
                  <th className="text-right py-2">D%</th>
                  <th className="text-center py-2">强制</th>
                </tr>
              </thead>
              <tbody>
                {(configs.data ?? []).map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="py-2">{c.department ?? c.buCode ?? "公司默认"}</td>
                    <td className="text-right">{c.gradeSMaxPct}</td>
                    <td className="text-right">{c.gradeAMaxPct}</td>
                    <td className="text-right">{c.gradeBMaxPct}</td>
                    <td className="text-right">{c.gradeCMaxPct}</td>
                    <td className="text-right">{c.gradeDMaxPct}</td>
                    <td className="text-center">{c.isStrict ? "严格" : "建议"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Current distribution vs target */}
      {distCheck.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> 当前分布 vs 目标
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3">
              {["S", "A", "B", "C", "D"].map((g) => {
                const d = distCheck.data.distribution[g];
                if (!d) return null;
                return (
                  <div key={g} className={`text-center p-3 rounded border ${d.violation ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
                    <div className="text-lg font-bold">{g}</div>
                    <div className="text-sm">实际: {d.actualPct}%</div>
                    <div className="text-xs text-muted-foreground">上限: {d.maxPct}%</div>
                    <div className="text-xs mt-1">{d.count} 人</div>
                    {d.violation && <AlertTriangle className="h-3 w-3 text-red-500 mx-auto mt-1" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Violations by department */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> 部门违规列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(violations.data ?? []).length === 0 ? (
            <div className="text-center text-muted-foreground py-4">无违规部门</div>
          ) : (
            <div className="space-y-2">
              {(violations.data ?? []).map((v, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <span className="font-medium">{v.department}</span>
                  <span className="text-xs text-red-600">
                    {Object.entries(v.distribution as Record<string, any>)
                      .filter(([, d]) => d.violation)
                      .map(([g, d]) => `${g}: ${d.actualPct}%>${d.maxPct}%`)
                      .join(", ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 5: 360° Feedback ─────────────────────────────────

function Feedback360Tab({ period }: { period: string }) {
  const [targetId, setTargetId] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [relationship, setRelationship] = useState("peer");

  const feedbackList = trpc.perfCalibration.feedback360.listByPeriod.useQuery({ period });
  const requestFeedback = trpc.perfCalibration.feedback360.requestFeedback.useMutation();

  const handleRequest = async () => {
    if (!targetId || !reviewerId) return;
    try {
      await requestFeedback.mutateAsync({
        targetEmployeeId: Number(targetId),
        reviewerEmployeeId: Number(reviewerId),
        relationship: relationship as any,
        period,
      });
      setTargetId("");
      setReviewerId("");
      feedbackList.refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const submitted = (feedbackList.data ?? []).filter((f) => f.status === "submitted").length;
  const pending = (feedbackList.data ?? []).filter((f) => f.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-xl font-bold">{feedbackList.data?.length ?? 0}</div><div className="text-xs text-muted-foreground">总请求数</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xl font-bold text-green-600">{submitted}</div><div className="text-xs text-muted-foreground">已提交</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xl font-bold text-yellow-600">{pending}</div><div className="text-xs text-muted-foreground">待反馈</div></CardContent></Card>
      </div>

      {/* Request form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">发起反馈请求</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <input className="border rounded px-3 py-1.5 text-sm w-32" placeholder="被评员工ID" value={targetId} onChange={(e) => setTargetId(e.target.value)} />
            <input className="border rounded px-3 py-1.5 text-sm w-32" placeholder="评审人ID" value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} />
            <select className="border rounded px-3 py-1.5 text-sm" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
              <option value="self">自评</option>
              <option value="manager">上级</option>
              <option value="peer">同级</option>
              <option value="subordinate">下级</option>
              <option value="cross_functional">跨部门</option>
            </select>
            <Button size="sm" onClick={handleRequest} disabled={requestFeedback.isPending}>
              <Plus className="h-3.5 w-3.5 mr-1" /> 发送请求
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent feedback list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">反馈记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">被评人</th>
                  <th className="text-left py-2">评审人</th>
                  <th className="text-center py-2">关系</th>
                  <th className="text-right py-2">评分</th>
                  <th className="text-center py-2">状态</th>
                </tr>
              </thead>
              <tbody>
                {(feedbackList.data ?? []).slice(0, 30).map((f) => (
                  <tr key={f.id} className="border-b last:border-0">
                    <td className="py-2">{f.targetEmployeeName ?? `#${f.targetEmployeeId}`}</td>
                    <td className="py-2">{f.isAnonymous ? "匿名" : (f.reviewerName ?? `#${f.reviewerEmployeeId}`)}</td>
                    <td className="text-center">{f.relationship}</td>
                    <td className="text-right">{f.overallScore ?? "-"}</td>
                    <td className="text-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${f.status === "submitted" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 6: AI Recommendations ────────────────────────────

function AIRecommendationsTab({ period }: { period: string }) {
  const recommendations = trpc.perfCalibration.dashboard.aiRecommendations.useQuery({ period });
  const override = trpc.perfCalibration.manualOverride.override.useMutation();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" /> AI智能建议
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(recommendations.data ?? []).length === 0 ? (
            <div className="text-center text-muted-foreground py-8">暂无异常建议</div>
          ) : (
            <div className="space-y-3">
              {(recommendations.data ?? []).map((r: any, i: any) => (
                <div key={i} className={`p-3 rounded border ${r.gap > 10 ? "border-orange-300 bg-orange-50" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{r.employeeName ?? `#${r.employeeId}`}</span>
                      <span className="text-xs text-muted-foreground ml-2">{r.department}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">AI: {r.aiScore}({r.aiGrade})</span>
                      <span className="text-xs">→</span>
                      <span className="text-xs font-bold">当前: {r.finalScore}({r.finalGrade})</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${r.gap > 10 ? "bg-red-100 text-red-700" : "bg-gray-100"}`}>
                        差距: {r.gap.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm mt-1 text-muted-foreground">{r.recommendation}</div>
                  {r.gap > 10 && (
                    <div className="mt-2 flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs"
                        onClick={() => override.mutateAsync({
                          compositeScoreId: r.id,
                          newScore: String(r.aiScore),
                          newGrade: r.aiGrade,
                          justification: `AI建议回归：${r.recommendation}`,
                        }).then(() => recommendations.refetch())}
                      >
                        采纳AI建议
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────

const TABS = [
  { key: "overview", label: "总览", icon: Target },
  { key: "scores", label: "综合评分", icon: BarChart3 },
  { key: "calibration", label: "校准会议", icon: Users },
  { key: "distribution", label: "强制分布", icon: Bell },
  { key: "feedback360", label: "360度反馈", icon: Users },
  { key: "aiSuggestions", label: "AI建议", icon: Brain },
] as const;

export default function PerfCalibrationDashboard() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [period, setPeriod] = useState(getCurrentPeriod());
  const { t } = useLanguage();

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">绩效校准仪表板</h1>
          <p className="text-sm text-muted-foreground">智能绩效综合评分 · 校准会议 · 强制分布 · 360度反馈</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">周期:</label>
          <input
            type="month"
            className="border rounded px-3 py-1.5 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b pb-px scrollbar-hide">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap rounded-t transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-primary text-primary bg-muted/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab period={period} />}
      {activeTab === "scores" && <CompositeScoresTab period={period} />}
      {activeTab === "calibration" && <CalibrationSessionsTab period={period} />}
      {activeTab === "distribution" && <ForcedDistributionTab period={period} />}
      {activeTab === "feedback360" && <Feedback360Tab period={period} />}
      {activeTab === "aiSuggestions" && <AIRecommendationsTab period={period} />}
    </div>
  );
}
