/**
 * GRT-Atom 标定历史趋势分析图表组件
 * 可视化展示标定数据变化曲线
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Activity, Calendar, Target } from "lucide-react";
import { trpc } from "@/lib/trpc";

// 参数类型
type CalibrationParameterType = "pressure" | "flow" | "temperature" | "position" | "ultrasonic";

// 参数配置
const PARAMETER_CONFIG: Record<CalibrationParameterType, {
  name: string;
  unit: string;
  color: string;
  icon: string;
}> = {
  pressure: { name: "压力", unit: "MPa", color: "#3b82f6", icon: "⚡" },
  flow: { name: "流量", unit: "L/min", color: "#10b981", icon: "💧" },
  temperature: { name: "温度", unit: "°C", color: "#f59e0b", icon: "🌡️" },
  position: { name: "位置精度", unit: "mm", color: "#8b5cf6", icon: "📍" },
  ultrasonic: { name: "超声波功率", unit: "W", color: "#ec4899", icon: "🔊" },
};

interface CalibrationTrendChartProps {
  agentUnitId: number;
  serialNumber?: string;
}

export default function CalibrationTrendChart({ agentUnitId, serialNumber }: CalibrationTrendChartProps) {
  const [selectedParameter, setSelectedParameter] = useState<CalibrationParameterType>("pressure");
  
  const trendQuery = trpc.capabilityOs.getCalibrationTrend.useQuery({
    agentUnitId,
    parameterType: selectedParameter,
  });

  const trend = trendQuery.data as any;
  const config = PARAMETER_CONFIG[selectedParameter];

  // 计算图表数据
  const chartData = useMemo(() => {
    if (!trend?.dataPoints || trend.dataPoints.length === 0) {
      return { points: [], minY: 0, maxY: 100, normalRange: [0, 100] as [number, number] };
    }

    const values = trend.dataPoints.map((p: any) => p.value);
    const minY = Math.min(...values) * 0.9;
    const maxY = Math.max(...values) * 1.1;
    const normalRange = trend.parameterConfig?.normalRange || [minY, maxY];

    return {
      points: trend.dataPoints,
      minY,
      maxY,
      normalRange,
    };
  }, [trend]);

  // 渲染趋势图标
  const renderTrendIcon = () => {
    if (!trend?.statistics) return <Minus className="w-4 h-4" />;
    
    switch (trend.statistics.trend) {
      case "improving":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "degrading":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case "fluctuating":
        return <Activity className="w-4 h-4 text-yellow-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  // 渲染趋势标签
  const renderTrendBadge = () => {
    if (!trend?.statistics) return null;
    
    const trendLabels = {
      stable: { label: "稳定", variant: "secondary" as const },
      improving: { label: "改善中", variant: "default" as const },
      degrading: { label: "下降中", variant: "destructive" as const },
      fluctuating: { label: "波动", variant: "outline" as const },
    };
    
    const { label, variant } = (trendLabels as any)[trend.statistics.trend];
    return <Badge variant={variant}>{label}</Badge>;
  };

  // 渲染简易折线图
  const renderChart = () => {
    if (chartData.points.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-muted-foreground">
          暂无标定数据
        </div>
      );
    }

    const width = 600;
    const height = 200;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const { points, minY, maxY, normalRange } = chartData;
    const xScale = chartWidth / (points.length - 1 || 1);
    const yScale = chartHeight / (maxY - minY || 1);

    // 生成路径
    const pathData = points.map((point: any, i: any) => {
      const x = padding + i * xScale;
      const y = height - padding - (point.value - minY) * yScale;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");

    // 正常范围区域
    const normalY1 = height - padding - (normalRange[1] - minY) * yScale;
    const normalY2 = height - padding - (normalRange[0] - minY) * yScale;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* 正常范围背景 */}
        <rect
          x={padding}
          y={normalY1}
          width={chartWidth}
          height={normalY2 - normalY1}
          fill={config.color}
          fillOpacity={0.1}
        />
        
        {/* 网格线 */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={padding}
            y1={height - padding - chartHeight * ratio}
            x2={width - padding}
            y2={height - padding - chartHeight * ratio}
            stroke="currentColor"
            strokeOpacity={0.1}
          />
        ))}
        
        {/* 数据线 */}
        <path
          d={pathData}
          fill="none"
          stroke={config.color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* 数据点 */}
        {points.map((point: any, i: any) => {
          const x = padding + i * xScale;
          const y = height - padding - (point.value - minY) * yScale;
          const pointColor = point.status === "normal" ? config.color : 
                            point.status === "warning" ? "#f59e0b" : "#ef4444";
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={4}
              fill={pointColor}
              stroke="white"
              strokeWidth={2}
            />
          );
        })}
        
        {/* Y轴标签 */}
        <text x={padding - 5} y={height - padding} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.5}>
          {minY.toFixed(1)}
        </text>
        <text x={padding - 5} y={padding} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.5}>
          {maxY.toFixed(1)}
        </text>
        
        {/* 单位标签 */}
        <text x={padding - 5} y={padding - 10} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.5}>
          {config.unit}
        </text>
      </svg>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              标定历史趋势分析
            </CardTitle>
            <CardDescription>
              {serialNumber ? `SN: ${serialNumber}` : `智能体单体 #${agentUnitId}`}
            </CardDescription>
          </div>
          <Select value={selectedParameter} onValueChange={(v) => setSelectedParameter(v as CalibrationParameterType)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PARAMETER_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.icon} {cfg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart" className="space-y-4">
          <TabsList>
            <TabsTrigger value="chart">趋势图</TabsTrigger>
            <TabsTrigger value="statistics">统计数据</TabsTrigger>
            <TabsTrigger value="anomalies">异常检测</TabsTrigger>
            <TabsTrigger value="prediction">预测分析</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-4">
            <div className="border rounded-lg p-4">
              {renderChart()}
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                  <span>正常</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>警告</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>异常</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {renderTrendIcon()}
                {renderTrendBadge()}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="statistics">
            {trend?.statistics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">数据点数</p>
                  <p className="text-2xl font-bold">{trend.statistics.count}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">平均值</p>
                  <p className="text-2xl font-bold">{trend.statistics.average.toFixed(2)} {config.unit}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">最小值</p>
                  <p className="text-2xl font-bold">{trend.statistics.min.toFixed(2)} {config.unit}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">最大值</p>
                  <p className="text-2xl font-bold">{trend.statistics.max.toFixed(2)} {config.unit}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">标准差</p>
                  <p className="text-2xl font-bold">{trend.statistics.standardDeviation.toFixed(3)}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">趋势斜率</p>
                  <p className="text-2xl font-bold">{trend.statistics.trendSlope.toFixed(4)}</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="anomalies">
            {trend?.anomalies && trend.anomalies.length > 0 ? (
              <div className="space-y-2">
                {trend.anomalies.map((anomaly: any, i: any) => (
                  <Alert key={i} variant={anomaly.severity === "high" ? "destructive" : "default"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="flex items-center gap-2">
                      {new Date(anomaly.timestamp).toLocaleString()}
                      <Badge variant={
                        anomaly.severity === "high" ? "destructive" :
                        anomaly.severity === "medium" ? "default" : "secondary"
                      }>
                        {anomaly.severity === "high" ? "严重" :
                         anomaly.severity === "medium" ? "中等" : "轻微"}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription>
                      <p>测量值: {anomaly.value.toFixed(2)} {config.unit}</p>
                      <p>期望范围: {anomaly.expectedRange[0]} - {anomaly.expectedRange[1]} {config.unit}</p>
                      <p>偏差: {anomaly.deviation.toFixed(2)}</p>
                      <p className="text-muted-foreground mt-1">{anomaly.possibleCause}</p>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                未检测到异常
              </div>
            )}
          </TabsContent>

          <TabsContent value="prediction">
            {trend?.prediction ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">建议下次标定时间</span>
                    </div>
                    <p className="text-xl font-bold">
                      {new Date(trend.prediction.nextCalibrationDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">预测值</span>
                    </div>
                    <p className="text-xl font-bold">
                      {trend.prediction.predictedValue.toFixed(2)} {config.unit}
                    </p>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    置信度: {(trend.prediction.confidence * 100).toFixed(0)}%
                  </p>
                  <p className="font-medium">{trend.prediction.recommendation}</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                数据不足，无法进行预测分析（至少需要3个数据点）
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
