/**
 * 知识图谱D3.js可视化组件
 * v2.5.8 - 力导向图、实体关系展示、扩展建议高亮、交互式探索
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  Sparkles,
  Network,
  Circle,
  ArrowRight,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties?: Record<string, any>;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  // 扩展建议相关
  isSuggested?: boolean;
  suggestionType?: 'missing_entity' | 'new_relation' | 'completion';
  confidence?: number;
}

interface GraphEdge {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  relation: string;
  weight?: number;
  // 扩展建议相关
  isSuggested?: boolean;
  suggestionType?: 'inferred' | 'recommended';
  confidence?: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface KnowledgeGraphVisualizationProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  onSuggestionApprove?: (item: GraphNode | GraphEdge) => void;
  className?: string;
}

// ==================== 节点类型颜色配置 ====================

const NODE_COLORS: Record<string, string> = {
  project: '#f97316',      // 项目 - 橙色
  customer: '#3b82f6',     // 客户 - 蓝色
  engineer: '#22c55e',     // 工程师 - 绿色
  equipment: '#8b5cf6',    // 设备 - 紫色
  capability: '#ec4899',   // 能力 - 粉色
  knowledge: '#14b8a6',    // 知识 - 青色
  task: '#eab308',         // 任务 - 黄色
  default: '#6b7280'       // 默认 - 灰色
};

const NODE_TYPE_LABELS: Record<string, string> = {
  project: '项目',
  customer: '客户',
  engineer: '工程师',
  equipment: '设备',
  capability: '能力',
  knowledge: '知识',
  task: '任务'
};

// ==================== 主组件 ====================

export default function KnowledgeGraphVisualization({
  data,
  onNodeClick,
  onEdgeClick,
  onSuggestionApprove,
  className
}: KnowledgeGraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [linkStrength, setLinkStrength] = useState([50]);
  
  // 模拟力导向图布局
  const [layoutNodes, setLayoutNodes] = useState<GraphNode[]>([]);
  const [layoutEdges, setLayoutEdges] = useState<GraphEdge[]>([]);

  // 初始化布局
  useEffect(() => {
    if (!data.nodes.length) return;

    // 简单的圆形布局
    const centerX = 400;
    const centerY = 300;
    const radius = Math.min(300, data.nodes.length * 20);

    const nodesWithPosition = data.nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / data.nodes.length;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    setLayoutNodes(nodesWithPosition);
    setLayoutEdges(data.edges);
  }, [data]);

  // 过滤节点
  const filteredNodes = layoutNodes.filter(node => {
    const matchesSearch = !searchTerm || 
      node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || node.type === filterType;
    const matchesSuggestion = showSuggestions || !node.isSuggested;
    return matchesSearch && matchesType && matchesSuggestion;
  });

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  
  const filteredEdges = layoutEdges.filter(edge => {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
    const matchesSuggestion = showSuggestions || !edge.isSuggested;
    return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId) && matchesSuggestion;
  });

  // 获取节点位置
  const getNodePosition = (nodeId: string) => {
    const node = layoutNodes.find(n => n.id === nodeId);
    return node ? { x: node.x || 0, y: node.y || 0 } : { x: 0, y: 0 };
  };

  // 处理节点点击
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    onNodeClick?.(node);
  };

  // 处理边点击
  const handleEdgeClick = (edge: GraphEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    onEdgeClick?.(edge);
  };

  // 缩放控制
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.3));
  const handleResetZoom = () => setZoom(1);

  // 导出SVG
  const handleExport = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'knowledge-graph.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  // 统计信息
  const stats = {
    totalNodes: layoutNodes.length,
    totalEdges: layoutEdges.length,
    suggestedNodes: layoutNodes.filter(n => n.isSuggested).length,
    suggestedEdges: layoutEdges.filter(e => e.isSuggested).length,
    nodeTypes: Array.from(new Set(layoutNodes.map(n => n.type)))
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-4">
          {/* 搜索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索节点..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-48"
            />
          </div>

          {/* 类型过滤 */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {stats.nodeTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {NODE_TYPE_LABELS[type] || type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 显示建议开关 */}
          <Button
            variant={showSuggestions ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSuggestions(!showSuggestions)}
          >
            {showSuggestions ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
            扩展建议
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* 缩放控制 */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs font-mono w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleResetZoom}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* 导出 */}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex">
        {/* 图谱区域 */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-background">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox="0 0 800 600"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          >
            {/* 定义箭头标记 */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
              </marker>
              <marker
                id="arrowhead-suggested"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#f97316" />
              </marker>
            </defs>

            {/* 绘制边 */}
            <g className="edges">
              {filteredEdges.map(edge => {
                const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
                const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
                const sourcePos = getNodePosition(sourceId);
                const targetPos = getNodePosition(targetId);
                
                const isSelected = selectedEdge?.id === edge.id;
                const isSuggested = edge.isSuggested;

                return (
                  <g key={edge.id} onClick={() => handleEdgeClick(edge)} style={{ cursor: 'pointer' }}>
                    <line
                      x1={sourcePos.x}
                      y1={sourcePos.y}
                      x2={targetPos.x}
                      y2={targetPos.y}
                      stroke={isSuggested ? '#f97316' : '#6b7280'}
                      strokeWidth={isSelected ? 3 : 1.5}
                      strokeDasharray={isSuggested ? '5,5' : 'none'}
                      opacity={isSuggested ? 0.7 : 1}
                      markerEnd={isSuggested ? 'url(#arrowhead-suggested)' : 'url(#arrowhead)'}
                    />
                    {/* 边标签 */}
                    <text
                      x={(sourcePos.x + targetPos.x) / 2}
                      y={(sourcePos.y + targetPos.y) / 2 - 5}
                      textAnchor="middle"
                      fontSize="10"
                      fill={isSuggested ? '#f97316' : '#9ca3af'}
                    >
                      {edge.relation}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* 绘制节点 */}
            <g className="nodes">
              {filteredNodes.map(node => {
                const isSelected = selectedNode?.id === node.id;
                const isSuggested = node.isSuggested;
                const color = NODE_COLORS[node.type] || NODE_COLORS.default;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x || 0}, ${node.y || 0})`}
                    onClick={() => handleNodeClick(node)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* 节点圆圈 */}
                    <circle
                      r={isSelected ? 25 : 20}
                      fill={color}
                      opacity={isSuggested ? 0.6 : 1}
                      stroke={isSelected ? '#fff' : isSuggested ? '#f97316' : 'none'}
                      strokeWidth={isSelected ? 3 : isSuggested ? 2 : 0}
                      strokeDasharray={isSuggested ? '3,3' : 'none'}
                    />
                    {/* 建议标记 */}
                    {isSuggested && (
                      <g transform="translate(12, -12)">
                        <circle r="8" fill="#f97316" />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="10"
                          fill="#fff"
                          fontWeight="bold"
                        >
                          +
                        </text>
                      </g>
                    )}
                    {/* 节点标签 */}
                    <text
                      y={30}
                      textAnchor="middle"
                      fontSize="11"
                      fill="currentColor"
                      className="font-medium"
                    >
                      {node.label.length > 10 ? node.label.slice(0, 10) + '...' : node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* 图例 */}
          <div className="absolute bottom-4 left-4 p-3 bg-card/90 backdrop-blur rounded-lg border border-border">
            <p className="text-xs font-medium mb-2">图例</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(NODE_TYPE_LABELS).map(([type, label]) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: NODE_COLORS[type] }}
                  />
                  <span className="text-xs">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 border-t-2 border-dashed border-primary" />
                <span className="text-xs">扩展建议</span>
              </div>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="absolute top-4 left-4 p-3 bg-card/90 backdrop-blur rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Network className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">图谱统计</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">节点数</span>
                <span className="font-mono">{stats.totalNodes}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">关系数</span>
                <span className="font-mono">{stats.totalEdges}</span>
              </div>
              {stats.suggestedNodes > 0 && (
                <div className="flex justify-between gap-4 text-primary">
                  <span>建议节点</span>
                  <span className="font-mono">{stats.suggestedNodes}</span>
                </div>
              )}
              {stats.suggestedEdges > 0 && (
                <div className="flex justify-between gap-4 text-primary">
                  <span>建议关系</span>
                  <span className="font-mono">{stats.suggestedEdges}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 详情面板 */}
        {(selectedNode || selectedEdge) && (
          <div className="w-80 border-l border-border bg-card p-4 overflow-y-auto">
            {selectedNode && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">节点详情</h3>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}>
                    <Info className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">名称</p>
                    <p className="font-medium">{selectedNode.label}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">类型</p>
                    <Badge style={{ backgroundColor: NODE_COLORS[selectedNode.type] }}>
                      {NODE_TYPE_LABELS[selectedNode.type] || selectedNode.type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ID</p>
                    <p className="text-sm font-mono">{selectedNode.id}</p>
                  </div>

                  {selectedNode.isSuggested && (
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">扩展建议</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        置信度: {((selectedNode.confidence || 0) * 100).toFixed(0)}%
                      </p>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => onSuggestionApprove?.(selectedNode)}
                      >
                        批准添加
                      </Button>
                    </div>
                  )}

                  {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">属性</p>
                      <div className="space-y-1">
                        {Object.entries(selectedNode.properties).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{key}</span>
                            <span className="font-mono">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedEdge && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">关系详情</h3>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedEdge(null)}>
                    <Info className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">关系类型</p>
                    <Badge variant="outline">{selectedEdge.relation}</Badge>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <Circle className="w-4 h-4" style={{ color: NODE_COLORS[(typeof selectedEdge.source === 'string' ? layoutNodes.find(n => n.id === selectedEdge.source)?.type : selectedEdge.source.type) || 'default'] }} />
                    <span className="text-sm">
                      {typeof selectedEdge.source === 'string' 
                        ? layoutNodes.find(n => n.id === selectedEdge.source)?.label 
                        : selectedEdge.source.label}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Circle className="w-4 h-4" style={{ color: NODE_COLORS[(typeof selectedEdge.target === 'string' ? layoutNodes.find(n => n.id === selectedEdge.target)?.type : selectedEdge.target.type) || 'default'] }} />
                    <span className="text-sm">
                      {typeof selectedEdge.target === 'string' 
                        ? layoutNodes.find(n => n.id === selectedEdge.target)?.label 
                        : selectedEdge.target.label}
                    </span>
                  </div>

                  {selectedEdge.isSuggested && (
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">推荐关系</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        置信度: {((selectedEdge.confidence || 0) * 100).toFixed(0)}%
                      </p>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => onSuggestionApprove?.(selectedEdge)}
                      >
                        批准添加
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 示例数据生成器 ====================

export function generateSampleGraphData(): GraphData {
  const nodes: GraphNode[] = [
    { id: 'p1', label: '华为清洗项目', type: 'project' },
    { id: 'p2', label: '比亚迪产线升级', type: 'project' },
    { id: 'c1', label: '华为技术', type: 'customer' },
    { id: 'c2', label: '比亚迪', type: 'customer' },
    { id: 'e1', label: '张工', type: 'engineer' },
    { id: 'e2', label: '李工', type: 'engineer' },
    { id: 'eq1', label: 'USC-3000', type: 'equipment' },
    { id: 'eq2', label: 'USC-5000', type: 'equipment' },
    { id: 'cap1', label: '超声波调试L3', type: 'capability' },
    { id: 'cap2', label: '客户沟通L2', type: 'capability' },
    { id: 'k1', label: '清洗工艺手册', type: 'knowledge' },
    // 建议节点
    { id: 's1', label: '宁德时代', type: 'customer', isSuggested: true, suggestionType: 'missing_entity', confidence: 0.85 },
    { id: 's2', label: '项目管理L2', type: 'capability', isSuggested: true, suggestionType: 'completion', confidence: 0.72 }
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', source: 'p1', target: 'c1', relation: '服务于' },
    { id: 'e2', source: 'p2', target: 'c2', relation: '服务于' },
    { id: 'e3', source: 'e1', target: 'p1', relation: '负责' },
    { id: 'e4', source: 'e2', target: 'p2', relation: '负责' },
    { id: 'e5', source: 'p1', target: 'eq1', relation: '使用' },
    { id: 'e6', source: 'p2', target: 'eq2', relation: '使用' },
    { id: 'e7', source: 'e1', target: 'cap1', relation: '具备' },
    { id: 'e8', source: 'e2', target: 'cap2', relation: '具备' },
    { id: 'e9', source: 'cap1', target: 'k1', relation: '关联' },
    // 建议边
    { id: 's_e1', source: 'e1', target: 's2', relation: '应具备', isSuggested: true, suggestionType: 'recommended', confidence: 0.78 },
    { id: 's_e2', source: 'c1', target: 's1', relation: '同行业', isSuggested: true, suggestionType: 'inferred', confidence: 0.65 }
  ];

  return { nodes, edges };
}
