/**
 * SandboxToolbar — Unified toolbar for sandbox pages.
 * Renders: I/O connections, M365 integrations, tools, file imports, notebook.
 */
import React, { useState, useCallback } from "react";
import {
  ArrowDownToLine, ArrowUpFromLine, Mail, MessageSquare, KanbanSquare,
  BookOpen, Cloud, Database, Wrench, Upload, ChevronDown, ChevronUp,
  ExternalLink, Zap, Plug, NotebookPen, FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getSandboxIOConfig, M365_SERVICE_LABELS, type SandboxEnhancedConfig, type M365Service } from "./sandboxIOConfig";
import SandboxFileImport from "./SandboxFileImport";

// ── M365 icon map ──
const M365_ICONS: Record<M365Service, React.ElementType> = {
  outlook: Mail,
  teams: MessageSquare,
  planner: KanbanSquare,
  onenote: BookOpen,
  onedrive: Cloud,
  sharepoint: Database,
};

// ── Section Toggle ──
function SectionToggle({ label, icon: Icon, open, onToggle, count, color }: {
  label: string; icon: React.ElementType; open: boolean; onToggle: () => void; count: number; color?: string;
}) {
  return (
    <button
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
        open ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
      )}
      onClick={onToggle}
    >
      <Icon className="h-3.5 w-3.5" style={color ? { color } : undefined} />
      {label}
      <span className="text-[10px] opacity-60">({count})</span>
      {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN TOOLBAR
// ══════════════════════════════════════════════════════════════

interface SandboxToolbarProps {
  sandboxId: string;
  /** Optional callback when an M365 action is triggered */
  onM365Action?: (service: M365Service, action: string) => void;
  /** Optional callback when a tool is triggered */
  onToolAction?: (toolId: string, action: string) => void;
  /** Optional callback when file import receives data */
  onFileImport?: (rows: string[][], fileName: string, targetTable: string) => void;
  /** Optional callback for notebook open */
  onNotebookOpen?: () => void;
  /** Compact mode — single row badges only */
  compact?: boolean;
  className?: string;
}

export default function SandboxToolbar({
  sandboxId,
  onM365Action,
  onToolAction,
  onFileImport,
  onNotebookOpen,
  compact = false,
  className,
}: SandboxToolbarProps) {
  const config = getSandboxIOConfig(sandboxId);
  const [showIO, setShowIO] = useState(false);
  const [showM365, setShowM365] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showImport, setShowImport] = useState(false);

  if (!config) return null;

  const { io, m365, tools, fileImports } = config;
  const inputCount = io.inputs.length;
  const outputCount = io.outputs.length;

  const handleM365 = useCallback((service: M365Service, action: string, label: string) => {
    if (onM365Action) {
      onM365Action(service, action);
    } else {
      toast.info(`${M365_SERVICE_LABELS[service].label}: ${label}`);
    }
  }, [onM365Action]);

  const handleTool = useCallback((toolId: string, action: string, label: string) => {
    if (onToolAction) {
      onToolAction(toolId, action);
    } else {
      toast.info(`工具: ${label}`);
    }
  }, [onToolAction]);

  // ── Compact mode: single row of badges ──
  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
        {/* I/O badge */}
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <ArrowDownToLine className="h-2.5 w-2.5" />{inputCount}
          <span className="opacity-40">|</span>
          <ArrowUpFromLine className="h-2.5 w-2.5" />{outputCount}
        </span>
        {/* M365 badges */}
        {Array.from(new Set(m365.map(m => m.service))).map(svc => {
          const meta = M365_SERVICE_LABELS[svc];
          const Icon = M365_ICONS[svc];
          return (
            <span key={svc} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border" style={{ borderColor: `${meta.color}30`, color: meta.color, backgroundColor: `${meta.color}10` }}>
              <Icon className="h-2.5 w-2.5" />{meta.label}
            </span>
          );
        })}
        {/* Tools count */}
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Wrench className="h-2.5 w-2.5" />{tools.length}
        </span>
        {/* File import count */}
        {fileImports.length > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
            <Upload className="h-2.5 w-2.5" />{fileImports.length}
          </span>
        )}
        {/* Notebook */}
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <NotebookPen className="h-2.5 w-2.5" />笔记本
        </span>
      </div>
    );
  }

  // ── Full toolbar ──
  return (
    <div className={cn("border rounded-lg bg-background/60 backdrop-blur-sm", className)}>
      {/* Toggle row */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b flex-wrap">
        <SectionToggle
          label="I/O数据流"
          icon={Plug}
          open={showIO}
          onToggle={() => setShowIO(v => !v)}
          count={inputCount + outputCount}
          color="#3B82F6"
        />
        <SectionToggle
          label="Microsoft 365"
          icon={ExternalLink}
          open={showM365}
          onToggle={() => setShowM365(v => !v)}
          count={m365.length}
          color="#0078D4"
        />
        <SectionToggle
          label="工具"
          icon={Wrench}
          open={showTools}
          onToggle={() => setShowTools(v => !v)}
          count={tools.length}
          color="#F59E0B"
        />
        <SectionToggle
          label="文件导入"
          icon={Upload}
          open={showImport}
          onToggle={() => setShowImport(v => !v)}
          count={fileImports.length}
          color="#22C55E"
        />
        {/* Notebook button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] gap-1 text-purple-400 hover:text-purple-300"
          onClick={() => {
            if (onNotebookOpen) onNotebookOpen();
            else toast.info("打开过程笔记本 Opening process notebook");
          }}
        >
          <NotebookPen className="h-3.5 w-3.5" />
          过程笔记本
        </Button>
      </div>

      {/* ── I/O Data Flow Panel ── */}
      {showIO && (
        <div className="px-3 py-2 border-b">
          <div className="grid grid-cols-2 gap-4">
            {/* Inputs */}
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <ArrowDownToLine className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[11px] font-semibold text-blue-400">上游输入 Inputs ({inputCount})</span>
              </div>
              <div className="space-y-1">
                {io.inputs.map((flow, i) => (
                  <div key={i} className="flex items-start gap-2 rounded px-2 py-1 bg-blue-500/5 border border-blue-500/10">
                    <Zap className="h-3 w-3 text-blue-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-medium text-blue-300">{flow.sandboxName}</div>
                      <div className="text-[9px] text-muted-foreground truncate">{flow.description}</div>
                      <div className="text-[9px] text-muted-foreground/60">{flow.descriptionEn}</div>
                      {flow.eventName && (
                        <span className="inline-block mt-0.5 text-[8px] px-1 py-0 rounded bg-blue-500/10 text-blue-400 font-mono">{flow.eventName}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Outputs */}
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <ArrowUpFromLine className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[11px] font-semibold text-emerald-400">下游输出 Outputs ({outputCount})</span>
              </div>
              <div className="space-y-1">
                {io.outputs.map((flow, i) => (
                  <div key={i} className="flex items-start gap-2 rounded px-2 py-1 bg-emerald-500/5 border border-emerald-500/10">
                    <Zap className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-medium text-emerald-300">{flow.sandboxName}</div>
                      <div className="text-[9px] text-muted-foreground truncate">{flow.description}</div>
                      <div className="text-[9px] text-muted-foreground/60">{flow.descriptionEn}</div>
                      {flow.eventName && (
                        <span className="inline-block mt-0.5 text-[8px] px-1 py-0 rounded bg-emerald-500/10 text-emerald-400 font-mono">{flow.eventName}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── M365 Integration Panel ── */}
      {showM365 && (
        <div className="px-3 py-2 border-b">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {m365.map((integration, i) => {
              const meta = M365_SERVICE_LABELS[integration.service];
              const Icon = M365_ICONS[integration.service];
              return (
                <button
                  key={i}
                  className="flex items-start gap-2 rounded-md px-2 py-1.5 text-left transition-all hover:bg-accent/50 border border-transparent hover:border-border/50"
                  onClick={() => handleM365(integration.service, integration.action, integration.label)}
                >
                  <div className="rounded p-1 shrink-0" style={{ backgroundColor: `${meta.color}15` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium leading-tight">{integration.label}</div>
                    <div className="text-[9px] text-muted-foreground truncate">{integration.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tools Panel ── */}
      {showTools && (
        <div className="px-3 py-2 border-b">
          <div className="flex flex-wrap gap-1.5">
            {tools.map(tool => (
              <Button
                key={tool.id}
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1.5 border-amber-500/20 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
                onClick={() => handleTool(tool.id, tool.action, tool.label)}
              >
                <Wrench className="h-3 w-3" />
                {tool.label}
                {tool.shortcut && (
                  <kbd className="ml-1 text-[9px] px-1 py-0 rounded bg-background/50 text-muted-foreground font-mono">{tool.shortcut}</kbd>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ── File Import Panel ── */}
      {showImport && (
        <div className="px-3 py-2">
          <div className="flex flex-wrap gap-2">
            {fileImports.map((fi, i) => (
              <SandboxFileImport
                key={i}
                accept={fi.accept}
                label={fi.label}
                onImport={(rows, fileName) => {
                  if (onFileImport) {
                    onFileImport(rows, fileName, fi.targetTable);
                  } else {
                    toast.success(`已导入 ${rows.length} 行数据 (${fileName}) → ${fi.targetTable}`);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
