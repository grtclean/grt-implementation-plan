/**
 * GRT智能系统 - 工作流引擎 (Workflow Engine)
 * 
 * 类似简道云的流程固化功能，支持：
 * - 表单构建器
 * - 流程设计器
 * - 审批流程
 * - 数据记录与追溯
 * 
 * @version 2.6.4
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 字段类型 */
export type FieldType = 
  | 'text'           // 单行文本
  | 'textarea'       // 多行文本
  | 'number'         // 数字
  | 'decimal'        // 小数
  | 'date'           // 日期
  | 'datetime'       // 日期时间
  | 'select'         // 下拉选择
  | 'multiselect'    // 多选
  | 'radio'          // 单选
  | 'checkbox'       // 复选框
  | 'file'           // 文件上传
  | 'image'          // 图片上传
  | 'user'           // 用户选择
  | 'department'     // 部门选择
  | 'location'       // 地理位置
  | 'signature'      // 签名
  | 'subform'        // 子表单
  | 'formula'        // 公式计算
  | 'relation';      // 关联其他表单

/** 流程节点类型 */
export type NodeType = 
  | 'start'          // 开始节点
  | 'end'            // 结束节点
  | 'approval'       // 审批节点
  | 'cc'             // 抄送节点
  | 'condition'      // 条件分支
  | 'parallel'       // 并行分支
  | 'subprocess'     // 子流程
  | 'automation'     // 自动化节点
  | 'ai_decision';   // AI决策节点

/** 审批方式 */
export type ApprovalMode = 
  | 'any'            // 任一人审批
  | 'all'            // 所有人审批
  | 'sequential';    // 依次审批

/** 审批动作 */
export type ApprovalAction = 'approve' | 'reject' | 'return' | 'transfer' | 'add_approver';

/** 流程状态 */
export type WorkflowStatus = 
  | 'draft'          // 草稿
  | 'pending'        // 待审批
  | 'approved'       // 已通过
  | 'rejected'       // 已拒绝
  | 'returned'       // 已退回
  | 'cancelled'      // 已取消
  | 'completed';     // 已完成

// ============================================================================
// 表单构建器
// ============================================================================

/** 字段定义 */
export interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: { label: string; value: string }[];
  validation?: FieldValidation;
  visibility?: FieldVisibility;
  formula?: string;
  relationConfig?: RelationConfig;
  subformFields?: FieldDefinition[];
}

/** 字段验证规则 */
export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  customValidator?: string;
}

/** 字段可见性规则 */
export interface FieldVisibility {
  condition: string;
  dependsOn: string[];
}

/** 关联配置 */
export interface RelationConfig {
  targetFormId: string;
  displayField: string;
  filterCondition?: string;
  multiSelect: boolean;
}

/** 表单定义 */
export interface FormDefinition {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  fields: FieldDefinition[];
  layout?: FormLayout;
  permissions?: FormPermissions;
  createdAt: Date;
  updatedAt: Date;
}

/** 表单布局 */
export interface FormLayout {
  columns: number;
  sections: FormSection[];
}

/** 表单分区 */
export interface FormSection {
  id: string;
  title: string;
  collapsed?: boolean;
  fieldIds: string[];
}

/** 表单权限 */
export interface FormPermissions {
  create: string[];
  read: string[];
  update: string[];
  delete: string[];
}

/** 表单构建器 */
export class FormBuilder {
  private forms: Map<string, FormDefinition> = new Map();

  /**
   * 创建表单
   */
  createForm(form: Omit<FormDefinition, 'createdAt' | 'updatedAt'>): FormDefinition {
    const now = new Date();
    const fullForm: FormDefinition = {
      ...form,
      createdAt: now,
      updatedAt: now
    };
    this.forms.set(form.id, fullForm);
    return fullForm;
  }

  /**
   * 获取表单
   */
  getForm(formId: string): FormDefinition | undefined {
    return this.forms.get(formId);
  }

  /**
   * 添加字段
   */
  addField(formId: string, field: FieldDefinition): boolean {
    const form = this.forms.get(formId);
    if (!form) return false;
    
    form.fields.push(field);
    form.updatedAt = new Date();
    return true;
  }

  /**
   * 验证表单数据
   */
  validateFormData(formId: string, data: Record<string, any>): {
    valid: boolean;
    errors: { field: string; message: string }[];
  } {
    const form = this.forms.get(formId);
    if (!form) {
      return { valid: false, errors: [{ field: '_form', message: '表单不存在' }] };
    }

    const errors: { field: string; message: string }[] = [];

    for (const field of form.fields) {
      const value = data[field.name];

      // 必填检查
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({ field: field.name, message: `${field.label}为必填项` });
        continue;
      }

      // 验证规则检查
      if (field.validation && value !== undefined && value !== null) {
        const v = field.validation;

        if (v.minLength && typeof value === 'string' && value.length < v.minLength) {
          errors.push({ field: field.name, message: `${field.label}长度不能少于${v.minLength}个字符` });
        }

        if (v.maxLength && typeof value === 'string' && value.length > v.maxLength) {
          errors.push({ field: field.name, message: `${field.label}长度不能超过${v.maxLength}个字符` });
        }

        if (v.min !== undefined && typeof value === 'number' && value < v.min) {
          errors.push({ field: field.name, message: `${field.label}不能小于${v.min}` });
        }

        if (v.max !== undefined && typeof value === 'number' && value > v.max) {
          errors.push({ field: field.name, message: `${field.label}不能大于${v.max}` });
        }

        if (v.pattern && typeof value === 'string' && !new RegExp(v.pattern).test(value)) {
          errors.push({ field: field.name, message: v.patternMessage || `${field.label}格式不正确` });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// ============================================================================
// 流程设计器
// ============================================================================

/** 流程节点 */
export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  config: NodeConfig;
  nextNodes: string[];
  position?: { x: number; y: number };
}

/** 节点配置 */
export interface NodeConfig {
  // 审批节点配置
  approvers?: ApproverConfig;
  approvalMode?: ApprovalMode;
  timeout?: number;
  timeoutAction?: 'auto_approve' | 'auto_reject' | 'escalate';
  
  // 条件节点配置
  conditions?: ConditionConfig[];
  
  // 抄送节点配置
  ccRecipients?: string[];
  
  // 自动化节点配置
  automation?: AutomationConfig;
  
  // AI决策节点配置
  aiDecision?: AIDecisionConfig;
}

/** 审批人配置 */
export interface ApproverConfig {
  type: 'fixed' | 'role' | 'department_head' | 'initiator_supervisor' | 'form_field' | 'custom';
  value: string[];
  fallback?: string[];
}

/** 条件配置 */
export interface ConditionConfig {
  id: string;
  name: string;
  expression: string;
  nextNodeId: string;
}

/** 自动化配置 */
export interface AutomationConfig {
  type: 'update_field' | 'create_record' | 'send_notification' | 'call_api' | 'execute_script';
  params: Record<string, any>;
}

/** AI决策配置 */
export interface AIDecisionConfig {
  decisionType: 'classification' | 'scoring' | 'recommendation';
  modelId: string;
  inputFields: string[];
  outputField: string;
  threshold?: number;
  fallbackNodeId?: string;
}

/** 流程定义 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  formId: string;
  version: number;
  status: 'draft' | 'published' | 'deprecated';
  nodes: WorkflowNode[];
  startNodeId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 流程设计器 */
export class WorkflowDesigner {
  private workflows: Map<string, WorkflowDefinition> = new Map();

  /**
   * 创建流程
   */
  createWorkflow(workflow: Omit<WorkflowDefinition, 'createdAt' | 'updatedAt' | 'version'>): WorkflowDefinition {
    const now = new Date();
    const fullWorkflow: WorkflowDefinition = {
      ...workflow,
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    this.workflows.set(workflow.id, fullWorkflow);
    return fullWorkflow;
  }

  /**
   * 获取流程
   */
  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * 添加节点
   */
  addNode(workflowId: string, node: WorkflowNode): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;
    
    workflow.nodes.push(node);
    workflow.updatedAt = new Date();
    return true;
  }

  /**
   * 连接节点
   */
  connectNodes(workflowId: string, fromNodeId: string, toNodeId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const fromNode = workflow.nodes.find(n => n.id === fromNodeId);
    if (!fromNode) return false;

    if (!fromNode.nextNodes.includes(toNodeId)) {
      fromNode.nextNodes.push(toNodeId);
    }
    
    workflow.updatedAt = new Date();
    return true;
  }

  /**
   * 验证流程
   */
  validateWorkflow(workflowId: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return { valid: false, errors: ['流程不存在'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查开始节点
    const startNode = workflow.nodes.find(n => n.id === workflow.startNodeId);
    if (!startNode) {
      errors.push('缺少开始节点');
    }

    // 检查结束节点
    const endNodes = workflow.nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push('缺少结束节点');
    }

    // 检查孤立节点
    const reachableNodes = new Set<string>();
    const queue = [workflow.startNodeId];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (reachableNodes.has(nodeId)) continue;
      reachableNodes.add(nodeId);
      
      const node = workflow.nodes.find(n => n.id === nodeId);
      if (node) {
        queue.push(...node.nextNodes);
      }
    }

    for (const node of workflow.nodes) {
      if (!reachableNodes.has(node.id)) {
        warnings.push(`节点"${node.name}"不可达`);
      }
    }

    // 检查审批节点配置
    for (const node of workflow.nodes) {
      if (node.type === 'approval' && !node.config.approvers) {
        errors.push(`审批节点"${node.name}"未配置审批人`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * 发布流程
   */
  publishWorkflow(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const validation = this.validateWorkflow(workflowId);
    if (!validation.valid) return false;

    workflow.status = 'published';
    workflow.version += 1;
    workflow.updatedAt = new Date();
    return true;
  }
}

// ============================================================================
// 流程执行引擎
// ============================================================================

/** 流程实例 */
export interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowVersion: number;
  formData: Record<string, any>;
  status: WorkflowStatus;
  currentNodeId: string;
  initiatorId: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/** 审批记录 */
export interface ApprovalRecord {
  id: string;
  instanceId: string;
  nodeId: string;
  approverId: string;
  action: ApprovalAction;
  comment?: string;
  attachments?: string[];
  createdAt: Date;
}

/** 流程日志 */
export interface WorkflowLog {
  id: string;
  instanceId: string;
  nodeId: string;
  action: string;
  actorId: string;
  details: Record<string, any>;
  createdAt: Date;
}

/** 流程执行引擎 */
export class WorkflowEngine {
  private instances: Map<string, WorkflowInstance> = new Map();
  private approvalRecords: Map<string, ApprovalRecord[]> = new Map();
  private logs: Map<string, WorkflowLog[]> = new Map();
  private designer: WorkflowDesigner;
  private formBuilder: FormBuilder;

  constructor(designer: WorkflowDesigner, formBuilder: FormBuilder) {
    this.designer = designer;
    this.formBuilder = formBuilder;
  }

  /**
   * 启动流程实例
   */
  startInstance(
    workflowId: string, 
    formData: Record<string, any>, 
    initiatorId: string
  ): WorkflowInstance | null {
    const workflow = this.designer.getWorkflow(workflowId);
    if (!workflow || workflow.status !== 'published') {
      return null;
    }

    // 验证表单数据
    const validation = this.formBuilder.validateFormData(workflow.formId, formData);
    if (!validation.valid) {
      return null;
    }

    const now = new Date();
    const instance: WorkflowInstance = {
      id: `inst_${Date.now()}`,
      workflowId,
      workflowVersion: workflow.version,
      formData,
      status: 'pending',
      currentNodeId: workflow.startNodeId,
      initiatorId,
      createdAt: now,
      updatedAt: now
    };

    this.instances.set(instance.id, instance);
    this.approvalRecords.set(instance.id, []);
    this.logs.set(instance.id, []);

    // 记录日志
    this.addLog(instance.id, workflow.startNodeId, 'start', initiatorId, { formData });

    // 自动推进到下一个节点
    this.advanceToNextNode(instance.id);

    return instance;
  }

  /**
   * 执行审批动作
   */
  executeApproval(
    instanceId: string,
    approverId: string,
    action: ApprovalAction,
    comment?: string
  ): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance || instance.status !== 'pending') {
      return false;
    }

    const workflow = this.designer.getWorkflow(instance.workflowId);
    if (!workflow) return false;

    const currentNode = workflow.nodes.find(n => n.id === instance.currentNodeId);
    if (!currentNode || currentNode.type !== 'approval') {
      return false;
    }

    // 记录审批
    const record: ApprovalRecord = {
      id: `apr_${Date.now()}`,
      instanceId,
      nodeId: instance.currentNodeId,
      approverId,
      action,
      comment,
      createdAt: new Date()
    };

    const records = this.approvalRecords.get(instanceId) || [];
    records.push(record);
    this.approvalRecords.set(instanceId, records);

    // 记录日志
    this.addLog(instanceId, instance.currentNodeId, action, approverId, { comment });

    // 根据动作更新状态
    if (action === 'approve') {
      this.advanceToNextNode(instanceId);
    } else if (action === 'reject') {
      instance.status = 'rejected';
      instance.updatedAt = new Date();
      instance.completedAt = new Date();
    } else if (action === 'return') {
      instance.status = 'returned';
      instance.updatedAt = new Date();
    }

    return true;
  }

  /**
   * 推进到下一个节点
   */
  private advanceToNextNode(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    const workflow = this.designer.getWorkflow(instance.workflowId);
    if (!workflow) return;

    const currentNode = workflow.nodes.find(n => n.id === instance.currentNodeId);
    if (!currentNode) return;

    // 获取下一个节点
    let nextNodeId: string | null = null;

    if (currentNode.type === 'condition') {
      // 条件分支：评估条件
      nextNodeId = this.evaluateCondition(currentNode, instance.formData);
    } else if (currentNode.nextNodes.length > 0) {
      nextNodeId = currentNode.nextNodes[0];
    }

    if (nextNodeId) {
      const nextNode = workflow.nodes.find(n => n.id === nextNodeId);
      if (nextNode) {
        instance.currentNodeId = nextNodeId;
        instance.updatedAt = new Date();

        if (nextNode.type === 'end') {
          instance.status = 'completed';
          instance.completedAt = new Date();
        } else if (nextNode.type === 'automation') {
          // 执行自动化
          this.executeAutomation(nextNode, instance);
          this.advanceToNextNode(instanceId);
        } else if (nextNode.type === 'cc') {
          // 抄送
          this.sendCC(nextNode, instance);
          this.advanceToNextNode(instanceId);
        }
      }
    }
  }

  /**
   * 评估条件
   */
  private evaluateCondition(node: WorkflowNode, formData: Record<string, any>): string | null {
    if (!node.config.conditions) return null;

    for (const condition of node.config.conditions) {
      try {
        // 简单的条件评估（实际应使用安全的表达式引擎）
        const result = this.evaluateExpression(condition.expression, formData);
        if (result) {
          return condition.nextNodeId;
        }
      } catch (e) {
        console.error('条件评估错误:', e);
      }
    }

    return null;
  }

  /**
   * 评估表达式
   */
  private evaluateExpression(expression: string, context: Record<string, any>): boolean {
    // 简单实现：支持基本的比较操作
    // 实际应使用安全的表达式引擎如expr-eval
    const match = expression.match(/(\w+)\s*(==|!=|>|<|>=|<=)\s*(.+)/);
    if (!match) return false;

    const [, field, operator, value] = match;
    const fieldValue = context[field];
    const compareValue = JSON.parse(value);

    switch (operator) {
      case '==': return fieldValue === compareValue;
      case '!=': return fieldValue !== compareValue;
      case '>': return fieldValue > compareValue;
      case '<': return fieldValue < compareValue;
      case '>=': return fieldValue >= compareValue;
      case '<=': return fieldValue <= compareValue;
      default: return false;
    }
  }

  /**
   * 执行自动化
   */
  private executeAutomation(node: WorkflowNode, instance: WorkflowInstance): void {
    const config = node.config.automation;
    if (!config) return;

    this.addLog(instance.id, node.id, 'automation', 'system', { 
      type: config.type, 
      params: config.params 
    });

    // 根据自动化类型执行相应操作
    switch (config.type) {
      case 'update_field':
        // 更新表单字段
        Object.assign(instance.formData, config.params);
        break;
      case 'send_notification':
        // 发送通知（实际应调用通知服务）
        console.log('发送通知:', config.params);
        break;
      // 其他自动化类型...
    }
  }

  /**
   * 发送抄送
   */
  private sendCC(node: WorkflowNode, instance: WorkflowInstance): void {
    const recipients = node.config.ccRecipients || [];
    
    this.addLog(instance.id, node.id, 'cc', 'system', { recipients });
    
    // 实际应调用通知服务
    console.log('抄送给:', recipients);
  }

  /**
   * 添加日志
   */
  private addLog(
    instanceId: string, 
    nodeId: string, 
    action: string, 
    actorId: string, 
    details: Record<string, any>
  ): void {
    const log: WorkflowLog = {
      id: `log_${Date.now()}`,
      instanceId,
      nodeId,
      action,
      actorId,
      details,
      createdAt: new Date()
    };

    const logs = this.logs.get(instanceId) || [];
    logs.push(log);
    this.logs.set(instanceId, logs);
  }

  /**
   * 获取流程实例
   */
  getInstance(instanceId: string): WorkflowInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * 获取审批记录
   */
  getApprovalRecords(instanceId: string): ApprovalRecord[] {
    return this.approvalRecords.get(instanceId) || [];
  }

  /**
   * 获取流程日志
   */
  getLogs(instanceId: string): WorkflowLog[] {
    return this.logs.get(instanceId) || [];
  }

  /**
   * 获取待办任务
   */
  getPendingTasks(userId: string): WorkflowInstance[] {
    const pending: WorkflowInstance[] = [];
    
    const instancesArray = Array.from(this.instances.values());
    for (const instance of instancesArray) {
      if (instance.status !== 'pending') continue;

      const workflow = this.designer.getWorkflow(instance.workflowId);
      if (!workflow) continue;

      const currentNode = workflow.nodes.find(n => n.id === instance.currentNodeId);
      if (!currentNode || currentNode.type !== 'approval') continue;

      // 检查用户是否是审批人（简化实现）
      const approvers = currentNode.config.approvers;
      if (approvers && approvers.value.includes(userId)) {
        pending.push(instance);
      }
    }

    return pending;
  }
}

// ============================================================================
// 预定义表单模板
// ============================================================================

/** 创建门径评审表单模板 */
export function createGateReviewFormTemplate(): FormDefinition {
  return {
    id: 'form_gate_review',
    name: '门径评审表单',
    description: 'M0-M12里程碑门径评审专用表单',
    category: '项目管理',
    fields: [
      {
        id: 'project_id',
        name: 'projectId',
        label: '项目编号',
        type: 'text',
        required: true
      },
      {
        id: 'gate_code',
        name: 'gateCode',
        label: '门径代码',
        type: 'select',
        required: true,
        options: [
          { label: 'M0 - 战略筛选', value: 'M0' },
          { label: 'M1 - 报价启动', value: 'M1' },
          { label: 'M2 - 订单确认', value: 'M2' },
          { label: 'M3 - 项目启动', value: 'M3' },
          { label: 'M4 - 系统设计', value: 'M4' },
          { label: 'M5 - 详细设计', value: 'M5' },
          { label: 'M6 - 原型验证', value: 'M6' },
          { label: 'M7 - 工业化准备', value: 'M7' },
          { label: 'M8 - 过程验证', value: 'M8' },
          { label: 'M9 - 量产签发', value: 'M9' },
          { label: 'M10 - 量产启动', value: 'M10' },
          { label: 'M11 - 爬坡稳定', value: 'M11' },
          { label: 'M12 - 项目关闭', value: 'M12' }
        ]
      },
      {
        id: 'checklist_completion',
        name: 'checklistCompletion',
        label: '检查清单完成率',
        type: 'number',
        required: true,
        validation: { min: 0, max: 100 }
      },
      {
        id: 'traffic_light',
        name: 'trafficLight',
        label: '交通灯状态',
        type: 'radio',
        required: true,
        options: [
          { label: '🟢 绿灯 - 正常', value: 'green' },
          { label: '🟡 黄灯 - 警告', value: 'yellow' },
          { label: '🔴 红灯 - 阻塞', value: 'red' }
        ]
      },
      {
        id: 'review_summary',
        name: 'reviewSummary',
        label: '评审总结',
        type: 'textarea',
        required: true
      },
      {
        id: 'risk_items',
        name: 'riskItems',
        label: '风险项',
        type: 'textarea',
        required: false
      },
      {
        id: 'action_items',
        name: 'actionItems',
        label: '行动项',
        type: 'textarea',
        required: false
      },
      {
        id: 'attachments',
        name: 'attachments',
        label: '附件',
        type: 'file',
        required: false
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/** 创建门径评审流程模板 */
export function createGateReviewWorkflowTemplate(): WorkflowDefinition {
  return {
    id: 'workflow_gate_review',
    name: '门径评审流程',
    description: 'M0-M12里程碑门径评审审批流程',
    formId: 'form_gate_review',
    version: 1,
    status: 'published',
    nodes: [
      {
        id: 'start',
        type: 'start',
        name: '开始',
        config: {},
        nextNodes: ['pm_review']
      },
      {
        id: 'pm_review',
        type: 'approval',
        name: '项目经理评审',
        config: {
          approvers: { type: 'role', value: ['project_manager'] },
          approvalMode: 'any',
          timeout: 48,
          timeoutAction: 'escalate'
        },
        nextNodes: ['condition_gate_type']
      },
      {
        id: 'condition_gate_type',
        type: 'condition',
        name: '门径类型判断',
        config: {
          conditions: [
            { id: 'hard_gate', name: '硬门径', expression: 'gateCode == "M0" || gateCode == "M2" || gateCode == "M3" || gateCode == "M5" || gateCode == "M7" || gateCode == "M9" || gateCode == "M12"', nextNodeId: 'steering_review' },
            { id: 'soft_gate', name: '软门径', expression: 'gateCode == "M1" || gateCode == "M4" || gateCode == "M6" || gateCode == "M8" || gateCode == "M10" || gateCode == "M11"', nextNodeId: 'dept_review' }
          ]
        },
        nextNodes: []
      },
      {
        id: 'dept_review',
        type: 'approval',
        name: '部门主管评审',
        config: {
          approvers: { type: 'role', value: ['department_head'] },
          approvalMode: 'any'
        },
        nextNodes: ['cc_stakeholders']
      },
      {
        id: 'steering_review',
        type: 'approval',
        name: '指导委员会评审',
        config: {
          approvers: { type: 'role', value: ['steering_committee'] },
          approvalMode: 'all'
        },
        nextNodes: ['cc_stakeholders']
      },
      {
        id: 'cc_stakeholders',
        type: 'cc',
        name: '抄送相关方',
        config: {
          ccRecipients: ['project_team', 'quality_manager']
        },
        nextNodes: ['end']
      },
      {
        id: 'end',
        type: 'end',
        name: '结束',
        config: {},
        nextNodes: []
      }
    ],
    startNodeId: 'start',
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// ============================================================================
// 导出
// ============================================================================

export const formBuilder = new FormBuilder();
export const workflowDesigner = new WorkflowDesigner();
export const workflowEngine = new WorkflowEngine(workflowDesigner, formBuilder);
