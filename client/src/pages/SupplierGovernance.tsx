/**
 * SupplierGovernance — 供应商治理体系
 * Route: /supplier-governance
 *
 * CEO 倪亚东批复的供应商管理流程:
 * 6 Tabs: 总览 / 审核计划 / 新供应商准入 / 季度抽检 / 评标委员会 / 淘汰与报告
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, ClipboardCheck, UserPlus, Search, FileCheck, Trash2,
  BarChart3, AlertTriangle, CheckCircle2, XCircle, Clock, Users,
  ChevronRight, Plus, FileText, Upload, Lock,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    planned: { label: "已计划", cls: "bg-blue-100 text-blue-700" },
    in_progress: { label: "进行中", cls: "bg-amber-100 text-amber-700" },
    completed: { label: "已完成", cls: "bg-green-100 text-green-700" },
    cancelled: { label: "已取消", cls: "bg-gray-100 text-gray-500" },
    draft: { label: "草稿", cls: "bg-gray-100 text-gray-600" },
    submitted: { label: "已提交", cls: "bg-blue-100 text-blue-700" },
    quality_review: { label: "质量审核中", cls: "bg-purple-100 text-purple-700" },
    quality_passed: { label: "质量通过", cls: "bg-green-100 text-green-700" },
    quality_rejected: { label: "质量不通过", cls: "bg-red-100 text-red-700" },
    commercial_review: { label: "商务洽谈", cls: "bg-cyan-100 text-cyan-700" },
    special_approval: { label: "特批中", cls: "bg-amber-100 text-amber-700" },
    pending_sign_off: { label: "待签字", cls: "bg-orange-100 text-orange-700" },
    approved: { label: "已批准", cls: "bg-green-100 text-green-700" },
    rejected: { label: "已驳回", cls: "bg-red-100 text-red-700" },
    proposed: { label: "已提议", cls: "bg-amber-100 text-amber-700" },
    under_review: { label: "审核中", cls: "bg-blue-100 text-blue-700" },
    executed: { label: "已执行", cls: "bg-green-100 text-green-700" },
    pending: { label: "待处理", cls: "bg-amber-100 text-amber-700" },
    conforming: { label: "合格", cls: "bg-green-100 text-green-700" },
    minor_issue: { label: "轻微问题", cls: "bg-yellow-100 text-yellow-700" },
    major_issue: { label: "严重问题", cls: "bg-orange-100 text-orange-700" },
    critical: { label: "关键问题", cls: "bg-red-100 text-red-700" },
  };
  const cfg = map[status] || { label: status, cls: "bg-gray-100 text-gray-600" };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>;
}

function StatCard({ title, value, icon: Icon, color = "text-primary" }: { title: string; value: string | number; icon: React.ComponentType<{className?:string}>; color?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-lg p-2 bg-muted ${color}`}><Icon className="h-5 w-5" /></div>
        <div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{title}</div></div>
      </CardContent>
    </Card>
  );
}

// ── Tab: Overview ────────────────────────────────────────────

function OverviewTab() {
  const dash = trpc.supplierGovernance.dashboard.useQuery();
  const d = dash.data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="审核计划" value={d?.totalPlans ?? "—"} icon={ClipboardCheck} color="text-blue-600" />
        <StatCard title="待审准入" value={d?.pendingApps ?? "—"} icon={UserPlus} color="text-purple-600" />
        <StatCard title="2026年抽检" value={d?.spotChecks2026 ?? "—"} icon={Search} color="text-cyan-600" />
        <StatCard title="待淘汰" value={d?.pendingEliminations ?? "—"} icon={Trash2} color="text-red-600" />
      </div>

      {/* CEO Policy Summary */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-amber-500" />CEO批复 — 供应商治理政策 (2026-03)</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /><span><b>ISO体系强制</b>: 无ISO体系原则上不用，需特批（倪微薇参与）</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /><span><b>杜绝单一供应商</b>: 关键件必须≥2家供应商，引入竞争</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /><span><b>季度抽检</b>: 金晓锋、戴晓燕各抽5单/季度，王秀萍全程参与</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /><span><b>评标委员会</b>: 戴晓燕、金晓锋、王秀萍（财务）为监督成员</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /><span><b>审核计划</b>: 沈迎凤制定全年供应商审核计划</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /><span><b>签字批准</b>: 周辉、徐树奎对供应商负责签字批准</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /><span><b>月度报告</b>: 沈迎凤出具月度供应商评估淘汰报告</span></div>
        </CardContent>
      </Card>

      {/* Single-source warnings */}
      {d?.singleSourceCategories && (d.singleSourceCategories as any[]).length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader><CardTitle className="text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />单一供应商风险预警</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {(d.singleSourceCategories as Array<{supply_category:string;cnt:number}>).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                  <span className="font-medium">{c.supply_category || "未分类"}</span>
                  <span className="text-muted-foreground">— 仅 {c.cnt} 家活跃供应商</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Tab: Audit Plans ─────────────────────────────────────────

function AuditPlansTab() {
  const plans = trpc.supplierGovernance.listAuditPlans.useQuery({ year: 2026 });
  const createMut = trpc.supplierGovernance.createAuditPlan.useMutation({ onSuccess: () => plans.refetch() });
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", planType: "regular" as string, quarter: 1 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">2026年审核计划 (沈迎凤制定)</h3>
        <Button size="sm" onClick={() => setShowForm(v => !v)}><Plus className="h-3.5 w-3.5 mr-1" />新建计划</Button>
      </div>
      {showForm && (
        <Card><CardContent className="pt-4 space-y-3">
          <Input placeholder="计划标题" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
          <div className="flex gap-2">
            <select className="border rounded px-2 py-1 text-sm" value={form.planType} onChange={e => setForm(f => ({...f, planType: e.target.value}))}>
              <option value="regular">常规审核</option><option value="new_supplier">新供应商</option><option value="elimination">淘汰评估</option><option value="spot_check">抽检</option>
            </select>
            <select className="border rounded px-2 py-1 text-sm" value={form.quarter} onChange={e => setForm(f => ({...f, quarter: Number(e.target.value)}))}>
              {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
            </select>
            <Button size="sm" onClick={() => { createMut.mutate({ title: form.title, year: 2026, quarter: form.quarter, planType: form.planType as any, auditTeam: ["金晓锋","戴晓燕","沈迎凤"] }); setShowForm(false); toast({ title: "计划已创建" }); }}>
              创建
            </Button>
          </div>
        </CardContent></Card>
      )}
      <div className="space-y-2">
        {(plans.data as any[] || []).map((p: any) => (
          <Card key={p.id}>
            <CardContent className="flex items-center justify-between p-3">
              <div>
                <div className="font-medium text-sm">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.plan_code} · {p.plan_type} · Q{p.quarter || "—"}</div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={p.status} />
                <span className="text-xs text-muted-foreground">{p.created_by}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {!(plans.data as any[])?.length && <div className="text-center py-8 text-muted-foreground text-sm">暂无审核计划</div>}
      </div>
    </div>
  );
}

// ── Tab: New Supplier Qualification ──────────────────────────

function QualificationTab() {
  const apps = trpc.supplierGovernance.listQualifications.useQuery();
  const expiring = trpc.supplierGovernance.listExpiringSuppliers.useQuery();
  const submitMut = trpc.supplierGovernance.submitQualification.useMutation({ onSuccess: () => apps.refetch() });
  const advanceMut = trpc.supplierGovernance.advanceQualification.useMutation({ onSuccess: () => apps.refetch() });
  const finalizeMut = trpc.supplierGovernance.finalizeQualification.useMutation({ onSuccess: () => apps.refetch() });
  const completeMut = trpc.supplierGovernance.completeConditionalItem.useMutation({ onSuccess: () => apps.refetch() });
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ supplierName: "", supplyCategory: "", hasIso9001: false, supplierContact: "", supplierPhone: "" });
  const [finalizeId, setFinalizeId] = useState<number | null>(null);
  const [ff, setFF] = useState({ formalCode: "", supplyScope: "", validFrom: new Date().toISOString().slice(0,10), validUntil: new Date(Date.now()+365*86400000).toISOString().slice(0,10), isConditional: false, conditionalItem: "", conditionalDeadline: "", reviewCycle: 12 });

  const flowSteps = [
    { key: "submitted", label: "申请提交", role: "采购工程师" },
    { key: "quality_review", label: "质量审核", role: "金晓锋/戴晓燕" },
    { key: "commercial_review", label: "商务洽谈", role: "沈迎凤" },
    { key: "pending_sign_off", label: "BU经理签字", role: "周辉/徐树奎" },
    { key: "approved", label: "准入批准", role: "" },
    { key: "finalize", label: "分配代号/范围", role: "采购经理" },
  ];

  return (
    <div className="space-y-4">
      {/* Flow */}
      <Card><CardContent className="pt-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {flowSteps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1">
              <div className="flex flex-col items-center min-w-[80px]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i >= flowSteps.length - 1 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{i + 1}</div>
                <span className="text-[10px] font-medium mt-1 text-center">{s.label}</span>
                <span className="text-[9px] text-muted-foreground">{s.role}</span>
              </div>
              {i < flowSteps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-1">
          ⚠️ 无ISO体系→倪微薇特批 · 批准后分配临时代码+正式代号+供货范围+有效期 · 有条件准入需补交资料
        </div>
      </CardContent></Card>

      {/* Expiring / Review Due alerts */}
      {((expiring.data?.expiring as any[]) || []).length > 0 && (
        <Card className="border-orange-200 bg-orange-50/30">
          <CardContent className="pt-3">
            <div className="text-xs font-semibold text-orange-700 mb-2 flex items-center gap-1"><Clock className="h-3.5 w-3.5" />即将到期/需审查 ({(expiring.data?.expiring as any[]).length})</div>
            {(expiring.data?.expiring as any[]).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                <span><b>{e.supplier_name}</b> ({e.formal_code || e.app_code}) — {e.approved_supply_scope || "—"}</span>
                <span className="text-orange-600">有效期至 {e.valid_until || "—"} · 下次审查 {e.next_review_date || "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {((expiring.data?.conditional as any[]) || []).length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-3">
            <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />有条件准入 — 待补资料 ({(expiring.data?.conditional as any[]).length})</div>
            {(expiring.data?.conditional as any[]).map((c: any) => {
              const items = (c.conditional_items || []) as Array<{item:string;deadline:string;completed:boolean}>;
              const pending = items.filter(i => !i.completed);
              return (
                <div key={c.id} className="text-xs py-1.5 border-b last:border-0">
                  <b>{c.supplier_name}</b> ({c.formal_code || c.app_code}) — 待补: {pending.map(i => i.item).join("、") || "全部完成"}
                  {pending.length > 0 && <span className="text-red-500 ml-2">截止: {c.conditional_deadline || "—"}</span>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">新供应商准入申请</h3>
        <Button size="sm" onClick={() => setShowForm(v => !v)}><Plus className="h-3.5 w-3.5 mr-1" />提交申请</Button>
      </div>
      {showForm && (
        <Card><CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="供应商名称 *" value={form.supplierName} onChange={e => setForm(f => ({...f, supplierName: e.target.value}))} />
            <Input placeholder="供应品类 (泵阀/电气/结构件/标准件/密封件) *" value={form.supplyCategory} onChange={e => setForm(f => ({...f, supplyCategory: e.target.value}))} />
            <Input placeholder="联系人" value={form.supplierContact} onChange={e => setForm(f => ({...f, supplierContact: e.target.value}))} />
            <Input placeholder="电话" value={form.supplierPhone} onChange={e => setForm(f => ({...f, supplierPhone: e.target.value}))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.hasIso9001} onChange={e => setForm(f => ({...f, hasIso9001: e.target.checked}))} />
            已获 ISO 9001 认证
          </label>
          {!form.hasIso9001 && <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">⚠️ CEO政策: 无ISO体系原则上不用，提交后自动进入特批流程</div>}
          <Button size="sm" onClick={() => {
            submitMut.mutate({ supplierName: form.supplierName, supplyCategory: form.supplyCategory, hasIso9001: form.hasIso9001, supplierContact: form.supplierContact || undefined, supplierPhone: form.supplierPhone || undefined, requiresSpecialApproval: !form.hasIso9001 });
            setShowForm(false); toast({ title: "申请已提交" });
          }}>提交准入申请</Button>
        </CardContent></Card>
      )}

      {/* Application list */}
      <div className="space-y-2">
        {(apps.data as any[] || []).map((a: any) => {
          const conditionalItems = (a.conditional_items || []) as Array<{item:string;deadline:string;completed:boolean}>;
          return (
          <Card key={a.id} className={a.is_conditional ? "border-amber-200" : ""}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{a.supplier_name}</span>
                  <span className="text-xs text-muted-foreground">{a.app_code}</span>
                  {a.temp_code && <Badge variant="outline" className="text-[9px]">临时: {a.temp_code}</Badge>}
                  {a.formal_code && <Badge className="bg-blue-100 text-blue-700 text-[9px]">{a.formal_code}</Badge>}
                  {a.is_conditional && <Badge variant="outline" className="text-amber-600 border-amber-300 text-[9px]">有条件</Badge>}
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>品类: {a.supply_category || "—"}</span>
                <span>ISO: {a.has_iso_9001 ? "✅" : "❌"}</span>
                {a.approved_supply_scope && <span>供货范围: <b className="text-foreground">{a.approved_supply_scope}</b></span>}
                {a.valid_until && <span>有效至: {a.valid_until}</span>}
                {a.next_review_date && <span>下次审查: {a.next_review_date}</span>}
                {a.requires_special_approval && <Badge variant="outline" className="text-amber-600 border-amber-300">需特批</Badge>}
              </div>

              {/* Conditional items checklist */}
              {a.is_conditional && conditionalItems.length > 0 && (
                <div className="mt-2 bg-amber-50 rounded p-2">
                  <div className="text-[10px] font-semibold text-amber-700 mb-1">待补交资料 (截止: {a.conditional_deadline || "—"})</div>
                  {conditionalItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs py-0.5">
                      {item.completed
                        ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                        : <button onClick={() => { completeMut.mutate({ appId: a.id, itemIndex: idx }); toast({ title: `"${item.item}" 已标记完成` }); }} className="h-3 w-3 border rounded shrink-0 hover:bg-green-100" />
                      }
                      <span className={item.completed ? "line-through text-muted-foreground" : ""}>{item.item}</span>
                      <span className="text-muted-foreground ml-auto">{item.deadline}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-2">
                {a.status === "submitted" && (
                  <>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { advanceMut.mutate({ appId: a.id, action: "quality_pass" }); toast({ title: "质量审核通过" }); }}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />质量通过 (金/戴)
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 text-red-600" onClick={() => { advanceMut.mutate({ appId: a.id, action: "quality_reject" }); }}>
                      <XCircle className="h-3 w-3 mr-1" />不通过
                    </Button>
                  </>
                )}
                {a.status === "commercial_review" && (
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { advanceMut.mutate({ appId: a.id, action: a.requires_special_approval ? "special_approve" : "commercial_done" }); }}>
                    {a.requires_special_approval ? "特批通过 (倪微薇)" : "商务完成 (沈迎凤)"}
                  </Button>
                )}
                {a.status === "pending_sign_off" && (
                  <Button size="sm" variant="default" className="text-xs h-7" onClick={() => { advanceMut.mutate({ appId: a.id, action: "sign_off" }); toast({ title: "已签字批准" }); }}>
                    <FileCheck className="h-3 w-3 mr-1" />签字批准 (周辉/徐树奎)
                  </Button>
                )}
                {a.status === "approved" && !a.formal_code && (
                  finalizeId === a.id ? (
                    <Card className="w-full mt-1 border-blue-200"><CardContent className="pt-3 space-y-2">
                      <div className="text-xs font-semibold text-blue-700">分配正式代号 & 供货范围</div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input className="h-7 text-xs" placeholder="正式代号 (如SUP-2026-001)" value={ff.formalCode} onChange={e => setFF(f => ({...f, formalCode: e.target.value}))} />
                        <Input className="h-7 text-xs" placeholder="供货范围 (如:超声波振棒/泵阀)" value={ff.supplyScope} onChange={e => setFF(f => ({...f, supplyScope: e.target.value}))} />
                        <Input type="date" className="h-7 text-xs" value={ff.validFrom} onChange={e => setFF(f => ({...f, validFrom: e.target.value}))} />
                        <Input type="date" className="h-7 text-xs" value={ff.validUntil} onChange={e => setFF(f => ({...f, validUntil: e.target.value}))} />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={ff.isConditional} onChange={e => setFF(f => ({...f, isConditional: e.target.checked}))} />有条件准入</label>
                        <Input type="number" className="h-7 text-xs w-20" placeholder="审查周期(月)" value={ff.reviewCycle} onChange={e => setFF(f => ({...f, reviewCycle: Number(e.target.value)}))} />
                      </div>
                      {ff.isConditional && (
                        <div className="flex gap-2">
                          <Input className="h-7 text-xs" placeholder="需补交资料项 (如:ISO证书原件)" value={ff.conditionalItem} onChange={e => setFF(f => ({...f, conditionalItem: e.target.value}))} />
                          <Input type="date" className="h-7 text-xs w-36" value={ff.conditionalDeadline} onChange={e => setFF(f => ({...f, conditionalDeadline: e.target.value}))} />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={() => {
                          finalizeMut.mutate({
                            appId: a.id, formalCode: ff.formalCode, approvedSupplyScope: ff.supplyScope,
                            validFrom: ff.validFrom, validUntil: ff.validUntil, isConditional: ff.isConditional,
                            conditionalItems: ff.isConditional && ff.conditionalItem ? [{ item: ff.conditionalItem, deadline: ff.conditionalDeadline, completed: false }] : undefined,
                            conditionalDeadline: ff.conditionalDeadline || undefined, reviewCycleMonths: ff.reviewCycle,
                          });
                          setFinalizeId(null); toast({ title: "正式代号已分配" });
                        }}>确认分配</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setFinalizeId(null)}>取消</Button>
                      </div>
                    </CardContent></Card>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs h-7 text-blue-600" onClick={() => setFinalizeId(a.id)}>
                      分配正式代号 & 供货范围
                    </Button>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        );})}
      </div>
    </div>
  );
}

// ── Tab: Quarterly Spot Checks ───────────────────────────────

function SpotChecksTab() {
  const [quarter, setQuarter] = useState(1);
  const checks = trpc.supplierGovernance.listSpotChecks.useQuery({ year: 2026, quarter });
  const progress = trpc.supplierGovernance.spotCheckProgress.useQuery({ year: 2026, quarter });

  const jinCount = (progress.data?.progress as any[])?.find((p: any) => p.inspector === "金晓锋")?.completed || 0;
  const daiCount = (progress.data?.progress as any[])?.find((p: any) => p.inspector === "戴晓燕")?.completed || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-sm font-semibold">季度抽检 (各5单/季度)</h3>
        <select className="border rounded px-2 py-1 text-sm" value={quarter} onChange={e => setQuarter(Number(e.target.value))}>
          {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
        </select>
      </div>

      {/* Progress bars */}
      <div className="grid grid-cols-2 gap-4">
        {[{ name: "金晓锋", role: "质量经理", count: jinCount }, { name: "戴晓燕", role: "销售经理", count: daiCount }].map(p => (
          <Card key={p.name}><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">{p.name} <span className="text-xs text-muted-foreground">({p.role})</span></div>
              <span className="text-sm font-bold">{p.count}/5</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, (p.count / 5) * 100)}%` }} />
            </div>
          </CardContent></Card>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">财务参与人: 王秀萍 · 每单抽检含: 单据/质量/交期/价格/工艺 五维检查</div>

      {/* Check list */}
      <div className="space-y-2">
        {(checks.data as any[] || []).map((c: any) => (
          <Card key={c.id}><CardContent className="flex items-center justify-between p-3">
            <div>
              <div className="text-sm font-medium">{c.supplier_name}</div>
              <div className="text-xs text-muted-foreground">{c.check_code} · {c.po_number || "—"} · {c.material_name || "—"}</div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={c.overall_result || "—"} />
              <span className="text-xs text-muted-foreground">{c.inspector}</span>
            </div>
          </CardContent></Card>
        ))}
        {!(checks.data as any[])?.length && <div className="text-center py-8 text-muted-foreground text-sm">本季度暂无抽检记录</div>}
      </div>
    </div>
  );
}

// ── Tab: Committee Reviews ───────────────────────────────────

function CommitteeTab() {
  const reviews = trpc.supplierGovernance.listCommitteeReviews.useQuery();
  const createMut = trpc.supplierGovernance.createCommitteeReview.useMutation({ onSuccess: () => reviews.refetch() });
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">评标委员会</h3>
          <div className="text-xs text-muted-foreground mt-0.5">监督成员: 戴晓燕 · 金晓锋 · 王秀萍(财务)</div>
        </div>
        <Button size="sm" onClick={() => {
          createMut.mutate({ reviewType: "bid_evaluation", title: "供应商评标 — " + new Date().toISOString().slice(0, 10) });
          toast({ title: "评标会议已创建" });
        }}><Plus className="h-3.5 w-3.5 mr-1" />新建评标</Button>
      </div>
      <div className="space-y-2">
        {(reviews.data as any[] || []).map((r: any) => {
          const members = (r.committee_members || []) as Array<{name:string;role:string;score:number|null;votedAt:string|null}>;
          const voted = members.filter(m => m.score != null).length;
          return (
            <Card key={r.id}><CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{r.title}</div>
                <StatusBadge status={r.status} />
              </div>
              <div className="flex items-center gap-4 text-xs">
                {members.map(m => (
                  <span key={m.name} className={m.score != null ? "text-green-600" : "text-muted-foreground"}>
                    {m.name}({m.role}): {m.score != null ? `${m.score}分` : "待评"}
                  </span>
                ))}
                <span className="ml-auto text-muted-foreground">{voted}/{members.length} 已评分</span>
              </div>
            </CardContent></Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Elimination & Reports ───────────────────────────────

function EliminationTab() {
  const elims = trpc.supplierGovernance.listEliminations.useQuery();
  const month = new Date().toISOString().slice(0, 7);
  const report = trpc.supplierGovernance.monthlyReport.useQuery({ month });
  const r = report.data;

  return (
    <div className="space-y-6">
      {/* Monthly Report */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" />月度报告 — {month} (沈迎凤)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div><div className="text-2xl font-bold text-blue-600">{r?.auditsCompleted ?? "—"}</div><div className="text-xs text-muted-foreground">审核完成</div></div>
            <div><div className="text-2xl font-bold text-purple-600">{r?.newApplications ?? "—"}</div><div className="text-xs text-muted-foreground">新申请</div></div>
            <div><div className="text-2xl font-bold text-amber-600">{r?.averageAuditScore ?? "—"}</div><div className="text-xs text-muted-foreground">平均审核分</div></div>
            <div><div className="text-2xl font-bold text-red-600">{r?.eliminations ?? "—"}</div><div className="text-xs text-muted-foreground">淘汰数</div></div>
          </div>
        </CardContent>
      </Card>

      {/* Elimination list */}
      <div>
        <h3 className="text-sm font-semibold mb-3">供应商淘汰记录</h3>
        <div className="space-y-2">
          {(elims.data as any[] || []).map((e: any) => (
            <Card key={e.id}><CardContent className="flex items-center justify-between p-3">
              <div>
                <div className="text-sm font-medium">{e.supplier_name}</div>
                <div className="text-xs text-muted-foreground">
                  {e.elimination_code} · 原因: {e.reason} · 替代: {e.replacement_supplier_name || "待定"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={e.status} />
                {e.last_audit_score != null && <span className="text-xs font-mono">{e.last_audit_score}分</span>}
              </div>
            </CardContent></Card>
          ))}
          {!(elims.data as any[])?.length && <div className="text-center py-8 text-muted-foreground text-sm">暂无淘汰记录 — 关键件现有供应商评估淘汰进行中</div>}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Price Comparison & Approval (采购比价审批) ──────────

function PriceComparisonTab() {
  const list = trpc.supplierGovernance.listPriceComparisons.useQuery();
  const submitMut = trpc.supplierGovernance.submitPriceComparison.useMutation({ onSuccess: () => list.refetch() });
  const advanceMut = trpc.supplierGovernance.advancePriceApproval.useMutation({ onSuccess: () => list.refetch() });
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    projectNo: "", projectName: "", materialName: "", materialModel: "",
    quantity: 1, recommendedSupplier: "", recommendedUnitPrice: 0,
    paymentTerms: "", recommendationReason: "", historyBasePrice: 0, historyBaseYear: 2022,
    quotations: [
      { supplierName: "", unitPrice: 0, totalPrice: 0, isLongTermPartner: false, notes: "" },
      { supplierName: "", unitPrice: 0, totalPrice: 0, isLongTermPartner: false, notes: "" },
      { supplierName: "", unitPrice: 0, totalPrice: 0, isLongTermPartner: false, notes: "" },
    ],
  });
  const [negotiateId, setNegotiateId] = useState<number | null>(null);
  const [negotiatePrice, setNegotiatePrice] = useState("");
  const [negotiateNote, setNegotiateNote] = useState("");

  const updateQuotation = (idx: number, field: string, value: any) => {
    setForm(f => {
      const q = [...f.quotations];
      q[idx] = { ...q[idx], [field]: value };
      if (field === "unitPrice") q[idx].totalPrice = value * f.quantity;
      return { ...f, quotations: q };
    });
  };

  // Approval flow steps
  const flowSteps = [
    { status: "price_comparison", label: "比价提交", role: "采购工程师(张洵)" },
    { status: "manager_review", label: "采购经理审批", role: "沈迎凤" },
    { status: "negotiation", label: "项目负责人谈判", role: "周辉/徐树奎" },
    { status: "ceo_approval", label: "CEO审批", role: "倪亚东" },
    { status: "approved", label: "批准执行", role: "" },
  ];

  return (
    <div className="space-y-4">
      {/* Approval flow */}
      <Card><CardContent className="pt-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {flowSteps.map((s, i) => (
            <div key={s.status} className="flex items-center gap-1">
              <div className="flex flex-col items-center min-w-[90px]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i === flowSteps.length - 1 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{i + 1}</div>
                <span className="text-[10px] font-medium mt-1 text-center">{s.label}</span>
                <span className="text-[9px] text-muted-foreground">{s.role}</span>
              </div>
              {i < flowSteps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
      </CardContent></Card>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">采购比价单 & 审批</h3>
        <Button size="sm" onClick={() => setShowForm(v => !v)}><Plus className="h-3.5 w-3.5 mr-1" />新建比价单</Button>
      </div>

      {/* New comparison form */}
      {showForm && (
        <Card><CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="项目号 (如GRT-449)" value={form.projectNo} onChange={e => setForm(f => ({...f, projectNo: e.target.value}))} />
            <Input placeholder="项目名称" value={form.projectName} onChange={e => setForm(f => ({...f, projectName: e.target.value}))} />
            <Input placeholder="物料名称" value={form.materialName} onChange={e => setForm(f => ({...f, materialName: e.target.value}))} />
            <Input placeholder="型号规格" value={form.materialModel} onChange={e => setForm(f => ({...f, materialModel: e.target.value}))} />
            <Input type="number" placeholder="数量" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: Number(e.target.value)}))} />
            <Input placeholder="付款条件" value={form.paymentTerms} onChange={e => setForm(f => ({...f, paymentTerms: e.target.value}))} />
          </div>
          {/* Quotation table */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">三方比价</div>
            <table className="w-full text-sm border rounded overflow-hidden">
              <thead><tr className="bg-muted text-xs">
                <th className="px-2 py-1.5 text-left">供应商</th>
                <th className="px-2 py-1.5 text-right">单价(元)</th>
                <th className="px-2 py-1.5 text-right">总价(元)</th>
                <th className="px-2 py-1.5 text-center">长期合作</th>
                <th className="px-2 py-1.5 text-left">备注</th>
              </tr></thead>
              <tbody>{form.quotations.map((q, i) => (
                <tr key={i} className="border-t">
                  <td className="px-1 py-1"><Input className="h-7 text-xs" placeholder="供应商名称" value={q.supplierName} onChange={e => updateQuotation(i, "supplierName", e.target.value)} /></td>
                  <td className="px-1 py-1"><Input type="number" className="h-7 text-xs text-right" value={q.unitPrice || ""} onChange={e => updateQuotation(i, "unitPrice", Number(e.target.value))} /></td>
                  <td className="px-1 py-1 text-right text-xs font-mono">{q.totalPrice ? `¥${q.totalPrice.toLocaleString()}` : "—"}</td>
                  <td className="px-1 py-1 text-center"><input type="checkbox" checked={q.isLongTermPartner} onChange={e => updateQuotation(i, "isLongTermPartner", e.target.checked)} /></td>
                  <td className="px-1 py-1"><Input className="h-7 text-xs" value={q.notes} onChange={e => updateQuotation(i, "notes", e.target.value)} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {/* History + recommendation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">历史价格</div>
              <div className="flex gap-2">
                <Input type="number" className="h-8 text-xs" placeholder="基准年" value={form.historyBaseYear} onChange={e => setForm(f => ({...f, historyBaseYear: Number(e.target.value)}))} />
                <Input type="number" className="h-8 text-xs" placeholder="基准价" value={form.historyBasePrice || ""} onChange={e => setForm(f => ({...f, historyBasePrice: Number(e.target.value)}))} />
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">推荐供应商</div>
              <Input className="h-8 text-xs" placeholder="推荐供应商名称" value={form.recommendedSupplier} onChange={e => setForm(f => ({...f, recommendedSupplier: e.target.value}))} />
            </div>
          </div>
          <Button size="sm" onClick={() => {
            const lowest = form.quotations.reduce((min, q) => q.unitPrice > 0 && q.unitPrice < min ? q.unitPrice : min, Infinity);
            const histReduction = form.historyBasePrice > 0 ? Math.round((1 - lowest / form.historyBasePrice) * 100) : 0;
            submitMut.mutate({
              ...form,
              recommendedUnitPrice: lowest,
              historyReductionPct: histReduction,
              quotations: form.quotations.filter(q => q.supplierName),
            });
            setShowForm(false);
            toast({ title: "比价单已提交" });
          }}>提交比价单</Button>
        </CardContent></Card>
      )}

      {/* List */}
      <div className="space-y-3">
        {(list.data as any[] || []).map((c: any) => {
          const quotations = (c.quotations || []) as Array<{supplierName:string;unitPrice:number;totalPrice:number;isLongTermPartner?:boolean}>;
          return (
            <Card key={c.id} className={c.status === "approved" ? "border-green-200 bg-green-50/30" : ""}>
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-sm">{c.material_name}</div>
                    <div className="text-xs text-muted-foreground">{c.comparison_code} · {c.project_no || "—"} {c.project_name || ""} · {c.quantity}{c.unit}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                {/* Comparison table */}
                <table className="w-full text-xs border rounded mb-3">
                  <thead><tr className="bg-muted">
                    <th className="px-2 py-1 text-left">供应商</th>
                    <th className="px-2 py-1 text-right">单价</th>
                    <th className="px-2 py-1 text-right">总价</th>
                    <th className="px-2 py-1 text-center">差价</th>
                  </tr></thead>
                  <tbody>{quotations.map((q, i) => {
                    const minPrice = Math.min(...quotations.map(x => x.unitPrice).filter(x => x > 0));
                    const isLowest = q.unitPrice === minPrice;
                    const diff = q.unitPrice - minPrice;
                    return (
                      <tr key={i} className={`border-t ${isLowest ? "bg-green-50 font-medium" : ""}`}>
                        <td className="px-2 py-1">{q.supplierName} {q.isLongTermPartner ? <Badge variant="outline" className="text-[9px] ml-1 px-1 py-0">长期</Badge> : ""}</td>
                        <td className="px-2 py-1 text-right font-mono">¥{q.unitPrice?.toLocaleString()}</td>
                        <td className="px-2 py-1 text-right font-mono">¥{q.totalPrice?.toLocaleString()}</td>
                        <td className="px-2 py-1 text-center">{isLowest ? <span className="text-green-600">最低</span> : <span className="text-red-500">+¥{diff.toLocaleString()}</span>}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
                {/* History + recommendation */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                  {c.history_base_price && <span>历史基准: {c.history_base_year}年 ¥{Number(c.history_base_price).toLocaleString()} → 降幅{c.history_reduction_pct}%</span>}
                  <span>推荐: <b className="text-foreground">{c.recommended_supplier}</b> ¥{Number(c.recommended_unit_price).toLocaleString()}/套</span>
                  {c.payment_terms && <span>付款: {c.payment_terms}</span>}
                  {c.negotiated_price && <span>谈判价: <b className="text-emerald-600">¥{Number(c.negotiated_price).toLocaleString()}</b></span>}
                </div>
                {/* Approval trail */}
                <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground mb-2">
                  {c.applicant && <span>申请: {c.applicant} ({c.applicant_date})</span>}
                  {c.procurement_manager && <span>采购经理: {c.procurement_manager} ({c.procurement_manager_date})</span>}
                  {c.negotiator && <span>谈判: {c.negotiator} ({c.negotiation_date})</span>}
                  {c.ceo_approver && <span>CEO: {c.ceo_approver} ({c.ceo_approved_date})</span>}
                </div>
                {/* Action buttons */}
                <div className="flex gap-2">
                  {c.status === "price_comparison" && (
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { advanceMut.mutate({ id: c.id, action: "manager_approve" }); toast({ title: "采购经理已审批" }); }}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />采购经理审批 (沈迎凤)
                    </Button>
                  )}
                  {c.status === "negotiation" && (
                    negotiateId === c.id ? (
                      <div className="flex items-center gap-2">
                        <Input type="number" className="h-7 w-28 text-xs" placeholder="谈判后价格" value={negotiatePrice} onChange={e => setNegotiatePrice(e.target.value)} />
                        <Input className="h-7 w-40 text-xs" placeholder="谈判备注" value={negotiateNote} onChange={e => setNegotiateNote(e.target.value)} />
                        <Button size="sm" className="h-7 text-xs" onClick={() => {
                          advanceMut.mutate({ id: c.id, action: "submit_negotiated_price", negotiatedPrice: Number(negotiatePrice), opinion: negotiateNote });
                          setNegotiateId(null);
                          toast({ title: "谈判结果已提交，转CEO审批" });
                        }}>提交</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setNegotiateId(c.id); setNegotiatePrice(String(c.recommended_unit_price)); }}>
                        <FileCheck className="h-3 w-3 mr-1" />提交谈判结果 (周辉/徐树奎)
                      </Button>
                    )
                  )}
                  {c.status === "ceo_approval" && (
                    <>
                      <Button size="sm" variant="default" className="text-xs h-7" onClick={() => { advanceMut.mutate({ id: c.id, action: "ceo_approve" }); toast({ title: "CEO已批准" }); }}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />CEO批准 (倪亚东)
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs h-7 text-red-600" onClick={() => { advanceMut.mutate({ id: c.id, action: "ceo_reject", opinion: "价格需进一步谈判" }); }}>
                        <XCircle className="h-3 w-3 mr-1" />驳回
                      </Button>
                    </>
                  )}
                  {c.status === "approved" && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />已批准 — 可执行采购</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!(list.data as any[])?.length && <div className="text-center py-8 text-muted-foreground text-sm">暂无比价单</div>}
      </div>
    </div>
  );
}

// ── Internal Upload Component (采购工程师代传) ────────────────

const DOC_TYPE_OPTIONS = [
  { value: "iso_9001_cert", label: "ISO 9001 证书", category: "certification" },
  { value: "iso_14001_cert", label: "ISO 14001 证书", category: "certification" },
  { value: "iatf_16949_cert", label: "IATF 16949 证书", category: "certification" },
  { value: "business_license", label: "营业执照", category: "legal" },
  { value: "quality_report", label: "质量体系报告", category: "quality" },
  { value: "test_report", label: "产品测试报告", category: "quality" },
  { value: "signed_confirmation", label: "签字确认函", category: "legal" },
  { value: "capability_statement", label: "生产能力说明", category: "commercial" },
  { value: "price_list", label: "报价单/价格表", category: "commercial" },
  { value: "other", label: "其他资料", category: "other" },
] as const;

function InternalUploadSection({ onUploaded }: { onUploaded: () => void }) {
  const uploadMut = trpc.supplierGovernance.internalUploadDocument.useMutation({ onSuccess: onUploaded });
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ supplierName: "", docType: "iso_9001_cert", fileName: "", fileSize: 0, notes: "", autoConfirm: false });
  const [file, setFile] = useState<File | null>(null);

  if (!open) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Upload className="h-4 w-4" />
            GRT采购工程师代传供应商资料
          </div>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />内部上传</Button>
        </CardContent>
      </Card>
    );
  }

  const dt = DOC_TYPE_OPTIONS.find(t => t.value === form.docType);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4 text-blue-500" />采购工程师代传供应商资料</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="供应商名称 *" value={form.supplierName} onChange={e => setForm(f => ({...f, supplierName: e.target.value}))} />
          <select className="border rounded px-3 py-2 text-sm" value={form.docType} onChange={e => setForm(f => ({...f, docType: e.target.value}))}>
            {DOC_TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            className="text-sm border rounded px-3 py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-600 file:text-xs"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setForm(prev => ({...prev, fileName: f.name, fileSize: f.size})); } }} />
          <Input placeholder="备注 (可选)" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={form.autoConfirm} onChange={e => setForm(f => ({...f, autoConfirm: e.target.checked}))} />
            直接确认锁定 (跳过供应商确认步骤)
          </label>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>取消</Button>
            <Button size="sm" disabled={!file || !form.supplierName || uploadMut.isPending} onClick={() => {
              uploadMut.mutate({
                supplierName: form.supplierName,
                docType: form.docType as any,
                docCategory: (dt?.category || "other") as any,
                fileName: form.fileName, fileSize: form.fileSize,
                notes: form.notes || undefined, autoConfirm: form.autoConfirm,
              });
              setOpen(false); setFile(null);
              toast({ title: form.autoConfirm ? "文档已上传并锁定" : "文档已上传，待确认" });
            }}>
              <Upload className="h-3.5 w-3.5 mr-1" />上传
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Tab: Supplier Portal & Documents (供应商门户管理) ────────

function PortalTab() {
  const tokens = trpc.supplierGovernance.listPortalTokens.useQuery();
  const docs = trpc.supplierGovernance.listDocuments.useQuery();
  const genMut = trpc.supplierGovernance.generatePortalToken.useMutation({ onSuccess: () => tokens.refetch() });
  const revokeTkMut = trpc.supplierGovernance.revokePortalToken.useMutation({ onSuccess: () => tokens.refetch() });
  const approveRevokeMut = trpc.supplierGovernance.approveDocRevoke.useMutation({ onSuccess: () => docs.refetch() });
  const { toast } = useToast();
  const [showGen, setShowGen] = useState(false);
  const [genForm, setGenForm] = useState({ supplierName: "", supplierEmail: "", expiresInDays: 30 });
  const [newToken, setNewToken] = useState<string | null>(null);

  const pendingRevokes = ((docs.data || []) as any[]).filter((d: any) => d.status === "revoke_requested");

  return (
    <div className="space-y-6">
      {/* Generate portal link */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">供应商门户令牌</h3>
          <p className="text-xs text-muted-foreground">发放链接给供应商 → 供应商自行上传资质资料</p>
        </div>
        <Button size="sm" onClick={() => setShowGen(v => !v)}><Plus className="h-3.5 w-3.5 mr-1" />生成门户链接</Button>
      </div>

      {showGen && (
        <Card><CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="供应商名称" value={genForm.supplierName} onChange={e => setGenForm(f => ({...f, supplierName: e.target.value}))} />
            <Input placeholder="联系邮箱" value={genForm.supplierEmail} onChange={e => setGenForm(f => ({...f, supplierEmail: e.target.value}))} />
            <Input type="number" placeholder="有效天数" value={genForm.expiresInDays} onChange={e => setGenForm(f => ({...f, expiresInDays: Number(e.target.value)}))} />
          </div>
          <Button size="sm" onClick={async () => {
            const result = await genMut.mutateAsync({ supplierName: genForm.supplierName, supplierEmail: genForm.supplierEmail || undefined, expiresInDays: genForm.expiresInDays });
            setNewToken(result.portalUrl);
            setShowGen(false);
            toast({ title: "门户链接已生成" });
          }}>生成</Button>
          {newToken && (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
              <div className="text-green-700 font-medium mb-1">门户链接已生成，发送给供应商:</div>
              <code className="text-xs bg-white px-2 py-1 rounded border block break-all">{window.location.origin}{newToken}</code>
              <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => { navigator.clipboard.writeText(window.location.origin + newToken); toast({ title: "已复制" }); }}>复制链接</Button>
            </div>
          )}
        </CardContent></Card>
      )}

      {/* Active tokens */}
      <div className="space-y-2">
        {((tokens.data || []) as any[]).map((tk: any) => (
          <Card key={tk.id}><CardContent className="flex items-center justify-between p-3">
            <div>
              <span className="font-medium text-sm">{tk.supplier_name}</span>
              <span className="text-xs text-muted-foreground ml-2">{tk.supplier_email || ""}</span>
              <div className="text-xs text-muted-foreground">用途: {tk.purpose} · 使用: {tk.use_count}/{tk.max_uses} · 过期: {tk.expires_at?.slice(0,10)}</div>
            </div>
            <div className="flex items-center gap-2">
              {tk.is_active ? <Badge className="bg-green-100 text-green-700">活跃</Badge> : <Badge variant="outline">停用</Badge>}
              {tk.is_active && <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => { revokeTkMut.mutate({ tokenId: tk.id }); toast({ title: "令牌已停用" }); }}>停用</Button>}
            </div>
          </CardContent></Card>
        ))}
      </div>

      {/* Internal upload by GRT procurement engineer */}
      <InternalUploadSection onUploaded={() => docs.refetch()} />

      {/* Pending revoke requests (GRT internal approval) */}
      {pendingRevokes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-orange-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />待审批的撤销申请 ({pendingRevokes.length})</h3>
          {pendingRevokes.map((d: any) => (
            <Card key={d.id} className="border-orange-200 mb-2"><CardContent className="flex items-center justify-between p-3">
              <div>
                <span className="text-sm font-medium">{d.supplier_name}</span> — <span className="text-xs">{d.file_name}</span>
                <div className="text-xs text-muted-foreground">撤销原因: {d.revoke_reason}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs text-green-600" onClick={() => { approveRevokeMut.mutate({ docId: d.id, approve: true }); toast({ title: "撤销已批准" }); }}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />批准撤销
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-red-500" onClick={() => { approveRevokeMut.mutate({ docId: d.id, approve: false }); toast({ title: "撤销已拒绝" }); }}>
                  拒绝
                </Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* All documents overview */}
      <div>
        <h3 className="text-sm font-semibold mb-2">供应商上传文档总览</h3>
        <div className="space-y-1">
          {((docs.data || []) as any[]).slice(0, 20).map((d: any) => (
            <div key={d.id} className="flex items-center gap-3 text-xs py-1.5 border-b last:border-0">
              <span className="font-medium w-24 truncate">{d.supplier_name}</span>
              <span className="text-muted-foreground w-28 truncate">{d.file_name}</span>
              <span className="text-muted-foreground">{d.doc_type}</span>
              <StatusBadge status={d.status} />
              {d.is_immutable && <Lock className="h-3 w-3 text-gray-400" />}
              <span className="ml-auto text-muted-foreground">{d.created_at?.slice(0,10)}</span>
            </div>
          ))}
          {!((docs.data || []) as any[]).length && <div className="text-center py-4 text-muted-foreground text-sm">暂无供应商上传文档</div>}
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────

// ── Tab: 竞价中心 (Competitive Bidding Engine) ───────────────

function BiddingTab() {
  const list = trpc.supplierGovernance.listBiddingProjects.useQuery();
  const createMut = trpc.supplierGovernance.createBiddingProject.useMutation({ onSuccess: () => list.refetch() });
  const openMut = trpc.supplierGovernance.openBidding.useMutation({ onSuccess: () => list.refetch() });
  const submitBidMut = trpc.supplierGovernance.submitBid.useMutation({ onSuccess: () => { detailQuery.refetch(); } });
  const closeRoundMut = trpc.supplierGovernance.closeRound.useMutation({ onSuccess: () => { list.refetch(); detailQuery.refetch(); } });
  const awardMut = trpc.supplierGovernance.awardBidding.useMutation({ onSuccess: () => list.refetch() });
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [bidForm, setBidForm] = useState({ supplierName: "", unitPrice: 0, leadTimeDays: 14, paymentTerms: "" });
  const [createForm, setCreateForm] = useState({
    title: "", projectNo: "", materialName: "", quantity: 1,
    budgetCeiling: 0, maxRounds: 3, biddingType: "sealed" as string,
    suppliers: ["", "", ""],
    weightPrice: 40, weightQuality: 25, weightDelivery: 20, weightService: 15,
  });

  const detailQuery = trpc.supplierGovernance.getBiddingDetail.useQuery(
    { id: selectedId! }, { enabled: selectedId != null }
  );
  const detail = detailQuery.data;

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600", open: "bg-blue-100 text-blue-700",
    round_closed: "bg-amber-100 text-amber-700", evaluating: "bg-purple-100 text-purple-700",
    awarded: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
  };
  const statusLabels: Record<string, string> = {
    draft: "草稿", open: "竞价中", round_closed: "本轮已关闭",
    evaluating: "评标中", awarded: "已定标", cancelled: "已取消",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">竞价中心</h3>
          <p className="text-xs text-muted-foreground">多轮密封竞价 · 自动评分排名 · 加权综合评标</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(v => !v)}><Plus className="h-3.5 w-3.5 mr-1" />创建竞价</Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card><CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="竞价标题" value={createForm.title} onChange={e => setCreateForm(f => ({...f, title: e.target.value}))} />
            <Input placeholder="项目号 (如GRT-449)" value={createForm.projectNo} onChange={e => setCreateForm(f => ({...f, projectNo: e.target.value}))} />
            <Input placeholder="物料名称" value={createForm.materialName} onChange={e => setCreateForm(f => ({...f, materialName: e.target.value}))} />
            <Input type="number" placeholder="数量" value={createForm.quantity} onChange={e => setCreateForm(f => ({...f, quantity: Number(e.target.value)}))} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Input type="number" placeholder="预算上限(元)" value={createForm.budgetCeiling || ""} onChange={e => setCreateForm(f => ({...f, budgetCeiling: Number(e.target.value)}))} />
            <select className="border rounded px-2 py-1.5 text-sm" value={createForm.biddingType} onChange={e => setCreateForm(f => ({...f, biddingType: e.target.value}))}>
              <option value="sealed">密封竞价</option><option value="open">公开竞价</option><option value="reverse_auction">反向拍卖</option>
            </select>
            <Input type="number" placeholder="最大轮次" value={createForm.maxRounds} onChange={e => setCreateForm(f => ({...f, maxRounds: Number(e.target.value)}))} />
            <div className="text-xs text-muted-foreground self-center">最少{3}家供应商参与</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">评分权重 (%)</div>
            <div className="grid grid-cols-4 gap-2">
              {[["weightPrice","价格",createForm.weightPrice],["weightQuality","质量",createForm.weightQuality],["weightDelivery","交期",createForm.weightDelivery],["weightService","服务",createForm.weightService]].map(([k,l,v]) => (
                <div key={k as string} className="flex items-center gap-1">
                  <span className="text-xs w-8">{l as string}</span>
                  <Input type="number" className="h-7 text-xs" value={v as number} onChange={e => setCreateForm(f => ({...f, [k as string]: Number(e.target.value)}))} />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">邀请供应商 (≥3家)</div>
            <div className="grid grid-cols-3 gap-2">
              {createForm.suppliers.map((s, i) => (
                <Input key={i} placeholder={`供应商${i+1}`} value={s} onChange={e => {
                  const arr = [...createForm.suppliers]; arr[i] = e.target.value;
                  setCreateForm(f => ({...f, suppliers: arr}));
                }} />
              ))}
            </div>
            <Button size="sm" variant="ghost" className="mt-1 text-xs h-6" onClick={() => setCreateForm(f => ({...f, suppliers: [...f.suppliers, ""]}))}>+ 添加供应商</Button>
          </div>
          <Button size="sm" onClick={() => {
            createMut.mutate({
              title: createForm.title, projectNo: createForm.projectNo || undefined,
              materialName: createForm.materialName, quantity: createForm.quantity,
              budgetCeiling: createForm.budgetCeiling || undefined,
              biddingType: createForm.biddingType as any,
              maxRounds: createForm.maxRounds, minBidders: 3,
              invitedSuppliers: createForm.suppliers.filter(Boolean).map(n => ({ name: n })),
              weightPrice: createForm.weightPrice, weightQuality: createForm.weightQuality,
              weightDelivery: createForm.weightDelivery, weightService: createForm.weightService,
            });
            setShowCreate(false); toast({ title: "竞价项目已创建" });
          }}>创建竞价项目</Button>
        </CardContent></Card>
      )}

      {/* Project list + detail */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left: project list */}
        <div className="col-span-4 space-y-2">
          {((list.data || []) as any[]).map((p: any) => (
            <Card key={p.id} className={`cursor-pointer transition-colors ${selectedId === p.id ? "border-blue-400 bg-blue-50/30" : "hover:border-gray-300"}`}
              onClick={() => setSelectedId(p.id)}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate">{p.title}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[p.status] || ""}`}>{statusLabels[p.status] || p.status}</span>
                </div>
                <div className="text-xs text-muted-foreground">{p.bidding_code} · {p.material_name} × {p.quantity}</div>
                {p.winner_supplier_name && <div className="text-xs text-green-600 mt-1">中标: {p.winner_supplier_name} ¥{Number(p.winner_bid_price).toLocaleString()}</div>}
              </CardContent>
            </Card>
          ))}
          {!((list.data || []) as any[]).length && <div className="text-center py-8 text-muted-foreground text-sm">暂无竞价项目</div>}
        </div>

        {/* Right: detail */}
        <div className="col-span-8">
          {detail?.project ? (() => {
            const p = detail.project as any;
            const bids = (detail.bids || []) as any[];
            const currentRoundBids = bids.filter((b: any) => b.round === p.current_round);
            const invited = (p.invited_suppliers || []) as Array<{name:string}>;
            return (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{p.title}</CardTitle>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>物料: {p.material_name} × {p.quantity}{p.unit}</span>
                    <span>轮次: {p.current_round}/{p.max_rounds}</span>
                    <span>类型: {p.bidding_type === "sealed" ? "密封竞价" : p.bidding_type === "open" ? "公开" : "反向拍卖"}</span>
                    {p.budget_ceiling && <span>预算: ¥{Number(p.budget_ceiling).toLocaleString()}</span>}
                    <span>权重: 价{p.weight_price}/质{p.weight_quality}/期{p.weight_delivery}/服{p.weight_service}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {p.status === "draft" && <Button size="sm" className="h-7 text-xs" onClick={() => { openMut.mutate({ id: p.id }); toast({ title: "竞价已开标" }); }}>开标</Button>}
                    {p.status === "open" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { closeRoundMut.mutate({ biddingProjectId: p.id }); toast({ title: `第${p.current_round}轮已关闭，已自动评分排名` }); }}>关闭第{p.current_round}轮 & 评分</Button>}
                    {(p.status === "evaluating" || p.status === "open") && currentRoundBids.length > 0 && (
                      <Button size="sm" variant="default" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => {
                        const winner = currentRoundBids.sort((a: any, b: any) => (b.total_score || 0) - (a.total_score || 0))[0];
                        awardMut.mutate({ biddingProjectId: p.id, winnerSupplierName: winner.supplier_name, winnerBidPrice: Number(winner.unit_price), awardReason: `综合评分第一 (${winner.total_score}分)` });
                        toast({ title: "已定标: " + winner.supplier_name });
                      }}>定标 (选最高分)</Button>
                    )}
                  </div>

                  {/* Submit bid form (when open) */}
                  {p.status === "open" && (
                    <Card className="border-dashed"><CardContent className="pt-3 space-y-2">
                      <div className="text-xs font-semibold">录入供应商报价 (第{p.current_round}轮)</div>
                      <div className="grid grid-cols-4 gap-2">
                        <select className="border rounded px-2 py-1 text-xs" value={bidForm.supplierName} onChange={e => setBidForm(f => ({...f, supplierName: e.target.value}))}>
                          <option value="">选择供应商</option>
                          {invited.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                        </select>
                        <Input type="number" className="h-7 text-xs" placeholder="单价(元)" value={bidForm.unitPrice || ""} onChange={e => setBidForm(f => ({...f, unitPrice: Number(e.target.value)}))} />
                        <Input type="number" className="h-7 text-xs" placeholder="交期(天)" value={bidForm.leadTimeDays} onChange={e => setBidForm(f => ({...f, leadTimeDays: Number(e.target.value)}))} />
                        <Button size="sm" className="h-7 text-xs" disabled={!bidForm.supplierName || !bidForm.unitPrice} onClick={() => {
                          submitBidMut.mutate({ biddingProjectId: p.id, supplierName: bidForm.supplierName, unitPrice: bidForm.unitPrice, leadTimeDays: bidForm.leadTimeDays, paymentTerms: bidForm.paymentTerms || undefined });
                          toast({ title: `${bidForm.supplierName} 报价已录入` }); setBidForm(f => ({...f, supplierName: "", unitPrice: 0}));
                        }}>录入</Button>
                      </div>
                    </CardContent></Card>
                  )}

                  {/* Bids table */}
                  {bids.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-2">报价记录 ({bids.length}条)</div>
                      <table className="w-full text-xs border rounded">
                        <thead><tr className="bg-muted">
                          <th className="px-2 py-1.5 text-left">轮次</th>
                          <th className="px-2 py-1.5 text-left">供应商</th>
                          <th className="px-2 py-1.5 text-right">单价</th>
                          <th className="px-2 py-1.5 text-right">总价</th>
                          <th className="px-2 py-1.5 text-center">交期</th>
                          <th className="px-2 py-1.5 text-center">价格分</th>
                          <th className="px-2 py-1.5 text-center">综合分</th>
                          <th className="px-2 py-1.5 text-center">排名</th>
                        </tr></thead>
                        <tbody>{bids.map((b: any, i: number) => {
                          const isWinner = p.winner_supplier_name === b.supplier_name && p.status === "awarded";
                          return (
                            <tr key={b.id} className={`border-t ${isWinner ? "bg-green-50 font-medium" : ""}`}>
                              <td className="px-2 py-1">R{b.round}</td>
                              <td className="px-2 py-1">{b.supplier_name} {isWinner && <Badge className="ml-1 bg-green-100 text-green-700 text-[9px]">中标</Badge>}</td>
                              <td className="px-2 py-1 text-right font-mono">¥{Number(b.unit_price).toLocaleString()}</td>
                              <td className="px-2 py-1 text-right font-mono">¥{Number(b.total_price).toLocaleString()}</td>
                              <td className="px-2 py-1 text-center">{b.lead_time_days ? `${b.lead_time_days}天` : "—"}</td>
                              <td className="px-2 py-1 text-center">{b.price_score ?? "—"}</td>
                              <td className="px-2 py-1 text-center font-bold">{b.total_score ?? "—"}</td>
                              <td className="px-2 py-1 text-center">{b.ranking ? `#${b.ranking}` : "—"}</td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })() : (
            <div className="text-center py-16 text-muted-foreground text-sm">← 选择竞价项目查看详情</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: AI 供应商智能 ───────────────────────────────────────

function AIIntelligenceTab() {
  const qualMut = trpc.supplierGovernance.aiQualificationReview.useMutation();
  const briefMut = trpc.supplierGovernance.aiIndustryBriefing.useMutation();
  const predMut = trpc.supplierGovernance.aiRiskPrediction.useMutation();
  const { toast } = useToast();
  const [mode, setMode] = useState<"qualification" | "briefing" | "prediction">("qualification");
  const [qualForm, setQualForm] = useState({ supplierName: "", hasIso9001: false, hasIso14001: false, hasIatf16949: false, supplyCategory: "", auditScore: 0, defectRate: 0, deliveryOnTimeRate: 95 });
  const [briefForm, setBriefForm] = useState({ supplyCategory: "", materialName: "", currentSuppliers: "", context: "" });
  const [predForm, setPredForm] = useState({ supplierName: "", historicalData: "" });

  const result = mode === "qualification" ? qualMut.data : mode === "briefing" ? briefMut.data : predMut.data;
  const isLoading = qualMut.isPending || briefMut.isPending || predMut.isPending;
  const analysis = (result as any)?.analysis || (result as any)?.briefing || (result as any)?.prediction;

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        {[
          { key: "qualification" as const, label: "AI资格审查", desc: "自动审查供应商资质合规性" },
          { key: "briefing" as const, label: "行业情报通报", desc: "行业趋势/价格走势/风险预警" },
          { key: "prediction" as const, label: "风险预测", desc: "基于历史数据预测供应商风险" },
        ].map(m => (
          <Card key={m.key} className={`flex-1 cursor-pointer transition-colors ${mode === m.key ? "border-blue-400 bg-blue-50/30" : "hover:border-gray-300"}`} onClick={() => setMode(m.key)}>
            <CardContent className="p-3 text-center">
              <div className="text-sm font-medium">{m.label}</div>
              <div className="text-[10px] text-muted-foreground">{m.desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Input forms */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          {mode === "qualification" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="供应商名称" value={qualForm.supplierName} onChange={e => setQualForm(f => ({...f, supplierName: e.target.value}))} />
                <Input placeholder="供应品类 (泵阀/电气/结构件/标准件)" value={qualForm.supplyCategory} onChange={e => setQualForm(f => ({...f, supplyCategory: e.target.value}))} />
              </div>
              <div className="flex flex-wrap gap-4">
                {[["hasIso9001","ISO 9001"],["hasIso14001","ISO 14001"],["hasIatf16949","IATF 16949"]].map(([k,l]) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={(qualForm as any)[k]} onChange={e => setQualForm(f => ({...f, [k]: e.target.checked}))} />{l}
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input type="number" placeholder="审核评分 (0-100)" value={qualForm.auditScore || ""} onChange={e => setQualForm(f => ({...f, auditScore: Number(e.target.value)}))} />
                <Input type="number" placeholder="缺陷率 (%)" value={qualForm.defectRate || ""} onChange={e => setQualForm(f => ({...f, defectRate: Number(e.target.value)}))} />
                <Input type="number" placeholder="准时交货率 (%)" value={qualForm.deliveryOnTimeRate} onChange={e => setQualForm(f => ({...f, deliveryOnTimeRate: Number(e.target.value)}))} />
              </div>
              <Button size="sm" disabled={!qualForm.supplierName || isLoading} onClick={() => { qualMut.mutate(qualForm); toast({ title: "AI审查启动..." }); }}>
                {isLoading ? "分析中..." : "🤖 AI资格审查"}
              </Button>
            </>
          )}
          {mode === "briefing" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="供应品类 (超声波振棒/液压泵/密封件)" value={briefForm.supplyCategory} onChange={e => setBriefForm(f => ({...f, supplyCategory: e.target.value}))} />
                <Input placeholder="具体物料 (可选)" value={briefForm.materialName} onChange={e => setBriefForm(f => ({...f, materialName: e.target.value}))} />
              </div>
              <Input placeholder="现有供应商 (逗号分隔)" value={briefForm.currentSuppliers} onChange={e => setBriefForm(f => ({...f, currentSuppliers: e.target.value}))} />
              <Input placeholder="补充背景信息 (可选)" value={briefForm.context} onChange={e => setBriefForm(f => ({...f, context: e.target.value}))} />
              <Button size="sm" disabled={!briefForm.supplyCategory || isLoading} onClick={() => {
                briefMut.mutate({ ...briefForm, currentSuppliers: briefForm.currentSuppliers ? briefForm.currentSuppliers.split(",").map(s => s.trim()) : undefined });
                toast({ title: "行业情报分析中..." });
              }}>{isLoading ? "分析中..." : "🤖 生成行业通报"}</Button>
            </>
          )}
          {mode === "prediction" && (
            <>
              <Input placeholder="供应商名称 (将自动读取系统内历史数据)" value={predForm.supplierName} onChange={e => setPredForm(f => ({...f, supplierName: e.target.value}))} />
              <Input placeholder="补充说明 (可选)" value={predForm.historicalData} onChange={e => setPredForm(f => ({...f, historicalData: e.target.value}))} />
              <Button size="sm" disabled={!predForm.supplierName || isLoading} onClick={() => { predMut.mutate(predForm); toast({ title: "风险预测分析中..." }); }}>
                {isLoading ? "分析中..." : "🤖 AI风险预测"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Result Display */}
      {isLoading && (
        <Card><CardContent className="py-8 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">AI 正在分析中，请稍候...</p>
        </CardContent></Card>
      )}

      {analysis && !isLoading && (
        <Card className="border-blue-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">🤖 AI 分析结果</CardTitle></CardHeader>
          <CardContent>
            {mode === "qualification" && (() => {
              const a = analysis;
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${a.qualificationResult === "合格" ? "bg-green-100 text-green-700" : a.qualificationResult === "有条件合格" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{a.qualificationResult}</span>
                    <span className="text-sm">风险: <b>{a.riskLevel}</b></span>
                    <span className="text-sm">评分: <b>{a.score}/100</b></span>
                    <span className="text-sm">可靠性: <b>{a.predictedReliability}</b></span>
                  </div>
                  {a.isoComplianceNote && <p className="text-xs bg-blue-50 rounded p-2 text-blue-700">{a.isoComplianceNote}</p>}
                  <div className="grid grid-cols-2 gap-4">
                    <div><div className="text-xs font-semibold text-green-600 mb-1">优势</div>{(a.strengths || []).map((s: string, i: number) => <div key={i} className="text-xs text-muted-foreground flex items-start gap-1"><CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />{s}</div>)}</div>
                    <div><div className="text-xs font-semibold text-red-600 mb-1">风险</div>{(a.risks || []).map((s: string, i: number) => <div key={i} className="text-xs text-muted-foreground flex items-start gap-1"><AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />{s}</div>)}</div>
                  </div>
                  {a.recommendations?.length > 0 && <div><div className="text-xs font-semibold mb-1">建议</div>{a.recommendations.map((s: string, i: number) => <div key={i} className="text-xs text-muted-foreground">• {s}</div>)}</div>}
                  {a.requiredActions?.length > 0 && <div><div className="text-xs font-semibold text-amber-600 mb-1">需供应商补充</div>{a.requiredActions.map((s: string, i: number) => <div key={i} className="text-xs text-amber-700">→ {s}</div>)}</div>}
                </div>
              );
            })()}
            {mode === "briefing" && (() => {
              const b = analysis;
              return (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">{b.briefingTitle}</h4>
                  {b.industryTrends?.length > 0 && (
                    <div><div className="text-xs font-semibold mb-1">行业趋势</div>
                      {b.industryTrends.map((t: any, i: number) => (
                        <div key={i} className="text-xs border-l-2 border-blue-300 pl-2 mb-1.5">
                          <span className="font-medium">{t.trend}</span>
                          <span className="text-muted-foreground"> — 对GRT影响: {t.impact} ({t.timeframe})</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {b.priceOutlook && (
                    <div className="bg-amber-50 rounded p-2">
                      <div className="text-xs font-semibold text-amber-700">价格走势预测</div>
                      <div className="text-xs text-amber-600">方向: {b.priceOutlook.direction} (置信度: {b.priceOutlook.confidence})</div>
                      <div className="text-xs text-muted-foreground">{b.priceOutlook.prediction}</div>
                    </div>
                  )}
                  {b.supplyChainRisks?.length > 0 && (
                    <div><div className="text-xs font-semibold text-red-600 mb-1">供应链风险</div>
                      {b.supplyChainRisks.map((r: any, i: number) => (
                        <div key={i} className="text-xs mb-1.5 flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                          <span><b>{r.risk}</b> (概率:{r.probability} 严重度:{r.severity}) — 对策: {r.mitigation}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {b.recommendations?.length > 0 && (
                    <div><div className="text-xs font-semibold mb-1">行动建议</div>
                      {b.recommendations.map((r: any, i: number) => (
                        <div key={i} className="text-xs"><Badge variant="outline" className="mr-1 text-[9px]">{r.priority}</Badge>{r.action} <span className="text-muted-foreground">({r.responsible})</span></div>
                      ))}
                    </div>
                  )}
                  {b.newSupplierOpportunities?.length > 0 && <div className="text-xs"><b>新供应商机会:</b> {b.newSupplierOpportunities.join("；")}</div>}
                </div>
              );
            })()}
            {mode === "prediction" && (() => {
              const p = analysis;
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${p.overallRiskLevel === "低" ? "bg-green-100 text-green-700" : p.overallRiskLevel === "中" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>风险: {p.overallRiskLevel}</span>
                    <span className="text-sm">评分: <b>{p.riskScore}/100</b></span>
                    <span className="text-sm">趋势: <b>{p.trendDirection === "improving" ? "↑改善" : p.trendDirection === "stable" ? "→稳定" : "↓下降"}</b></span>
                  </div>
                  {p.predictions && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-blue-50 rounded p-2 text-xs"><b>质量(3月):</b> {p.predictions.qualityOutlook3m}</div>
                      <div className="bg-green-50 rounded p-2 text-xs"><b>交付(3月):</b> {p.predictions.deliveryOutlook3m}</div>
                      <div className="bg-amber-50 rounded p-2 text-xs"><b>价格(3月):</b> {p.predictions.priceOutlook3m}</div>
                      <div className="bg-purple-50 rounded p-2 text-xs"><b>存活概率(12月):</b> {p.predictions.survivalProbability}</div>
                    </div>
                  )}
                  {p.keyRisks?.length > 0 && (
                    <div>{p.keyRisks.map((r: any, i: number) => (
                      <div key={i} className="text-xs border-l-2 border-red-300 pl-2 mb-1.5">
                        <b>{r.risk}</b> (概率:{r.probability}% 影响:{r.impact}) <span className="text-muted-foreground">预警: {r.earlyWarning}</span>
                      </div>
                    ))}</div>
                  )}
                  {p.actionPlan?.length > 0 && (
                    <div><div className="text-xs font-semibold mb-1">行动计划</div>
                      {p.actionPlan.map((a: any, i: number) => (
                        <div key={i} className="text-xs"><Badge variant="outline" className="mr-1 text-[9px]">{a.urgency}</Badge>{a.action} <span className="text-muted-foreground">({a.owner})</span></div>
                      ))}
                    </div>
                  )}
                  {p.alternativeSuppliers && <div className="text-xs bg-gray-50 rounded p-2"><b>替代供应商方向:</b> {p.alternativeSuppliers}</div>}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────

const TABS = [
  { key: "overview", label: "总览", icon: BarChart3 },
  { key: "ai", label: "AI智能分析", icon: Shield },
  { key: "bidding", label: "竞价中心", icon: FileCheck },
  { key: "pricing", label: "比价审批", icon: FileCheck },
  { key: "portal", label: "供应商门户", icon: Upload },
  { key: "plans", label: "审核计划", icon: ClipboardCheck },
  { key: "qualification", label: "新供应商准入", icon: UserPlus },
  { key: "spotcheck", label: "季度抽检", icon: Search },
  { key: "committee", label: "评标委员会", icon: Users },
  { key: "elimination", label: "淘汰与报告", icon: Trash2 },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function SupplierGovernance() {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          供应商治理体系
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          CEO批复 · 2026年质量体系与供应链提高项目重要一环
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="h-4 w-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {tab === "overview" && <OverviewTab />}
      {tab === "ai" && <AIIntelligenceTab />}
      {tab === "bidding" && <BiddingTab />}
      {tab === "pricing" && <PriceComparisonTab />}
      {tab === "portal" && <PortalTab />}
      {tab === "plans" && <AuditPlansTab />}
      {tab === "qualification" && <QualificationTab />}
      {tab === "spotcheck" && <SpotChecksTab />}
      {tab === "committee" && <CommitteeTab />}
      {tab === "elimination" && <EliminationTab />}
    </div>
  );
}
