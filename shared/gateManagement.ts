/**
 * GRT智能系统 - 门径管理体系 (Gate Management System)
 * 
 * 基于RFC-033实现M0-M12里程碑门径与H1-H4人力资本门径管理
 * 
 * @version 2.6.4
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 门径阶段 */
export type GatePhase = 
  | 'order_intake'      // Phase I: 订单接入 (M0-M2)
  | 'engineering'       // Phase II: 工程设计 (M3-M6)
  | 'industrialization' // Phase III: 工业化 (M7-M9)
  | 'execution';        // Phase IV: 执行交付 (M10-M12)

/** 门径代码 */
export type MilestoneGateCode = 
  | 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' 
  | 'M6' | 'M7' | 'M8' | 'M9' | 'M10' | 'M11' | 'M12';

/** 人力资本门径代码 */
export type HRGateCode = 'H1' | 'H2' | 'H3' | 'H4';

/** 审批级别 */
export type ApprovalLevel = 'project_manager' | 'department_head' | 'steering_committee';

/** 交通灯状态 */
export type TrafficLight = 'green' | 'yellow' | 'red';

/** 门径决策 */
export type GateDecision = 'approved' | 'approved_with_conditions' | 'rejected' | 'deferred';

/** 检查项类型 */
export type CheckItemType = 'mandatory' | 'optional' | 'conditional';

/** 检查项状态 */
export type CheckItemStatus = 'not_started' | 'in_progress' | 'completed' | 'not_applicable';

/** 门径状态 */
export type GateStatus = 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'on_hold';

// ============================================================================
// 门径定义
// ============================================================================

/** 门径定义接口 */
export interface GateDefinition {
  code: MilestoneGateCode | HRGateCode;
  name: string;
  nameEn: string;
  phase: GatePhase | 'hr_lifecycle';
  sequenceOrder: number;
  description: string;
  keyInputs: string[];
  coreActivities: string[];
  keyOutputs: string[];
  killCriteria: string[];
  approvalLevel: ApprovalLevel;
  isHardGate: boolean;
  /** 工程师确认检查点问题 - GRT智能项目架构师流程 */
  engineerCheckpoint?: string;
}

/** M0-M12里程碑门径定义 */
export const MILESTONE_GATES: Record<MilestoneGateCode, GateDefinition> = {
  M0: {
    code: 'M0',
    name: '战略筛选',
    nameEn: 'Strategic Screening',
    phase: 'order_intake',
    sequenceOrder: 0,
    description: '评估项目是否符合公司长期战略方向',
    keyInputs: ['市场趋势报告', '客户意向书'],
    coreActivities: ['战略匹配度分析', '宏观资源评估'],
    keyOutputs: ['构想书（Concept Paper）'],
    killCriteria: ['不符合公司长期战略方向'],
    approvalLevel: 'steering_committee',
    isHardGate: true
  },
  M1: {
    code: 'M1',
    name: '报价启动',
    nameEn: 'Quotation Initiation',
    phase: 'order_intake',
    sequenceOrder: 1,
    description: '跨部门成本估算，生成初步报价，分析零件清洗难点',
    keyInputs: ['客户RFQ', '技术粗略方案', '零件图纸/照片', '节拍时间要求'],
    coreActivities: [
      '跨部门成本估算（销售+工程+采购）',
      '识别关键清洗难点（盲孔/加强筋/密封面）',
      '节拍时间计算：固定喷淋时间 + (机器人目标数 * 每目标时间)',
      '布局建议：单腔室 vs 双腔室'
    ],
    keyOutputs: ['初步报价单（Quotation）', '技术方案草案', '成本分析报告'],
    killCriteria: ['预估利润率低于公司红线'],
    approvalLevel: 'department_head',
    isHardGate: false,
    engineerCheckpoint: '工程师，您是否批准此布局和节拍时间计算？'
  },
  M2: {
    code: 'M2',
    name: '订单确认',
    nameEn: 'Order Confirmation',
    phase: 'order_intake',
    sequenceOrder: 2,
    description: '合同评审、信用检查、项目号创建',
    keyInputs: ['客户PO（扫描件）', '合同草案'],
    coreActivities: ['合同评审', '信用检查', '项目号创建'],
    keyOutputs: ['签署的合同', 'ERP项目立项'],
    killCriteria: ['客户信用评级不达标', '合同条款有无法接受的法律风险'],
    approvalLevel: 'department_head',
    isHardGate: true
  },
  M3: {
    code: 'M3',
    name: '项目启动',
    nameEn: 'Program Launch',
    phase: 'engineering',
    sequenceOrder: 3,
    description: '召开启动会、锁定L1计划、风险登记',
    keyInputs: ['项目章程', '核心团队名单'],
    coreActivities: ['召开启动会', '锁定L1计划', '风险登记'],
    keyOutputs: ['冻结的需求规范（SRS）', '项目计划书'],
    killCriteria: ['核心资源（人/资金）无法到位'],
    approvalLevel: 'steering_committee',
    isHardGate: true
  },
  M4: {
    code: 'M4',
    name: '系统设计',
    nameEn: 'System Design / PDR',
    phase: 'engineering',
    sequenceOrder: 4,
    description: '架构设计、关键物料选型、采购长周期件、电气设计',
    keyInputs: ['需求规范', '类似项目经验', '清洗策略动作库'],
    coreActivities: [
      '架构设计',
      '关键物料选型',
      '采购长周期件',
      '泵选型（流量/压力）',
      '喷嘴布局设计',
      '生成I/O列表（包含: Robot_Enter_Request, Door_Safety_Lock）',
      '设计HMI结构: 创建"机器人动作库选择"页面'
    ],
    keyOutputs: ['初步设计评审报告（PDR）', '初步BOM', 'I/O列表', 'HMI结构设计'],
    killCriteria: ['关键技术路径存在未解决的重大缺陷'],
    approvalLevel: 'project_manager',
    isHardGate: false,
    engineerCheckpoint: '工程师，请确认I/O列表和关键部件选型？'
  },
  M5: {
    code: 'M5',
    name: '详细设计',
    nameEn: 'Detailed Design / CDR',
    phase: 'engineering',
    sequenceOrder: 5,
    description: '详细设计评审（CDR）、模具开模指令',
    keyInputs: ['3D模型', '电路图', '软件代码'],
    coreActivities: ['详细设计评审（CDR）', '模具开模指令'],
    keyOutputs: ['冻结的BOM', '发布的图纸', '模具PO'],
    killCriteria: ['设计未完成验证', '成本超支且无补救方案'],
    approvalLevel: 'steering_committee',
    isHardGate: true
  },
  M6: {
    code: 'M6',
    name: '原型验证',
    nameEn: 'Prototype / DVP&R',
    phase: 'engineering',
    sequenceOrder: 6,
    description: '原型制造、实验室测试（DVP）',
    keyInputs: ['样件/样机', '测试计划'],
    coreActivities: ['原型制造', '实验室测试（DVP）'],
    keyOutputs: ['验证报告（DVP&R）', '初始PFMEA'],
    killCriteria: ['原型机性能不满足客户M2合同指标'],
    approvalLevel: 'project_manager',
    isHardGate: false
  },
  M7: {
    code: 'M7',
    name: '工业化准备',
    nameEn: 'Industrialization',
    phase: 'industrialization',
    sequenceOrder: 7,
    description: '生产线搭建、供应商PPAP、人员培训',
    keyInputs: ['工装夹具图', 'SOP草案'],
    coreActivities: ['生产线搭建', '供应商PPAP', '人员培训'],
    keyOutputs: ['试产准备就绪检查表'],
    killCriteria: ['供应链（物料）未就绪', '产线存在安全隐患'],
    approvalLevel: 'steering_committee',
    isHardGate: true
  },
  M8: {
    code: 'M8',
    name: '过程验证',
    nameEn: 'Process Validation / Pilot Run',
    phase: 'industrialization',
    sequenceOrder: 8,
    description: '试生产、牙膏试验验证、全尺寸测量、Cpk分析',
    keyInputs: ['试产物料', '控制计划', '牙膏试验标准'],
    coreActivities: [
      '试生产（Pilot Run）',
      '全尺寸测量',
      'Cpk分析',
      '牙膏试验（Toothpaste Test）- 模拟极端污染验证100%覆盖',
      '自适应调试: 分析清洗后照片残留位置',
      '机器人路径优化: 根据残留分析调整轨迹'
    ],
    keyOutputs: ['过程审核报告', '首件报告（FAI）', '牙膏试验报告'],
    killCriteria: ['过程能力不足（Cpk < 1.33）', '良率过低', '牙膏试验未通过'],
    approvalLevel: 'project_manager',
    isHardGate: false,
    engineerCheckpoint: '牙膏试验是否通过？如果通过，请继续进行FAT。'
  },
  M9: {
    code: 'M9',
    name: '量产签发',
    nameEn: 'Launch Readiness',
    phase: 'industrialization',
    sequenceOrder: 9,
    description: '产能确认、销售发货培训、最终审核',
    keyInputs: ['试产合格品', '包装规范'],
    coreActivities: ['产能确认', '销售发货培训', '最终审核'],
    keyOutputs: ['量产批准书（PSW/SOP）', '发货计划'],
    killCriteria: ['仍有未关闭的质量红线问题'],
    approvalLevel: 'steering_committee',
    isHardGate: true
  },
  M10: {
    code: 'M10',
    name: '量产启动',
    nameEn: 'Start of Production',
    phase: 'execution',
    sequenceOrder: 10,
    description: '批量生产监控、早期爬坡支持',
    keyInputs: ['正式订单', '物流计划'],
    coreActivities: ['批量生产监控', '早期爬坡支持'],
    keyOutputs: ['每日产量报表', '发货单'],
    killCriteria: ['发生重大停线事故', '客户退货'],
    approvalLevel: 'project_manager',
    isHardGate: false
  },
  M11: {
    code: 'M11',
    name: '爬坡稳定',
    nameEn: 'Ramp-up Stabilization',
    phase: 'execution',
    sequenceOrder: 11,
    description: '瓶颈工序优化、节拍提升',
    keyInputs: ['质量数据', '效率数据'],
    coreActivities: ['瓶颈工序优化', '节拍提升'],
    keyOutputs: ['产能达标报告'],
    killCriteria: ['持续无法达到设计产能'],
    approvalLevel: 'project_manager',
    isHardGate: false
  },
  M12: {
    code: 'M12',
    name: '项目关闭',
    nameEn: 'Project Close',
    phase: 'execution',
    sequenceOrder: 12,
    description: '成本决算、团队解散、经验总结、知识循环',
    keyInputs: ['财务报表', '客户反馈', '项目挑战记录'],
    coreActivities: [
      '成本决算',
      '团队解散',
      '经验总结',
      '生成"操作手册"、"备件清单"、"维护指南"',
      '知识循环: 保存项目特定挑战到GRT数据库供未来参考'
    ],
    keyOutputs: ['项目结项报告', '知识库条目', '操作手册', '备件清单', '维护指南'],
    killCriteria: ['仍有未结清的财务款项', '法律纠纷'],
    approvalLevel: 'steering_committee',
    isHardGate: true,
    engineerCheckpoint: '工程师，请确认项目结项报告是否完成？'
  }
};

/** H1-H4人力资本门径定义 */
export const HR_GATES: Record<HRGateCode, GateDefinition> = {
  H1: {
    code: 'H1',
    name: '岗位定义结构化',
    nameEn: 'JD as Data',
    phase: 'hr_lifecycle' as any,
    sequenceOrder: 1,
    description: 'AI分析历史高绩效员工的行为数据，建议该岗位的核心职责权重',
    keyInputs: ['业务部门的战略目标', '预算审批'],
    coreActivities: ['AI分析历史高绩效员工数据', '建议核心职责权重'],
    keyOutputs: ['结构化的JD数据包（包含权重化的技能标签）'],
    killCriteria: ['该岗位不具备明确的可量化产出', 'JD模糊不清'],
    approvalLevel: 'department_head',
    isHardGate: true
  },
  H2: {
    code: 'H2',
    name: '面试数据结构化采集',
    nameEn: 'ATS Phase',
    phase: 'hr_lifecycle' as any,
    sequenceOrder: 2,
    description: '面试评价表必须与Gate H1定义的关键能力模型一一对应',
    keyInputs: ['候选人简历', 'H1定义的能力模型'],
    coreActivities: ['能力维度打分', '记录待发展项', '背景调查'],
    keyOutputs: ['带有能力Gap标签的录用通知（Offer）'],
    killCriteria: ['候选人能力雷达图与岗位模型匹配度过低', '背景调查未通过'],
    approvalLevel: 'department_head',
    isHardGate: true
  },
  H3: {
    code: 'H3',
    name: '入职扫描与数字化握手',
    nameEn: 'HRIS Input',
    phase: 'hr_lifecycle' as any,
    sequenceOrder: 3,
    description: '新员工报到当天，证件、学历证书、资质证明的审核',
    keyInputs: ['证件扫描件', '学历证书', '资质证明'],
    coreActivities: ['OCR自动提取信息', 'ATS数据迁移到HRIS', '证件真实性校验'],
    keyOutputs: ['完整的员工档案', '能力Gap标签迁移'],
    killCriteria: ['证件过期', '证件伪造'],
    approvalLevel: 'project_manager',
    isHardGate: true
  },
  H4: {
    code: 'H4',
    name: '基于面试数据的KPI自动生成',
    nameEn: 'Auto KPI Generation',
    phase: 'hr_lifecycle' as any,
    sequenceOrder: 4,
    description: '系统自动为新员工生成第一份绩效合约',
    keyInputs: ['H1的JD数据', 'H2的面试评价Gap标签'],
    coreActivities: ['AI引擎处理', '规则库匹配', 'KPI权重分配'],
    keyOutputs: ['系统自动生成的绩效合约（Performance Contract）'],
    killCriteria: ['无法生成可量化的KPI', '员工拒绝签署绩效合约'],
    approvalLevel: 'department_head',
    isHardGate: false
  }
};

// ============================================================================
// 检查清单引擎
// ============================================================================

/** 检查项定义 */
export interface CheckItem {
  id: string;
  code: string;
  name: string;
  type: CheckItemType;
  verificationMethod: string;
  responsibleRole: string;
  sequenceOrder: number;
}

/** 检查项结果 */
export interface CheckItemResult {
  checkItemId: string;
  status: CheckItemStatus;
  evidenceUrl?: string;
  completedBy?: string;
  completedAt?: Date;
  notes?: string;
}

/** 门径检查清单引擎 */
export class GateChecklistEngine {
  private checkItems: Map<string, CheckItem[]> = new Map();

  /**
   * 注册门径的检查项
   */
  registerCheckItems(gateCode: string, items: CheckItem[]): void {
    this.checkItems.set(gateCode, items);
  }

  /**
   * 获取门径的检查项
   */
  getCheckItems(gateCode: string): CheckItem[] {
    return this.checkItems.get(gateCode) || [];
  }

  /**
   * 评估检查清单完成状态
   */
  evaluateChecklist(gateCode: string, results: CheckItemResult[]): {
    allMandatoryCompleted: boolean;
    completionRate: number;
    pendingItems: CheckItem[];
    trafficLight: TrafficLight;
  } {
    const items = this.getCheckItems(gateCode);
    const mandatoryItems = items.filter(item => item.type === 'mandatory');
    
    const completedResults = new Set(
      results
        .filter(r => r.status === 'completed' || r.status === 'not_applicable')
        .map(r => r.checkItemId)
    );

    const mandatoryCompleted = mandatoryItems.filter(item => 
      completedResults.has(item.id)
    );

    const allMandatoryCompleted = mandatoryCompleted.length === mandatoryItems.length;
    const completionRate = items.length > 0 
      ? completedResults.size / items.length 
      : 0;

    const pendingItems = items.filter(item => !completedResults.has(item.id));

    let trafficLight: TrafficLight = 'green';
    if (!allMandatoryCompleted) {
      trafficLight = 'red';
    } else if (completionRate < 0.8) {
      trafficLight = 'yellow';
    }

    return {
      allMandatoryCompleted,
      completionRate,
      pendingItems,
      trafficLight
    };
  }
}

// ============================================================================
// 否决机制
// ============================================================================

/** 否决规则 */
export interface VetoRule {
  id: string;
  gateCode: string;
  ruleName: string;
  ruleDescription: string;
  checkFunction: (context: VetoContext) => VetoResult;
  severity: 'critical' | 'major' | 'minor';
}

/** 否决上下文 */
export interface VetoContext {
  projectId: string;
  gateCode: string;
  checklistResults: CheckItemResult[];
  projectData: Record<string, any>;
  financialData?: {
    estimatedCost: number;
    actualCost: number;
    profitMargin: number;
    budgetVariance: number;
  };
  qualityData?: {
    cpk: number;
    defectRate: number;
    customerComplaints: number;
  };
}

/** 否决结果 */
export interface VetoResult {
  vetoed: boolean;
  reason?: string;
  severity?: 'critical' | 'major' | 'minor';
  recommendation?: string;
  escalationRequired?: boolean;
}

/** 门径否决机制 */
export class GateVetoMechanism {
  private vetoRules: Map<string, VetoRule[]> = new Map();

  /**
   * 注册否决规则
   */
  registerVetoRule(rule: VetoRule): void {
    const rules = this.vetoRules.get(rule.gateCode) || [];
    rules.push(rule);
    this.vetoRules.set(rule.gateCode, rules);
  }

  /**
   * 执行否决检查
   */
  executeVetoCheck(context: VetoContext): {
    passed: boolean;
    vetoResults: VetoResult[];
    criticalVetos: VetoResult[];
    escalationRequired: boolean;
    overallDecision: GateDecision;
  } {
    const rules = this.vetoRules.get(context.gateCode) || [];
    const vetoResults: VetoResult[] = [];
    const criticalVetos: VetoResult[] = [];
    let escalationRequired = false;

    for (const rule of rules) {
      const result = rule.checkFunction(context);
      if (result.vetoed) {
        vetoResults.push(result);
        if (result.severity === 'critical') {
          criticalVetos.push(result);
        }
        if (result.escalationRequired) {
          escalationRequired = true;
        }
      }
    }

    const passed = criticalVetos.length === 0;
    let overallDecision: GateDecision;

    if (criticalVetos.length > 0) {
      overallDecision = 'rejected';
    } else if (vetoResults.length > 0) {
      overallDecision = 'approved_with_conditions';
    } else {
      overallDecision = 'approved';
    }

    return {
      passed,
      vetoResults,
      criticalVetos,
      escalationRequired,
      overallDecision
    };
  }
}

// ============================================================================
// 默认否决规则
// ============================================================================

/** 创建默认否决规则 */
export function createDefaultVetoRules(): VetoRule[] {
  return [
    // M1: 利润率红线检查
    {
      id: 'M1_PROFIT_MARGIN',
      gateCode: 'M1',
      ruleName: '利润率红线检查',
      ruleDescription: '预估利润率低于公司红线（15%）时否决',
      severity: 'critical',
      checkFunction: (ctx) => {
        const profitMargin = ctx.financialData?.profitMargin ?? 0;
        const threshold = 0.15; // 15%
        if (profitMargin < threshold) {
          return {
            vetoed: true,
            reason: `预估利润率 ${(profitMargin * 100).toFixed(1)}% 低于公司红线 ${threshold * 100}%`,
            severity: 'critical',
            recommendation: '重新评估成本结构或与客户协商价格',
            escalationRequired: true
          };
        }
        return { vetoed: false };
      }
    },
    // M5: 成本超支检查
    {
      id: 'M5_COST_OVERRUN',
      gateCode: 'M5',
      ruleName: '成本超支检查',
      ruleDescription: '成本超支超过10%且无补救方案时否决',
      severity: 'critical',
      checkFunction: (ctx) => {
        const variance = ctx.financialData?.budgetVariance ?? 0;
        if (variance > 0.1) {
          return {
            vetoed: true,
            reason: `成本超支 ${(variance * 100).toFixed(1)}%，超过允许的10%阈值`,
            severity: 'critical',
            recommendation: '提交成本补救方案或申请预算追加',
            escalationRequired: true
          };
        }
        return { vetoed: false };
      }
    },
    // M8: 过程能力检查
    {
      id: 'M8_CPK_CHECK',
      gateCode: 'M8',
      ruleName: '过程能力检查',
      ruleDescription: 'Cpk低于1.33时否决',
      severity: 'critical',
      checkFunction: (ctx) => {
        const cpk = ctx.qualityData?.cpk ?? 0;
        if (cpk < 1.33) {
          return {
            vetoed: true,
            reason: `过程能力指数 Cpk=${cpk.toFixed(2)} 低于要求的1.33`,
            severity: 'critical',
            recommendation: '优化工艺参数或更换设备以提高过程能力',
            escalationRequired: false
          };
        }
        return { vetoed: false };
      }
    },
    // M9: 质量红线检查
    {
      id: 'M9_QUALITY_REDLINE',
      gateCode: 'M9',
      ruleName: '质量红线检查',
      ruleDescription: '存在未关闭的质量红线问题时否决',
      severity: 'critical',
      checkFunction: (ctx) => {
        const defectRate = ctx.qualityData?.defectRate ?? 0;
        if (defectRate > 0.01) { // 1%
          return {
            vetoed: true,
            reason: `缺陷率 ${(defectRate * 100).toFixed(2)}% 超过允许的1%`,
            severity: 'critical',
            recommendation: '关闭所有质量红线问题后重新提交评审',
            escalationRequired: true
          };
        }
        return { vetoed: false };
      }
    }
  ];
}

// ============================================================================
// 门径状态管理器
// ============================================================================

/** 项目门径状态 */
export interface ProjectGateState {
  projectId: string;
  gateCode: string;
  status: GateStatus;
  plannedDate?: Date;
  actualDate?: Date;
  reviewerId?: string;
  reviewNotes?: string;
  trafficLight: TrafficLight;
  checklistResults: CheckItemResult[];
}

/** 门径状态管理器 */
export class GateStatusManager {
  private checklistEngine: GateChecklistEngine;
  private vetoMechanism: GateVetoMechanism;

  constructor() {
    this.checklistEngine = new GateChecklistEngine();
    this.vetoMechanism = new GateVetoMechanism();
    
    // 注册默认否决规则
    const defaultRules = createDefaultVetoRules();
    for (const rule of defaultRules) {
      this.vetoMechanism.registerVetoRule(rule);
    }
  }

  /**
   * 评估门径是否可以通过
   */
  evaluateGateReadiness(state: ProjectGateState, context: VetoContext): {
    ready: boolean;
    checklistStatus: ReturnType<GateChecklistEngine['evaluateChecklist']>;
    vetoStatus: ReturnType<GateVetoMechanism['executeVetoCheck']>;
    recommendedDecision: GateDecision;
    issues: string[];
  } {
    const checklistStatus = this.checklistEngine.evaluateChecklist(
      state.gateCode, 
      state.checklistResults
    );
    
    const vetoStatus = this.vetoMechanism.executeVetoCheck(context);

    const issues: string[] = [];
    
    if (!checklistStatus.allMandatoryCompleted) {
      issues.push(`${checklistStatus.pendingItems.length}个必填检查项未完成`);
    }
    
    for (const veto of vetoStatus.vetoResults) {
      if (veto.reason) {
        issues.push(veto.reason);
      }
    }

    const ready = checklistStatus.allMandatoryCompleted && vetoStatus.passed;

    let recommendedDecision: GateDecision;
    if (!ready) {
      recommendedDecision = vetoStatus.criticalVetos.length > 0 ? 'rejected' : 'deferred';
    } else if (vetoStatus.vetoResults.length > 0) {
      recommendedDecision = 'approved_with_conditions';
    } else {
      recommendedDecision = 'approved';
    }

    return {
      ready,
      checklistStatus,
      vetoStatus,
      recommendedDecision,
      issues
    };
  }

  /**
   * 获取下一个门径
   */
  getNextGate(currentGateCode: MilestoneGateCode): MilestoneGateCode | null {
    const currentGate = MILESTONE_GATES[currentGateCode];
    const nextOrder = currentGate.sequenceOrder + 1;
    
    for (const [code, gate] of Object.entries(MILESTONE_GATES)) {
      if (gate.sequenceOrder === nextOrder) {
        return code as MilestoneGateCode;
      }
    }
    
    return null;
  }

  /**
   * 检查是否为硬门径
   */
  isHardGate(gateCode: MilestoneGateCode | HRGateCode): boolean {
    const milestoneGate = MILESTONE_GATES[gateCode as MilestoneGateCode];
    if (milestoneGate) {
      return milestoneGate.isHardGate;
    }
    
    const hrGate = HR_GATES[gateCode as HRGateCode];
    if (hrGate) {
      return hrGate.isHardGate;
    }
    
    return false;
  }
}

// ============================================================================
// 导出
// ============================================================================

export const gateChecklistEngine = new GateChecklistEngine();
export const gateVetoMechanism = new GateVetoMechanism();
export const gateStatusManager = new GateStatusManager();
