/**
 * 项目经理工作台 — M0-M12 全生命周期
 * 项目经理: M阶段门 · 风险/阻碍 · 团队容量 · 预算 · 客户沟通 · 变更
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FolderKanban, Target, AlertTriangle, Users, DollarSign, Clock,
  CheckCircle, ArrowRight, Shield, Calendar, MessageSquare, BarChart3,
  Milestone, TrendingUp, Zap, Eye, ChevronRight, XCircle
} from "lucide-react";

const MY_PROJECTS = [
  { code: "PRJ-2026-008", name: "博世华域-GRT-S3x3台", customer: "博世华域", phase: "M5", phaseLabel: "生产制造", progress: 45, budget: 840000, spent: 380000, days: 120, elapsed: 55, risk: "medium", team: 8 },
  { code: "PRJ-2026-012", name: "舍弗勒-齿轮轴清洗整线", customer: "舍弗勒(Schaeffler)", phase: "M3", phaseLabel: "机械设计", progress: 25, budget: 2800000, spent: 520000, days: 180, elapsed: 40, risk: "high", team: 12 },
  { code: "PRJ-2026-015", name: "大众VW-清洁度检测系统", customer: "大众汽车(中国)", phase: "M2", phaseLabel: "合同签约", progress: 10, budget: 650000, spent: 45000, days: 150, elapsed: 20, risk: "low", team: 5 },
];

const PHASE_GATES = ["M0 线索", "M1 方案", "M2 签约", "M3 机械", "M4 电气", "M5 生产", "M6 质检", "M7 出厂", "M8 安装", "M9 验收", "M10 保修", "M11 复盘", "M12 结项"];

const RISKS = [
  { project: "博世华域-GRT-S3", risk: "液压缸交期延迟2周(力士乐)", severity: "high", impact: "M5生产停滞", mitigation: "启用备选供应商(江苏恒立)", owner: "沈迎凤", status: "mitigating" },
  { project: "舍弗勒-齿轮轴整线", risk: "减速机选型变更导致主轴箱体重新设计", severity: "critical", impact: "M3延期3周+追加成本¥8万", mitigation: "ECO-2026-007紧急评审", owner: "洪香龙", status: "open" },
  { project: "博世华域-GRT-S3", risk: "清洗剂SC-100库存低于安全线", severity: "medium", impact: "调试阶段缺料", mitigation: "已下补货PO", owner: "仓库", status: "resolved" },
];

const TEAM_CAPACITY = [
  { name: "洪香龙", role: "机械主管", projects: 3, hours: 45, capacity: 40, status: "overloaded" },
  { name: "孙坚", role: "电气主管", projects: 2, hours: 38, capacity: 40, status: "normal" },
  { name: "沈迎凤", role: "采购工程师", projects: 4, hours: 42, capacity: 40, status: "overloaded" },
  { name: "金晓锋", role: "质量工程师", projects: 3, hours: 35, capacity: 40, status: "normal" },
  { name: "马林山", role: "生产主管", projects: 2, hours: 40, capacity: 40, status: "normal" },
  { name: "杨勇", role: "调试工程师", projects: 1, hours: 20, capacity: 40, status: "available" },
];

const PHASE_IDX: Record<string, number> = { M0: 0, M1: 1, M2: 2, M3: 3, M4: 4, M5: 5, M6: 6, M7: 7, M8: 8, M9: 9, M10: 10, M11: 11, M12: 12 };
const RISK_COLOR: Record<string, string> = { critical: "bg-red-600 text-white", high: "bg-orange-100 text-orange-700", medium: "bg-yellow-100 text-yellow-700", low: "bg-green-100 text-green-700" };
const STATUS_COLOR: Record<string, string> = { overloaded: "bg-red-100 text-red-700", normal: "bg-green-100 text-green-700", available: "bg-blue-100 text-blue-700" };

export default function ProjectManagerWorkstation() {
  const { language } = useLanguage();
  const [tab, setTab] = useState("projects");

  const openRisks = RISKS.filter(r => r.status !== "resolved").length;
  const overloaded = TEAM_CAPACITY.filter(t => t.status === "overloaded").length;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FolderKanban className="h-7 w-7 text-emerald-600" />{language === "zh" ? "项目经理工作台" : "Project Manager Workstation"}</h1>
          <p className="text-muted-foreground mt-1">{language === "zh" ? "M0-M12全生命周期 · 阶段门 · 风险 · 团队 · 预算 · 客户" : "M0-M12 Lifecycle · Gates · Risk · Team · Budget"}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: language === "zh" ? "活跃项目" : "Projects", value: MY_PROJECTS.length, icon: FolderKanban, color: "text-emerald-600" },
          { label: language === "zh" ? "开放风险" : "Open Risks", value: openRisks, icon: AlertTriangle, color: openRisks > 0 ? "text-red-600" : "text-green-600" },
          { label: language === "zh" ? "超负荷人员" : "Overloaded", value: overloaded, icon: Users, color: overloaded > 0 ? "text-orange-600" : "text-green-600" },
          { label: language === "zh" ? "总预算" : "Total Budget", value: `¥${(MY_PROJECTS.reduce((s, p) => s + p.budget, 0) / 10000).toFixed(0)}万`, icon: DollarSign, color: "text-blue-600" },
          { label: language === "zh" ? "平均进度" : "Avg Progress", value: `${Math.round(MY_PROJECTS.reduce((s, p) => s + p.progress, 0) / MY_PROJECTS.length)}%`, icon: TrendingUp, color: "text-purple-600" },
        ].map(kpi => (
          <Card key={kpi.label}><CardContent className="p-3 flex items-center gap-3"><kpi.icon className={`h-6 w-6 ${kpi.color} opacity-60`} /><div><p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p><p className="text-[10px] text-muted-foreground">{kpi.label}</p></div></CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="projects"><Milestone className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "项目总览" : "Projects"}</TabsTrigger>
          <TabsTrigger value="risks"><AlertTriangle className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "风险管理" : "Risks"} {openRisks > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">{openRisks}</Badge>}</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "团队容量" : "Team"}</TabsTrigger>
          <TabsTrigger value="budget"><DollarSign className="h-3.5 w-3.5 mr-1" />{language === "zh" ? "预算跟踪" : "Budget"}</TabsTrigger>
        </TabsList>

        {/* Projects with M-Gate Timeline */}
        <TabsContent value="projects" className="mt-4 space-y-4">
          {MY_PROJECTS.map(proj => {
            const phaseIdx = PHASE_IDX[proj.phase] || 0;
            const budgetPct = Math.round(proj.spent / proj.budget * 100);
            const schedulePct = Math.round(proj.elapsed / proj.days * 100);
            return (
              <Card key={proj.code} className={proj.risk === "critical" ? "border-l-4 border-l-red-500" : proj.risk === "high" ? "border-l-4 border-l-orange-500" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{proj.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{proj.code} · {proj.customer} · {proj.team}人</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={RISK_COLOR[proj.risk]}>{language === "zh" ? `风险:${proj.risk === "critical" ? "紧急" : proj.risk === "high" ? "高" : proj.risk === "medium" ? "中" : "低"}` : `Risk: ${proj.risk}`}</Badge>
                      <Badge className="bg-blue-100 text-blue-700 font-bold">{proj.phase} {proj.phaseLabel}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* M-Gate Timeline */}
                  <div className="flex items-center gap-0.5">
                    {PHASE_GATES.map((gate, i) => (
                      <div key={gate} className={`flex-1 h-6 flex items-center justify-center text-[9px] font-medium rounded-sm ${i < phaseIdx ? "bg-green-500 text-white" : i === phaseIdx ? "bg-blue-600 text-white ring-2 ring-blue-300" : "bg-gray-100 text-gray-400"}`}>
                        {gate.split(" ")[0]}
                      </div>
                    ))}
                  </div>
                  {/* Progress bars */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>{language === "zh" ? "总进度" : "Progress"}</span><span className="font-bold">{proj.progress}%</span></div>
                      <Progress value={proj.progress} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>{language === "zh" ? "工期" : "Schedule"}</span><span className={schedulePct > proj.progress + 10 ? "text-red-600 font-bold" : ""}>{proj.elapsed}/{proj.days}天</span></div>
                      <Progress value={schedulePct} className={`h-2 ${schedulePct > proj.progress + 10 ? "[&>div]:bg-red-500" : ""}`} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>{language === "zh" ? "预算" : "Budget"}</span><span className={budgetPct > proj.progress + 15 ? "text-orange-600 font-bold" : ""}>¥{(proj.spent / 10000).toFixed(1)}万/{(proj.budget / 10000).toFixed(0)}万</span></div>
                      <Progress value={budgetPct} className={`h-2 ${budgetPct > proj.progress + 15 ? "[&>div]:bg-orange-500" : ""}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Risks */}
        <TabsContent value="risks" className="mt-4 space-y-3">
          {RISKS.map((r, i) => (
            <Card key={i} className={r.severity === "critical" ? "border-l-4 border-l-red-500 bg-red-50" : r.severity === "high" ? "border-l-4 border-l-orange-500" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${RISK_COLOR[r.severity]}`}>{r.severity === "critical" ? "紧急" : r.severity === "high" ? "高" : "中"}</Badge>
                    <span className="font-medium text-sm">{r.risk}</span>
                  </div>
                  <Badge className={r.status === "open" ? "bg-red-100 text-red-700" : r.status === "mitigating" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}>{r.status === "open" ? "待处理" : r.status === "mitigating" ? "缓解中" : "已解决"}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div><p className="text-[10px] text-muted-foreground">{language === "zh" ? "项目" : "Project"}</p><p>{r.project}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">{language === "zh" ? "影响" : "Impact"}</p><p className="text-red-600">{r.impact}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">{language === "zh" ? "缓解措施" : "Mitigation"}</p><p>{r.mitigation}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">{language === "zh" ? "负责人" : "Owner"}</p><p>{r.owner}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Team Capacity */}
        <TabsContent value="team" className="mt-4">
          <Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>{language === "zh" ? "成员" : "Member"}</TableHead>
                <TableHead>{language === "zh" ? "角色" : "Role"}</TableHead>
                <TableHead className="text-right">{language === "zh" ? "项目数" : "Projects"}</TableHead>
                <TableHead>{language === "zh" ? "工时(h/w)" : "Hours/w"}</TableHead>
                <TableHead>{language === "zh" ? "负荷" : "Load"}</TableHead>
                <TableHead>{language === "zh" ? "状态" : "Status"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {TEAM_CAPACITY.map(t => (
                  <TableRow key={t.name} className={t.status === "overloaded" ? "bg-red-50" : ""}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-sm">{t.role}</TableCell>
                    <TableCell className="text-right">{t.projects}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={t.hours / t.capacity * 100} className={`w-16 h-2 ${t.hours > t.capacity ? "[&>div]:bg-red-500" : t.hours > t.capacity * 0.9 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}`} />
                        <span className={`text-sm ${t.hours > t.capacity ? "text-red-600 font-bold" : ""}`}>{t.hours}/{t.capacity}h</span>
                      </div>
                    </TableCell>
                    <TableCell>{Math.round(t.hours / t.capacity * 100)}%</TableCell>
                    <TableCell><Badge className={`text-[10px] ${STATUS_COLOR[t.status]}`}>{t.status === "overloaded" ? "超负荷" : t.status === "available" ? "可用" : "正常"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Budget */}
        <TabsContent value="budget" className="mt-4">
          <Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>{language === "zh" ? "项目" : "Project"}</TableHead>
                <TableHead className="text-right">{language === "zh" ? "预算" : "Budget"}</TableHead>
                <TableHead className="text-right">{language === "zh" ? "已用" : "Spent"}</TableHead>
                <TableHead className="text-right">{language === "zh" ? "余额" : "Remaining"}</TableHead>
                <TableHead>{language === "zh" ? "消耗率" : "Burn"}</TableHead>
                <TableHead>{language === "zh" ? "进度匹配" : "Health"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {MY_PROJECTS.map(p => {
                  const burnPct = Math.round(p.spent / p.budget * 100);
                  const healthy = Math.abs(burnPct - p.progress) < 15;
                  return (
                    <TableRow key={p.code}>
                      <TableCell><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.code}</p></TableCell>
                      <TableCell className="text-right font-medium">¥{(p.budget / 10000).toFixed(0)}万</TableCell>
                      <TableCell className="text-right">¥{(p.spent / 10000).toFixed(1)}万</TableCell>
                      <TableCell className="text-right text-green-600">¥{((p.budget - p.spent) / 10000).toFixed(1)}万</TableCell>
                      <TableCell><div className="flex items-center gap-2"><Progress value={burnPct} className={`w-16 h-2 ${burnPct > p.progress + 15 ? "[&>div]:bg-red-500" : ""}`} /><span className="text-xs">{burnPct}%</span></div></TableCell>
                      <TableCell>{healthy ? <Badge className="bg-green-100 text-green-700 text-[10px]"><CheckCircle className="h-3 w-3 mr-0.5 inline" />{language === "zh" ? "健康" : "OK"}</Badge> : <Badge className="bg-red-100 text-red-700 text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5 inline" />{language === "zh" ? "超支风险" : "Over"}</Badge>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
