import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useRoute, Link } from "wouter";
import { 
  ArrowLeft, GitBranch, GitCompare, CheckCircle2, Clock,
  RotateCcw, Eye, FileText, AlertCircle, Plus, Minus, Edit,
  ChevronRight, ChevronDown, Copy, Download
} from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  DRAFT: 'bg-yellow-500',
  ACTIVE: 'bg-green-500',
  ARCHIVED: 'bg-gray-500',
  SUPERSEDED: 'bg-blue-500',
};

const statusLabels: Record<string, string> = {
  DRAFT: '草稿',
  ACTIVE: '激活',
  ARCHIVED: '归档',
  SUPERSEDED: '已替代',
};

// JSON Diff 类型定义
type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

interface DiffNode {
  key: string;
  path: string;
  type: DiffType;
  oldValue?: any;
  newValue?: any;
  children?: DiffNode[];
}

// 计算两个JSON对象的差异
function computeJsonDiff(oldObj: any, newObj: any, path: string = ''): DiffNode[] {
  const diffs: DiffNode[] = [];
  const allKeys = Array.from(new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]));
  
  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const oldValue = oldObj?.[key];
    const newValue = newObj?.[key];
    
    if (oldValue === undefined && newValue !== undefined) {
      // 新增
      diffs.push({
        key,
        path: currentPath,
        type: 'added',
        newValue,
        children: typeof newValue === 'object' && newValue !== null ? computeJsonDiff({}, newValue, currentPath) : undefined
      });
    } else if (oldValue !== undefined && newValue === undefined) {
      // 删除
      diffs.push({
        key,
        path: currentPath,
        type: 'removed',
        oldValue,
        children: typeof oldValue === 'object' && oldValue !== null ? computeJsonDiff(oldValue, {}, currentPath) : undefined
      });
    } else if (typeof oldValue === 'object' && typeof newValue === 'object' && oldValue !== null && newValue !== null) {
      // 递归比较对象
      const childDiffs = computeJsonDiff(oldValue, newValue, currentPath);
      const hasChanges = childDiffs.some(d => d.type !== 'unchanged');
      diffs.push({
        key,
        path: currentPath,
        type: hasChanges ? 'modified' : 'unchanged',
        children: childDiffs
      });
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      // 值修改
      diffs.push({
        key,
        path: currentPath,
        type: 'modified',
        oldValue,
        newValue
      });
    } else {
      // 未变化
      diffs.push({
        key,
        path: currentPath,
        type: 'unchanged',
        oldValue,
        newValue
      });
    }
  }
  
  return diffs;
}

// JSON Diff 树节点组件
function DiffTreeNode({ node, depth = 0, showUnchanged = false }: { node: DiffNode; depth?: number; showUnchanged?: boolean }) {
  const [expanded, setExpanded] = useState(node.type !== 'unchanged');
  
  if (!showUnchanged && node.type === 'unchanged' && !node.children?.some(c => c.type !== 'unchanged')) {
    return null;
  }
  
  const hasChildren = node.children && node.children.length > 0;
  const indent = depth * 16;
  
  const typeColors = {
    added: 'bg-green-100 dark:bg-green-900/30 border-green-500',
    removed: 'bg-red-100 dark:bg-red-900/30 border-red-500',
    modified: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500',
    unchanged: 'bg-transparent border-transparent',
  };
  
  const typeIcons = {
    added: <Plus className="w-3 h-3 text-green-500" />,
    removed: <Minus className="w-3 h-3 text-red-500" />,
    modified: <Edit className="w-3 h-3 text-yellow-500" />,
    unchanged: null,
  };
  
  return (
    <div className="font-mono text-sm">
      <div 
        className={`flex items-center gap-2 py-1 px-2 rounded border-l-2 ${typeColors[node.type]} hover:bg-muted/50 cursor-pointer`}
        style={{ marginLeft: indent }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren && (
          expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
        )}
        {!hasChildren && <span className="w-4" />}
        
        {typeIcons[node.type]}
        
        <span className="font-medium text-foreground">{node.key}</span>
        
        {!hasChildren && node.type === 'modified' && (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-red-500 line-through">{JSON.stringify(node.oldValue)}</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-green-500">{JSON.stringify(node.newValue)}</span>
          </span>
        )}
        
        {!hasChildren && node.type === 'added' && (
          <span className="text-green-500 text-xs">{JSON.stringify(node.newValue)}</span>
        )}
        
        {!hasChildren && node.type === 'removed' && (
          <span className="text-red-500 line-through text-xs">{JSON.stringify(node.oldValue)}</span>
        )}
        
        {!hasChildren && node.type === 'unchanged' && (
          <span className="text-muted-foreground text-xs">{JSON.stringify(node.oldValue)}</span>
        )}
      </div>
      
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child, i) => (
            <DiffTreeNode key={`${child.path}-${i}`} node={child} depth={depth + 1} showUnchanged={showUnchanged} />
          ))}
        </div>
      )}
    </div>
  );
}

// JSON Diff 统计组件
function DiffStats({ diffs }: { diffs: DiffNode[] }) {
  const stats = useMemo(() => {
    let added = 0, removed = 0, modified = 0;
    
    const countDiffs = (nodes: DiffNode[]) => {
      for (const node of nodes) {
        if (node.type === 'added') added++;
        else if (node.type === 'removed') removed++;
        else if (node.type === 'modified' && !node.children) modified++;
        if (node.children) countDiffs(node.children);
      }
    };
    
    countDiffs(diffs);
    return { added, removed, modified };
  }, [diffs]);
  
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1">
        <Plus className="w-4 h-4 text-green-500" />
        <span className="text-green-500 font-medium">{stats.added}</span>
        <span className="text-muted-foreground">新增</span>
      </div>
      <div className="flex items-center gap-1">
        <Edit className="w-4 h-4 text-yellow-500" />
        <span className="text-yellow-500 font-medium">{stats.modified}</span>
        <span className="text-muted-foreground">修改</span>
      </div>
      <div className="flex items-center gap-1">
        <Minus className="w-4 h-4 text-red-500" />
        <span className="text-red-500 font-medium">{stats.removed}</span>
        <span className="text-muted-foreground">删除</span>
      </div>
    </div>
  );
}

// 版本详情对话框
function VersionDetailDialog({ version, open, onClose }: { version: any; open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('json');
  
  const versionJson = version?.versionJson || {
    M3: { milestone: '立项评审', tasks: ['商业价值评估', '范围确认', 'RACI矩阵'], output: '项目章程' },
    M4: { milestone: '方案冻结P1', tasks: ['机械设计', '电气设计', '质量规划'], output: '设计基线' },
    M5: { milestone: '设计评审', tasks: ['详细设计', '风险评估'], output: '设计文档' },
    M6: { milestone: '采购启动', tasks: ['BOM确认', '供应商选择'], output: 'PO清单' },
    M7: { milestone: '生产准备', tasks: ['工艺准备', '物料到货'], output: '生产计划' },
    M8: { milestone: '装配调试', tasks: ['机械装配', '电气接线', '调试'], output: '调试报告' },
    M9: { milestone: 'FAT测试', tasks: ['功能测试', '性能测试'], output: 'FAT报告' },
    M10: { milestone: '发货安装', tasks: ['包装发货', '现场安装'], output: '安装报告' },
    M11: { milestone: 'SAT测试', tasks: ['现场调试', '客户验收'], output: 'SAT报告' },
    M12: { milestone: '项目结项', tasks: ['文档移交', '培训', '结项'], output: '结项报告' },
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            版本详情 - {version?.versionCode}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="json">JSON视图</TabsTrigger>
            <TabsTrigger value="stages">阶段视图</TabsTrigger>
            <TabsTrigger value="changes">变更摘要</TabsTrigger>
          </TabsList>
          
          <TabsContent value="json" className="mt-4">
            <div className="flex justify-end gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(versionJson, null, 2));
                toast.success('已复制到剪贴板');
              }}>
                <Copy className="w-4 h-4 mr-1" />复制
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />导出
              </Button>
            </div>
            <ScrollArea className="h-[400px] border rounded-lg p-4 bg-muted/30">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {JSON.stringify(versionJson, null, 2)}
              </pre>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="stages" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {Object.entries(versionJson).map(([stage, data]: [string, any]) => (
                  <Card key={stage}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Badge variant="outline">{stage}</Badge>
                        {data.milestone}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">任务</p>
                          <ul className="list-disc list-inside">
                            {data.tasks?.map((task: string, i: number) => (
                              <li key={i}>{task}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">输出物</p>
                          <p>{data.output}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="changes" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {version?.changesSummary?.map((change: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                      <Edit className="w-4 h-4 text-yellow-500 mt-0.5" />
                      <span className="text-sm">{change}</span>
                    </div>
                  )) || (
                    <p className="text-muted-foreground text-center py-4">暂无变更记录</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// 版本对比对话框
function VersionCompareDialog({ v1, v2, open, onClose }: { v1: any; v2: any; open: boolean; onClose: () => void }) {
  const [viewMode, setViewMode] = useState<'tree' | 'split' | 'unified'>('tree');
  const [showUnchanged, setShowUnchanged] = useState(false);
  
  // 模拟版本JSON数据
  const v1Json = v1?.versionJson || {
    M3: { milestone: '立项评审', tasks: ['商业价值评估', '范围确认'], output: '项目章程', duration: 5 },
    M4: { milestone: '方案冻结P1', tasks: ['机械设计', '电气设计'], output: '设计基线', duration: 10 },
    M5: { milestone: '设计评审', tasks: ['详细设计'], output: '设计文档', duration: 7 },
  };
  
  const v2Json = v2?.versionJson || {
    M3: { milestone: '立项评审', tasks: ['商业价值评估', '范围确认', 'RACI矩阵'], output: '项目章程+基线计划', duration: 7 },
    M4: { milestone: '方案冻结P1', tasks: ['机械设计', '电气设计', '质量规划', '服务规划'], output: '设计基线', duration: 12 },
    M5: { milestone: '设计评审', tasks: ['详细设计', '风险评估'], output: '设计文档', duration: 7 },
    M6: { milestone: '采购启动', tasks: ['BOM确认', '供应商选择'], output: 'PO清单', duration: 5 },
  };
  
  const diffs = useMemo(() => computeJsonDiff(v1Json, v2Json), [v1Json, v2Json]);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            版本对比
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              {v1?.versionCode || 'AIV0'}
            </Badge>
            <span className="text-muted-foreground">vs</span>
            <Badge variant="outline" className="text-sm">
              {v2?.versionCode || 'V1'}
            </Badge>
          </div>
          <DiffStats diffs={diffs} />
        </div>
        
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="tree">树形视图</TabsTrigger>
              <TabsTrigger value="split">分栏视图</TabsTrigger>
              <TabsTrigger value="unified">统一视图</TabsTrigger>
            </TabsList>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowUnchanged(!showUnchanged)}
            >
              {showUnchanged ? '隐藏未变更' : '显示全部'}
            </Button>
          </div>
          
          <TabsContent value="tree" className="mt-4">
            <ScrollArea className="h-[400px] border rounded-lg p-4 bg-muted/30">
              {diffs.map((node, i) => (
                <DiffTreeNode key={`${node.path}-${i}`} node={node} showUnchanged={showUnchanged} />
              ))}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="split" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Badge variant="outline">{v1?.versionCode || 'AIV0'}</Badge>
                  <span className="text-muted-foreground">基线版本</span>
                </div>
                <ScrollArea className="h-[350px] border rounded-lg p-4 bg-red-50/30 dark:bg-red-900/10">
                  <pre className="text-sm font-mono whitespace-pre-wrap text-red-700 dark:text-red-300">
                    {JSON.stringify(v1Json, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
              <div>
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Badge variant="outline">{v2?.versionCode || 'V1'}</Badge>
                  <span className="text-muted-foreground">新版本</span>
                </div>
                <ScrollArea className="h-[350px] border rounded-lg p-4 bg-green-50/30 dark:bg-green-900/10">
                  <pre className="text-sm font-mono whitespace-pre-wrap text-green-700 dark:text-green-300">
                    {JSON.stringify(v2Json, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="unified" className="mt-4">
            <ScrollArea className="h-[400px] border rounded-lg p-4 bg-muted/30">
              <div className="space-y-2 font-mono text-sm">
                {diffs.map((node, i) => {
                  if (!showUnchanged && node.type === 'unchanged') return null;
                  
                  return (
                    <div key={i} className={`p-2 rounded ${
                      node.type === 'added' ? 'bg-green-100 dark:bg-green-900/30' :
                      node.type === 'removed' ? 'bg-red-100 dark:bg-red-900/30' :
                      node.type === 'modified' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      'bg-transparent'
                    }`}>
                      <div className="flex items-center gap-2">
                        {node.type === 'added' && <span className="text-green-500">+</span>}
                        {node.type === 'removed' && <span className="text-red-500">-</span>}
                        {node.type === 'modified' && <span className="text-yellow-500">~</span>}
                        {node.type === 'unchanged' && <span className="text-muted-foreground"> </span>}
                        <span className="font-medium">{node.key}:</span>
                        {node.type === 'modified' ? (
                          <span>
                            <span className="text-red-500 line-through">{JSON.stringify(node.oldValue)}</span>
                            <span className="mx-2">→</span>
                            <span className="text-green-500">{JSON.stringify(node.newValue)}</span>
                          </span>
                        ) : (
                          <span>{JSON.stringify(node.type === 'removed' ? node.oldValue : node.newValue)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>关闭</Button>
          <Button onClick={() => {
            const diffReport = {
              v1: v1?.versionCode,
              v2: v2?.versionCode,
              diffs: diffs.filter(d => d.type !== 'unchanged')
            };
            navigator.clipboard.writeText(JSON.stringify(diffReport, null, 2));
            toast.success('差异报告已复制到剪贴板');
          }}>
            <Copy className="w-4 h-4 mr-1" />
            复制差异报告
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function POSVersions() {
  const [, params] = useRoute('/pos/projects/:id/versions');
  const projectId = (params as any)?.id ? parseInt((params as any).id) : 0;
  
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [compareVersions, setCompareVersions] = useState<[any, any]>([null, null]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { data: versions, isLoading } = trpc.pos.version.list.useQuery({ projectId });

  const activateMutation = trpc.pos.version.activate.useMutation({
    onSuccess: () => toast.success('版本已激活'),
    onError: () => toast.error('激活失败'),
  });

  const handleActivate = (versionId: number) => {
    activateMutation.mutate({ id: versionId });
  };

  const handleCompare = (v1: any, v2: any) => {
    setCompareVersions([v1, v2]);
    setShowCompareDialog(true);
  };

  const handleViewDetail = (version: any) => {
    setSelectedVersion(version);
    setShowDetailDialog(true);
  };

  // 示例版本数据
  const sampleVersions = [
    { id: 1, versionCode: 'AIV0', status: 'ACTIVE', baseProjectCode: 'GRT-347', createdAt: '2024-01-15', createdBy: '系统', changesSummary: ['从GRT-347复制M3-M12基线'] },
    { id: 2, versionCode: 'V1', status: 'DRAFT', baseProjectCode: 'GRT-347', createdAt: '2024-01-16', createdBy: '工程师A', changesSummary: ['增加M3 RACI矩阵任务', '延长M4周期至12天', '新增M6采购阶段'] },
  ];

  const displayVersions = versions && versions.length > 0 ? versions : sampleVersions;

  return (
    <Layout>
    <div className="space-y-6">
      {/* 返回按钮 */}
      <div className="flex items-center gap-4">
        <Link href={`/pos/projects/${projectId}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />返回项目</Button>
        </Link>
      </div>

      <PageHeader
        icon={GitBranch}
        title="版本管理"
        description="AI版本对比与激活 - 支持JSON结构化Diff"
      />

      {/* 版本说明 */}
      <Card className="border-blue-500/50">
        <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-500" />
            版本管理说明
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium">AIV0 (基线版本)</p>
              <p className="text-muted-foreground">从相似项目复制的M3-M12基线</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium">V1/V2... (增强版本)</p>
              <p className="text-muted-foreground">基于差异输入AI生成的版本</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium">版本状态</p>
              <p className="text-muted-foreground">Draft需确认，Active为当前版本</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium">Diff对比</p>
              <p className="text-muted-foreground">支持树形/分栏/统一三种视图</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 版本列表 */}
      <Card>
        <CardHeader>
          <CardTitle>版本历史</CardTitle>
          <CardDescription>项目的所有版本记录，点击对比查看JSON结构化差异</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>版本号</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>基线项目</TableHead>
                  <TableHead>变更摘要</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>创建人</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayVersions.map((version: any, index: number) => (
                  <TableRow key={version.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono font-medium">{version.versionCode}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[version.status]}>
                        {statusLabels[version.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {version.baseProjectCode || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        {version.changesSummary?.slice(0, 2).map((change: string, i: number) => (
                          <div key={i} className="text-xs text-muted-foreground truncate">
                            • {change}
                          </div>
                        ))}
                        {version.changesSummary?.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{version.changesSummary.length - 2} 更多...
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{version.createdAt}</TableCell>
                    <TableCell>{version.createdBy}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetail(version)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {version.status === 'DRAFT' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleActivate(version.id)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            激活
                          </Button>
                        )}
                        {index > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCompare(displayVersions[index - 1], version)}
                          >
                            <GitCompare className="w-4 h-4 mr-1" />
                            对比
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 审计日志 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            审计日志
          </CardTitle>
          <CardDescription>版本变更记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">2024-01-16 10:30 - 工程师A 创建了 V1 版本</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm">2024-01-15 14:20 - 系统 激活了 AIV0 版本</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <GitBranch className="w-4 h-4 text-blue-500" />
              <span className="text-sm">2024-01-15 14:15 - 系统 从 GRT-347 创建了 AIV0 版本</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 版本详情对话框 */}
      <VersionDetailDialog
        version={selectedVersion}
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
      />

      {/* 版本对比对话框 */}
      <VersionCompareDialog
        v1={compareVersions[0]}
        v2={compareVersions[1]}
        open={showCompareDialog}
        onClose={() => setShowCompareDialog(false)}
      />
    </div>
    </Layout>
  );
}
