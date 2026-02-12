/**
 * 报表模板编辑器组件
 * 支持自定义报表内容和格式，保存常用模板
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Save,
  Copy,
  Trash2,
  Eye,
  GripVertical,
  BarChart3,
  TrendingUp,
  PieChart,
  Users,
  FileText,
  Palette,
  Layout,
  Settings,
  Star,
  StarOff,
  Monitor,
} from "lucide-react";
import ReportTemplatePreview from "./ReportTemplatePreview";
import { FeatureGuideDialog, reportTemplateGuideSteps } from "./FeatureGuide";

// 报表类型配置
const REPORT_TYPES = [
  { value: "summary", label: "商机概览", icon: FileText, description: "显示商机总数、新增、成交等关键指标" },
  { value: "funnel", label: "销售漏斗", icon: BarChart3, description: "展示各阶段商机分布和转化率" },
  { value: "trend", label: "趋势分析", icon: TrendingUp, description: "显示商机数量随时间的变化趋势" },
  { value: "source", label: "来源分析", icon: PieChart, description: "分析商机来源渠道的分布情况" },
  { value: "performance", label: "销售业绩", icon: Users, description: "展示销售人员的业绩排行" },
] as const;

// 主题配置
const THEMES = [
  { value: "light", label: "浅色主题" },
  { value: "dark", label: "深色主题" },
  { value: "professional", label: "专业主题" },
];

// 类别配置
const CATEGORIES = [
  { value: "lead", label: "商机报表" },
  { value: "project", label: "项目报表" },
  { value: "cost", label: "成本报表" },
  { value: "performance", label: "业绩报表" },
  { value: "custom", label: "自定义" },
];

interface LayoutSection {
  type: string;
  title: string;
  width: "full" | "half" | "third";
  order: number;
  visible: boolean;
}

interface StylingConfig {
  theme: "light" | "dark" | "professional";
  primaryColor: string;
  showHeader: boolean;
  showFooter: boolean;
  showLogo: boolean;
  logoUrl?: string;
  headerText?: string;
  footerText?: string;
}

interface ReportTemplate {
  id?: number;
  name: string;
  description?: string;
  category: string;
  reportTypes: string[];
  layout?: {
    columns: number;
    sections: LayoutSection[];
  };
  styling?: StylingConfig;
  isDefault?: boolean;
  isPublic?: boolean;
}

interface ReportTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ReportTemplate | null;
  onSave?: (template: ReportTemplate) => void;
}

export default function ReportTemplateEditor({
  open,
  onOpenChange,
  template,
  onSave,
}: ReportTemplateEditorProps) {
  const [activeTab, setActiveTab] = useState("content");
  const [formData, setFormData] = useState<ReportTemplate>({
    name: "",
    description: "",
    category: "custom",
    reportTypes: ["summary", "funnel"],
    layout: {
      columns: 2,
      sections: [
        { type: "summary", title: "商机概览", width: "full", order: 1, visible: true },
        { type: "funnel", title: "销售漏斗", width: "half", order: 2, visible: true },
      ],
    },
    styling: {
      theme: "professional",
      primaryColor: "#f97316",
      showHeader: true,
      showFooter: true,
      showLogo: true,
      headerText: "GRT智能系统 - 分析报表",
      footerText: "本报表由系统自动生成",
    },
    isDefault: false,
    isPublic: false,
  });

  const createMutation = trpc.reportTemplate.create.useMutation();
  const updateMutation = trpc.reportTemplate.update.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (template) {
      setFormData({
        ...template,
        layout: template.layout || {
          columns: 2,
          sections: template.reportTypes.map((type, index) => ({
            type,
            title: REPORT_TYPES.find(t => t.value === type)?.label || type,
            width: index === 0 ? "full" : "half",
            order: index + 1,
            visible: true,
          })),
        },
        styling: template.styling || {
          theme: "professional",
          primaryColor: "#f97316",
          showHeader: true,
          showFooter: true,
          showLogo: true,
          headerText: "GRT智能系统 - 分析报表",
          footerText: "本报表由系统自动生成",
        },
      });
    } else {
      // 重置为默认值
      setFormData({
        name: "",
        description: "",
        category: "custom",
        reportTypes: ["summary", "funnel"],
        layout: {
          columns: 2,
          sections: [
            { type: "summary", title: "商机概览", width: "full", order: 1, visible: true },
            { type: "funnel", title: "销售漏斗", width: "half", order: 2, visible: true },
          ],
        },
        styling: {
          theme: "professional",
          primaryColor: "#f97316",
          showHeader: true,
          showFooter: true,
          showLogo: true,
          headerText: "GRT智能系统 - 分析报表",
          footerText: "本报表由系统自动生成",
        },
        isDefault: false,
        isPublic: false,
      });
    }
  }, [template, open]);

  const handleReportTypeToggle = (type: string) => {
    const newTypes = formData.reportTypes.includes(type)
      ? formData.reportTypes.filter(t => t !== type)
      : [...formData.reportTypes, type];
    
    // 同步更新sections
    const newSections = newTypes.map((t, index) => {
      const existing = formData.layout?.sections.find(s => s.type === t);
      return existing || {
        type: t,
        title: REPORT_TYPES.find(rt => rt.value === t)?.label || t,
        width: index === 0 ? "full" as const : "half" as const,
        order: index + 1,
        visible: true,
      };
    });

    setFormData({
      ...formData,
      reportTypes: newTypes,
      layout: {
        ...formData.layout!,
        sections: newSections,
      },
    });
  };

  const handleSectionUpdate = (index: number, updates: Partial<LayoutSection>) => {
    const newSections = [...(formData.layout?.sections || [])];
    newSections[index] = { ...newSections[index], ...updates };
    setFormData({
      ...formData,
      layout: {
        ...formData.layout!,
        sections: newSections,
      },
    });
  };

  const handleStylingUpdate = (updates: Partial<StylingConfig>) => {
    setFormData({
      ...formData,
      styling: {
        ...formData.styling!,
        ...updates,
      },
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("请输入模板名称");
      return;
    }

    if (formData.reportTypes.length === 0) {
      toast.error("请至少选择一个报表类型");
      return;
    }

    try {
      if (template?.id) {
        await updateMutation.mutateAsync({
          id: template.id,
          name: formData.name,
          description: formData.description,
          category: formData.category as any,
          reportTypes: formData.reportTypes as any,
          layout: formData.layout as any,
          styling: formData.styling as any,
          isDefault: formData.isDefault,
          isPublic: formData.isPublic,
        });
        toast.success("模板更新成功");
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          description: formData.description,
          category: formData.category as any,
          reportTypes: formData.reportTypes as any,
          layout: formData.layout as any,
          styling: formData.styling as any,
          isDefault: formData.isDefault,
          isPublic: formData.isPublic,
        });
        toast.success("模板创建成功");
      }
      
      utils.reportTemplate.list.invalidate();
      onSave?.(formData);
      onOpenChange(false);
    } catch (err) {
      toast.error("保存失败: " + (err instanceof Error ? err.message : "未知错误"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {template?.id ? "编辑报表模板" : "创建报表模板"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Layout className="w-4 h-4" />
              内容配置
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-2">
              <GripVertical className="w-4 h-4" />
              布局设置
            </TabsTrigger>
            <TabsTrigger value="styling" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              样式设置
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              实时预览
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4">
            <TabsContent value="content" className="mt-4 space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>模板名称 *</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入模板名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label>类别</Label>
                  <Select
                    value={formData.category}
                    onValueChange={value => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  value={formData.description || ""}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入模板描述"
                  rows={2}
                />
              </div>

              {/* 报表类型选择 */}
              <div className="space-y-2">
                <Label>报表内容 *</Label>
                <div className="grid grid-cols-1 gap-2">
                  {REPORT_TYPES.map(type => {
                    const Icon = type.icon;
                    const isSelected = formData.reportTypes.includes(type.value);
                    return (
                      <Card
                        key={type.value}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/50"
                        }`}
                        onClick={() => handleReportTypeToggle(type.value)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={`p-2 rounded-md ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                          <Switch checked={isSelected} />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* 权限设置 */}
              <div className="flex items-center gap-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isDefault}
                    onCheckedChange={checked => setFormData({ ...formData, isDefault: checked })}
                  />
                  <Label className="flex items-center gap-1">
                    {formData.isDefault ? <Star className="w-4 h-4 text-yellow-500" /> : <StarOff className="w-4 h-4" />}
                    设为默认模板
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isPublic}
                    onCheckedChange={checked => setFormData({ ...formData, isPublic: checked })}
                  />
                  <Label>公开模板</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="layout" className="mt-4 space-y-4">
              {/* 列数设置 */}
              <div className="space-y-2">
                <Label>布局列数</Label>
                <Select
                  value={String(formData.layout?.columns || 2)}
                  onValueChange={value => setFormData({
                    ...formData,
                    layout: { ...formData.layout!, columns: Number(value) },
                  })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1列</SelectItem>
                    <SelectItem value="2">2列</SelectItem>
                    <SelectItem value="3">3列</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 区块配置 */}
              <div className="space-y-2">
                <Label>区块配置</Label>
                <div className="space-y-2">
                  {formData.layout?.sections.map((section, index) => (
                    <Card key={section.type} className="p-3">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <Input
                            value={section.title}
                            onChange={e => handleSectionUpdate(index, { title: e.target.value })}
                            placeholder="区块标题"
                          />
                          <Select
                            value={section.width}
                            onValueChange={value => handleSectionUpdate(index, { width: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full">整行</SelectItem>
                              <SelectItem value="half">半行</SelectItem>
                              <SelectItem value="third">三分之一</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={section.visible}
                              onCheckedChange={checked => handleSectionUpdate(index, { visible: checked })}
                            />
                            <span className="text-sm text-muted-foreground">显示</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 布局预览 */}
              <div className="space-y-2">
                <Label>布局预览</Label>
                <Card className="p-4 bg-muted/30">
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${formData.layout?.columns || 2}, 1fr)` }}
                  >
                    {formData.layout?.sections
                      .filter(s => s.visible)
                      .map((section, index) => (
                        <div
                          key={index}
                          className="bg-background border rounded-md p-3 text-center text-sm"
                          style={{
                            gridColumn: section.width === "full" ? "1 / -1" : section.width === "half" ? "span 1" : "span 1",
                          }}
                        >
                          {section.title}
                        </div>
                      ))}
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="styling" className="mt-4 space-y-4">
              {/* 主题设置 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>主题</Label>
                  <Select
                    value={formData.styling?.theme || "professional"}
                    onValueChange={value => handleStylingUpdate({ theme: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {THEMES.map(theme => (
                        <SelectItem key={theme.value} value={theme.value}>
                          {theme.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>主色调</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.styling?.primaryColor || "#f97316"}
                      onChange={e => handleStylingUpdate({ primaryColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.styling?.primaryColor || "#f97316"}
                      onChange={e => handleStylingUpdate({ primaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* 页眉页脚设置 */}
              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.styling?.showHeader}
                      onCheckedChange={checked => handleStylingUpdate({ showHeader: checked })}
                    />
                    <Label>显示页眉</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.styling?.showFooter}
                      onCheckedChange={checked => handleStylingUpdate({ showFooter: checked })}
                    />
                    <Label>显示页脚</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.styling?.showLogo}
                      onCheckedChange={checked => handleStylingUpdate({ showLogo: checked })}
                    />
                    <Label>显示Logo</Label>
                  </div>
                </div>

                {formData.styling?.showHeader && (
                  <div className="space-y-2">
                    <Label>页眉文字</Label>
                    <Input
                      value={formData.styling?.headerText || ""}
                      onChange={e => handleStylingUpdate({ headerText: e.target.value })}
                      placeholder="输入页眉文字"
                    />
                  </div>
                )}

                {formData.styling?.showFooter && (
                  <div className="space-y-2">
                    <Label>页脚文字</Label>
                    <Input
                      value={formData.styling?.footerText || ""}
                      onChange={e => handleStylingUpdate({ footerText: e.target.value })}
                      placeholder="输入页脚文字"
                    />
                  </div>
                )}

                {formData.styling?.showLogo && (
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
                      value={formData.styling?.logoUrl || ""}
                      onChange={e => handleStylingUpdate({ logoUrl: e.target.value })}
                      placeholder="输入Logo图片URL"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    根据当前配置实时生成预览效果
                  </div>
                  <Badge variant="outline" className="text-xs">
                    模拟数据
                  </Badge>
                </div>
                <ReportTemplatePreview
                  layout={formData.layout}
                  styling={formData.styling}
                  className="border rounded-lg"
                />
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存模板"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 报表模板管理器组件（带功能引导）
 */
export function ReportTemplateManagerWithGuide() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  
  const { data: templates = [], isLoading } = trpc.reportTemplate.list.useQuery();
  const deleteMutation = trpc.reportTemplate.delete.useMutation();
  const utils = trpc.useUtils();

  const handleEdit = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setEditorOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个模板吗？')) return;
    try {
      await deleteMutation.mutateAsync({ id: String(id) });
      toast.success('模板已删除');
      utils.reportTemplate.list.invalidate();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  return (
    <>
      <FeatureGuideDialog
        featureKey="report_template"
        featureName="报表模板功能引导"
        steps={reportTemplateGuideSteps}
      />
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">报表模板管理</h3>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            创建模板
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : (templates as any).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无报表模板</p>
              <p className="text-sm mt-2">点击上方按钮创建第一个模板</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(templates as any).map((template: ReportTemplate) => (
              <Card key={template.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {template.isDefault && <Star className="w-4 h-4 text-yellow-500" />}
                      {template.name}
                    </span>
                    <Badge variant="outline">{template.category}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {template.description || '无描述'}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                      <Settings className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(template.id!)}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ReportTemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={selectedTemplate}
        onSave={() => {
          utils.reportTemplate.list.invalidate();
          setEditorOpen(false);
        }}
      />
    </>
  );
}
