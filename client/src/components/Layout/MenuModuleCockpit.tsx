/**
 * MenuModuleCockpit — 模块九宫格驾驶舱
 *
 * Shows a 3×3 grid for any menu group:
 *   ┌───────────┬───────────┬───────────┐
 *   │ ①全因后果  │ ②逻辑继承  │ ③输入     │
 *   ├───────────┼───────────┼───────────┤
 *   │ ④输出     │ ⑤可选功能  │ ⑥整合包   │
 *   ├───────────┼───────────┼───────────┤
 *   │ ⑦指标     │ ⑧依赖图   │ ⑨快速入口  │
 *   └───────────┴───────────┴───────────┘
 */
import React, { useState } from "react";
import {
  AlertTriangle, GitFork, ArrowDownToLine, ArrowUpFromLine,
  ToggleLeft, Plug, BarChart3, Network, Zap, X,
  ChevronRight, ExternalLink, CheckCircle2, XCircle, Info,
  Mail, MessageSquare, KanbanSquare, BookOpen, Cloud, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getModuleConfig, type MenuModuleConfig, type ModuleIntegration } from "@/config/menuModuleConfig";

// ── Integration type icons ──
const INTEGRATION_ICONS: Record<string, React.ElementType> = {
  "Outlook": Mail, "Teams": MessageSquare, "Planner": KanbanSquare,
  "OneNote": BookOpen, "OneDrive": Cloud, "SharePoint": Database,
  "Calendar": Mail, "MS Graph": Plug, "钉钉": MessageSquare,
  "ERP/天斯": Database, "IoT传感器": Zap, "CCD系统": Zap,
  "Claude API": Zap,
};

// ── Detail Panel ──
function DetailPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-sm rounded-xl border border-border overflow-auto animate-in fade-in-0 zoom-in-95 duration-200">
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <span className="text-sm font-semibold">{title}</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Panel: 全因后果 ──
function CauseEffectPanel({ config, onClose }: { config: MenuModuleConfig; onClose: () => void }) {
  return (
    <DetailPanel title={`${config.emoji} 全因后果 — ${config.groupName}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg p-3 bg-blue-500/5 border border-blue-500/15">
          <div className="flex items-center gap-2 mb-1">
            <Info className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold text-blue-400">根因 Root Cause — 为什么需要</span>
          </div>
          <p className="text-[11px] leading-relaxed">{config.causeEffect.rootCause}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{config.causeEffect.rootCauseEn}</p>
        </div>
        <div className="rounded-lg p-3 bg-red-500/5 border border-red-500/15">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-xs font-bold text-red-400">后果 Consequence — 缺失会怎样</span>
          </div>
          <p className="text-[11px] leading-relaxed">{config.causeEffect.consequence}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{config.causeEffect.consequenceEn}</p>
        </div>
        <div className="rounded-lg p-3 bg-emerald-500/5 border border-emerald-500/15">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400">业务价值 Business Value</span>
          </div>
          <p className="text-[11px] leading-relaxed">{config.causeEffect.businessValue}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{config.causeEffect.businessValueEn}</p>
        </div>
      </div>
    </DetailPanel>
  );
}

// ── Panel: 逻辑继承 ──
function InheritancePanel({ config, onClose }: { config: MenuModuleConfig; onClose: () => void }) {
  return (
    <DetailPanel title={`${config.emoji} 逻辑继承 — ${config.groupName}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownToLine className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold text-blue-400">上游父模块 Parent Modules ({config.inheritance.parents.length})</span>
          </div>
          <div className="space-y-1.5">
            {config.inheritance.parents.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <GitFork className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-blue-300">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{p.nameEn}</span>
                  <div className="text-[9px] text-muted-foreground/70 mt-0.5">{p.relationship}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center py-2">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent border border-border">
            <span className="text-lg">{config.emoji}</span>
            <span className="text-xs font-bold">{config.groupName}</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpFromLine className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400">下游子模块 Child Modules ({config.inheritance.children.length})</span>
          </div>
          <div className="space-y-1.5">
            {config.inheritance.children.map((c, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <ChevronRight className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-emerald-300">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{c.nameEn}</span>
                  <div className="text-[9px] text-muted-foreground/70 mt-0.5">{c.relationship}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DetailPanel>
  );
}

// ── Panel: 输入 ──
function InputsPanel({ config, onClose }: { config: MenuModuleConfig; onClose: () => void }) {
  return (
    <DetailPanel title={`${config.emoji} 输入数据流 — ${config.groupName}`} onClose={onClose}>
      <div className="space-y-2">
        {config.inputs.map((flow, i) => (
          <div key={i} className="rounded-lg p-3 bg-blue-500/5 border border-blue-500/15">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[11px] font-semibold text-blue-300">{flow.source}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">{flow.dataType}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{flow.description}</p>
            <p className="text-[9px] text-muted-foreground/60">{flow.descriptionEn}</p>
            {flow.event && (
              <span className="inline-flex items-center gap-0.5 mt-1 text-[8px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono">
                <Zap className="h-2 w-2" />{flow.event}
              </span>
            )}
          </div>
        ))}
      </div>
    </DetailPanel>
  );
}

// ── Panel: 输出 ──
function OutputsPanel({ config, onClose }: { config: MenuModuleConfig; onClose: () => void }) {
  return (
    <DetailPanel title={`${config.emoji} 输出数据流 — ${config.groupName}`} onClose={onClose}>
      <div className="space-y-2">
        {config.outputs.map((flow, i) => (
          <div key={i} className="rounded-lg p-3 bg-emerald-500/5 border border-emerald-500/15">
            <div className="flex items-center gap-2">
              <ArrowUpFromLine className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] font-semibold text-emerald-300">{flow.source}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">{flow.dataType}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{flow.description}</p>
            <p className="text-[9px] text-muted-foreground/60">{flow.descriptionEn}</p>
            {flow.event && (
              <span className="inline-flex items-center gap-0.5 mt-1 text-[8px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono">
                <Zap className="h-2 w-2" />{flow.event}
              </span>
            )}
          </div>
        ))}
      </div>
    </DetailPanel>
  );
}

// ── Panel: 可选功能 ──
function OptionalPanel({ config, onClose }: { config: MenuModuleConfig; onClose: () => void }) {
  return (
    <DetailPanel title={`${config.emoji} 可选功能 — ${config.groupName}`} onClose={onClose}>
      <div className="space-y-2">
        {config.optional.map(opt => (
          <div key={opt.id} className="flex items-center gap-3 rounded-lg p-3 bg-amber-500/5 border border-amber-500/15">
            <div className={cn("rounded-full p-1", opt.defaultOn ? "bg-emerald-500/20" : "bg-gray-500/20")}>
              {opt.defaultOn ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-gray-400" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold">{opt.label}</span>
                <span className="text-[10px] text-muted-foreground">{opt.labelEn}</span>
                <span className={cn("text-[8px] px-1.5 py-0.5 rounded font-medium", opt.defaultOn ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-500/10 text-gray-400")}>
                  {opt.defaultOn ? "默认开启" : "可选"}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">{opt.description}</p>
            </div>
          </div>
        ))}
      </div>
    </DetailPanel>
  );
}

// ── Panel: 整合包 ──
function IntegrationsPanel({ config, onClose }: { config: MenuModuleConfig; onClose: () => void }) {
  const typeLabels: Record<string, { label: string; color: string }> = {
    m365: { label: "Microsoft 365", color: "#0078D4" },
    erp: { label: "ERP", color: "#E74C3C" },
    iot: { label: "IoT", color: "#06B6D4" },
    ai: { label: "AI", color: "#CC785C" },
    external: { label: "External", color: "#3089DC" },
  };
  return (
    <DetailPanel title={`${config.emoji} 整合包 — ${config.groupName}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {config.integrations.map((intg, i) => {
          const Icon = INTEGRATION_ICONS[intg.system] ?? ExternalLink;
          const tl = typeLabels[intg.type] ?? { label: intg.type, color: "#888" };
          return (
            <div key={i} className="rounded-lg p-3 border transition-colors hover:bg-accent/30" style={{ borderColor: `${intg.color}20` }}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="rounded-lg p-1.5" style={{ backgroundColor: `${intg.color}15` }}>
                  <Icon className="h-4 w-4" style={{ color: intg.color }} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold">{intg.system}</div>
                  <span className="text-[8px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${tl.color}15`, color: tl.color }}>{tl.label}</span>
                </div>
              </div>
              <div className="text-[10px] font-medium">{intg.label}</div>
              <div className="text-[9px] text-muted-foreground">{intg.labelEn}</div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {intg.actions.map((a, j) => (
                  <span key={j} className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono">{a}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </DetailPanel>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN 9-GRID COMPONENT
// ══════════════════════════════════════════════════════════════

interface MenuModuleCockpitProps {
  groupName: string;
  className?: string;
}

export default function MenuModuleCockpit({ groupName, className }: MenuModuleCockpitProps) {
  const config = getModuleConfig(groupName);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  if (!config) return null;

  const cells = [
    { key: "cause", label: "全因后果", labelEn: "Cause & Effect", icon: AlertTriangle, color: "#EF4444", metric: "3维", sub: "根因·后果·价值" },
    { key: "inherit", label: "逻辑继承", labelEn: "Inheritance", icon: GitFork, color: "#8B5CF6", metric: `${config.inheritance.parents.length}↑${config.inheritance.children.length}↓`, sub: "父→子链" },
    { key: "inputs", label: "输入", labelEn: "Inputs", icon: ArrowDownToLine, color: "#3B82F6", metric: `${config.inputs.length}`, sub: config.inputs.map(i => i.dataType).join("·") },
    { key: "outputs", label: "输出", labelEn: "Outputs", icon: ArrowUpFromLine, color: "#10B981", metric: `${config.outputs.length}`, sub: config.outputs.map(o => o.dataType).join("·") },
    { key: "optional", label: "可选功能", labelEn: "Optional", icon: ToggleLeft, color: "#F59E0B", metric: `${config.optional.length}`, sub: `${config.optional.filter(o => o.defaultOn).length} 默认开` },
    { key: "integrations", label: "整合包", labelEn: "Integrations", icon: Plug, color: "#0078D4", metric: `${config.integrations.length}`, sub: config.integrations.map(i => i.system).slice(0, 3).join("·") },
    { key: "metrics", label: "指标", labelEn: "Metrics", icon: BarChart3, color: "#06B6D4", metric: config.metrics[0]?.value ?? "—", sub: config.metrics.map(m => m.label).join("·") },
    { key: "deps", label: "依赖图", labelEn: "Dependency Map", icon: Network, color: "#EC4899", metric: `${config.inheritance.parents.length + config.inheritance.children.length}`, sub: "上下游关系" },
    { key: "entry", label: "快速入口", labelEn: "Quick Entry", icon: Zap, color: config.metrics[0]?.color ?? "#888", metric: config.emoji, sub: config.groupNameEn },
  ];

  const toggle = (key: string) => setActivePanel(prev => prev === key ? null : key);

  return (
    <div className={cn("relative", className)}>
      {/* 3×3 Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {cells.map(cell => {
          const Icon = cell.icon;
          const isActive = activePanel === cell.key;
          return (
            <button
              key={cell.key}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl border p-3 transition-all duration-200 cursor-pointer group min-h-[100px]",
                "hover:shadow-md",
                isActive && "ring-2 ring-offset-1 ring-offset-background",
              )}
              style={{
                borderColor: `${cell.color}20`,
                backgroundColor: `${cell.color}06`,
                ...(isActive ? { boxShadow: `0 0 12px ${cell.color}20` } : {}),
              }}
              onClick={() => toggle(cell.key)}
            >
              <div className="rounded-lg p-2 mb-1.5 transition-transform group-hover:scale-110" style={{ backgroundColor: `${cell.color}12` }}>
                <Icon className="h-5 w-5" style={{ color: cell.color }} />
              </div>
              <div className="text-base font-black font-mono leading-none mb-0.5" style={{ color: cell.color }}>{cell.metric}</div>
              <div className="text-[10px] font-semibold mt-0.5">{cell.label}</div>
              <div className="text-[8px] text-muted-foreground">{cell.labelEn}</div>
              <div className="text-[8px] text-muted-foreground/50 mt-0.5 text-center leading-tight max-w-[140px] truncate">{cell.sub}</div>
              {isActive && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: cell.color }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Overlay panels */}
      {activePanel === "cause" && <CauseEffectPanel config={config} onClose={() => setActivePanel(null)} />}
      {activePanel === "inherit" && <InheritancePanel config={config} onClose={() => setActivePanel(null)} />}
      {activePanel === "deps" && <InheritancePanel config={config} onClose={() => setActivePanel(null)} />}
      {activePanel === "inputs" && <InputsPanel config={config} onClose={() => setActivePanel(null)} />}
      {activePanel === "outputs" && <OutputsPanel config={config} onClose={() => setActivePanel(null)} />}
      {activePanel === "optional" && <OptionalPanel config={config} onClose={() => setActivePanel(null)} />}
      {activePanel === "integrations" && <IntegrationsPanel config={config} onClose={() => setActivePanel(null)} />}
    </div>
  );
}
