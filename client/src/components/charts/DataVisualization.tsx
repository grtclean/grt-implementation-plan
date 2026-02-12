/**
 * 数据可视化图表组件库 - 趋势图、分布图、热力图、实时仪表盘
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

// 趋势图组件
interface TrendChartProps {
  title: string;
  data: { label: string; value: number }[];
  color?: string;
  showTrend?: boolean;
}

export function TrendChart({ title, data, color = "#f97316", showTrend = true }: TrendChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  
  const trend = data.length >= 2 
    ? ((data[data.length - 1].value - data[data.length - 2].value) / data[data.length - 2].value * 100).toFixed(1)
    : "0";
  const isPositive = parseFloat(trend) >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {showTrend && (
            <Badge className={isPositive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
              {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {trend}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-32 flex items-end gap-1">
          {data.map((item, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div 
                className="w-full rounded-t transition-all hover:opacity-80"
                style={{ 
                  height: `${((item.value - minValue) / range) * 100}%`,
                  backgroundColor: color,
                  minHeight: "4px"
                }}
              />
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 分布图组件（饼图/环形图）
interface DistributionChartProps {
  title: string;
  data: { label: string; value: number; color: string }[];
  type?: "pie" | "donut";
}

export function DistributionChart({ title, data, type = "donut" }: DistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {data.map((item, idx) => {
                const angle = (item.value / total) * 360;
                const startAngle = currentAngle;
                currentAngle += angle;
                
                const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
                const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);
                const largeArc = angle > 180 ? 1 : 0;

                return (
                  <path
                    key={idx}
                    d={type === "donut" 
                      ? `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`
                      : `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`
                    }
                    fill={item.color}
                    className="hover:opacity-80 transition-opacity"
                  />
                );
              })}
              {type === "donut" && (
                <circle cx="50" cy="50" r="25" fill="hsl(var(--card))" />
              )}
            </svg>
            {type === "donut" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{total}</span>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            {data.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
                <span className="font-medium">{((item.value / total) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 热力图组件
interface HeatmapProps {
  title: string;
  data: { x: string; y: string; value: number }[];
  xLabels: string[];
  yLabels: string[];
}

export function Heatmap({ title, data, xLabels, yLabels }: HeatmapProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  const getValue = (x: string, y: string) => {
    const item = data.find(d => d.x === x && d.y === y);
    return item?.value || 0;
  };

  const getColor = (value: number) => {
    const intensity = value / maxValue;
    return `rgba(249, 115, 22, ${intensity})`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block">
            <div className="flex">
              <div className="w-16" />
              {xLabels.map((label, idx) => (
                <div key={idx} className="w-10 text-center text-[10px] text-muted-foreground pb-1">
                  {label}
                </div>
              ))}
            </div>
            {yLabels.map((yLabel, yIdx) => (
              <div key={yIdx} className="flex items-center">
                <div className="w-16 text-[10px] text-muted-foreground pr-2 text-right">
                  {yLabel}
                </div>
                {xLabels.map((xLabel, xIdx) => {
                  const value = getValue(xLabel, yLabel);
                  return (
                    <div
                      key={xIdx}
                      className="w-10 h-8 border border-border/50 flex items-center justify-center text-[10px] font-medium"
                      style={{ backgroundColor: getColor(value) }}
                      title={`${yLabel} ${xLabel}: ${value}`}
                    >
                      {value > 0 ? value : ""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 实时仪表盘组件
interface GaugeProps {
  title: string;
  value: number;
  max: number;
  unit?: string;
  thresholds?: { warning: number; danger: number };
}

export function Gauge({ title, value, max, unit = "", thresholds }: GaugeProps) {
  const percentage = (value / max) * 100;
  const angle = (percentage / 100) * 180 - 90;
  
  const getColor = () => {
    if (thresholds) {
      if (percentage >= thresholds.danger) return "#ef4444";
      if (percentage >= thresholds.warning) return "#f59e0b";
    }
    return "#22c55e";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-32 h-16 mx-auto overflow-hidden">
          <div className="absolute inset-0 border-8 border-muted rounded-t-full" />
          <div 
            className="absolute inset-0 border-8 rounded-t-full transition-all duration-500"
            style={{ 
              borderColor: getColor(),
              clipPath: `polygon(0 100%, 0 0, ${percentage}% 0, ${percentage}% 100%)`
            }}
          />
          <div 
            className="absolute bottom-0 left-1/2 w-1 h-12 bg-foreground origin-bottom transition-transform duration-500"
            style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
          />
        </div>
        <div className="text-center mt-2">
          <span className="text-2xl font-bold" style={{ color: getColor() }}>{value}</span>
          <span className="text-sm text-muted-foreground">/{max}{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// 实时数据卡片
interface LiveDataCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  status?: "normal" | "warning" | "danger";
}

export function LiveDataCard({ title, value, change, icon, status = "normal" }: LiveDataCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [value]);

  const statusColors = {
    normal: "text-green-400",
    warning: "text-yellow-400",
    danger: "text-red-400",
  };

  return (
    <Card className={`transition-all ${isAnimating ? "ring-2 ring-primary/50" : ""}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${statusColors[status]}`}>{value}</p>
            {change !== undefined && (
              <p className={`text-xs flex items-center gap-1 ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
                {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(change)}%
              </p>
            )}
          </div>
          {icon && <div className="text-primary/50">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// 导出所有组件
export default {
  TrendChart,
  DistributionChart,
  Heatmap,
  Gauge,
  LiveDataCard,
};
