/**
 * AI版本对比组件
 * 实现AIV0/V1/V2版本的并排对比视图
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Check,
  X,
  Minus,
  Plus,
  GitCompare,
  Sparkles,
  AlertTriangle,
  Clock,
  DollarSign,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// AI版本类型
export interface AIVersion {
  id: number;
  versionCode: string;
  versionName: string;
  description: string;
  features: string[];
  estimatedCost: number;
  estimatedDuration: string;
  riskLevel: "low" | "medium" | "high";
  recommendation: string;
  status: "draft" | "active" | "archived";
  createdAt: string;
  createdBy?: string;
  stages?: Record<string, StageData>;
}

// 阶段数据
interface StageData {
  milestone: string;
  duration: string;
  tasks: string[];
  deliverables: string[];
  resources: string[];
}

// 差异项
interface DiffItem {
  field: string;
  fieldLabel: string;
  v1Value: any;
  v2Value: any;
  changeType: "added" | "removed" | "modified" | "unchanged";
}

interface AIVersionCompareProps {
  versions: AIVersion[];
  onActivate?: (versionId: number) => void;
  onCompare?: (v1Id: number, v2Id: number) => void;
  projectId: number;
}

export default function AIVersionCompare({
  versions,
  onActivate,
  onCompare,
  projectId,
}: AIVersionCompareProps) {
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    features: true,
    stages: false,
    resources: false,
  });

  // 选择版本进行对比
  const toggleVersionSelection = (versionId: number) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), versionId];
      }
      return [...prev, versionId];
    });
  };

  // 获取选中的版本数据
  const selectedVersionData = useMemo(() => {
    return selectedVersions.map((id) => versions.find((v) => v.id === id)).filter(Boolean) as AIVersion[];
  }, [selectedVersions, versions]);

  // 计算差异
  const calculateDiffs = (v1: AIVersion, v2: AIVersion): DiffItem[] => {
    const diffs: DiffItem[] = [];

    // 比较基本字段
    const fields: { key: keyof AIVersion; label: string }[] = [
      { key: "estimatedCost", label: "预估成本" },
      { key: "estimatedDuration", label: "预估工期" },
      { key: "riskLevel", label: "风险等级" },
      { key: "recommendation", label: "推荐理由" },
    ];

    fields.forEach(({ key, label }) => {
      const v1Val = v1[key];
      const v2Val = v2[key];
      if (v1Val !== v2Val) {
        diffs.push({
          field: key,
          fieldLabel: label,
          v1Value: v1Val,
          v2Value: v2Val,
          changeType: "modified",
        });
      }
    });

    // 比较特性列表
    const v1Features = new Set(v1.features);
    const v2Features = new Set(v2.features);

    v2.features.forEach((feature) => {
      if (!v1Features.has(feature)) {
        diffs.push({
          field: "features",
          fieldLabel: "新增特性",
          v1Value: null,
          v2Value: feature,
          changeType: "added",
        });
      }
    });

    v1.features.forEach((feature) => {
      if (!v2Features.has(feature)) {
        diffs.push({
          field: "features",
          fieldLabel: "移除特性",
          v1Value: feature,
          v2Value: null,
          changeType: "removed",
        });
      }
    });

    return diffs;
  };

  // 获取风险等级颜色
  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "high":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-primary/10 text-primary border-primary/20";
      case "draft":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "archived":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  // 格式化金额
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 切换展开/折叠
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="space-y-6">
      {/* 版本卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {versions.map((version) => (
          <Card
            key={version.id}
            className={cn(
              "relative cursor-pointer transition-all duration-200 hover:shadow-lg",
              selectedVersions.includes(version.id)
                ? "ring-2 ring-primary border-primary"
                : "hover:border-primary/50"
            )}
            onClick={() => toggleVersionSelection(version.id)}
          >
            {/* 选中指示器 */}
            {selectedVersions.includes(version.id) && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
                {selectedVersions.indexOf(version.id) + 1}
              </div>
            )}

            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    {version.versionCode}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {version.versionName}
                  </p>
                </div>
                <Badge className={cn("text-xs", getStatusColor(version.status))}>
                  {version.status === "active" ? "当前激活" : version.status === "draft" ? "草稿" : "已归档"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {version.description}
              </p>

              {/* 关键指标 */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <DollarSign className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">预估成本</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(version.estimatedCost)}
                  </p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">预估工期</p>
                  <p className="text-sm font-semibold">{version.estimatedDuration}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <AlertTriangle className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">风险等级</p>
                  <Badge className={cn("text-xs mt-1", getRiskColor(version.riskLevel))}>
                    {version.riskLevel === "low" ? "低" : version.riskLevel === "medium" ? "中" : "高"}
                  </Badge>
                </div>
              </div>

              {/* 特性列表预览 */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">主要特性:</p>
                <div className="flex flex-wrap gap-1">
                  {version.features.slice(0, 3).map((feature, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                  {version.features.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{version.features.length - 3}
                    </Badge>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                {version.status !== "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onActivate?.(version.id);
                    }}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    激活
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    // 查看详情
                  }}
                >
                  查看详情
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 对比操作栏 */}
      {selectedVersions.length >= 2 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <GitCompare className="w-5 h-5 text-primary" />
                <span className="font-medium">
                  已选择 {selectedVersions.length} 个版本进行对比
                </span>
                <div className="flex items-center gap-2">
                  {selectedVersionData.map((v, idx) => (
                    <Badge key={v.id} variant="outline" className="bg-background">
                      {idx + 1}. {v.versionCode}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedVersions([])}>
                  清除选择
                </Button>
                <Button onClick={() => setShowCompareDialog(true)}>
                  <GitCompare className="w-4 h-4 mr-2" />
                  开始对比
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 对比对话框 */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="w-5 h-5" />
              AI版本对比
            </DialogTitle>
            <DialogDescription>
              对比 {selectedVersionData.map((v) => v.versionCode).join(" vs ")}
            </DialogDescription>
          </DialogHeader>

          {selectedVersionData.length >= 2 && (
            <Tabs defaultValue="side-by-side" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="side-by-side">并排对比</TabsTrigger>
                <TabsTrigger value="diff">差异视图</TabsTrigger>
              </TabsList>

              {/* 并排对比视图 */}
              <TabsContent value="side-by-side" className="space-y-4">
                {/* 基本信息对比 */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">基本信息</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">属性</TableHead>
                          {selectedVersionData.map((v) => (
                            <TableHead key={v.id}>{v.versionCode}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">版本名称</TableCell>
                          {selectedVersionData.map((v) => (
                            <TableCell key={v.id}>{v.versionName}</TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">预估成本</TableCell>
                          {selectedVersionData.map((v) => (
                            <TableCell key={v.id}>{formatCurrency(v.estimatedCost)}</TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">预估工期</TableCell>
                          {selectedVersionData.map((v) => (
                            <TableCell key={v.id}>{v.estimatedDuration}</TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">风险等级</TableCell>
                          {selectedVersionData.map((v) => (
                            <TableCell key={v.id}>
                              <Badge className={getRiskColor(v.riskLevel)}>
                                {v.riskLevel === "low" ? "低" : v.riskLevel === "medium" ? "中" : "高"}
                              </Badge>
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">状态</TableCell>
                          {selectedVersionData.map((v) => (
                            <TableCell key={v.id}>
                              <Badge className={getStatusColor(v.status)}>
                                {v.status === "active" ? "当前激活" : v.status === "draft" ? "草稿" : "已归档"}
                              </Badge>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* 特性对比 */}
                <Card>
                  <CardHeader
                    className="py-3 cursor-pointer"
                    onClick={() => toggleSection("features")}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">特性对比</CardTitle>
                      {expandedSections.features ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </CardHeader>
                  {expandedSections.features && (
                    <CardContent>
                      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedVersionData.length}, 1fr)` }}>
                        {selectedVersionData.map((v) => (
                          <div key={v.id} className="space-y-2">
                            <h4 className="font-medium text-sm">{v.versionCode}</h4>
                            <ul className="space-y-1">
                              {v.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* 推荐理由对比 */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">推荐理由</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedVersionData.length}, 1fr)` }}>
                      {selectedVersionData.map((v) => (
                        <div key={v.id} className="p-3 rounded-lg bg-muted/50">
                          <h4 className="font-medium text-sm mb-2">{v.versionCode}</h4>
                          <p className="text-sm text-muted-foreground">{v.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 差异视图 */}
              <TabsContent value="diff" className="space-y-4">
                {selectedVersionData.length >= 2 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">
                        {selectedVersionData[0].versionCode} → {selectedVersionData[1].versionCode} 变更
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {calculateDiffs(selectedVersionData[0], selectedVersionData[1]).map((diff, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "p-3 rounded-lg border",
                              diff.changeType === "added" && "bg-green-500/5 border-green-500/20",
                              diff.changeType === "removed" && "bg-red-500/5 border-red-500/20",
                              diff.changeType === "modified" && "bg-yellow-500/5 border-yellow-500/20"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {diff.changeType === "added" && <Plus className="w-4 h-4 text-green-500" />}
                              {diff.changeType === "removed" && <Minus className="w-4 h-4 text-red-500" />}
                              {diff.changeType === "modified" && <ArrowRight className="w-4 h-4 text-yellow-500" />}
                              <span className="font-medium text-sm">{diff.fieldLabel}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              {diff.v1Value && (
                                <span className={cn(diff.changeType === "removed" && "line-through text-muted-foreground")}>
                                  {typeof diff.v1Value === "number" ? formatCurrency(diff.v1Value) : String(diff.v1Value)}
                                </span>
                              )}
                              {diff.changeType === "modified" && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                              {diff.v2Value && (
                                <span className={cn(diff.changeType === "added" && "text-green-600 font-medium")}>
                                  {typeof diff.v2Value === "number" ? formatCurrency(diff.v2Value) : String(diff.v2Value)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}

                        {calculateDiffs(selectedVersionData[0], selectedVersionData[1]).length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
                            <p>两个版本没有差异</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompareDialog(false)}>
              关闭
            </Button>
            {selectedVersionData.some((v) => v.status !== "active") && (
              <Button
                onClick={() => {
                  const draftVersion = selectedVersionData.find((v) => v.status === "draft");
                  if (draftVersion) {
                    onActivate?.(draftVersion.id);
                    setShowCompareDialog(false);
                  }
                }}
              >
                <Zap className="w-4 h-4 mr-2" />
                激活选中版本
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
