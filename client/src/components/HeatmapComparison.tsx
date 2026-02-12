import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle2,
  Download
} from "lucide-react";

// 类型定义
interface HeatmapDataPoint {
  x: number;
  y: number;
  z: number;
  pressure: number;
  intensity: number;
  action: string;
  timestamp: number;
}

interface CleaningTestRecord {
  id: string;
  testDate: Date;
  featureType: string;
  partNumber: string;
  projectId: string;
  engineerId: string;
  heatmapData: HeatmapDataPoint[];
  avgPressure: number;
  maxPressure: number;
  coveragePercentage: number;
  cleaningResult: "pass" | "fail" | "conditional";
  notes?: string;
}

interface ComparisonAnalysis {
  testIds: string[];
  testDates: Date[];
  pressureDifference: {
    avg: number;
    max: number;
    min: number;
  };
  coverageDifference: number;
  improvementTrend: "improving" | "declining" | "stable";
  hotspots: {
    x: number;
    y: number;
    intensityChange: number;
    description: string;
  }[];
  recommendations: string[];
}

type OverlayMode = "difference" | "average" | "max" | "timeline";

interface HeatmapComparisonProps {
  featureType: string;
  partNumber?: string;
  projectId?: string;
}

// 模拟数据
const mockRecords: CleaningTestRecord[] = [
  {
    id: "test-001",
    testDate: new Date("2024-01-15"),
    featureType: "blind_hole",
    partNumber: "GRT-2024-001",
    projectId: "proj-001",
    engineerId: "eng-001",
    heatmapData: generateMockHeatmapData(120),
    avgPressure: 115,
    maxPressure: 145,
    coveragePercentage: 85,
    cleaningResult: "pass",
    notes: "首次清洗试验",
  },
  {
    id: "test-002",
    testDate: new Date("2024-01-20"),
    featureType: "blind_hole",
    partNumber: "GRT-2024-001",
    projectId: "proj-001",
    engineerId: "eng-001",
    heatmapData: generateMockHeatmapData(130),
    avgPressure: 125,
    maxPressure: 150,
    coveragePercentage: 92,
    cleaningResult: "pass",
    notes: "优化喷嘴角度后",
  },
  {
    id: "test-003",
    testDate: new Date("2024-01-25"),
    featureType: "blind_hole",
    partNumber: "GRT-2024-001",
    projectId: "proj-001",
    engineerId: "eng-002",
    heatmapData: generateMockHeatmapData(135),
    avgPressure: 130,
    maxPressure: 148,
    coveragePercentage: 95,
    cleaningResult: "pass",
    notes: "最终验证",
  },
];

function generateMockHeatmapData(basePressure: number): HeatmapDataPoint[] {
  const points: HeatmapDataPoint[] = [];
  const actions = ["high_pressure_spray", "pulsed_spray", "oscillating_nozzle", "targeted_flush"];

  for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * 100;
    const y = (Math.random() - 0.5) * 100;
    const z = Math.random() * 100;
    const pressure = basePressure + (Math.random() - 0.5) * 40;

    points.push({
      x,
      y,
      z,
      pressure,
      intensity: pressure / 150,
      action: actions[Math.floor(Math.random() * actions.length)],
      timestamp: Date.now() - Math.random() * 86400000,
    });
  }

  return points;
}

export default function HeatmapComparison({ featureType, partNumber, projectId }: HeatmapComparisonProps) {
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("difference");
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [showLabels, setShowLabels] = useState(true);

  // 过滤记录
  const filteredRecords = useMemo(() => {
    return mockRecords.filter(r => {
      if (featureType && r.featureType !== featureType) return false;
      if (partNumber && r.partNumber !== partNumber) return false;
      if (projectId && r.projectId !== projectId) return false;
      return true;
    });
  }, [featureType, partNumber, projectId]);

  // 选中的记录
  const selectedRecords = useMemo(() => {
    return filteredRecords.filter(r => selectedTests.includes(r.id));
  }, [filteredRecords, selectedTests]);

  // 分析结果
  const analysis = useMemo((): ComparisonAnalysis => {
    if (selectedRecords.length < 2) {
      return {
        testIds: selectedRecords.map(r => r.id),
        testDates: selectedRecords.map(r => r.testDate),
        pressureDifference: { avg: 0, max: 0, min: 0 },
        coverageDifference: 0,
        improvementTrend: "stable",
        hotspots: [],
        recommendations: ["请选择至少两次试验进行对比分析"],
      };
    }

    const sorted = [...selectedRecords].sort((a, b) => a.testDate.getTime() - b.testDate.getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const pressureDifference = {
      avg: last.avgPressure - first.avgPressure,
      max: last.maxPressure - first.maxPressure,
      min: Math.min(...sorted.map(r => r.avgPressure)) - first.avgPressure,
    };

    const coverageDifference = last.coveragePercentage - first.coveragePercentage;

    let improvementTrend: "improving" | "declining" | "stable";
    if (coverageDifference > 5) {
      improvementTrend = "improving";
    } else if (coverageDifference < -5) {
      improvementTrend = "declining";
    } else {
      improvementTrend = "stable";
    }

    const hotspots = [
      { x: 10, y: 15, intensityChange: 0.25, description: "清洗强度增加 25%" },
      { x: -20, y: 5, intensityChange: -0.15, description: "清洗强度降低 15%" },
      { x: 30, y: -10, intensityChange: 0.18, description: "清洗强度增加 18%" },
    ];

    const recommendations: string[] = [];
    if (improvementTrend === "improving") {
      recommendations.push("✅ 清洗效果持续改善，建议记录当前参数作为标准配置");
    } else if (improvementTrend === "declining") {
      recommendations.push("⚠️ 清洗效果下降，建议检查喷嘴状态和清洗液浓度");
    } else {
      recommendations.push("📊 清洗效果稳定，可继续使用当前参数");
    }

    return {
      testIds: sorted.map(r => r.id),
      testDates: sorted.map(r => r.testDate),
      pressureDifference,
      coverageDifference,
      improvementTrend,
      hotspots,
      recommendations,
    };
  }, [selectedRecords]);

  // 切换选择
  const toggleTestSelection = (testId: string) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedTests.length === filteredRecords.length) {
      setSelectedTests([]);
    } else {
      setSelectedTests(filteredRecords.map(r => r.id));
    }
  };

  // 获取趋势图标
  const getTrendIcon = () => {
    switch (analysis.improvementTrend) {
      case "improving":
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "declining":
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-yellow-500" />;
    }
  };

  // 获取结果颜色
  const getResultColor = (result: string) => {
    switch (result) {
      case "pass":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case "fail":
        return "bg-red-500/20 text-red-500 border-red-500/30";
      case "conditional":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      default:
        return "bg-muted";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          热力图历史对比
        </CardTitle>
        <CardDescription>
          选择多次清洗试验进行效果对比分析
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="select">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="select">选择试验</TabsTrigger>
            <TabsTrigger value="compare">对比分析</TabsTrigger>
            <TabsTrigger value="overlay">叠加设置</TabsTrigger>
          </TabsList>

          {/* 选择试验 */}
          <TabsContent value="select" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>可用试验记录 ({filteredRecords.length})</Label>
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedTests.length === filteredRecords.length ? "取消全选" : "全选"}
              </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredRecords.map(record => (
                <div
                  key={record.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTests.includes(record.id) 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => toggleTestSelection(record.id)}
                >
                  <Checkbox 
                    checked={selectedTests.includes(record.id)}
                    onCheckedChange={() => toggleTestSelection(record.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {record.testDate.toLocaleDateString()}
                      </span>
                      <Badge variant="outline" className={getResultColor(record.cleaningResult)}>
                        {record.cleaningResult === "pass" ? "通过" : 
                         record.cleaningResult === "fail" ? "失败" : "有条件通过"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>压力: {record.avgPressure} bar</span>
                      <span>覆盖率: {record.coveragePercentage}%</span>
                    </div>
                    {record.notes && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {record.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-sm text-muted-foreground">
              已选择 {selectedTests.length} 个试验
            </div>
          </TabsContent>

          {/* 对比分析 */}
          <TabsContent value="compare" className="space-y-4">
            {selectedRecords.length < 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>请选择至少两次试验进行对比分析</p>
              </div>
            ) : (
              <>
                {/* 趋势概览 */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  {getTrendIcon()}
                  <div>
                    <p className="font-medium">
                      整体趋势: {
                        analysis.improvementTrend === "improving" ? "持续改善" :
                        analysis.improvementTrend === "declining" ? "效果下降" : "保持稳定"
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      对比 {selectedRecords.length} 次试验，时间跨度 {
                        Math.ceil((analysis.testDates[analysis.testDates.length - 1].getTime() - 
                                   analysis.testDates[0].getTime()) / 86400000)
                      } 天
                    </p>
                  </div>
                </div>

                {/* 关键指标 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <BarChart3 className="h-4 w-4" />
                      压力变化
                    </div>
                    <p className="text-2xl font-bold">
                      {analysis.pressureDifference.avg > 0 ? "+" : ""}
                      {analysis.pressureDifference.avg.toFixed(1)} bar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      最大: {analysis.pressureDifference.max > 0 ? "+" : ""}
                      {analysis.pressureDifference.max.toFixed(1)} bar
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Target className="h-4 w-4" />
                      覆盖率变化
                    </div>
                    <p className="text-2xl font-bold">
                      {analysis.coverageDifference > 0 ? "+" : ""}
                      {analysis.coverageDifference.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      当前: {selectedRecords[selectedRecords.length - 1]?.coveragePercentage}%
                    </p>
                  </div>
                </div>

                {/* 热点区域 */}
                {analysis.hotspots.length > 0 && (
                  <div className="space-y-2">
                    <Label>变化热点区域</Label>
                    <div className="space-y-2">
                      {analysis.hotspots.map((hotspot, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-3 p-2 rounded border text-sm"
                        >
                          <div className={`w-3 h-3 rounded-full ${
                            hotspot.intensityChange > 0 ? "bg-green-500" : "bg-red-500"
                          }`} />
                          <span className="flex-1">{hotspot.description}</span>
                          <span className="text-muted-foreground">
                            ({hotspot.x.toFixed(0)}, {hotspot.y.toFixed(0)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 建议 */}
                <div className="space-y-2">
                  <Label>优化建议</Label>
                  <div className="space-y-2">
                    {analysis.recommendations.map((rec, index) => (
                      <div 
                        key={index}
                        className="flex items-start gap-2 p-2 rounded bg-muted/50 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 导出按钮 */}
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  导出对比报告
                </Button>
              </>
            )}
          </TabsContent>

          {/* 叠加设置 */}
          <TabsContent value="overlay" className="space-y-4">
            <div className="space-y-2">
              <Label>叠加模式</Label>
              <Select value={overlayMode} onValueChange={(v) => setOverlayMode(v as OverlayMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="difference">差异对比 (最新 - 最早)</SelectItem>
                  <SelectItem value="average">平均值叠加</SelectItem>
                  <SelectItem value="max">最大值叠加</SelectItem>
                  <SelectItem value="timeline">时间线动画</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {overlayMode === "difference" && "显示最新试验与最早试验的差异，绿色表示改善，红色表示下降"}
                {overlayMode === "average" && "显示所有选中试验的平均清洗效果"}
                {overlayMode === "max" && "显示每个位置的最大清洗强度"}
                {overlayMode === "timeline" && "按时间顺序播放清洗效果变化"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>叠加透明度</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[overlayOpacity]}
                  onValueChange={([v]) => setOverlayOpacity(v)}
                  min={0.1}
                  max={1}
                  step={0.1}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-12">
                  {(overlayOpacity * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox 
                id="showLabels"
                checked={showLabels}
                onCheckedChange={(checked) => setShowLabels(checked as boolean)}
              />
              <Label htmlFor="showLabels" className="cursor-pointer">
                显示数值标签
              </Label>
            </div>

            {/* 颜色图例 */}
            <div className="p-4 rounded-lg border space-y-3">
              <Label>颜色图例</Label>
              {overlayMode === "difference" ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span className="text-sm">效果改善</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-500" />
                    <span className="text-sm">无变化</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500" />
                    <span className="text-sm">效果下降</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span className="text-sm">低强度</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-500" />
                    <span className="text-sm">中强度</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500" />
                    <span className="text-sm">高强度</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
