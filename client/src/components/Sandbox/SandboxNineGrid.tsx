/**
 * SandboxNineGrid — 九宫格驾驶舱 (9-Grid Cockpit Dashboard)
 *
 * Each sandbox module gets a 3×3 grid showing its 9 capability domains:
 *   ┌──────────────┬──────────────┬──────────────┐
 *   │  ① 驾驶舱     │  ② I/O数据流  │  ③ M365集成   │
 *   ├──────────────┼──────────────┼──────────────┤
 *   │  ④ 工具箱     │  ⑤ 文件导入   │  ⑥ 快捷键     │
 *   ├──────────────┼──────────────┼──────────────┤
 *   │  ⑦ 过程笔记本  │  ⑧ AI助手    │  ⑨ 场景注入   │
 *   └──────────────┴──────────────┴──────────────┘
 */
import React, { useState } from "react";
import {
  Gauge, Plug, Mail, MessageSquare, KanbanSquare, BookOpen,
  Cloud, Database, Wrench, Upload, Keyboard, NotebookPen,
  Bot, Rocket, ArrowDownToLine, ArrowUpFromLine, Zap,
  ChevronRight, ExternalLink, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getSandboxIOConfig, M365_SERVICE_LABELS, type M365Service, type SandboxEnhancedConfig } from "./sandboxIOConfig";
import SandboxFileImport from "./SandboxFileImport";

// ── M365 icon map ──
const M365_ICONS: Record<M365Service, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  outlook: Mail,
  teams: MessageSquare,
  planner: KanbanSquare,
  onenote: BookOpen,
  onedrive: Cloud,
  sharepoint: Database,
};

// ── Grid cell definition ──
interface GridCell {
  key: string;
  label: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;       // hex
  bgClass: string;     // tailwind bg
  borderClass: string; // tailwind border
  textClass: string;   // tailwind text
  metric: string;      // primary number/text
  sub?: string;        // sub-label
}

// ══════════════════════════════════════════════════════════════
// DETAIL PANELS (modal-like overlays inside the grid)
// ══════════════════════════════════════════════════════════════

function DetailPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm rounded-xl border border-border overflow-auto animate-in fade-in-0 zoom-in-95 duration-200">
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <span className="text-sm font-semibold">{title}</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/** Panel ② I/O Data Flow */
function IOPanel({ config, onClose }: { config: SandboxEnhancedConfig; onClose: () => void }) {
  return (
    <DetailPanel title={`I/O 数据流 — ${config.name}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowDownToLine className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold text-blue-400">上游输入 ({config.io.inputs.length})</span>
          </div>
          <div className="space-y-2">
            {config.io.inputs.map((flow, i) => (
              <div key={i} className="rounded-lg p-2.5 bg-blue-500/5 border border-blue-500/15">
                <div className="text-[11px] font-semibold text-blue-300">{flow.sandboxName}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{flow.description}</div>
                <div className="text-[9px] text-muted-foreground/60">{flow.descriptionEn}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">{flow.dataType}</span>
                  {flow.eventName && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono flex items-center gap-0.5">
                      <Zap className="h-2 w-2" />{flow.eventName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowUpFromLine className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400">下游输出 ({config.io.outputs.length})</span>
          </div>
          <div className="space-y-2">
            {config.io.outputs.map((flow, i) => (
              <div key={i} className="rounded-lg p-2.5 bg-emerald-500/5 border border-emerald-500/15">
                <div className="text-[11px] font-semibold text-emerald-300">{flow.sandboxName}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{flow.description}</div>
                <div className="text-[9px] text-muted-foreground/60">{flow.descriptionEn}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">{flow.dataType}</span>
                  {flow.eventName && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono flex items-center gap-0.5">
                      <Zap className="h-2 w-2" />{flow.eventName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DetailPanel>
  );
}

/** Panel ③ M365 Integration */
function M365Panel({ config, onClose }: { config: SandboxEnhancedConfig; onClose: () => void }) {
  return (
    <DetailPanel title={`Microsoft 365 集成 — ${config.name}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {config.m365.map((m, i) => {
          const meta = M365_SERVICE_LABELS[m.service];
          const Icon = M365_ICONS[m.service];
          return (
            <button
              key={i}
              className="flex items-start gap-3 rounded-lg p-3 text-left transition-all hover:bg-accent/60 border border-transparent hover:border-border/60"
              onClick={() => toast.info(`${meta.label}: ${m.label}`)}
            >
              <div className="rounded-lg p-2 shrink-0" style={{ backgroundColor: `${meta.color}15` }}>
                <Icon className="h-5 w-5" style={{ color: meta.color }} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold">{m.label}</div>
                <div className="text-[10px] text-muted-foreground">{m.labelEn}</div>
                <div className="text-[9px] text-muted-foreground/60 mt-0.5">{m.description}</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[8px] px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: `${meta.color}10`, color: meta.color }}>{meta.label}</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{m.action}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </DetailPanel>
  );
}

/** Panel ④ Toolbox */
function ToolboxPanel({ config, onClose }: { config: SandboxEnhancedConfig; onClose: () => void }) {
  return (
    <DetailPanel title={`工具箱 — ${config.name}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {config.tools.map(tool => (
          <button
            key={tool.id}
            className="flex items-center gap-3 rounded-lg p-3 text-left transition-all hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/25"
            onClick={() => toast.info(`工具: ${tool.label}`)}
          >
            <div className="rounded-lg p-2 bg-amber-500/10 shrink-0">
              <Wrench className="h-5 w-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-amber-200">{tool.label}</div>
              <div className="text-[10px] text-muted-foreground">{tool.labelEn}</div>
              {tool.shortcut && (
                <kbd className="mt-1 inline-block text-[9px] px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground font-mono">{tool.shortcut}</kbd>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
          </button>
        ))}
      </div>
    </DetailPanel>
  );
}

/** Panel ⑤ File Import */
function FileImportPanel({ config, onClose }: { config: SandboxEnhancedConfig; onClose: () => void }) {
  return (
    <DetailPanel title={`文件导入 — ${config.name}`} onClose={onClose}>
      <div className="space-y-3">
        {config.fileImports.map((fi, i) => (
          <div key={i} className="rounded-lg p-3 bg-green-500/5 border border-green-500/15">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4 text-green-400" />
              <div>
                <div className="text-[11px] font-semibold text-green-300">{fi.label}</div>
                <div className="text-[10px] text-muted-foreground">{fi.labelEn}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-mono">{fi.accept}</span>
              <span className="text-[9px] text-muted-foreground">→</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{fi.targetTable}</span>
            </div>
            <SandboxFileImport
              accept={fi.accept}
              label={fi.label}
              onImport={(rows, fileName) => {
                toast.success(`已导入 ${rows.length} 行 (${fileName}) → ${fi.targetTable}`);
              }}
            />
          </div>
        ))}
      </div>
    </DetailPanel>
  );
}

/** Panel ⑥ Keyboard Shortcuts */
function ShortcutsPanel({ config, onClose }: { config: SandboxEnhancedConfig; onClose: () => void }) {
  const commonShortcuts = [
    { key: "Ctrl+Enter", label: "完成当前步骤", labelEn: "Complete step & advance" },
    { key: "Alt+1~6", label: "跳转到步骤1~6", labelEn: "Jump to step 1-6" },
    { key: "Ctrl+S", label: "保存当前表单", labelEn: "Save form" },
    { key: "Ctrl+Shift+L", label: "启动场景", labelEn: "Launch scenario" },
    { key: "?", label: "快捷键帮助", labelEn: "Shortcut overlay" },
  ];
  return (
    <DetailPanel title={`快捷键 — ${config.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <div className="text-[11px] font-bold text-violet-400 mb-2">通用快捷键 Common</div>
          <div className="space-y-1">
            {commonShortcuts.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-violet-500/5 border border-violet-500/10">
                <div>
                  <span className="text-[11px]">{s.label}</span>
                  <span className="text-[9px] text-muted-foreground ml-2">{s.labelEn}</span>
                </div>
                <kbd className="text-[10px] px-2 py-0.5 rounded bg-background border border-border text-muted-foreground font-mono">{s.key}</kbd>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold text-cyan-400 mb-2">沙盘专属 Sandbox-Specific</div>
          <div className="space-y-1">
            {config.shortcuts.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-cyan-500/5 border border-cyan-500/10">
                <div>
                  <span className="text-[11px]">{s.label}</span>
                  <span className="text-[9px] text-muted-foreground ml-2">{s.labelEn}</span>
                </div>
                <kbd className="text-[10px] px-2 py-0.5 rounded bg-background border border-border text-muted-foreground font-mono">{s.key}</kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DetailPanel>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN NINE GRID COMPONENT
// ══════════════════════════════════════════════════════════════

interface SandboxNineGridProps {
  sandboxId: string;
  /** Scenario initialized state */
  scenarioInitialized?: boolean;
  /** Callback to dismiss grid and show SOP content */
  onEnterWorkbench?: () => void;
  className?: string;
}

export default function SandboxNineGrid({
  sandboxId,
  scenarioInitialized = false,
  onEnterWorkbench,
  className,
}: SandboxNineGridProps) {
  const config = getSandboxIOConfig(sandboxId);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  if (!config) return null;

  const uniqueM365 = Array.from(new Set(config.m365.map(m => m.service)));

  const cells: GridCell[] = [
    {
      key: "cockpit",
      label: "驾驶舱",
      labelEn: "Cockpit",
      icon: Gauge,
      color: "#06B6D4",
      bgClass: "bg-cyan-500/8",
      borderClass: "border-cyan-500/20 hover:border-cyan-500/40",
      textClass: "text-cyan-400",
      metric: config.num,
      sub: config.name,
    },
    {
      key: "io",
      label: "I/O数据流",
      labelEn: "Data Flow",
      icon: Plug,
      color: "#3B82F6",
      bgClass: "bg-blue-500/8",
      borderClass: "border-blue-500/20 hover:border-blue-500/40",
      textClass: "text-blue-400",
      metric: `${config.io.inputs.length}↓ ${config.io.outputs.length}↑`,
      sub: "上下游连接",
    },
    {
      key: "m365",
      label: "Microsoft 365",
      labelEn: "M365 Integration",
      icon: ExternalLink,
      color: "#0078D4",
      bgClass: "bg-[#0078D4]/8",
      borderClass: "border-[#0078D4]/20 hover:border-[#0078D4]/40",
      textClass: "text-[#0078D4]",
      metric: `${uniqueM365.length} 服务`,
      sub: uniqueM365.map(s => M365_SERVICE_LABELS[s].label).join(" · "),
    },
    {
      key: "tools",
      label: "工具箱",
      labelEn: "Toolbox",
      icon: Wrench,
      color: "#F59E0B",
      bgClass: "bg-amber-500/8",
      borderClass: "border-amber-500/20 hover:border-amber-500/40",
      textClass: "text-amber-400",
      metric: `${config.tools.length} 工具`,
      sub: config.tools.map(t => t.label).join(" · "),
    },
    {
      key: "import",
      label: "文件导入",
      labelEn: "File Import",
      icon: Upload,
      color: "#22C55E",
      bgClass: "bg-green-500/8",
      borderClass: "border-green-500/20 hover:border-green-500/40",
      textClass: "text-green-400",
      metric: `${config.fileImports.length} 通道`,
      sub: config.fileImports.map(f => f.accept).join(" "),
    },
    {
      key: "shortcuts",
      label: "快捷键",
      labelEn: "Shortcuts",
      icon: Keyboard,
      color: "#8B5CF6",
      bgClass: "bg-violet-500/8",
      borderClass: "border-violet-500/20 hover:border-violet-500/40",
      textClass: "text-violet-400",
      metric: `${config.shortcuts.length + 5}`,
      sub: config.shortcuts.map(s => s.key).join(" · "),
    },
    {
      key: "notebook",
      label: "过程笔记本",
      labelEn: "Process Notebook",
      icon: NotebookPen,
      color: "#A855F7",
      bgClass: "bg-purple-500/8",
      borderClass: "border-purple-500/20 hover:border-purple-500/40",
      textClass: "text-purple-400",
      metric: "OneNote",
      sub: "文字 · 文件 · 图片 · 语音 · AI分析",
    },
    {
      key: "agent",
      label: "AI助手",
      labelEn: "AI Copilot",
      icon: Bot,
      color: "#EC4899",
      bgClass: "bg-pink-500/8",
      borderClass: "border-pink-500/20 hover:border-pink-500/40",
      textClass: "text-pink-400",
      metric: "在线",
      sub: "上下文感知 · 自动建议 · 快捷指令",
    },
    {
      key: "scenario",
      label: "场景注入",
      labelEn: "Scenario Init",
      icon: Rocket,
      color: scenarioInitialized ? "#10B981" : "#6B7280",
      bgClass: scenarioInitialized ? "bg-emerald-500/8" : "bg-gray-500/8",
      borderClass: scenarioInitialized ? "border-emerald-500/20 hover:border-emerald-500/40" : "border-gray-500/20 hover:border-gray-500/40",
      textClass: scenarioInitialized ? "text-emerald-400" : "text-gray-400",
      metric: scenarioInitialized ? "已注入" : "待注入",
      sub: scenarioInitialized ? "示范数据已就绪" : "点击启动场景数据",
    },
  ];

  return (
    <div className={cn("relative", className)}>
      {/* 3×3 Grid */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {cells.map(cell => {
          const Icon = cell.icon;
          const isActive = activePanel === cell.key;
          const hasPanel = ["io", "m365", "tools", "import", "shortcuts"].includes(cell.key);
          return (
            <button
              key={cell.key}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl border p-4 transition-all duration-300 cursor-pointer group min-h-[130px]",
                cell.bgClass,
                cell.borderClass,
                isActive && "ring-2 ring-offset-1 ring-offset-background",
                cell.key === "cockpit" && "row-span-1",
              )}
              style={isActive ? { ["--tw-ring-color" as string]: cell.color } as React.CSSProperties : undefined}
              onClick={() => {
                if (cell.key === "cockpit" && onEnterWorkbench) {
                  onEnterWorkbench();
                  return;
                }
                if (cell.key === "notebook") {
                  toast.info("打开过程笔记本 Opening process notebook");
                  return;
                }
                if (cell.key === "agent") {
                  toast.info("AI助手已就绪 Agent copilot ready");
                  return;
                }
                if (cell.key === "scenario") {
                  if (!scenarioInitialized) {
                    toast.info("请在沙盘总览中启动场景注入 Launch scenario from Sandbox Overview");
                  } else {
                    toast.success("场景数据已就绪 Scenario data ready");
                  }
                  return;
                }
                if (hasPanel) {
                  setActivePanel(isActive ? null : cell.key);
                }
              }}
            >
              {/* Icon */}
              <div className={cn("rounded-xl p-3 mb-2 transition-transform group-hover:scale-110")} style={{ backgroundColor: `${cell.color}15` }}>
                <Icon className="h-6 w-6" style={{ color: cell.color }} />
              </div>

              {/* Metric */}
              <div className={cn("text-lg font-black font-mono leading-none mb-0.5", cell.textClass)}>
                {cell.metric}
              </div>

              {/* Label */}
              <div className="text-[11px] font-semibold mt-1">{cell.label}</div>
              <div className="text-[9px] text-muted-foreground">{cell.labelEn}</div>

              {/* Sub text */}
              {cell.sub && (
                <div className="text-[9px] text-muted-foreground/60 mt-1 text-center leading-tight max-w-[160px] truncate">
                  {cell.sub}
                </div>
              )}

              {/* M365 mini icons for m365 cell */}
              {cell.key === "m365" && (
                <div className="flex items-center gap-1 mt-1.5">
                  {uniqueM365.map(svc => {
                    const SvcIcon = M365_ICONS[svc];
                    const meta = M365_SERVICE_LABELS[svc];
                    return (
                      <div key={svc} className="rounded p-0.5" style={{ backgroundColor: `${meta.color}15` }}>
                        <SvcIcon className="h-3 w-3" style={{ color: meta.color }} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cockpit — enter workbench indicator */}
              {cell.key === "cockpit" && onEnterWorkbench && (
                <div className="flex items-center gap-1 mt-1.5 text-[9px] text-cyan-400/70">
                  <span>进入工作台</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              )}

              {/* Active panel indicator */}
              {hasPanel && (
                <div className={cn(
                  "absolute top-2 right-2 w-1.5 h-1.5 rounded-full transition-all",
                  isActive ? "bg-current scale-125" : "bg-muted-foreground/30",
                )} style={isActive ? { backgroundColor: cell.color } : undefined} />
              )}
            </button>
          );
        })}
      </div>

      {/* Detail panels — overlay inside the grid area */}
      {activePanel === "io" && <IOPanel config={config} onClose={() => setActivePanel(null)} />}
      {activePanel === "m365" && <M365Panel config={config} onClose={() => setActivePanel(null)} />}
      {activePanel === "tools" && <ToolboxPanel config={config} onClose={() => setActivePanel(null)} />}
      {activePanel === "import" && <FileImportPanel config={config} onClose={() => setActivePanel(null)} />}
      {activePanel === "shortcuts" && <ShortcutsPanel config={config} onClose={() => setActivePanel(null)} />}
    </div>
  );
}
