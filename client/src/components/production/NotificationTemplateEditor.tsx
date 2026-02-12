/**
 * NotificationTemplateEditor.tsx
 * 通知消息模板编辑器组件
 * 
 * 功能：
 * - 支持自定义审批通知的消息模板
 * - 支持变量插入（项目名称、阶段、审批人等）
 * - 实时预览功能
 * - 支持多种通知渠道模板（企业微信/钉钉/邮件/短信）
 */

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText,
  Variable,
  Eye,
  Save,
  Copy,
  Plus,
  Trash2,
  MessageSquare,
  Mail,
  Smartphone,
  Bell,
  RefreshCw,
  Check,
  AlertCircle,
  Code,
  Wand2,
  History,
  Undo2,
  Settings2
} from "lucide-react";

// ==================== 类型定义 ====================

// 通知渠道类型
type NotificationChannel = "wecom" | "dingtalk" | "email" | "sms" | "system";

// 模板类型
type TemplateType = 
  | "approval_request"      // 审批请求
  | "approval_approved"     // 审批通过
  | "approval_rejected"     // 审批拒绝
  | "stage_started"         // 阶段开始
  | "stage_completed"       // 阶段完成
  | "stage_delayed"         // 阶段延期
  | "time_tracking_alert"   // 工时预警
  | "custom";               // 自定义

// 模板变量
interface TemplateVariable {
  key: string;
  name: string;
  description: string;
  example: string;
  category: "project" | "stage" | "user" | "time" | "system";
}

// 消息模板
interface MessageTemplate {
  id: string;
  name: string;
  type: TemplateType;
  channel: NotificationChannel;
  subject?: string;        // 邮件主题
  content: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// 模板历史记录
interface TemplateHistory {
  id: string;
  templateId: string;
  content: string;
  subject?: string;
  version: number;
  changedBy: string;
  changedAt: string;
  changeReason?: string;
}

// ==================== 常量定义 ====================

// 可用的模板变量
const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // 项目相关
  { key: "{{project_name}}", name: "项目名称", description: "当前项目的名称", example: "5000T清洗设备项目", category: "project" },
  { key: "{{project_code}}", name: "项目编号", description: "项目的唯一编号", example: "PRJ-2026-001", category: "project" },
  { key: "{{customer_name}}", name: "客户名称", description: "项目客户的名称", example: "德国大众汽车", category: "project" },
  { key: "{{project_manager}}", name: "项目经理", description: "项目负责人姓名", example: "张工", category: "project" },
  
  // 阶段相关
  { key: "{{stage_code}}", name: "阶段代码", description: "当前阶段代码（如T1-T15）", example: "T6", category: "stage" },
  { key: "{{stage_name}}", name: "阶段名称", description: "当前阶段的名称", example: "电气组装", category: "stage" },
  { key: "{{stage_status}}", name: "阶段状态", description: "阶段的当前状态", example: "进行中", category: "stage" },
  { key: "{{planned_hours}}", name: "计划工时", description: "阶段计划工时", example: "40", category: "stage" },
  { key: "{{actual_hours}}", name: "实际工时", description: "阶段实际工时", example: "35", category: "stage" },
  { key: "{{progress_percent}}", name: "完成进度", description: "阶段完成百分比", example: "75%", category: "stage" },
  
  // 用户相关
  { key: "{{approver_name}}", name: "审批人姓名", description: "审批人的姓名", example: "李经理", category: "user" },
  { key: "{{requester_name}}", name: "申请人姓名", description: "申请人的姓名", example: "王工程师", category: "user" },
  { key: "{{operator_name}}", name: "操作人姓名", description: "当前操作人姓名", example: "赵技术员", category: "user" },
  { key: "{{operator_role}}", name: "操作人角色", description: "操作人的系统角色", example: "电气工程师", category: "user" },
  
  // 时间相关
  { key: "{{current_date}}", name: "当前日期", description: "当前日期", example: "2026-02-04", category: "time" },
  { key: "{{current_time}}", name: "当前时间", description: "当前时间", example: "14:30:00", category: "time" },
  { key: "{{deadline}}", name: "截止日期", description: "任务截止日期", example: "2026-02-10", category: "time" },
  { key: "{{remaining_days}}", name: "剩余天数", description: "距离截止日期的天数", example: "6", category: "time" },
  
  // 系统相关
  { key: "{{system_name}}", name: "系统名称", description: "系统名称", example: "GRT智能系统", category: "system" },
  { key: "{{approval_link}}", name: "审批链接", description: "审批操作的链接", example: "https://grt.com/approve/123", category: "system" },
  { key: "{{detail_link}}", name: "详情链接", description: "查看详情的链接", example: "https://grt.com/project/123", category: "system" },
];

// 默认模板
const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: "tpl-001",
    name: "审批请求通知",
    type: "approval_request",
    channel: "wecom",
    content: `【{{system_name}}】审批请求

项目：{{project_name}}
阶段：{{stage_code}} - {{stage_name}}
申请人：{{requester_name}}
时间：{{current_date}} {{current_time}}

请及时处理审批请求。
点击查看详情：{{approval_link}}`,
    isActive: true,
    isDefault: true,
    createdAt: "2026-02-04T10:00:00Z",
    updatedAt: "2026-02-04T10:00:00Z",
    version: 1
  },
  {
    id: "tpl-002",
    name: "审批通过通知",
    type: "approval_approved",
    channel: "wecom",
    content: `【{{system_name}}】审批已通过 ✅

项目：{{project_name}}
阶段：{{stage_code}} - {{stage_name}}
审批人：{{approver_name}}
时间：{{current_date}} {{current_time}}

您的申请已获批准，请继续后续工作。
点击查看详情：{{detail_link}}`,
    isActive: true,
    isDefault: true,
    createdAt: "2026-02-04T10:00:00Z",
    updatedAt: "2026-02-04T10:00:00Z",
    version: 1
  },
  {
    id: "tpl-003",
    name: "审批拒绝通知",
    type: "approval_rejected",
    channel: "wecom",
    content: `【{{system_name}}】审批未通过 ❌

项目：{{project_name}}
阶段：{{stage_code}} - {{stage_name}}
审批人：{{approver_name}}
时间：{{current_date}} {{current_time}}

您的申请未获批准，请查看拒绝原因并进行修改。
点击查看详情：{{detail_link}}`,
    isActive: true,
    isDefault: true,
    createdAt: "2026-02-04T10:00:00Z",
    updatedAt: "2026-02-04T10:00:00Z",
    version: 1
  },
  {
    id: "tpl-004",
    name: "阶段延期预警",
    type: "stage_delayed",
    channel: "email",
    subject: "【预警】{{project_name}} - {{stage_name}} 阶段延期通知",
    content: `尊敬的 {{project_manager}}：

您负责的项目「{{project_name}}」的「{{stage_name}}」阶段出现延期风险。

项目信息：
- 项目编号：{{project_code}}
- 客户名称：{{customer_name}}
- 当前阶段：{{stage_code}} - {{stage_name}}
- 计划工时：{{planned_hours}} 小时
- 实际工时：{{actual_hours}} 小时
- 完成进度：{{progress_percent}}
- 截止日期：{{deadline}}
- 剩余天数：{{remaining_days}} 天

请及时采取措施，确保项目按时交付。

查看详情：{{detail_link}}

此邮件由 {{system_name}} 自动发送，请勿直接回复。`,
    isActive: true,
    isDefault: true,
    createdAt: "2026-02-04T10:00:00Z",
    updatedAt: "2026-02-04T10:00:00Z",
    version: 1
  },
  {
    id: "tpl-005",
    name: "工时预警短信",
    type: "time_tracking_alert",
    channel: "sms",
    content: `【GRT】{{project_name}}项目{{stage_name}}阶段工时超标，已用{{actual_hours}}h/计划{{planned_hours}}h，请关注。`,
    isActive: true,
    isDefault: true,
    createdAt: "2026-02-04T10:00:00Z",
    updatedAt: "2026-02-04T10:00:00Z",
    version: 1
  }
];

// 渠道配置
const CHANNEL_CONFIG: Record<NotificationChannel, { name: string; icon: typeof MessageSquare; color: string }> = {
  wecom: { name: "企业微信", icon: MessageSquare, color: "text-green-500" },
  dingtalk: { name: "钉钉", icon: Bell, color: "text-blue-500" },
  email: { name: "邮件", icon: Mail, color: "text-orange-500" },
  sms: { name: "短信", icon: Smartphone, color: "text-purple-500" },
  system: { name: "系统通知", icon: Bell, color: "text-gray-500" }
};

// 模板类型配置
const TEMPLATE_TYPE_CONFIG: Record<TemplateType, { name: string; description: string }> = {
  approval_request: { name: "审批请求", description: "发送给审批人的审批请求通知" },
  approval_approved: { name: "审批通过", description: "审批通过后发送给申请人的通知" },
  approval_rejected: { name: "审批拒绝", description: "审批拒绝后发送给申请人的通知" },
  stage_started: { name: "阶段开始", description: "阶段开始时发送的通知" },
  stage_completed: { name: "阶段完成", description: "阶段完成时发送的通知" },
  stage_delayed: { name: "阶段延期", description: "阶段延期预警通知" },
  time_tracking_alert: { name: "工时预警", description: "工时超标预警通知" },
  custom: { name: "自定义", description: "自定义模板类型" }
};

// ==================== 组件实现 ====================

interface NotificationTemplateEditorProps {
  projectId?: string;
  stageId?: string;
  onSave?: (template: MessageTemplate) => void;
}

export default function NotificationTemplateEditor({
  projectId,
  stageId,
  onSave
}: NotificationTemplateEditorProps) {
  // 状态管理
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(DEFAULT_TEMPLATES[0]);
  const [editingContent, setEditingContent] = useState(DEFAULT_TEMPLATES[0].content);
  const [editingSubject, setEditingSubject] = useState(DEFAULT_TEMPLATES[0].subject || "");
  const [editingName, setEditingName] = useState(DEFAULT_TEMPLATES[0].name);
  const [selectedChannel, setSelectedChannel] = useState<NotificationChannel>("wecom");
  const [selectedType, setSelectedType] = useState<TemplateType>("approval_request");
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchVariable, setSearchVariable] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 模拟预览数据
  const previewData: Record<string, string> = {
    "{{project_name}}": "5000T清洗设备项目",
    "{{project_code}}": "PRJ-2026-001",
    "{{customer_name}}": "德国大众汽车",
    "{{project_manager}}": "张工",
    "{{stage_code}}": "T6",
    "{{stage_name}}": "电气组装",
    "{{stage_status}}": "进行中",
    "{{planned_hours}}": "40",
    "{{actual_hours}}": "35",
    "{{progress_percent}}": "75%",
    "{{approver_name}}": "李经理",
    "{{requester_name}}": "王工程师",
    "{{operator_name}}": "赵技术员",
    "{{operator_role}}": "电气工程师",
    "{{current_date}}": new Date().toISOString().split("T")[0],
    "{{current_time}}": new Date().toTimeString().split(" ")[0],
    "{{deadline}}": "2026-02-10",
    "{{remaining_days}}": "6",
    "{{system_name}}": "GRT智能系统",
    "{{approval_link}}": "https://grt.com/approve/123",
    "{{detail_link}}": "https://grt.com/project/123"
  };

  // 过滤变量
  const filteredVariables = useMemo(() => {
    if (!searchVariable) return TEMPLATE_VARIABLES;
    const search = searchVariable.toLowerCase();
    return TEMPLATE_VARIABLES.filter(
      v => v.name.toLowerCase().includes(search) || 
           v.key.toLowerCase().includes(search) ||
           v.description.toLowerCase().includes(search)
    );
  }, [searchVariable]);

  // 按类别分组变量
  const groupedVariables = useMemo(() => {
    const groups: Record<string, TemplateVariable[]> = {
      project: [],
      stage: [],
      user: [],
      time: [],
      system: []
    };
    filteredVariables.forEach(v => {
      groups[v.category].push(v);
    });
    return groups;
  }, [filteredVariables]);

  // 渲染预览内容
  const renderPreview = useCallback((content: string) => {
    let result = content;
    Object.entries(previewData).forEach(([key, value]) => {
      result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
    });
    return result;
  }, [previewData]);

  // 插入变量
  const insertVariable = useCallback((variable: string) => {
    const textarea = document.getElementById("template-content") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = editingContent.substring(0, start) + variable + editingContent.substring(end);
      setEditingContent(newContent);
      setHasUnsavedChanges(true);
      // 设置光标位置
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      setEditingContent(prev => prev + variable);
      setHasUnsavedChanges(true);
    }
  }, [editingContent]);

  // 选择模板
  const handleSelectTemplate = useCallback((template: MessageTemplate) => {
    if (hasUnsavedChanges) {
      if (!confirm("有未保存的更改，确定要切换模板吗？")) {
        return;
      }
    }
    setSelectedTemplate(template);
    setEditingContent(template.content);
    setEditingSubject(template.subject || "");
    setEditingName(template.name);
    setSelectedChannel(template.channel);
    setSelectedType(template.type);
    setHasUnsavedChanges(false);
    setIsCreatingNew(false);
  }, [hasUnsavedChanges]);

  // 创建新模板
  const handleCreateNew = useCallback(() => {
    setIsCreatingNew(true);
    setSelectedTemplate(null);
    setEditingContent("");
    setEditingSubject("");
    setEditingName("新模板");
    setHasUnsavedChanges(false);
  }, []);

  // 保存模板
  const handleSave = useCallback(() => {
    if (!editingName.trim()) {
      toast.error("请输入模板名称");
      return;
    }
    if (!editingContent.trim()) {
      toast.error("请输入模板内容");
      return;
    }

    const now = new Date().toISOString();
    
    if (isCreatingNew) {
      // 创建新模板
      const newTemplate: MessageTemplate = {
        id: `tpl-${Date.now()}`,
        name: editingName,
        type: selectedType,
        channel: selectedChannel,
        subject: selectedChannel === "email" ? editingSubject : undefined,
        content: editingContent,
        isActive: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
        version: 1
      };
      setTemplates(prev => [...prev, newTemplate]);
      setSelectedTemplate(newTemplate);
      setIsCreatingNew(false);
      toast.success("模板创建成功");
      onSave?.(newTemplate);
    } else if (selectedTemplate) {
      // 更新现有模板
      const updatedTemplate: MessageTemplate = {
        ...selectedTemplate,
        name: editingName,
        type: selectedType,
        channel: selectedChannel,
        subject: selectedChannel === "email" ? editingSubject : undefined,
        content: editingContent,
        updatedAt: now,
        version: selectedTemplate.version + 1
      };
      setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
      setSelectedTemplate(updatedTemplate);
      toast.success("模板保存成功");
      onSave?.(updatedTemplate);
    }
    
    setHasUnsavedChanges(false);
  }, [editingName, editingContent, editingSubject, selectedChannel, selectedType, isCreatingNew, selectedTemplate, onSave]);

  // 删除模板
  const handleDelete = useCallback(() => {
    if (!selectedTemplate) return;
    if (selectedTemplate.isDefault) {
      toast.error("默认模板不能删除");
      return;
    }
    if (!confirm("确定要删除这个模板吗？")) return;
    
    setTemplates(prev => prev.filter(t => t.id !== selectedTemplate.id));
    setSelectedTemplate(templates[0] || null);
    if (templates[0]) {
      setEditingContent(templates[0].content);
      setEditingSubject(templates[0].subject || "");
      setEditingName(templates[0].name);
    }
    toast.success("模板已删除");
  }, [selectedTemplate, templates]);

  // 复制模板
  const handleCopy = useCallback(() => {
    if (!selectedTemplate) return;
    
    const now = new Date().toISOString();
    const newTemplate: MessageTemplate = {
      ...selectedTemplate,
      id: `tpl-${Date.now()}`,
      name: `${selectedTemplate.name} (副本)`,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      version: 1
    };
    setTemplates(prev => [...prev, newTemplate]);
    setSelectedTemplate(newTemplate);
    setEditingName(newTemplate.name);
    toast.success("模板已复制");
  }, [selectedTemplate]);

  // 重置为默认
  const handleReset = useCallback(() => {
    if (!selectedTemplate) return;
    const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.type === selectedTemplate.type && t.channel === selectedTemplate.channel);
    if (defaultTemplate) {
      setEditingContent(defaultTemplate.content);
      setEditingSubject(defaultTemplate.subject || "");
      setHasUnsavedChanges(true);
      toast.info("已重置为默认模板");
    } else {
      toast.warning("没有找到对应的默认模板");
    }
  }, [selectedTemplate]);

  // 切换模板状态
  const handleToggleActive = useCallback((template: MessageTemplate) => {
    setTemplates(prev => prev.map(t => 
      t.id === template.id ? { ...t, isActive: !t.isActive } : t
    ));
    toast.success(template.isActive ? "模板已禁用" : "模板已启用");
  }, []);

  // 变量类别名称
  const categoryNames: Record<string, string> = {
    project: "项目信息",
    stage: "阶段信息",
    user: "用户信息",
    time: "时间信息",
    system: "系统信息"
  };

  return (
    <div className="h-full flex flex-col bg-[#0B1120] text-gray-100">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <FileText className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">通知消息模板编辑器</h2>
            <p className="text-xs text-gray-500">自定义审批通知的消息模板</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
              <AlertCircle className="w-3 h-3 mr-1" />
              未保存
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(true)}
            className="border-gray-700 hover:bg-gray-800"
          >
            <History className="w-4 h-4 mr-1" />
            历史
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="border-gray-700 hover:bg-gray-800"
          >
            <Eye className="w-4 h-4 mr-1" />
            {showPreview ? "编辑" : "预览"}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-orange-500 hover:bg-orange-600"
            disabled={!hasUnsavedChanges && !isCreatingNew}
          >
            <Save className="w-4 h-4 mr-1" />
            保存
          </Button>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧模板列表 */}
        <div className="w-64 border-r border-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNew}
              className="w-full border-dashed border-gray-700 hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-1" />
              新建模板
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {templates.map(template => {
                const ChannelIcon = CHANNEL_CONFIG[template.channel].icon;
                const isSelected = selectedTemplate?.id === template.id && !isCreatingNew;
                
                return (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`
                      p-3 rounded-lg cursor-pointer transition-colors
                      ${isSelected ? "bg-orange-500/20 border border-orange-500/50" : "hover:bg-gray-800/50 border border-transparent"}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <ChannelIcon className={`w-4 h-4 ${CHANNEL_CONFIG[template.channel].color}`} />
                        <span className="text-sm font-medium truncate max-w-[140px]">{template.name}</span>
                      </div>
                      <Switch
                        checked={template.isActive}
                        onCheckedChange={() => handleToggleActive(template)}
                        className="scale-75"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] bg-gray-800">
                        {TEMPLATE_TYPE_CONFIG[template.type].name}
                      </Badge>
                      {template.isDefault && (
                        <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-400">
                          默认
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* 中间编辑区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 模板配置 */}
          <div className="p-4 border-b border-gray-800 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-400">模板名称</Label>
                <Input
                  value={editingName}
                  onChange={(e) => {
                    setEditingName(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="bg-gray-900 border-gray-700"
                  placeholder="输入模板名称"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">通知渠道</Label>
                <Select
                  value={selectedChannel}
                  onValueChange={(value: NotificationChannel) => {
                    setSelectedChannel(value);
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHANNEL_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${config.color}`} />
                            {config.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">模板类型</Label>
                <Select
                  value={selectedType}
                  onValueChange={(value: TemplateType) => {
                    setSelectedType(value);
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 邮件主题（仅邮件渠道） */}
            {selectedChannel === "email" && (
              <div className="space-y-2">
                <Label className="text-gray-400">邮件主题</Label>
                <Input
                  value={editingSubject}
                  onChange={(e) => {
                    setEditingSubject(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="bg-gray-900 border-gray-700"
                  placeholder="输入邮件主题，支持变量插入"
                />
              </div>
            )}
          </div>

          {/* 编辑/预览区 */}
          <div className="flex-1 p-4 overflow-hidden">
            {showPreview ? (
              <Card className="h-full bg-gray-900/50 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-orange-500" />
                    消息预览
                  </CardTitle>
                  <CardDescription>使用模拟数据渲染的预览效果</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100%-80px)]">
                    {selectedChannel === "email" && editingSubject && (
                      <div className="mb-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                        <div className="text-xs text-gray-500 mb-1">主题</div>
                        <div className="font-medium">{renderPreview(editingSubject)}</div>
                      </div>
                    )}
                    <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 whitespace-pre-wrap font-mono text-sm">
                      {renderPreview(editingContent)}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-400">模板内容</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="h-7 text-xs text-gray-500 hover:text-gray-300"
                    >
                      <Undo2 className="w-3 h-3 mr-1" />
                      重置
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-7 text-xs text-gray-500 hover:text-gray-300"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      复制
                    </Button>
                    {selectedTemplate && !selectedTemplate.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        className="h-7 text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        删除
                      </Button>
                    )}
                  </div>
                </div>
                <Textarea
                  id="template-content"
                  value={editingContent}
                  onChange={(e) => {
                    setEditingContent(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="flex-1 bg-gray-900 border-gray-700 font-mono text-sm resize-none"
                  placeholder="输入模板内容，使用 {{变量名}} 插入动态数据"
                />
              </div>
            )}
          </div>
        </div>

        {/* 右侧变量面板 */}
        <div className="w-72 border-l border-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <Variable className="w-4 h-4 text-orange-500" />
              <span className="font-medium">可用变量</span>
            </div>
            <Input
              value={searchVariable}
              onChange={(e) => setSearchVariable(e.target.value)}
              className="bg-gray-900 border-gray-700 h-8 text-sm"
              placeholder="搜索变量..."
            />
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-4">
              {Object.entries(groupedVariables).map(([category, variables]) => {
                if (variables.length === 0) return null;
                return (
                  <div key={category}>
                    <div className="text-xs font-medium text-gray-500 mb-2 px-2">
                      {categoryNames[category]}
                    </div>
                    <div className="space-y-1">
                      {variables.map(variable => (
                        <div
                          key={variable.key}
                          onClick={() => insertVariable(variable.key)}
                          className="p-2 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <code className="text-xs text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
                              {variable.key}
                            </code>
                            <Plus className="w-3 h-3 text-gray-600 group-hover:text-orange-500 transition-colors" />
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{variable.name}</div>
                          <div className="text-[10px] text-gray-600 mt-0.5">{variable.description}</div>
                          <div className="text-[10px] text-gray-700 mt-0.5">
                            示例: <span className="text-gray-500">{variable.example}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* 历史记录对话框 */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="bg-[#0B1120] border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-orange-500" />
              模板历史记录
            </DialogTitle>
            <DialogDescription>
              查看和恢复模板的历史版本
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center text-gray-500 py-8">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无历史记录</p>
              <p className="text-xs mt-1">模板修改后将自动保存历史版本</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistory(false)} className="border-gray-700">
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
