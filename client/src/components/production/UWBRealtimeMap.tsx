/**
 * GRT Intelligent System - UWB Realtime Position Map Component
 * Version: 1.3.77
 * 
 * 功能：
 * - 车间平面图显示
 * - UWB标签实时位置追踪
 * - 移动轨迹可视化
 * - 区域热力图
 * - 设备状态监控
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Map,
  MapPin,
  Navigation,
  Users,
  Activity,
  Clock,
  AlertTriangle,
  Settings,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Radio,
  Wifi,
  WifiOff,
  Target,
  Route,
  Thermometer,
} from 'lucide-react';

// =============================================================================
// 类型定义
// =============================================================================
interface Position {
  x: number;
  y: number;
  z?: number;
  timestamp: number;
}

interface UWBTag {
  id: string;
  name: string;
  type: 'WORKER' | 'EQUIPMENT' | 'MATERIAL' | 'VEHICLE';
  status: 'ACTIVE' | 'INACTIVE' | 'LOW_BATTERY' | 'OFFLINE';
  position: Position;
  trajectory: Position[];
  batteryLevel: number;
  assignedTo?: string;
  lastSeen: number;
}

interface Zone {
  id: string;
  name: string;
  type: 'WORK_AREA' | 'RESTRICTED' | 'SAFETY' | 'STORAGE' | 'OFFICE';
  bounds: { x1: number; y1: number; x2: number; y2: number };
  color: string;
  occupancy: number;
  maxCapacity: number;
}

interface Anchor {
  id: string;
  name: string;
  position: { x: number; y: number };
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  signalStrength: number;
}

interface FloorPlan {
  id: string;
  name: string;
  width: number;
  height: number;
  scale: number; // meters per pixel
  imageUrl?: string;
}

interface MapConfig {
  showGrid: boolean;
  showZones: boolean;
  showAnchors: boolean;
  showTrajectory: boolean;
  showHeatmap: boolean;
  trajectoryLength: number;
  refreshInterval: number;
  zoomLevel: number;
}

// =============================================================================
// Mock数据
// =============================================================================
const MOCK_FLOOR_PLAN: FloorPlan = {
  id: 'floor-1',
  name: '一楼生产车间',
  width: 800,
  height: 600,
  scale: 0.1, // 1 pixel = 0.1 meter
};

const MOCK_ZONES: Zone[] = [
  { id: 'zone-1', name: '机加工区', type: 'WORK_AREA', bounds: { x1: 50, y1: 50, x2: 250, y2: 200 }, color: '#3B82F6', occupancy: 5, maxCapacity: 8 },
  { id: 'zone-2', name: '焊接区', type: 'WORK_AREA', bounds: { x1: 280, y1: 50, x2: 480, y2: 200 }, color: '#10B981', occupancy: 3, maxCapacity: 6 },
  { id: 'zone-3', name: '装配区', type: 'WORK_AREA', bounds: { x1: 510, y1: 50, x2: 750, y2: 200 }, color: '#8B5CF6', occupancy: 8, maxCapacity: 12 },
  { id: 'zone-4', name: '危险区域', type: 'RESTRICTED', bounds: { x1: 50, y1: 230, x2: 150, y2: 330 }, color: '#EF4444', occupancy: 0, maxCapacity: 2 },
  { id: 'zone-5', name: '物料仓库', type: 'STORAGE', bounds: { x1: 180, y1: 230, x2: 380, y2: 380 }, color: '#F59E0B', occupancy: 2, maxCapacity: 10 },
  { id: 'zone-6', name: '调试区', type: 'WORK_AREA', bounds: { x1: 410, y1: 230, x2: 610, y2: 380 }, color: '#06B6D4', occupancy: 4, maxCapacity: 6 },
  { id: 'zone-7', name: '办公区', type: 'OFFICE', bounds: { x1: 640, y1: 230, x2: 750, y2: 380 }, color: '#6366F1', occupancy: 6, maxCapacity: 15 },
  { id: 'zone-8', name: '安全通道', type: 'SAFETY', bounds: { x1: 50, y1: 410, x2: 750, y2: 450 }, color: '#22C55E', occupancy: 0, maxCapacity: 50 },
];

const MOCK_ANCHORS: Anchor[] = [
  { id: 'anchor-1', name: 'A1-NW', position: { x: 50, y: 50 }, status: 'ONLINE', signalStrength: 95 },
  { id: 'anchor-2', name: 'A2-NE', position: { x: 750, y: 50 }, status: 'ONLINE', signalStrength: 92 },
  { id: 'anchor-3', name: 'A3-SW', position: { x: 50, y: 550 }, status: 'ONLINE', signalStrength: 88 },
  { id: 'anchor-4', name: 'A4-SE', position: { x: 750, y: 550 }, status: 'ONLINE', signalStrength: 90 },
  { id: 'anchor-5', name: 'A5-C', position: { x: 400, y: 300 }, status: 'DEGRADED', signalStrength: 65 },
];

const generateMockTags = (): UWBTag[] => {
  const baseTime = Date.now();
  return [
    {
      id: 'tag-001',
      name: '张工',
      type: 'WORKER',
      status: 'ACTIVE',
      position: { x: 150 + Math.random() * 20, y: 120 + Math.random() * 20, timestamp: baseTime },
      trajectory: [],
      batteryLevel: 85,
      assignedTo: '机加工区',
      lastSeen: baseTime,
    },
    {
      id: 'tag-002',
      name: '李工',
      type: 'WORKER',
      status: 'ACTIVE',
      position: { x: 380 + Math.random() * 20, y: 130 + Math.random() * 20, timestamp: baseTime },
      trajectory: [],
      batteryLevel: 72,
      assignedTo: '焊接区',
      lastSeen: baseTime,
    },
    {
      id: 'tag-003',
      name: '王工',
      type: 'WORKER',
      status: 'ACTIVE',
      position: { x: 620 + Math.random() * 20, y: 110 + Math.random() * 20, timestamp: baseTime },
      trajectory: [],
      batteryLevel: 45,
      assignedTo: '装配区',
      lastSeen: baseTime,
    },
    {
      id: 'tag-004',
      name: '叉车-01',
      type: 'VEHICLE',
      status: 'ACTIVE',
      position: { x: 280 + Math.random() * 30, y: 300 + Math.random() * 30, timestamp: baseTime },
      trajectory: [],
      batteryLevel: 60,
      lastSeen: baseTime,
    },
    {
      id: 'tag-005',
      name: '物料车-A',
      type: 'MATERIAL',
      status: 'ACTIVE',
      position: { x: 250 + Math.random() * 20, y: 280 + Math.random() * 20, timestamp: baseTime },
      trajectory: [],
      batteryLevel: 90,
      lastSeen: baseTime,
    },
    {
      id: 'tag-006',
      name: '设备-CNC01',
      type: 'EQUIPMENT',
      status: 'ACTIVE',
      position: { x: 100, y: 100, timestamp: baseTime },
      trajectory: [],
      batteryLevel: 100,
      lastSeen: baseTime,
    },
    {
      id: 'tag-007',
      name: '赵工',
      type: 'WORKER',
      status: 'LOW_BATTERY',
      position: { x: 510 + Math.random() * 20, y: 300 + Math.random() * 20, timestamp: baseTime },
      trajectory: [],
      batteryLevel: 15,
      assignedTo: '调试区',
      lastSeen: baseTime,
    },
    {
      id: 'tag-008',
      name: '钱工',
      type: 'WORKER',
      status: 'OFFLINE',
      position: { x: 700, y: 300, timestamp: baseTime - 300000 },
      trajectory: [],
      batteryLevel: 0,
      assignedTo: '办公区',
      lastSeen: baseTime - 300000,
    },
  ];
};

// =============================================================================
// 辅助函数
// =============================================================================
const getTagIcon = (type: UWBTag['type']) => {
  switch (type) {
    case 'WORKER': return Users;
    case 'EQUIPMENT': return Settings;
    case 'MATERIAL': return Layers;
    case 'VEHICLE': return Navigation;
    default: return MapPin;
  }
};

const getTagColor = (type: UWBTag['type'], status: UWBTag['status']) => {
  if (status === 'OFFLINE') return '#6B7280';
  if (status === 'LOW_BATTERY') return '#F59E0B';
  
  switch (type) {
    case 'WORKER': return '#3B82F6';
    case 'EQUIPMENT': return '#8B5CF6';
    case 'MATERIAL': return '#10B981';
    case 'VEHICLE': return '#F97316';
    default: return '#6B7280';
  }
};

const getStatusBadge = (status: UWBTag['status']) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">在线</Badge>;
    case 'INACTIVE':
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">静止</Badge>;
    case 'LOW_BATTERY':
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">低电量</Badge>;
    case 'OFFLINE':
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">离线</Badge>;
    default:
      return <Badge variant="outline">未知</Badge>;
  }
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// =============================================================================
// 主组件
// =============================================================================
interface UWBRealtimeMapProps {
  projectId?: string;
  stageId?: string;
  onTagSelect?: (tag: UWBTag) => void;
}

export default function UWBRealtimeMap({ projectId, stageId, onTagSelect }: UWBRealtimeMapProps) {
  // 状态
  const [tags, setTags] = useState<UWBTag[]>([]);
  const [selectedTag, setSelectedTag] = useState<UWBTag | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [config, setConfig] = useState<MapConfig>({
    showGrid: true,
    showZones: true,
    showAnchors: true,
    showTrajectory: true,
    showHeatmap: false,
    trajectoryLength: 50,
    refreshInterval: 1000,
    zoomLevel: 1,
  });
  const [activeTab, setActiveTab] = useState('map');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(Date.now());

  // 初始化标签数据
  useEffect(() => {
    setTags(generateMockTags());
  }, []);

  // 模拟实时位置更新
  useEffect(() => {
    if (!isPlaying) return;

    const updatePositions = () => {
      setTags(prevTags => prevTags.map(tag => {
        if (tag.status === 'OFFLINE') return tag;
        
        // 模拟移动
        const dx = (Math.random() - 0.5) * 10;
        const dy = (Math.random() - 0.5) * 10;
        const newX = Math.max(50, Math.min(750, tag.position.x + dx));
        const newY = Math.max(50, Math.min(550, tag.position.y + dy));
        const now = Date.now();
        
        const newPosition: Position = { x: newX, y: newY, timestamp: now };
        const newTrajectory = [...tag.trajectory, tag.position].slice(-config.trajectoryLength);
        
        return {
          ...tag,
          position: newPosition,
          trajectory: newTrajectory,
          lastSeen: now,
        };
      }));
      
      lastUpdateRef.current = Date.now();
    };

    const interval = setInterval(updatePositions, config.refreshInterval);
    return () => clearInterval(interval);
  }, [isPlaying, config.refreshInterval, config.trajectoryLength]);

  // 绘制地图
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = MOCK_FLOOR_PLAN;
    const zoom = config.zoomLevel;
    
    // 清空画布
    ctx.clearRect(0, 0, width * zoom, height * zoom);
    ctx.save();
    ctx.scale(zoom, zoom);
    
    // 绘制背景
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);
    
    // 绘制网格
    if (config.showGrid) {
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 0.5;
      const gridSize = 50;
      
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    
    // 绘制区域
    if (config.showZones) {
      MOCK_ZONES.forEach(zone => {
        const { x1, y1, x2, y2 } = zone.bounds;
        
        // 区域填充
        ctx.fillStyle = zone.color + '20';
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        
        // 区域边框
        ctx.strokeStyle = zone.color + '60';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        
        // 区域名称
        ctx.fillStyle = zone.color;
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(zone.name, x1 + 5, y1 + 15);
        
        // 占用率
        const occupancyText = `${zone.occupancy}/${zone.maxCapacity}`;
        ctx.fillStyle = '#94A3B8';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(occupancyText, x1 + 5, y1 + 28);
      });
    }
    
    // 绘制锚点
    if (config.showAnchors) {
      MOCK_ANCHORS.forEach(anchor => {
        const { x, y } = anchor.position;
        
        // 锚点圆圈
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = anchor.status === 'ONLINE' ? '#10B981' : 
                        anchor.status === 'DEGRADED' ? '#F59E0B' : '#EF4444';
        ctx.fill();
        
        // 锚点边框
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 信号范围（虚线圆）
        ctx.beginPath();
        ctx.arc(x, y, 100, 0, Math.PI * 2);
        ctx.strokeStyle = anchor.status === 'ONLINE' ? '#10B98140' : '#F5990B40';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 锚点名称
        ctx.fillStyle = '#94A3B8';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(anchor.name, x - 15, y + 20);
      });
    }
    
    // 绘制标签轨迹
    if (config.showTrajectory) {
      tags.forEach(tag => {
        if (tag.trajectory.length < 2) return;
        
        const color = getTagColor(tag.type, tag.status);
        
        ctx.beginPath();
        ctx.moveTo(tag.trajectory[0].x, tag.trajectory[0].y);
        
        tag.trajectory.forEach((pos, i) => {
          if (i === 0) return;
          ctx.lineTo(pos.x, pos.y);
        });
        
        ctx.strokeStyle = color + '40';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
    
    // 绘制标签
    tags.forEach(tag => {
      const { x, y } = tag.position;
      const color = getTagColor(tag.type, tag.status);
      const isSelected = selectedTag?.id === tag.id;
      
      // 选中高亮
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fillStyle = color + '30';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // 标签图标背景
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      
      // 标签边框
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 标签图标（简化为首字母）
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = tag.type === 'WORKER' ? 'W' : 
                   tag.type === 'EQUIPMENT' ? 'E' : 
                   tag.type === 'MATERIAL' ? 'M' : 'V';
      ctx.fillText(icon, x, y);
      
      // 标签名称
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tag.name, x, y + 22);
      
      // 低电量警告
      if (tag.status === 'LOW_BATTERY') {
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(x + 10, y - 10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 8px Inter, sans-serif';
        ctx.fillText('!', x + 10, y - 10);
      }
    });
    
    ctx.restore();
  }, [tags, selectedTag, config]);

  // 动画循环
  useEffect(() => {
    const animate = () => {
      drawMap();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawMap]);

  // 处理画布点击
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / config.zoomLevel;
    const y = (e.clientY - rect.top) / config.zoomLevel;
    
    // 查找点击的标签
    const clickedTag = tags.find(tag => {
      const dx = tag.position.x - x;
      const dy = tag.position.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 15;
    });
    
    if (clickedTag) {
      setSelectedTag(clickedTag);
      onTagSelect?.(clickedTag);
    } else {
      setSelectedTag(null);
    }
  };

  // 统计数据
  const stats = {
    total: tags.length,
    active: tags.filter(t => t.status === 'ACTIVE').length,
    lowBattery: tags.filter(t => t.status === 'LOW_BATTERY').length,
    offline: tags.filter(t => t.status === 'OFFLINE').length,
    workers: tags.filter(t => t.type === 'WORKER').length,
    equipment: tags.filter(t => t.type === 'EQUIPMENT').length,
    vehicles: tags.filter(t => t.type === 'VEHICLE').length,
    materials: tags.filter(t => t.type === 'MATERIAL').length,
  };

  return (
    <div className="space-y-4">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-sm font-medium">UWB实时定位</span>
            <Badge variant="outline" className="text-xs">
              {isPlaying ? '实时' : '暂停'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>最后更新: {formatTime(lastUpdateRef.current)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPlaying ? '暂停' : '播放'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTags(generateMockTags())}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>重置</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfig(c => ({ ...c, zoomLevel: Math.max(0.5, c.zoomLevel - 0.25) }))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs w-12 text-center">{Math.round(config.zoomLevel * 100)}%</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfig(c => ({ ...c, zoomLevel: Math.min(2, c.zoomLevel + 0.25) }))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">在线标签</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
              </div>
              <Wifi className="w-8 h-8 text-emerald-400/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">低电量</p>
                <p className="text-2xl font-bold text-orange-400">{stats.lowBattery}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">离线</p>
                <p className="text-2xl font-bold text-gray-400">{stats.offline}</p>
              </div>
              <WifiOff className="w-8 h-8 text-gray-400/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">总标签数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Target className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <div className="grid grid-cols-4 gap-4">
        {/* 地图区域 */}
        <div className="col-span-3">
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Map className="w-5 h-5 text-primary" />
                    {MOCK_FLOOR_PLAN.name}
                  </CardTitle>
                  <CardDescription>
                    {MOCK_FLOOR_PLAN.width * MOCK_FLOOR_PLAN.scale}m × {MOCK_FLOOR_PLAN.height * MOCK_FLOOR_PLAN.scale}m
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.showGrid}
                      onCheckedChange={(v) => setConfig(c => ({ ...c, showGrid: v }))}
                    />
                    <Label className="text-xs">网格</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.showZones}
                      onCheckedChange={(v) => setConfig(c => ({ ...c, showZones: v }))}
                    />
                    <Label className="text-xs">区域</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.showAnchors}
                      onCheckedChange={(v) => setConfig(c => ({ ...c, showAnchors: v }))}
                    />
                    <Label className="text-xs">锚点</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.showTrajectory}
                      onCheckedChange={(v) => setConfig(c => ({ ...c, showTrajectory: v }))}
                    />
                    <Label className="text-xs">轨迹</Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative border border-border rounded-lg overflow-hidden bg-[#0F172A]">
                <canvas
                  ref={canvasRef}
                  width={MOCK_FLOOR_PLAN.width * config.zoomLevel}
                  height={MOCK_FLOOR_PLAN.height * config.zoomLevel}
                  onClick={handleCanvasClick}
                  className="cursor-crosshair"
                />
                
                {/* 图例 */}
                <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 border border-border">
                  <p className="text-xs font-medium mb-2">图例</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>工人</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span>设备</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span>物料</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span>车辆</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-4">
          {/* 选中标签详情 */}
          {selectedTag && (
            <Card className="bg-card/50 border-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  选中标签
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{selectedTag.name}</span>
                  {getStatusBadge(selectedTag.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">类型</p>
                    <p>{selectedTag.type === 'WORKER' ? '工人' : 
                        selectedTag.type === 'EQUIPMENT' ? '设备' :
                        selectedTag.type === 'MATERIAL' ? '物料' : '车辆'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">电量</p>
                    <p className={selectedTag.batteryLevel < 20 ? 'text-orange-400' : ''}>
                      {selectedTag.batteryLevel}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">位置 X</p>
                    <p>{selectedTag.position.x.toFixed(1)}m</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">位置 Y</p>
                    <p>{selectedTag.position.y.toFixed(1)}m</p>
                  </div>
                </div>
                
                {selectedTag.assignedTo && (
                  <div className="text-xs">
                    <p className="text-muted-foreground">分配区域</p>
                    <p>{selectedTag.assignedTo}</p>
                  </div>
                )}
                
                <div className="text-xs">
                  <p className="text-muted-foreground">最后活动</p>
                  <p>{formatTime(selectedTag.lastSeen)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 标签列表 */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                标签列表
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {tags.map(tag => {
                    const Icon = getTagIcon(tag.type);
                    const isSelected = selectedTag?.id === tag.id;
                    
                    return (
                      <div
                        key={tag.id}
                        className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-primary/10 border-primary/50' 
                            : 'bg-background/50 border-border hover:bg-accent/50'
                        }`}
                        onClick={() => {
                          setSelectedTag(tag);
                          onTagSelect?.(tag);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getTagColor(tag.type, tag.status) + '30' }}
                            >
                              <Icon 
                                className="w-3 h-3" 
                                style={{ color: getTagColor(tag.type, tag.status) }}
                              />
                            </div>
                            <div>
                              <p className="text-xs font-medium">{tag.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {tag.position.x.toFixed(0)}, {tag.position.y.toFixed(0)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {tag.status === 'LOW_BATTERY' && (
                              <AlertTriangle className="w-3 h-3 text-orange-400" />
                            )}
                            <div 
                              className={`w-2 h-2 rounded-full ${
                                tag.status === 'ACTIVE' ? 'bg-emerald-400' :
                                tag.status === 'LOW_BATTERY' ? 'bg-orange-400' :
                                tag.status === 'INACTIVE' ? 'bg-yellow-400' : 'bg-gray-400'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
