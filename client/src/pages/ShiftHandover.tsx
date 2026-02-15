/**
 * 数字化交接班 (Digital Shift Handover)
 * Phase 21 P0: US-004 — 结构化表单 · AI风险分析 · 任务接续
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  RefreshCw, Loader2, Sparkles, AlertTriangle, CheckCircle, Shield, Clock,
} from "lucide-react";

const SHIFTS = [
  { value: "白班 (8:00-17:00)", label: "白班 (8:00-17:00)" },
  { value: "夜班 (17:00-次日8:00)", label: "夜班 (17:00-次日8:00)" },
  { value: "早班 (6:00-14:00)", label: "早班 (6:00-14:00)" },
  { value: "中班 (14:00-22:00)", label: "中班 (14:00-22:00)" },
  { value: "晚班 (22:00-次日6:00)", label: "晚班 (22:00-次日6:00)" },
];

interface HandoverResult {
  riskLevel: string;
  riskItems: Array<{ item: string; severity: string; description: string; suggestedAction: string }>;
  keyAttentionPoints: string[];
  continuityCheck: Array<{ task: string; status: string; handoverNote: string }>;
  safetyReminders: string[];
  equipmentStatusSummary: string;
  recommendations: string[];
}

export default function ShiftHandover() {
  const [currentShift, setCurrentShift] = useState("白班 (8:00-17:00)");
  const [nextShift, setNextShift] = useState("夜班 (17:00-次日8:00)");
  const [handoverPerson, setHandoverPerson] = useState("");
  const [productionOutput, setProductionOutput] = useState("");
  const [equipmentStatus, setEquipmentStatus] = useState("");
  const [qualityIssues, setQualityIssues] = useState("");
  const [abnormalEvents, setAbnormalEvents] = useState("");
  const [pendingTasks, setPendingTasks] = useState("");
  const [safetyNotes, setSafetyNotes] = useState("");
  const [materialStatus, setMaterialStatus] = useState("");
  const [result, setResult] = useState<HandoverResult | null>(null);

  const mutation = trpc.shiftHandover.analyze.useMutation({
    onSuccess: (data) => setResult(data as HandoverResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!handoverPerson.trim() || !productionOutput.trim() || !equipmentStatus.trim() || !pendingTasks.trim() || mutation.isPending) return;
    mutation.mutate({
      currentShift, nextShift, handoverPerson, productionOutput, equipmentStatus,
      qualityIssues: qualityIssues || undefined,
      abnormalEvents: abnormalEvents || undefined,
      pendingTasks,
      safetyNotes: safetyNotes || undefined,
      materialStatus: materialStatus || undefined,
    });
  };

  const riskLevelColor = (level: string) => {
    switch (level) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };
  const riskLevelLabel = (l: string) => {
    switch (l) { case "high": return "高风险"; case "medium": return "中风险"; case "low": return "低风险"; default: return l; }
  };
  const severityColor = (s: string) => {
    switch (s) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };
  const taskStatusColor = (s: string) => {
    switch (s) {
      case "completed": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "in_progress": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "pending": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "blocked": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };
  const taskStatusLabel = (s: string) => {
    switch (s) { case "completed": return "已完成"; case "in_progress": return "进行中"; case "pending": return "待处理"; case "blocked": return "阻塞"; default: return s; }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={RefreshCw}
          title="数字化交接班"
          description="结构化交接 · AI风险分析 · 任务接续追溯"
          actions={<Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" />AI分析</Badge>}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><RefreshCw className="h-5 w-5 text-primary" />交接班信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">当前班次</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={currentShift} onChange={(e) => setCurrentShift(e.target.value)}>
                  {SHIFTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">交接班次</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={nextShift} onChange={(e) => setNextShift(e.target.value)}>
                  {SHIFTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">交接人</label>
                <Input placeholder="如: 张工" value={handoverPerson} onChange={(e) => setHandoverPerson(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">生产完成情况</label>
                <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder="如: 计划生产5台，实际完成4台，第5台清洗工序进行中" value={productionOutput} onChange={(e) => setProductionOutput(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">设备状态</label>
                <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder="如: 1#碳氢清洗机正常运行，2#超声波清洗机温度偏高" value={equipmentStatus} onChange={(e) => setEquipmentStatus(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">待办/未完成任务</label>
              <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder="如: 1. 第5台清洗需继续 2. 明日有客户验收需准备" value={pendingTasks} onChange={(e) => setPendingTasks(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">质量问题（可选）</label>
                <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder="如: 第3台清洁度检测边界值，已返工" value={qualityIssues} onChange={(e) => setQualityIssues(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">异常事件（可选）</label>
                <textarea className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]" placeholder="如: 14:30 2#设备报高温告警，已降速运行" value={abnormalEvents} onChange={(e) => setAbnormalEvents(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">安全事项（可选）</label>
                <Input placeholder="如: 碳氢溶剂储罐液位正常，通风系统正常" value={safetyNotes} onChange={(e) => setSafetyNotes(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">物料状态（可选）</label>
                <Input placeholder="如: 碳氢溶剂余量约60%，密封件库存紧张" value={materialStatus} onChange={(e) => setMaterialStatus(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!handoverPerson.trim() || !productionOutput.trim() || !equipmentStatus.trim() || !pendingTasks.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI分析交接
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">交接班风险等级</p>
                    <Badge className={`text-xl px-4 py-2 mt-1 ${riskLevelColor(result.riskLevel)}`}>{riskLevelLabel(result.riskLevel)}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">设备状态摘要</p>
                    <p className="text-sm mt-1">{result.equipmentStatusSummary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {result.riskItems.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-5 w-5 text-yellow-400" />风险项 ({result.riskItems.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.riskItems.map((r, i) => (
                      <div key={i} className="p-3 rounded bg-muted/50 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{r.item}</span>
                          <Badge className={severityColor(r.severity)}>{r.severity === "high" ? "高" : r.severity === "medium" ? "中" : "低"}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{r.description}</p>
                        <p className="text-sm text-primary">建议: {r.suggestedAction}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {result.continuityCheck.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="h-5 w-5 text-blue-400" />任务接续检查</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left py-2 text-muted-foreground">任务</th><th className="text-center py-2 text-muted-foreground">状态</th><th className="text-left py-2 text-muted-foreground">交接说明</th></tr></thead>
                    <tbody>
                      {result.continuityCheck.map((t, i) => (
                        <tr key={i} className="border-b border-muted/50">
                          <td className="py-2 font-medium">{t.task}</td>
                          <td className="py-2 text-center"><Badge className={taskStatusColor(t.status)}>{taskStatusLabel(t.status)}</Badge></td>
                          <td className="py-2 text-muted-foreground">{t.handoverNote}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {result.safetyReminders.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Shield className="h-5 w-5 text-red-400" />安全提醒</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">{result.safetyReminders.map((s, i) => (<li key={i} className="flex items-start gap-2 text-sm"><Shield className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" /><span>{s}</span></li>))}</ul>
                </CardContent>
              </Card>
            )}

            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle className="h-5 w-5 text-primary" />AI建议</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">{result.recommendations.map((r, i) => (<li key={i} className="flex items-start gap-2 text-sm"><span className="text-primary font-medium flex-shrink-0">{i + 1}.</span><span>{r}</span></li>))}</ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
