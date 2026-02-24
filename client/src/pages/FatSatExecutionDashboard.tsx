/**
 * M7-M8 FAT/SAT Execution Dashboard
 *
 * Comprehensive Factory/Site Acceptance Test management.
 * Wired to fatSat.* tRPC procedures (29 endpoints).
 *
 * 5 Tabs:
 *   1. 测试计划  — Plan list + create/status management
 *   2. 测试执行  — Test items by category + result recording
 *   3. 检查清单  — Pre-assembly checklists
 *   4. 签字审批  — Multi-step signoff workflow
 *   5. 现场条件  — SAT site environmental conditions
 *
 * Microsoft Fluent Design (bg-[#faf9f8])
 */
import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  ClipboardCheck, Plus, Play, CheckCircle2, XCircle, Clock,
  AlertTriangle, Loader2, RefreshCw, ChevronDown, ChevronRight,
  Factory, Shield, Wrench, Zap, Settings, FileText,
  Thermometer, Droplets, Gauge, PenTool, Users,
  Check, X, Search, BarChart3, Target, Award,
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────

const PLAN_STATUSES = {
  draft: { label: "草稿", bg: "bg-[#f3f2f1] text-[#605e5c]" },
  in_progress: { label: "进行中", bg: "bg-[#deecf9] text-[#0078d4]" },
  completed: { label: "已完成", bg: "bg-[#dff6dd] text-[#107c10]" },
  cancelled: { label: "已取消", bg: "bg-[#fed9cc] text-[#d83b01]" },
} as const;

const RESULT_STYLES = {
  pending: { label: "待测试", bg: "bg-[#f3f2f1] text-[#605e5c]", icon: Clock },
  passed: { label: "通过", bg: "bg-[#dff6dd] text-[#107c10]", icon: CheckCircle2 },
  failed: { label: "不通过", bg: "bg-[#fed9cc] text-[#d83b01]", icon: XCircle },
  conditional: { label: "有条件通过", bg: "bg-[#fff4ce] text-[#797673]", icon: AlertTriangle },
} as const;

const CATEGORY_ICONS: Record<string, any> = {
  mechanical: Wrench,
  electrical: Zap,
  safety: Shield,
  performance: Gauge,
  environmental: Thermometer,
  documentation: FileText,
};

const CATEGORY_LABELS: Record<string, string> = {
  mechanical: "机械",
  electrical: "电气",
  safety: "安全",
  performance: "性能",
  environmental: "环境",
  documentation: "文档",
};

const SIGNOFF_STATUSES = {
  pending: { label: "待审批", bg: "bg-[#f3f2f1] text-[#605e5c]" },
  approved: { label: "已批准", bg: "bg-[#dff6dd] text-[#107c10]" },
  rejected: { label: "已驳回", bg: "bg-[#fed9cc] text-[#d83b01]" },
} as const;

// ─── Helpers ────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  try { return new Date(d).toISOString().slice(0, 10); } catch { return "-"; }
}

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; bg: string }> }) {
  const s = map[status] || { label: status, bg: "bg-[#f3f2f1] text-[#605e5c]" };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.bg}`}>{s.label}</span>;
}

// ─── Stat Card ──────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color = "text-[#323130]" }: {
  label: string; value: string | number; icon: any; color?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-[#edebe9] p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-opacity-10 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-[#605e5c]">{label}</div>
        <div className={`text-lg font-semibold ${color}`}>{value}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 1: 测试计划
// ═══════════════════════════════════════════════════════════

function PlansTab({ activePlanId, onSelectPlan }: {
  activePlanId: number | null; onSelectPlan: (id: number) => void;
}) {
  const { t } = useLanguage();
  const plans = trpc.fatSat.plans.list.useQuery({});
  const createPlan = trpc.fatSat.plans.create.useMutation({
    onSuccess: () => { toast.success(t("afterSales.fatSat.planCreated")); plans.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatus = trpc.fatSat.plans.updateStatus.useMutation({
    onSuccess: () => { toast.success(t("afterSales.fatSat.statusUpdated")); plans.refetch(); },
  });
  const initSAT = trpc.fatSat.templates.initSAT.useMutation({
    onSuccess: () => { toast.success(t("afterSales.fatSat.satTemplateInit")); plans.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    planType: "FAT" as "FAT" | "SAT",
    planName: "", equipmentModel: "", customerName: "", testLocation: "",
    projectId: 1,
  });

  const planList = Array.isArray(plans.data) ? plans.data : [];

  // Summary stats
  const stats = useMemo(() => {
    const total = planList.length;
    const inProgress = planList.filter((p: any) => p.status === "in_progress").length;
    const completed = planList.filter((p: any) => p.status === "completed").length;
    const fat = planList.filter((p: any) => p.planType === "FAT").length;
    const sat = planList.filter((p: any) => p.planType === "SAT").length;
    return { total, inProgress, completed, fat, sat };
  }, [planList]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label={t("afterSales.fatSat.totalPlans")} value={stats.total} icon={ClipboardCheck} color="text-[#0078d4]" />
        <StatCard label={t("afterSales.fatSat.inProgress")} value={stats.inProgress} icon={Play} color="text-blue-600" />
        <StatCard label={t("afterSales.fatSat.completed")} value={stats.completed} icon={CheckCircle2} color="text-green-600" />
        <StatCard label="FAT" value={stats.fat} icon={Factory} color="text-orange-600" />
        <StatCard label="SAT" value={stats.sat} icon={Settings} color="text-purple-600" />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          className="px-4 py-2 bg-[#0078d4] text-white rounded hover:bg-[#106ebe] text-sm inline-flex items-center gap-2"
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus className="w-4 h-4" /> {t("afterSales.fatSat.createPlan")}
        </button>
        <button
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm inline-flex items-center gap-2"
          onClick={() => {
            initSAT.mutate({ projectId: 1, planName: `SAT-${Date.now().toString(36).toUpperCase()}` });
          }}
          disabled={initSAT.isPending}
        >
          {initSAT.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
          {t("afterSales.fatSat.quickSatTemplate")}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-lg border border-[#edebe9] p-5">
          <h4 className="text-sm font-semibold text-[#323130] mb-3">{t("afterSales.fatSat.newTestPlan")}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-[#605e5c] mb-1">{t("afterSales.fatSat.type")}</label>
              <select className="w-full px-3 py-2 border border-[#8a8886] rounded text-sm" value={form.planType}
                onChange={(e) => setForm({ ...form, planType: e.target.value as "FAT" | "SAT" })}>
                <option value="FAT">FAT ({t("afterSales.fatSat.factoryAcceptance")})</option>
                <option value="SAT">SAT ({t("afterSales.fatSat.siteAcceptance")})</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#605e5c] mb-1">{t("afterSales.fatSat.planName")} *</label>
              <input className="w-full px-3 py-2 border border-[#8a8886] rounded text-sm" placeholder="如: GRT-2026-FAT-001"
                value={form.planName} onChange={(e) => setForm({ ...form, planName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-[#605e5c] mb-1">{t("afterSales.fatSat.equipmentModel")}</label>
              <input className="w-full px-3 py-2 border border-[#8a8886] rounded text-sm" placeholder="如: GRT-WM-3000"
                value={form.equipmentModel} onChange={(e) => setForm({ ...form, equipmentModel: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-[#605e5c] mb-1">{t("afterSales.fatSat.customerName")}</label>
              <input className="w-full px-3 py-2 border border-[#8a8886] rounded text-sm"
                value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-[#605e5c] mb-1">{t("afterSales.fatSat.testLocation")}</label>
              <input className="w-full px-3 py-2 border border-[#8a8886] rounded text-sm"
                value={form.testLocation} onChange={(e) => setForm({ ...form, testLocation: e.target.value })} />
            </div>
            <div className="flex items-end">
              <button className="px-5 py-2 bg-[#0078d4] text-white rounded text-sm hover:bg-[#106ebe] inline-flex items-center gap-2"
                onClick={() => {
                  if (!form.planName.trim()) return toast.error(t("afterSales.fatSat.fillPlanName"));
                  createPlan.mutate(form);
                  setShowCreate(false);
                  setForm({ planType: "FAT", planName: "", equipmentModel: "", customerName: "", testLocation: "", projectId: 1 });
                }}
                disabled={createPlan.isPending}
              >
                {createPlan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {t("afterSales.fatSat.submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan List */}
      <div className="bg-white rounded-lg border border-[#edebe9]">
        {plans.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#0078d4]" />
          </div>
        ) : planList.length === 0 ? (
          <div className="text-center py-16 text-[#a19f9d]">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>{t("afterSales.fatSat.noPlansHint")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#edebe9] text-left text-xs text-[#605e5c] bg-[#faf9f8]">
                  <th className="py-3 px-4">{t("afterSales.fatSat.thPlanName")}</th>
                  <th className="py-3 px-3">{t("afterSales.fatSat.thType")}</th>
                  <th className="py-3 px-3">{t("afterSales.fatSat.thStatus")}</th>
                  <th className="py-3 px-3">{t("afterSales.fatSat.thEquipment")}</th>
                  <th className="py-3 px-3">{t("afterSales.fatSat.thCustomer")}</th>
                  <th className="py-3 px-3">{t("afterSales.fatSat.thCreatedAt")}</th>
                  <th className="py-3 px-3">{t("afterSales.fatSat.thActions")}</th>
                </tr>
              </thead>
              <tbody>
                {planList.map((p: any) => (
                  <tr key={p.id}
                    className={`border-b border-[#f3f2f1] hover:bg-[#faf9f8] cursor-pointer ${activePlanId === p.id ? "bg-[#deecf9]" : ""}`}
                    onClick={() => onSelectPlan(p.id)}>
                    <td className="py-3 px-4 font-medium text-[#323130]">{p.planName}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.planType === "FAT" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"}`}>
                        {p.planType}
                      </span>
                    </td>
                    <td className="py-3 px-3"><StatusBadge status={p.status} map={PLAN_STATUSES} /></td>
                    <td className="py-3 px-3 text-[#605e5c]">{p.equipmentModel || "-"}</td>
                    <td className="py-3 px-3 text-[#605e5c]">{p.customerName || "-"}</td>
                    <td className="py-3 px-3 text-xs text-[#a19f9d]">{fmtDate(p.createdAt)}</td>
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {p.status === "draft" && (
                          <button className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                            onClick={() => updateStatus.mutate({ planId: p.id, status: "in_progress" })}>
                            {t("afterSales.fatSat.start")}
                          </button>
                        )}
                        {p.status === "in_progress" && (
                          <button className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                            onClick={() => updateStatus.mutate({ planId: p.id, status: "completed" })}>
                            {t("afterSales.fatSat.complete")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 2: 测试执行
// ═══════════════════════════════════════════════════════════

function TestItemsTab({ planId }: { planId: number | null }) {
  const { t } = useLanguage();
  const items = trpc.fatSat.testItems.list.useQuery(
    { planId: planId! },
    { enabled: !!planId },
  );
  const updateItem = trpc.fatSat.testItems.update.useMutation({
    onSuccess: () => { toast.success(t("afterSales.fatSat.resultSaved")); items.refetch(); },
  });
  const summary = trpc.fatSat.summary.get.useQuery(
    { planId: planId! },
    { enabled: !!planId },
  );

  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  if (!planId) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-[#edebe9]">
        <Target className="w-12 h-12 mx-auto text-[#c8c6c4] mb-3" />
        <p className="text-[#605e5c]">{t("afterSales.fatSat.selectPlanFirst")}</p>
      </div>
    );
  }

  const itemList = Array.isArray(items.data) ? items.data : [];

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const item of itemList) {
      const cat = item.category || "other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return map;
  }, [itemList]);

  // Summary data
  const sumData = summary.data as any;
  const totalItems = sumData?.testItemStats?.total || itemList.length;
  const passedItems = sumData?.testItemStats?.passed || itemList.filter((i: any) => i.result === "passed").length;
  const failedItems = sumData?.testItemStats?.failed || itemList.filter((i: any) => i.result === "failed").length;
  const passRate = totalItems > 0 ? Math.round((passedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t("afterSales.fatSat.totalTestItems")} value={totalItems} icon={Target} color="text-[#0078d4]" />
        <StatCard label={t("afterSales.fatSat.passed")} value={passedItems} icon={CheckCircle2} color="text-green-600" />
        <StatCard label={t("afterSales.fatSat.failed")} value={failedItems} icon={XCircle} color="text-red-600" />
        <StatCard label={t("afterSales.fatSat.passRate")} value={`${passRate}%`} icon={BarChart3} color={passRate >= 80 ? "text-green-600" : passRate >= 50 ? "text-amber-600" : "text-red-600"} />
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg border border-[#edebe9] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#323130]">{t("afterSales.fatSat.testProgress")}</span>
          <span className="text-xs text-[#605e5c]">{passedItems + failedItems} / {totalItems}</span>
        </div>
        <div className="w-full h-3 bg-[#f3f2f1] rounded-full overflow-hidden flex">
          {totalItems > 0 && (
            <>
              <div className="bg-[#107c10] h-full transition-all" style={{ width: `${(passedItems / totalItems) * 100}%` }} />
              <div className="bg-[#d83b01] h-full transition-all" style={{ width: `${(failedItems / totalItems) * 100}%` }} />
            </>
          )}
        </div>
        <div className="flex gap-4 mt-2 text-[10px] text-[#605e5c]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#107c10]" /> {t("afterSales.fatSat.passed")} {passedItems}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#d83b01]" /> {t("afterSales.fatSat.failed")} {failedItems}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#f3f2f1]" /> {t("afterSales.fatSat.pendingTest")} {totalItems - passedItems - failedItems}</span>
        </div>
      </div>

      {/* Test Items by Category */}
      {items.isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#0078d4]" /></div>
      ) : itemList.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-[#edebe9]">
          <p className="text-[#a19f9d]">{t("afterSales.fatSat.noTestItems")}</p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([cat, catItems]) => {
          const CatIcon = CATEGORY_ICONS[cat] || FileText;
          const catLabel = CATEGORY_LABELS[cat] || cat;
          const isExpanded = expandedCat === cat;
          const catPassed = catItems.filter((i: any) => i.result === "passed").length;
          const catFailed = catItems.filter((i: any) => i.result === "failed").length;

          return (
            <div key={cat} className="bg-white rounded-lg border border-[#edebe9] overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#faf9f8] transition-colors"
                onClick={() => setExpandedCat(isExpanded ? null : cat)}
              >
                <CatIcon className="w-5 h-5 text-[#0078d4]" />
                <span className="text-sm font-semibold text-[#323130]">{catLabel}</span>
                <span className="text-xs text-[#605e5c]">{catItems.length} {t("afterSales.fatSat.items")}</span>
                <div className="flex gap-2 ml-auto text-xs">
                  <span className="text-green-600">{catPassed} {t("afterSales.fatSat.passed")}</span>
                  {catFailed > 0 && <span className="text-red-600">{catFailed} {t("afterSales.fatSat.failed")}</span>}
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-[#605e5c]" /> : <ChevronRight className="w-4 h-4 text-[#605e5c]" />}
              </button>

              {isExpanded && (
                <div className="border-t border-[#edebe9]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-[#605e5c] bg-[#faf9f8]">
                        <th className="py-2 px-4">{t("afterSales.fatSat.thTestItem")}</th>
                        <th className="py-2 px-3">{t("afterSales.fatSat.thSpec")}</th>
                        <th className="py-2 px-3">{t("afterSales.fatSat.thPassCriteria")}</th>
                        <th className="py-2 px-3">{t("afterSales.fatSat.thActualValue")}</th>
                        <th className="py-2 px-3">{t("afterSales.fatSat.thResult")}</th>
                        <th className="py-2 px-3">{t("afterSales.fatSat.thTester")}</th>
                        <th className="py-2 px-3">{t("afterSales.fatSat.thActions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catItems.map((item: any) => {
                        const rs = RESULT_STYLES[item.result as keyof typeof RESULT_STYLES] || RESULT_STYLES.pending;
                        const RIcon = rs.icon;
                        return (
                          <tr key={item.id} className="border-b border-[#f3f2f1] hover:bg-[#faf9f8]">
                            <td className="py-2.5 px-4 font-medium text-[#323130]">{item.itemName}</td>
                            <td className="py-2.5 px-3 text-xs text-[#605e5c]">{item.specification || "-"}</td>
                            <td className="py-2.5 px-3 text-xs text-[#605e5c]">{item.passCriteria || "-"}</td>
                            <td className="py-2.5 px-3">
                              <input
                                className="w-20 px-2 py-1 border border-[#c8c6c4] rounded text-xs focus:border-[#0078d4] focus:outline-none"
                                defaultValue={item.actualValue || ""}
                                placeholder={item.unit || ""}
                                onBlur={(e) => {
                                  if (e.target.value !== (item.actualValue || "")) {
                                    updateItem.mutate({ id: item.id, actualValue: e.target.value });
                                  }
                                }}
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 ${rs.bg}`}>
                                <RIcon className="w-3 h-3" /> {rs.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-xs text-[#605e5c]">{item.testerName || "-"}</td>
                            <td className="py-2.5 px-3">
                              <div className="flex gap-1">
                                <button className="px-1.5 py-0.5 text-[10px] bg-green-500 text-white rounded hover:bg-green-600"
                                  onClick={() => updateItem.mutate({ id: item.id, result: "passed" })}>{t("afterSales.fatSat.pass")}</button>
                                <button className="px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded hover:bg-red-600"
                                  onClick={() => updateItem.mutate({ id: item.id, result: "failed" })}>{t("afterSales.fatSat.fail")}</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 3: 检查清单
// ═══════════════════════════════════════════════════════════

function ChecklistTab({ planId }: { planId: number | null }) {
  const { t } = useLanguage();
  const checklists = trpc.fatSat.checklists.list.useQuery(
    { planId: planId! },
    { enabled: !!planId },
  );
  const updateCheck = trpc.fatSat.checklists.update.useMutation({
    onSuccess: () => { checklists.refetch(); },
  });

  if (!planId) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-[#edebe9]">
        <ClipboardCheck className="w-12 h-12 mx-auto text-[#c8c6c4] mb-3" />
        <p className="text-[#605e5c]">{t("afterSales.fatSat.selectPlanFirst")}</p>
      </div>
    );
  }

  const items = Array.isArray(checklists.data) ? checklists.data : [];
  const completed = items.filter((i: any) => i.isCompleted).length;
  const total = items.length;

  // Group by category
  const grouped = new Map<string, any[]>();
  for (const item of items) {
    const cat = item.category || "general";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      {total > 0 && (
        <div className="bg-white rounded-lg border border-[#edebe9] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#323130]">{t("afterSales.fatSat.checkProgress")}</span>
            <span className="text-xs text-[#605e5c]">{completed} / {total} ({total > 0 ? Math.round((completed / total) * 100) : 0}%)</span>
          </div>
          <div className="w-full h-3 bg-[#f3f2f1] rounded-full overflow-hidden">
            <div className="bg-[#107c10] h-full transition-all" style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* Checklist by category */}
      {checklists.isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#0078d4]" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-[#edebe9]">
          <p className="text-[#a19f9d]">{t("afterSales.fatSat.noChecklist")}</p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([cat, catItems]) => {
          const CatIcon = CATEGORY_ICONS[cat] || FileText;
          const catLabel = CATEGORY_LABELS[cat] || cat;
          const catCompleted = catItems.filter((i: any) => i.isCompleted).length;

          return (
            <div key={cat} className="bg-white rounded-lg border border-[#edebe9] p-5">
              <div className="flex items-center gap-2 mb-3">
                <CatIcon className="w-5 h-5 text-[#0078d4]" />
                <span className="text-sm font-semibold text-[#323130]">{catLabel}</span>
                <span className="text-xs text-[#605e5c] ml-auto">{catCompleted}/{catItems.length}</span>
              </div>
              <div className="space-y-2">
                {catItems.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-[#f3f2f1] last:border-0">
                    <button
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        item.isCompleted
                          ? "bg-[#107c10] border-[#107c10]"
                          : "border-[#8a8886] hover:border-[#0078d4]"
                      }`}
                      onClick={() => updateCheck.mutate({ id: item.id, isCompleted: !item.isCompleted })}
                    >
                      {item.isCompleted && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <span className={`text-sm flex-1 ${item.isCompleted ? "text-[#a19f9d] line-through" : "text-[#323130]"}`}>
                      {item.itemName}
                    </span>
                    <span className="text-xs text-[#a19f9d]">{item.responsiblePerson || ""}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 4: 签字审批
// ═══════════════════════════════════════════════════════════

function SignoffTab({ planId }: { planId: number | null }) {
  const { t } = useLanguage();
  const signoffs = trpc.fatSat.signoffs.list.useQuery(
    { planId: planId! },
    { enabled: !!planId },
  );
  const updateSignoff = trpc.fatSat.signoffs.update.useMutation({
    onSuccess: () => { toast.success(t("afterSales.fatSat.signoffUpdated")); signoffs.refetch(); },
  });

  if (!planId) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-[#edebe9]">
        <PenTool className="w-12 h-12 mx-auto text-[#c8c6c4] mb-3" />
        <p className="text-[#605e5c]">{t("afterSales.fatSat.selectPlanFirst")}</p>
      </div>
    );
  }

  const items = Array.isArray(signoffs.data) ? signoffs.data : [];

  return (
    <div className="space-y-4">
      {signoffs.isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#0078d4]" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-[#edebe9]">
          <p className="text-[#a19f9d]">{t("afterSales.fatSat.noSignoffSteps")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#edebe9] p-6">
          <h4 className="text-sm font-semibold text-[#323130] mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#0078d4]" /> {t("afterSales.fatSat.approvalWorkflow")}
          </h4>

          {/* Workflow Timeline */}
          <div className="relative">
            {items.map((step: any, idx: number) => {
              const isLast = idx === items.length - 1;
              const statusInfo = SIGNOFF_STATUSES[step.status as keyof typeof SIGNOFF_STATUSES] || SIGNOFF_STATUSES.pending;
              const isApproved = step.status === "approved";
              const isPending = step.status === "pending";

              return (
                <div key={step.id} className="flex gap-4 mb-0">
                  {/* Timeline Dot + Line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      isApproved ? "bg-[#107c10] border-[#107c10]" :
                      step.status === "rejected" ? "bg-[#d83b01] border-[#d83b01]" :
                      "bg-white border-[#c8c6c4]"
                    }`}>
                      {isApproved ? <Check className="w-4 h-4 text-white" /> :
                       step.status === "rejected" ? <X className="w-4 h-4 text-white" /> :
                       <span className="text-xs font-bold text-[#605e5c]">{step.stepOrder}</span>}
                    </div>
                    {!isLast && <div className={`w-0.5 h-16 ${isApproved ? "bg-[#107c10]" : "bg-[#edebe9]"}`} />}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold text-[#323130]">{step.stepName}</span>
                      <StatusBadge status={step.status} map={SIGNOFF_STATUSES} />
                    </div>
                    <div className="text-xs text-[#605e5c] mb-2">
                      {t("afterSales.fatSat.role")}: {step.signerRole} {step.signerName && `· ${t("afterSales.fatSat.signer")}: ${step.signerName}`}
                    </div>
                    {step.comment && (
                      <div className="text-xs text-[#605e5c] bg-[#faf9f8] px-3 py-2 rounded mb-2">"{step.comment}"</div>
                    )}
                    {step.signedAt && (
                      <div className="text-[10px] text-[#a19f9d]">{t("afterSales.fatSat.signedAt")}: {fmtDate(step.signedAt)}</div>
                    )}

                    {/* Action Buttons */}
                    {isPending && (
                      <div className="flex gap-2 mt-2">
                        <button
                          className="px-3 py-1.5 text-xs bg-[#107c10] text-white rounded hover:bg-green-700 inline-flex items-center gap-1"
                          onClick={() => updateSignoff.mutate({
                            id: step.id,
                            status: "approved",
                            signerName: "当前用户",
                            comment: "审核通过",
                          })}
                        >
                          <Check className="w-3 h-3" /> {t("afterSales.fatSat.approve")}
                        </button>
                        <button
                          className="px-3 py-1.5 text-xs bg-[#d83b01] text-white rounded hover:bg-red-700 inline-flex items-center gap-1"
                          onClick={() => updateSignoff.mutate({
                            id: step.id,
                            status: "rejected",
                            signerName: "当前用户",
                            comment: "需要修改",
                          })}
                        >
                          <X className="w-3 h-3" /> {t("afterSales.fatSat.reject")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Tab 5: 现场条件 (SAT only)
// ═══════════════════════════════════════════════════════════

function SiteConditionsTab({ planId }: { planId: number | null }) {
  const { t } = useLanguage();
  const conditions = trpc.fatSat.siteConditions.list.useQuery(
    { planId: planId! },
    { enabled: !!planId },
  );
  const updateCondition = trpc.fatSat.siteConditions.update.useMutation({
    onSuccess: () => { toast.success(t("afterSales.fatSat.measurementSaved")); conditions.refetch(); },
  });

  if (!planId) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-[#edebe9]">
        <Thermometer className="w-12 h-12 mx-auto text-[#c8c6c4] mb-3" />
        <p className="text-[#605e5c]">{t("afterSales.fatSat.selectPlanFirst")}</p>
      </div>
    );
  }

  const items = Array.isArray(conditions.data) ? conditions.data : [];

  const CONDITION_ICONS: Record<string, any> = {
    ambient_temp: Thermometer,
    water_quality: Droplets,
    power_supply: Zap,
    humidity: Droplets,
    vibration: Gauge,
  };

  return (
    <div className="space-y-4">
      {conditions.isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#0078d4]" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-[#edebe9]">
          <p className="text-[#a19f9d]">{t("afterSales.fatSat.noSiteConditions")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((cond: any) => {
            const CIcon = CONDITION_ICONS[cond.conditionType] || Gauge;
            const isInSpec = cond.isWithinSpec;

            return (
              <div key={cond.id} className={`bg-white rounded-lg border-2 p-5 transition-all ${
                isInSpec === true ? "border-green-300" :
                isInSpec === false ? "border-red-300" :
                "border-[#edebe9]"
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isInSpec === true ? "bg-green-100" :
                    isInSpec === false ? "bg-red-100" :
                    "bg-[#f3f2f1]"
                  }`}>
                    <CIcon className={`w-5 h-5 ${
                      isInSpec === true ? "text-green-600" :
                      isInSpec === false ? "text-red-600" :
                      "text-[#605e5c]"
                    }`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#323130]">{cond.conditionName}</h4>
                    <p className="text-xs text-[#605e5c]">{cond.conditionType}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#605e5c]">{t("afterSales.fatSat.expectedValue")}</span>
                    <span className="font-medium">{cond.expectedValue || "-"} {cond.unit || ""}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#605e5c]">{t("afterSales.fatSat.actualValue")}</span>
                    <input
                      className="w-24 px-2 py-1 border border-[#c8c6c4] rounded text-xs text-right focus:border-[#0078d4] focus:outline-none"
                      defaultValue={cond.actualValue || ""}
                      placeholder={cond.unit || ""}
                      onBlur={(e) => {
                        if (e.target.value !== (cond.actualValue || "")) {
                          updateCondition.mutate({ id: cond.id, actualValue: e.target.value });
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#605e5c]">{t("afterSales.fatSat.status")}</span>
                    <span className={`text-xs font-medium ${
                      isInSpec === true ? "text-green-600" :
                      isInSpec === false ? "text-red-600" :
                      "text-[#a19f9d]"
                    }`}>
                      {isInSpec === true ? t("afterSales.fatSat.compliant") : isInSpec === false ? t("afterSales.fatSat.outOfSpec") : t("afterSales.fatSat.pendingTest")}
                    </span>
                  </div>
                </div>

                {/* Quick spec buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    className="flex-1 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                    onClick={() => updateCondition.mutate({ id: cond.id, isWithinSpec: true })}
                  >{t("afterSales.fatSat.compliant")}</button>
                  <button
                    className="flex-1 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={() => updateCondition.mutate({ id: cond.id, isWithinSpec: false })}
                  >{t("afterSales.fatSat.outOfSpec")}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Main Dashboard
// ═══════════════════════════════════════════════════════════

const TABS = [
  { id: "plans",      labelKey: "afterSales.fatSat.tabPlans", icon: ClipboardCheck },
  { id: "items",      labelKey: "afterSales.fatSat.tabItems", icon: Target },
  { id: "checklist",  labelKey: "afterSales.fatSat.tabChecklist", icon: CheckCircle2 },
  { id: "signoff",    labelKey: "afterSales.fatSat.tabSignoff", icon: PenTool },
  { id: "conditions", labelKey: "afterSales.fatSat.tabConditions", icon: Thermometer },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function FatSatExecutionDashboard() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>("plans");
  const [activePlanId, setActivePlanId] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#faf9f8]">
      {/* Header */}
      <div className="bg-white border-b border-[#edebe9] px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-[#323130]">{t("afterSales.fatSat.title")}</h1>
          <span className="text-xs text-[#605e5c] bg-[#f3f2f1] px-2 py-0.5 rounded">M7-M8 Acceptance Testing</span>
          {activePlanId && (
            <span className="text-xs text-[#0078d4] bg-[#deecf9] px-2 py-0.5 rounded ml-2">
              Plan #{activePlanId}
            </span>
          )}
        </div>
        <p className="text-xs text-[#a19f9d] ml-11">
          {t("afterSales.fatSat.desc")}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-[#edebe9] px-6">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-[#0078d4] text-[#0078d4]"
                    : "border-transparent text-[#605e5c] hover:text-[#323130] hover:border-[#c8c6c4]"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="w-4 h-4" />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6 max-w-[1400px] mx-auto">
        {activeTab === "plans" && <PlansTab activePlanId={activePlanId} onSelectPlan={(id) => { setActivePlanId(id); setActiveTab("items"); }} />}
        {activeTab === "items" && <TestItemsTab planId={activePlanId} />}
        {activeTab === "checklist" && <ChecklistTab planId={activePlanId} />}
        {activeTab === "signoff" && <SignoffTab planId={activePlanId} />}
        {activeTab === "conditions" && <SiteConditionsTab planId={activePlanId} />}
      </div>
    </div>
  );
}
