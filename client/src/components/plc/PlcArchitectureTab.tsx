/**
 * PLC Architecture Tab — Program module tree + code viewer
 *
 * Left: collapsible module tree (OB→FB→FC→DB hierarchy)
 * Center: source code viewer (syntax-highlighted)
 * Right: mode state machine diagram + brand info
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Cpu, ChevronRight, ChevronDown, FileCode, Play,
  Download, RefreshCw, FolderTree, Shield, Settings,
  Zap, AlertTriangle, Box, Network,
} from "lucide-react";

interface PlcArchitectureTabProps {
  projectId: number;
}

const MODULE_TYPE_ICON: Record<string, typeof Cpu> = {
  OB: Play,
  FB: Box,
  FC: Zap,
  DB: FolderTree,
  SAFETY_FB: Shield,
  UDT: Settings,
};

const CATEGORY_COLOR: Record<string, string> = {
  mode_mgmt: "bg-green-100 text-green-800",
  safety: "bg-red-100 text-red-800",
  station_ctrl: "bg-blue-100 text-blue-800",
  recipe: "bg-purple-100 text-purple-800",
  comm: "bg-cyan-100 text-cyan-800",
  diagnostic: "bg-orange-100 text-orange-800",
  user_auth: "bg-yellow-100 text-yellow-800",
  alarm: "bg-pink-100 text-pink-800",
};

export default function PlcArchitectureTab({ projectId }: PlcArchitectureTabProps) {
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["OB1"]));
  const [selectedBrand, setSelectedBrand] = useState("SIEMENS_S7_1500");

  const plcProject = trpc.designEngine.plcGetProject.useQuery({ projectId });
  const brands = trpc.designEngine.plcGetBrands.useQuery();
  const modules = trpc.designEngine.plcGetModules.useQuery(
    { plcProjectId: plcProject.data?.id || 0 },
    { enabled: !!plcProject.data }
  );
  const selectedModule = trpc.designEngine.plcGetModuleCode.useQuery(
    { moduleId: selectedModuleId || 0 },
    { enabled: !!selectedModuleId }
  );
  const diagrams = trpc.designEngine.plcGenerateLogicDiagram.useQuery(
    { plcProjectId: plcProject.data?.id || 0 },
    { enabled: !!plcProject.data }
  );

  const createProject = trpc.designEngine.plcCreateProject.useMutation({
    onSuccess: () => { toast.success("PLC项目已创建"); plcProject.refetch(); },
    onError: (e) => toast.error(`创建失败: ${e.message}`),
  });
  const generateArch = trpc.designEngine.plcGenerateArchitecture.useMutation({
    onSuccess: (data) => {
      toast.success(`架构已生成: ${data.moduleCount}个模块, ${data.ioCount}个I/O, ${data.alarmCount}个报警`);
      modules.refetch();
      diagrams.refetch();
    },
    onError: (e) => toast.error(`生成失败: ${e.message}`),
  });

  // Build tree structure — parentModuleId is now an integer FK
  const moduleTree = useMemo(() => {
    if (!modules.data) return [];
    const items = modules.data;
    const roots = items.filter(m => !m.parentModuleId);
    const childrenOf = (parentId: number) => items.filter(m => m.parentModuleId === parentId);
    return roots.map(r => ({ ...r, children: childrenOf(r.id) }));
  }, [modules.data]);

  const toggleNode = (num: string) => {
    const next = new Set(expandedNodes);
    if (next.has(num)) next.delete(num); else next.add(num);
    setExpandedNodes(next);
  };

  // If no PLC project yet, show create button
  if (plcProject.data === null || plcProject.data === undefined) {
    if (plcProject.isLoading) return <Skeleton className="h-96" />;

    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Cpu className="h-16 w-16 text-muted-foreground" />
        <h3 className="text-lg font-semibold">尚未创建PLC项目</h3>
        <p className="text-muted-foreground text-sm">选择PLC品牌后创建项目,自动汇总工位I/O</p>
        <div className="flex gap-2 items-center">
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(brands.data || []).map(b => (
                <SelectItem key={b.key} value={b.key}>{b.nameZh || b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => createProject.mutate({
              projectId,
              projectName: `PLC-Project-${projectId}`,
              plcBrand: selectedBrand,
            })}
            disabled={createProject.isPending}
          >
            <Cpu className="h-4 w-4 mr-1" />
            创建PLC项目
          </Button>
        </div>
      </div>
    );
  }

  const project = plcProject.data;

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono">{project.plcBrand}</Badge>
          <span className="text-sm text-muted-foreground">{project.plcModel}</span>
          <Badge>{project.currentVersion}</Badge>
          <Badge variant="secondary">{project.currentStatus}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            onClick={() => generateArch.mutate({ plcProjectId: project.id })}
            disabled={generateArch.isPending}
          >
            {generateArch.isPending ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            生成架构
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            导出全部程序
          </Button>
        </div>
      </div>

      {/* I/O Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "DI", value: project.ioTotalDI, color: "text-green-600" },
          { label: "DO", value: project.ioTotalDO, color: "text-red-600" },
          { label: "AI", value: project.ioTotalAI, color: "text-blue-600" },
          { label: "AO", value: project.ioTotalAO, color: "text-purple-600" },
          { label: "机架", value: project.rackCount, color: "text-orange-600" },
        ].map(item => (
          <Card key={item.label} className="py-2">
            <CardContent className="p-2 text-center">
              <div className={`text-2xl font-bold ${item.color}`}>{item.value || 0}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content: tree + code viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Module tree */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] overflow-y-auto">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-1">
                <FolderTree className="h-4 w-4" />
                程序模块树
                {modules.data && <Badge variant="secondary" className="ml-auto">{modules.data.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1">
              {modules.isLoading && <Skeleton className="h-40" />}
              {moduleTree.map(root => (
                <div key={root.id}>
                  <TreeNode
                    module={root}
                    selected={selectedModuleId === root.id}
                    expanded={expandedNodes.has(root.moduleNumber)}
                    onSelect={() => setSelectedModuleId(root.id)}
                    onToggle={() => toggleNode(root.moduleNumber)}
                    hasChildren={(root as any).children?.length > 0}
                  />
                  {expandedNodes.has(root.moduleNumber) && (root as any).children?.map((child: any) => (
                    <div key={child.id} className="pl-4">
                      <TreeNode
                        module={child}
                        selected={selectedModuleId === child.id}
                        expanded={false}
                        onSelect={() => setSelectedModuleId(child.id)}
                        onToggle={() => {}}
                        hasChildren={false}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Center: Code viewer */}
        <div className="lg:col-span-6">
          <Card className="h-[600px]">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-1">
                <FileCode className="h-4 w-4" />
                {selectedModule.data ? `${selectedModule.data.moduleNumber}: ${selectedModule.data.moduleName}` : "选择模块查看代码"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 h-[calc(100%-40px)] overflow-auto">
              {selectedModule.isLoading && <Skeleton className="h-full" />}
              {selectedModule.data ? (
                <pre className="text-xs font-mono bg-gray-50 dark:bg-gray-900 p-3 rounded whitespace-pre-wrap overflow-x-auto leading-5">
                  {selectedModule.data.sourceCode || "// No source code generated"}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  点击左侧模块查看生成的程序代码
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: State diagram + info */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] overflow-y-auto">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-1">
                <Network className="h-4 w-4" />
                程序模式状态机
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-3">
              {diagrams.data?.modeDiagram && (
                <pre className="text-xs font-mono bg-blue-50 dark:bg-blue-950 p-2 rounded whitespace-pre-wrap">
                  {diagrams.data.modeDiagram}
                </pre>
              )}

              <div className="space-y-1">
                <h4 className="text-xs font-semibold">模式说明</h4>
                {[
                  { mode: "INITIALIZING", zh: "初始化", color: "bg-gray-200" },
                  { mode: "AUTO", zh: "自动运行", color: "bg-green-200" },
                  { mode: "MANUAL", zh: "手动模式", color: "bg-blue-200" },
                  { mode: "SERVICE", zh: "维修模式", color: "bg-yellow-200" },
                  { mode: "CHANGEOVER", zh: "换型模式", color: "bg-purple-200" },
                  { mode: "DEBUG", zh: "调试模式", color: "bg-cyan-200" },
                  { mode: "E_STOP", zh: "急停", color: "bg-red-200" },
                ].map(m => (
                  <div key={m.mode} className="flex items-center gap-2 text-xs">
                    <div className={`w-3 h-3 rounded ${m.color}`} />
                    <span className="font-mono">{m.mode}</span>
                    <span className="text-muted-foreground">{m.zh}</span>
                  </div>
                ))}
              </div>

              {selectedModule.data && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold mt-3">模块信息</h4>
                  <div className="text-xs space-y-0.5">
                    <div><span className="text-muted-foreground">类型:</span> {selectedModule.data.moduleType}</div>
                    <div><span className="text-muted-foreground">编号:</span> {selectedModule.data.moduleNumber}</div>
                    <div><span className="text-muted-foreground">类别:</span> {selectedModule.data.category}</div>
                    <div><span className="text-muted-foreground">语言:</span> {selectedModule.data.language}</div>
                    <div><span className="text-muted-foreground">描述:</span> {selectedModule.data.description}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Tree Node Component ──────────────────────────────────────────────────

function TreeNode({ module, selected, expanded, onSelect, onToggle, hasChildren }: {
  module: { id?: number; moduleName?: string; moduleType?: string; moduleNumber?: string; category?: string | null; description?: string | null };
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggle: () => void;
  hasChildren: boolean;
}) {
  const Icon = MODULE_TYPE_ICON[module.moduleType || "FB"] || Box;
  const catClass = CATEGORY_COLOR[module.category || ""] || "bg-gray-100 text-gray-800";

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded text-xs hover:bg-accent ${selected ? "bg-accent" : ""}`}
      onClick={onSelect}
    >
      {hasChildren ? (
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="p-0.5">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
      ) : <div className="w-4" />}
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="font-mono text-[10px] text-muted-foreground">{module.moduleNumber}</span>
      <span className="truncate flex-1">{module.moduleName}</span>
      <Badge variant="secondary" className={`text-[9px] px-1 py-0 ${catClass}`}>
        {module.moduleType}
      </Badge>
    </div>
  );
}
