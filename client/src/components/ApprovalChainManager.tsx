/**
 * 审批链配置管理组件
 * 支持查看、创建和管理多级审批流程
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { 
  GitBranch, 
  Plus, 
  Settings, 
  Users, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Trash2,
  Edit,
  Shield
} from "lucide-react";

// 审批人角色选项
const APPROVER_ROLES = [
  { value: "engineer", label: "工程师" },
  { value: "senior_engineer", label: "高级工程师" },
  { value: "team_lead", label: "团队负责人" },
  { value: "project_manager", label: "项目经理" },
  { value: "department_head", label: "部门主管" },
  { value: "quality_manager", label: "质量经理" },
  { value: "technical_director", label: "技术总监" },
  { value: "general_manager", label: "总经理" },
];

// 检查点类型选项
const CHECKPOINT_TYPES = [
  { value: "standard", label: "标准检查点" },
  { value: "gate", label: "阶段门禁" },
  { value: "critical_gate", label: "关键阶段门禁" },
  { value: "quick", label: "快速审批" },
];

// 项目等级选项
const PROJECT_TIERS = [
  { value: "", label: "不限" },
  { value: "tier1", label: "Tier1客户" },
  { value: "tier2", label: "Tier2客户" },
  { value: "tier3", label: "Tier3客户" },
];

interface ApprovalNode {
  id: string;
  order: number;
  role: string;
  roleName: string;
  userId?: string;
  userName?: string;
  isRequired: boolean;
  canDelegate: boolean;
  timeoutHours?: number;
  autoApproveOnTimeout?: boolean;
}

interface ApprovalChainConfig {
  id: string;
  name: string;
  description: string;
  checkpointType: string;
  projectTier?: string;
  nodes: ApprovalNode[];
  isActive: boolean;
}

export default function ApprovalChainManager() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApprovalChainConfig | null>(null);
  const [newConfig, setNewConfig] = useState({
    name: "",
    description: "",
    checkpointType: "standard",
    projectTier: "",
    nodes: [] as ApprovalNode[],
    isActive: true,
  });

  // 获取审批链配置
  const { data: configs, isLoading, refetch } = trpc.capabilityOs.getApprovalChainConfigs.useQuery();

  // 创建审批链配置
  const createMutation = trpc.capabilityOs.createApprovalChainConfig.useMutation({
    onSuccess: () => {
      toast({ title: "创建成功", description: "审批链配置已创建" });
      setIsCreateDialogOpen(false);
      resetNewConfig();
      refetch();
    },
    onError: (error) => {
      toast({ title: "创建失败", description: error.message, variant: "destructive" });
    },
  });

  // 更新审批链配置
  const updateMutation = trpc.capabilityOs.updateApprovalChainConfig.useMutation({
    onSuccess: () => {
      toast({ title: "更新成功", description: "审批链配置已更新" });
      setEditingConfig(null);
      refetch();
    },
    onError: (error) => {
      toast({ title: "更新失败", description: error.message, variant: "destructive" });
    },
  });

  // 删除审批链配置
  const deleteMutation = trpc.capabilityOs.deleteApprovalChainConfig.useMutation({
    onSuccess: () => {
      toast({ title: "删除成功", description: "审批链配置已删除" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "删除失败", description: error.message, variant: "destructive" });
    },
  });

  const resetNewConfig = () => {
    setNewConfig({
      name: "",
      description: "",
      checkpointType: "standard",
      projectTier: "",
      nodes: [],
      isActive: true,
    });
  };

  const addNode = () => {
    const newNode: ApprovalNode = {
      id: `node_${Date.now()}`,
      order: newConfig.nodes.length + 1,
      role: "engineer",
      roleName: "工程师",
      isRequired: true,
      canDelegate: true,
      timeoutHours: 24,
      autoApproveOnTimeout: false,
    };
    setNewConfig({ ...newConfig, nodes: [...newConfig.nodes, newNode] });
  };

  const removeNode = (nodeId: string) => {
    const updatedNodes = newConfig.nodes
      .filter(n => n.id !== nodeId)
      .map((n, index) => ({ ...n, order: index + 1 }));
    setNewConfig({ ...newConfig, nodes: updatedNodes });
  };

  const updateNode = (nodeId: string, updates: Partial<ApprovalNode>) => {
    const updatedNodes = newConfig.nodes.map(n => 
      n.id === nodeId ? { ...n, ...updates } : n
    );
    setNewConfig({ ...newConfig, nodes: updatedNodes });
  };

  const handleCreate = () => {
    if (!newConfig.name || newConfig.nodes.length === 0) {
      toast({ title: "验证失败", description: "请填写名称并添加至少一个审批节点", variant: "destructive" });
      return;
    }
    createMutation.mutate(newConfig as any);
  };

  const handleDelete = (id: string) => {
    if (confirm("确定要删除此审批链配置吗？")) {
      deleteMutation.mutate({ id });
    }
  };

  const getRoleName = (role: string) => {
    return APPROVER_ROLES.find(r => r.value === role)?.label || role;
  };

  const getCheckpointTypeName = (type: string) => {
    return CHECKPOINT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getProjectTierName = (tier?: string) => {
    if (!tier) return "不限";
    return PROJECT_TIERS.find(t => t.value === tier)?.label || tier;
  };

  return (
    <div className="space-y-6">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            审批链配置管理
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            配置和管理检查点的多级审批流程
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              创建审批链
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>创建审批链配置</DialogTitle>
              <DialogDescription>
                配置多级审批流程，定义审批节点和规则
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>配置名称</Label>
                  <Input
                    placeholder="例如：Tier1客户审批流程"
                    value={newConfig.name}
                    onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>检查点类型</Label>
                  <Select
                    value={newConfig.checkpointType}
                    onValueChange={(value) => setNewConfig({ ...newConfig, checkpointType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHECKPOINT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>适用项目等级</Label>
                  <Select
                    value={newConfig.projectTier}
                    onValueChange={(value) => setNewConfig({ ...newConfig, projectTier: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="不限" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TIERS.map(tier => (
                        <SelectItem key={tier.value || "none"} value={tier.value || "none"}>
                          {tier.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    checked={newConfig.isActive}
                    onCheckedChange={(checked) => setNewConfig({ ...newConfig, isActive: checked })}
                  />
                  <Label>启用此配置</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  placeholder="描述此审批链的用途和适用场景"
                  value={newConfig.description}
                  onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                />
              </div>

              {/* 审批节点 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">审批节点</Label>
                  <Button variant="outline" size="sm" onClick={addNode}>
                    <Plus className="w-4 h-4 mr-1" />
                    添加节点
                  </Button>
                </div>

                {newConfig.nodes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                    点击"添加节点"创建审批流程
                  </div>
                ) : (
                  <div className="space-y-3">
                    {newConfig.nodes.map((node, index) => (
                      <Card key={node.id} className="relative">
                        <CardContent className="pt-4">
                          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div className="grid grid-cols-3 gap-3 pl-4">
                            <div className="space-y-1">
                              <Label className="text-xs">审批角色</Label>
                              <Select
                                value={node.role}
                                onValueChange={(value) => updateNode(node.id, { 
                                  role: value, 
                                  roleName: getRoleName(value) 
                                })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {APPROVER_ROLES.map(role => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">超时时间(小时)</Label>
                              <Input
                                type="number"
                                className="h-8"
                                value={node.timeoutHours || ""}
                                onChange={(e) => updateNode(node.id, { timeoutHours: parseInt(e.target.value) || undefined })}
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="flex items-center space-x-1">
                                <Switch
                                  checked={node.canDelegate}
                                  onCheckedChange={(checked) => updateNode(node.id, { canDelegate: checked })}
                                />
                                <Label className="text-xs">可委托</Label>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeNode(node.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 配置列表 */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : configs && configs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map((config: ApprovalChainConfig) => (
            <Card key={config.id} className={!config.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      {config.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {config.description}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingConfig(config)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(config.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline">
                    {getCheckpointTypeName(config.checkpointType)}
                  </Badge>
                  {config.projectTier && (
                    <Badge variant="secondary">
                      {getProjectTierName(config.projectTier)}
                    </Badge>
                  )}
                  <Badge variant={config.isActive ? "default" : "secondary"}>
                    {config.isActive ? "已启用" : "已禁用"}
                  </Badge>
                </div>

                {/* 审批流程可视化 */}
                <div className="flex items-center gap-1 flex-wrap">
                  {config.nodes.map((node: ApprovalNode, index: number) => (
                    <div key={node.id} className="flex items-center">
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded text-xs">
                        <Users className="w-3 h-3" />
                        {node.roleName}
                        {node.timeoutHours && (
                          <span className="text-muted-foreground ml-1">
                            <Clock className="w-3 h-3 inline" />
                            {node.timeoutHours}h
                          </span>
                        )}
                      </div>
                      {index < config.nodes.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground mx-1" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            暂无审批链配置，点击"创建审批链"添加
          </CardContent>
        </Card>
      )}
    </div>
  );
}
