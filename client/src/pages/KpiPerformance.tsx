/**
 * KPI绩效管理页面
 * 岗位画像、指标库、KPI目标、技能矩阵、月度评审、军令状 — 6 tabs CRUD
 */
import { useState } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Target, Users, BookOpen, Crosshair, BrainCircuit, CalendarCheck,
  Scroll, Plus, Pencil, Loader2, FileSignature, Eye,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ── Types ──

type Position = {
  id: number;
  positionId?: number | null;
  title: string;
  department: string;
  buCode?: string | null;
  responsibilities?: string | null;
  hiringRequirements?: string | null;
  coreCompetency?: string | null;
  headcount?: number | null;
  status?: string | null;
};

type KpiLibraryItem = {
  id: number;
  code?: string | null;
  name: string;
  description?: string | null;
  unit: string;
  kpiType: string;
  category?: string | null;
  calculationFormula?: string | null;
  dataSource?: string | null;
  buCode?: string | null;
  status?: string | null;
};

type KpiTarget = {
  id: number;
  positionId: number;
  kpiId: number;
  year: number;
  targetValue: string;
  challengeValue?: string | null;
  minimumValue?: string | null;
  weight: string;
  scoringMethod?: string | null;
  notes?: string | null;
  status?: string | null;
};

type Skill = {
  id: number;
  userId: number;
  employeeId?: number | null;
  skillName: string;
  skillCategory?: string | null;
  currentLevel: number;
  targetLevel: number;
  assessmentDate?: string | null;
  assessedBy?: number | null;
  notes?: string | null;
};

type Review = {
  id: number;
  userId: number;
  employeeId?: number | null;
  positionId?: number | null;
  monthDate: string;
  overallKpiScore?: string | null;
  bonusCoefficient?: string | null;
  gapsText?: string | null;
  improvementPlanText?: string | null;
  reviewerComments?: string | null;
  reviewedBy?: number | null;
  status?: string | null;
};

type MilitaryOrder = {
  id: number;
  userId: number;
  employeeId?: number | null;
  year: number;
  positionId?: number | null;
  commitmentText: string;
  rewardText?: string | null;
  consequenceText?: string | null;
  signatureStatus?: string | null;
  signedAt?: string | null;
  witnessedBy?: number | null;
  witnessedAt?: string | null;
  documentUrl?: string | null;
  status?: string | null;
  notes?: string | null;
};

// ── Label maps ──

const KPI_TYPE_LABELS: Record<string, string> = {
  financial: "财务",
  customer: "客户",
  internal_process: "内部流程",
  learning_growth: "学习成长",
};

const UNIT_LABELS: Record<string, string> = {
  currency: "金额",
  percent: "百分比",
  count: "数量",
  days: "天数",
  score: "分值",
  ratio: "比率",
};

const SCORING_LABELS: Record<string, string> = {
  linear: "线性",
  step: "阶梯",
  binary: "二元",
  threshold: "阈值",
};

const SKILL_CATEGORY_LABELS: Record<string, string> = {
  technical: "技术",
  leadership: "领导力",
  domain: "领域知识",
  soft_skill: "软技能",
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  submitted: "已提交",
  reviewed: "已评审",
  finalized: "已定稿",
};

const SIGNATURE_STATUS_LABELS: Record<string, string> = {
  pending: "待签署",
  signed: "已签署",
  witnessed: "已见证",
  voided: "已作废",
};

const STATUS_LABELS: Record<string, string> = {
  active: "生效",
  inactive: "停用",
  draft: "草稿",
  completed: "已完成",
};

// ── Status badge helper ──
function StatusBadge({ status }: { status?: string | null }) {
  const label = STATUS_LABELS[status || "active"] || status || "生效";
  const cls = status === "active" || !status ? "bg-green-100 text-green-700"
    : status === "draft" ? "bg-yellow-100 text-yellow-700"
    : "bg-gray-100 text-gray-700";
  return <Badge className={cls}>{label}</Badge>;
}

// ── Positions Tab ──
function PositionsTab({ items, onEdit }: { items: Position[]; onEdit: (item: Position) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">定义岗位画像，包括职责、任职要求和核心能力</p>
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">暂无岗位画像数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="p-2">岗位名称</th><th className="p-2">部门</th><th className="p-2">BU</th><th className="p-2 text-right">编制人数</th><th className="p-2">状态</th><th className="p-2">操作</th>
            </tr></thead>
            <tbody>{items.map(item => (
              <tr key={item.id} className="border-b hover:bg-accent/30">
                <td className="p-2 font-medium">{item.title}</td>
                <td className="p-2">{item.department}</td>
                <td className="p-2 text-muted-foreground">{item.buCode || "-"}</td>
                <td className="p-2 text-right font-mono">{item.headcount ?? "-"}</td>
                <td className="p-2"><StatusBadge status={item.status} /></td>
                <td className="p-2"><Button variant="ghost" size="icon" onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Library Tab ──
function LibraryTab({ items, onEdit }: { items: KpiLibraryItem[]; onEdit: (item: KpiLibraryItem) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">统一管理KPI指标定义、计量单位和计算公式</p>
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">暂无指标库数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="p-2">指标名称</th><th className="p-2">类型</th><th className="p-2">单位</th><th className="p-2">分类</th><th className="p-2">状态</th><th className="p-2">操作</th>
            </tr></thead>
            <tbody>{items.map(item => (
              <tr key={item.id} className="border-b hover:bg-accent/30">
                <td className="p-2 font-medium">{item.name}</td>
                <td className="p-2"><Badge variant="outline">{KPI_TYPE_LABELS[item.kpiType] || item.kpiType}</Badge></td>
                <td className="p-2">{UNIT_LABELS[item.unit] || item.unit}</td>
                <td className="p-2 text-muted-foreground">{item.category || "-"}</td>
                <td className="p-2"><StatusBadge status={item.status} /></td>
                <td className="p-2"><Button variant="ghost" size="icon" onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Targets Tab ──
function TargetsTab({ items, onEdit }: { items: KpiTarget[]; onEdit: (item: KpiTarget) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">为岗位设定KPI目标值、挑战值与权重</p>
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">暂无KPI目标数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="p-2">岗位ID</th><th className="p-2">指标ID</th><th className="p-2">年份</th><th className="p-2 text-right">目标值</th><th className="p-2 text-right">权重</th><th className="p-2">评分方式</th><th className="p-2">状态</th><th className="p-2">操作</th>
            </tr></thead>
            <tbody>{items.map(item => (
              <tr key={item.id} className="border-b hover:bg-accent/30">
                <td className="p-2 font-mono">{item.positionId}</td>
                <td className="p-2 font-mono">{item.kpiId}</td>
                <td className="p-2">{item.year}</td>
                <td className="p-2 text-right font-mono">{item.targetValue}</td>
                <td className="p-2 text-right font-mono">{item.weight}</td>
                <td className="p-2">{SCORING_LABELS[item.scoringMethod || "linear"] || item.scoringMethod || "-"}</td>
                <td className="p-2"><StatusBadge status={item.status} /></td>
                <td className="p-2"><Button variant="ghost" size="icon" onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Skills Tab ──
function SkillsTab({ items, onEdit }: { items: Skill[]; onEdit: (item: Skill) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">员工技能评估与目标等级矩阵</p>
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">暂无技能矩阵数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="p-2">技能名称</th><th className="p-2">分类</th><th className="p-2 text-center">当前等级</th><th className="p-2 text-center">目标等级</th><th className="p-2">评估日期</th><th className="p-2">员工ID</th><th className="p-2">操作</th>
            </tr></thead>
            <tbody>{items.map(item => (
              <tr key={item.id} className="border-b hover:bg-accent/30">
                <td className="p-2 font-medium">{item.skillName}</td>
                <td className="p-2"><Badge variant="outline">{SKILL_CATEGORY_LABELS[item.skillCategory || ""] || item.skillCategory || "-"}</Badge></td>
                <td className="p-2 text-center">
                  <span className="inline-flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className={`w-2 h-2 rounded-full ${i < item.currentLevel ? "bg-primary" : "bg-muted"}`} />
                    ))}
                    <span className="ml-1 text-xs text-muted-foreground">{item.currentLevel}</span>
                  </span>
                </td>
                <td className="p-2 text-center">
                  <span className="inline-flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className={`w-2 h-2 rounded-full ${i < item.targetLevel ? "bg-amber-500" : "bg-muted"}`} />
                    ))}
                    <span className="ml-1 text-xs text-muted-foreground">{item.targetLevel}</span>
                  </span>
                </td>
                <td className="p-2 text-muted-foreground">{item.assessmentDate || "-"}</td>
                <td className="p-2 font-mono">{item.userId}</td>
                <td className="p-2"><Button variant="ghost" size="icon" onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Reviews Tab ──
function ReviewsTab({ items, onEdit }: { items: Review[]; onEdit: (item: Review) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">月度绩效评审记录，含KPI得分与奖金系数</p>
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">暂无月度评审数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="p-2">员工ID</th><th className="p-2">月份</th><th className="p-2 text-right">KPI得分</th><th className="p-2 text-right">奖金系数</th><th className="p-2">状态</th><th className="p-2">操作</th>
            </tr></thead>
            <tbody>{items.map(item => (
              <tr key={item.id} className="border-b hover:bg-accent/30">
                <td className="p-2 font-mono">{item.userId}</td>
                <td className="p-2">{item.monthDate}</td>
                <td className="p-2 text-right font-mono font-bold">{item.overallKpiScore || "-"}</td>
                <td className="p-2 text-right font-mono">{item.bonusCoefficient || "-"}</td>
                <td className="p-2">
                  <Badge className={
                    item.status === "finalized" ? "bg-green-100 text-green-700"
                    : item.status === "reviewed" ? "bg-blue-100 text-blue-700"
                    : item.status === "submitted" ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                  }>{REVIEW_STATUS_LABELS[item.status || "draft"] || item.status}</Badge>
                </td>
                <td className="p-2"><Button variant="ghost" size="icon" onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Military Orders Tab ──
function MilitaryOrdersTab({
  items, onEdit, onSign, onWitness,
}: {
  items: MilitaryOrder[];
  onEdit: (item: MilitaryOrder) => void;
  onSign: (item: MilitaryOrder) => void;
  onWitness: (item: MilitaryOrder) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">年度军令状管理，含签署与见证流程</p>
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">暂无军令状数据</div>
      ) : (
        <div className="grid gap-4">
          {items.map(item => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold">员工#{item.userId}</span>
                      <Badge variant="outline">{item.year}年</Badge>
                      <Badge className={
                        item.signatureStatus === "witnessed" ? "bg-green-100 text-green-700"
                        : item.signatureStatus === "signed" ? "bg-blue-100 text-blue-700"
                        : item.signatureStatus === "voided" ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                      }>{SIGNATURE_STATUS_LABELS[item.signatureStatus || "pending"] || item.signatureStatus}</Badge>
                    </div>
                    <p className="text-sm mt-1">{item.commitmentText}</p>
                    {item.rewardText && <p className="text-xs text-muted-foreground mt-1">奖励: {item.rewardText}</p>}
                    {item.consequenceText && <p className="text-xs text-muted-foreground">惩罚: {item.consequenceText}</p>}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    {item.signatureStatus === "pending" && (
                      <Button variant="outline" size="sm" onClick={() => onSign(item)}>
                        <FileSignature className="h-3.5 w-3.5 mr-1" />签署
                      </Button>
                    )}
                    {item.signatureStatus === "signed" && (
                      <Button variant="outline" size="sm" onClick={() => onWitness(item)}>
                        <Eye className="h-3.5 w-3.5 mr-1" />见证
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Position Dialog ──
function PositionDialog({
  open, onOpenChange, editItem,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editItem: Position | null;
}) {
  const utils = trpc.useUtils();
  const isEdit = !!editItem;
  const [form, setForm] = useState(() => ({
    title: editItem?.title || "",
    department: editItem?.department || "",
    buCode: editItem?.buCode || "",
    responsibilities: editItem?.responsibilities || "",
    hiringRequirements: editItem?.hiringRequirements || "",
    coreCompetency: editItem?.coreCompetency || "",
    headcount: editItem?.headcount?.toString() || "",
    status: editItem?.status || "active",
  }));
  const [prevEditId, setPrevEditId] = useState<number | null>(null);
  if ((editItem?.id ?? null) !== prevEditId) {
    setPrevEditId(editItem?.id ?? null);
    setForm({
      title: editItem?.title || "",
      department: editItem?.department || "",
      buCode: editItem?.buCode || "",
      responsibilities: editItem?.responsibilities || "",
      hiringRequirements: editItem?.hiringRequirements || "",
      coreCompetency: editItem?.coreCompetency || "",
      headcount: editItem?.headcount?.toString() || "",
      status: editItem?.status || "active",
    });
  }

  const createMut = trpc.kpiPerformance.positions.create.useMutation({
    onSuccess: () => { toast.success("岗位画像已创建"); utils.kpiPerformance.positions.list.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`创建失败: ${e.message}`),
  });
  const updateMut = trpc.kpiPerformance.positions.update.useMutation({
    onSuccess: () => { toast.success("岗位画像已更新"); utils.kpiPerformance.positions.list.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`更新失败: ${e.message}`),
  });
  const saving = createMut.isPending || updateMut.isPending;

  const handleSave = () => {
    if (!form.title.trim()) { toast.error("请输入岗位名称"); return; }
    if (!form.department.trim()) { toast.error("请输入部门"); return; }
    const payload = {
      title: form.title,
      department: form.department,
      buCode: form.buCode || undefined,
      responsibilities: form.responsibilities || undefined,
      hiringRequirements: form.hiringRequirements || undefined,
      coreCompetency: form.coreCompetency || undefined,
      headcount: form.headcount ? parseInt(form.headcount) : undefined,
      status: form.status as "active" | "inactive" | "draft",
    };
    if (isEdit) {
      updateMut.mutate({ id: editItem!.id, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader><DialogTitle>{isEdit ? "编辑" : "添加"}岗位画像</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>岗位名称 *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>部门 *</Label><Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>BU编码</Label><Input value={form.buCode} onChange={e => setForm({ ...form, buCode: e.target.value })} placeholder="如 overseas" /></div>
            <div><Label>编制人数</Label><Input type="number" value={form.headcount} onChange={e => setForm({ ...form, headcount: e.target.value })} /></div>
          </div>
          <div><Label>岗位职责</Label><Textarea rows={2} value={form.responsibilities} onChange={e => setForm({ ...form, responsibilities: e.target.value })} /></div>
          <div><Label>任职要求</Label><Textarea rows={2} value={form.hiringRequirements} onChange={e => setForm({ ...form, hiringRequirements: e.target.value })} /></div>
          <div><Label>核心能力</Label><Input value={form.coreCompetency} onChange={e => setForm({ ...form, coreCompetency: e.target.value })} /></div>
          <div>
            <Label>状态</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">生效</SelectItem>
                <SelectItem value="inactive">停用</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Library Dialog ──
function LibraryDialog({
  open, onOpenChange, editItem,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editItem: KpiLibraryItem | null;
}) {
  const utils = trpc.useUtils();
  const isEdit = !!editItem;
  const [form, setForm] = useState(() => ({
    name: editItem?.name || "",
    description: editItem?.description || "",
    unit: editItem?.unit || "count",
    kpiType: editItem?.kpiType || "financial",
    category: editItem?.category || "",
    calculationFormula: editItem?.calculationFormula || "",
    dataSource: editItem?.dataSource || "",
    buCode: editItem?.buCode || "",
    status: editItem?.status || "active",
  }));
  const [prevEditId, setPrevEditId] = useState<number | null>(null);
  if ((editItem?.id ?? null) !== prevEditId) {
    setPrevEditId(editItem?.id ?? null);
    setForm({
      name: editItem?.name || "",
      description: editItem?.description || "",
      unit: editItem?.unit || "count",
      kpiType: editItem?.kpiType || "financial",
      category: editItem?.category || "",
      calculationFormula: editItem?.calculationFormula || "",
      dataSource: editItem?.dataSource || "",
      buCode: editItem?.buCode || "",
      status: editItem?.status || "active",
    });
  }

  const createMut = trpc.kpiPerformance.library.create.useMutation({
    onSuccess: () => { toast.success("KPI指标已创建"); utils.kpiPerformance.library.list.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`创建失败: ${e.message}`),
  });
  const updateMut = trpc.kpiPerformance.library.update.useMutation({
    onSuccess: () => { toast.success("KPI指标已更新"); utils.kpiPerformance.library.list.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`更新失败: ${e.message}`),
  });
  const saving = createMut.isPending || updateMut.isPending;

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("请输入指标名称"); return; }
    const payload = {
      name: form.name,
      description: form.description || undefined,
      unit: form.unit as "currency" | "percent" | "count" | "days" | "score" | "ratio",
      kpiType: form.kpiType as "financial" | "customer" | "internal_process" | "learning_growth",
      category: form.category || undefined,
      calculationFormula: form.calculationFormula || undefined,
      dataSource: form.dataSource || undefined,
      buCode: form.buCode || undefined,
      status: form.status as "active" | "inactive" | "draft",
    };
    if (isEdit) {
      updateMut.mutate({ id: editItem!.id, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader><DialogTitle>{isEdit ? "编辑" : "添加"}KPI指标</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div><Label>指标名称 *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>描述</Label><Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>KPI类型 *</Label>
              <Select value={form.kpiType} onValueChange={v => setForm({ ...form, kpiType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(KPI_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>单位 *</Label>
              <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>分类</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="如 销售类" /></div>
            <div><Label>数据来源</Label><Input value={form.dataSource} onChange={e => setForm({ ...form, dataSource: e.target.value })} /></div>
          </div>
          <div><Label>计算公式</Label><Input value={form.calculationFormula} onChange={e => setForm({ ...form, calculationFormula: e.target.value })} placeholder="如 实际/目标×100" /></div>
          <div>
            <Label>状态</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">生效</SelectItem>
                <SelectItem value="inactive">停用</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Target Dialog ──
function TargetDialog({
  open, onOpenChange, editItem,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editItem: KpiTarget | null;
}) {
  const utils = trpc.useUtils();
  const isEdit = !!editItem;
  const [form, setForm] = useState(() => ({
    positionId: editItem?.positionId?.toString() || "",
    kpiId: editItem?.kpiId?.toString() || "",
    year: editItem?.year?.toString() || new Date().getFullYear().toString(),
    targetValue: editItem?.targetValue || "",
    challengeValue: editItem?.challengeValue || "",
    minimumValue: editItem?.minimumValue || "",
    weight: editItem?.weight || "",
    scoringMethod: editItem?.scoringMethod || "linear",
    notes: editItem?.notes || "",
    status: editItem?.status || "active",
  }));
  const [prevEditId, setPrevEditId] = useState<number | null>(null);
  if ((editItem?.id ?? null) !== prevEditId) {
    setPrevEditId(editItem?.id ?? null);
    setForm({
      positionId: editItem?.positionId?.toString() || "",
      kpiId: editItem?.kpiId?.toString() || "",
      year: editItem?.year?.toString() || new Date().getFullYear().toString(),
      targetValue: editItem?.targetValue || "",
      challengeValue: editItem?.challengeValue || "",
      minimumValue: editItem?.minimumValue || "",
      weight: editItem?.weight || "",
      scoringMethod: editItem?.scoringMethod || "linear",
      notes: editItem?.notes || "",
      status: editItem?.status || "active",
    });
  }

  const createMut = trpc.kpiPerformance.targets.create.useMutation({
    onSuccess: () => { toast.success("KPI目标已创建"); utils.kpiPerformance.targets.list.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`创建失败: ${e.message}`),
  });
  const updateMut = trpc.kpiPerformance.targets.update.useMutation({
    onSuccess: () => { toast.success("KPI目标已更新"); utils.kpiPerformance.targets.list.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`更新失败: ${e.message}`),
  });
  const saving = createMut.isPending || updateMut.isPending;

  const handleSave = () => {
    if (!form.positionId || !form.kpiId || !form.targetValue || !form.weight) {
      toast.error("请填写必填字段"); return;
    }
    const payload = {
      positionId: parseInt(form.positionId),
      kpiId: parseInt(form.kpiId),
      year: parseInt(form.year),
      targetValue: form.targetValue,
      challengeValue: form.challengeValue || undefined,
      minimumValue: form.minimumValue || undefined,
      weight: form.weight,
      scoringMethod: form.scoringMethod as "linear" | "step" | "binary" | "threshold",
      notes: form.notes || undefined,
      status: form.status as "active" | "inactive" | "draft",
    };
    if (isEdit) {
      updateMut.mutate({ id: editItem!.id, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader><DialogTitle>{isEdit ? "编辑" : "添加"}KPI目标</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>岗位ID *</Label><Input type="number" value={form.positionId} onChange={e => setForm({ ...form, positionId: e.target.value })} /></div>
            <div><Label>指标ID *</Label><Input type="number" value={form.kpiId} onChange={e => setForm({ ...form, kpiId: e.target.value })} /></div>
            <div><Label>年份 *</Label><Input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>目标值 *</Label><Input value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })} /></div>
            <div><Label>挑战值</Label><Input value={form.challengeValue} onChange={e => setForm({ ...form, challengeValue: e.target.value })} /></div>
            <div><Label>底线值</Label><Input value={form.minimumValue} onChange={e => setForm({ ...form, minimumValue: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>权重 *</Label><Input value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} placeholder="如 0.30" /></div>
            <div>
              <Label>评分方式</Label>
              <Select value={form.scoringMethod} onValueChange={v => setForm({ ...form, scoringMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SCORING_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>备注</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Skill Dialog ──
function SkillDialog({
  open, onOpenChange, editItem,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editItem: Skill | null;
}) {
  const utils = trpc.useUtils();
  const isEdit = !!editItem;
  const [form, setForm] = useState(() => ({
    userId: editItem?.userId?.toString() || "",
    skillName: editItem?.skillName || "",
    skillCategory: editItem?.skillCategory || "technical",
    currentLevel: editItem?.currentLevel?.toString() || "1",
    targetLevel: editItem?.targetLevel?.toString() || "3",
    assessmentDate: editItem?.assessmentDate || "",
    notes: editItem?.notes || "",
  }));
  const [prevEditId, setPrevEditId] = useState<number | null>(null);
  if ((editItem?.id ?? null) !== prevEditId) {
    setPrevEditId(editItem?.id ?? null);
    setForm({
      userId: editItem?.userId?.toString() || "",
      skillName: editItem?.skillName || "",
      skillCategory: editItem?.skillCategory || "technical",
      currentLevel: editItem?.currentLevel?.toString() || "1",
      targetLevel: editItem?.targetLevel?.toString() || "3",
      assessmentDate: editItem?.assessmentDate || "",
      notes: editItem?.notes || "",
    });
  }

  const createMut = trpc.kpiPerformance.skills.create.useMutation({
    onSuccess: () => { toast.success("技能记录已创建"); utils.kpiPerformance.skills.list.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`创建失败: ${e.message}`),
  });
  const updateMut = trpc.kpiPerformance.skills.update.useMutation({
    onSuccess: () => { toast.success("技能记录已更新"); utils.kpiPerformance.skills.list.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`更新失败: ${e.message}`),
  });
  const saving = createMut.isPending || updateMut.isPending;

  const handleSave = () => {
    if (!form.skillName.trim()) { toast.error("请输入技能名称"); return; }
    if (!form.userId) { toast.error("请输入员工ID"); return; }
    if (isEdit) {
      updateMut.mutate({
        id: editItem!.id,
        skillName: form.skillName,
        skillCategory: form.skillCategory as "technical" | "leadership" | "domain" | "soft_skill",
        currentLevel: parseInt(form.currentLevel),
        targetLevel: parseInt(form.targetLevel),
        assessmentDate: form.assessmentDate || undefined,
        notes: form.notes || undefined,
      });
    } else {
      createMut.mutate({
        userId: parseInt(form.userId),
        skillName: form.skillName,
        skillCategory: form.skillCategory as "technical" | "leadership" | "domain" | "soft_skill",
        currentLevel: parseInt(form.currentLevel),
        targetLevel: parseInt(form.targetLevel),
        assessmentDate: form.assessmentDate || undefined,
        notes: form.notes || undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader><DialogTitle>{isEdit ? "编辑" : "添加"}技能记录</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          {!isEdit && (
            <div><Label>员工ID *</Label><Input type="number" value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>技能名称 *</Label><Input value={form.skillName} onChange={e => setForm({ ...form, skillName: e.target.value })} /></div>
            <div>
              <Label>技能分类</Label>
              <Select value={form.skillCategory} onValueChange={v => setForm({ ...form, skillCategory: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SKILL_CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>当前等级 (1-5)</Label>
              <Select value={form.currentLevel} onValueChange={v => setForm({ ...form, currentLevel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>目标等级 (1-5)</Label>
              <Select value={form.targetLevel} onValueChange={v => setForm({ ...form, targetLevel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>评估日期</Label><Input type="date" value={form.assessmentDate} onChange={e => setForm({ ...form, assessmentDate: e.target.value })} /></div>
          <div><Label>备注</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Review Dialog ──
function ReviewDialog({
  open, onOpenChange, editItem,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editItem: Review | null;
}) {
  const utils = trpc.useUtils();
  const isEdit = !!editItem;
  const [form, setForm] = useState(() => ({
    userId: editItem?.userId?.toString() || "",
    monthDate: editItem?.monthDate || "",
    overallKpiScore: editItem?.overallKpiScore || "",
    bonusCoefficient: editItem?.bonusCoefficient || "",
    gapsText: editItem?.gapsText || "",
    improvementPlanText: editItem?.improvementPlanText || "",
    reviewerComments: editItem?.reviewerComments || "",
    status: editItem?.status || "draft",
  }));
  const [prevEditId, setPrevEditId] = useState<number | null>(null);
  if ((editItem?.id ?? null) !== prevEditId) {
    setPrevEditId(editItem?.id ?? null);
    setForm({
      userId: editItem?.userId?.toString() || "",
      monthDate: editItem?.monthDate || "",
      overallKpiScore: editItem?.overallKpiScore || "",
      bonusCoefficient: editItem?.bonusCoefficient || "",
      gapsText: editItem?.gapsText || "",
      improvementPlanText: editItem?.improvementPlanText || "",
      reviewerComments: editItem?.reviewerComments || "",
      status: editItem?.status || "draft",
    });
  }

  const createMut = trpc.kpiPerformance.reviews.create.useMutation({
    onSuccess: () => { toast.success("月度评审已创建"); utils.kpiPerformance.reviews.list.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`创建失败: ${e.message}`),
  });
  const updateMut = trpc.kpiPerformance.reviews.update.useMutation({
    onSuccess: () => { toast.success("月度评审已更新"); utils.kpiPerformance.reviews.list.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`更新失败: ${e.message}`),
  });
  const saving = createMut.isPending || updateMut.isPending;

  const handleSave = () => {
    if (!form.userId) { toast.error("请输入员工ID"); return; }
    if (!form.monthDate) { toast.error("请选择月份"); return; }
    const payload = {
      monthDate: form.monthDate,
      overallKpiScore: form.overallKpiScore || undefined,
      bonusCoefficient: form.bonusCoefficient || undefined,
      gapsText: form.gapsText || undefined,
      improvementPlanText: form.improvementPlanText || undefined,
      reviewerComments: form.reviewerComments || undefined,
      status: form.status as "draft" | "submitted" | "reviewed" | "finalized",
    };
    if (isEdit) {
      updateMut.mutate({ id: editItem!.id, ...payload });
    } else {
      createMut.mutate({ userId: parseInt(form.userId), ...payload });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader><DialogTitle>{isEdit ? "编辑" : "添加"}月度评审</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          {!isEdit && (
            <div><Label>员工ID *</Label><Input type="number" value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>月份 *</Label><Input type="month" value={form.monthDate} onChange={e => setForm({ ...form, monthDate: e.target.value })} /></div>
            <div>
              <Label>状态</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REVIEW_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>KPI总得分</Label><Input type="number" step="0.01" value={form.overallKpiScore} onChange={e => setForm({ ...form, overallKpiScore: e.target.value })} /></div>
            <div><Label>奖金系数</Label><Input type="number" step="0.01" value={form.bonusCoefficient} onChange={e => setForm({ ...form, bonusCoefficient: e.target.value })} placeholder="如 1.20" /></div>
          </div>
          <div><Label>差距分析</Label><Textarea rows={2} value={form.gapsText} onChange={e => setForm({ ...form, gapsText: e.target.value })} /></div>
          <div><Label>改进计划</Label><Textarea rows={2} value={form.improvementPlanText} onChange={e => setForm({ ...form, improvementPlanText: e.target.value })} /></div>
          <div><Label>评审意见</Label><Textarea rows={2} value={form.reviewerComments} onChange={e => setForm({ ...form, reviewerComments: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Military Order Dialog ──
function MilitaryOrderDialog({
  open, onOpenChange, editItem,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editItem: MilitaryOrder | null;
}) {
  const utils = trpc.useUtils();
  const isEdit = !!editItem;
  const [form, setForm] = useState(() => ({
    userId: editItem?.userId?.toString() || "",
    year: editItem?.year?.toString() || new Date().getFullYear().toString(),
    commitmentText: editItem?.commitmentText || "",
    rewardText: editItem?.rewardText || "",
    consequenceText: editItem?.consequenceText || "",
    status: editItem?.status || "active",
    notes: editItem?.notes || "",
  }));
  const [prevEditId, setPrevEditId] = useState<number | null>(null);
  if ((editItem?.id ?? null) !== prevEditId) {
    setPrevEditId(editItem?.id ?? null);
    setForm({
      userId: editItem?.userId?.toString() || "",
      year: editItem?.year?.toString() || new Date().getFullYear().toString(),
      commitmentText: editItem?.commitmentText || "",
      rewardText: editItem?.rewardText || "",
      consequenceText: editItem?.consequenceText || "",
      status: editItem?.status || "active",
      notes: editItem?.notes || "",
    });
  }

  const createMut = trpc.kpiPerformance.militaryOrders.create.useMutation({
    onSuccess: () => { toast.success("军令状已创建"); utils.kpiPerformance.militaryOrders.list.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`创建失败: ${e.message}`),
  });
  const updateMut = trpc.kpiPerformance.militaryOrders.update.useMutation({
    onSuccess: () => { toast.success("军令状已更新"); utils.kpiPerformance.militaryOrders.list.invalidate(); onOpenChange(false); },
    onError: (e) => toast.error(`更新失败: ${e.message}`),
  });
  const saving = createMut.isPending || updateMut.isPending;

  const handleSave = () => {
    if (!form.commitmentText.trim()) { toast.error("请输入承诺内容"); return; }
    if (!form.userId) { toast.error("请输入员工ID"); return; }
    const payload = {
      commitmentText: form.commitmentText,
      rewardText: form.rewardText || undefined,
      consequenceText: form.consequenceText || undefined,
      status: form.status as "active" | "inactive" | "completed",
      notes: form.notes || undefined,
    };
    if (isEdit) {
      updateMut.mutate({ id: editItem!.id, ...payload });
    } else {
      createMut.mutate({
        userId: parseInt(form.userId),
        year: parseInt(form.year),
        ...payload,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader><DialogTitle>{isEdit ? "编辑" : "添加"}军令状</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>员工ID *</Label><Input type="number" value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} /></div>
              <div><Label>年份 *</Label><Input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></div>
            </div>
          )}
          <div><Label>承诺内容 *</Label><Textarea rows={3} value={form.commitmentText} onChange={e => setForm({ ...form, commitmentText: e.target.value })} placeholder="年度目标承诺..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>奖励条款</Label><Textarea rows={2} value={form.rewardText} onChange={e => setForm({ ...form, rewardText: e.target.value })} /></div>
            <div><Label>惩罚条款</Label><Textarea rows={2} value={form.consequenceText} onChange={e => setForm({ ...form, consequenceText: e.target.value })} /></div>
          </div>
          <div><Label>备注</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div>
            <Label>状态</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">进行中</SelectItem>
                <SelectItem value="inactive">停用</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──
export default function KpiPerformance() {
  const [activeTab, setActiveTab] = useState("positions");

  // Dialog states
  const [posDialogOpen, setPosDialogOpen] = useState(false);
  const [posEditItem, setPosEditItem] = useState<Position | null>(null);
  const [libDialogOpen, setLibDialogOpen] = useState(false);
  const [libEditItem, setLibEditItem] = useState<KpiLibraryItem | null>(null);
  const [tgtDialogOpen, setTgtDialogOpen] = useState(false);
  const [tgtEditItem, setTgtEditItem] = useState<KpiTarget | null>(null);
  const [sklDialogOpen, setSklDialogOpen] = useState(false);
  const [sklEditItem, setSklEditItem] = useState<Skill | null>(null);
  const [revDialogOpen, setRevDialogOpen] = useState(false);
  const [revEditItem, setRevEditItem] = useState<Review | null>(null);
  const [moDialogOpen, setMoDialogOpen] = useState(false);
  const [moEditItem, setMoEditItem] = useState<MilitaryOrder | null>(null);

  // Data queries
  const { data: posData, isLoading: posLoading } = trpc.kpiPerformance.positions.list.useQuery({});
  const { data: libData, isLoading: libLoading } = trpc.kpiPerformance.library.list.useQuery({});
  const { data: sklData } = trpc.kpiPerformance.skills.list.useQuery({});
  const { data: moData } = trpc.kpiPerformance.militaryOrders.list.useQuery({});
  const { data: tgtData } = trpc.kpiPerformance.targets.list.useQuery({});
  const { data: revData } = trpc.kpiPerformance.reviews.list.useQuery({});

  const positions = (posData?.items ?? []) as Position[];
  const library = (libData?.items ?? []) as KpiLibraryItem[];
  const targets = (tgtData?.items ?? []) as KpiTarget[];
  const skills = (sklData?.items ?? []) as Skill[];
  const reviews = (revData?.items ?? []) as Review[];
  const militaryOrders = (moData?.items ?? []) as MilitaryOrder[];

  const utils = trpc.useUtils();

  // Sign & witness mutations
  const signMut = trpc.kpiPerformance.militaryOrders.sign.useMutation({
    onSuccess: () => { toast.success("军令状已签署"); utils.kpiPerformance.militaryOrders.list.invalidate(); },
    onError: (e) => toast.error(`签署失败: ${e.message}`),
  });
  const witnessMut = trpc.kpiPerformance.militaryOrders.witness.useMutation({
    onSuccess: () => { toast.success("军令状已见证"); utils.kpiPerformance.militaryOrders.list.invalidate(); },
    onError: (e) => toast.error(`见证失败: ${e.message}`),
  });

  const handleSign = (item: MilitaryOrder) => signMut.mutate({ id: item.id });
  const handleWitness = (item: MilitaryOrder) => witnessMut.mutate({ id: item.id, witnessedBy: 1 });

  // Add handlers
  const openAdd = () => {
    if (activeTab === "positions") { setPosEditItem(null); setPosDialogOpen(true); }
    else if (activeTab === "library") { setLibEditItem(null); setLibDialogOpen(true); }
    else if (activeTab === "targets") { setTgtEditItem(null); setTgtDialogOpen(true); }
    else if (activeTab === "skills") { setSklEditItem(null); setSklDialogOpen(true); }
    else if (activeTab === "reviews") { setRevEditItem(null); setRevDialogOpen(true); }
    else if (activeTab === "orders") { setMoEditItem(null); setMoDialogOpen(true); }
  };

  const isLoading = posLoading || libLoading;

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          icon={Target}
          title="KPI绩效管理"
          description="岗位画像、KPI指标库、目标设定、技能矩阵、月度评审与军令状"
          actions={isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : undefined}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="岗位画像" value={positions.length} />
          <StatCard icon={BookOpen} label="KPI指标" value={library.length} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={BrainCircuit} label="技能记录" value={skills.length} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
          <StatCard icon={Scroll} label="军令状" value={militaryOrders.length} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="positions">岗位画像</TabsTrigger>
              <TabsTrigger value="library">指标库</TabsTrigger>
              <TabsTrigger value="targets">KPI目标</TabsTrigger>
              <TabsTrigger value="skills">技能矩阵</TabsTrigger>
              <TabsTrigger value="reviews">月度评审</TabsTrigger>
              <TabsTrigger value="orders">军令状</TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" />添加
            </Button>
          </div>

          <TabsContent value="positions">
            <PositionsTab items={positions} onEdit={item => { setPosEditItem(item); setPosDialogOpen(true); }} />
          </TabsContent>
          <TabsContent value="library">
            <LibraryTab items={library} onEdit={item => { setLibEditItem(item); setLibDialogOpen(true); }} />
          </TabsContent>
          <TabsContent value="targets">
            <TargetsTab items={targets} onEdit={item => { setTgtEditItem(item); setTgtDialogOpen(true); }} />
          </TabsContent>
          <TabsContent value="skills">
            <SkillsTab items={skills} onEdit={item => { setSklEditItem(item); setSklDialogOpen(true); }} />
          </TabsContent>
          <TabsContent value="reviews">
            <ReviewsTab items={reviews} onEdit={item => { setRevEditItem(item); setRevDialogOpen(true); }} />
          </TabsContent>
          <TabsContent value="orders">
            <MilitaryOrdersTab
              items={militaryOrders}
              onEdit={item => { setMoEditItem(item); setMoDialogOpen(true); }}
              onSign={handleSign}
              onWitness={handleWitness}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <PositionDialog open={posDialogOpen} onOpenChange={setPosDialogOpen} editItem={posEditItem} />
      <LibraryDialog open={libDialogOpen} onOpenChange={setLibDialogOpen} editItem={libEditItem} />
      <TargetDialog open={tgtDialogOpen} onOpenChange={setTgtDialogOpen} editItem={tgtEditItem} />
      <SkillDialog open={sklDialogOpen} onOpenChange={setSklDialogOpen} editItem={sklEditItem} />
      <ReviewDialog open={revDialogOpen} onOpenChange={setRevDialogOpen} editItem={revEditItem} />
      <MilitaryOrderDialog open={moDialogOpen} onOpenChange={setMoDialogOpen} editItem={moEditItem} />
    </>
  );
}
