/**
 * 工作流条件分支可视化编辑器组件
 * 支持图形化条件配置、拖拽设置分支条件、目标节点连接
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GitBranch, Plus, Trash2, ArrowRight, Settings, Save, X, GripVertical } from 'lucide-react';

// 条件类型
export type ConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty' | 'regex_match';

// 条件定义
export interface Condition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
  logicalOperator?: 'AND' | 'OR';
}

// 分支定义
export interface Branch {
  id: string;
  name: string;
  conditions: Condition[];
  targetNodeId: string;
  priority: number;
  color: string;
}

// 条件分支节点定义
export interface ConditionBranchNode {
  id: string;
  name: string;
  branches: Branch[];
  defaultBranchTargetId?: string;
  position: { x: number; y: number };
}

// 可用节点（用于目标选择）
export interface AvailableNode {
  id: string;
  name: string;
  type: string;
}

interface WorkflowConditionBranchEditorProps {
  node: ConditionBranchNode;
  availableNodes: AvailableNode[];
  availableFields: string[];
  onSave: (node: ConditionBranchNode) => void;
  onCancel: () => void;
}

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: '等于',
  not_equals: '不等于',
  greater_than: '大于',
  less_than: '小于',
  contains: '包含',
  not_contains: '不包含',
  is_empty: '为空',
  is_not_empty: '不为空',
  regex_match: '正则匹配',
};

const BRANCH_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
];

// 生成唯一ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 条件编辑器组件
function ConditionEditor({
  condition,
  availableFields,
  isFirst,
  onUpdate,
  onDelete,
}: {
  condition: Condition;
  availableFields: string[];
  isFirst: boolean;
  onUpdate: (condition: Condition) => void;
  onDelete: () => void;
}) {
  const needsValue = !['is_empty', 'is_not_empty'].includes(condition.operator);

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
      {!isFirst && (
        <Select
          value={condition.logicalOperator || 'AND'}
          onValueChange={(value) => onUpdate({ ...condition, logicalOperator: value as 'AND' | 'OR' })}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">且</SelectItem>
            <SelectItem value="OR">或</SelectItem>
          </SelectContent>
        </Select>
      )}
      
      <Select
        value={condition.field}
        onValueChange={(value) => onUpdate({ ...condition, field: value })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="选择字段" />
        </SelectTrigger>
        <SelectContent>
          {availableFields.map((field) => (
            <SelectItem key={field} value={field}>{field}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={condition.operator}
        onValueChange={(value) => onUpdate({ ...condition, operator: value as ConditionOperator })}
      >
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(OPERATOR_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {needsValue && (
        <Input
          value={condition.value}
          onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
          placeholder="值"
          className="w-32"
        />
      )}

      <Button variant="ghost" size="icon" onClick={onDelete}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// 分支编辑器组件
function BranchEditor({
  branch,
  availableNodes,
  availableFields,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
}: {
  branch: Branch;
  availableNodes: AvailableNode[];
  availableFields: string[];
  onUpdate: (branch: Branch) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  isDragging: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const addCondition = () => {
    const newCondition: Condition = {
      id: generateId(),
      field: availableFields[0] || '',
      operator: 'equals',
      value: '',
      logicalOperator: branch.conditions.length > 0 ? 'AND' : undefined,
    };
    onUpdate({ ...branch, conditions: [...branch.conditions, newCondition] });
  };

  const updateCondition = (index: number, condition: Condition) => {
    const newConditions = [...branch.conditions];
    newConditions[index] = condition;
    onUpdate({ ...branch, conditions: newConditions });
  };

  const deleteCondition = (index: number) => {
    const newConditions = branch.conditions.filter((_, i) => i !== index);
    // 移除第一个条件的逻辑运算符
    if (newConditions.length > 0 && newConditions[0].logicalOperator) {
      newConditions[0] = { ...newConditions[0], logicalOperator: undefined };
    }
    onUpdate({ ...branch, conditions: newConditions });
  };

  return (
    <Card 
      className={`border-l-4 transition-opacity ${isDragging ? 'opacity-50' : ''}`}
      style={{ borderLeftColor: branch.color }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <Input
              value={branch.name}
              onChange={(e) => onUpdate({ ...branch, name: e.target.value })}
              className="w-40 h-8"
            />
            <Badge variant="outline">优先级: {branch.priority}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? '收起' : '展开'}
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* 条件列表 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">条件规则</Label>
            {branch.conditions.map((condition, index) => (
              <ConditionEditor
                key={condition.id}
                condition={condition}
                availableFields={availableFields}
                isFirst={index === 0}
                onUpdate={(c) => updateCondition(index, c)}
                onDelete={() => deleteCondition(index)}
              />
            ))}
            <Button variant="outline" size="sm" onClick={addCondition}>
              <Plus className="h-4 w-4 mr-1" /> 添加条件
            </Button>
          </div>

          {/* 目标节点选择 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">目标节点</Label>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Select
                value={branch.targetNodeId}
                onValueChange={(value) => onUpdate({ ...branch, targetNodeId: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择目标节点" />
                </SelectTrigger>
                <SelectContent>
                  {availableNodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.name} ({node.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// 主组件
export default function WorkflowConditionBranchEditor({
  node,
  availableNodes,
  availableFields,
  onSave,
  onCancel,
}: WorkflowConditionBranchEditorProps) {
  const [editedNode, setEditedNode] = useState<ConditionBranchNode>({ ...node });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addBranch = () => {
    const newBranch: Branch = {
      id: generateId(),
      name: `分支 ${editedNode.branches.length + 1}`,
      conditions: [],
      targetNodeId: '',
      priority: editedNode.branches.length + 1,
      color: BRANCH_COLORS[editedNode.branches.length % BRANCH_COLORS.length],
    };
    setEditedNode({
      ...editedNode,
      branches: [...editedNode.branches, newBranch],
    });
  };

  const updateBranch = (index: number, branch: Branch) => {
    const newBranches = [...editedNode.branches];
    newBranches[index] = branch;
    setEditedNode({ ...editedNode, branches: newBranches });
  };

  const deleteBranch = (index: number) => {
    const newBranches = editedNode.branches.filter((_, i) => i !== index);
    // 重新计算优先级
    newBranches.forEach((b, i) => { b.priority = i + 1; });
    setEditedNode({ ...editedNode, branches: newBranches });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newBranches = [...editedNode.branches];
    const [removed] = newBranches.splice(draggedIndex, 1);
    newBranches.splice(targetIndex, 0, removed);
    
    // 重新计算优先级
    newBranches.forEach((b, i) => { b.priority = i + 1; });
    
    setEditedNode({ ...editedNode, branches: newBranches });
    setDraggedIndex(null);
  };

  const handleSave = () => {
    onSave(editedNode);
  };

  // 条件预览文本
  const getConditionPreview = (conditions: Condition[]): string => {
    if (conditions.length === 0) return '无条件（始终匹配）';
    return conditions.map((c, i) => {
      const prefix = i > 0 ? ` ${c.logicalOperator} ` : '';
      const needsValue = !['is_empty', 'is_not_empty'].includes(c.operator);
      return `${prefix}${c.field} ${OPERATOR_LABELS[c.operator]}${needsValue ? ` "${c.value}"` : ''}`;
    }).join('');
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="h-6 w-6 text-primary" />
          <div>
            <Input
              value={editedNode.name}
              onChange={(e) => setEditedNode({ ...editedNode, name: e.target.value })}
              className="text-lg font-semibold h-8"
            />
            <p className="text-sm text-muted-foreground mt-1">
              配置条件分支规则，按优先级顺序匹配
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> 保存
          </Button>
        </div>
      </div>

      {/* 分支列表 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">条件分支</h3>
          <Button onClick={addBranch}>
            <Plus className="h-4 w-4 mr-1" /> 添加分支
          </Button>
        </div>

        {editedNode.branches.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无分支，点击"添加分支"创建第一个条件分支</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {editedNode.branches.map((branch, index) => (
              <BranchEditor
                key={branch.id}
                branch={branch}
                availableNodes={availableNodes}
                availableFields={availableFields}
                onUpdate={(b) => updateBranch(index, b)}
                onDelete={() => deleteBranch(index)}
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                isDragging={draggedIndex === index}
              />
            ))}
          </div>
        )}
      </div>

      {/* 默认分支 */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Badge variant="secondary">默认</Badge>
            当所有条件都不匹配时
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Select
              value={editedNode.defaultBranchTargetId || ''}
              onValueChange={(value) => setEditedNode({ ...editedNode, defaultBranchTargetId: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择默认目标节点" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">无（结束流程）</SelectItem>
                {availableNodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    {node.name} ({node.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 分支预览 */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">分支预览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {editedNode.branches.map((branch, index) => (
              <div key={branch.id} className="flex items-start gap-2">
                <div 
                  className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: branch.color }}
                />
                <div>
                  <span className="font-medium">{branch.name}:</span>{' '}
                  <span className="text-muted-foreground">
                    {getConditionPreview(branch.conditions)}
                  </span>
                  {branch.targetNodeId && (
                    <span className="text-primary">
                      {' → '}
                      {availableNodes.find(n => n.id === branch.targetNodeId)?.name || branch.targetNodeId}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {editedNode.defaultBranchTargetId && (
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0 bg-muted-foreground" />
                <div>
                  <span className="font-medium">默认:</span>{' '}
                  <span className="text-muted-foreground">其他情况</span>
                  <span className="text-primary">
                    {' → '}
                    {availableNodes.find(n => n.id === editedNode.defaultBranchTargetId)?.name || editedNode.defaultBranchTargetId}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 导出类型和工具函数
export { generateId, OPERATOR_LABELS, BRANCH_COLORS };
