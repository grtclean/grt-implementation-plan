/**
 * 字段映射管理组件
 * 支持保存和加载导入数据的字段映射配置
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Save,
  FolderOpen,
  Copy,
  Trash2,
  Star,
  StarOff,
  Plus,
  ArrowRight,
  Check,
  X,
  Settings,
} from "lucide-react";

// 导入类型
const IMPORT_TYPES = [
  { value: "lead", label: "商机" },
  { value: "customer", label: "客户" },
  { value: "contact", label: "联系人" },
  { value: "project", label: "项目" },
  { value: "cost", label: "成本" },
  { value: "other", label: "其他" },
] as const;

type ImportType = "lead" | "customer" | "contact" | "project" | "cost" | "other";

interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
  defaultValue?: string;
  required?: boolean;
}

interface MappingConfig {
  id?: number;
  name: string;
  description?: string;
  importType: ImportType;
  mappings: FieldMapping[];
  isDefault?: boolean;
}

interface FieldMappingManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType: ImportType;
  sourceFields: string[];
  currentMappings: FieldMapping[];
  onApplyMapping: (mappings: FieldMapping[]) => void;
}

export default function FieldMappingManager({
  open,
  onOpenChange,
  importType,
  sourceFields,
  currentMappings,
  onApplyMapping,
}: FieldMappingManagerProps) {
  const [activeTab, setActiveTab] = useState<"load" | "save">("load");
  const [selectedConfig, setSelectedConfig] = useState<MappingConfig | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");

  // 获取映射配置列表
  const { data: configs, refetch } = (trpc.fieldMapping.list as any).useQuery({
    importType,
  });

  // 获取目标字段列表
  const { data: targetFields } = (trpc.fieldMapping as any).getTargetFields.useQuery({
    importType,
  });

  // 创建配置
  const createMutation = trpc.fieldMapping.create.useMutation({
    onSuccess: () => {
      toast.success("映射配置保存成功");
      refetch();
      setSaveName("");
      setSaveDescription("");
    },
    onError: (err) => {
      toast.error("保存失败: " + err.message);
    },
  });

  // 删除配置
  const deleteMutation = trpc.fieldMapping.delete.useMutation({
    onSuccess: () => {
      toast.success("配置已删除");
      refetch();
      if (selectedConfig) setSelectedConfig(null);
    },
    onError: (err) => {
      toast.error("删除失败: " + err.message);
    },
  });

  // 设置默认配置
  const setDefaultMutation = (trpc.fieldMapping as any).setDefault.useMutation({
    onSuccess: () => {
      toast.success("已设为默认配置");
      refetch();
    },
    onError: (err: any) => {
      toast.error("设置失败: " + err.message);
    },
  });

  // 复制配置
  const duplicateMutation = (trpc.fieldMapping as any).duplicate.useMutation({
    onSuccess: () => {
      toast.success("配置已复制");
      refetch();
    },
    onError: (err: any) => {
      toast.error("复制失败: " + err.message);
    },
  });

  // 应用选中的配置
  const handleApplyConfig = () => {
    if (!selectedConfig) {
      toast.error("请先选择一个配置");
      return;
    }
    onApplyMapping(selectedConfig.mappings);
    onOpenChange(false);
    toast.success("映射配置已应用");
  };

  // 保存当前映射为新配置
  const handleSaveConfig = () => {
    if (!saveName.trim()) {
      toast.error("请输入配置名称");
      return;
    }
    if (currentMappings.length === 0) {
      toast.error("当前没有映射配置可保存");
      return;
    }

    createMutation.mutate({
      sourceField: saveName,
      targetField: importType,
      transformRule: saveDescription || undefined,
    });
  };

  // 删除配置
  const handleDeleteConfig = (id: number) => {
    if (confirm("确定要删除这个配置吗？")) {
      deleteMutation.mutate({ id: String(id) });
    }
  };

  // 设置默认配置
  const handleSetDefault = (id: number) => {
    setDefaultMutation.mutate({ id, importType });
  };

  // 复制配置
  const handleDuplicateConfig = (id: number, name: string) => {
    duplicateMutation.mutate({ id, newName: `${name} (副本)` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            字段映射配置管理
          </DialogTitle>
        </DialogHeader>

        {/* Tab切换 */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={activeTab === "load" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("load")}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            加载配置
          </Button>
          <Button
            variant={activeTab === "save" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("save")}
          >
            <Save className="w-4 h-4 mr-2" />
            保存配置
          </Button>
        </div>

        <ScrollArea className="flex-1 pr-4">
          {activeTab === "load" ? (
            <div className="space-y-4 py-4">
              {/* 配置列表 */}
              {configs && (configs as any).length > 0 ? (
                <div className="space-y-2">
                  {(configs as any).map((config: any) => (
                    <Card
                      key={config.id}
                      className={`cursor-pointer transition-colors ${
                        selectedConfig?.id === config.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedConfig(config as MappingConfig)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{config.name}</span>
                              {config.isDefault && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  默认
                                </Badge>
                              )}
                            </div>
                            {config.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {config.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>{config.mappings.length} 个字段映射</span>
                              <span>•</span>
                              <span>
                                更新于 {new Date(config.updatedAt!).toLocaleDateString("zh-CN")}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefault(config.id!);
                              }}
                            >
                              {config.isDefault ? (
                                <Star className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <StarOff className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateConfig(config.id!, config.name);
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConfig(config.id!);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* 映射预览 */}
                        {selectedConfig?.id === config.id && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="text-sm font-medium mb-2">映射详情</div>
                            <div className="space-y-1">
                              {config.mappings.slice(0, 5).map((mapping: any, index: any) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <span className="text-muted-foreground">
                                    {mapping.sourceField}
                                  </span>
                                  <ArrowRight className="w-3 h-3" />
                                  <span className="font-medium">
                                    {targetFields?.find((f: any) => f.field === mapping.targetField)?.label || mapping.targetField}
                                  </span>
                                  {mapping.required && (
                                    <Badge variant="outline" className="text-xs">
                                      必填
                                    </Badge>
                                  )}
                                </div>
                              ))}
                              {config.mappings.length > 5 && (
                                <div className="text-xs text-muted-foreground">
                                  还有 {config.mappings.length - 5} 个映射...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无保存的映射配置</p>
                  <p className="text-sm mt-1">切换到"保存配置"标签保存当前映射</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* 保存新配置 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>配置名称 *</Label>
                  <Input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="输入配置名称，如：标准商机导入"
                  />
                </div>
                <div className="space-y-2">
                  <Label>描述</Label>
                  <Input
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    placeholder="可选的配置描述"
                  />
                </div>

                <Separator />

                {/* 当前映射预览 */}
                <div className="space-y-2">
                  <Label>当前映射 ({currentMappings.length} 个)</Label>
                  {currentMappings.length > 0 ? (
                    <Card>
                      <CardContent className="p-3">
                        <div className="space-y-1">
                          {currentMappings.map((mapping, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span className="text-muted-foreground">
                                {mapping.sourceField}
                              </span>
                              <ArrowRight className="w-3 h-3" />
                              <span className="font-medium">
                                {targetFields?.find((f: any) => f.field === mapping.targetField)?.label || mapping.targetField}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 border rounded-md text-center">
                      当前没有映射配置
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          {activeTab === "load" ? (
            <Button onClick={handleApplyConfig} disabled={!selectedConfig}>
              <Check className="w-4 h-4 mr-2" />
              应用配置
            </Button>
          ) : (
            <Button
              onClick={handleSaveConfig}
              disabled={!saveName.trim() || currentMappings.length === 0 || createMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {createMutation.isPending ? "保存中..." : "保存配置"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
