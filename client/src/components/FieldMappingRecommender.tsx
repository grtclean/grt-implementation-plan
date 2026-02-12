/**
 * 字段映射智能推荐组件
 * 基于字段名称相似度自动推荐映射关系
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  Wand2,
  Check,
  X,
  AlertCircle,
  Sparkles,
  History,
  Target,
  Lightbulb,
} from "lucide-react";

interface MappingRecommendation {
  sourceField: string;
  targetField: string;
  confidence: number;
  reason: string;
  matchType: "exact" | "similar" | "historical" | "semantic";
}

interface FieldMappingRecommenderProps {
  sourceFields: string[];
  importType: "lead" | "customer" | "contact" | "project" | "cost";
  onApplyMappings: (mappings: { sourceField: string; targetField: string }[]) => void;
  currentMappings?: { sourceField: string; targetField: string }[];
}

export default function FieldMappingRecommender({
  sourceFields,
  importType,
  onApplyMappings,
  currentMappings = [],
}: FieldMappingRecommenderProps) {
  const [recommendations, setRecommendations] = useState<MappingRecommendation[]>([]);
  const [selectedMappings, setSelectedMappings] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // 获取推荐
  const { data: recommendData, refetch } = trpc.fieldMappingRecommend.getRecommendations.useQuery(
    { sourceFields, importType },
    { enabled: sourceFields.length > 0 }
  );

  // 获取目标字段
  const { data: targetFields } = (trpc.fieldMappingRecommend as any).getTargetFields.useQuery({
    importType,
  });

  // 记录使用
  const recordUsageMutation = (trpc.fieldMappingRecommend as any).recordUsage.useMutation();

  useEffect(() => {
    if ((recommendData as any)?.recommendations) {
      setRecommendations((recommendData as any).recommendations);

      // 自动选择高置信度推荐
      const autoSelect = new Map<string, string>();
      for (const rec of (recommendData as any).recommendations) {
        if (rec.confidence >= 80) {
          autoSelect.set(rec.sourceField, rec.targetField);
        }
      }
      setSelectedMappings(autoSelect);
    }
  }, [recommendData]);

  // 初始化已有映射
  useEffect(() => {
    if (currentMappings.length > 0) {
      const existing = new Map<string, string>();
      for (const m of currentMappings) {
        existing.set(m.sourceField, m.targetField);
      }
      setSelectedMappings(existing);
    }
  }, [currentMappings]);

  const handleSelectMapping = (sourceField: string, targetField: string) => {
    const newMappings = new Map(selectedMappings);
    if (targetField) {
      newMappings.set(sourceField, targetField);
    } else {
      newMappings.delete(sourceField);
    }
    setSelectedMappings(newMappings);
  };

  const handleApplyAll = () => {
    const mappings = Array.from(selectedMappings.entries()).map(([sourceField, targetField]) => ({
      sourceField,
      targetField,
    }));
    
    // 记录使用以便学习
    recordUsageMutation.mutate({ importType, mappings });
    
    onApplyMappings(mappings);
  };

  const handleApplyRecommended = () => {
    const mappings = recommendations
      .filter((r) => r.confidence >= 70)
      .map((r) => ({ sourceField: r.sourceField, targetField: r.targetField }));
    
    recordUsageMutation.mutate({ importType, mappings });
    onApplyMappings(mappings);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) {
      return <Badge className="bg-green-500">高 {confidence}%</Badge>;
    } else if (confidence >= 70) {
      return <Badge className="bg-yellow-500">中 {confidence}%</Badge>;
    } else {
      return <Badge className="bg-red-500">低 {confidence}%</Badge>;
    }
  };

  const getMatchTypeIcon = (matchType: string) => {
    switch (matchType) {
      case "exact":
        return <Check className="w-4 h-4 text-green-500" />;
      case "similar":
        return <Target className="w-4 h-4 text-blue-500" />;
      case "historical":
        return <History className="w-4 h-4 text-purple-500" />;
      case "semantic":
        return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case "exact":
        return "精确匹配";
      case "similar":
        return "相似匹配";
      case "historical":
        return "历史学习";
      case "semantic":
        return "语义匹配";
      default:
        return "未知";
    }
  };

  const stats = (recommendData as any)?.stats;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">智能字段映射</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <Wand2 className="w-4 h-4 mr-1" />
              重新推荐
            </Button>
            <Button
              size="sm"
              onClick={handleApplyRecommended}
              disabled={recommendations.length === 0}
            >
              应用推荐
            </Button>
          </div>
        </div>
        <CardDescription>
          基于字段名称相似度和历史映射数据自动推荐映射关系
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 统计信息 */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-xs text-muted-foreground">推荐映射</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{stats.highConfidence}</div>
              <div className="text-xs text-muted-foreground">高置信度</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">
                {stats.total - stats.highConfidence - stats.lowConfidence}
              </div>
              <div className="text-xs text-muted-foreground">中置信度</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{stats.lowConfidence}</div>
              <div className="text-xs text-muted-foreground">低置信度</div>
            </div>
          </div>
        )}

        {/* 整体置信度 */}
        {stats && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>整体匹配置信度</span>
              <span className="font-medium">{stats.avgConfidence}%</span>
            </div>
            <Progress value={stats.avgConfidence} className="h-2" />
          </div>
        )}

        {/* 映射表格 */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[200px]">源字段</TableHead>
                <TableHead className="w-[200px]">目标字段</TableHead>
                <TableHead className="w-[100px]">置信度</TableHead>
                <TableHead className="w-[120px]">匹配类型</TableHead>
                <TableHead>推荐原因</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourceFields.map((sourceField) => {
                const rec = recommendations.find((r) => r.sourceField === sourceField);
                const selected = selectedMappings.get(sourceField);

                return (
                  <TableRow key={sourceField}>
                    <TableCell className="font-mono text-sm">{sourceField}</TableCell>
                    <TableCell>
                      <Select
                        value={selected || ""}
                        onValueChange={(value) => handleSelectMapping(sourceField, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="选择目标字段" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">不映射</SelectItem>
                          {targetFields?.map((field) => (
                            <SelectItem key={field.field} value={field.field}>
                              {field.label}
                              {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {rec ? getConfidenceBadge(rec.confidence) : (
                        <Badge variant="outline">无推荐</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {rec && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1">
                                {getMatchTypeIcon(rec.matchType)}
                                <span className="text-sm">{getMatchTypeLabel(rec.matchType)}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{rec.reason}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rec?.reason || "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            已选择 {selectedMappings.size} / {sourceFields.length} 个字段映射
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedMappings(new Map())}
            >
              <X className="w-4 h-4 mr-1" />
              清除选择
            </Button>
            <Button onClick={handleApplyAll} disabled={selectedMappings.size === 0}>
              <Check className="w-4 h-4 mr-1" />
              应用选中映射 ({selectedMappings.size})
            </Button>
          </div>
        </div>

        {/* 匹配类型图例 */}
        <div className="flex flex-wrap gap-4 pt-4 border-t text-sm">
          <div className="flex items-center gap-1">
            <Check className="w-4 h-4 text-green-500" />
            <span>精确匹配</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4 text-blue-500" />
            <span>相似匹配</span>
          </div>
          <div className="flex items-center gap-1">
            <History className="w-4 h-4 text-purple-500" />
            <span>历史学习</span>
          </div>
          <div className="flex items-center gap-1">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <span>语义匹配</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
