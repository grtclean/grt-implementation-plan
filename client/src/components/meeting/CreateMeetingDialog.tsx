/**
 * 专业会议创建对话框
 * 支持从模板创建会议，自动填充议程和配置
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Users,
  FileText,
  Sparkles,
  ChevronRight,
  Plus,
  CheckCircle2,
  Layers,
  Target,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  MEETING_TEMPLATES,
  MEETING_CATEGORIES,
  getMeetingTemplate,
  type MeetingTemplate,
  type MeetingAgendaItem,
} from "@/config/meeting-templates";

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

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelName: string;
  onCreateMeeting: (data: {
    title: string;
    meetingDate: string;
    phase?: string;
    objective?: string;
    templateId?: string;
    agenda?: MeetingAgendaItem[];
    participants?: { required: string[]; optional: string[] };
    duration?: number;
  }) => void;
  isCreating?: boolean;
}

const PROJECT_PHASES = [
  { value: "M0_Opportunity", label: "M0 商机" },
  { value: "M1_Proposal", label: "M1 方案" },
  { value: "M2_Kickoff", label: "M2 启动" },
  { value: "M3_Technical_Design", label: "M3 技术设计" },
  { value: "M4_Procurement", label: "M4 采购" },
  { value: "M5_Manufacturing", label: "M5 制造" },
  { value: "M6_Assembly", label: "M6 组装" },
  { value: "M7_Testing", label: "M7 测试" },
  { value: "M8_Production", label: "M8 生产" },
  { value: "M9_Debugging", label: "M9 调试" },
  { value: "M10_PreAcceptance", label: "M10 预验收" },
  { value: "M11_Shipping", label: "M11 发货" },
  { value: "M12_Handover", label: "M12 交付" },
];

export function CreateMeetingDialog({
  open,
  onOpenChange,
  channelName,
  onCreateMeeting,
  isCreating = false,
}: CreateMeetingDialogProps) {
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<MeetingTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'internal' | 'customer'>('internal');
  const [meetingData, setMeetingData] = useState({
    title: "",
    meetingDate: format(new Date(), "yyyy-MM-dd"),
    meetingTime: "09:00",
    phase: "",
    objective: "",
    participants: "",
    location: "",
  });

  const filteredTemplates = MEETING_TEMPLATES.filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (template: MeetingTemplate) => {
    setSelectedTemplate(template);
    setMeetingData({
      ...meetingData,
      title: template.name,
      objective: template.description,
    });
    setStep('details');
  };

  const handleSkipTemplate = () => {
    setSelectedTemplate(null);
    setStep('details');
  };

  const handleBack = () => {
    setStep('template');
  };

  const handleCreate = () => {
    onCreateMeeting({
      title: meetingData.title,
      meetingDate: meetingData.meetingDate,
      phase: meetingData.phase || undefined,
      objective: meetingData.objective || undefined,
      templateId: selectedTemplate?.id,
      agenda: selectedTemplate?.agenda,
      participants: selectedTemplate?.participants,
      duration: selectedTemplate?.defaultDuration,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    // 重置状态
    setTimeout(() => {
      setStep('template');
      setSelectedTemplate(null);
      setMeetingData({
        title: "",
        meetingDate: format(new Date(), "yyyy-MM-dd"),
        meetingTime: "09:00",
        phase: "",
        objective: "",
        participants: "",
        location: "",
      });
    }, 200);
  };

  const IconComponent = (iconName: string) => {
    return ICON_MAP[iconName] || FileText;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[80vh] bg-[#0F172A] border-border/50 p-0 flex flex-col">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {step === 'template' ? '选择会议模板' : '创建会议'}
          </DialogTitle>
          <DialogDescription>
            {step === 'template' 
              ? '选择专业会议模板快速创建规范化会议，或跳过直接创建自定义会议'
              : `在 #${channelName} 频道中创建新的会议记录`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'template' ? (
          <div className="flex-1 flex flex-col min-h-0 p-6 pt-4">
            {/* 模板分类选择 */}
            <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)} className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <TabsList className="grid grid-cols-2 w-64">
                  <TabsTrigger value="internal" className="gap-2">
                    <Users className="w-4 h-4" />
                    内部管理
                  </TabsTrigger>
                  <TabsTrigger value="customer" className="gap-2">
                    <Handshake className="w-4 h-4" />
                    客户项目
                  </TabsTrigger>
                </TabsList>
                <Button variant="outline" onClick={handleSkipTemplate}>
                  跳过，直接创建
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 gap-4 pr-4">
                  {filteredTemplates.map((template) => {
                    const Icon = IconComponent(template.icon);
                    return (
                      <Card
                        key={template.id}
                        className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start gap-3">
                            <div
                              className="p-2.5 rounded-lg"
                              style={{ backgroundColor: `${template.color}20` }}
                            >
                              <Icon className="w-6 h-6" style={{ color: template.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {template.nameEn}
                              </CardDescription>
                            </div>
                            <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                              {template.subcategory}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {template.defaultDuration}分钟
                            </span>
                            <span className="flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5" />
                              {template.agenda.length}个议程
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              {template.outputs.length}份输出
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </Tabs>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0 p-6 pt-4">
            {/* 左侧：会议详情表单 */}
            <div className="w-1/2 pr-6 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-4">
                  {selectedTemplate && (
                    <Card className="bg-gradient-to-br from-primary/10 to-emerald-500/10 border-primary/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const Icon = IconComponent(selectedTemplate.icon);
                            return (
                              <div
                                className="p-2 rounded-lg"
                                style={{ backgroundColor: `${selectedTemplate.color}20` }}
                              >
                                <Icon className="w-5 h-5" style={{ color: selectedTemplate.color }} />
                              </div>
                            );
                          })()}
                          <div>
                            <p className="text-xs text-muted-foreground">使用模板</p>
                            <p className="font-medium">{selectedTemplate.name}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto"
                            onClick={handleBack}
                          >
                            更换模板
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">会议标题 *</label>
                    <Input
                      placeholder="输入会议标题..."
                      value={meetingData.title}
                      onChange={(e) => setMeetingData({ ...meetingData, title: e.target.value })}
                      className="bg-background/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">会议日期</label>
                      <Input
                        type="date"
                        value={meetingData.meetingDate}
                        onChange={(e) => setMeetingData({ ...meetingData, meetingDate: e.target.value })}
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">开始时间</label>
                      <Input
                        type="time"
                        value={meetingData.meetingTime}
                        onChange={(e) => setMeetingData({ ...meetingData, meetingTime: e.target.value })}
                        className="bg-background/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">项目阶段</label>
                    <Select
                      value={meetingData.phase}
                      onValueChange={(v) => setMeetingData({ ...meetingData, phase: v })}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="选择阶段（可选）" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_PHASES.map((phase) => (
                          <SelectItem key={phase.value} value={phase.value}>
                            {phase.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">会议目标</label>
                    <Textarea
                      placeholder="描述本次会议的目标..."
                      value={meetingData.objective}
                      onChange={(e) => setMeetingData({ ...meetingData, objective: e.target.value })}
                      className="bg-background/50 min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">参会人员</label>
                    <Textarea
                      placeholder="输入参会人员名单，用逗号分隔..."
                      value={meetingData.participants}
                      onChange={(e) => setMeetingData({ ...meetingData, participants: e.target.value })}
                      className="bg-background/50 min-h-[60px]"
                    />
                    {selectedTemplate && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-xs text-muted-foreground">建议参会：</span>
                        {selectedTemplate.participants.required.map((p, i) => (
                          <Badge key={i} variant="default" className="text-[10px]">
                            {p}
                          </Badge>
                        ))}
                        {selectedTemplate.participants.optional.map((p, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">会议地点</label>
                    <Input
                      placeholder="输入会议地点或线上会议链接..."
                      value={meetingData.location}
                      onChange={(e) => setMeetingData({ ...meetingData, location: e.target.value })}
                      className="bg-background/50"
                    />
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* 右侧：议程预览 */}
            <div className="w-1/2 pl-6 border-l border-border/50 flex flex-col">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                会议议程
                {selectedTemplate && (
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {selectedTemplate.agenda.length} 项
                  </Badge>
                )}
              </h3>
              <ScrollArea className="flex-1">
                {selectedTemplate ? (
                  <div className="space-y-2 pr-4">
                    {selectedTemplate.agenda.map((item, index) => (
                      <Card key={item.id} className="bg-background/30">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium">{item.title}</span>
                                <Badge variant="outline" className="text-[10px] flex-shrink-0">
                                  {item.duration}分钟
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {item.description}
                              </p>
                              {item.responsible && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                  <Users className="w-3 h-3" />
                                  {item.responsible}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* 最佳实践提示 */}
                    <Card className="bg-amber-500/10 border-amber-500/30 mt-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          最佳实践
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {selectedTemplate.bestPractices.slice(0, 3).map((practice, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                              <CheckCircle2 className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                              {practice}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Layers className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm">未选择模板</p>
                    <p className="text-xs mt-1">会议创建后可手动添加议程</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter className="p-6 pt-0 border-t border-border/50 mt-auto">
          {step === 'details' && (
            <>
              <Button variant="outline" onClick={handleBack}>
                返回选择模板
              </Button>
              <Button onClick={handleCreate} disabled={isCreating || !meetingData.title}>
                {isCreating ? "创建中..." : "创建会议"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateMeetingDialog;
