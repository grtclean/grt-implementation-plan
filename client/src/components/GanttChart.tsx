/**
 * 甘特图组件 - 用于展示排程结果
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Download,
  Maximize2,
  Filter
} from 'lucide-react';
import { format, addDays, differenceInDays, startOfDay, endOfDay, eachDayOfInterval, isWeekend } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// ==================== 类型定义 ====================

export interface GanttTask {
  id: string;
  name: string;
  start: string | Date;
  end: string | Date;
  resource: string;
  resourceId?: string;
  bu: string;
  taskType: string;
  progress: number;
  dependencies: string[];
  changeoverTime?: number;
  delayPenalty?: number;
  color?: string;
}

export interface GanttResource {
  id: string;
  name: string;
  type: string;
  bu?: string;
  utilization: number;
}

interface GanttChartProps {
  tasks: GanttTask[];
  resources: GanttResource[];
  startDate?: Date;
  endDate?: Date;
  onTaskClick?: (task: GanttTask) => void;
  onResourceClick?: (resource: GanttResource) => void;
  viewMode?: 'day' | 'week' | 'month';
  showDependencies?: boolean;
  showProgress?: boolean;
  height?: number;
}

// ==================== 颜色配置 ====================

const BU_COLORS: Record<string, string> = {
  BU1: '#3b82f6', // 蓝色 - 半导体设备清洗
  BU2: '#f59e0b', // 橙色 - 汽车零部件清洗
  BU3: '#10b981', // 绿色 - 医疗器械清洗
  BU4: '#8b5cf6', // 紫色 - 精密光学清洗
  BU5: '#ef4444', // 红色 - 工业通用清洗
  default: '#6b7280',
};

const TASK_TYPE_COLORS: Record<string, string> = {
  machining: '#3b82f6',
  welding: '#f59e0b',
  assembly: '#10b981',
  debugging: '#8b5cf6',
  testing: '#ef4444',
};

// ==================== 甘特图组件 ====================

export function GanttChart({
  tasks,
  resources,
  startDate: propStartDate,
  endDate: propEndDate,
  onTaskClick,
  onResourceClick,
  viewMode: initialViewMode = 'day',
  showDependencies = true,
  showProgress = true,
  height = 600,
}: GanttChartProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>(initialViewMode);
  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectedBU, setSelectedBU] = useState<string>('all');
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 计算日期范围
  const { startDate, endDate, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        startDate: startOfDay(today),
        endDate: addDays(today, 30),
        totalDays: 30,
      };
    }

    const taskDates = tasks.flatMap(t => [new Date(t.start), new Date(t.end)]);
    const minDate = propStartDate || new Date(Math.min(...taskDates.map(d => d.getTime())));
    const maxDate = propEndDate || new Date(Math.max(...taskDates.map(d => d.getTime())));
    
    // 添加前后缓冲
    const start = startOfDay(addDays(minDate, -2));
    const end = endOfDay(addDays(maxDate, 5));
    
    return {
      startDate: start,
      endDate: end,
      totalDays: differenceInDays(end, start) + 1,
    };
  }, [tasks, propStartDate, propEndDate]);

  // 过滤任务
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (selectedBU !== 'all' && task.bu !== selectedBU) return false;
      if (selectedResource !== 'all' && task.resourceId !== selectedResource) return false;
      return true;
    });
  }, [tasks, selectedBU, selectedResource]);

  // 获取所有BU
  const allBUs = useMemo(() => {
    const bus = new Set(tasks.map(t => t.bu));
    return Array.from(bus).sort();
  }, [tasks]);

  // 计算尺寸
  const HEADER_HEIGHT = 60;
  const ROW_HEIGHT = 40;
  const TASK_HEIGHT = 28;
  const LEFT_PANEL_WIDTH = 200;
  const DAY_WIDTH = viewMode === 'day' ? 60 * zoom : viewMode === 'week' ? 20 * zoom : 8 * zoom;
  const CHART_WIDTH = totalDays * DAY_WIDTH;

  // 生成日期列
  const dateColumns = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  // 计算任务位置
  const getTaskPosition = (task: GanttTask, rowIndex: number) => {
    const taskStart = new Date(task.start);
    const taskEnd = new Date(task.end);
    const startOffset = differenceInDays(taskStart, startDate);
    const duration = differenceInDays(taskEnd, taskStart) + 1;
    
    return {
      x: startOffset * DAY_WIDTH,
      y: HEADER_HEIGHT + rowIndex * ROW_HEIGHT + (ROW_HEIGHT - TASK_HEIGHT) / 2,
      width: Math.max(duration * DAY_WIDTH - 4, 20),
      height: TASK_HEIGHT,
    };
  };

  // 获取任务颜色
  const getTaskColor = (task: GanttTask) => {
    if (task.color) return task.color;
    return BU_COLORS[task.bu] || TASK_TYPE_COLORS[task.taskType] || BU_COLORS.default;
  };

  // 绘制依赖线
  const renderDependencies = () => {
    if (!showDependencies) return null;

    const lines: React.JSX.Element[] = [];
    
    filteredTasks.forEach((task, taskIndex) => {
      task.dependencies.forEach(depId => {
        const depIndex = filteredTasks.findIndex(t => t.id === depId);
        if (depIndex === -1) return;

        const depTask = filteredTasks[depIndex];
        const fromPos = getTaskPosition(depTask, depIndex);
        const toPos = getTaskPosition(task, taskIndex);

        const fromX = fromPos.x + fromPos.width;
        const fromY = fromPos.y + fromPos.height / 2;
        const toX = toPos.x;
        const toY = toPos.y + toPos.height / 2;

        const midX = (fromX + toX) / 2;

        lines.push(
          <g key={`dep-${depId}-${task.id}`}>
            <path
              d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="4,2"
              markerEnd="url(#arrowhead)"
            />
          </g>
        );
      });
    });

    return lines;
  };

  // 导出为图片
  const handleExport = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `gantt-chart-${format(new Date(), 'yyyy-MM-dd')}.svg`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">排程甘特图</CardTitle>
          <div className="flex items-center gap-2">
            {/* 过滤器 */}
            <Select value={selectedBU} onValueChange={setSelectedBU}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="选择BU" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部BU</SelectItem>
                {allBUs.map(bu => (
                  <SelectItem key={bu} value={bu}>{bu}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedResource} onValueChange={setSelectedResource}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="选择资源" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部资源</SelectItem>
                {resources.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 视图模式 */}
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">日视图</SelectItem>
                <SelectItem value="week">周视图</SelectItem>
                <SelectItem value="month">月视图</SelectItem>
              </SelectContent>
            </Select>

            {/* 缩放控制 */}
            <div className="flex items-center gap-1 border rounded-md">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setZoom(z => Math.min(2, z + 0.25))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* 导出 */}
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              导出
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div 
          ref={containerRef}
          className="overflow-auto border-t"
          style={{ height: `${height}px` }}
        >
          <div className="flex">
            {/* 左侧任务列表 */}
            <div 
              className="flex-shrink-0 bg-muted/30 border-r"
              style={{ width: LEFT_PANEL_WIDTH }}
            >
              {/* 表头 */}
              <div 
                className="flex items-center px-3 border-b bg-muted font-medium text-sm"
                style={{ height: HEADER_HEIGHT }}
              >
                任务名称
              </div>
              
              {/* 任务行 */}
              {filteredTasks.map((task, index) => (
                <div
                  key={task.id}
                  className="flex items-center px-3 border-b hover:bg-muted/50 cursor-pointer"
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getTaskColor(task) }}
                    />
                    <span className="text-sm truncate">{task.name}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 右侧甘特图区域 */}
            <div className="flex-1 overflow-x-auto">
              <svg
                ref={svgRef}
                width={CHART_WIDTH}
                height={HEADER_HEIGHT + filteredTasks.length * ROW_HEIGHT}
                className="block"
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
                    <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                  </marker>
                </defs>

                {/* 日期表头 */}
                <g className="date-header">
                  <rect
                    x={0}
                    y={0}
                    width={CHART_WIDTH}
                    height={HEADER_HEIGHT}
                    fill="hsl(var(--muted))"
                  />
                  
                  {dateColumns.map((date, index) => {
                    const x = index * DAY_WIDTH;
                    const isWeekendDay = isWeekend(date);
                    
                    return (
                      <g key={date.toISOString()}>
                        {/* 日期背景 */}
                        {isWeekendDay && (
                          <rect
                            x={x}
                            y={HEADER_HEIGHT}
                            width={DAY_WIDTH}
                            height={filteredTasks.length * ROW_HEIGHT}
                            fill="hsl(var(--muted) / 0.5)"
                          />
                        )}
                        
                        {/* 日期文字 */}
                        {viewMode === 'day' && (
                          <>
                            <text
                              x={x + DAY_WIDTH / 2}
                              y={20}
                              textAnchor="middle"
                              className="text-[10px] fill-muted-foreground"
                            >
                              {format(date, 'M/d', { locale: zhCN })}
                            </text>
                            <text
                              x={x + DAY_WIDTH / 2}
                              y={38}
                              textAnchor="middle"
                              className="text-[10px] fill-muted-foreground"
                            >
                              {format(date, 'EEE', { locale: zhCN })}
                            </text>
                          </>
                        )}
                        
                        {/* 垂直分隔线 */}
                        <line
                          x1={x}
                          y1={0}
                          x2={x}
                          y2={HEADER_HEIGHT + filteredTasks.length * ROW_HEIGHT}
                          stroke="hsl(var(--border))"
                          strokeWidth={0.5}
                        />
                      </g>
                    );
                  })}
                </g>

                {/* 水平分隔线 */}
                {filteredTasks.map((_, index) => (
                  <line
                    key={`hline-${index}`}
                    x1={0}
                    y1={HEADER_HEIGHT + (index + 1) * ROW_HEIGHT}
                    x2={CHART_WIDTH}
                    y2={HEADER_HEIGHT + (index + 1) * ROW_HEIGHT}
                    stroke="hsl(var(--border))"
                    strokeWidth={0.5}
                  />
                ))}

                {/* 依赖线 */}
                {renderDependencies()}

                {/* 任务条 */}
                <TooltipProvider>
                  {filteredTasks.map((task, index) => {
                    const pos = getTaskPosition(task, index);
                    const color = getTaskColor(task);
                    
                    return (
                      <Tooltip key={task.id}>
                        <TooltipTrigger asChild>
                          <g
                            className="cursor-pointer"
                            onClick={() => onTaskClick?.(task)}
                          >
                            {/* 任务背景 */}
                            <rect
                              x={pos.x}
                              y={pos.y}
                              width={pos.width}
                              height={pos.height}
                              rx={4}
                              fill={color}
                              opacity={0.2}
                            />
                            
                            {/* 进度条 */}
                            {showProgress && task.progress > 0 && (
                              <rect
                                x={pos.x}
                                y={pos.y}
                                width={pos.width * (task.progress / 100)}
                                height={pos.height}
                                rx={4}
                                fill={color}
                                opacity={0.6}
                              />
                            )}
                            
                            {/* 任务边框 */}
                            <rect
                              x={pos.x}
                              y={pos.y}
                              width={pos.width}
                              height={pos.height}
                              rx={4}
                              fill="none"
                              stroke={color}
                              strokeWidth={1.5}
                            />
                            
                            {/* 任务名称 */}
                            {pos.width > 60 && (
                              <text
                                x={pos.x + 8}
                                y={pos.y + pos.height / 2 + 4}
                                className="text-[11px] font-medium"
                                fill="hsl(var(--foreground))"
                              >
                                {task.name.length > 10 ? task.name.slice(0, 10) + '...' : task.name}
                              </text>
                            )}
                            
                            {/* 延迟标记 */}
                            {task.delayPenalty && task.delayPenalty > 0 && (
                              <circle
                                cx={pos.x + pos.width - 6}
                                cy={pos.y + 6}
                                r={4}
                                fill="#ef4444"
                              />
                            )}
                          </g>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-medium">{task.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(task.start), 'MM/dd HH:mm')} - {format(new Date(task.end), 'MM/dd HH:mm')}
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="text-[10px]">{task.bu}</Badge>
                              <Badge variant="secondary" className="text-[10px]">{task.resource}</Badge>
                            </div>
                            {showProgress && (
                              <p className="text-xs">进度: {task.progress}%</p>
                            )}
                            {task.delayPenalty && task.delayPenalty > 0 && (
                              <p className="text-xs text-red-500">延迟惩罚: {task.delayPenalty.toFixed(1)}</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>

                {/* 今日线 */}
                {(() => {
                  const today = new Date();
                  if (today >= startDate && today <= endDate) {
                    const todayOffset = differenceInDays(today, startDate);
                    const x = todayOffset * DAY_WIDTH + DAY_WIDTH / 2;
                    
                    return (
                      <g>
                        <line
                          x1={x}
                          y1={HEADER_HEIGHT}
                          x2={x}
                          y2={HEADER_HEIGHT + filteredTasks.length * ROW_HEIGHT}
                          stroke="#ef4444"
                          strokeWidth={2}
                          strokeDasharray="4,4"
                        />
                        <text
                          x={x}
                          y={HEADER_HEIGHT + 12}
                          textAnchor="middle"
                          className="text-[10px] fill-red-500 font-medium"
                        >
                          今日
                        </text>
                      </g>
                    );
                  }
                  return null;
                })()}
              </svg>
            </div>
          </div>
        </div>

        {/* 图例 */}
        <div className="flex items-center gap-4 p-3 border-t bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">图例:</span>
          {Object.entries(BU_COLORS).filter(([k]) => k !== 'default').map(([bu, color]) => (
            <div key={bu} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs">{bu}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 ml-4">
            <div className="w-4 h-0.5 bg-red-500" style={{ borderStyle: 'dashed' }} />
            <span className="text-xs">今日</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs">延迟</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default GanttChart;
