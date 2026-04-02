/**
 * AnnualGoalAgreement — 年度目标协定
 *
 * 主管与员工双签仪式、多维权重配置、绩效等级与激励映射、职业路径选择
 * Tab1: 目标制定 | Tab2: 协议签署 | Tab3: 我的协定列表
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  Target, Plus, Trash2, CheckCircle2, Send, FileText,
  TrendingUp, Award, Users, Calendar, Loader2, AlertCircle,
  Handshake, PenLine, ArrowRight, Sparkles, Calculator,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";

// ── Status badge config ──
const STATUS_CONFIG: Record<string, { label: string; labelEn: string; color: string }> = {
  draft: { label: "草稿", labelEn: "Draft", color: "bg-gray-100 text-gray-700" },
  negotiation: { label: "协商中", labelEn: "Negotiating", color: "bg-blue-100 text-blue-700" },
  signed: { label: "已签署", labelEn: "Signed", color: "bg-purple-100 text-purple-700" },
  active: { label: "执行中", labelEn: "Active", color: "bg-green-100 text-green-700" },
  adjustment_pending: { label: "调整中", labelEn: "Adjusting", color: "bg-yellow-100 text-yellow-700" },
  in_review: { label: "评审中", labelEn: "In Review", color: "bg-orange-100 text-orange-700" },
  year_end_review: { label: "年终评审", labelEn: "Year-End Review", color: "bg-red-100 text-red-700" },
  finalized: { label: "已定稿", labelEn: "Finalized", color: "bg-emerald-100 text-emerald-700" },
  archived: { label: "已归档", labelEn: "Archived", color: "bg-slate-100 text-slate-500" },
};

const PERF_LEVELS_DEFAULT = [
  { level: "差", code: "D", bonusMonths: 0, color: "text-red-600", thresholdMin: 0 },
  { level: "中", code: "C", bonusMonths: 1, color: "text-yellow-600", thresholdMin: 40 },
  { level: "良", code: "B", bonusMonths: 2, color: "text-blue-600", thresholdMin: 60 },
  { level: "优", code: "A", bonusMonths: 3, color: "text-green-600", thresholdMin: 80 },
];

const CHANNELS = [
  { value: "email", label: "邮件", labelEn: "Email" },
  { value: "in_system", label: "系统内", labelEn: "In-System" },
  { value: "face_to_face", label: "面对面", labelEn: "Face-to-Face" },
  { value: "wechat", label: "微信", labelEn: "WeChat" },
];

type Dimension = {
  id?: number;
  dimensionName: string;
  dimensionNameEn: string;
  dimensionCode: string;
  weight: number;
  description: string;
};

export default function AnnualGoalAgreement() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [activeTab, setActiveTab] = useState("create");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const currentYear = new Date().getFullYear();
  const listQ = trpc.annualGoalIncentive.agreements.list.useQuery({ year: currentYear, limit: 50 });
  const detailQ = trpc.annualGoalIncentive.agreements.getById.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId }
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{isZh ? "年度目标协定" : "Annual Goal Agreement"}</h1>
            <p className="text-sm text-muted-foreground">{isZh ? "制定、签署、追踪年度绩效目标与激励计划" : "Set, sign, and track annual performance goals & incentive plans"}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">{currentYear}</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create" className="gap-1.5"><PenLine className="h-3.5 w-3.5" />{isZh ? "目标制定" : "Goal Setting"}</TabsTrigger>
          <TabsTrigger value="sign" className="gap-1.5"><Handshake className="h-3.5 w-3.5" />{isZh ? "协议签署" : "Sign Agreement"}</TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5"><FileText className="h-3.5 w-3.5" />{isZh ? "协定列表" : "Agreements"}</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-4">
          <GoalSettingForm year={currentYear} isZh={isZh} user={user} onCreated={(id) => { setSelectedId(id); setActiveTab("sign"); }} />
        </TabsContent>

        <TabsContent value="sign" className="mt-4">
          {selectedId && detailQ.data ? (
            <AgreementSignView agreement={detailQ.data} isZh={isZh} user={user} onRefresh={() => detailQ.refetch()} />
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              {isZh ? "请先在\"协定列表\"中选择一份协定" : "Select an agreement from the list first"}
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <AgreementList
            data={listQ.data}
            isLoading={listQ.isLoading}
            isZh={isZh}
            onSelect={(id) => { setSelectedId(id); setActiveTab("sign"); }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Tab 1: Goal Setting Form
// ══════════════════════════════════════════════════════
function GoalSettingForm({ year, isZh, user, onCreated }: { year: number; isZh: boolean; user: any; onCreated: (id: number) => void }) {
  const [employeeName, setEmployeeName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [salaryGrade, setSalaryGrade] = useState("");
  const [channel, setChannel] = useState("email");
  const [deadline, setDeadline] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const [notes, setNotes] = useState("");

  // Career path
  const [careerUpgradeRole, setCareerUpgradeRole] = useState("");
  const [salaryDeltaPct, setSalaryDeltaPct] = useState("20");
  const [bonusCapMultiplier, setBonusCapMultiplier] = useState("2");

  // Dimensions
  const [dimensions, setDimensions] = useState<Dimension[]>([
    { dimensionName: "营销", dimensionNameEn: "Marketing", dimensionCode: "marketing", weight: 70, description: "" },
    { dimensionName: "销售", dimensionNameEn: "Sales", dimensionCode: "sales", weight: 30, description: "" },
  ]);

  // Performance levels
  const [perfLevels, setPerfLevels] = useState(PERF_LEVELS_DEFAULT);

  const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
  const createMut = trpc.annualGoalIncentive.agreements.create.useMutation();
  const dimUpsert = trpc.annualGoalIncentive.dimensions.upsert.useMutation();

  const addDimension = () => {
    setDimensions([...dimensions, { dimensionName: "", dimensionNameEn: "", dimensionCode: `dim_${Date.now()}`, weight: 0, description: "" }]);
  };

  const removeDimension = (idx: number) => {
    setDimensions(dimensions.filter((_, i) => i !== idx));
  };

  const updateDimension = (idx: number, field: keyof Dimension, value: any) => {
    const updated = [...dimensions];
    (updated[idx] as any)[field] = value;
    setDimensions(updated);
  };

  const handleSubmit = async () => {
    if (!employeeName || !employeeId) return;
    if (Math.abs(totalWeight - 100) > 0.01) return;

    const agreement = await createMut.mutateAsync({
      employeeId: parseInt(employeeId),
      employeeName,
      managerId: user?.id ?? 0,
      managerName: user?.name ?? "Manager",
      year,
      baseSalaryGrade: salaryGrade || undefined,
      baseSalarySnapshot: baseSalary || undefined,
      careerPathOptionJson: careerUpgradeRole ? {
        currentRole: "",
        upgradeRole: careerUpgradeRole,
        salaryDeltaPct: parseFloat(salaryDeltaPct),
        bonusCapMultiplier: parseFloat(bonusCapMultiplier),
      } : undefined,
      performanceLevelsJson: perfLevels,
      bonusCapMonths: "3.0",
      deliverableDeadline: deadline || undefined,
      deliverableDescription: deliverable || undefined,
      communicationChannel: channel,
      notes: notes || undefined,
    });

    // Create dimensions
    for (let i = 0; i < dimensions.length; i++) {
      const d = dimensions[i];
      await dimUpsert.mutateAsync({
        agreementId: agreement.id,
        dimensionName: d.dimensionName,
        dimensionNameEn: d.dimensionNameEn,
        dimensionCode: d.dimensionCode,
        weight: String(d.weight),
        description: d.description || undefined,
        sortOrder: i,
      });
    }

    onCreated(agreement.id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Employee & Basic Info */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {isZh ? "员工信息与基础设定" : "Employee & Base Settings"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{isZh ? "员工姓名" : "Employee Name"} *</Label>
              <Input value={employeeName} onChange={e => setEmployeeName(e.target.value)} placeholder={isZh ? "例: 刘坤" : "e.g. Liu Kun"} />
            </div>
            <div className="space-y-1.5">
              <Label>{isZh ? "员工ID" : "Employee ID"} *</Label>
              <Input value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="e.g. 42" />
            </div>
            <div className="space-y-1.5">
              <Label>{isZh ? "基本工资" : "Base Salary"}</Label>
              <Input type="number" value={baseSalary} onChange={e => setBaseSalary(e.target.value)} placeholder="e.g. 15000" />
            </div>
            <div className="space-y-1.5">
              <Label>{isZh ? "薪资等级" : "Salary Grade"}</Label>
              <Input value={salaryGrade} onChange={e => setSalaryGrade(e.target.value)} placeholder="e.g. 10B" />
            </div>
            <div className="space-y-1.5">
              <Label>{isZh ? "沟通渠道" : "Channel"}</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{isZh ? c.label : c.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isZh ? "交付件截止日" : "Deliverable Deadline"}</Label>
              <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{isZh ? "交付件描述" : "Deliverable Description"}</Label>
            <Input value={deliverable} onChange={e => setDeliverable(e.target.value)}
              placeholder={isZh ? "例: 工作规划与工作思路报告" : "e.g. Work plan & strategy report"} />
          </div>
          <div className="space-y-1.5">
            <Label>{isZh ? "备注" : "Notes"}</Label>
            <textarea className="w-full rounded-md border bg-background text-sm p-2.5 min-h-[60px] resize-none"
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={isZh ? "对话记录、特殊约定等" : "Dialogue notes, special agreements, etc."} />
          </div>
        </CardContent>
      </Card>

      {/* Right: Career Path */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            {isZh ? "职业路径升级" : "Career Path Upgrade"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{isZh ? "升级目标岗位" : "Target Role"}</Label>
            <Input value={careerUpgradeRole} onChange={e => setCareerUpgradeRole(e.target.value)}
              placeholder={isZh ? "例: 销售与市场主管" : "e.g. Sales & Marketing Supervisor"} />
          </div>
          <div className="space-y-1.5">
            <Label>{isZh ? "基数提高比例 (%)" : "Salary Increase (%)"}</Label>
            <Input type="number" value={salaryDeltaPct} onChange={e => setSalaryDeltaPct(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{isZh ? "奖金上限倍数" : "Bonus Cap Multiplier"}</Label>
            <Input type="number" value={bonusCapMultiplier} onChange={e => setBonusCapMultiplier(e.target.value)} />
          </div>
          {careerUpgradeRole && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs space-y-1">
              <div className="font-medium text-amber-800">{isZh ? "升级后激励变化" : "Upgraded Incentive"}</div>
              <div className="text-amber-700">
                {isZh ? `奖金上限: 3×${bonusCapMultiplier} = ${3 * parseFloat(bonusCapMultiplier || "1")} 个月` :
                  `Bonus cap: 3×${bonusCapMultiplier} = ${3 * parseFloat(bonusCapMultiplier || "1")} months`}
              </div>
              <div className="text-amber-700">
                {isZh ? `基本工资 +${salaryDeltaPct}%` : `Base salary +${salaryDeltaPct}%`}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dimensions */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {isZh ? "考核维度与权重" : "Assessment Dimensions & Weights"}
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-mono ${Math.abs(totalWeight - 100) < 0.01 ? "text-green-600" : "text-red-500"}`}>
                {totalWeight}%
              </span>
              <Button size="sm" variant="outline" onClick={addDimension}>
                <Plus className="h-3.5 w-3.5 mr-1" />{isZh ? "添加维度" : "Add"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dimensions.map((dim, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex-1 grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{isZh ? "维度名称" : "Name"}</Label>
                    <Input value={dim.dimensionName} onChange={e => updateDimension(idx, "dimensionName", e.target.value)}
                      placeholder={isZh ? "例: 营销" : "e.g. Marketing"} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{isZh ? "英文名" : "Name (EN)"}</Label>
                    <Input value={dim.dimensionNameEn} onChange={e => updateDimension(idx, "dimensionNameEn", e.target.value)}
                      className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{isZh ? "权重 (%)" : "Weight (%)"}</Label>
                    <Input type="number" min={0} max={100} value={dim.weight}
                      onChange={e => updateDimension(idx, "weight", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{isZh ? "说明" : "Description"}</Label>
                    <Input value={dim.description} onChange={e => updateDimension(idx, "description", e.target.value)}
                      className="h-8 text-sm" />
                  </div>
                </div>
                {/* Weight bar */}
                <div className="w-24 pt-5">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(dim.weight, 100)}%` }} />
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="mt-4 h-8 w-8 text-red-400 hover:text-red-600"
                  onClick={() => removeDimension(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Levels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-indigo-500" />
            {isZh ? "绩效等级与激励" : "Performance Levels & Incentive"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {perfLevels.map((pl, idx) => (
              <div key={pl.code} className="flex items-center gap-3 p-2.5 rounded-lg border bg-background">
                <span className={`text-lg font-bold w-8 text-center ${pl.color}`}>{pl.level}</span>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Code: {pl.code}</div>
                  <div className="text-xs text-muted-foreground">{isZh ? `≥${pl.thresholdMin}分` : `≥${pl.thresholdMin} pts`}</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Input type="number" min={0} max={12} value={pl.bonusMonths}
                      onChange={e => {
                        const updated = [...perfLevels];
                        updated[idx] = { ...updated[idx], bonusMonths: parseFloat(e.target.value) || 0 };
                        setPerfLevels(updated);
                      }}
                      className="h-7 w-16 text-sm text-right font-mono" />
                    <span className="text-xs text-muted-foreground">{isZh ? "月" : "mo"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
            {isZh
              ? `差(0月) → 中(1月) → 良(2月) → 优(3月)，升级路径可翻倍至最高 ${3 * parseFloat(bonusCapMultiplier || "1")} 个月`
              : `D(0mo) → C(1mo) → B(2mo) → A(3mo), career upgrade multiplies cap to ${3 * parseFloat(bonusCapMultiplier || "1")} months`}
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="lg:col-span-3 flex justify-end gap-3">
        <Button variant="outline" onClick={() => {}}>
          {isZh ? "暂存草稿" : "Save Draft"}
        </Button>
        <Button onClick={handleSubmit}
          disabled={!employeeName || !employeeId || Math.abs(totalWeight - 100) > 0.01 || createMut.isPending}>
          {createMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          {isZh ? "创建协定并进入签署" : "Create & Proceed to Sign"}
        </Button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Tab 2: Agreement Sign View (双签仪式)
// ══════════════════════════════════════════════════════
function AgreementSignView({ agreement, isZh, user, onRefresh }: { agreement: any; isZh: boolean; user: any; onRefresh: () => void }) {
  const signMut = trpc.annualGoalIncentive.agreements.sign.useMutation();
  const activateMut = trpc.annualGoalIncentive.agreements.activate.useMutation();
  const dims = agreement.dimensions || [];
  const levels = (agreement.performanceLevelsJson as any[]) || PERF_LEVELS_DEFAULT;
  const career = agreement.careerPathOptionJson as any;
  const statusCfg = STATUS_CONFIG[agreement.status] || STATUS_CONFIG.draft;

  const handleSign = async (role: "employee" | "manager") => {
    await signMut.mutateAsync({ id: agreement.id, role, signerName: user?.name ?? "User" });
    onRefresh();
  };

  const handleActivate = async () => {
    await activateMut.mutateAsync({ id: agreement.id, managerName: user?.name ?? "Manager" });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Agreement Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">{agreement.employeeName} — {agreement.year} {isZh ? "年度目标协定" : "Annual Goal Agreement"}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isZh ? "主管" : "Manager"}: {agreement.managerName} · {isZh ? "渠道" : "Channel"}: {CHANNELS.find(c => c.value === agreement.communicationChannel)?.[isZh ? "label" : "labelEn"] || agreement.communicationChannel}
              </p>
            </div>
            <Badge className={statusCfg.color}>{isZh ? statusCfg.label : statusCfg.labelEn}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dimensions Summary */}
        <Card>
          <CardHeader><CardTitle className="text-base">{isZh ? "考核维度" : "Dimensions"}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dims.map((d: any) => (
                <div key={d.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{isZh ? d.dimensionName : d.dimensionNameEn || d.dimensionName}</div>
                    {d.description && <div className="text-xs text-muted-foreground">{d.description}</div>}
                  </div>
                  <div className="w-32">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>{isZh ? "权重" : "Weight"}</span>
                      <span className="font-mono font-semibold">{d.weight}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${d.weight}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Levels & Career Path */}
        <Card>
          <CardHeader><CardTitle className="text-base">{isZh ? "激励映射" : "Incentive Mapping"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {levels.map((l: any) => (
                <div key={l.code} className="text-center p-2.5 rounded-lg border">
                  <div className="text-lg font-bold">{l.level}</div>
                  <div className="text-xs text-muted-foreground">{l.code}</div>
                  <div className="text-sm font-semibold mt-1">{l.bonusMonths} {isZh ? "月" : "mo"}</div>
                </div>
              ))}
            </div>
            {career?.upgradeRole && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                  <Sparkles className="h-4 w-4" />
                  {isZh ? "职业升级路径" : "Career Upgrade Path"}
                </div>
                <div className="mt-2 text-xs text-amber-700 space-y-1">
                  <div>{isZh ? "目标岗位" : "Target"}: <strong>{career.upgradeRole}</strong></div>
                  <div>{isZh ? "奖金上限翻倍至" : "Bonus cap doubles to"}: <strong>{3 * (career.bonusCapMultiplier || 2)} {isZh ? "个月" : "months"}</strong></div>
                  <div>{isZh ? "基本工资" : "Base salary"}: <strong>+{career.salaryDeltaPct || 20}%</strong></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deliverable */}
      {agreement.deliverableDescription && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{isZh ? "交付件" : "Deliverable"}:</span>
              <span>{agreement.deliverableDescription}</span>
              {agreement.deliverableDeadline && (
                <Badge variant="outline" className="ml-2">
                  {isZh ? "截止" : "Due"}: {new Date(agreement.deliverableDeadline).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signature Ceremony */}
      <Card className="border-2 border-dashed border-blue-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Handshake className="h-4 w-4 text-blue-500" />
            {isZh ? "双签仪式" : "Dual Signature Ceremony"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Employee signature */}
            <div className={`p-4 rounded-lg border-2 ${agreement.signedByEmployee ? "border-green-300 bg-green-50" : "border-dashed border-gray-300"}`}>
              <div className="text-sm font-medium mb-2">{isZh ? "员工签署" : "Employee Signature"}</div>
              {agreement.signedByEmployee ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <div>
                    <div className="text-sm font-medium">{agreement.employeeName}</div>
                    <div className="text-xs">{agreement.employeeSignedAt ? new Date(agreement.employeeSignedAt).toLocaleString() : ""}</div>
                  </div>
                </div>
              ) : (
                <Button size="sm" onClick={() => handleSign("employee")} disabled={signMut.isPending}>
                  <PenLine className="h-3.5 w-3.5 mr-1.5" />
                  {isZh ? "我确认签署 (员工)" : "I Sign (Employee)"}
                </Button>
              )}
            </div>

            {/* Manager signature */}
            <div className={`p-4 rounded-lg border-2 ${agreement.signedByManager ? "border-green-300 bg-green-50" : "border-dashed border-gray-300"}`}>
              <div className="text-sm font-medium mb-2">{isZh ? "主管签署" : "Manager Signature"}</div>
              {agreement.signedByManager ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <div>
                    <div className="text-sm font-medium">{agreement.managerName}</div>
                    <div className="text-xs">{agreement.managerSignedAt ? new Date(agreement.managerSignedAt).toLocaleString() : ""}</div>
                  </div>
                </div>
              ) : (
                <Button size="sm" onClick={() => handleSign("manager")} disabled={signMut.isPending}>
                  <PenLine className="h-3.5 w-3.5 mr-1.5" />
                  {isZh ? "我确认签署 (主管)" : "I Sign (Manager)"}
                </Button>
              )}
            </div>
          </div>

          {/* Activate button (appears after both signed) */}
          {agreement.status === "signed" && (
            <div className="mt-4 pt-4 border-t text-center">
              <Button onClick={handleActivate} disabled={activateMut.isPending} className="bg-green-600 hover:bg-green-700">
                {activateMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                {isZh ? "激活协定 (自动生成季度检查点)" : "Activate Agreement (Auto-schedule Checkpoints)"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Tab 3: Agreement List
// ══════════════════════════════════════════════════════
function AgreementList({ data, isLoading, isZh, onSelect }: { data: any; isLoading: boolean; isZh: boolean; onSelect: (id: number) => void }) {
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const rows = data?.rows || [];
  if (rows.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        {isZh ? "暂无年度目标协定，请在\"目标制定\"中创建" : "No agreements yet. Create one in the Goal Setting tab."}
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((a: any) => {
        const statusCfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.draft;
        return (
          <Card key={a.id} className="cursor-pointer hover:border-blue-300 transition-colors" onClick={() => onSelect(a.id)}>
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                  {a.employeeName?.charAt(0) || "?"}
                </div>
                <div>
                  <div className="text-sm font-medium">{a.employeeName}</div>
                  <div className="text-xs text-muted-foreground">
                    {isZh ? "主管" : "Mgr"}: {a.managerName} · {a.department || "-"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {a.projectedBonusMonths && parseFloat(a.projectedBonusMonths) > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{isZh ? "预估奖金" : "Proj. Bonus"}</div>
                    <div className="text-sm font-mono font-semibold">{a.projectedBonusMonths} {isZh ? "月" : "mo"}</div>
                  </div>
                )}
                <Badge className={statusCfg.color}>{isZh ? statusCfg.label : statusCfg.labelEn}</Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
