import React, { createContext, useContext, useCallback, useRef, useEffect, useState, useMemo } from "react";
import FloatingNav from '@/components/FloatingNav';

// ═══════════════════════════════════════════════════════════════
// §1  Core Metadata Protocol — zero `any`
// ═══════════════════════════════════════════════════════════════

type FieldType = "text" | "number" | "select" | "date" | "textarea" | "boolean";
type FieldConstraint = "required" | "unique" | "indexed" | "fk";
type DbColumnType = "varchar(200)" | "integer" | "decimal(12,2)" | "timestamp" | "text" | "boolean" | "serial";
type BusEventName = string; // strong-typed at schema level via const assertions

interface IFieldDef {
  readonly key: string;
  readonly label: string;
  readonly type: FieldType;
  readonly dbColumn: DbColumnType;
  readonly constraints: readonly FieldConstraint[];
  readonly options?: readonly { value: string; label: string }[];
  readonly placeholder?: string;
  readonly defaultValue?: string | number | boolean;
  readonly width?: "full" | "half" | "third";
}

interface IActionDef {
  readonly key: string;
  readonly label: string;
  readonly icon: string;
  readonly color: "blue" | "red" | "green" | "amber" | "purple" | "cyan";
  readonly triggerEvent: BusEventName;
  readonly payloadFields: readonly string[];   // which form fields to collect
  readonly confirmText?: string;
}

interface IEventContract {
  readonly subscribesTo: readonly BusEventName[];
  readonly publishes: readonly BusEventName[];
}

interface IDbEntityDef {
  readonly entityName: string;
  readonly tableName: string;
  readonly primaryKey: string;
  readonly timestamps: boolean;
  readonly softDelete: boolean;
}

interface IKpiDef {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  readonly initialValue: number;
  readonly format: "number" | "percent" | "currency";
}

type SandboxStatus = "empty" | "schema-ready" | "engine-mounted" | "live";

interface ISandboxSchema {
  readonly id: string;
  readonly title: string;
  readonly titleEn: string;
  readonly icon: string;
  readonly domain: "supply-chain" | "quality" | "oa" | "finance" | "hr" | "manufacturing";
  readonly status: SandboxStatus;
  readonly dbEntity: IDbEntityDef;
  readonly fields: readonly IFieldDef[];
  readonly actions: readonly IActionDef[];
  readonly eventContracts: IEventContract;
  readonly kpis: readonly IKpiDef[];
  readonly listColumns: readonly string[];     // field keys to show in table
}

// ─── EventBus types ───

interface IEventRecord {
  readonly id: number;
  readonly event: BusEventName;
  readonly payload: Record<string, string | number | boolean>;
  readonly source: string;
  readonly timestamp: number;
}

type EventCallback = (payload: Record<string, string | number | boolean>, record: IEventRecord) => void;

interface IMetaEventBus {
  publish(event: BusEventName, payload: Record<string, string | number | boolean>, source: string): void;
  subscribe(event: BusEventName, cb: EventCallback): () => void;
  readonly history: readonly IEventRecord[];
}

// ─── Inspection types ───

type InspectionStatus = "pending" | "scanning" | "pass" | "warn" | "fail";

interface IInspectionResult {
  readonly sandboxId: string;
  readonly checkName: string;
  readonly status: InspectionStatus;
  readonly detail: string;
  readonly timestamp: number;
}

// ─── Scaffold row ───

interface IDataRow {
  readonly _id: number;
  readonly [key: string]: string | number | boolean;
}

// ═══════════════════════════════════════════════════════════════
// §2  Three Auto-Generated Sandbox Schemas
// ═══════════════════════════════════════════════════════════════

const SupplyChainSchema: ISandboxSchema = {
  id: "supply-chain",
  title: "供应链与物料管理",
  titleEn: "Supply Chain & Materials",
  icon: "🚚",
  domain: "supply-chain",
  status: "schema-ready",
  dbEntity: {
    entityName: "SupplyChainMaterial",
    tableName: "supply_chain_materials",
    primaryKey: "id",
    timestamps: true,
    softDelete: true,
  },
  fields: [
    { key: "materialCode", label: "物料编码", type: "text", dbColumn: "varchar(200)", constraints: ["required", "unique"], placeholder: "MAT-XXX-000", width: "half" },
    { key: "materialName", label: "物料名称", type: "text", dbColumn: "varchar(200)", constraints: ["required", "indexed"], placeholder: "密封圈套件", width: "half" },
    { key: "category", label: "物料分类", type: "select", dbColumn: "varchar(200)", constraints: ["required"], width: "third",
      options: [
        { value: "raw", label: "原材料" }, { value: "component", label: "外购件" },
        { value: "standard", label: "标准件" }, { value: "consumable", label: "耗材" },
      ] },
    { key: "specification", label: "规格型号", type: "text", dbColumn: "varchar(200)", constraints: [], placeholder: "Φ45×3.5", width: "third" },
    { key: "stockQty", label: "库存数量", type: "number", dbColumn: "integer", constraints: [], defaultValue: 0, width: "third" },
    { key: "unitPrice", label: "单价 (¥)", type: "number", dbColumn: "decimal(12,2)", constraints: [], defaultValue: 0, width: "third" },
    { key: "supplier", label: "供应商", type: "text", dbColumn: "varchar(200)", constraints: ["indexed"], placeholder: "上海密封件有限公司", width: "third" },
    { key: "leadTimeDays", label: "交期 (天)", type: "number", dbColumn: "integer", constraints: [], defaultValue: 7, width: "third" },
    { key: "minStock", label: "安全库存", type: "number", dbColumn: "integer", constraints: [], defaultValue: 50, width: "third" },
    { key: "notes", label: "备注", type: "textarea", dbColumn: "text", constraints: [], width: "full" },
  ],
  actions: [
    { key: "release", label: "物料齐套确认 → 通知生产排产", icon: "🚀", color: "green", triggerEvent: "MATERIAL_READY", payloadFields: ["materialCode", "materialName", "stockQty"] },
    { key: "alert", label: "库存预警 → 触发紧急采购", icon: "⚠️", color: "amber", triggerEvent: "STOCK_LOW_ALERT", payloadFields: ["materialCode", "materialName", "stockQty", "minStock"] },
  ],
  eventContracts: {
    subscribesTo: ["MFG_DEMAND_CREATED"],
    publishes: ["MATERIAL_READY", "STOCK_LOW_ALERT"],
  },
  kpis: [
    { key: "materialCount", label: "物料种类", unit: "种", initialValue: 0, format: "number" },
    { key: "totalValue", label: "库存总值", unit: "¥", initialValue: 0, format: "currency" },
    { key: "fillRate", label: "齐套率", unit: "%", initialValue: 100, format: "percent" },
  ],
  listColumns: ["materialCode", "materialName", "category", "stockQty", "unitPrice", "supplier"],
} as const;

const QualitySchema: ISandboxSchema = {
  id: "quality",
  title: "质量风控与异常管理",
  titleEn: "Quality Risk & Anomaly Control",
  icon: "🛡️",
  domain: "quality",
  status: "schema-ready",
  dbEntity: {
    entityName: "QualityAnomaly",
    tableName: "quality_anomalies",
    primaryKey: "id",
    timestamps: true,
    softDelete: false,
  },
  fields: [
    { key: "anomalyCode", label: "异常编号", type: "text", dbColumn: "varchar(200)", constraints: ["required", "unique"], placeholder: "QA-2026-XXXX", width: "half" },
    { key: "projectId", label: "关联项目", type: "text", dbColumn: "varchar(200)", constraints: ["required", "indexed"], placeholder: "P-2026-M12", width: "half" },
    { key: "severity", label: "严重等级", type: "select", dbColumn: "varchar(200)", constraints: ["required"], width: "third",
      options: [
        { value: "critical", label: "致命 (A级)" }, { value: "major", label: "严重 (B级)" },
        { value: "minor", label: "一般 (C级)" }, { value: "observation", label: "观察项" },
      ] },
    { key: "station", label: "工位编号", type: "text", dbColumn: "varchar(200)", constraints: ["indexed"], placeholder: "A3", width: "third" },
    { key: "worker", label: "责任人", type: "text", dbColumn: "varchar(200)", constraints: ["required"], placeholder: "王师傅", width: "third" },
    { key: "defectType", label: "缺陷类型", type: "select", dbColumn: "varchar(200)", constraints: ["required"], width: "half",
      options: [
        { value: "seal", label: "密封不良" }, { value: "dimension", label: "尺寸超差" },
        { value: "surface", label: "表面缺陷" }, { value: "assembly", label: "装配错误" },
        { value: "material", label: "来料不良" }, { value: "other", label: "其他" },
      ] },
    { key: "description", label: "问题描述", type: "textarea", dbColumn: "text", constraints: ["required"], placeholder: "法兰面漏打密封胶，导致泄漏", width: "full" },
    { key: "reworkCost", label: "返工成本 (¥)", type: "number", dbColumn: "decimal(12,2)", constraints: [], defaultValue: 0, width: "half" },
    { key: "discoveryDate", label: "发现日期", type: "date", dbColumn: "timestamp", constraints: ["required"], width: "half" },
  ],
  actions: [
    { key: "report", label: "上报质量异常 → 触发全链路拦截", icon: "🚨", color: "red", triggerEvent: "QA_FAILED", payloadFields: ["anomalyCode", "worker", "station", "defectType", "severity", "reworkCost"] },
    { key: "close", label: "关闭异常 → 恢复产线", icon: "✅", color: "green", triggerEvent: "QA_RESOLVED", payloadFields: ["anomalyCode", "worker"] },
  ],
  eventContracts: {
    subscribesTo: ["MFG_INSPECTION_TRIGGERED"],
    publishes: ["QA_FAILED", "QA_RESOLVED"],
  },
  kpis: [
    { key: "openCount", label: "未关闭异常", unit: "件", initialValue: 0, format: "number" },
    { key: "fpy", label: "一次交验率", unit: "%", initialValue: 99.8, format: "percent" },
    { key: "reworkTotal", label: "返工总额", unit: "¥", initialValue: 0, format: "currency" },
  ],
  listColumns: ["anomalyCode", "projectId", "severity", "worker", "defectType", "reworkCost"],
} as const;

const SmartOASchema: ISandboxSchema = {
  id: "smart-oa",
  title: "Smart OA 协同办公",
  titleEn: "Smart OA & Collaboration",
  icon: "📋",
  domain: "oa",
  status: "schema-ready",
  dbEntity: {
    entityName: "OaPenaltyOrder",
    tableName: "oa_penalty_orders",
    primaryKey: "id",
    timestamps: true,
    softDelete: false,
  },
  fields: [
    { key: "formId", label: "工单编号", type: "text", dbColumn: "varchar(200)", constraints: ["required", "unique"], placeholder: "PEN-2026-XXXX", width: "half" },
    { key: "formType", label: "工单类型", type: "select", dbColumn: "varchar(200)", constraints: ["required"], width: "half",
      options: [
        { value: "penalty", label: "质量处罚单" }, { value: "reward", label: "奖励申请" },
        { value: "approval", label: "审批流程" }, { value: "leave", label: "请假申请" },
      ] },
    { key: "targetWorker", label: "当事人", type: "text", dbColumn: "varchar(200)", constraints: ["required", "indexed"], placeholder: "王师傅", width: "third" },
    { key: "department", label: "所属部门", type: "select", dbColumn: "varchar(200)", constraints: [], width: "third",
      options: [
        { value: "mfg", label: "生产部" }, { value: "rnd", label: "研发部" },
        { value: "qa", label: "质量部" }, { value: "hr", label: "人力资源" },
      ] },
    { key: "points", label: "扣除积分", type: "number", dbColumn: "integer", constraints: [], defaultValue: 5, width: "third" },
    { key: "reason", label: "事由说明", type: "textarea", dbColumn: "text", constraints: ["required"], placeholder: "因质量事故，依据 SOP-SEAL-003...", width: "full" },
    { key: "approvalStatus", label: "审批状态", type: "select", dbColumn: "varchar(200)", constraints: [], width: "half", defaultValue: "pending",
      options: [
        { value: "pending", label: "待审批" }, { value: "approved", label: "已批准" },
        { value: "rejected", label: "已驳回" },
      ] },
    { key: "linkedAnomalyCode", label: "关联异常单号", type: "text", dbColumn: "varchar(200)", constraints: ["indexed", "fk"], placeholder: "QA-2026-XXXX", width: "half" },
  ],
  actions: [
    { key: "create", label: "生成处罚工单", icon: "📝", color: "amber", triggerEvent: "OA_PENALTY_CREATED", payloadFields: ["formId", "targetWorker", "points", "reason"] },
    { key: "approve", label: "审批通过 → 触发薪酬联动", icon: "✅", color: "green", triggerEvent: "OA_PENALTY_APPROVED", payloadFields: ["formId", "targetWorker", "points"] },
  ],
  eventContracts: {
    subscribesTo: ["QA_FAILED"],
    publishes: ["OA_PENALTY_CREATED", "OA_PENALTY_APPROVED"],
  },
  kpis: [
    { key: "pendingCount", label: "待处理", unit: "件", initialValue: 0, format: "number" },
    { key: "totalPenalties", label: "本月处罚", unit: "件", initialValue: 0, format: "number" },
    { key: "totalPoints", label: "扣分总计", unit: "分", initialValue: 0, format: "number" },
  ],
  listColumns: ["formId", "formType", "targetWorker", "points", "approvalStatus", "linkedAnomalyCode"],
} as const;

// ─── Registry ───

const sandboxRegistry: readonly ISandboxSchema[] = [SupplyChainSchema, QualitySchema, SmartOASchema];

// ═══════════════════════════════════════════════════════════════
// §3  EventBus Context
// ═══════════════════════════════════════════════════════════════

const EventBusCtx = createContext<IMetaEventBus | null>(null);

function useEventBus(): IMetaEventBus {
  const ctx = useContext(EventBusCtx);
  if (!ctx) throw new Error("useEventBus requires EventBusProvider");
  return ctx;
}

function MetaEventBusProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const seq = useRef(0);
  const subs = useRef<Map<string, Set<EventCallback>>>(new Map());
  const [history, setHistory] = useState<IEventRecord[]>([]);

  const subscribe = useCallback((event: string, cb: EventCallback) => {
    if (!subs.current.has(event)) subs.current.set(event, new Set());
    subs.current.get(event)!.add(cb);
    return () => { subs.current.get(event)?.delete(cb); };
  }, []);

  const publish = useCallback((event: string, payload: Record<string, string | number | boolean>, source: string) => {
    const record: IEventRecord = { id: ++seq.current, event, payload, source, timestamp: Date.now() };
    setHistory((h) => [...h, record]);
    subs.current.get(event)?.forEach((cb) => cb(payload, record));
  }, []);

  return <EventBusCtx.Provider value={{ publish, subscribe, history }}>{children}</EventBusCtx.Provider>;
}

// ═══════════════════════════════════════════════════════════════
// §4  CSS Keyframes
// ═══════════════════════════════════════════════════════════════

const MDE_STYLE = "mde-keyframes";
function injectStyles(): void {
  if (document.getElementById(MDE_STYLE)) return;
  const el = document.createElement("style");
  el.id = MDE_STYLE;
  el.textContent = `
@keyframes mdePulse{0%,100%{box-shadow:0 0 4px var(--pc,rgba(59,130,246,.3))}50%{box-shadow:0 0 18px var(--pc,rgba(59,130,246,.6)),0 0 36px var(--pc,rgba(59,130,246,.15))}}
@keyframes mdeGlow{0%,100%{opacity:.45}50%{opacity:1}}
@keyframes mdeScan{0%{transform:translateY(-100%)}100%{transform:translateY(600%)}}
@keyframes mdeSlide{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
@keyframes mdePop{0%{transform:scale(0)}60%{transform:scale(1.15)}100%{transform:scale(1)}}
@keyframes mdeBreathe{0%,100%{box-shadow:inset 0 0 8px var(--bc,rgba(34,197,94,.04))}50%{box-shadow:inset 0 0 20px var(--bc,rgba(34,197,94,.1))}}
@keyframes mdeCheck{0%{stroke-dashoffset:20}100%{stroke-dashoffset:0}}
@keyframes mdeScanBar{0%{left:-30%}100%{left:100%}}
`;
  document.head.appendChild(el);
}

// ═══════════════════════════════════════════════════════════════
// §5  GrtAutoSandbox — Universal Rendering Engine
// ═══════════════════════════════════════════════════════════════

const COLOR_MAP: Record<string, { border: string; bg: string; text: string; pulse: string }> = {
  blue:   { border: "border-blue-500/50", bg: "bg-blue-600", text: "text-blue-100", pulse: "rgba(59,130,246,.5)" },
  red:    { border: "border-red-500/50", bg: "bg-red-600", text: "text-red-100", pulse: "rgba(239,68,68,.5)" },
  green:  { border: "border-green-500/50", bg: "bg-green-600", text: "text-green-100", pulse: "rgba(34,197,94,.5)" },
  amber:  { border: "border-amber-500/50", bg: "bg-amber-600", text: "text-amber-100", pulse: "rgba(245,158,11,.5)" },
  purple: { border: "border-purple-500/50", bg: "bg-purple-600", text: "text-purple-100", pulse: "rgba(168,85,247,.5)" },
  cyan:   { border: "border-cyan-500/50", bg: "bg-cyan-600", text: "text-cyan-100", pulse: "rgba(6,182,212,.5)" },
};

function GrtAutoSandbox({ schema }: { schema: ISandboxSchema }): React.ReactElement {
  const bus = useEventBus();
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>(() => {
    const init: Record<string, string | number | boolean> = {};
    for (const f of schema.fields) {
      if (f.defaultValue !== undefined) init[f.key] = f.defaultValue;
      else if (f.type === "number") init[f.key] = 0;
      else if (f.type === "boolean") init[f.key] = false;
      else init[f.key] = "";
    }
    return init;
  });
  const [rows, setRows] = useState<IDataRow[]>([]);
  const [kpis, setKpis] = useState(() => Object.fromEntries(schema.kpis.map((k) => [k.key, k.initialValue])));
  const [busMessages, setBusMessages] = useState<{ text: string; level: "info" | "warn" }[]>([]);
  const rowSeq = useRef(0);

  // Subscribe to incoming events
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    for (const evt of schema.eventContracts.subscribesTo) {
      unsubs.push(bus.subscribe(evt, (payload) => {
        setBusMessages((p) => [...p, { text: `[subscribe] ${evt} 接收 → ${JSON.stringify(payload)}`, level: "info" }]);
        // Auto-populate form fields from payload
        setFormData((prev) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(payload)) {
            if (k in next) next[k] = v;
          }
          return next;
        });
      }));
    }
    return () => unsubs.forEach((u) => u());
  }, [bus, schema.eventContracts.subscribesTo]);

  const setField = useCallback((key: string, value: string | number | boolean) => {
    setFormData((p) => ({ ...p, [key]: value }));
  }, []);

  const handleAction = useCallback((action: IActionDef) => {
    // Collect payload from specified fields
    const payload: Record<string, string | number | boolean> = {};
    for (const fk of action.payloadFields) {
      payload[fk] = formData[fk] ?? "";
    }
    // Publish to EventBus
    bus.publish(action.triggerEvent, payload, `sandbox-${schema.id}`);
    setBusMessages((p) => [...p, { text: `[publish] ${action.triggerEvent} → ${JSON.stringify(payload)}`, level: "warn" }]);
    // Add to local table
    const row: IDataRow = { _id: ++rowSeq.current, ...formData };
    setRows((p) => [row, ...p]);
    // Update KPIs
    setKpis((prev) => {
      const next = { ...prev };
      const countKey = schema.kpis[0]?.key;
      if (countKey && typeof next[countKey] === "number") next[countKey] = (next[countKey] as number) + 1;
      return next;
    });
  }, [bus, formData, schema.id, schema.kpis]);

  const widthClass: Record<string, string> = { full: "col-span-6", half: "col-span-3", third: "col-span-2" };

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      {/* ── KPI Bar ── */}
      <div className="grid grid-cols-3 gap-3">
        {schema.kpis.map((k) => (
          <div key={k.key} className="rounded-lg border border-neutral-800/50 bg-neutral-900/50 p-3 text-center">
            <div className="text-[10px] text-neutral-500 font-mono mb-1">{k.label}</div>
            <div className="text-lg font-bold text-neutral-100 tabular-nums">
              {k.format === "currency" && "¥"}
              {typeof kpis[k.key] === "number" ? (kpis[k.key] as number).toLocaleString() : kpis[k.key]}
              {k.format === "percent" && "%"}
              <span className="text-[10px] text-neutral-500 ml-1">{k.format !== "currency" && k.format !== "percent" ? k.unit : ""}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Action Toolbar ── */}
      <div className="flex gap-2 flex-wrap">
        {schema.actions.map((action) => {
          const c = COLOR_MAP[action.color] ?? COLOR_MAP.blue;
          return (
            <button
              key={action.key}
              onClick={() => handleAction(action)}
              className={`
                relative px-4 py-2.5 rounded-xl text-xs font-bold border-2 ${c.border} ${c.text}
                bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950
                hover:brightness-125 transition-all duration-300 overflow-hidden cursor-pointer
              `}
              style={{ "--pc": c.pulse, animation: "mdePulse 2.5s infinite" } as React.CSSProperties}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[.03] to-transparent" style={{ animation: "mdeScan 2.5s linear infinite" }} />
              <span className="relative z-10 flex items-center gap-1.5">
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Auto-generated Form ── */}
      <div className="rounded-xl border border-neutral-800/40 bg-neutral-900/30 p-4">
        <div className="text-[9px] font-mono text-neutral-600 tracking-widest uppercase mb-3">
          AUTO-RENDERED FROM SCHEMA · {schema.fields.length} FIELDS · DB: {schema.dbEntity.tableName}
        </div>
        <div className="grid grid-cols-6 gap-3">
          {schema.fields.map((field) => (
            <div key={field.key} className={widthClass[field.width ?? "full"]}>
              <label className="block text-[10px] text-neutral-400 mb-1 font-mono">
                {field.label}
                {field.constraints.includes("required") && <span className="text-red-400 ml-0.5">*</span>}
                <span className="text-neutral-700 ml-1">{field.dbColumn}</span>
              </label>
              {field.type === "select" ? (
                <select
                  value={String(formData[field.key] ?? "")}
                  onChange={(e) => setField(field.key, e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700/60 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:border-blue-500/60 focus:outline-none transition-colors"
                >
                  <option value="">-- 选择 --</option>
                  {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  value={String(formData[field.key] ?? "")}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={2}
                  className="w-full bg-neutral-900 border border-neutral-700/60 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:border-blue-500/60 focus:outline-none resize-none transition-colors"
                />
              ) : (
                <input
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  value={formData[field.key] !== undefined ? String(formData[field.key]) : ""}
                  onChange={(e) => setField(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full bg-neutral-900 border border-neutral-700/60 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:border-blue-500/60 focus:outline-none transition-colors"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Auto-generated Table ── */}
      <div className="rounded-xl border border-neutral-800/40 bg-neutral-900/30 p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-mono text-neutral-600 tracking-widest uppercase">
            RECORDS · {rows.length} rows · TABLE: {schema.dbEntity.tableName}
          </span>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-neutral-800/50">
                <th className="py-1.5 px-2 text-left text-neutral-500 font-mono font-normal">#</th>
                {schema.listColumns.map((col) => {
                  const field = schema.fields.find((f) => f.key === col);
                  return <th key={col} className="py-1.5 px-2 text-left text-neutral-500 font-mono font-normal">{field?.label ?? col}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={schema.listColumns.length + 1} className="py-8 text-center text-neutral-700 font-mono text-[10px]">{"// 点击上方操作按钮添加记录..."}</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="border-b border-neutral-800/20 hover:bg-neutral-800/20 transition-colors" style={{ animation: "mdeSlide .3s ease-out" }}>
                    <td className="py-1.5 px-2 text-neutral-600 font-mono">{row._id}</td>
                    {schema.listColumns.map((col) => (
                      <td key={col} className="py-1.5 px-2 text-neutral-300 font-mono">{String(row[col] ?? "—")}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bus messages ── */}
      {busMessages.length > 0 && (
        <div className="rounded-lg border border-neutral-800/40 bg-black/30 p-3 max-h-32 overflow-y-auto">
          <div className="text-[8px] font-mono text-neutral-600 tracking-widest uppercase mb-1">EventBus I/O Log</div>
          {busMessages.slice(-6).map((m, i) => (
            <div key={i} className={`text-[10px] font-mono ${m.level === "warn" ? "text-amber-400" : "text-cyan-400"}`} style={{ animation: "mdeSlide .2s ease-out" }}>
              {m.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §6  Autonomous Inspection Engine
// ═══════════════════════════════════════════════════════════════

function runInspection(schema: ISandboxSchema): IInspectionResult[] {
  const results: IInspectionResult[] = [];
  const ts = Date.now();
  const sid = schema.id;

  // Check 1: Schema completeness
  const hasFields = schema.fields.length >= 3;
  results.push({
    sandboxId: sid, checkName: "Schema 字段完整性",
    status: hasFields ? "pass" : "fail",
    detail: hasFields ? `${schema.fields.length} 字段已定义，含 ${schema.fields.filter((f) => f.constraints.includes("required")).length} 必填` : "字段不足 3 个",
    timestamp: ts,
  });

  // Check 2: DB entity valid
  const hasDb = schema.dbEntity.tableName.length > 0 && schema.dbEntity.primaryKey.length > 0;
  results.push({
    sandboxId: sid, checkName: "DB Entity 映射",
    status: hasDb ? "pass" : "fail",
    detail: hasDb ? `${schema.dbEntity.entityName} → ${schema.dbEntity.tableName} (PK: ${schema.dbEntity.primaryKey})` : "缺少表名或主键",
    timestamp: ts,
  });

  // Check 3: Event contracts
  const hasPub = schema.eventContracts.publishes.length > 0;
  results.push({
    sandboxId: sid, checkName: "EventBus 发布契约",
    status: hasPub ? "pass" : "warn",
    detail: hasPub ? `发布 ${schema.eventContracts.publishes.length} 事件: ${schema.eventContracts.publishes.join(", ")}` : "无发布事件",
    timestamp: ts,
  });

  const hasSub = schema.eventContracts.subscribesTo.length > 0;
  results.push({
    sandboxId: sid, checkName: "EventBus 订阅契约",
    status: hasSub ? "pass" : "warn",
    detail: hasSub ? `订阅 ${schema.eventContracts.subscribesTo.length} 事件: ${schema.eventContracts.subscribesTo.join(", ")}` : "无订阅事件",
    timestamp: ts,
  });

  // Check 4: Actions have valid payloadFields
  for (const action of schema.actions) {
    const validFields = action.payloadFields.every((fk) => schema.fields.some((f) => f.key === fk));
    results.push({
      sandboxId: sid, checkName: `Action [${action.key}] payload 校验`,
      status: validFields ? "pass" : "fail",
      detail: validFields ? `${action.payloadFields.length} 字段映射正确 → ${action.triggerEvent}` : "存在未定义的 payload 字段",
      timestamp: ts,
    });
  }

  // Check 5: DDL readiness
  const colCount = schema.fields.length;
  results.push({
    sandboxId: sid, checkName: "DDL 自动推导就绪",
    status: "pass",
    detail: `可生成 CREATE TABLE ${schema.dbEntity.tableName} (${colCount} columns + id + timestamps${schema.dbEntity.softDelete ? " + deletedAt" : ""})`,
    timestamp: ts,
  });

  return results;
}

// ═══════════════════════════════════════════════════════════════
// §7  Inspection Dashboard Component
// ═══════════════════════════════════════════════════════════════

function InspectionDashboard({ schemas }: { schemas: readonly ISandboxSchema[] }): React.ReactElement {
  const [results, setResults] = useState<IInspectionResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const runAll = useCallback(() => {
    setResults([]);
    setRunning(true);
    setProgress(0);

    const allChecks = schemas.flatMap((s) => runInspection(s));
    let idx = 0;

    const tick = () => {
      if (idx >= allChecks.length) { setRunning(false); return; }
      setResults((p) => [...p, allChecks[idx]]);
      setProgress(((idx + 1) / allChecks.length) * 100);
      idx++;
      timers.current.push(window.setTimeout(tick, 120));
    };
    tick();
  }, [schemas]);

  const statusIcon: Record<InspectionStatus, { icon: string; color: string }> = {
    pending: { icon: "⏳", color: "text-neutral-500" },
    scanning: { icon: "🔍", color: "text-blue-400" },
    pass: { icon: "✅", color: "text-emerald-400" },
    warn: { icon: "⚠️", color: "text-amber-400" },
    fail: { icon: "❌", color: "text-red-400" },
  };

  const passCount = results.filter((r) => r.status === "pass").length;
  const warnCount = results.filter((r) => r.status === "warn").length;
  const failCount = results.filter((r) => r.status === "fail").length;

  return (
    <div className="h-full flex flex-col">
      {/* Header + trigger */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-neutral-100">自治巡检中心</h2>
          <p className="text-[10px] text-neutral-500 font-mono">Autonomous Schema Inspector · {schemas.length} sandboxes registered</p>
        </div>
        <button
          onClick={runAll}
          disabled={running}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
            running ? "bg-neutral-800 text-neutral-500 cursor-wait" : "bg-gradient-to-r from-cyan-900 to-blue-900 border border-cyan-500/40 text-cyan-100 cursor-pointer hover:border-cyan-400"
          }`}
          style={!running ? { "--pc": "rgba(6,182,212,.4)", animation: "mdePulse 2s infinite" } as React.CSSProperties : undefined}
        >
          {running ? "⏳ 巡检中..." : "🔍 启动全域巡检"}
        </button>
      </div>

      {/* Progress bar */}
      {(running || results.length > 0) && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono text-neutral-500">
              {running ? "SCANNING..." : "COMPLETE"} · {results.length} checks
            </span>
            <span className="text-[9px] font-mono text-neutral-400">
              ✅ {passCount} · ⚠️ {warnCount} · ❌ {failCount}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300 relative" style={{ width: `${progress}%` }}>
              {running && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{ width: "30%", animation: "mdeScanBar 1s linear infinite" }} />}
            </div>
          </div>
        </div>
      )}

      {/* Results by sandbox */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {schemas.map((schema) => {
          const sResults = results.filter((r) => r.sandboxId === schema.id);
          if (sResults.length === 0 && !running) return null;
          return (
            <div key={schema.id} className="rounded-xl border border-neutral-800/40 bg-neutral-900/30 p-3" style={{ animation: "mdeSlide .3s ease-out" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{schema.icon}</span>
                <span className="text-xs font-bold text-neutral-200">{schema.title}</span>
                <span className="text-[9px] font-mono text-neutral-600">{schema.dbEntity.tableName}</span>
                <span className="ml-auto text-[9px] font-mono text-neutral-500">{sResults.length} checks</span>
              </div>
              <div className="space-y-1">
                {sResults.map((r, i) => {
                  const si = statusIcon[r.status];
                  return (
                    <div key={i} className="flex items-start gap-2 py-1 px-2 rounded-lg hover:bg-neutral-800/20 transition-colors" style={{ animation: "mdeSlide .2s ease-out" }}>
                      <span className="text-xs mt-0.5 flex-shrink-0">{si.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[11px] font-semibold ${si.color}`}>{r.checkName}</div>
                        <div className="text-[10px] text-neutral-500 font-mono truncate">{r.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* DDL preview */}
      {results.length > 0 && !running && (
        <div className="mt-3 rounded-xl border border-neutral-800/40 bg-black/40 p-3">
          <div className="text-[8px] font-mono text-neutral-600 tracking-widest uppercase mb-2">AUTO-GENERATED DDL PREVIEW</div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {schemas.map((s) => (
              <div key={s.id} className="text-[10px] font-mono text-emerald-400/80">
                <span className="text-purple-400">CREATE TABLE</span>{" "}
                <span className="text-cyan-400">{s.dbEntity.tableName}</span>{" ("}
                <br />
                <span className="text-neutral-500 ml-4">{s.dbEntity.primaryKey} SERIAL PRIMARY KEY,</span>
                {s.fields.slice(0, 4).map((f) => (
                  <React.Fragment key={f.key}>
                    <br />
                    <span className="text-neutral-500 ml-4">{f.key} {f.dbColumn}{f.constraints.includes("required") ? " NOT NULL" : ""}{f.constraints.includes("unique") ? " UNIQUE" : ""},</span>
                  </React.Fragment>
                ))}
                {s.fields.length > 4 && <><br /><span className="text-neutral-600 ml-4">... +{s.fields.length - 4} more columns</span></>}
                {s.dbEntity.timestamps && <><br /><span className="text-neutral-500 ml-4">created_at TIMESTAMP DEFAULT NOW(),</span><br /><span className="text-neutral-500 ml-4">updated_at TIMESTAMP DEFAULT NOW()</span></>}
                {s.dbEntity.softDelete && <><br /><span className="text-neutral-500 ml-4">,deleted_at TIMESTAMP</span></>}
                <br />
                <span className="text-emerald-400/80">{");"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §8  Main Shell
// ═══════════════════════════════════════════════════════════════

type ActiveView = "inspect" | ISandboxSchema["id"];

function ShellInner(): React.ReactElement {
  const [activeView, setActiveView] = useState<ActiveView>("inspect");
  const bus = useEventBus();

  const activeSchema = useMemo(
    () => sandboxRegistry.find((s) => s.id === activeView),
    [activeView],
  );

  const viewLabels: Record<string, string> = {
    inspect: "自治巡检中心",
    ...Object.fromEntries(sandboxRegistry.map((s) => [s.id, s.title])),
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* ── Top Nav ── */}
      <nav className="flex-shrink-0 h-11 flex items-center justify-between px-4 border-b border-neutral-800/60 bg-neutral-950/95 backdrop-blur z-40">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-xs font-bold shadow-lg shadow-purple-900/20">M</div>
          <span className="text-sm font-bold bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
            元数据驱动沙盘引擎
          </span>
          <span className="text-[10px] text-neutral-500 font-mono hidden lg:inline">Metadata-Driven UI Engine</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="text-neutral-600">EventBus:</span>
          <span className="text-emerald-500">{bus.history.length} events</span>
          <span className="text-neutral-700">|</span>
          <span className="text-neutral-600">Registry:</span>
          <span className="text-cyan-500">{sandboxRegistry.length} schemas</span>
        </div>
      </nav>

      <div className="flex-1 flex min-h-0">
        {/* ── Sidebar ── */}
        <aside className="flex-shrink-0 w-52 border-r border-neutral-800/60 bg-neutral-950 flex flex-col">
          <div className="p-3 border-b border-neutral-800/30">
            <div className="text-[9px] font-mono text-neutral-600 tracking-widest uppercase">引擎导航</div>
          </div>

          <div className="p-2 space-y-0.5">
            {/* Inspection button */}
            <button
              onClick={() => setActiveView("inspect")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                activeView === "inspect" ? "bg-purple-600/15 text-purple-300 font-semibold" : "text-neutral-400 hover:bg-neutral-800/40"
              }`}
            >
              <span className="text-sm">{"🔍"}</span>
              <span>自治巡检中心</span>
            </button>

            <div className="my-2 px-3">
              <div className="text-[8px] font-mono text-neutral-700 tracking-widest uppercase">Auto-Scaffolded Sandboxes</div>
            </div>

            {sandboxRegistry.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveView(s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                  activeView === s.id ? "bg-blue-600/15 text-blue-300 font-semibold" : "text-neutral-400 hover:bg-neutral-800/40"
                }`}
              >
                <span className="text-sm">{s.icon}</span>
                <span className="flex-1 text-left truncate">{s.title}</span>
                <span className={`text-[8px] px-1 py-px rounded font-bold ${
                  s.status === "live" ? "bg-emerald-900/40 text-emerald-400" :
                  s.status === "engine-mounted" ? "bg-blue-900/40 text-blue-400" :
                  "bg-neutral-800 text-neutral-500"
                }`}>
                  {s.status === "schema-ready" ? "READY" : s.status.toUpperCase()}
                </span>
              </button>
            ))}
          </div>

          {/* Event bus trace */}
          <div className="flex-1" />
          <div className="p-3 border-t border-neutral-800/30">
            <div className="text-[8px] font-mono text-neutral-600 tracking-widest uppercase mb-1.5">Event Trace</div>
            <div className="space-y-0.5 max-h-32 overflow-y-auto">
              {bus.history.slice(-6).map((r) => (
                <div key={r.id} className="text-[9px] font-mono flex items-center gap-1" style={{ animation: "mdeSlide .2s ease-out" }}>
                  <span className="text-neutral-700">#{r.id}</span>
                  <span className="text-amber-500 truncate">{r.event}</span>
                </div>
              ))}
              {bus.history.length === 0 && <div className="text-neutral-700 text-[9px] font-mono">{"—"}</div>}
            </div>
          </div>

          {/* Architecture note */}
          <div className="p-3 border-t border-neutral-800/30">
            <div className="text-[8px] font-mono text-neutral-700 space-y-0.5">
              <div className="text-neutral-600 font-bold">{"原理"}</div>
              <div>{"ISandboxSchema → GrtAutoSandbox"}</div>
              <div>{"fields[] → 自动渲染表单"}</div>
              <div>{"actions[] → 自动挂载 EventBus"}</div>
              <div>{"dbEntity → 自动推导 DDL"}</div>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 p-5 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">{viewLabels[activeView] ?? activeView}</span>
            {activeSchema && (
              <span className="text-[9px] font-mono text-neutral-700">
                · {activeSchema.fields.length} fields · {activeSchema.actions.length} actions · DB: {activeSchema.dbEntity.tableName}
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0">
            {activeView === "inspect" ? (
              <InspectionDashboard schemas={sandboxRegistry} />
            ) : activeSchema ? (
              <GrtAutoSandbox schema={activeSchema} />
            ) : null}
          </div>
        </main>

        {/* ── Right rail: Schema Inspector ── */}
        <aside className="flex-shrink-0 border-l border-neutral-800/60 bg-neutral-950 flex flex-col overflow-hidden" style={{ width: 280 }}>
          <div className="p-3 border-b border-neutral-800/40">
            <div className="text-xs font-bold text-neutral-200">Schema 实时解析器</div>
            <div className="text-[9px] text-neutral-500 font-mono">Live Schema Introspector</div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {activeSchema ? (
              <div className="space-y-3">
                {/* Identity */}
                <div className="rounded-lg border border-neutral-800/40 bg-neutral-900/30 p-2.5">
                  <div className="text-[8px] font-mono text-neutral-600 tracking-widest uppercase mb-1">Identity</div>
                  <div className="text-[10px] font-mono text-neutral-300 space-y-0.5">
                    <div>id: <span className="text-cyan-400">{activeSchema.id}</span></div>
                    <div>entity: <span className="text-purple-400">{activeSchema.dbEntity.entityName}</span></div>
                    <div>table: <span className="text-emerald-400">{activeSchema.dbEntity.tableName}</span></div>
                  </div>
                </div>

                {/* Fields */}
                <div className="rounded-lg border border-neutral-800/40 bg-neutral-900/30 p-2.5">
                  <div className="text-[8px] font-mono text-neutral-600 tracking-widest uppercase mb-1">Fields ({activeSchema.fields.length})</div>
                  <div className="space-y-0.5">
                    {activeSchema.fields.map((f) => (
                      <div key={f.key} className="text-[9px] font-mono flex items-center gap-1">
                        <span className="text-neutral-500 w-24 truncate">{f.key}</span>
                        <span className="text-blue-400 w-16 truncate">{f.dbColumn}</span>
                        {f.constraints.map((c) => (
                          <span key={c} className="px-1 rounded bg-neutral-800 text-neutral-500 text-[7px]">{c}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Event contracts */}
                <div className="rounded-lg border border-neutral-800/40 bg-neutral-900/30 p-2.5">
                  <div className="text-[8px] font-mono text-neutral-600 tracking-widest uppercase mb-1">Event Contracts</div>
                  <div className="text-[9px] font-mono space-y-1">
                    <div className="text-neutral-500">publishes:</div>
                    {activeSchema.eventContracts.publishes.map((e) => (
                      <div key={e} className="text-amber-400 ml-2">→ {e}</div>
                    ))}
                    <div className="text-neutral-500 mt-1">subscribesTo:</div>
                    {activeSchema.eventContracts.subscribesTo.map((e) => (
                      <div key={e} className="text-cyan-400 ml-2">← {e}</div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="rounded-lg border border-neutral-800/40 bg-neutral-900/30 p-2.5">
                  <div className="text-[8px] font-mono text-neutral-600 tracking-widest uppercase mb-1">Actions ({activeSchema.actions.length})</div>
                  {activeSchema.actions.map((a) => (
                    <div key={a.key} className="text-[9px] font-mono mb-1">
                      <div className="text-neutral-300">{a.icon} {a.label}</div>
                      <div className="text-neutral-600 ml-4">→ {a.triggerEvent} ({a.payloadFields.join(", ")})</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Registry overview */}
                <div className="text-[9px] font-mono text-neutral-500 mb-2">Sandbox Registry</div>
                {sandboxRegistry.map((s) => (
                  <div key={s.id} className="rounded-lg border border-neutral-800/40 bg-neutral-900/30 p-2.5 cursor-pointer hover:bg-neutral-800/20 transition-colors"
                    onClick={() => setActiveView(s.id)}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{s.icon}</span>
                      <span className="text-[10px] text-neutral-300 font-semibold">{s.title}</span>
                    </div>
                    <div className="text-[9px] font-mono text-neutral-600 mt-0.5">
                      {s.fields.length} fields · {s.actions.length} actions · {s.eventContracts.publishes.length} pub · {s.eventContracts.subscribesTo.length} sub
                    </div>
                  </div>
                ))}

                {/* Architecture diagram */}
                <div className="rounded-lg border border-neutral-800/40 bg-black/30 p-2.5 mt-3">
                  <div className="text-[8px] font-mono text-neutral-600 tracking-widest uppercase mb-1">Architecture</div>
                  <div className="text-[8px] font-mono text-neutral-500 space-y-0.5">
                    <div>{"┌─ ISandboxSchema (元数据)"}</div>
                    <div>{"│  ├─ fields[]   → 自动渲染 Form"}</div>
                    <div>{"│  ├─ actions[]  → 自动挂载 EventBus"}</div>
                    <div>{"│  ├─ dbEntity   → 自动推导 CREATE TABLE"}</div>
                    <div>{"│  ├─ kpis[]     → 自动渲染指标卡"}</div>
                    <div>{"│  └─ eventContracts"}</div>
                    <div>{"│     ├─ publishes[] → dispatch()"}</div>
                    <div>{"│     └─ subscribesTo[] → useEffect()"}</div>
                    <div>{"└─ GrtAutoSandbox 万能渲染引擎"}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── Footer ── */}
      <footer className="flex-shrink-0 h-7 flex items-center justify-between px-4 border-t border-neutral-800/40 bg-neutral-950/90 text-[9px] font-mono text-neutral-600">
        <div className="flex items-center gap-4">
          <span>Engine: <span className="text-purple-400">Metadata-Driven</span></span>
          <span>Schema→UI: <span className="text-cyan-400">Auto-Render</span></span>
          <span>Schema→DB: <span className="text-emerald-400">Auto-DDL</span></span>
          <span>Schema→EventBus: <span className="text-amber-400">Auto-Wire</span></span>
        </div>
        <span>GRT System V5.0 · Universal Sandbox Engine</span>
      </footer>
      <FloatingNav />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §9  Export
// ═══════════════════════════════════════════════════════════════

export default function MetadataDrivenEngine(): React.ReactElement {
  useEffect(() => { injectStyles(); }, []);
  return (
    <MetaEventBusProvider>
      <ShellInner />
    </MetaEventBusProvider>
  );
}
