/**
 * GRT Intelligent System - M0-M12 Project Lifecycle State Machine
 * Version: 1.3.77
 * 
 * 实现严格的项目阶段控制，支持Gate门禁审批和AI自动化操作
 */

// =============================================================================
// 项目阶段枚举 (Project Phase Enum)
// =============================================================================
export enum ProjectPhase {
  M0_OPPORTUNITY = 'M0_OPPORTUNITY',           // 商机/Opportunity
  M1_QUOTATION = 'M1_QUOTATION',               // 报价/Quotation
  M2_KICKOFF = 'M2_KICKOFF',                   // 立项/Kick-off
  M3_TECHNICAL_DESIGN = 'M3_TECHNICAL_DESIGN', // 技术设计/Technical Design
  M4_DESIGN_REVIEW = 'M4_DESIGN_REVIEW',       // 设计评审/Design Review
  M5_PROCUREMENT = 'M5_PROCUREMENT',           // 采购/Procurement
  M6_MANUFACTURING = 'M6_MANUFACTURING',       // 制造/Manufacturing
  M7_ASSEMBLY = 'M7_ASSEMBLY',                 // 组装/Assembly
  M8_PRODUCTION = 'M8_PRODUCTION',             // 生产/Production
  M9_DEBUGGING = 'M9_DEBUGGING',               // 调试/Debugging
  M10_PRE_ACCEPTANCE = 'M10_PRE_ACCEPTANCE',   // 预验收/Pre-acceptance
  M11_SHIPPING = 'M11_SHIPPING',               // 发货/Shipping
  M12_HANDOVER = 'M12_HANDOVER',               // 交付与售后/Handover
}

// =============================================================================
// 阶段状态枚举 (Phase Status Enum)
// =============================================================================
export enum PhaseStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_GATE = 'PENDING_GATE',  // 等待Gate审批
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
  SKIPPED = 'SKIPPED',
}

// =============================================================================
// Gate类型枚举 (Gate Type Enum)
// =============================================================================
export enum GateType {
  NONE = 'NONE',
  TECHNICAL_REVIEW = 'TECHNICAL_REVIEW',       // 技术评审
  FINANCIAL_APPROVAL = 'FINANCIAL_APPROVAL',   // 财务审批
  CUSTOMER_APPROVAL = 'CUSTOMER_APPROVAL',     // 客户确认
  QUALITY_CHECK = 'QUALITY_CHECK',             // 质量检查
  MANAGEMENT_APPROVAL = 'MANAGEMENT_APPROVAL', // 管理层审批
}

// =============================================================================
// AI操作类型枚举 (AI Action Type Enum)
// =============================================================================
export enum AIActionType {
  ANALYZE_HISTORY = 'ANALYZE_HISTORY',           // 分析历史案例
  GENERATE_QUOTATION = 'GENERATE_QUOTATION',     // 生成报价
  GENERATE_BOM = 'GENERATE_BOM',                 // 生成BOM
  GENERATE_GANTT = 'GENERATE_GANTT',             // 生成甘特图
  RISK_ANALYSIS = 'RISK_ANALYSIS',               // 风险分析
  GENERATE_SPARE_PARTS = 'GENERATE_SPARE_PARTS', // 生成备件清单
  GENERATE_REPORT = 'GENERATE_REPORT',           // 生成报告
}

// =============================================================================
// 阶段配置接口 (Phase Configuration Interface)
// =============================================================================
export interface PhaseConfig {
  phase: ProjectPhase;
  name: string;
  nameCN: string;
  description: string;
  descriptionCN: string;
  requiredRoles: string[];
  gateType: GateType;
  gateConditions: string[];
  aiActions: AIActionType[];
  estimatedDurationDays: number;
  allowedTransitions: ProjectPhase[];
  requiredDocuments: string[];
  outputs: string[];
}

// =============================================================================
// 阶段转换结果接口 (Transition Result Interface)
// =============================================================================
export interface TransitionResult {
  success: boolean;
  fromPhase: ProjectPhase;
  toPhase: ProjectPhase;
  message: string;
  blockedBy?: string[];
  requiredActions?: string[];
  aiRecommendations?: string[];
}

// =============================================================================
// 项目状态接口 (Project State Interface)
// =============================================================================
export interface ProjectState {
  projectId: string;
  currentPhase: ProjectPhase;
  phaseStatus: PhaseStatus;
  phaseHistory: PhaseHistoryEntry[];
  gateApprovals: GateApproval[];
  aiInsights: AIInsight[];
  blockers: string[];
  completedDocuments: string[];
  startDate: Date;
  estimatedEndDate: Date;
  actualEndDate?: Date;
}

export interface PhaseHistoryEntry {
  phase: ProjectPhase;
  status: PhaseStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  notes?: string;
  completedBy?: string;
}

export interface GateApproval {
  gateType: GateType;
  phase: ProjectPhase;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approver?: string;
  approvedAt?: Date;
  comments?: string;
  conditions?: string[];
}

export interface AIInsight {
  type: AIActionType;
  phase: ProjectPhase;
  content: string;
  generatedAt: Date;
  confidence: number;
  recommendations: string[];
}

// =============================================================================
// M0-M12 阶段配置定义 (Phase Configuration Definitions)
// =============================================================================
export const PHASE_CONFIGS: Record<ProjectPhase, PhaseConfig> = {
  [ProjectPhase.M0_OPPORTUNITY]: {
    phase: ProjectPhase.M0_OPPORTUNITY,
    name: 'Opportunity',
    nameCN: '商机',
    description: 'Input customer requirements, generate preliminary technical solution',
    descriptionCN: '输入客户需求，生成初步技术方案',
    requiredRoles: ['SALES', 'SALES_MANAGER'],
    gateType: GateType.NONE,
    gateConditions: [],
    aiActions: [AIActionType.ANALYZE_HISTORY],
    estimatedDurationDays: 7,
    allowedTransitions: [ProjectPhase.M1_QUOTATION],
    requiredDocuments: ['customer_requirements', 'preliminary_solution'],
    outputs: ['opportunity_record', 'similar_cases_analysis'],
  },
  
  [ProjectPhase.M1_QUOTATION]: {
    phase: ProjectPhase.M1_QUOTATION,
    name: 'Quotation',
    nameCN: '报价',
    description: 'Generate detailed quotation with cost breakdown',
    descriptionCN: '生成详细报价单，包含成本分解',
    requiredRoles: ['SALES', 'SALES_MANAGER', 'FINANCE'],
    gateType: GateType.MANAGEMENT_APPROVAL,
    gateConditions: ['profit_margin_check', 'credit_check'],
    aiActions: [AIActionType.GENERATE_QUOTATION],
    estimatedDurationDays: 5,
    allowedTransitions: [ProjectPhase.M2_KICKOFF, ProjectPhase.M0_OPPORTUNITY],
    requiredDocuments: ['quotation_form', 'cost_breakdown'],
    outputs: ['formal_quotation', 'profit_analysis'],
  },
  
  [ProjectPhase.M2_KICKOFF]: {
    phase: ProjectPhase.M2_KICKOFF,
    name: 'Kick-off',
    nameCN: '立项',
    description: 'Project initiation with contract signing',
    descriptionCN: '项目启动，合同签订',
    requiredRoles: ['PROJECT_MANAGER', 'SALES_MANAGER', 'FINANCE'],
    gateType: GateType.FINANCIAL_APPROVAL,
    gateConditions: ['contract_signed', 'deposit_received'],
    aiActions: [AIActionType.GENERATE_GANTT, AIActionType.RISK_ANALYSIS],
    estimatedDurationDays: 3,
    allowedTransitions: [ProjectPhase.M3_TECHNICAL_DESIGN],
    requiredDocuments: ['signed_contract', 'deposit_receipt', 'project_charter'],
    outputs: ['project_plan', 'gantt_chart', 'risk_register'],
  },
  
  [ProjectPhase.M3_TECHNICAL_DESIGN]: {
    phase: ProjectPhase.M3_TECHNICAL_DESIGN,
    name: 'Technical Design',
    nameCN: '技术设计',
    description: 'Mechanical and electrical design phase',
    descriptionCN: '机械和电气设计阶段',
    requiredRoles: ['MECHANICAL_ENGINEER', 'ELECTRICAL_ENGINEER', 'PROJECT_MANAGER'],
    gateType: GateType.NONE,
    gateConditions: [],
    aiActions: [AIActionType.GENERATE_BOM],
    estimatedDurationDays: 14,
    allowedTransitions: [ProjectPhase.M4_DESIGN_REVIEW],
    requiredDocuments: ['mechanical_drawings', 'electrical_schematics', 'bom_draft'],
    outputs: ['design_package', 'preliminary_bom'],
  },
  
  [ProjectPhase.M4_DESIGN_REVIEW]: {
    phase: ProjectPhase.M4_DESIGN_REVIEW,
    name: 'Design Review',
    nameCN: '设计评审',
    description: 'Internal design review gate',
    descriptionCN: '内部设计评审门禁',
    requiredRoles: ['CHIEF_ENGINEER', 'PROJECT_MANAGER', 'QUALITY_MANAGER'],
    gateType: GateType.TECHNICAL_REVIEW,
    gateConditions: ['design_complete', 'bom_verified', 'safety_check'],
    aiActions: [AIActionType.RISK_ANALYSIS],
    estimatedDurationDays: 2,
    allowedTransitions: [ProjectPhase.M5_PROCUREMENT, ProjectPhase.M3_TECHNICAL_DESIGN],
    requiredDocuments: ['review_checklist', 'design_approval_form'],
    outputs: ['approved_design', 'review_minutes'],
  },
  
  [ProjectPhase.M5_PROCUREMENT]: {
    phase: ProjectPhase.M5_PROCUREMENT,
    name: 'Procurement',
    nameCN: '采购',
    description: 'Material procurement based on approved BOM',
    descriptionCN: '根据批准的BOM进行物料采购',
    requiredRoles: ['PROCUREMENT', 'PROJECT_MANAGER'],
    gateType: GateType.NONE,
    gateConditions: [],
    aiActions: [],
    estimatedDurationDays: 21,
    allowedTransitions: [ProjectPhase.M6_MANUFACTURING],
    requiredDocuments: ['purchase_orders', 'supplier_confirmations'],
    outputs: ['procurement_status', 'delivery_schedule'],
  },
  
  [ProjectPhase.M6_MANUFACTURING]: {
    phase: ProjectPhase.M6_MANUFACTURING,
    name: 'Manufacturing',
    nameCN: '制造',
    description: 'Parts manufacturing and machining',
    descriptionCN: '零件制造和加工',
    requiredRoles: ['PRODUCTION_MANAGER', 'MACHINIST'],
    gateType: GateType.NONE,
    gateConditions: [],
    aiActions: [],
    estimatedDurationDays: 14,
    allowedTransitions: [ProjectPhase.M7_ASSEMBLY],
    requiredDocuments: ['work_orders', 'quality_records'],
    outputs: ['manufactured_parts', 'inspection_reports'],
  },
  
  [ProjectPhase.M7_ASSEMBLY]: {
    phase: ProjectPhase.M7_ASSEMBLY,
    name: 'Assembly',
    nameCN: '组装',
    description: 'Mechanical and electrical assembly',
    descriptionCN: '机械和电气组装',
    requiredRoles: ['ASSEMBLY_TECHNICIAN', 'ELECTRICAL_TECHNICIAN'],
    gateType: GateType.QUALITY_CHECK,
    gateConditions: ['parts_complete', 'assembly_checklist'],
    aiActions: [],
    estimatedDurationDays: 10,
    allowedTransitions: [ProjectPhase.M8_PRODUCTION],
    requiredDocuments: ['assembly_checklist', 'wiring_verification'],
    outputs: ['assembled_equipment', 'assembly_report'],
  },
  
  [ProjectPhase.M8_PRODUCTION]: {
    phase: ProjectPhase.M8_PRODUCTION,
    name: 'Production',
    nameCN: '生产',
    description: 'Production execution with QR code material tracking',
    descriptionCN: '生产执行，扫码领料',
    requiredRoles: ['PRODUCTION_OPERATOR', 'PRODUCTION_MANAGER'],
    gateType: GateType.NONE,
    gateConditions: [],
    aiActions: [],
    estimatedDurationDays: 7,
    allowedTransitions: [ProjectPhase.M9_DEBUGGING],
    requiredDocuments: ['production_log', 'material_tracking'],
    outputs: ['production_record', 'time_tracking'],
  },
  
  [ProjectPhase.M9_DEBUGGING]: {
    phase: ProjectPhase.M9_DEBUGGING,
    name: 'Debugging',
    nameCN: '调试',
    description: 'Software programming and internal FAT',
    descriptionCN: '软件烧录，内部FAT测试',
    requiredRoles: ['DEBUG_ENGINEER', 'ELECTRICAL_ENGINEER', 'QUALITY_ENGINEER'],
    gateType: GateType.QUALITY_CHECK,
    gateConditions: ['fat_passed', 'safety_test_passed'],
    aiActions: [AIActionType.GENERATE_REPORT],
    estimatedDurationDays: 5,
    allowedTransitions: [ProjectPhase.M10_PRE_ACCEPTANCE],
    requiredDocuments: ['fat_report', 'test_protocols'],
    outputs: ['fat_certificate', 'test_data'],
  },
  
  [ProjectPhase.M10_PRE_ACCEPTANCE]: {
    phase: ProjectPhase.M10_PRE_ACCEPTANCE,
    name: 'Pre-acceptance',
    nameCN: '预验收',
    description: 'Customer on-site or video acceptance',
    descriptionCN: '客户来厂或视频验收',
    requiredRoles: ['PROJECT_MANAGER', 'SALES', 'QUALITY_MANAGER'],
    gateType: GateType.CUSTOMER_APPROVAL,
    gateConditions: ['customer_signed', 'punch_list_resolved'],
    aiActions: [AIActionType.GENERATE_REPORT],
    estimatedDurationDays: 3,
    allowedTransitions: [ProjectPhase.M11_SHIPPING, ProjectPhase.M9_DEBUGGING],
    requiredDocuments: ['acceptance_form', 'punch_list'],
    outputs: ['pre_acceptance_certificate', 'remaining_issues'],
  },
  
  [ProjectPhase.M11_SHIPPING]: {
    phase: ProjectPhase.M11_SHIPPING,
    name: 'Shipping',
    nameCN: '发货',
    description: 'Equipment shipping after payment confirmation',
    descriptionCN: '财务确认收款后发货',
    requiredRoles: ['LOGISTICS', 'FINANCE', 'PROJECT_MANAGER'],
    gateType: GateType.FINANCIAL_APPROVAL,
    gateConditions: ['payment_received', 'shipping_clearance'],
    aiActions: [],
    estimatedDurationDays: 2,
    allowedTransitions: [ProjectPhase.M12_HANDOVER],
    requiredDocuments: ['payment_confirmation', 'shipping_release', 'packing_list'],
    outputs: ['shipping_documents', 'tracking_number'],
  },
  
  [ProjectPhase.M12_HANDOVER]: {
    phase: ProjectPhase.M12_HANDOVER,
    name: 'Handover',
    nameCN: '交付与售后',
    description: 'On-site installation, SAT, and warranty period',
    descriptionCN: '现场安装SAT，转入维保期',
    requiredRoles: ['SERVICE_ENGINEER', 'PROJECT_MANAGER', 'CUSTOMER'],
    gateType: GateType.CUSTOMER_APPROVAL,
    gateConditions: ['sat_passed', 'final_acceptance_signed'],
    aiActions: [AIActionType.GENERATE_SPARE_PARTS, AIActionType.GENERATE_REPORT],
    estimatedDurationDays: 7,
    allowedTransitions: [],
    requiredDocuments: ['sat_report', 'final_acceptance', 'warranty_certificate'],
    outputs: ['project_closure', 'spare_parts_list', 'maintenance_schedule'],
  },
};

// =============================================================================
// 项目生命周期状态机类 (Project Lifecycle State Machine Class)
// =============================================================================
export class ProjectLifecycleStateMachine {
  private state: ProjectState;
  
  constructor(projectId: string, initialPhase: ProjectPhase = ProjectPhase.M0_OPPORTUNITY) {
    this.state = {
      projectId,
      currentPhase: initialPhase,
      phaseStatus: PhaseStatus.NOT_STARTED,
      phaseHistory: [],
      gateApprovals: [],
      aiInsights: [],
      blockers: [],
      completedDocuments: [],
      startDate: new Date(),
      estimatedEndDate: this.calculateEstimatedEndDate(initialPhase),
    };
  }
  
  /**
   * 获取当前项目状态
   */
  getState(): ProjectState {
    return { ...this.state };
  }
  
  /**
   * 获取当前阶段配置
   */
  getCurrentPhaseConfig(): PhaseConfig {
    return PHASE_CONFIGS[this.state.currentPhase];
  }
  
  /**
   * 获取所有阶段配置
   */
  getAllPhaseConfigs(): PhaseConfig[] {
    return Object.values(PHASE_CONFIGS);
  }
  
  /**
   * 开始当前阶段
   */
  startPhase(): TransitionResult {
    if (this.state.phaseStatus === PhaseStatus.IN_PROGRESS) {
      return {
        success: false,
        fromPhase: this.state.currentPhase,
        toPhase: this.state.currentPhase,
        message: 'Phase is already in progress',
      };
    }
    
    this.state.phaseStatus = PhaseStatus.IN_PROGRESS;
    this.state.phaseHistory.push({
      phase: this.state.currentPhase,
      status: PhaseStatus.IN_PROGRESS,
      startedAt: new Date(),
    });
    
    return {
      success: true,
      fromPhase: this.state.currentPhase,
      toPhase: this.state.currentPhase,
      message: `Phase ${this.state.currentPhase} started`,
      aiRecommendations: this.getAIRecommendations(),
    };
  }
  
  /**
   * 尝试转换到下一阶段
   */
  transition(targetPhase: ProjectPhase, approver?: string): TransitionResult {
    const currentConfig = PHASE_CONFIGS[this.state.currentPhase];
    
    // 检查目标阶段是否允许
    if (!currentConfig.allowedTransitions.includes(targetPhase)) {
      return {
        success: false,
        fromPhase: this.state.currentPhase,
        toPhase: targetPhase,
        message: `Transition from ${this.state.currentPhase} to ${targetPhase} is not allowed`,
        blockedBy: [`Invalid transition path`],
      };
    }
    
    // 检查Gate条件
    const gateCheck = this.checkGateConditions();
    if (!gateCheck.passed) {
      return {
        success: false,
        fromPhase: this.state.currentPhase,
        toPhase: targetPhase,
        message: 'Gate conditions not met',
        blockedBy: gateCheck.failedConditions,
        requiredActions: gateCheck.requiredActions,
      };
    }
    
    // 检查必需文档
    const docCheck = this.checkRequiredDocuments();
    if (!docCheck.complete) {
      return {
        success: false,
        fromPhase: this.state.currentPhase,
        toPhase: targetPhase,
        message: 'Required documents not complete',
        blockedBy: docCheck.missingDocuments,
      };
    }
    
    // 执行转换
    const previousPhase = this.state.currentPhase;
    
    // 更新历史记录
    const lastHistoryEntry = this.state.phaseHistory[this.state.phaseHistory.length - 1];
    if (lastHistoryEntry && lastHistoryEntry.phase === previousPhase) {
      lastHistoryEntry.status = PhaseStatus.COMPLETED;
      lastHistoryEntry.completedAt = new Date();
      lastHistoryEntry.completedBy = approver;
      lastHistoryEntry.duration = this.calculateDuration(lastHistoryEntry.startedAt, new Date());
    }
    
    // 更新状态
    this.state.currentPhase = targetPhase;
    this.state.phaseStatus = PhaseStatus.NOT_STARTED;
    this.state.estimatedEndDate = this.calculateEstimatedEndDate(targetPhase);
    
    // 如果是最后阶段完成（previous phase was the last active phase）
    if (targetPhase === ProjectPhase.M12_HANDOVER) {
      this.state.actualEndDate = new Date();
    }
    
    return {
      success: true,
      fromPhase: previousPhase,
      toPhase: targetPhase,
      message: `Successfully transitioned from ${previousPhase} to ${targetPhase}`,
      aiRecommendations: this.getAIRecommendations(),
    };
  }
  
  /**
   * 提交Gate审批
   */
  submitGateApproval(gateType: GateType, approver: string, approved: boolean, comments?: string): void {
    const approval: GateApproval = {
      gateType,
      phase: this.state.currentPhase,
      status: approved ? 'APPROVED' : 'REJECTED',
      approver,
      approvedAt: new Date(),
      comments,
    };
    
    this.state.gateApprovals.push(approval);
    
    if (approved) {
      this.state.phaseStatus = PhaseStatus.COMPLETED;
    } else {
      this.state.phaseStatus = PhaseStatus.BLOCKED;
      this.state.blockers.push(`Gate ${gateType} rejected: ${comments || 'No reason provided'}`);
    }
  }
  
  /**
   * 添加AI洞察
   */
  addAIInsight(insight: Omit<AIInsight, 'generatedAt'>): void {
    this.state.aiInsights.push({
      ...insight,
      generatedAt: new Date(),
    });
  }
  
  /**
   * 标记文档完成
   */
  markDocumentComplete(documentName: string): void {
    if (!this.state.completedDocuments.includes(documentName)) {
      this.state.completedDocuments.push(documentName);
    }
  }
  
  /**
   * 检查Gate条件
   */
  private checkGateConditions(): { passed: boolean; failedConditions: string[]; requiredActions: string[] } {
    const config = PHASE_CONFIGS[this.state.currentPhase];
    
    if (config.gateType === GateType.NONE) {
      return { passed: true, failedConditions: [], requiredActions: [] };
    }
    
    // 检查是否有对应的审批记录
    const approval = this.state.gateApprovals.find(
      a => a.phase === this.state.currentPhase && a.gateType === config.gateType
    );
    
    if (!approval) {
      return {
        passed: false,
        failedConditions: [`Gate ${config.gateType} approval required`],
        requiredActions: [`Submit ${config.gateType} for approval`],
      };
    }
    
    if (approval.status !== 'APPROVED') {
      return {
        passed: false,
        failedConditions: [`Gate ${config.gateType} not approved`],
        requiredActions: approval.conditions || [],
      };
    }
    
    return { passed: true, failedConditions: [], requiredActions: [] };
  }
  
  /**
   * 检查必需文档
   */
  private checkRequiredDocuments(): { complete: boolean; missingDocuments: string[] } {
    const config = PHASE_CONFIGS[this.state.currentPhase];
    const missingDocuments = config.requiredDocuments.filter(
      doc => !this.state.completedDocuments.includes(doc)
    );
    
    return {
      complete: missingDocuments.length === 0,
      missingDocuments,
    };
  }
  
  /**
   * 获取AI推荐
   */
  private getAIRecommendations(): string[] {
    const config = PHASE_CONFIGS[this.state.currentPhase];
    const recommendations: string[] = [];
    
    config.aiActions.forEach(action => {
      switch (action) {
        case AIActionType.ANALYZE_HISTORY:
          recommendations.push('AI will analyze similar historical cases to provide reference');
          break;
        case AIActionType.GENERATE_QUOTATION:
          recommendations.push('AI can generate quotation based on requirements and historical data');
          break;
        case AIActionType.GENERATE_BOM:
          recommendations.push('AI can generate preliminary BOM based on design specifications');
          break;
        case AIActionType.GENERATE_GANTT:
          recommendations.push('AI will generate project timeline and Gantt chart');
          break;
        case AIActionType.RISK_ANALYSIS:
          recommendations.push('AI will perform risk analysis and provide mitigation suggestions');
          break;
        case AIActionType.GENERATE_SPARE_PARTS:
          recommendations.push('AI will generate recommended spare parts list for maintenance');
          break;
        case AIActionType.GENERATE_REPORT:
          recommendations.push('AI can generate phase completion report');
          break;
      }
    });
    
    return recommendations;
  }
  
  /**
   * 计算预计结束日期
   */
  private calculateEstimatedEndDate(fromPhase: ProjectPhase): Date {
    let totalDays = 0;
    const phases = Object.values(ProjectPhase);
    const startIndex = phases.indexOf(fromPhase);
    
    for (let i = startIndex; i < phases.length; i++) {
      totalDays += PHASE_CONFIGS[phases[i]].estimatedDurationDays;
    }
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + totalDays);
    return endDate;
  }
  
  /**
   * 计算持续时间（天）
   */
  private calculateDuration(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * 获取项目进度百分比
   */
  getProgressPercentage(): number {
    const phases = Object.values(ProjectPhase);
    const currentIndex = phases.indexOf(this.state.currentPhase);
    const totalPhases = phases.length;
    
    // 基础进度
    let progress = (currentIndex / totalPhases) * 100;
    
    // 如果当前阶段已完成，加上当前阶段的权重
    if (this.state.phaseStatus === PhaseStatus.COMPLETED) {
      progress += (1 / totalPhases) * 100;
    } else if (this.state.phaseStatus === PhaseStatus.IN_PROGRESS) {
      // 如果进行中，加上一半权重
      progress += (0.5 / totalPhases) * 100;
    }
    
    return Math.min(100, Math.round(progress));
  }
  
  /**
   * 序列化状态（用于持久化）
   */
  serialize(): string {
    return JSON.stringify(this.state);
  }
  
  /**
   * 从序列化状态恢复
   */
  static deserialize(serialized: string): ProjectLifecycleStateMachine {
    const state = JSON.parse(serialized) as ProjectState;
    const machine = new ProjectLifecycleStateMachine(state.projectId, state.currentPhase);
    machine.state = {
      ...state,
      startDate: new Date(state.startDate),
      estimatedEndDate: new Date(state.estimatedEndDate),
      actualEndDate: state.actualEndDate ? new Date(state.actualEndDate) : undefined,
      phaseHistory: state.phaseHistory.map(h => ({
        ...h,
        startedAt: new Date(h.startedAt),
        completedAt: h.completedAt ? new Date(h.completedAt) : undefined,
      })),
      gateApprovals: state.gateApprovals.map(a => ({
        ...a,
        approvedAt: a.approvedAt ? new Date(a.approvedAt) : undefined,
      })),
      aiInsights: state.aiInsights.map(i => ({
        ...i,
        generatedAt: new Date(i.generatedAt),
      })),
    };
    return machine;
  }
}

// =============================================================================
// 导出工具函数
// =============================================================================

/**
 * 获取阶段显示名称
 */
export function getPhaseDisplayName(phase: ProjectPhase, locale: 'en' | 'cn' = 'en'): string {
  const config = PHASE_CONFIGS[phase];
  return locale === 'cn' ? config.nameCN : config.name;
}

/**
 * 获取阶段编号
 */
export function getPhaseNumber(phase: ProjectPhase): number {
  return Object.values(ProjectPhase).indexOf(phase);
}

/**
 * 根据编号获取阶段
 */
export function getPhaseByNumber(number: number): ProjectPhase | undefined {
  const phases = Object.values(ProjectPhase);
  return phases[number];
}

/**
 * 检查是否为Gate阶段
 */
export function isGatePhase(phase: ProjectPhase): boolean {
  return PHASE_CONFIGS[phase].gateType !== GateType.NONE;
}

/**
 * 获取阶段所需角色
 */
export function getPhaseRequiredRoles(phase: ProjectPhase): string[] {
  return PHASE_CONFIGS[phase].requiredRoles;
}
