import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Eye, Settings } from 'lucide-react';

// 零件特征类型
type FeatureType = 'blind_hole' | 'reinforcement_rib' | 'sealing_face' | 'deep_cavity' | 'thread' | 'groove' | 'oil_passage' | 'complex_surface';

// 清洗动作类型
type CleaningAction = 'high_pressure_spray' | 'oscillating_nozzle' | 'pulsed_spray' | 'targeted_flush' | 'ultrasonic' | 'air_knife';

// 轨迹点
interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  action: CleaningAction;
  pressure: number; // bar
  duration: number; // seconds
  nozzleAngle: number; // degrees
}

// 清洗策略
interface CleaningStrategy {
  featureType: FeatureType;
  featureName: string;
  trajectory: TrajectoryPoint[];
  totalDuration: number;
  description: string;
}

// 预定义的清洗策略轨迹
const CLEANING_STRATEGIES: CleaningStrategy[] = [
  {
    featureType: 'blind_hole',
    featureName: '盲孔清洗',
    description: '高压脉冲喷射 + 振荡喷嘴，确保盲孔底部残留物清除',
    totalDuration: 15,
    trajectory: [
      { x: 50, y: 50, z: 0, action: 'high_pressure_spray', pressure: 120, duration: 3, nozzleAngle: 0 },
      { x: 50, y: 50, z: 20, action: 'pulsed_spray', pressure: 150, duration: 5, nozzleAngle: 15 },
      { x: 50, y: 50, z: 40, action: 'oscillating_nozzle', pressure: 100, duration: 4, nozzleAngle: 30 },
      { x: 50, y: 50, z: 20, action: 'targeted_flush', pressure: 80, duration: 3, nozzleAngle: 0 },
    ],
  },
  {
    featureType: 'reinforcement_rib',
    featureName: '加强筋清洗',
    description: '多角度扫描喷射，覆盖加强筋根部和侧面',
    totalDuration: 12,
    trajectory: [
      { x: 20, y: 50, z: 30, action: 'high_pressure_spray', pressure: 100, duration: 2, nozzleAngle: -45 },
      { x: 40, y: 50, z: 30, action: 'oscillating_nozzle', pressure: 110, duration: 3, nozzleAngle: -30 },
      { x: 60, y: 50, z: 30, action: 'oscillating_nozzle', pressure: 110, duration: 3, nozzleAngle: 30 },
      { x: 80, y: 50, z: 30, action: 'high_pressure_spray', pressure: 100, duration: 2, nozzleAngle: 45 },
      { x: 50, y: 50, z: 10, action: 'air_knife', pressure: 60, duration: 2, nozzleAngle: 0 },
    ],
  },
  {
    featureType: 'sealing_face',
    featureName: '密封面清洗',
    description: '低压精密清洗 + 气刀吹干，确保密封面无残留',
    totalDuration: 18,
    trajectory: [
      { x: 30, y: 30, z: 20, action: 'targeted_flush', pressure: 60, duration: 4, nozzleAngle: 0 },
      { x: 70, y: 30, z: 20, action: 'targeted_flush', pressure: 60, duration: 4, nozzleAngle: 0 },
      { x: 70, y: 70, z: 20, action: 'targeted_flush', pressure: 60, duration: 4, nozzleAngle: 0 },
      { x: 30, y: 70, z: 20, action: 'targeted_flush', pressure: 60, duration: 4, nozzleAngle: 0 },
      { x: 50, y: 50, z: 10, action: 'air_knife', pressure: 80, duration: 2, nozzleAngle: 0 },
    ],
  },
  {
    featureType: 'deep_cavity',
    featureName: '深腔清洗',
    description: '分层递进清洗，从腔体底部向上逐层清洗',
    totalDuration: 25,
    trajectory: [
      { x: 50, y: 50, z: 80, action: 'high_pressure_spray', pressure: 140, duration: 5, nozzleAngle: 0 },
      { x: 50, y: 50, z: 60, action: 'pulsed_spray', pressure: 130, duration: 5, nozzleAngle: 15 },
      { x: 50, y: 50, z: 40, action: 'oscillating_nozzle', pressure: 120, duration: 5, nozzleAngle: 30 },
      { x: 50, y: 50, z: 20, action: 'oscillating_nozzle', pressure: 110, duration: 5, nozzleAngle: 45 },
      { x: 50, y: 50, z: 10, action: 'air_knife', pressure: 70, duration: 5, nozzleAngle: 0 },
    ],
  },
  {
    featureType: 'thread',
    featureName: '螺纹清洗',
    description: '螺旋轨迹清洗，确保螺纹牙间残留物清除',
    totalDuration: 20,
    trajectory: [
      { x: 50, y: 50, z: 0, action: 'targeted_flush', pressure: 90, duration: 4, nozzleAngle: 60 },
      { x: 60, y: 60, z: 10, action: 'pulsed_spray', pressure: 100, duration: 4, nozzleAngle: 45 },
      { x: 40, y: 60, z: 20, action: 'pulsed_spray', pressure: 100, duration: 4, nozzleAngle: 45 },
      { x: 40, y: 40, z: 30, action: 'pulsed_spray', pressure: 100, duration: 4, nozzleAngle: 45 },
      { x: 60, y: 40, z: 40, action: 'targeted_flush', pressure: 90, duration: 4, nozzleAngle: 60 },
    ],
  },
  {
    featureType: 'groove',
    featureName: '沟槽清洗',
    description: '沿沟槽方向线性扫描，高压冲洗沟槽底部',
    totalDuration: 14,
    trajectory: [
      { x: 10, y: 50, z: 25, action: 'high_pressure_spray', pressure: 130, duration: 3, nozzleAngle: 0 },
      { x: 30, y: 50, z: 25, action: 'high_pressure_spray', pressure: 130, duration: 3, nozzleAngle: 0 },
      { x: 50, y: 50, z: 25, action: 'high_pressure_spray', pressure: 130, duration: 3, nozzleAngle: 0 },
      { x: 70, y: 50, z: 25, action: 'high_pressure_spray', pressure: 130, duration: 3, nozzleAngle: 0 },
      { x: 90, y: 50, z: 25, action: 'air_knife', pressure: 60, duration: 2, nozzleAngle: 0 },
    ],
  },
  {
    featureType: 'oil_passage',
    featureName: '油道清洗',
    description: '高压脉冲 + 超声波辅助，确保油道内壁清洁',
    totalDuration: 22,
    trajectory: [
      { x: 20, y: 50, z: 30, action: 'high_pressure_spray', pressure: 150, duration: 4, nozzleAngle: 0 },
      { x: 40, y: 50, z: 30, action: 'pulsed_spray', pressure: 160, duration: 5, nozzleAngle: 0 },
      { x: 60, y: 50, z: 30, action: 'ultrasonic', pressure: 0, duration: 6, nozzleAngle: 0 },
      { x: 80, y: 50, z: 30, action: 'pulsed_spray', pressure: 160, duration: 5, nozzleAngle: 0 },
      { x: 50, y: 50, z: 10, action: 'air_knife', pressure: 80, duration: 2, nozzleAngle: 0 },
    ],
  },
  {
    featureType: 'complex_surface',
    featureName: '复杂曲面清洗',
    description: '自适应轨迹规划，多角度覆盖复杂曲面',
    totalDuration: 28,
    trajectory: [
      { x: 25, y: 25, z: 40, action: 'oscillating_nozzle', pressure: 100, duration: 4, nozzleAngle: -30 },
      { x: 75, y: 25, z: 35, action: 'oscillating_nozzle', pressure: 100, duration: 4, nozzleAngle: 30 },
      { x: 75, y: 75, z: 30, action: 'oscillating_nozzle', pressure: 100, duration: 4, nozzleAngle: -30 },
      { x: 25, y: 75, z: 35, action: 'oscillating_nozzle', pressure: 100, duration: 4, nozzleAngle: 30 },
      { x: 50, y: 50, z: 20, action: 'targeted_flush', pressure: 80, duration: 6, nozzleAngle: 0 },
      { x: 50, y: 50, z: 10, action: 'air_knife', pressure: 70, duration: 6, nozzleAngle: 0 },
    ],
  },
];

// 动作颜色映射
const ACTION_COLORS: Record<CleaningAction, string> = {
  high_pressure_spray: '#ef4444', // red
  oscillating_nozzle: '#f97316', // orange
  pulsed_spray: '#eab308', // yellow
  targeted_flush: '#22c55e', // green
  ultrasonic: '#3b82f6', // blue
  air_knife: '#8b5cf6', // purple
};

// 动作名称映射
const ACTION_NAMES: Record<CleaningAction, string> = {
  high_pressure_spray: '高压喷射',
  oscillating_nozzle: '振荡喷嘴',
  pulsed_spray: '脉冲喷射',
  targeted_flush: '定向冲洗',
  ultrasonic: '超声波',
  air_knife: '气刀',
};

interface CleaningTrajectoryVisualizationProps {
  initialFeatureType?: FeatureType;
  onStrategySelect?: (strategy: CleaningStrategy) => void;
}

export default function CleaningTrajectoryVisualization({
  initialFeatureType = 'blind_hole',
  onStrategySelect,
}: CleaningTrajectoryVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFeature, setSelectedFeature] = useState<FeatureType>(initialFeatureType);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [showTrail, setShowTrail] = useState(true);
  const [viewAngle, setViewAngle] = useState({ x: 30, y: 45 });
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const currentStrategy = useMemo(
    () => CLEANING_STRATEGIES.find((s) => s.featureType === selectedFeature) || CLEANING_STRATEGIES[0],
    [selectedFeature]
  );

  // 3D到2D投影
  const project3DTo2D = (x: number, y: number, z: number, canvasWidth: number, canvasHeight: number) => {
    const angleX = (viewAngle.x * Math.PI) / 180;
    const angleY = (viewAngle.y * Math.PI) / 180;

    // 旋转变换
    const rotatedX = x * Math.cos(angleY) - z * Math.sin(angleY);
    const rotatedZ = x * Math.sin(angleY) + z * Math.cos(angleY);
    const rotatedY = y * Math.cos(angleX) - rotatedZ * Math.sin(angleX);

    // 投影到2D
    const scale = zoom * 2;
    const projectedX = canvasWidth / 2 + rotatedX * scale;
    const projectedY = canvasHeight / 2 - rotatedY * scale;

    return { x: projectedX, y: projectedY };
  };

  // 绘制坐标轴
  const drawAxes = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const origin = project3DTo2D(0, 0, 0, width, height);
    const xEnd = project3DTo2D(60, 0, 0, width, height);
    const yEnd = project3DTo2D(0, 60, 0, width, height);
    const zEnd = project3DTo2D(0, 0, 60, width, height);

    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    // X轴 (红色)
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(xEnd.x, xEnd.y);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = '12px monospace';
    ctx.fillText('X', xEnd.x + 5, xEnd.y);

    // Y轴 (绿色)
    ctx.strokeStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(yEnd.x, yEnd.y);
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.fillText('Y', yEnd.x + 5, yEnd.y);

    // Z轴 (蓝色)
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(zEnd.x, zEnd.y);
    ctx.stroke();
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('Z', zEnd.x + 5, zEnd.y);
  };

  // 绘制零件轮廓
  const drawPartOutline = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // 绘制底面
    const corners = [
      project3DTo2D(0, 0, 0, width, height),
      project3DTo2D(100, 0, 0, width, height),
      project3DTo2D(100, 100, 0, width, height),
      project3DTo2D(0, 100, 0, width, height),
    ];

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    corners.forEach((corner) => ctx.lineTo(corner.x, corner.y));
    ctx.closePath();
    ctx.stroke();

    // 绘制顶面
    const topCorners = [
      project3DTo2D(0, 0, 50, width, height),
      project3DTo2D(100, 0, 50, width, height),
      project3DTo2D(100, 100, 50, width, height),
      project3DTo2D(0, 100, 50, width, height),
    ];

    ctx.beginPath();
    ctx.moveTo(topCorners[0].x, topCorners[0].y);
    topCorners.forEach((corner) => ctx.lineTo(corner.x, corner.y));
    ctx.closePath();
    ctx.stroke();

    // 绘制垂直边
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(corners[i].x, corners[i].y);
      ctx.lineTo(topCorners[i].x, topCorners[i].y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  };

  // 绘制轨迹
  const drawTrajectory = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const trajectory = currentStrategy.trajectory;

    // 绘制轨迹线
    if (showTrail) {
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      for (let i = 0; i < Math.min(currentStep + 1, trajectory.length); i++) {
        if (i > 0) {
          const prev = trajectory[i - 1];
          const curr = trajectory[i];
          const prevPoint = project3DTo2D(prev.x, prev.y, prev.z, width, height);
          const currPoint = project3DTo2D(curr.x, curr.y, curr.z, width, height);

          // 渐变线条
          const gradient = ctx.createLinearGradient(prevPoint.x, prevPoint.y, currPoint.x, currPoint.y);
          gradient.addColorStop(0, ACTION_COLORS[prev.action]);
          gradient.addColorStop(1, ACTION_COLORS[curr.action]);

          ctx.strokeStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(prevPoint.x, prevPoint.y);
          ctx.lineTo(currPoint.x, currPoint.y);
          ctx.stroke();
        }
      }
    }

    // 绘制所有轨迹点
    trajectory.forEach((point, index) => {
      const projected = project3DTo2D(point.x, point.y, point.z, width, height);
      const isActive = index === currentStep;
      const isPast = index < currentStep;

      // 绘制点
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, isActive ? 12 : 8, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? ACTION_COLORS[point.action] : isPast ? ACTION_COLORS[point.action] + '80' : '#4b5563';
      ctx.fill();

      // 绘制边框
      if (isActive) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 绘制喷嘴方向指示器
        const angleRad = (point.nozzleAngle * Math.PI) / 180;
        const arrowLength = 25;
        const endX = projected.x + Math.sin(angleRad) * arrowLength;
        const endY = projected.y - Math.cos(angleRad) * arrowLength;

        ctx.strokeStyle = ACTION_COLORS[point.action];
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(projected.x, projected.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // 绘制箭头
        const arrowSize = 8;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowSize * Math.cos(angleRad - Math.PI / 6), endY - arrowSize * Math.sin(angleRad - Math.PI / 6));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowSize * Math.cos(angleRad + Math.PI / 6), endY - arrowSize * Math.sin(angleRad + Math.PI / 6));
        ctx.stroke();
      }

      // 绘制序号
      ctx.fillStyle = isActive ? '#ffffff' : isPast ? '#ffffff' : '#9ca3af';
      ctx.font = `${isActive ? 'bold ' : ''}10px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(index + 1), projected.x, projected.y);
    });
  };

  // 绘制信息面板
  const drawInfoPanel = (ctx: CanvasRenderingContext2D, width: number) => {
    if (currentStep < currentStrategy.trajectory.length) {
      const point = currentStrategy.trajectory[currentStep];

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 180, 100);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`步骤 ${currentStep + 1}/${currentStrategy.trajectory.length}`, 20, 30);

      ctx.font = '11px monospace';
      ctx.fillStyle = ACTION_COLORS[point.action];
      ctx.fillText(`动作: ${ACTION_NAMES[point.action]}`, 20, 50);

      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`压力: ${point.pressure} bar`, 20, 68);
      ctx.fillText(`时间: ${point.duration}s`, 20, 84);
      ctx.fillText(`角度: ${point.nozzleAngle}°`, 20, 100);
    }
  };

  // 主绘制函数
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 清空画布
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    // 绘制网格背景
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // 绘制各元素
    drawAxes(ctx, width, height);
    drawPartOutline(ctx, width, height);
    drawTrajectory(ctx, width, height);
    drawInfoPanel(ctx, width);
  };

  // 动画循环
  useEffect(() => {
    if (isPlaying) {
      const animate = (timestamp: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const elapsed = timestamp - lastTimeRef.current;

        if (elapsed > 1000 / playbackSpeed) {
          lastTimeRef.current = timestamp;
          setCurrentStep((prev) => {
            const next = prev + 1;
            if (next >= currentStrategy.trajectory.length) {
              setIsPlaying(false);
              return prev;
            }
            return next;
          });
        }

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, currentStrategy.trajectory.length]);

  // 重绘
  useEffect(() => {
    draw();
  }, [currentStep, selectedFeature, zoom, viewAngle, showTrail]);

  // 重置
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    lastTimeRef.current = 0;
  };

  // 特征选择变化
  const handleFeatureChange = (value: string) => {
    setSelectedFeature(value as FeatureType);
    handleReset();
    const strategy = CLEANING_STRATEGIES.find((s) => s.featureType === value);
    if (strategy && onStrategySelect) {
      onStrategySelect(strategy);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            清洗轨迹可视化
          </CardTitle>
          <Badge variant="outline" className="font-mono">
            {currentStrategy.featureName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 控制面板 */}
        <div className="flex flex-wrap items-center gap-4">
          <Select value={selectedFeature} onValueChange={handleFeatureChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择特征类型" />
            </SelectTrigger>
            <SelectContent>
              {CLEANING_STRATEGIES.map((strategy) => (
                <SelectItem key={strategy.featureType} value={strategy.featureType}>
                  {strategy.featureName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs font-mono w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <Button variant={showTrail ? 'default' : 'outline'} size="sm" onClick={() => setShowTrail(!showTrail)}>
            轨迹线
          </Button>
        </div>

        {/* 播放速度 */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">播放速度:</span>
          <Slider
            value={[playbackSpeed]}
            onValueChange={([value]) => setPlaybackSpeed(value)}
            min={0.5}
            max={3}
            step={0.5}
            className="w-32"
          />
          <span className="text-sm font-mono">{playbackSpeed}x</span>
        </div>

        {/* 视角控制 */}
        <div className="flex items-center gap-4">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">X角度:</span>
          <Slider
            value={[viewAngle.x]}
            onValueChange={([value]) => setViewAngle((v) => ({ ...v, x: value }))}
            min={0}
            max={90}
            step={5}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">Y角度:</span>
          <Slider
            value={[viewAngle.y]}
            onValueChange={([value]) => setViewAngle((v) => ({ ...v, y: value }))}
            min={0}
            max={90}
            step={5}
            className="w-24"
          />
        </div>

        {/* 画布 */}
        <div className="relative rounded-lg overflow-hidden border border-border">
          <canvas ref={canvasRef} width={600} height={400} className="w-full" />
        </div>

        {/* 策略描述 */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">{currentStrategy.description}</p>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs font-mono">总时长: {currentStrategy.totalDuration}s</span>
            <span className="text-xs font-mono">步骤数: {currentStrategy.trajectory.length}</span>
          </div>
        </div>

        {/* 动作图例 */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(ACTION_NAMES).map(([action, name]) => (
            <div key={action} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ACTION_COLORS[action as CleaningAction] }} />
              <span className="text-xs text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>

        {/* 进度条 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">进度:</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStep + 1) / currentStrategy.trajectory.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono">
            {currentStep + 1}/{currentStrategy.trajectory.length}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
