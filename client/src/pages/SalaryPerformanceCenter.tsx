/**
 * 薪资绩效自动核算中心
 *
 * ① 月度核算 — 自动计算绩效系数+薪资影响
 * ② 邮件赋能 — 预览+审批+发送绩效邮件
 * ③ 规则管理 — 查看/更新薪资备注规则
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calculator, Mail, FileText, CheckCircle2, AlertTriangle,
  Send, Eye, Users, Calendar, Shield, Clock,
} from "lucide-react";

export default function SalaryPerformanceCenter() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [tab, setTab] = useState("compute");

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold">{isZh ? "薪资绩效核算中心" : "Salary Performance Center"}</h1>
        <p className="text-sm text-muted-foreground">{isZh ? "月度自动核算 · 赋能邮件 · 规则管理" : "Monthly auto-compute · Empowerment emails · Rules"}</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="compute" className="gap-1"><Calculator className="w-4 h-4" />{isZh ? "月度核算" : "Compute"}</TabsTrigger>
          <TabsTrigger value="email" className="gap-1"><Mail className="w-4 h-4" />{isZh ? "邮件赋能" : "Emails"}</TabsTrigger>
          <TabsTrigger value="rules" className="gap-1"><FileText className="w-4 h-4" />{isZh ? "薪资规则" : "Rules"}</TabsTrigger>
        </TabsList>

        <TabsContent value="compute"><ComputeTab /></TabsContent>
        <TabsContent value="email"><EmailTab /></TabsContent>
        <TabsContent value="rules"><RulesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ComputeTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });

  const computeQ = trpc.salaryAutomation.compute.computeMonthly.useQuery({ month }, { retry: false, enabled: !!month });
  const data = computeQ.data as any;
  const employees = (data?.employees as any[]) || [];

  const tierCounts = { A: 0, B: 0, C: 0, D: 0 };
  employees.forEach((e: any) => { tierCounts[e.tier as keyof typeof tierCounts]++; });

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-3">
        <Input type="month" className="w-48" value={month} onChange={(e) => setMonth(e.target.value)} />
        <Badge variant="outline">{employees.length}{isZh ? "人已核算" : " computed"}</Badge>
      </div>

      {/* 分布统计 */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { tier: "A", count: tierCounts.A, color: "green", label: isZh ? "优秀" : "Excellent" },
          { tier: "B", count: tierCounts.B, color: "blue", label: isZh ? "良好" : "Good" },
          { tier: "C", count: tierCounts.C, color: "amber", label: isZh ? "合格" : "Pass" },
          { tier: "D", count: tierCounts.D, color: "red", label: isZh ? "待改进" : "Improve" },
        ].map(t => (
          <div key={t.tier} className={`rounded-lg border p-3 text-center border-${t.color}-200 bg-${t.color}-50`}>
            <p className={`text-2xl font-bold text-${t.color}-700`}>{t.count}</p>
            <p className="text-[10px] text-muted-foreground">{t.tier} {t.label}</p>
          </div>
        ))}
      </div>

      {/* 员工列表 */}
      <div className="space-y-1">
        <div className="grid grid-cols-6 gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
          <span>{isZh ? "工号" : "ID"}</span>
          <span>{isZh ? "姓名" : "Name"}</span>
          <span className="text-center">{isZh ? "绩效分" : "Score"}</span>
          <span className="text-center">{isZh ? "系数1" : "Coeff1"}</span>
          <span className="text-center">{isZh ? "系数2" : "Coeff2"}</span>
          <span className="text-center">{isZh ? "档位" : "Tier"}</span>
        </div>
        {employees.slice(0, 50).map((emp: any, i: number) => (
          <div key={i} className="grid grid-cols-6 gap-2 px-3 py-2 text-sm border-b hover:bg-muted/30">
            <span className="font-mono text-xs">{emp.openId}</span>
            <span>{emp.name}</span>
            <span className={`text-center font-bold ${emp.perfScore >= 75 ? "text-green-600" : emp.perfScore >= 60 ? "text-amber-600" : "text-red-600"}`}>{emp.perfScore}</span>
            <span className="text-center font-mono">{emp.coefficients.perf1}</span>
            <span className="text-center font-mono">{emp.coefficients.perf2}</span>
            <span className="text-center"><Badge className={`text-[10px] ${emp.tier === "A" ? "bg-green-100 text-green-700" : emp.tier === "B" ? "bg-blue-100 text-blue-700" : emp.tier === "C" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{emp.tier}</Badge></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const [previewId, setPreviewId] = useState("");

  const batchQ = trpc.salaryAutomation.email.batchPreview.useQuery({ month }, { retry: false });
  const batch = batchQ.data as any;

  const previewQ = trpc.salaryAutomation.email.previewEmail.useQuery(
    { employeeId: Number(previewId), month },
    { enabled: !!previewId && Number(previewId) > 0, retry: false },
  );
  const preview = previewQ.data as any;

  return (
    <div className="mt-4 space-y-4">
      {/* 批量概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4" />{isZh ? "月度赋能邮件" : "Monthly Emails"}</CardTitle>
          <CardDescription>{isZh ? "自动生成绩效报告邮件，由倪微薇审核后发送" : "Auto-generated, approved by VP HR before sending"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/20 text-center">
              <Users className="w-5 h-5 mx-auto text-blue-600 mb-1" />
              <p className="font-bold text-blue-700">{batch?.totalEmployees || "—"}</p>
              <p className="text-[10px]">{isZh ? "待发送" : "To Send"}</p>
            </div>
            <div className="p-3 rounded bg-purple-50 dark:bg-purple-950/20 text-center">
              <Shield className="w-5 h-5 mx-auto text-purple-600 mb-1" />
              <p className="font-bold text-purple-700">{isZh ? "倪微薇审核" : "VP Approval"}</p>
              <p className="text-[10px]">camlllia@grtclean.ai</p>
            </div>
            <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/20 text-center">
              <Send className="w-5 h-5 mx-auto text-amber-600 mb-1" />
              <p className="font-bold text-amber-700">{isZh ? "CEO抄送" : "CEO CC"}</p>
              <p className="text-[10px]">gerry@grtclean.ai</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{isZh ? "审批流程: 系统生成 → 倪微薇审核确认 → 发送 / 转主管调整后由主管发送" : "Flow: Auto-generate → VP review → Send / delegate to manager"}</p>
        </CardContent>
      </Card>

      {/* 单人预览 */}
      <Card>
        <CardHeader><CardTitle className="text-base">{isZh ? "邮件预览" : "Email Preview"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input type="number" className="w-32" placeholder={isZh ? "员工ID" : "Emp ID"} value={previewId} onChange={(e) => setPreviewId(e.target.value)} />
            <Input type="month" className="w-40" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          {preview && (
            <div className="p-4 rounded border bg-white dark:bg-slate-900 space-y-2">
              <div className="text-xs text-muted-foreground">
                <p><strong>To:</strong> {preview.to}</p>
                <p><strong>CC:</strong> {preview.cc?.join(", ")}</p>
                <p><strong>Subject:</strong> {preview.subject}</p>
              </div>
              <pre className="text-xs whitespace-pre-wrap font-sans bg-muted/50 p-3 rounded max-h-64 overflow-y-auto">{preview.body}</pre>
              {preview.requiresApproval && (
                <div className="flex items-center gap-2 p-2 rounded bg-amber-50 border border-amber-200 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{isZh ? "需要" : "Requires"} {preview.approver} {isZh ? "审核后发送" : "approval"}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RulesTab() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const notesQ = trpc.salaryAutomation.notes.getSalaryNotes.useQuery(undefined, { retry: false });
  const data = notesQ.data as any;

  return (
    <div className="mt-4 space-y-4">
      <h3 className="text-sm font-semibold">{isZh ? "薪资计算规则（源自202602薪资稿V4备注）" : "Salary Rules (from V4 Excel notes)"}</h3>
      {(data?.rules || []).map((r: any, i: number) => (
        <Card key={i}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
              <span className="text-[10px] text-muted-foreground">{r.source}</span>
            </div>
            <p className="text-sm">{r.rule}</p>
          </CardContent>
        </Card>
      ))}

      <h3 className="text-sm font-semibold mt-6">{isZh ? "近期调薪记录" : "Recent Adjustments"}</h3>
      {(data?.adjustmentHistory || []).map((h: string, i: number) => (
        <div key={i} className="text-xs p-2 rounded border">{h}</div>
      ))}
    </div>
  );
}
