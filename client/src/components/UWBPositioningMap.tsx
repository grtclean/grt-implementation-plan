/**
 * GRT-Atom UWB定位系统车间地图组件
 * 实时显示智能体单体在车间内的位置
 */

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, Radio, Battery, BatteryLow, BatteryWarning, 
  RefreshCw, Maximize2, ZoomIn, ZoomOut, History 
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// 车间区域配置
const WORKSHOP_ZONES = [
  { id: "zone-assembly", name: "装配区", type: "assembly", color: "#3b82f6", bounds: { minX: 0, maxX: 20, minY: 0, maxY: 15 } },
  { id: "zone-calibration", name: "标定区", type: "calibration", color: "#10b981", bounds: { minX: 20, maxX: 40, minY: 0, maxY: 15 } },
  { id: "zone-testing", name: "测试区", type: "testing", color: "#f59e0b", bounds: { minX: 40, maxX: 60, minY: 0, maxY: 15 } },
  { id: "zone-storage", name: "暂存区", type: "storage", color: "#8b5cf6", bounds: { minX: 0, maxX: 30, minY: 15, maxY: 25 } },
  { id: "zone-shipping", name: "发货区", type: "shipping", color: "#ec4899", bounds: { minX: 30, maxX: 60, minY: 15, maxY: 25 } },
];

// UWB基站位置
const UWB_ANCHORS = [
  { id: "anchor-1", name: "A1", position: { x: 0, y: 0 } },
  { id: "anchor-2", name: "A2", position: { x: 60, y: 0 } },
  { id: "anchor-3", name: "A3", position: { x: 0, y: 25 } },
  { id: "anchor-4", name: "A4", position: { x: 60, y: 25 } },
  { id: "anchor-5", name: "A5", position: { x: 30, y: 12.5 } },
];

interface UWBPositioningMapProps {
  selectedAgentUnitId?: number;
  onSelectAgentUnit?: (id: number) => void;
}

export default function UWBPositioningMap({ selectedAgentUnitId, onSelectAgentUnit }: UWBPositioningMapProps) {
  const [zoom, setZoom] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 获取车间概览数据
  const overviewQuery = trpc.capabilityOs.getWorkshopOverview.useQuery(undefined, {
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // 获取所有UWB标签
  const tagsQuery = trpc.capabilityOs.getAllUWBTags.useQuery(undefined, {
    refetchInterval: autoRefresh ? 3000 : false,
  });

  // 获取选中单体的位置历史
  const historyQuery = trpc.capabilityOs.getPositionHistory.useQuery(
    { agentUnitId: selectedAgentUnitId || 0, limit: 100 },
    { enabled: !!selectedAgentUnitId && showHistory }
  );

  const overview = overviewQuery.data;
  const tags: any[] = tagsQuery.data || [];

  // 地图尺寸
  const mapWidth = 600;
  const mapHeight = 250;
  const scale = mapWidth / 60; // 60米宽度

  // 渲染电池图标
  const renderBatteryIcon = (level: number) => {
    if (level < 20) return <BatteryLow className="w-4 h-4 text-red-500" />;
    if (level < 50) return <BatteryWarning className="w-4 h-4 text-yellow-500" />;
    return <Battery className="w-4 h-4 text-green-500" />;
  };

  // 渲染状态徽章
  const renderStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      online: "default",
      offline: "secondary",
      low_battery: "outline",
      error: "destructive",
    };
    const labels: Record<string, string> = {
      online: "在线",
      offline: "离线",
      low_battery: "低电量",
      error: "异常",
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  // 渲染车间地图
  const renderMap = () => {
    return (
      <svg 
        width="100%" 
        height={mapHeight * zoom} 
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        className="border rounded-lg bg-slate-50 dark:bg-slate-900"
      >
        {/* 网格 */}
        {Array.from({ length: 13 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={i * 5 * scale}
            y1={0}
            x2={i * 5 * scale}
            y2={mapHeight}
            stroke="currentColor"
            strokeOpacity={0.1}
          />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={0}
            y1={i * 5 * scale}
            x2={mapWidth}
            y2={i * 5 * scale}
            stroke="currentColor"
            strokeOpacity={0.1}
          />
        ))}

        {/* 区域 */}
        {WORKSHOP_ZONES.map(zone => (
          <g key={zone.id}>
            <rect
              x={zone.bounds.minX * scale}
              y={zone.bounds.minY * scale}
              width={(zone.bounds.maxX - zone.bounds.minX) * scale}
              height={(zone.bounds.maxY - zone.bounds.minY) * scale}
              fill={zone.color}
              fillOpacity={0.15}
              stroke={zone.color}
              strokeWidth={2}
              rx={4}
            />
            <text
              x={(zone.bounds.minX + (zone.bounds.maxX - zone.bounds.minX) / 2) * scale}
              y={(zone.bounds.minY + 2) * scale}
              textAnchor="middle"
              fontSize={12}
              fill={zone.color}
              fontWeight="bold"
            >
              {zone.name}
            </text>
          </g>
        ))}

        {/* UWB基站 */}
        {UWB_ANCHORS.map(anchor => (
          <g key={anchor.id}>
            <circle
              cx={anchor.position.x * scale}
              cy={anchor.position.y * scale}
              r={8}
              fill="#6366f1"
              stroke="white"
              strokeWidth={2}
            />
            <text
              x={anchor.position.x * scale}
              y={anchor.position.y * scale + 4}
              textAnchor="middle"
              fontSize={8}
              fill="white"
              fontWeight="bold"
            >
              {anchor.name}
            </text>
          </g>
        ))}

        {/* 位置历史轨迹 */}
        {showHistory && historyQuery.data && historyQuery.data.length > 1 && (
          <polyline
            points={historyQuery.data.map((p: any) => `${p.position.x * scale},${p.position.y * scale}`).join(" ")}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="4,4"
            strokeOpacity={0.7}
          />
        )}

        {/* 智能体单体位置 */}
        {tags.filter(t => t.lastPosition).map(tag => {
          const isSelected = tag.agentUnitId === selectedAgentUnitId;
          const x = tag.lastPosition!.x * scale;
          const y = tag.lastPosition!.y * scale;
          
          return (
            <g 
              key={tag.tagId} 
              onClick={() => tag.agentUnitId && onSelectAgentUnit?.(tag.agentUnitId)}
              style={{ cursor: "pointer" }}
            >
              {/* 选中高亮 */}
              {isSelected && (
                <circle
                  cx={x}
                  cy={y}
                  r={16}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  strokeDasharray="4,4"
                >
                  <animate
                    attributeName="r"
                    values="12;18;12"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              
              {/* 标签点 */}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 10 : 8}
                fill={tag.status === "online" ? "#10b981" : "#ef4444"}
                stroke="white"
                strokeWidth={2}
              />
              
              {/* SN码标签 */}
              <text
                x={x}
                y={y - 14}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                fontWeight={isSelected ? "bold" : "normal"}
              >
                {tag.serialNumber || tag.tagId}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5" />
              UWB实时定位地图
            </CardTitle>
            <CardDescription>
              车间智能体单体实时位置追踪
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className={showHistory ? "bg-accent" : ""}
            >
              <History className="w-4 h-4 mr-1" />
              轨迹
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-accent" : ""}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${autoRefresh ? "animate-spin" : ""}`} />
              自动刷新
            </Button>
            <Button variant="outline" size="icon" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setZoom(Math.min(2, zoom + 0.25))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="map" className="space-y-4">
          <TabsList>
            <TabsTrigger value="map">地图视图</TabsTrigger>
            <TabsTrigger value="list">列表视图</TabsTrigger>
            <TabsTrigger value="stats">统计概览</TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4">
            <div className="overflow-auto">
              {renderMap()}
            </div>
            
            {/* 图例 */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#6366f1]" />
                <span>UWB基站</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                <span>在线单体</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                <span>离线单体</span>
              </div>
              {WORKSHOP_ZONES.map(zone => (
                <div key={zone.id} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: zone.color }} />
                  <span>{zone.name}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="list">
            <div className="space-y-2 max-h-96 overflow-auto">
              {tags.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  暂无UWB标签数据
                </div>
              ) : (
                tags.map(tag => (
                  <div
                    key={tag.tagId}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      tag.agentUnitId === selectedAgentUnitId ? "border-primary bg-accent" : "hover:bg-accent/50"
                    }`}
                    onClick={() => tag.agentUnitId && onSelectAgentUnit?.(tag.agentUnitId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className={`w-5 h-5 ${tag.status === "online" ? "text-green-500" : "text-red-500"}`} />
                        <div>
                          <p className="font-medium">{tag.serialNumber || tag.tagId}</p>
                          <p className="text-sm text-muted-foreground">
                            标签ID: {tag.tagId}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {renderBatteryIcon(tag.batteryLevel)}
                        <span className="text-sm">{tag.batteryLevel}%</span>
                        {renderStatusBadge(tag.status)}
                      </div>
                    </div>
                    {tag.lastPosition && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        位置: ({tag.lastPosition.x.toFixed(2)}, {tag.lastPosition.y.toFixed(2)}, {tag.lastPosition.z.toFixed(2)}) m
                        {tag.lastUpdateTime && (
                          <span className="ml-2">
                            更新于 {new Date(tag.lastUpdateTime).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="stats">
            {overview && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">总标签数</p>
                    <p className="text-2xl font-bold">{(overview as any).totalTags}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">在线</p>
                    <p className="text-2xl font-bold text-green-500">{(overview as any).onlineTags}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">离线</p>
                    <p className="text-2xl font-bold text-red-500">{(overview as any).offlineTags}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">低电量</p>
                    <p className="text-2xl font-bold text-yellow-500">{(overview as any).lowBatteryTags}</p>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">区域分布</h4>
                  <div className="space-y-2">
                    {(overview as any).zoneDistribution.map(({ zone, count }: any) => (
                      <div key={zone.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: zone.color }} />
                          <span>{zone.name}</span>
                        </div>
                        <Badge variant="secondary">{count} 个</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {(overview as any).recentMovements.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">最近移动</h4>
                    <div className="space-y-2 max-h-48 overflow-auto">
                      {(overview as any).recentMovements.map((movement: any, i: any) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{movement.serialNumber}</span>
                          <span className="text-muted-foreground">
                            → {movement.toZone || "未知区域"}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(movement.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
