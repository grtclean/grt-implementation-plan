/**
 * 会议模板选择器组件
 * 提供专业会议模板的浏览和选择功能
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MEETING_TEMPLATES,
  MEETING_CATEGORIES,
  getMeetingTemplate,
  type MeetingTemplate,
} from "@/config/meeting-templates";
import {
  UserCircle,
  TrendingUp,
  Factory,
  BarChart3,
  CalendarDays,
  Compass,
  Award,
  Handshake,
  FileSearch,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Users,
  FileText,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 图标映射
const ICON_MAP: Record<string, any> = {
  UserCircle,
  TrendingUp,
  Factory,
  BarChart3,
  CalendarDays,
  Compass,
  Award,
  Handshake,
  FileSearch,
  ClipboardCheck,
  CheckCircle2,
};

interface MeetingTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: MeetingTemplate) => void;
}

export function MeetingTemplateSelector({
  open,
  onOpenChange,
  onSelectTemplate,
}: MeetingTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<'internal' | 'customer'>('internal');
  const [previewTemplate, setPreviewTemplate] = useState<MeetingTemplate | null>(null);

  const filteredTemplates = MEETING_TEMPLATES.filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (template: MeetingTemplate) => {
    onSelectTemplate(template);
    onOpenChange(false);
  };

  const IconComponent = (iconName: string) => {
    const Icon = ICON_MAP[iconName] || FileText;
    return Icon;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] bg-[#0F172A] border-border/50 p-0 flex flex-col">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            选择会议模板
          </DialogTitle>
          <DialogDescription>
            选择适合的专业会议模板，快速创建规范化的会议记录
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex min-h-0 p-6 pt-4">
          {/* 左侧：模板列表 */}
          <div className="w-1/2 pr-4 flex flex-col">
            <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="internal" className="gap-2">
                  <Users className="w-4 h-4" />
                  内部管理
                </TabsTrigger>
                <TabsTrigger value="customer" className="gap-2">
                  <Handshake className="w-4 h-4" />
                  客户项目
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-4">
                  {filteredTemplates.map((template) => {
                    const Icon = IconComponent(template.icon);
                    return (
                      <Card
                        key={template.id}
                        className={cn(
                          "cursor-pointer transition-all hover:border-primary/50",
                          previewTemplate?.id === template.id && "border-primary bg-primary/5"
                        )}
                        onClick={() => setPreviewTemplate(template)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div
                              className="p-2 rounded-lg"
                              style={{ backgroundColor: `${template.color}20` }}
                            >
                              <Icon className="w-5 h-5" style={{ color: template.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="font-medium text-sm">{template.name}</h3>
                                <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                                  {template.subcategory}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {template.description}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {template.defaultDuration}分钟
                                </span>
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {template.agenda.length}个议程
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </Tabs>
          </div>

          {/* 右侧：模板预览 */}
          <div className="w-1/2 pl-4 border-l border-border/50 flex flex-col">
            {previewTemplate ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{previewTemplate.name}</h3>
                    <p className="text-sm text-muted-foreground">{previewTemplate.nameEn}</p>
                  </div>
                  <Button onClick={() => handleSelectTemplate(previewTemplate)}>
                    使用此模板
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-4 pr-4">
                    {/* 基本信息 */}
                    <Card className="bg-background/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">基本信息</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">建议时长</span>
                          <span>{previewTemplate.defaultDuration} 分钟</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">议程数量</span>
                          <span>{previewTemplate.agenda.length} 项</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">输出文档</span>
                          <span>{previewTemplate.outputs.length} 份</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 参会人员 */}
                    <Card className="bg-background/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">参会人员</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">必须参加</p>
                          <div className="flex flex-wrap gap-1">
                            {previewTemplate.participants.required.map((p, i) => (
                              <Badge key={i} variant="default" className="text-xs">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {previewTemplate.participants.optional.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">可选参加</p>
                            <div className="flex flex-wrap gap-1">
                              {previewTemplate.participants.optional.map((p, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* 会议议程 */}
                    <Card className="bg-background/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">会议议程</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {previewTemplate.agenda.map((item, index) => (
                            <div
                              key={item.id}
                              className="flex items-start gap-2 p-2 rounded-lg bg-background/50"
                            >
                              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium">{item.title}</span>
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {item.duration}分钟
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* 输出文档 */}
                    <Card className="bg-background/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">输出文档</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {previewTemplate.outputs.map((output) => (
                            <Badge
                              key={output.id}
                              variant={output.required ? "default" : "outline"}
                              className="text-xs"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              {output.name}
                              {output.required && " *"}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* 最佳实践 */}
                    <Card className="bg-background/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          最佳实践
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {previewTemplate.bestPractices.map((practice, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                              <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                              {practice}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* 后续行动 */}
                    <Card className="bg-background/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">会后跟进</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {previewTemplate.followUpActions.map((action, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                              <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>选择左侧模板查看详情</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MeetingTemplateSelector;
