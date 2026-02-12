/**
 * ApprovalRuleConfigurator.tsx
 * 审批流程规则配置器组件
 * 
 * 功能：
 * - 可视化规则编辑器
 * - 为不同阶段配置审批人
 * - 配置审批条件和超时规则
 * - 支持多级审批流程
 */

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Settings2,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit3,
  Save,
  Copy,
  ArrowRight,
  ArrowDown,
  GitBranch,
  Shield,
  Zap,
  Bell,
  Mail,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  GripVertical,
  MoreVertical,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  Timer,
  Calendar,
  Target,
  Workflow
} from "lucide-react";

// ==================== 类型定义 ====================

// 审批人类型
type ApproverType = 
  | "role"           // 按角色
  | "user"           // 指定用户
  | "department"     // 部门负责人
  | "project_manager" // 项目经理
  | "superior"       // 直属上级
  | "custom";        // 自定义

// 审批条件类型
type ConditionType = 
  | "always"         // 始终需要
  | "amount_threshold" // 金额阈值
  | "time_threshold"   // 工时阈值
  | "risk_level"       // 风险等级
  | "customer_tier"    // 客户等级
  | "custom_expression"; // 自定义表达式

// 超时动作
type TimeoutAction = 
  | "escalate"       // 升级
  | "auto_approve"   // 自动通过
  | "auto_reject"    // 自动拒绝
  | "notify_only";   // 仅通知

// 审批人配置
interface ApproverConfig {
  id: string;
  type: ApproverType;
  value: string;        // 角色名/用户ID/部门ID等
  displayName: string;
  order: number;        // 审批顺序
  isRequired: boolean;  // 是否必须
  canDelegate: boolean; // 是否可委托
}

// 审批条件
interface ApprovalCondition {
  id: string;
  type: ConditionType;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "in" | "not_in";
  value: string | number | boolean | string[];
  description: string;
}

// 超时规则
interface TimeoutRule {
  id: string;
  hours: number;
  action: TimeoutAction;
  escalateTo?: string;  // 升级目标
  notifyChannels: string[];
  reminderIntervals: number[]; // 提醒间隔（小时）
}

// 通知配置
interface NotificationConfig {
  onSubmit: boolean;
  onApprove: boolean;
  onReject: boolean;
  onTimeout: boolean;
  channels: ("email" | "wecom" | "dingtalk" | "sms" | "system")[];
}

// 审批规则
interface ApprovalRule {
  id: string;
  name: string;
  description: string;
  stageCode: string;    // T1-T15
  stageName: string;
  isActive: boolean;
  approvalMode: "sequential" | "parallel" | "any"; // 顺序/并行/任一
  approvers: ApproverConfig[];
  conditions: ApprovalCondition[];
  timeoutRule: TimeoutRule;
  notifications: NotificationConfig;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// ==================== 常量定义 ====================

// T1-T15阶段定义
const STAGES = [
  { code: "T1", name: "机加工", role: "机加工工程师" },
  { code: "T2", name: "钣金焊接", role: "钣金工程师" },
  { code: "T3", name: "表面处理", role: "表面处理工程师" },
  { code: "T4", name: "机械组装", role: "机械工程师" },
  { code: "T5", name: "管路安装", role: "管路工程师" },
  { code: "T6", name: "电气组装", role: "电气工程师" },
  { code: "T7", name: "软件调试", role: "软件工程师" },
  { code: "T8", name: "整机调试", role: "调试工程师" },
  { code: "T9", name: "质量检验", role: "质量工程师" },
  { code: "T10", name: "包装发运", role: "物流专员" },
  { code: "T11", name: "现场安装", role: "现场工程师" },
  { code: "T12", name: "客户培训", role: "培训工程师" },
  { code: "T13", name: "验收测试", role: "验收工程师" },
  { code: "T14", name: "文档交付", role: "文档工程师" },
  { code: "T15", name: "项目结项", role: "项目经理" },
];

// 可用角色
const AVAILABLE_ROLES = [
  { id: "project_manager", name: "项目经理" },
  { id: "dept_manager", name: "部门经理" },
  { id: "quality_manager", name: "质量经理" },
  { id: "production_manager", name: "生产经理" },
  { id: "technical_director", name: "技术总监" },
  { id: "general_manager", name: "总经理" },
  { id: "finance_manager", name: "财务经理" },
  { id: "hr_manager", name: "人事经理" },
];

// 默认审批规则
const DEFAULT_RULES: ApprovalRule[] = (STAGES.map((stage, index) => ({
  id: `rule-${stage.code}`,
  name: `${stage.code} ${stage.name} 审批规则`,
  description: `${stage.name}阶段的默认审批流程`,
  stageCode: stage.code,
  stageName: stage.name,
  isActive: true,
  approvalMode: "sequential",
  approvers: [
    {
      id: `approver-${stage.code}-1`,
      type: "role",
      value: stage.role,
      displayName: stage.role,
      order: 1,
      isRequired: true,
      canDelegate: true,
    },
    {
      id: `approver-${stage.code}-2`,
      type: "project_manager",
      value: "project_manager",
      displayName: "项目经理",
      order: 2,
      isRequired: true,
      canDelegate: false,
    },
  ],
  conditions: [
    {
      id: `cond-${stage.code}-1`,
      type: "always",
      operator: "eq",
      value: true,
      description: "始终需要审批",
    },
  ],
  timeoutRule: {
    id: `timeout-${stage.code}`,
    hours: 24,
    action: "escalate",
    escalateTo: "dept_manager",
    notifyChannels: ["email", "wecom"],
    reminderIntervals: [4, 8, 16],
  },
  notifications: {
    onSubmit: true,
    onApprove: true,
    onReject: true,
    onTimeout: true,
    channels: ["email", "wecom", "system"],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 1,
})) as unknown as ApprovalRule[]);

// ==================== 组件实现 ====================

interface ApprovalRuleConfiguratorProps {
  projectId?: string;
  onSave?: (rules: ApprovalRule[]) => void;
}

export default function ApprovalRuleConfigurator({
  projectId,
  onSave
}: ApprovalRuleConfiguratorProps) {
  // 状态管理
  const [rules, setRules] = useState<ApprovalRule[]>(DEFAULT_RULES);
  const [selectedRule, setSelectedRule] = useState<ApprovalRule | null>(DEFAULT_RULES[0]);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [showAddApprover, setShowAddApprover] = useState(false);
  const [showAddCondition, setShowAddCondition] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set(["T1"]));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "flow">("list");

  // 新审批人表单状态
  const [newApprover, setNewApprover] = useState<Partial<ApproverConfig>>({
    type: "role",
    value: "",
    displayName: "",
    isRequired: true,
    canDelegate: true,
  });

  // 新条件表单状态
  const [newCondition, setNewCondition] = useState<Partial<ApprovalCondition>>({
    type: "always",
    operator: "eq",
    value: "",
    description: "",
  });

  // 切换阶段展开状态
  const toggleStageExpand = useCallback((stageCode: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageCode)) {
        next.delete(stageCode);
      } else {
        next.add(stageCode);
      }
      return next;
    });
  }, []);

  // 选择规则
  const handleSelectRule = useCallback((rule: ApprovalRule) => {
    setSelectedRule(rule);
    setEditingRule({ ...rule });
  }, []);

  // 更新编辑中的规则
  const updateEditingRule = useCallback((updates: Partial<ApprovalRule>) => {
    if (!editingRule) return;
    setEditingRule({ ...editingRule, ...updates });
    setHasUnsavedChanges(true);
  }, [editingRule]);

  // 添加审批人
  const handleAddApprover = useCallback(() => {
    if (!editingRule || !newApprover.value) {
      toast.error("请选择审批人");
      return;
    }

    const approver: ApproverConfig = {
      id: `approver-${Date.now()}`,
      type: newApprover.type as ApproverType,
      value: newApprover.value,
      displayName: newApprover.displayName || newApprover.value,
      order: editingRule.approvers.length + 1,
      isRequired: newApprover.isRequired ?? true,
      canDelegate: newApprover.canDelegate ?? true,
    };

    updateEditingRule({
      approvers: [...editingRule.approvers, approver],
    });

    setNewApprover({
      type: "role",
      value: "",
      displayName: "",
      isRequired: true,
      canDelegate: true,
    });
    setShowAddApprover(false);
    toast.success("审批人已添加");
  }, [editingRule, newApprover, updateEditingRule]);

  // 删除审批人
  const handleRemoveApprover = useCallback((approverId: string) => {
    if (!editingRule) return;
    updateEditingRule({
      approvers: editingRule.approvers.filter(a => a.id !== approverId),
    });
    toast.success("审批人已删除");
  }, [editingRule, updateEditingRule]);

  // 添加条件
  const handleAddCondition = useCallback(() => {
    if (!editingRule) return;

    const condition: ApprovalCondition = {
      id: `cond-${Date.now()}`,
      type: newCondition.type as ConditionType,
      operator: newCondition.operator as any,
      value: newCondition.value || "",
      description: newCondition.description || "",
    };

    updateEditingRule({
      conditions: [...editingRule.conditions, condition],
    });

    setNewCondition({
      type: "always",
      operator: "eq",
      value: "",
      description: "",
    });
    setShowAddCondition(false);
    toast.success("条件已添加");
  }, [editingRule, newCondition, updateEditingRule]);

  // 删除条件
  const handleRemoveCondition = useCallback((conditionId: string) => {
    if (!editingRule) return;
    updateEditingRule({
      conditions: editingRule.conditions.filter(c => c.id !== conditionId),
    });
    toast.success("条件已删除");
  }, [editingRule, updateEditingRule]);

  // 保存规则
  const handleSaveRule = useCallback(() => {
    if (!editingRule) return;

    const updatedRule = {
      ...editingRule,
      updatedAt: new Date().toISOString(),
      version: editingRule.version + 1,
    };

    setRules(prev => prev.map(r => r.id === updatedRule.id ? updatedRule : r));
    setSelectedRule(updatedRule);
    setHasUnsavedChanges(false);
    toast.success("规则已保存");
    onSave?.(rules.map(r => r.id === updatedRule.id ? updatedRule : r));
  }, [editingRule, rules, onSave]);

  // 重置规则
  const handleResetRule = useCallback(() => {
    if (!selectedRule) return;
    setEditingRule({ ...selectedRule });
    setHasUnsavedChanges(false);
    toast.info("已重置为保存的版本");
  }, [selectedRule]);

  // 切换规则激活状态
  const handleToggleActive = useCallback((ruleId: string) => {
    setRules(prev => prev.map(r => 
      r.id === ruleId ? { ...r, isActive: !r.isActive } : r
    ));
    toast.success("规则状态已更新");
  }, []);

  // 获取审批人类型图标
  const getApproverTypeIcon = (type: ApproverType) => {
    switch (type) {
      case "role": return Users;
      case "user": return UserCheck;
      case "department": return Shield;
      case "project_manager": return Target;
      case "superior": return ChevronRight;
      default: return Users;
    }
  };

  // 获取条件类型名称
  const getConditionTypeName = (type: ConditionType) => {
    const names: Record<ConditionType, string> = {
      always: "始终需要",
      amount_threshold: "金额阈值",
      time_threshold: "工时阈值",
      risk_level: "风险等级",
      customer_tier: "客户等级",
      custom_expression: "自定义表达式",
    };
    return names[type];
  };

  // 获取超时动作名称
  const getTimeoutActionName = (action: TimeoutAction) => {
    const names: Record<TimeoutAction, string> = {
      escalate: "升级处理",
      auto_approve: "自动通过",
      auto_reject: "自动拒绝",
      notify_only: "仅发通知",
    };
    return names[action];
  };

  return (
    <div className="h-full flex flex-col bg-[#0B1120] text-gray-100">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Workflow className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">审批流程规则配置</h2>
            <p className="text-xs text-gray-500">为T1-T15阶段配置审批人、条件和超时规则</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
              <AlertTriangle className="w-3 h-3 mr-1" />
              未保存
            </Badge>
          )}
          <div className="flex items-center border border-gray-700 rounded-lg p-0.5">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-7"
            >
              列表
            </Button>
            <Button
              variant={viewMode === "flow" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("flow")}
              className="h-7"
            >
              流程图
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetRule}
            className="border-gray-700 hover:bg-gray-800"
            disabled={!hasUnsavedChanges}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            重置
          </Button>
          <Button
            size="sm"
            onClick={handleSaveRule}
            className="bg-orange-500 hover:bg-orange-600"
            disabled={!hasUnsavedChanges}
          >
            <Save className="w-4 h-4 mr-1" />
            保存
          </Button>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧阶段列表 */}
        <div className="w-72 border-r border-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <div className="text-sm font-medium text-gray-400 mb-2">生产阶段 (T1-T15)</div>
            <div className="text-xs text-gray-600">点击阶段配置审批规则</div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {STAGES.map(stage => {
                const rule = rules.find(r => r.stageCode === stage.code);
                const isSelected = selectedRule?.stageCode === stage.code;
                const isExpanded = expandedStages.has(stage.code);
                
                return (
                  <div key={stage.code}>
                    <div
                      onClick={() => {
                        handleSelectRule(rule!);
                        toggleStageExpand(stage.code);
                      }}
                      className={`
                        p-3 rounded-lg cursor-pointer transition-colors
                        ${isSelected ? "bg-orange-500/20 border border-orange-500/50" : "hover:bg-gray-800/50 border border-transparent"}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                          <Badge 
                            variant="outline" 
                            className={`
                              text-xs font-mono
                              ${rule?.isActive ? "border-emerald-500/50 text-emerald-400" : "border-gray-600 text-gray-500"}
                            `}
                          >
                            {stage.code}
                          </Badge>
                          <span className="text-sm font-medium">{stage.name}</span>
                        </div>
                        <Switch
                          checked={rule?.isActive ?? false}
                          onCheckedChange={() => handleToggleActive(rule?.id || "")}
                          className="scale-75"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      {isExpanded && rule && (
                        <div className="mt-2 pl-6 space-y-1 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {rule.approvers.length} 个审批人
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            超时 {rule.timeoutRule.hours}h
                          </div>
                          <div className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {rule.approvalMode === "sequential" ? "顺序审批" : 
                             rule.approvalMode === "parallel" ? "并行审批" : "任一审批"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* 右侧配置区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {editingRule ? (
            <Tabs defaultValue="approvers" className="flex-1 flex flex-col">
              <div className="border-b border-gray-800 px-4">
                <TabsList className="bg-transparent">
                  <TabsTrigger value="approvers" className="data-[state=active]:bg-gray-800">
                    <Users className="w-4 h-4 mr-1" />
                    审批人
                  </TabsTrigger>
                  <TabsTrigger value="conditions" className="data-[state=active]:bg-gray-800">
                    <GitBranch className="w-4 h-4 mr-1" />
                    条件
                  </TabsTrigger>
                  <TabsTrigger value="timeout" className="data-[state=active]:bg-gray-800">
                    <Clock className="w-4 h-4 mr-1" />
                    超时
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="data-[state=active]:bg-gray-800">
                    <Bell className="w-4 h-4 mr-1" />
                    通知
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* 审批人配置 */}
              <TabsContent value="approvers" className="flex-1 overflow-auto p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">审批人配置</h3>
                    <p className="text-xs text-gray-500 mt-1">配置{editingRule.stageName}阶段的审批人员</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={editingRule.approvalMode}
                      onValueChange={(value: "sequential" | "parallel" | "any") => 
                        updateEditingRule({ approvalMode: value })
                      }
                    >
                      <SelectTrigger className="w-32 bg-gray-900 border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sequential">顺序审批</SelectItem>
                        <SelectItem value="parallel">并行审批</SelectItem>
                        <SelectItem value="any">任一审批</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => setShowAddApprover(true)}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加审批人
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {editingRule.approvers.map((approver, index) => {
                    const Icon = getApproverTypeIcon(approver.type);
                    return (
                      <Card key={approver.id} className="bg-gray-900/50 border-gray-800">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 font-mono text-sm">
                                {index + 1}
                              </div>
                              <div className="p-2 rounded-lg bg-gray-800">
                                <Icon className="w-4 h-4 text-gray-400" />
                              </div>
                              <div>
                                <div className="font-medium">{approver.displayName}</div>
                                <div className="text-xs text-gray-500">
                                  {approver.type === "role" && "按角色"}
                                  {approver.type === "user" && "指定用户"}
                                  {approver.type === "department" && "部门负责人"}
                                  {approver.type === "project_manager" && "项目经理"}
                                  {approver.type === "superior" && "直属上级"}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {approver.isRequired && (
                                <Badge variant="outline" className="border-red-500/50 text-red-400 text-xs">
                                  必须
                                </Badge>
                              )}
                              {approver.canDelegate && (
                                <Badge variant="outline" className="border-blue-500/50 text-blue-400 text-xs">
                                  可委托
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveApprover(approver.id)}
                                className="h-8 w-8 p-0 text-gray-500 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {editingRule.approvers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>暂无审批人</p>
                      <p className="text-xs mt-1">点击"添加审批人"配置审批流程</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* 条件配置 */}
              <TabsContent value="conditions" className="flex-1 overflow-auto p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">审批条件</h3>
                    <p className="text-xs text-gray-500 mt-1">配置触发审批的条件</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowAddCondition(true)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加条件
                  </Button>
                </div>

                <div className="space-y-2">
                  {editingRule.conditions.map((condition) => (
                    <Card key={condition.id} className="bg-gray-900/50 border-gray-800">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gray-800">
                              <GitBranch className="w-4 h-4 text-gray-400" />
                            </div>
                            <div>
                              <div className="font-medium">{getConditionTypeName(condition.type)}</div>
                              <div className="text-xs text-gray-500">
                                {condition.description || `${condition.operator} ${condition.value}`}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCondition(condition.id)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {editingRule.conditions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>暂无条件</p>
                      <p className="text-xs mt-1">默认始终需要审批</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* 超时配置 */}
              <TabsContent value="timeout" className="flex-1 overflow-auto p-4 space-y-4">
                <div>
                  <h3 className="font-medium">超时规则</h3>
                  <p className="text-xs text-gray-500 mt-1">配置审批超时后的处理方式</p>
                </div>

                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-gray-400">超时时间（小时）</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[editingRule.timeoutRule.hours]}
                          onValueChange={([value]) => updateEditingRule({
                            timeoutRule: { ...editingRule.timeoutRule, hours: value }
                          })}
                          max={72}
                          min={1}
                          step={1}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={editingRule.timeoutRule.hours}
                          onChange={(e) => updateEditingRule({
                            timeoutRule: { ...editingRule.timeoutRule, hours: parseInt(e.target.value) || 24 }
                          })}
                          className="w-20 bg-gray-900 border-gray-700"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-400">超时动作</Label>
                      <Select
                        value={editingRule.timeoutRule.action}
                        onValueChange={(value: TimeoutAction) => updateEditingRule({
                          timeoutRule: { ...editingRule.timeoutRule, action: value }
                        })}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="escalate">升级处理</SelectItem>
                          <SelectItem value="auto_approve">自动通过</SelectItem>
                          <SelectItem value="auto_reject">自动拒绝</SelectItem>
                          <SelectItem value="notify_only">仅发通知</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {editingRule.timeoutRule.action === "escalate" && (
                      <div className="space-y-2">
                        <Label className="text-gray-400">升级目标</Label>
                        <Select
                          value={editingRule.timeoutRule.escalateTo}
                          onValueChange={(value) => updateEditingRule({
                            timeoutRule: { ...editingRule.timeoutRule, escalateTo: value }
                          })}
                        >
                          <SelectTrigger className="bg-gray-900 border-gray-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_ROLES.map(role => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-gray-400">提醒间隔（小时）</Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {editingRule.timeoutRule.reminderIntervals.map((interval, index) => (
                          <Badge key={index} variant="secondary" className="bg-gray-800">
                            {interval}h
                            <button
                              onClick={() => {
                                const newIntervals = [...editingRule.timeoutRule.reminderIntervals];
                                newIntervals.splice(index, 1);
                                updateEditingRule({
                                  timeoutRule: { ...editingRule.timeoutRule, reminderIntervals: newIntervals }
                                });
                              }}
                              className="ml-1 hover:text-red-400"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newInterval = Math.max(...editingRule.timeoutRule.reminderIntervals, 0) + 4;
                            updateEditingRule({
                              timeoutRule: {
                                ...editingRule.timeoutRule,
                                reminderIntervals: [...editingRule.timeoutRule.reminderIntervals, newInterval]
                              }
                            });
                          }}
                          className="h-6 border-dashed border-gray-700"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 通知配置 */}
              <TabsContent value="notifications" className="flex-1 overflow-auto p-4 space-y-4">
                <div>
                  <h3 className="font-medium">通知设置</h3>
                  <p className="text-xs text-gray-500 mt-1">配置审批流程中的通知方式</p>
                </div>

                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-3">
                      <Label className="text-gray-400">触发事件</Label>
                      <div className="space-y-2">
                        {[
                          { key: "onSubmit", label: "提交审批时", icon: Zap },
                          { key: "onApprove", label: "审批通过时", icon: CheckCircle2 },
                          { key: "onReject", label: "审批拒绝时", icon: XCircle },
                          { key: "onTimeout", label: "审批超时时", icon: Clock },
                        ].map(({ key, label, icon: Icon }) => (
                          <div key={key} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800/50">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-gray-500" />
                              <span className="text-sm">{label}</span>
                            </div>
                            <Switch
                              checked={editingRule.notifications[key as keyof NotificationConfig] as boolean}
                              onCheckedChange={(checked) => updateEditingRule({
                                notifications: { ...editingRule.notifications, [key]: checked }
                              })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-gray-800" />

                    <div className="space-y-3">
                      <Label className="text-gray-400">通知渠道</Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: "email", label: "邮件", icon: Mail },
                          { key: "wecom", label: "企业微信", icon: MessageSquare },
                          { key: "dingtalk", label: "钉钉", icon: Bell },
                          { key: "sms", label: "短信", icon: MessageSquare },
                          { key: "system", label: "系统通知", icon: Bell },
                        ].map(({ key, label, icon: Icon }) => {
                          const isActive = editingRule.notifications.channels.includes(key as any);
                          return (
                            <Button
                              key={key}
                              variant={isActive ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => {
                                const channels = isActive
                                  ? editingRule.notifications.channels.filter(c => c !== key)
                                  : [...editingRule.notifications.channels, key as any];
                                updateEditingRule({
                                  notifications: { ...editingRule.notifications, channels }
                                });
                              }}
                              className={isActive ? "bg-orange-500/20 border-orange-500/50" : "border-gray-700"}
                            >
                              <Icon className="w-4 h-4 mr-1" />
                              {label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Settings2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>选择一个阶段开始配置</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 添加审批人对话框 */}
      <Dialog open={showAddApprover} onOpenChange={setShowAddApprover}>
        <DialogContent className="bg-[#0B1120] border-gray-800">
          <DialogHeader>
            <DialogTitle>添加审批人</DialogTitle>
            <DialogDescription>配置新的审批人员</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>审批人类型</Label>
              <Select
                value={newApprover.type}
                onValueChange={(value: ApproverType) => setNewApprover({ ...newApprover, type: value })}
              >
                <SelectTrigger className="bg-gray-900 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role">按角色</SelectItem>
                  <SelectItem value="user">指定用户</SelectItem>
                  <SelectItem value="department">部门负责人</SelectItem>
                  <SelectItem value="project_manager">项目经理</SelectItem>
                  <SelectItem value="superior">直属上级</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newApprover.type === "role" && (
              <div className="space-y-2">
                <Label>选择角色</Label>
                <Select
                  value={newApprover.value}
                  onValueChange={(value) => {
                    const role = AVAILABLE_ROLES.find(r => r.id === value);
                    setNewApprover({ 
                      ...newApprover, 
                      value, 
                      displayName: role?.name || value 
                    });
                  }}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700">
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ROLES.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>必须审批</Label>
              <Switch
                checked={newApprover.isRequired}
                onCheckedChange={(checked) => setNewApprover({ ...newApprover, isRequired: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>允许委托</Label>
              <Switch
                checked={newApprover.canDelegate}
                onCheckedChange={(checked) => setNewApprover({ ...newApprover, canDelegate: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddApprover(false)} className="border-gray-700">
              取消
            </Button>
            <Button onClick={handleAddApprover} className="bg-orange-500 hover:bg-orange-600">
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加条件对话框 */}
      <Dialog open={showAddCondition} onOpenChange={setShowAddCondition}>
        <DialogContent className="bg-[#0B1120] border-gray-800">
          <DialogHeader>
            <DialogTitle>添加审批条件</DialogTitle>
            <DialogDescription>配置触发审批的条件</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>条件类型</Label>
              <Select
                value={newCondition.type}
                onValueChange={(value: ConditionType) => setNewCondition({ ...newCondition, type: value })}
              >
                <SelectTrigger className="bg-gray-900 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">始终需要</SelectItem>
                  <SelectItem value="amount_threshold">金额阈值</SelectItem>
                  <SelectItem value="time_threshold">工时阈值</SelectItem>
                  <SelectItem value="risk_level">风险等级</SelectItem>
                  <SelectItem value="customer_tier">客户等级</SelectItem>
                  <SelectItem value="custom_expression">自定义表达式</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newCondition.type !== "always" && (
              <>
                <div className="space-y-2">
                  <Label>运算符</Label>
                  <Select
                    value={newCondition.operator}
                    onValueChange={(value: any) => setNewCondition({ ...newCondition, operator: value })}
                  >
                    <SelectTrigger className="bg-gray-900 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gt">大于</SelectItem>
                      <SelectItem value="gte">大于等于</SelectItem>
                      <SelectItem value="lt">小于</SelectItem>
                      <SelectItem value="lte">小于等于</SelectItem>
                      <SelectItem value="eq">等于</SelectItem>
                      <SelectItem value="neq">不等于</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>阈值</Label>
                  <Input
                    value={newCondition.value as string}
                    onChange={(e) => setNewCondition({ ...newCondition, value: e.target.value })}
                    className="bg-gray-900 border-gray-700"
                    placeholder="输入阈值"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>描述</Label>
              <Input
                value={newCondition.description}
                onChange={(e) => setNewCondition({ ...newCondition, description: e.target.value })}
                className="bg-gray-900 border-gray-700"
                placeholder="条件描述（可选）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCondition(false)} className="border-gray-700">
              取消
            </Button>
            <Button onClick={handleAddCondition} className="bg-orange-500 hover:bg-orange-600">
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
