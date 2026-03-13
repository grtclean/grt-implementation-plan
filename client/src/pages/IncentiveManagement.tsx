/**
 * 激励管理 — Incentive Management (HR/Finance)
 *
 * Sections:
 *  1. Incentive Catalog — CRUD for incentive types
 *  2. Award Workflow — select employee + type + amount + justification
 *  3. Budget vs Spend Dashboard — summary by type/period
 */

import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Gift, Plus, DollarSign, TrendingUp, Award,
  Edit3, Save, X,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const CATEGORY_LABELS: Record<string, string> = {
  skill_premium: "技术津贴",
  project_bonus: "项目奖金",
  innovation_reward: "创新奖励",
  team_incentive: "团队激励",
  retention_bonus: "留才奖金",
  referral_bonus: "推荐奖金",
};

const CALC_METHOD_LABELS: Record<string, string> = {
  fixed: "固定金额",
  percentage: "百分比",
  formula: "公式",
};

export default function IncentiveManagement() {
  const [activeSection, setActiveSection] = useState<"catalog" | "award" | "summary">("catalog");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddCatalog, setShowAddCatalog] = useState(false);
  const { t } = useLanguage();

  // Catalog
  const catalog = trpc.perfCalibration.incentive.listCatalog.useQuery();
  const upsertCatalog = trpc.perfCalibration.incentive.upsertCatalogItem.useMutation();

  // Award form state
  const [awardForm, setAwardForm] = useState({
    employeeId: "",
    employeeName: "",
    catalogItemId: "",
    amount: "",
    period: (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })(),
    justification: "",
  });
  const awardIncentive = trpc.perfCalibration.incentive.awardIncentive.useMutation();

  // Summary
  const [summaryPeriod, setSummaryPeriod] = useState(awardForm.period);
  const summary = trpc.perfCalibration.incentive.getIncentiveSummary.useQuery({ period: summaryPeriod });

  // New catalog item form
  const [newItem, setNewItem] = useState({
    code: "",
    name: "",
    nameEn: "",
    category: "skill_premium" as const,
    description: "",
    calculationMethod: "fixed" as const,
    baseAmount: "0.00",
    maxAmount: "",
  });

  const handleAddCatalog = async () => {
    try {
      await upsertCatalog.mutateAsync({
        ...newItem,
        maxAmount: newItem.maxAmount || null,
      });
      setShowAddCatalog(false);
      setNewItem({ code: "", name: "", nameEn: "", category: "skill_premium", description: "", calculationMethod: "fixed", baseAmount: "0.00", maxAmount: "" });
      catalog.refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAward = async () => {
    if (!awardForm.employeeId || !awardForm.catalogItemId || !awardForm.amount || !awardForm.justification) return;
    try {
      await awardIncentive.mutateAsync({
        employeeId: Number(awardForm.employeeId),
        catalogItemId: Number(awardForm.catalogItemId),
        amount: awardForm.amount,
        period: awardForm.period,
        justification: awardForm.justification,
        employeeName: awardForm.employeeName || undefined,
      });
      setAwardForm((prev) => ({ ...prev, employeeId: "", employeeName: "", amount: "", justification: "" }));
      summary.refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const totalSpend = (summary.data ?? []).reduce((s, d) => s + d.totalAmount, 0);
  const totalAwards = (summary.data ?? []).reduce((s, d) => s + d.awardCount, 0);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Gift className="h-5 w-5" /> 激励管理
        </h1>
        <p className="text-sm text-muted-foreground">激励目录维护 · 奖励发放 · 预算与支出</p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 border-b pb-px">
        {[
          { key: "catalog" as const, label: "激励目录", icon: Award },
          { key: "award" as const, label: "奖励发放", icon: DollarSign },
          { key: "summary" as const, label: "支出汇总", icon: TrendingUp },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap rounded-t transition-colors ${
                activeSection === s.key
                  ? "border-b-2 border-primary text-primary bg-muted/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ── Section: Catalog ── */}
      {activeSection === "catalog" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-medium">激励类型目录</h2>
            <Button size="sm" onClick={() => setShowAddCatalog(!showAddCatalog)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> 新增类型
            </Button>
          </div>

          {showAddCatalog && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <input className="border rounded px-3 py-1.5 text-sm" placeholder="编码 (e.g. SKILL_AI)" value={newItem.code} onChange={(e) => setNewItem({ ...newItem, code: e.target.value })} />
                  <input className="border rounded px-3 py-1.5 text-sm" placeholder="名称" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                  <input className="border rounded px-3 py-1.5 text-sm" placeholder="英文名" value={newItem.nameEn} onChange={(e) => setNewItem({ ...newItem, nameEn: e.target.value })} />
                  <select className="border rounded px-3 py-1.5 text-sm" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select className="border rounded px-3 py-1.5 text-sm" value={newItem.calculationMethod} onChange={(e) => setNewItem({ ...newItem, calculationMethod: e.target.value as any })}>
                    {Object.entries(CALC_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input className="border rounded px-3 py-1.5 text-sm" placeholder="基础金额" value={newItem.baseAmount} onChange={(e) => setNewItem({ ...newItem, baseAmount: e.target.value })} />
                  <input className="border rounded px-3 py-1.5 text-sm" placeholder="上限金额" value={newItem.maxAmount} onChange={(e) => setNewItem({ ...newItem, maxAmount: e.target.value })} />
                </div>
                <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} placeholder="说明" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddCatalog} disabled={upsertCatalog.isPending}>
                    <Save className="h-3.5 w-3.5 mr-1" /> 保存
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddCatalog(false)}>
                    <X className="h-3.5 w-3.5 mr-1" /> 取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2 px-2">编码</th>
                  <th className="text-left py-2 px-2">名称</th>
                  <th className="text-left py-2 px-2">类别</th>
                  <th className="text-center py-2 px-2">计算方式</th>
                  <th className="text-right py-2 px-2">基础金额</th>
                  <th className="text-right py-2 px-2">上限</th>
                </tr>
              </thead>
              <tbody>
                {(catalog.data ?? []).map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 px-2 font-mono text-xs">{item.code}</td>
                    <td className="py-2 px-2 font-medium">{item.name}</td>
                    <td className="py-2 px-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">{CATEGORY_LABELS[item.category] ?? item.category}</span>
                    </td>
                    <td className="text-center py-2 px-2 text-xs">{CALC_METHOD_LABELS[item.calculationMethod] ?? item.calculationMethod}</td>
                    <td className="text-right py-2 px-2">{Number(item.baseAmount).toLocaleString()}</td>
                    <td className="text-right py-2 px-2">{item.maxAmount ? Number(item.maxAmount).toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Section: Award ── */}
      {activeSection === "award" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> 发放激励奖励
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">员工ID</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm mt-1" value={awardForm.employeeId} onChange={(e) => setAwardForm({ ...awardForm, employeeId: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">员工姓名</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm mt-1" value={awardForm.employeeName} onChange={(e) => setAwardForm({ ...awardForm, employeeName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">激励类型</label>
                <select className="w-full border rounded px-3 py-1.5 text-sm mt-1" value={awardForm.catalogItemId} onChange={(e) => setAwardForm({ ...awardForm, catalogItemId: e.target.value })}>
                  <option value="">选择激励类型</option>
                  {(catalog.data ?? []).map((item) => (
                    <option key={item.id} value={String(item.id)}>{item.name} ({item.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">金额 (元)</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm mt-1" type="number" value={awardForm.amount} onChange={(e) => setAwardForm({ ...awardForm, amount: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">发放周期</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm mt-1" type="month" value={awardForm.period} onChange={(e) => setAwardForm({ ...awardForm, period: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">发放理由</label>
              <textarea className="w-full border rounded px-3 py-2 text-sm mt-1" rows={2} value={awardForm.justification} onChange={(e) => setAwardForm({ ...awardForm, justification: e.target.value })} placeholder="请说明奖励发放原因..." />
            </div>
            <Button onClick={handleAward} disabled={awardIncentive.isPending}>
              <Gift className="h-3.5 w-3.5 mr-1" /> {awardIncentive.isPending ? "处理中..." : "发放奖励"}
            </Button>
            {awardIncentive.isSuccess && (
              <div className="text-sm text-green-600">奖励已成功发放！</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Section: Summary ── */}
      {activeSection === "summary" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm">周期:</label>
            <input type="month" className="border rounded px-3 py-1.5 text-sm" value={summaryPeriod} onChange={(e) => setSummaryPeriod(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{totalAwards}</div>
                <div className="text-sm text-muted-foreground">总发放次数</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{totalSpend.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">总支出 (元)</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">按类型统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">激励类型</th>
                      <th className="text-right py-2">次数</th>
                      <th className="text-right py-2">总金额</th>
                      <th className="text-right py-2">占比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.data ?? []).map((s, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2">{s.awardType}</td>
                        <td className="text-right">{s.awardCount}</td>
                        <td className="text-right font-medium">{s.totalAmount.toLocaleString()}</td>
                        <td className="text-right text-muted-foreground">
                          {totalSpend > 0 ? ((s.totalAmount / totalSpend) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(summary.data ?? []).length === 0 && (
                  <div className="text-center text-muted-foreground py-4">该周期暂无发放记录</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
