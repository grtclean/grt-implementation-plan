import { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// TSDCKL六大能力域定义
const CAPABILITY_DOMAINS = [
  { code: "T", name: "技术能力", fullName: "Technology", color: "#f97316" },
  { code: "S", name: "系统理解", fullName: "System Understanding", color: "#3b82f6" },
  { code: "D", name: "交付能力", fullName: "Delivery", color: "#22c55e" },
  { code: "C", name: "客户价值", fullName: "Customer Value", color: "#a855f7" },
  { code: "K", name: "知识沉淀", fullName: "Knowledge Precipitation", color: "#eab308" },
  { code: "L", name: "领导影响", fullName: "Leadership/Influence", color: "#ec4899" },
];

// 能力等级定义
const CAPABILITY_LEVELS = [
  { level: 1, name: "L1-初级", minPoints: 0, maxPoints: 100 },
  { level: 2, name: "L2-熟练", minPoints: 100, maxPoints: 300 },
  { level: 3, name: "L3-专业", minPoints: 300, maxPoints: 600 },
  { level: 4, name: "L4-专家", minPoints: 600, maxPoints: 1000 },
  { level: 5, name: "L5-大师", minPoints: 1000, maxPoints: Infinity },
];

interface CapabilityData {
  domainCode: string;
  points: number;
  level: number;
}

interface CapabilityRadarChartProps {
  data: CapabilityData[];
  userName?: string;
  showLegend?: boolean;
  height?: number;
  compact?: boolean; // 紧凑模式，用于移动端
}

// 将积分转换为0-100的百分比（用于雷达图显示）
function pointsToPercentage(points: number): number {
  // 使用1000分作为满分（L5门槛）
  const maxPoints = 1000;
  return Math.min((points / maxPoints) * 100, 100);
}

// 获取等级名称
function getLevelName(level: number): string {
  const levelInfo = CAPABILITY_LEVELS.find((l) => l.level === level);
  return levelInfo?.name || `L${level}`;
}

// 获取等级简称
function getLevelShortName(level: number): string {
  return `L${level}`;
}

export default function CapabilityRadarChart({
  data,
  userName = "当前用户",
  showLegend = true,
  height = 400,
  compact = false,
}: CapabilityRadarChartProps) {
  // 转换数据格式用于雷达图
  const chartData = useMemo(() => {
    return CAPABILITY_DOMAINS.map((domain) => {
      const capabilityData = data.find((d) => d.domainCode === domain.code);
      const points = capabilityData?.points || 0;
      const level = capabilityData?.level || 1;
      
      return {
        domain: domain.code,
        domainName: domain.name,
        fullName: domain.fullName,
        value: pointsToPercentage(points),
        points: points,
        level: level,
        levelName: getLevelName(level),
        levelShort: getLevelShortName(level),
        color: domain.color,
      };
    });
  }, [data]);

  // 计算综合能力等级
  const overallStats = useMemo(() => {
    const totalPoints = data.reduce((sum, d) => sum + d.points, 0);
    const avgPoints = data.length > 0 ? totalPoints / data.length : 0;
    const avgLevel = data.length > 0 
      ? data.reduce((sum, d) => sum + d.level, 0) / data.length 
      : 1;
    
    return {
      totalPoints,
      avgPoints: Math.round(avgPoints),
      avgLevel: avgLevel.toFixed(1),
    };
  }, [data]);

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-popover text-popover-foreground border border-border rounded-lg p-2 sm:p-3 shadow-lg max-w-[200px] sm:max-w-none">
          <p className="font-bold text-xs sm:text-sm">{item.domainName}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{item.fullName}</p>
          <div className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
            <p className="text-xs sm:text-sm">
              <span className="text-muted-foreground">积分：</span>
              <span className="font-medium">{item.points}</span>
            </p>
            <p className="text-xs sm:text-sm">
              <span className="text-muted-foreground">等级：</span>
              <span className="font-medium" style={{ color: item.color }}>
                {compact ? item.levelShort : item.levelName}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // 计算响应式高度
  const responsiveHeight = compact ? Math.min(height, 280) : height;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <span>能力雷达图</span>
          <span className="text-xs sm:text-sm font-normal text-muted-foreground">
            {userName}
          </span>
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <span>总积分: <span className="text-primary font-medium">{overallStats.totalPoints}</span></span>
          <span>平均等级: <span className="text-primary font-medium">L{overallStats.avgLevel}</span></span>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ResponsiveContainer width="100%" height={responsiveHeight}>
          <RadarChart 
            cx="50%" 
            cy="50%" 
            outerRadius={compact ? "70%" : "80%"} 
            data={chartData}
          >
            <PolarGrid 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.5}
            />
            <PolarAngleAxis
              dataKey="domain"
              tick={{ 
                fill: "hsl(var(--foreground))", 
                fontSize: compact ? 11 : 14,
                fontWeight: 600,
              }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ 
                fill: "hsl(var(--muted-foreground))", 
                fontSize: compact ? 8 : 10 
              }}
              tickCount={compact ? 4 : 6}
              axisLine={false}
            />
            <Radar
              name="能力值"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              strokeWidth={compact ? 1.5 : 2}
              dot={{
                r: compact ? 3 : 4,
                fill: "hsl(var(--primary))",
                stroke: "hsl(var(--background))",
                strokeWidth: compact ? 1.5 : 2,
              }}
              activeDot={{
                r: compact ? 4 : 6,
                fill: "hsl(var(--primary))",
                stroke: "hsl(var(--background))",
                strokeWidth: 2,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && !compact && (
              <Legend
                wrapperStyle={{
                  paddingTop: "20px",
                }}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>

        {/* 能力域图例 - 响应式网格 */}
        <div className={`mt-3 sm:mt-4 grid gap-1.5 sm:gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
          {chartData.map((item) => (
            <div
              key={item.domain}
              className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-md bg-secondary/30"
            >
              <div
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-medium truncate">
                  {item.domain} - {compact ? "" : item.domainName}
                  {compact && <span className="text-muted-foreground">{item.domainName.slice(0, 2)}</span>}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {compact ? item.levelShort : item.levelName} ({item.points})
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 导出能力域常量供其他组件使用
export { CAPABILITY_DOMAINS, CAPABILITY_LEVELS };
