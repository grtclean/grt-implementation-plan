/**
 * GRT智能系统 - 门径管理体系单元测试
 * 
 * 测试覆盖：
 * - M0-M12里程碑门径定义
 * - H1-H4人力资本门径定义
 * - 检查清单引擎
 * - 否决机制
 * - 工作流引擎
 * - 表单构建器
 * 
 * @version 2.6.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MILESTONE_GATES,
  HR_GATES,
  GateChecklistEngine,
  GateVetoMechanism,
  GateStatusManager,
  createDefaultVetoRules,
  type MilestoneGateCode,
  type HRGateCode,
  type CheckItem,
  type CheckItemResult,
  type VetoContext
} from '../shared/gateManagement';
import {
  FormBuilder,
  WorkflowDesigner,
  WorkflowEngine,
  createGateReviewFormTemplate,
  createGateReviewWorkflowTemplate,
  type FieldDefinition,
  type WorkflowNode
} from '../shared/workflowEngine';

// ============================================================================
// M0-M12 里程碑门径测试
// ============================================================================

describe('M0-M12 里程碑门径定义', () => {
  it('应该包含所有13个里程碑门径', () => {
    const codes: MilestoneGateCode[] = [
      'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6',
      'M7', 'M8', 'M9', 'M10', 'M11', 'M12'
    ];
    
    for (const code of codes) {
      expect(MILESTONE_GATES[code]).toBeDefined();
      expect(MILESTONE_GATES[code].code).toBe(code);
    }
  });

  it('应该正确定义门径阶段', () => {
    // Phase I: 订单接入 (M0-M2)
    expect(MILESTONE_GATES.M0.phase).toBe('order_intake');
    expect(MILESTONE_GATES.M1.phase).toBe('order_intake');
    expect(MILESTONE_GATES.M2.phase).toBe('order_intake');
    
    // Phase II: 工程设计 (M3-M6)
    expect(MILESTONE_GATES.M3.phase).toBe('engineering');
    expect(MILESTONE_GATES.M4.phase).toBe('engineering');
    expect(MILESTONE_GATES.M5.phase).toBe('engineering');
    expect(MILESTONE_GATES.M6.phase).toBe('engineering');
    
    // Phase III: 工业化 (M7-M9)
    expect(MILESTONE_GATES.M7.phase).toBe('industrialization');
    expect(MILESTONE_GATES.M8.phase).toBe('industrialization');
    expect(MILESTONE_GATES.M9.phase).toBe('industrialization');
    
    // Phase IV: 执行交付 (M10-M12)
    expect(MILESTONE_GATES.M10.phase).toBe('execution');
    expect(MILESTONE_GATES.M11.phase).toBe('execution');
    expect(MILESTONE_GATES.M12.phase).toBe('execution');
  });

  it('应该正确标识硬门径', () => {
    const hardGates: MilestoneGateCode[] = ['M0', 'M2', 'M3', 'M5', 'M7', 'M9', 'M12'];
    const softGates: MilestoneGateCode[] = ['M1', 'M4', 'M6', 'M8', 'M10', 'M11'];
    
    for (const code of hardGates) {
      expect(MILESTONE_GATES[code].isHardGate).toBe(true);
    }
    
    for (const code of softGates) {
      expect(MILESTONE_GATES[code].isHardGate).toBe(false);
    }
  });

  it('应该有正确的序列顺序', () => {
    for (let i = 0; i <= 12; i++) {
      const code = `M${i}` as MilestoneGateCode;
      expect(MILESTONE_GATES[code].sequenceOrder).toBe(i);
    }
  });

  it('每个门径应该有否决标准', () => {
    for (const gate of Object.values(MILESTONE_GATES)) {
      expect(gate.killCriteria).toBeDefined();
      expect(gate.killCriteria.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// H1-H4 人力资本门径测试
// ============================================================================

describe('H1-H4 人力资本门径定义', () => {
  it('应该包含所有4个人力资本门径', () => {
    const codes: HRGateCode[] = ['H1', 'H2', 'H3', 'H4'];
    
    for (const code of codes) {
      expect(HR_GATES[code]).toBeDefined();
      expect(HR_GATES[code].code).toBe(code);
    }
  });

  it('H1应该是JD结构化门径', () => {
    expect(HR_GATES.H1.name).toBe('岗位定义结构化');
    expect(HR_GATES.H1.nameEn).toBe('JD as Data');
    expect(HR_GATES.H1.isHardGate).toBe(true);
  });

  it('H2应该是面试数据采集门径', () => {
    expect(HR_GATES.H2.name).toBe('面试数据结构化采集');
    expect(HR_GATES.H2.nameEn).toBe('ATS Phase');
    expect(HR_GATES.H2.isHardGate).toBe(true);
  });

  it('H3应该是入职扫描门径', () => {
    expect(HR_GATES.H3.name).toBe('入职扫描与数字化握手');
    expect(HR_GATES.H3.nameEn).toBe('HRIS Input');
    expect(HR_GATES.H3.isHardGate).toBe(true);
  });

  it('H4应该是KPI自动生成门径', () => {
    expect(HR_GATES.H4.name).toBe('基于面试数据的KPI自动生成');
    expect(HR_GATES.H4.nameEn).toBe('Auto KPI Generation');
    expect(HR_GATES.H4.isHardGate).toBe(false);
  });
});

// ============================================================================
// 检查清单引擎测试
// ============================================================================

describe('GateChecklistEngine', () => {
  let engine: GateChecklistEngine;

  beforeEach(() => {
    engine = new GateChecklistEngine();
  });

  it('应该能注册和获取检查项', () => {
    const items: CheckItem[] = [
      { id: '1', code: 'CHK001', name: '合同签署', type: 'mandatory', verificationMethod: '文件检查', responsibleRole: 'sales', sequenceOrder: 1 },
      { id: '2', code: 'CHK002', name: '技术评审', type: 'mandatory', verificationMethod: '会议记录', responsibleRole: 'engineering', sequenceOrder: 2 }
    ];
    
    engine.registerCheckItems('M2', items);
    const retrieved = engine.getCheckItems('M2');
    
    expect(retrieved).toHaveLength(2);
    expect(retrieved[0].code).toBe('CHK001');
  });

  it('应该正确评估检查清单完成状态', () => {
    const items: CheckItem[] = [
      { id: '1', code: 'CHK001', name: '必填项1', type: 'mandatory', verificationMethod: '检查', responsibleRole: 'pm', sequenceOrder: 1 },
      { id: '2', code: 'CHK002', name: '必填项2', type: 'mandatory', verificationMethod: '检查', responsibleRole: 'pm', sequenceOrder: 2 },
      { id: '3', code: 'CHK003', name: '可选项', type: 'optional', verificationMethod: '检查', responsibleRole: 'pm', sequenceOrder: 3 }
    ];
    
    engine.registerCheckItems('M3', items);
    
    // 只完成一个必填项
    const results: CheckItemResult[] = [
      { checkItemId: '1', status: 'completed' }
    ];
    
    const evaluation = engine.evaluateChecklist('M3', results);
    
    expect(evaluation.allMandatoryCompleted).toBe(false);
    expect(evaluation.trafficLight).toBe('red');
    expect(evaluation.pendingItems).toHaveLength(2);
  });

  it('所有必填项完成时应该返回绿灯', () => {
    const items: CheckItem[] = [
      { id: '1', code: 'CHK001', name: '必填项1', type: 'mandatory', verificationMethod: '检查', responsibleRole: 'pm', sequenceOrder: 1 },
      { id: '2', code: 'CHK002', name: '必填项2', type: 'mandatory', verificationMethod: '检查', responsibleRole: 'pm', sequenceOrder: 2 }
    ];
    
    engine.registerCheckItems('M5', items);
    
    const results: CheckItemResult[] = [
      { checkItemId: '1', status: 'completed' },
      { checkItemId: '2', status: 'completed' }
    ];
    
    const evaluation = engine.evaluateChecklist('M5', results);
    
    expect(evaluation.allMandatoryCompleted).toBe(true);
    expect(evaluation.trafficLight).toBe('green');
    expect(evaluation.completionRate).toBe(1);
  });
});

// ============================================================================
// 否决机制测试
// ============================================================================

describe('GateVetoMechanism', () => {
  let mechanism: GateVetoMechanism;

  beforeEach(() => {
    mechanism = new GateVetoMechanism();
    const rules = createDefaultVetoRules();
    for (const rule of rules) {
      mechanism.registerVetoRule(rule);
    }
  });

  it('利润率低于红线时应该否决M1', () => {
    const context: VetoContext = {
      projectId: 'P001',
      gateCode: 'M1',
      checklistResults: [],
      projectData: {},
      financialData: {
        estimatedCost: 100000,
        actualCost: 0,
        profitMargin: 0.10, // 10% < 15%红线
        budgetVariance: 0
      }
    };
    
    const result = mechanism.executeVetoCheck(context);
    
    expect(result.passed).toBe(false);
    expect(result.criticalVetos.length).toBeGreaterThan(0);
    expect(result.overallDecision).toBe('rejected');
  });

  it('利润率达标时应该通过M1', () => {
    const context: VetoContext = {
      projectId: 'P001',
      gateCode: 'M1',
      checklistResults: [],
      projectData: {},
      financialData: {
        estimatedCost: 100000,
        actualCost: 0,
        profitMargin: 0.20, // 20% > 15%红线
        budgetVariance: 0
      }
    };
    
    const result = mechanism.executeVetoCheck(context);
    
    expect(result.passed).toBe(true);
    expect(result.criticalVetos).toHaveLength(0);
    expect(result.overallDecision).toBe('approved');
  });

  it('Cpk不足时应该否决M8', () => {
    const context: VetoContext = {
      projectId: 'P001',
      gateCode: 'M8',
      checklistResults: [],
      projectData: {},
      qualityData: {
        cpk: 1.0, // < 1.33
        defectRate: 0,
        customerComplaints: 0
      }
    };
    
    const result = mechanism.executeVetoCheck(context);
    
    expect(result.passed).toBe(false);
    expect(result.overallDecision).toBe('rejected');
  });

  it('质量红线问题应该否决M9', () => {
    const context: VetoContext = {
      projectId: 'P001',
      gateCode: 'M9',
      checklistResults: [],
      projectData: {},
      qualityData: {
        cpk: 1.5,
        defectRate: 0.02, // 2% > 1%
        customerComplaints: 0
      }
    };
    
    const result = mechanism.executeVetoCheck(context);
    
    expect(result.passed).toBe(false);
    expect(result.escalationRequired).toBe(true);
  });
});

// ============================================================================
// 门径状态管理器测试
// ============================================================================

describe('GateStatusManager', () => {
  let manager: GateStatusManager;

  beforeEach(() => {
    manager = new GateStatusManager();
  });

  it('应该正确获取下一个门径', () => {
    expect(manager.getNextGate('M0')).toBe('M1');
    expect(manager.getNextGate('M5')).toBe('M6');
    expect(manager.getNextGate('M11')).toBe('M12');
    expect(manager.getNextGate('M12')).toBeNull();
  });

  it('应该正确识别硬门径', () => {
    expect(manager.isHardGate('M0')).toBe(true);
    expect(manager.isHardGate('M1')).toBe(false);
    expect(manager.isHardGate('H1')).toBe(true);
    expect(manager.isHardGate('H4')).toBe(false);
  });
});

// ============================================================================
// 表单构建器测试
// ============================================================================

describe('FormBuilder', () => {
  let builder: FormBuilder;

  beforeEach(() => {
    builder = new FormBuilder();
  });

  it('应该能创建表单', () => {
    const form = builder.createForm({
      id: 'form1',
      name: '测试表单',
      fields: []
    });
    
    expect(form.id).toBe('form1');
    expect(form.createdAt).toBeDefined();
  });

  it('应该能添加字段', () => {
    builder.createForm({
      id: 'form1',
      name: '测试表单',
      fields: []
    });
    
    const field: FieldDefinition = {
      id: 'field1',
      name: 'projectName',
      label: '项目名称',
      type: 'text',
      required: true
    };
    
    const success = builder.addField('form1', field);
    expect(success).toBe(true);
    
    const form = builder.getForm('form1');
    expect(form?.fields).toHaveLength(1);
  });

  it('应该正确验证必填字段', () => {
    builder.createForm({
      id: 'form1',
      name: '测试表单',
      fields: [{
        id: 'field1',
        name: 'projectName',
        label: '项目名称',
        type: 'text',
        required: true
      }]
    });
    
    const result = builder.validateFormData('form1', {});
    
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('projectName');
  });

  it('应该正确验证数值范围', () => {
    builder.createForm({
      id: 'form1',
      name: '测试表单',
      fields: [{
        id: 'field1',
        name: 'completion',
        label: '完成率',
        type: 'number',
        required: true,
        validation: { min: 0, max: 100 }
      }]
    });
    
    const invalidResult = builder.validateFormData('form1', { completion: 150 });
    expect(invalidResult.valid).toBe(false);
    
    const validResult = builder.validateFormData('form1', { completion: 80 });
    expect(validResult.valid).toBe(true);
  });
});

// ============================================================================
// 工作流设计器测试
// ============================================================================

describe('WorkflowDesigner', () => {
  let designer: WorkflowDesigner;

  beforeEach(() => {
    designer = new WorkflowDesigner();
  });

  it('应该能创建工作流', () => {
    const workflow = designer.createWorkflow({
      id: 'wf1',
      name: '测试流程',
      formId: 'form1',
      status: 'draft',
      nodes: [],
      startNodeId: 'start'
    });
    
    expect(workflow.id).toBe('wf1');
    expect(workflow.version).toBe(1);
  });

  it('应该能添加和连接节点', () => {
    designer.createWorkflow({
      id: 'wf1',
      name: '测试流程',
      formId: 'form1',
      status: 'draft',
      nodes: [
        { id: 'start', type: 'start', name: '开始', config: {}, nextNodes: [] }
      ],
      startNodeId: 'start'
    });
    
    const approvalNode: WorkflowNode = {
      id: 'approval1',
      type: 'approval',
      name: '审批',
      config: {
        approvers: { type: 'role', value: ['manager'] },
        approvalMode: 'any'
      },
      nextNodes: []
    };
    
    designer.addNode('wf1', approvalNode);
    designer.connectNodes('wf1', 'start', 'approval1');
    
    const workflow = designer.getWorkflow('wf1');
    expect(workflow?.nodes).toHaveLength(2);
    expect(workflow?.nodes[0].nextNodes).toContain('approval1');
  });

  it('应该验证缺少结束节点的流程', () => {
    designer.createWorkflow({
      id: 'wf1',
      name: '测试流程',
      formId: 'form1',
      status: 'draft',
      nodes: [
        { id: 'start', type: 'start', name: '开始', config: {}, nextNodes: [] }
      ],
      startNodeId: 'start'
    });
    
    const validation = designer.validateWorkflow('wf1');
    
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('缺少结束节点');
  });
});

// ============================================================================
// 工作流引擎测试
// ============================================================================

describe('WorkflowEngine', () => {
  let formBuilder: FormBuilder;
  let designer: WorkflowDesigner;
  let engine: WorkflowEngine;

  beforeEach(() => {
    formBuilder = new FormBuilder();
    designer = new WorkflowDesigner();
    engine = new WorkflowEngine(designer, formBuilder);
    
    // 创建测试表单
    formBuilder.createForm({
      id: 'form1',
      name: '测试表单',
      fields: [{
        id: 'field1',
        name: 'projectName',
        label: '项目名称',
        type: 'text',
        required: true
      }]
    });
    
    // 创建测试流程
    designer.createWorkflow({
      id: 'wf1',
      name: '测试流程',
      formId: 'form1',
      status: 'published',
      nodes: [
        { id: 'start', type: 'start', name: '开始', config: {}, nextNodes: ['approval1'] },
        { 
          id: 'approval1', 
          type: 'approval', 
          name: '审批', 
          config: { 
            approvers: { type: 'fixed', value: ['user1'] },
            approvalMode: 'any'
          }, 
          nextNodes: ['end'] 
        },
        { id: 'end', type: 'end', name: '结束', config: {}, nextNodes: [] }
      ],
      startNodeId: 'start'
    });
  });

  it('应该能启动流程实例', () => {
    const instance = engine.startInstance('wf1', { projectName: '测试项目' }, 'initiator1');
    
    expect(instance).not.toBeNull();
    expect(instance?.status).toBe('pending');
    expect(instance?.currentNodeId).toBe('approval1');
  });

  it('表单验证失败时不应该启动流程', () => {
    const instance = engine.startInstance('wf1', {}, 'initiator1');
    
    expect(instance).toBeNull();
  });

  it('应该能执行审批动作', () => {
    const instance = engine.startInstance('wf1', { projectName: '测试项目' }, 'initiator1');
    expect(instance).not.toBeNull();
    
    const success = engine.executeApproval(instance!.id, 'user1', 'approve', '同意');
    expect(success).toBe(true);
    
    const updated = engine.getInstance(instance!.id);
    expect(updated?.status).toBe('completed');
  });

  it('拒绝审批应该将状态设为rejected', () => {
    const instance = engine.startInstance('wf1', { projectName: '测试项目' }, 'initiator1');
    expect(instance).not.toBeNull();
    
    engine.executeApproval(instance!.id, 'user1', 'reject', '不同意');
    
    const updated = engine.getInstance(instance!.id);
    expect(updated?.status).toBe('rejected');
  });

  it('应该记录审批日志', () => {
    const instance = engine.startInstance('wf1', { projectName: '测试项目' }, 'initiator1');
    expect(instance).not.toBeNull();
    
    engine.executeApproval(instance!.id, 'user1', 'approve', '同意');
    
    const records = engine.getApprovalRecords(instance!.id);
    expect(records.length).toBeGreaterThan(0);
    expect(records[0].action).toBe('approve');
    
    const logs = engine.getLogs(instance!.id);
    expect(logs.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 预定义模板测试
// ============================================================================

describe('预定义模板', () => {
  it('门径评审表单模板应该包含必要字段', () => {
    const template = createGateReviewFormTemplate();
    
    expect(template.id).toBe('form_gate_review');
    expect(template.fields.length).toBeGreaterThan(0);
    
    const fieldNames = template.fields.map(f => f.name);
    expect(fieldNames).toContain('projectId');
    expect(fieldNames).toContain('gateCode');
    expect(fieldNames).toContain('trafficLight');
    expect(fieldNames).toContain('reviewSummary');
  });

  it('门径评审流程模板应该包含必要节点', () => {
    const template = createGateReviewWorkflowTemplate();
    
    expect(template.id).toBe('workflow_gate_review');
    expect(template.status).toBe('published');
    
    const nodeTypes = template.nodes.map(n => n.type);
    expect(nodeTypes).toContain('start');
    expect(nodeTypes).toContain('end');
    expect(nodeTypes).toContain('approval');
    expect(nodeTypes).toContain('condition');
  });

  it('门径评审流程应该区分硬门径和软门径', () => {
    const template = createGateReviewWorkflowTemplate();
    
    const conditionNode = template.nodes.find(n => n.type === 'condition');
    expect(conditionNode).toBeDefined();
    expect(conditionNode?.config.conditions).toBeDefined();
    expect(conditionNode?.config.conditions?.length).toBe(2);
  });
});
