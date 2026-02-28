/**
 * ServiceDashboardAdmin.tsx — 参数管理中心
 *
 * 3-tab admin: KPI Editor / Locations / Bulk Import
 * Manages service_dashboard_kpis + service_dashboard_locations config tables.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { useLocation } from "wouter";
import {
  Settings, Save, Upload, Download, Plus, Trash2, RefreshCw,
  MapPin, BarChart3, FileSpreadsheet, Edit2, Check, X, AlertTriangle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────────

type Tab = "kpi" | "locations" | "import";

interface KpiRow {
  id: number;
  category: string;
  region: string | null;
  key: string;
  value: number;
  label: string;
  unit: string | null;
  source: string;
  updatedAt: Date | string | null;
}

interface LocationRow {
  id: number;
  region: string;
  city: string;
  state: string | null;
  country: string;
  lat: number;
  lng: number;
  status: string;
  clientName: string | null;
  equipmentType: string | null;
  engineerCount: number;
  updatedAt: Date | string | null;
}

interface CsvKpiRow {
  category: string;
  region: string;
  key: string;
  value: number;
  label: string;
  unit: string;
}

interface CsvLocationRow {
  region: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  status: string;
  clientName: string;
  equipmentType: string;
  engineerCount: number;
}

// ─── CSV Helpers ────────────────────────────────────────────────────────────────

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  });
}

function downloadCsv(headers: string[], filename: string) {
  const blob = new Blob([headers.join(",") + "\n"], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Source Badge ────────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    manual: "bg-blue-100 text-blue-700",
    system: "bg-green-100 text-green-700",
    import: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[source] ?? "bg-gray-100 text-gray-600"}`}>
      {source === "manual" ? "手动" : source === "system" ? "系统" : "导入"}
    </span>
  );
}

// ─── KPI Section Card ──────────────────────────────────────────────────────────

const CATEGORY_INFO: Record<string, { title: string; description: string }> = {
  region_overview: { title: "区域概览", description: "4 个区域 × 5 项 KPI 指标" },
  china_hq: { title: "中国总部", description: "8 项服务 KPI 指标" },
  north_america: { title: "北美", description: "8 项服务 KPI 指标" },
  service_comparison: { title: "服务对比", description: "服务复制对比指标" },
};

function KpiSectionCard({ category, kpis, onSave }: {
  category: string;
  kpis: KpiRow[];
  onSave: (kpi: KpiRow) => void;
}) {
  const info = CATEGORY_INFO[category] ?? { title: category, description: "" };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (kpi: KpiRow) => {
    setEditingId(kpi.id);
    setEditValue(String(kpi.value));
  };

  const saveEdit = (kpi: KpiRow) => {
    const num = parseFloat(editValue);
    if (!isNaN(num)) {
      onSave({ ...kpi, value: num });
    }
    setEditingId(null);
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold text-sm">{info.title}</h3>
        <p className="text-xs text-gray-500">{info.description}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="px-4 py-2">Key</th>
              <th className="px-4 py-2">显示名</th>
              {category === "region_overview" && <th className="px-4 py-2">区域</th>}
              <th className="px-4 py-2 text-right">值</th>
              <th className="px-4 py-2">单位</th>
              <th className="px-4 py-2">来源</th>
              <th className="px-4 py-2 w-16">操作</th>
            </tr>
          </thead>
          <tbody>
            {kpis.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">暂无数据，请手动添加或从系统聚合</td></tr>
            )}
            {kpis.map(kpi => (
              <tr key={kpi.id} className="border-b last:border-b-0 hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs text-gray-600">{kpi.key}</td>
                <td className="px-4 py-2">{kpi.label}</td>
                {category === "region_overview" && <td className="px-4 py-2 text-xs text-gray-500">{kpi.region ?? "—"}</td>}
                <td className="px-4 py-2 text-right">
                  {editingId === kpi.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(kpi); if (e.key === "Escape") setEditingId(null); }}
                        className="w-24 px-2 py-1 text-right border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        autoFocus
                      />
                      <button onClick={() => saveEdit(kpi)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <span className="font-medium cursor-pointer hover:text-blue-600" onClick={() => startEdit(kpi)}>
                      {kpi.value}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs text-gray-400">{kpi.unit || "—"}</td>
                <td className="px-4 py-2"><SourceBadge source={kpi.source} /></td>
                <td className="px-4 py-2">
                  <button onClick={() => startEdit(kpi)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Location Dialog ────────────────────────────────────────────────────────────

function LocationDialog({ initial, onSave, onClose }: {
  initial?: LocationRow;
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    region: initial?.region ?? "NorthAmerica",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    country: initial?.country ?? "US",
    lat: initial?.lat ?? 0,
    lng: initial?.lng ?? 0,
    status: initial?.status ?? "active",
    clientName: initial?.clientName ?? "",
    equipmentType: initial?.equipmentType ?? "",
    engineerCount: initial?.engineerCount ?? 0,
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h3 className="font-semibold text-lg mb-4">{initial ? "编辑站点" : "新增站点"}</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <label className="text-xs text-gray-500">区域</label>
            <select value={form.region} onChange={e => set("region", e.target.value)} className="w-full border rounded px-2 py-1.5 mt-1">
              <option value="NorthAmerica">北美</option>
              <option value="Asia">亚太</option>
              <option value="Europe">欧洲</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">状态</label>
            <select value={form.status} onChange={e => set("status", e.target.value)} className="w-full border rounded px-2 py-1.5 mt-1">
              <option value="active">运行中</option>
              <option value="completed">已完成</option>
              <option value="planned">规划中</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">城市</label>
            <input value={form.city} onChange={e => set("city", e.target.value)} className="w-full border rounded px-2 py-1.5 mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">州/省</label>
            <input value={form.state} onChange={e => set("state", e.target.value)} className="w-full border rounded px-2 py-1.5 mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">国家</label>
            <input value={form.country} onChange={e => set("country", e.target.value)} className="w-full border rounded px-2 py-1.5 mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">工程师数</label>
            <input type="number" value={form.engineerCount} onChange={e => set("engineerCount", Number(e.target.value))} className="w-full border rounded px-2 py-1.5 mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">纬度 (lat)</label>
            <input type="number" step="0.000001" value={form.lat} onChange={e => set("lat", Number(e.target.value))} className="w-full border rounded px-2 py-1.5 mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">经度 (lng)</label>
            <input type="number" step="0.000001" value={form.lng} onChange={e => set("lng", Number(e.target.value))} className="w-full border rounded px-2 py-1.5 mt-1" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500">客户名称</label>
            <input value={form.clientName} onChange={e => set("clientName", e.target.value)} className="w-full border rounded px-2 py-1.5 mt-1" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500">设备类型</label>
            <input value={form.equipmentType} onChange={e => set("equipmentType", e.target.value)} className="w-full border rounded px-2 py-1.5 mt-1" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">取消</button>
          <button
            onClick={() => onSave({ ...form, id: initial?.id })}
            disabled={!form.city || !form.country}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 inline mr-1" />保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CSV Preview ────────────────────────────────────────────────────────────────

function CsvPreview({ headers, rows, onConfirm, onCancel, isPending }: {
  headers: string[];
  rows: string[][];
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const preview = rows.slice(0, 5);
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">预览 — 共 {rows.length} 行</span>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs border rounded hover:bg-white">取消</button>
          <button onClick={onConfirm} disabled={isPending} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {isPending ? "导入中..." : `确认导入 ${rows.length} 行`}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              {headers.map(h => <th key={h} className="px-2 py-1">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} className="border-b">
                {row.map((cell, j) => <td key={j} className="px-2 py-1">{cell}</td>)}
              </tr>
            ))}
            {rows.length > 5 && (
              <tr><td colSpan={headers.length} className="px-2 py-1 text-center text-gray-400">... 还有 {rows.length - 5} 行</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function ServiceDashboardAdmin() {
  // Parse URL params for initial tab/category
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = (searchParams.get("tab") as Tab) || "kpi";
  const initialCategory = searchParams.get("category") || "";

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ─── KPI Tab State ──────────────────────────────────────────────────────
  const kpiQuery = trpc.serviceDashboard.listKpis.useQuery(undefined, { refetchOnWindowFocus: false });
  const upsertKpiMut = trpc.serviceDashboard.upsertKpi.useMutation({
    onSuccess: () => { kpiQuery.refetch(); showMsg("success", "KPI 已更新"); },
    onError: (e) => showMsg("error", e.message),
  });
  const syncMut = trpc.serviceDashboard.syncFromDB.useMutation({
    onSuccess: (data) => {
      kpiQuery.refetch();
      showMsg("success", `已同步 ${data.synced} 项 KPI${data.diffs.length ? ` (${data.diffs.map(d => d.key).join(", ")})` : ""}`);
    },
    onError: (e) => showMsg("error", e.message),
  });

  // ─── Location Tab State ─────────────────────────────────────────────────
  const locQuery = trpc.serviceDashboard.listLocations.useQuery(undefined, { refetchOnWindowFocus: false });
  const upsertLocMut = trpc.serviceDashboard.upsertLocation.useMutation({
    onSuccess: () => { locQuery.refetch(); showMsg("success", "站点已保存"); setEditingLoc(null); },
    onError: (e) => showMsg("error", e.message),
  });
  const deleteLocMut = trpc.serviceDashboard.deleteLocation.useMutation({
    onSuccess: () => { locQuery.refetch(); showMsg("success", "站点已删除"); },
    onError: (e) => showMsg("error", e.message),
  });
  const [editingLoc, setEditingLoc] = useState<LocationRow | "new" | null>(null);

  // ─── Bulk Import State ──────────────────────────────────────────────────
  const bulkKpiMut = trpc.serviceDashboard.bulkUpsertKpis.useMutation({
    onSuccess: (data) => {
      kpiQuery.refetch();
      showMsg("success", `已导入 ${data.total} 行 (新增 ${data.inserted}, 更新 ${data.updated})`);
      setKpiCsvPreview(null);
    },
    onError: (e) => showMsg("error", e.message),
  });
  const [kpiCsvPreview, setKpiCsvPreview] = useState<{ headers: string[]; rows: string[][]; parsed: CsvKpiRow[] } | null>(null);
  const [locCsvPreview, setLocCsvPreview] = useState<{ headers: string[]; rows: string[][]; parsed: CsvLocationRow[] } | null>(null);
  const kpiFileRef = useRef<HTMLInputElement>(null);
  const locFileRef = useRef<HTMLInputElement>(null);

  const showMsg = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  // Scroll to category if specified in URL
  useEffect(() => {
    if (initialCategory && activeTab === "kpi") {
      setTimeout(() => {
        document.getElementById(`kpi-section-${initialCategory}`)?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [initialCategory, activeTab]);

  // ─── CSV file handlers ──────────────────────────────────────────────────

  const handleKpiCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = parseCsv(text);
      if (lines.length < 2) { showMsg("error", "CSV 至少需要表头 + 1 行数据"); return; }
      const headers = lines[0];
      const dataRows = lines.slice(1);
      const parsed: CsvKpiRow[] = dataRows.map(cols => ({
        category: cols[0] ?? "",
        region: cols[1] ?? "",
        key: cols[2] ?? "",
        value: parseFloat(cols[3] ?? "0"),
        label: cols[4] ?? "",
        unit: cols[5] ?? "",
      })).filter(r => r.category && r.key);
      setKpiCsvPreview({ headers, rows: dataRows, parsed });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLocCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = parseCsv(text);
      if (lines.length < 2) { showMsg("error", "CSV 至少需要表头 + 1 行数据"); return; }
      const headers = lines[0];
      const dataRows = lines.slice(1);
      const parsed: CsvLocationRow[] = dataRows.map(cols => ({
        region: cols[0] ?? "NorthAmerica",
        city: cols[1] ?? "",
        state: cols[2] ?? "",
        country: cols[3] ?? "US",
        lat: parseFloat(cols[4] ?? "0"),
        lng: parseFloat(cols[5] ?? "0"),
        status: cols[6] ?? "active",
        clientName: cols[7] ?? "",
        equipmentType: cols[8] ?? "",
        engineerCount: parseInt(cols[9] ?? "0", 10),
      })).filter(r => r.city && r.country);
      setLocCsvPreview({ headers, rows: dataRows, parsed });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmKpiImport = () => {
    if (!kpiCsvPreview) return;
    bulkKpiMut.mutate({
      items: kpiCsvPreview.parsed.map(r => ({
        category: r.category,
        region: r.region || null,
        key: r.key,
        value: r.value,
        label: r.label,
        unit: r.unit,
      })),
    });
  };

  const confirmLocImport = async () => {
    if (!locCsvPreview) return;
    let ok = 0;
    for (const loc of locCsvPreview.parsed) {
      try {
        const validStatus = ["active", "completed", "planned"].includes(loc.status)
          ? (loc.status as "active" | "completed" | "planned")
          : ("active" as const);
        await upsertLocMut.mutateAsync({ ...loc, status: validStatus });
        ok++;
      } catch { /* skip */ }
    }
    locQuery.refetch();
    showMsg("success", `站点导入完成: ${ok}/${locCsvPreview.parsed.length}`);
    setLocCsvPreview(null);
  };

  // ─── Grouped KPIs ──────────────────────────────────────────────────────

  const kpis: KpiRow[] = (kpiQuery.data ?? []).map(k => ({
    id: k.id ?? 0,
    category: k.category ?? "",
    region: k.region ?? null,
    key: k.key ?? "",
    value: k.value ?? 0,
    label: k.label ?? "",
    unit: k.unit ?? null,
    source: k.source ?? "manual",
    updatedAt: k.updatedAt ?? null,
  }));
  const kpisByCategory = ["region_overview", "china_hq", "north_america", "service_comparison"].map(cat => ({
    category: cat,
    items: kpis.filter(k => k.category === cat),
  }));

  const handleKpiSave = (kpi: KpiRow) => {
    upsertKpiMut.mutate({
      category: kpi.category,
      region: kpi.region,
      key: kpi.key,
      value: kpi.value,
      label: kpi.label,
      unit: kpi.unit ?? undefined,
      source: "manual",
    });
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string; icon: typeof Settings }[] = [
    { key: "kpi", label: "KPI 指标管理", icon: BarChart3 },
    { key: "locations", label: "项目站点管理", icon: MapPin },
    { key: "import", label: "批量导入", icon: FileSpreadsheet },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            客服系统参数管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">管理全球客服展示系统的 KPI、站点坐标、批量数据</p>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div className={`px-4 py-2 rounded text-sm flex items-center gap-2 ${
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.type === "error" && <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab: KPI 指标管理 ────────────────────────────────────────────── */}
      {activeTab === "kpi" && (
        <div className="space-y-4">
          {/* Sync button */}
          <div className="flex justify-end">
            <button
              onClick={() => syncMut.mutate()}
              disabled={syncMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncMut.isPending ? "animate-spin" : ""}`} />
              {syncMut.isPending ? "聚合中..." : "从系统聚合"}
            </button>
          </div>

          {kpiQuery.isLoading ? (
            <div className="text-center text-gray-400 py-12">加载中...</div>
          ) : (
            kpisByCategory.map(({ category, items }) => (
              <div key={category} id={`kpi-section-${category}`}>
                <KpiSectionCard category={category} kpis={items} onSave={handleKpiSave} />
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Tab: 项目站点管理 ───────────────────────────────────────────── */}
      {activeTab === "locations" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setEditingLoc("new")}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> 新增站点
            </button>
          </div>

          <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
                  <th className="px-3 py-2">城市</th>
                  <th className="px-3 py-2">州/省</th>
                  <th className="px-3 py-2">国家</th>
                  <th className="px-3 py-2">纬度</th>
                  <th className="px-3 py-2">经度</th>
                  <th className="px-3 py-2">状态</th>
                  <th className="px-3 py-2">客户</th>
                  <th className="px-3 py-2">设备</th>
                  <th className="px-3 py-2 text-right">工程师</th>
                  <th className="px-3 py-2 w-20">操作</th>
                </tr>
              </thead>
              <tbody>
                {locQuery.isLoading && (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">加载中...</td></tr>
                )}
                {!locQuery.isLoading && (locQuery.data ?? []).length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">暂无站点，请新增或批量导入</td></tr>
                )}
                {(locQuery.data ?? []).map(loc => {
                  const statusLabel: Record<string, string> = { active: "运行中", completed: "已完成", planned: "规划中" };
                  const statusColor: Record<string, string> = { active: "bg-green-100 text-green-700", completed: "bg-blue-100 text-blue-700", planned: "bg-amber-100 text-amber-700" };
                  return (
                    <tr key={loc.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{loc.city}</td>
                      <td className="px-3 py-2 text-gray-500">{loc.state || "—"}</td>
                      <td className="px-3 py-2">{loc.country}</td>
                      <td className="px-3 py-2 font-mono text-xs">{loc.lat}</td>
                      <td className="px-3 py-2 font-mono text-xs">{loc.lng}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor[loc.status] ?? ""}`}>
                          {statusLabel[loc.status] ?? loc.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs truncate max-w-[140px]">{loc.clientName || "—"}</td>
                      <td className="px-3 py-2 text-xs truncate max-w-[140px]">{loc.equipmentType || "—"}</td>
                      <td className="px-3 py-2 text-right">{loc.engineerCount}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => setEditingLoc(loc as LocationRow)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { if (confirm("确定删除此站点？")) deleteLocMut.mutate({ id: loc.id }); }}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Location Dialog */}
          {editingLoc && (
            <LocationDialog
              initial={editingLoc === "new" ? undefined : editingLoc}
              onSave={(data) => upsertLocMut.mutate(data)}
              onClose={() => setEditingLoc(null)}
            />
          )}
        </div>
      )}

      {/* ─── Tab: 批量导入 ───────────────────────────────────────────────── */}
      {activeTab === "import" && (
        <div className="space-y-6">
          {/* KPI Import */}
          <div className="bg-white border rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> KPI 批量导入</h3>
                <p className="text-xs text-gray-500 mt-0.5">CSV 格式: category, region, key, value, label, unit</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadCsv(["category", "region", "key", "value", "label", "unit"], "kpi-template.csv")}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
                >
                  <Download className="w-3.5 h-3.5" /> 下载模板
                </button>
                <button onClick={() => kpiFileRef.current?.click()} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                  <Upload className="w-3.5 h-3.5" /> 上传 CSV
                </button>
                <input ref={kpiFileRef} type="file" accept=".csv" className="hidden" onChange={handleKpiCsv} />
              </div>
            </div>
            {kpiCsvPreview && (
              <CsvPreview
                headers={kpiCsvPreview.headers}
                rows={kpiCsvPreview.rows}
                onConfirm={confirmKpiImport}
                onCancel={() => setKpiCsvPreview(null)}
                isPending={bulkKpiMut.isPending}
              />
            )}
          </div>

          {/* Location Import */}
          <div className="bg-white border rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-green-500" /> 站点批量导入</h3>
                <p className="text-xs text-gray-500 mt-0.5">CSV 格式: region, city, state, country, lat, lng, status, clientName, equipmentType, engineerCount</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadCsv(["region", "city", "state", "country", "lat", "lng", "status", "clientName", "equipmentType", "engineerCount"], "locations-template.csv")}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
                >
                  <Download className="w-3.5 h-3.5" /> 下载模板
                </button>
                <button onClick={() => locFileRef.current?.click()} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                  <Upload className="w-3.5 h-3.5" /> 上传 CSV
                </button>
                <input ref={locFileRef} type="file" accept=".csv" className="hidden" onChange={handleLocCsv} />
              </div>
            </div>
            {locCsvPreview && (
              <CsvPreview
                headers={locCsvPreview.headers}
                rows={locCsvPreview.rows}
                onConfirm={confirmLocImport}
                onCancel={() => setLocCsvPreview(null)}
                isPending={upsertLocMut.isPending}
              />
            )}
          </div>

          {/* Spare Parts Import (link to existing) */}
          <div className="bg-white border rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-amber-500" /> 备件库存更新</h3>
                <p className="text-xs text-gray-500 mt-0.5">备件数据已由供应链模块管理，请前往供应链工作台操作</p>
              </div>
              <a href="/supply-chain-workbench" className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded hover:bg-gray-50 text-blue-600">
                前往供应链模块 →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
