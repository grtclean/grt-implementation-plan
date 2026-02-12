import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Square,
  Circle,
  Pentagon,
  MousePointer,
  Trash2,
  Save,
  Download,
  Upload,
  Grid,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Settings,
  Layers,
  Copy,
} from 'lucide-react';

// 类型定义
type GeofenceShape = 'rectangle' | 'circle' | 'polygon';

interface Point {
  x: number;
  y: number;
}

interface GeofenceDefinition {
  id: string;
  name: string;
  shape: GeofenceShape;
  color: string;
  opacity: number;
  bounds?: { topLeft: Point; bottomRight: Point };
  center?: Point;
  radius?: number;
  vertices?: Point[];
  zoneType: string;
  alertLevel: 'info' | 'warning' | 'critical' | 'emergency';
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// 预设区域类型
const ZONE_TYPES = [
  { id: 'assembly', name: '装配区', color: '#3B82F6', icon: '🔧' },
  { id: 'calibration', name: '标定区', color: '#10B981', icon: '📏' },
  { id: 'testing', name: '测试区', color: '#F59E0B', icon: '🧪' },
  { id: 'storage', name: '仓储区', color: '#8B5CF6', icon: '📦' },
  { id: 'shipping', name: '发货区', color: '#EC4899', icon: '🚚' },
  { id: 'restricted', name: '禁区', color: '#EF4444', icon: '⛔' },
  { id: 'safety', name: '安全区', color: '#06B6D4', icon: '🛡️' },
  { id: 'maintenance', name: '维修区', color: '#F97316', icon: '🔨' },
];

// 告警级别
const ALERT_LEVELS = [
  { id: 'info', name: '信息', color: '#3B82F6' },
  { id: 'warning', name: '警告', color: '#F59E0B' },
  { id: 'critical', name: '严重', color: '#EF4444' },
  { id: 'emergency', name: '紧急', color: '#DC2626' },
];

interface GeofenceVisualEditorProps {
  initialGeofences?: GeofenceDefinition[];
  mapWidth?: number;
  mapHeight?: number;
  onSave?: (geofences: GeofenceDefinition[]) => void;
}

export default function GeofenceVisualEditor({
  initialGeofences = [],
  mapWidth = 1000,
  mapHeight = 600,
  onSave,
}: GeofenceVisualEditorProps) {
  // 状态
  const [geofences, setGeofences] = useState<GeofenceDefinition[]>(initialGeofences);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<'select' | GeofenceShape>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showLabels, setShowLabels] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<GeofenceDefinition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 生成唯一ID
  const generateId = () => `gf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 对齐到网格
  const snap = useCallback((point: Point): Point => {
    if (!snapToGrid) return point;
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    };
  }, [snapToGrid, gridSize]);

  // 获取鼠标在画布上的坐标
  const getCanvasPoint = useCallback((e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }, [zoom, pan]);

  // 检查点是否在围栏内
  const isPointInGeofence = useCallback((point: Point, gf: GeofenceDefinition): boolean => {
    switch (gf.shape) {
      case 'rectangle':
        if (gf.bounds) {
          return (
            point.x >= gf.bounds.topLeft.x &&
            point.x <= gf.bounds.bottomRight.x &&
            point.y >= gf.bounds.topLeft.y &&
            point.y <= gf.bounds.bottomRight.y
          );
        }
        break;
      case 'circle':
        if (gf.center && gf.radius) {
          const dx = point.x - gf.center.x;
          const dy = point.y - gf.center.y;
          return Math.sqrt(dx * dx + dy * dy) <= gf.radius;
        }
        break;
      case 'polygon':
        if (gf.vertices && gf.vertices.length >= 3) {
          let inside = false;
          const n = gf.vertices.length;
          for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = gf.vertices[i].x, yi = gf.vertices[i].y;
            const xj = gf.vertices[j].x, yj = gf.vertices[j].y;
            if (((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
              inside = !inside;
            }
          }
          return inside;
        }
        break;
    }
    return false;
  }, []);

  // 绘制画布
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 应用变换
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 绘制网格
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5 / zoom;
      for (let x = 0; x <= mapWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mapHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= mapHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(mapWidth, y);
        ctx.stroke();
      }
    }

    // 绘制围栏
    for (const gf of geofences) {
      const isSelected = gf.id === selectedId;
      const zoneType = ZONE_TYPES.find(z => z.id === gf.zoneType);
      const color = zoneType?.color || gf.color;

      ctx.fillStyle = `${color}${Math.round(gf.opacity * 255).toString(16).padStart(2, '0')}`;
      ctx.strokeStyle = isSelected ? '#000' : color;
      ctx.lineWidth = isSelected ? 2 / zoom : 1 / zoom;

      switch (gf.shape) {
        case 'rectangle':
          if (gf.bounds) {
            const width = gf.bounds.bottomRight.x - gf.bounds.topLeft.x;
            const height = gf.bounds.bottomRight.y - gf.bounds.topLeft.y;
            ctx.fillRect(gf.bounds.topLeft.x, gf.bounds.topLeft.y, width, height);
            ctx.strokeRect(gf.bounds.topLeft.x, gf.bounds.topLeft.y, width, height);
          }
          break;
        case 'circle':
          if (gf.center && gf.radius) {
            ctx.beginPath();
            ctx.arc(gf.center.x, gf.center.y, gf.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
          break;
        case 'polygon':
          if (gf.vertices && gf.vertices.length >= 3) {
            ctx.beginPath();
            ctx.moveTo(gf.vertices[0].x, gf.vertices[0].y);
            for (let i = 1; i < gf.vertices.length; i++) {
              ctx.lineTo(gf.vertices[i].x, gf.vertices[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          break;
      }

      // 绘制标签
      if (showLabels) {
        let labelPos: Point = { x: 0, y: 0 };
        switch (gf.shape) {
          case 'rectangle':
            if (gf.bounds) {
              labelPos = {
                x: (gf.bounds.topLeft.x + gf.bounds.bottomRight.x) / 2,
                y: (gf.bounds.topLeft.y + gf.bounds.bottomRight.y) / 2,
              };
            }
            break;
          case 'circle':
            if (gf.center) {
              labelPos = gf.center;
            }
            break;
          case 'polygon':
            if (gf.vertices) {
              const sum = gf.vertices.reduce((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }), { x: 0, y: 0 });
              labelPos = { x: sum.x / gf.vertices.length, y: sum.y / gf.vertices.length };
            }
            break;
        }

        ctx.fillStyle = '#000';
        ctx.font = `${12 / zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(gf.name, labelPos.x, labelPos.y);
      }

      // 绘制选中状态的控制点
      if (isSelected) {
        ctx.fillStyle = '#3B82F6';
        switch (gf.shape) {
          case 'rectangle':
            if (gf.bounds) {
              const handles = [
                gf.bounds.topLeft,
                { x: gf.bounds.bottomRight.x, y: gf.bounds.topLeft.y },
                gf.bounds.bottomRight,
                { x: gf.bounds.topLeft.x, y: gf.bounds.bottomRight.y },
              ];
              for (const h of handles) {
                ctx.fillRect(h.x - 4 / zoom, h.y - 4 / zoom, 8 / zoom, 8 / zoom);
              }
            }
            break;
          case 'circle':
            if (gf.center && gf.radius) {
              ctx.fillRect(gf.center.x + gf.radius - 4 / zoom, gf.center.y - 4 / zoom, 8 / zoom, 8 / zoom);
            }
            break;
          case 'polygon':
            if (gf.vertices) {
              for (const v of gf.vertices) {
                ctx.beginPath();
                ctx.arc(v.x, v.y, 4 / zoom, 0, Math.PI * 2);
                ctx.fill();
              }
            }
            break;
        }
      }
    }

    // 绘制正在绘制的形状
    if (isDrawing && drawingPoints.length > 0) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);

      if (currentTool === 'polygon' && drawingPoints.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
        for (let i = 1; i < drawingPoints.length; i++) {
          ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
        }
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [geofences, selectedId, showGrid, showLabels, gridSize, zoom, pan, mapWidth, mapHeight, isDrawing, drawingPoints, currentTool]);

  // 重绘画布
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // 处理鼠标按下
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const point = snap(getCanvasPoint(e));

    if (currentTool === 'select') {
      // 选择模式
      const clicked = geofences.find(gf => isPointInGeofence(point, gf));
      if (clicked) {
        setSelectedId(clicked.id);
        setIsDragging(true);
        setDragStart(point);
      } else {
        setSelectedId(null);
      }
    } else if (currentTool === 'polygon') {
      // 多边形绘制模式
      if (!isDrawing) {
        setIsDrawing(true);
        setDrawingPoints([point]);
      } else {
        // 检查是否点击了起点（闭合多边形）
        if (drawingPoints.length >= 3) {
          const startPoint = drawingPoints[0];
          const dist = Math.sqrt(Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2));
          if (dist < 20 / zoom) {
            // 闭合多边形
            const newGeofence: GeofenceDefinition = {
              id: generateId(),
              name: '新建多边形区域',
              shape: 'polygon',
              color: '#F59E0B',
              opacity: 0.3,
              vertices: drawingPoints,
              zoneType: 'testing',
              alertLevel: 'info',
              isActive: true,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            setGeofences([...geofences, newGeofence]);
            setSelectedId(newGeofence.id);
            setIsDrawing(false);
            setDrawingPoints([]);
            toast.success('多边形围栏创建成功');
            return;
          }
        }
        setDrawingPoints([...drawingPoints, point]);
      }
    } else {
      // 矩形/圆形绘制模式
      setIsDrawing(true);
      setDrawingPoints([point]);
    }
  }, [currentTool, snap, getCanvasPoint, geofences, isPointInGeofence, isDrawing, drawingPoints, zoom]);

  // 处理鼠标移动
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const point = snap(getCanvasPoint(e));

    if (isDragging && selectedId && dragStart) {
      // 拖动围栏
      const delta = { x: point.x - dragStart.x, y: point.y - dragStart.y };
      setGeofences(geofences.map(gf => {
        if (gf.id !== selectedId) return gf;
        
        const updated = { ...gf, updatedAt: Date.now() };
        switch (gf.shape) {
          case 'rectangle':
            if (updated.bounds) {
              updated.bounds = {
                topLeft: { x: updated.bounds.topLeft.x + delta.x, y: updated.bounds.topLeft.y + delta.y },
                bottomRight: { x: updated.bounds.bottomRight.x + delta.x, y: updated.bounds.bottomRight.y + delta.y },
              };
            }
            break;
          case 'circle':
            if (updated.center) {
              updated.center = { x: updated.center.x + delta.x, y: updated.center.y + delta.y };
            }
            break;
          case 'polygon':
            if (updated.vertices) {
              updated.vertices = updated.vertices.map(v => ({ x: v.x + delta.x, y: v.y + delta.y }));
            }
            break;
        }
        return updated;
      }));
      setDragStart(point);
    }
  }, [isDragging, selectedId, dragStart, snap, getCanvasPoint, geofences]);

  // 处理鼠标释放
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const point = snap(getCanvasPoint(e));

    if (isDrawing && drawingPoints.length > 0 && currentTool !== 'polygon') {
      const startPoint = drawingPoints[0];

      if (currentTool === 'rectangle') {
        const newGeofence: GeofenceDefinition = {
          id: generateId(),
          name: '新建矩形区域',
          shape: 'rectangle',
          color: '#3B82F6',
          opacity: 0.3,
          bounds: {
            topLeft: { x: Math.min(startPoint.x, point.x), y: Math.min(startPoint.y, point.y) },
            bottomRight: { x: Math.max(startPoint.x, point.x), y: Math.max(startPoint.y, point.y) },
          },
          zoneType: 'assembly',
          alertLevel: 'info',
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setGeofences([...geofences, newGeofence]);
        setSelectedId(newGeofence.id);
        toast.success('矩形围栏创建成功');
      } else if (currentTool === 'circle') {
        const radius = Math.sqrt(Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2));
        const newGeofence: GeofenceDefinition = {
          id: generateId(),
          name: '新建圆形区域',
          shape: 'circle',
          color: '#10B981',
          opacity: 0.3,
          center: startPoint,
          radius,
          zoneType: 'calibration',
          alertLevel: 'info',
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setGeofences([...geofences, newGeofence]);
        setSelectedId(newGeofence.id);
        toast.success('圆形围栏创建成功');
      }

      setIsDrawing(false);
      setDrawingPoints([]);
    }

    setIsDragging(false);
    setDragStart(null);
  }, [isDrawing, drawingPoints, currentTool, snap, getCanvasPoint, geofences]);

  // 删除选中的围栏
  const handleDelete = useCallback(() => {
    if (selectedId) {
      setGeofences(geofences.filter(gf => gf.id !== selectedId));
      setSelectedId(null);
      toast.success('围栏已删除');
    }
  }, [selectedId, geofences]);

  // 复制选中的围栏
  const handleDuplicate = useCallback(() => {
    if (selectedId) {
      const original = geofences.find(gf => gf.id === selectedId);
      if (original) {
        const copy: GeofenceDefinition = {
          ...original,
          id: generateId(),
          name: `${original.name} (副本)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        // 偏移一点位置
        if (copy.bounds) {
          copy.bounds = {
            topLeft: { x: copy.bounds.topLeft.x + 20, y: copy.bounds.topLeft.y + 20 },
            bottomRight: { x: copy.bounds.bottomRight.x + 20, y: copy.bounds.bottomRight.y + 20 },
          };
        }
        if (copy.center) {
          copy.center = { x: copy.center.x + 20, y: copy.center.y + 20 };
        }
        if (copy.vertices) {
          copy.vertices = copy.vertices.map(v => ({ x: v.x + 20, y: v.y + 20 }));
        }
        setGeofences([...geofences, copy]);
        setSelectedId(copy.id);
        toast.success('围栏已复制');
      }
    }
  }, [selectedId, geofences]);

  // 编辑选中的围栏
  const handleEdit = useCallback(() => {
    if (selectedId) {
      const gf = geofences.find(g => g.id === selectedId);
      if (gf) {
        setEditingGeofence({ ...gf });
        setEditDialogOpen(true);
      }
    }
  }, [selectedId, geofences]);

  // 保存编辑
  const handleSaveEdit = useCallback(() => {
    if (editingGeofence) {
      setGeofences(geofences.map(gf => 
        gf.id === editingGeofence.id ? { ...editingGeofence, updatedAt: Date.now() } : gf
      ));
      setEditDialogOpen(false);
      setEditingGeofence(null);
      toast.success('围栏已更新');
    }
  }, [editingGeofence, geofences]);

  // 导出配置
  const handleExport = useCallback(() => {
    const json = JSON.stringify(geofences, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `geofences_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('配置已导出');
  }, [geofences]);

  // 导入配置
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const imported = JSON.parse(e.target?.result as string);
            if (Array.isArray(imported)) {
              const newGeofences = imported.map(gf => ({
                ...gf,
                id: generateId(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }));
              setGeofences([...geofences, ...newGeofences]);
              toast.success(`已导入 ${newGeofences.length} 个围栏`);
            }
          } catch {
            toast.error('导入失败：无效的JSON格式');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [geofences]);

  // 保存到服务器
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(geofences);
      toast.success('配置已保存');
    }
  }, [geofences, onSave]);

  // 获取选中的围栏
  const selectedGeofence = selectedId ? geofences.find(gf => gf.id === selectedId) : null;

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/50">
        <div className="flex items-center gap-1 border-r pr-2">
          <Button
            variant={currentTool === 'select' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentTool('select')}
            title="选择工具"
          >
            <MousePointer className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === 'rectangle' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentTool('rectangle')}
            title="矩形工具"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === 'circle' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentTool('circle')}
            title="圆形工具"
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool === 'polygon' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentTool('polygon')}
            title="多边形工具"
          >
            <Pentagon className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 border-r pr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.min(zoom * 1.2, 3))}
            title="放大"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.max(zoom / 1.2, 0.5))}
            title="缩小"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            title="重置视图"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 border-r pr-2">
          <Button
            variant={showGrid ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
            title="显示网格"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={showLabels ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setShowLabels(!showLabels)}
            title="显示标签"
          >
            {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-1 border-r pr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={!selectedId}
            title="删除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDuplicate}
            disabled={!selectedId}
            title="复制"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            disabled={!selectedId}
            title="编辑属性"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="sm" onClick={handleImport} title="导入">
            <Upload className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport} title="导出">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="default" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            保存
          </Button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 画布区域 */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-white">
          <canvas
            ref={canvasRef}
            width={mapWidth}
            height={mapHeight}
            className="cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* 右侧面板 */}
        <div className="w-64 border-l bg-muted/30 overflow-y-auto">
          <Tabs defaultValue="layers" className="h-full">
            <TabsList className="w-full">
              <TabsTrigger value="layers" className="flex-1">
                <Layers className="h-4 w-4 mr-1" />
                图层
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">
                <Settings className="h-4 w-4 mr-1" />
                设置
              </TabsTrigger>
            </TabsList>

            <TabsContent value="layers" className="p-2 space-y-2">
              {geofences.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无围栏，使用工具栏绘制
                </p>
              ) : (
                geofences.map(gf => {
                  const zoneType = ZONE_TYPES.find(z => z.id === gf.zoneType);
                  return (
                    <Card
                      key={gf.id}
                      className={`cursor-pointer transition-colors ${
                        gf.id === selectedId ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedId(gf.id)}
                    >
                      <CardContent className="p-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: zoneType?.color || gf.color }}
                          />
                          <span className="text-sm font-medium flex-1 truncate">{gf.name}</span>
                          <Badge variant={gf.isActive ? 'default' : 'secondary'} className="text-xs">
                            {gf.isActive ? '启用' : '禁用'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-muted-foreground">{zoneType?.icon}</span>
                          <span className="text-xs text-muted-foreground">{zoneType?.name}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="settings" className="p-2 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">网格大小</Label>
                <Slider
                  value={[gridSize]}
                  onValueChange={([v]) => setGridSize(v)}
                  min={10}
                  max={50}
                  step={5}
                />
                <span className="text-xs text-muted-foreground">{gridSize}px</span>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">对齐到网格</Label>
                <Switch checked={snapToGrid} onCheckedChange={setSnapToGrid} />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">显示网格</Label>
                <Switch checked={showGrid} onCheckedChange={setShowGrid} />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">显示标签</Label>
                <Switch checked={showLabels} onCheckedChange={setShowLabels} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 状态栏 */}
      <div className="flex items-center gap-4 px-2 py-1 border-t bg-muted/50 text-xs text-muted-foreground">
        <span>围栏数量: {geofences.length}</span>
        {selectedGeofence && (
          <>
            <span>|</span>
            <span>选中: {selectedGeofence.name}</span>
            <span>类型: {selectedGeofence.shape}</span>
          </>
        )}
        {isDrawing && currentTool === 'polygon' && (
          <>
            <span>|</span>
            <span>顶点: {drawingPoints.length} (点击起点闭合)</span>
          </>
        )}
      </div>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑围栏属性</DialogTitle>
          </DialogHeader>
          {editingGeofence && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>名称</Label>
                <Input
                  value={editingGeofence.name}
                  onChange={(e) => setEditingGeofence({ ...editingGeofence, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>区域类型</Label>
                <Select
                  value={editingGeofence.zoneType}
                  onValueChange={(v) => setEditingGeofence({ ...editingGeofence, zoneType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONE_TYPES.map(zone => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.icon} {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>告警级别</Label>
                <Select
                  value={editingGeofence.alertLevel}
                  onValueChange={(v) => setEditingGeofence({ ...editingGeofence, alertLevel: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALERT_LEVELS.map(level => (
                      <SelectItem key={level.id} value={level.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: level.color }} />
                          {level.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>透明度: {Math.round(editingGeofence.opacity * 100)}%</Label>
                <Slider
                  value={[editingGeofence.opacity * 100]}
                  onValueChange={([v]) => setEditingGeofence({ ...editingGeofence, opacity: v / 100 })}
                  min={10}
                  max={80}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>启用状态</Label>
                <Switch
                  checked={editingGeofence.isActive}
                  onCheckedChange={(v) => setEditingGeofence({ ...editingGeofence, isActive: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
