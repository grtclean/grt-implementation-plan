/**
 * 工作流可视化编辑器组件
 * Workflow Visual Editor Component
 * 
 * 功能：
 * - 拖拽式节点设计
 * - 触发条件配置
 * - 执行节点管理
 * - 分支逻辑配置
 * - 连线绘制
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Play,
  Square,
  Circle,
  Diamond,
  ArrowRight,
  Plus,
  Trash2,
  Settings,
  Clock,
  Zap,
  GitBranch,
  Mail,
  Bell,
  Database,
  Code,
  Move,
  Save,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
} from 'lucide-react';

// 节点类型定义
export type NodeType = 'trigger' | 'action' | 'condition' | 'delay' | 'notification' | 'end';

// 节点接口
export interface WorkflowNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  x: number;
  y: number;
  config: Record<string, any>;
  outputs: string[]; // 连接到的节点ID列表
}

// 连线接口
export interface WorkflowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  condition?: string;
}

// 工作流接口
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  createdAt: Date;
  updatedAt: Date;
}

// 节点类型配置
const nodeTypeConfig: Record<NodeType, { icon: any; color: string; label: string }> = {
  trigger: { icon: Play, color: 'bg-green-500', label: '触发器' },
  action: { icon: Zap, color: 'bg-blue-500', label: '操作' },
  condition: { icon: GitBranch, color: 'bg-yellow-500', label: '条件' },
  delay: { icon: Clock, color: 'bg-purple-500', label: '延迟' },
  notification: { icon: Bell, color: 'bg-orange-500', label: '通知' },
  end: { icon: Square, color: 'bg-red-500', label: '结束' },
};

// 触发器类型
const triggerTypes = [
  { value: 'schedule', label: '定时触发', icon: Clock },
  { value: 'webhook', label: 'Webhook触发', icon: Code },
  { value: 'event', label: '事件触发', icon: Zap },
  { value: 'manual', label: '手动触发', icon: Play },
];

// 操作类型
const actionTypes = [
  { value: 'query', label: '数据查询', icon: Database },
  { value: 'create', label: '创建记录', icon: Plus },
  { value: 'update', label: '更新记录', icon: Settings },
  { value: 'delete', label: '删除记录', icon: Trash2 },
  { value: 'api', label: 'API调用', icon: Code },
  { value: 'script', label: '执行脚本', icon: Code },
];

// 通知类型
const notificationTypes = [
  { value: 'email', label: '邮件通知', icon: Mail },
  { value: 'system', label: '系统通知', icon: Bell },
  { value: 'wechat', label: '企业微信', icon: Bell },
  { value: 'dingtalk', label: '钉钉', icon: Bell },
  { value: 'feishu', label: '飞书', icon: Bell },
];

interface WorkflowVisualEditorProps {
  workflow?: Workflow;
  onSave?: (workflow: Workflow) => void;
  onExport?: (workflow: Workflow) => void;
  readOnly?: boolean;
}

export default function WorkflowVisualEditor({
  workflow: initialWorkflow,
  onSave,
  onExport,
  readOnly = false,
}: WorkflowVisualEditorProps) {
  // 状态
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialWorkflow?.nodes || []);
  const [connections, setConnections] = useState<WorkflowConnection[]>(initialWorkflow?.connections || []);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<WorkflowConnection | null>(null);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<WorkflowNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<{ nodes: WorkflowNode[]; connections: WorkflowConnection[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 生成唯一ID
  const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 保存历史记录
  const saveHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], connections: [...connections] });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [nodes, connections, history, historyIndex]);

  // 撤销
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setConnections(prevState.connections);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  // 重做
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setConnections(nextState.connections);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // 添加节点
  const addNode = useCallback((type: NodeType, x: number, y: number) => {
    const config = nodeTypeConfig[type];
    const newNode: WorkflowNode = {
      id: generateId(),
      type,
      title: `新${config.label}`,
      x,
      y,
      config: {},
      outputs: [],
    };
    setNodes(prev => [...prev, newNode]);
    saveHistory();
  }, [saveHistory]);

  // 删除节点
  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.sourceId !== nodeId && c.targetId !== nodeId));
    setSelectedNode(null);
    saveHistory();
  }, [saveHistory]);

  // 更新节点
  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...updates } : n));
    saveHistory();
  }, [saveHistory]);

  // 添加连线
  const addConnection = useCallback((sourceId: string, targetId: string, label?: string) => {
    // 检查是否已存在相同连线
    const exists = connections.some(c => c.sourceId === sourceId && c.targetId === targetId);
    if (exists) return;

    const newConnection: WorkflowConnection = {
      id: `conn_${Date.now()}`,
      sourceId,
      targetId,
      label,
    };
    setConnections(prev => [...prev, newConnection]);
    
    // 更新源节点的outputs
    setNodes(prev => prev.map(n => {
      if (n.id === sourceId && !n.outputs.includes(targetId)) {
        return { ...n, outputs: [...n.outputs, targetId] };
      }
      return n;
    }));
    saveHistory();
  }, [connections, saveHistory]);

  // 删除连线
  const deleteConnection = useCallback((connectionId: string) => {
    const conn = connections.find(c => c.id === connectionId);
    if (conn) {
      setNodes(prev => prev.map(n => {
        if (n.id === conn.sourceId) {
          return { ...n, outputs: n.outputs.filter(o => o !== conn.targetId) };
        }
        return n;
      }));
    }
    setConnections(prev => prev.filter(c => c.id !== connectionId));
    setSelectedConnection(null);
    saveHistory();
  }, [connections, saveHistory]);

  // 处理节点拖拽
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: WorkflowNode) => {
    if (readOnly) return;
    e.stopPropagation();
    
    if (isConnecting) {
      // 完成连线
      if (connectingFrom && connectingFrom !== node.id) {
        addConnection(connectingFrom, node.id);
      }
      setIsConnecting(false);
      setConnectingFrom(null);
    } else {
      setSelectedNode(node);
      setIsDragging(true);
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, [readOnly, isConnecting, connectingFrom, addConnection]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedNode || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - dragOffset.x - pan.x) / zoom;
    const y = (e.clientY - rect.top - dragOffset.y - pan.y) / zoom;
    
    updateNode(selectedNode.id, { x: Math.max(0, x), y: Math.max(0, y) });
  }, [isDragging, selectedNode, dragOffset, pan, zoom, updateNode]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 开始连线
  const startConnection = useCallback((nodeId: string) => {
    if (readOnly) return;
    setIsConnecting(true);
    setConnectingFrom(nodeId);
  }, [readOnly]);

  // 计算连线路径
  const getConnectionPath = useCallback((sourceId: string, targetId: string) => {
    const source = nodes.find(n => n.id === sourceId);
    const target = nodes.find(n => n.id === targetId);
    if (!source || !target) return '';

    const nodeWidth = 180;
    const nodeHeight = 80;
    
    const sx = source.x + nodeWidth;
    const sy = source.y + nodeHeight / 2;
    const tx = target.x;
    const ty = target.y + nodeHeight / 2;
    
    const dx = tx - sx;
    const controlOffset = Math.min(Math.abs(dx) / 2, 100);
    
    return `M ${sx} ${sy} C ${sx + controlOffset} ${sy}, ${tx - controlOffset} ${ty}, ${tx} ${ty}`;
  }, [nodes]);

  // 渲染节点
  const renderNode = (node: WorkflowNode) => {
    const config = nodeTypeConfig[node.type];
    const Icon = config.icon;
    const isSelected = selectedNode?.id === node.id;

    return (
      <div
        key={node.id}
        className={`absolute cursor-move select-none transition-shadow ${
          isSelected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md'
        }`}
        style={{
          left: node.x * zoom + pan.x,
          top: node.y * zoom + pan.y,
          width: 180 * zoom,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
        onMouseDown={(e) => handleNodeMouseDown(e, node)}
        onDoubleClick={() => {
          if (!readOnly) {
            setEditingNode(node);
            setIsNodeDialogOpen(true);
          }
        }}
      >
        <Card className="bg-card border-border">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded ${config.color}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-sm font-medium truncate">{node.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-xs text-muted-foreground truncate">
              {node.description || config.label}
            </p>
            {!readOnly && (
              <div className="flex justify-between mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    startConnection(node.id);
                  }}
                >
                  <ArrowRight className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // 渲染连线
  const renderConnections = () => {
    return (
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-primary" />
          </marker>
        </defs>
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {connections.map(conn => {
            const path = getConnectionPath(conn.sourceId, conn.targetId);
            const isSelected = selectedConnection?.id === conn.id;
            return (
              <g key={conn.id}>
                <path
                  d={path}
                  fill="none"
                  stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                  strokeWidth={isSelected ? 3 : 2}
                  markerEnd="url(#arrowhead)"
                  className="pointer-events-auto cursor-pointer"
                  onClick={() => !readOnly && setSelectedConnection(conn)}
                />
                {conn.label && (
                  <text
                    x={0}
                    y={0}
                    className="text-xs fill-muted-foreground"
                  >
                    {conn.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    );
  };

  // 节点编辑对话框
  const renderNodeDialog = () => {
    if (!editingNode) return null;

    return (
      <Dialog open={isNodeDialogOpen} onOpenChange={setIsNodeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑节点</DialogTitle>
            <DialogDescription>配置节点属性和行为</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>节点标题</Label>
              <Input
                value={editingNode.title}
                onChange={(e) => setEditingNode({ ...editingNode, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={editingNode.description || ''}
                onChange={(e) => setEditingNode({ ...editingNode, description: e.target.value })}
                rows={2}
              />
            </div>
            
            {/* 触发器配置 */}
            {editingNode.type === 'trigger' && (
              <div className="space-y-2">
                <Label>触发类型</Label>
                <Select
                  value={editingNode.config.triggerType || 'manual'}
                  onValueChange={(value) => setEditingNode({
                    ...editingNode,
                    config: { ...editingNode.config, triggerType: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editingNode.config.triggerType === 'schedule' && (
                  <div className="space-y-2 mt-2">
                    <Label>Cron表达式</Label>
                    <Input
                      value={editingNode.config.cron || ''}
                      onChange={(e) => setEditingNode({
                        ...editingNode,
                        config: { ...editingNode.config, cron: e.target.value }
                      })}
                      placeholder="0 9 * * 1"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 操作配置 */}
            {editingNode.type === 'action' && (
              <div className="space-y-2">
                <Label>操作类型</Label>
                <Select
                  value={editingNode.config.actionType || 'query'}
                  onValueChange={(value) => setEditingNode({
                    ...editingNode,
                    config: { ...editingNode.config, actionType: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {actionTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 条件配置 */}
            {editingNode.type === 'condition' && (
              <div className="space-y-2">
                <Label>条件表达式</Label>
                <Textarea
                  value={editingNode.config.expression || ''}
                  onChange={(e) => setEditingNode({
                    ...editingNode,
                    config: { ...editingNode.config, expression: e.target.value }
                  })}
                  placeholder="例如: status === 'active' && count > 0"
                  rows={3}
                />
              </div>
            )}

            {/* 延迟配置 */}
            {editingNode.type === 'delay' && (
              <div className="space-y-2">
                <Label>延迟时间（分钟）</Label>
                <Input
                  type="number"
                  value={editingNode.config.delayMinutes || 0}
                  onChange={(e) => setEditingNode({
                    ...editingNode,
                    config: { ...editingNode.config, delayMinutes: parseInt(e.target.value) }
                  })}
                />
              </div>
            )}

            {/* 通知配置 */}
            {editingNode.type === 'notification' && (
              <div className="space-y-2">
                <Label>通知渠道</Label>
                <Select
                  value={editingNode.config.channel || 'system'}
                  onValueChange={(value) => setEditingNode({
                    ...editingNode,
                    config: { ...editingNode.config, channel: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-2 mt-2">
                  <Label>通知内容</Label>
                  <Textarea
                    value={editingNode.config.message || ''}
                    onChange={(e) => setEditingNode({
                      ...editingNode,
                      config: { ...editingNode.config, message: e.target.value }
                    })}
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNodeDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => {
              if (editingNode) {
                updateNode(editingNode.id, editingNode);
                setIsNodeDialogOpen(false);
              }
            }}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // 工具栏
  const renderToolbar = () => (
    <div className="flex items-center gap-2 p-2 border-b border-border bg-card">
      {/* 节点类型按钮 */}
      <div className="flex items-center gap-1 border-r border-border pr-2">
        {Object.entries(nodeTypeConfig).map(([type, config]) => {
          const Icon = config.icon;
          return (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              className="h-8"
              disabled={readOnly}
              onClick={() => addNode(type as NodeType, 100 + nodes.length * 50, 100 + nodes.length * 30)}
              title={`添加${config.label}`}
            >
              <div className={`p-1 rounded ${config.color} mr-1`}>
                <Icon className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs">{config.label}</span>
            </Button>
          );
        })}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 border-r border-border pr-2">
        <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex <= 0}>
          <Undo className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}>
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {/* 缩放控制 */}
      <div className="flex items-center gap-1 border-r border-border pr-2">
        <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* 保存/导出 */}
      <div className="flex items-center gap-1 ml-auto">
        {onSave && (
          <Button variant="outline" size="sm" onClick={() => onSave({
            id: initialWorkflow?.id || generateId(),
            name: initialWorkflow?.name || '新工作流',
            nodes,
            connections,
            createdAt: initialWorkflow?.createdAt || new Date(),
            updatedAt: new Date(),
          })}>
            <Save className="w-4 h-4 mr-1" />
            保存
          </Button>
        )}
        {onExport && (
          <Button variant="outline" size="sm" onClick={() => onExport({
            id: initialWorkflow?.id || generateId(),
            name: initialWorkflow?.name || '新工作流',
            nodes,
            connections,
            createdAt: initialWorkflow?.createdAt || new Date(),
            updatedAt: new Date(),
          })}>
            <Download className="w-4 h-4 mr-1" />
            导出
          </Button>
        )}
      </div>
    </div>
  );

  // 连线提示
  const renderConnectionHint = () => {
    if (!isConnecting) return null;
    return (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
        <Badge variant="secondary" className="animate-pulse">
          点击目标节点完成连线，或按 ESC 取消
        </Badge>
      </div>
    );
  };

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsConnecting(false);
        setConnectingFrom(null);
        setSelectedNode(null);
        setSelectedConnection(null);
      }
      if (e.key === 'Delete' && selectedNode) {
        deleteNode(selectedNode.id);
      }
      if (e.key === 'Delete' && selectedConnection) {
        deleteConnection(selectedConnection.id);
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, selectedConnection, deleteNode, deleteConnection, undo, redo]);

  return (
    <div className="flex flex-col h-full border border-border rounded-lg overflow-hidden bg-background">
      {renderToolbar()}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden bg-muted/20"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {renderConnectionHint()}
        {renderConnections()}
        {nodes.map(renderNode)}
        
        {/* 空状态提示 */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Move className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">开始设计工作流</p>
              <p className="text-sm">点击上方工具栏添加节点</p>
            </div>
          </div>
        )}
      </div>
      {renderNodeDialog()}
    </div>
  );
}

// 导出类型和工具函数
export { nodeTypeConfig, triggerTypes, actionTypes, notificationTypes };
