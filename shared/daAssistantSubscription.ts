/**
 * GRT智能人才网格 - DA跨岗位逻辑配置
 * 
 * 定义{ID}-DA与功能型助手的订阅关系
 * 每个员工的数字助理必须自动订阅其岗位对应的功能型助手
 */

// ============================================================================
// 功能型助手类型定义
// ============================================================================

export type AssistantType = 
  | 'Engineering_Assistant'    // 技术工程师助手
  | 'Sales_Assistant'          // 销售助手
  | 'Project_Assistant'        // 项目管理助手
  | 'Finance_Assistant'        // 财务助手
  | 'Purchase_Assistant'       // 采购助手
  | 'Production_Assistant'     // 生产助手
  | 'Solution_Assistant'       // 方案设计助手
  | 'Quotation_Assistant'      // 报价助手
  | 'KPI_Assistant'            // KPI绩效助手
  | 'Planning_Assistant'       // 计划助手
  | 'Quality_Assistant'        // 质量助手
  | 'Service_Assistant';       // 服务助手

// ============================================================================
// 岗位类型定义
// ============================================================================

export type PositionType = 
  | 'technical_engineer'       // 技术工程师
  | 'sales_representative'     // 销售代表
  | 'project_manager'          // 项目经理
  | 'finance_staff'            // 财务人员
  | 'procurement_staff'        // 采购人员
  | 'production_supervisor'    // 生产主管
  | 'quality_engineer'         // 质量工程师
  | 'service_engineer'         // 服务工程师
  | 'general_manager'          // 总经理
  | 'department_head';         // 部门主管

// ============================================================================
// 助手能力定义
// ============================================================================

export interface AssistantCapability {
  capabilityId: string;
  capabilityName: string;
  category: 'knowledge' | 'action' | 'analysis' | 'communication';
  description: string;
  requiredSkillLevel: 1 | 2 | 3 | 4 | 5;
}

// ============================================================================
// 故障逻辑链定义
// ============================================================================

export interface LogicChain {
  chainId: string;
  chainName: string;
  sourceAssistant: AssistantType;
  triggerConditions: TriggerCondition[];
  actions: ChainAction[];
  safetyChecks: SafetyCheck[];
}

export interface TriggerCondition {
  conditionType: 'event' | 'threshold' | 'schedule' | 'manual';
  parameter: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'matches';
  value: string | number | boolean;
}

export interface ChainAction {
  actionId: string;
  actionType: 'notify' | 'suggest' | 'execute' | 'escalate' | 'log';
  target: string;
  parameters: Record<string, unknown>;
  timeout?: number;
}

export interface SafetyCheck {
  checkId: string;
  checkType: 'physical_limit' | 'authorization' | 'dependency' | 'resource';
  parameters: Record<string, unknown>;
  onFailure: 'block' | 'warn' | 'escalate';
}

// ============================================================================
// 岗位-助手映射配置
// ============================================================================

export const POSITION_ASSISTANT_MAPPING: Record<PositionType, {
  primaryAssistants: AssistantType[];
  secondaryAssistants: AssistantType[];
  inheritedCapabilities: string[];
  logicChains: string[];
}> = {
  technical_engineer: {
    primaryAssistants: ['Engineering_Assistant', 'Solution_Assistant'],
    secondaryAssistants: ['Quality_Assistant', 'Service_Assistant'],
    inheritedCapabilities: [
      'fault_diagnosis',           // 故障诊断
      'equipment_debugging',       // 设备调试
      'process_parameter_tuning',  // 工艺参数调优
      'technical_documentation',   // 技术文档
      'safety_compliance'          // 安全合规
    ],
    logicChains: ['fault_escalation_chain', 'parameter_optimization_chain']
  },
  
  sales_representative: {
    primaryAssistants: ['Sales_Assistant', 'Quotation_Assistant'],
    secondaryAssistants: ['Solution_Assistant', 'KPI_Assistant'],
    inheritedCapabilities: [
      'customer_communication',    // 客户沟通
      'quotation_generation',      // 报价生成
      'opportunity_management',    // 商机管理
      'competitor_analysis',       // 竞争分析
      'contract_negotiation'       // 合同谈判
    ],
    logicChains: ['lead_qualification_chain', 'quotation_approval_chain']
  },
  
  project_manager: {
    primaryAssistants: ['Project_Assistant', 'Planning_Assistant'],
    secondaryAssistants: ['KPI_Assistant', 'Quality_Assistant'],
    inheritedCapabilities: [
      'milestone_tracking',        // 里程碑跟踪
      'resource_allocation',       // 资源调配
      'risk_management',           // 风险管理
      'stakeholder_communication', // 干系人沟通
      'progress_reporting'         // 进度报告
    ],
    logicChains: ['milestone_alert_chain', 'resource_conflict_chain']
  },
  
  finance_staff: {
    primaryAssistants: ['Finance_Assistant'],
    secondaryAssistants: ['KPI_Assistant'],
    inheritedCapabilities: [
      'expense_audit',             // 报销审计
      'budget_analysis',           // 预算分析
      'cost_tracking',             // 成本跟踪
      'invoice_processing',        // 发票处理
      'financial_reporting'        // 财务报告
    ],
    logicChains: ['three_in_one_audit_chain', 'budget_alert_chain']
  },
  
  procurement_staff: {
    primaryAssistants: ['Purchase_Assistant'],
    secondaryAssistants: ['Finance_Assistant', 'Quality_Assistant'],
    inheritedCapabilities: [
      'supplier_evaluation',       // 供应商评估
      'price_comparison',          // 价格比对
      'inventory_management',      // 库存管理
      'order_tracking',            // 订单跟踪
      'contract_management'        // 合同管理
    ],
    logicChains: ['supplier_alert_chain', 'inventory_reorder_chain']
  },
  
  production_supervisor: {
    primaryAssistants: ['Production_Assistant', 'Quality_Assistant'],
    secondaryAssistants: ['Engineering_Assistant', 'Planning_Assistant'],
    inheritedCapabilities: [
      'production_scheduling',     // 生产排程
      'quality_control',           // 质量控制
      'equipment_maintenance',     // 设备维护
      'worker_coordination',       // 人员协调
      'output_optimization'        // 产出优化
    ],
    logicChains: ['production_delay_chain', 'quality_issue_chain']
  },
  
  quality_engineer: {
    primaryAssistants: ['Quality_Assistant', 'Engineering_Assistant'],
    secondaryAssistants: ['Service_Assistant'],
    inheritedCapabilities: [
      'inspection_planning',       // 检验计划
      'defect_analysis',           // 缺陷分析
      'process_improvement',       // 流程改进
      'compliance_verification',   // 合规验证
      'quality_reporting'          // 质量报告
    ],
    logicChains: ['defect_escalation_chain', 'compliance_check_chain']
  },
  
  service_engineer: {
    primaryAssistants: ['Service_Assistant', 'Engineering_Assistant'],
    secondaryAssistants: ['Solution_Assistant', 'Quality_Assistant'],
    inheritedCapabilities: [
      'on_site_diagnosis',         // 现场诊断
      'maintenance_execution',     // 维护执行
      'customer_training',         // 客户培训
      'spare_parts_management',    // 备件管理
      'service_documentation'      // 服务文档
    ],
    logicChains: ['service_dispatch_chain', 'customer_feedback_chain']
  },
  
  general_manager: {
    primaryAssistants: ['KPI_Assistant', 'Planning_Assistant'],
    secondaryAssistants: ['Finance_Assistant', 'Sales_Assistant', 'Project_Assistant'],
    inheritedCapabilities: [
      'strategic_planning',        // 战略规划
      'performance_overview',      // 绩效总览
      'decision_support',          // 决策支持
      'resource_optimization',     // 资源优化
      'executive_reporting'        // 高管报告
    ],
    logicChains: ['executive_alert_chain', 'strategic_review_chain']
  },
  
  department_head: {
    primaryAssistants: ['KPI_Assistant', 'Planning_Assistant'],
    secondaryAssistants: ['Finance_Assistant'],
    inheritedCapabilities: [
      'team_management',           // 团队管理
      'department_planning',       // 部门规划
      'performance_review',        // 绩效评审
      'budget_management',         // 预算管理
      'cross_department_coordination' // 跨部门协调
    ],
    logicChains: ['team_performance_chain', 'department_budget_chain']
  }
};

// ============================================================================
// 助手能力库
// ============================================================================

export const ASSISTANT_CAPABILITIES: Record<AssistantType, AssistantCapability[]> = {
  Engineering_Assistant: [
    {
      capabilityId: 'fault_diagnosis',
      capabilityName: '故障诊断',
      category: 'analysis',
      description: '基于症状和历史数据诊断设备故障',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'equipment_debugging',
      capabilityName: '设备调试',
      category: 'action',
      description: '指导设备调试流程和参数设置',
      requiredSkillLevel: 4
    },
    {
      capabilityId: 'process_parameter_tuning',
      capabilityName: '工艺参数调优',
      category: 'analysis',
      description: '优化清洗工艺参数以提高效率和质量',
      requiredSkillLevel: 4
    },
    {
      capabilityId: 'technical_documentation',
      capabilityName: '技术文档',
      category: 'knowledge',
      description: '生成和管理技术文档',
      requiredSkillLevel: 2
    },
    {
      capabilityId: 'safety_compliance',
      capabilityName: '安全合规',
      category: 'knowledge',
      description: '确保操作符合安全规范',
      requiredSkillLevel: 3
    }
  ],
  
  Sales_Assistant: [
    {
      capabilityId: 'customer_communication',
      capabilityName: '客户沟通',
      category: 'communication',
      description: '辅助客户沟通和需求收集',
      requiredSkillLevel: 2
    },
    {
      capabilityId: 'quotation_generation',
      capabilityName: '报价生成',
      category: 'action',
      description: '自动生成报价单',
      requiredSkillLevel: 2
    },
    {
      capabilityId: 'opportunity_management',
      capabilityName: '商机管理',
      category: 'analysis',
      description: '跟踪和分析销售商机',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'competitor_analysis',
      capabilityName: '竞争分析',
      category: 'analysis',
      description: '分析竞争对手和市场动态',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'contract_negotiation',
      capabilityName: '合同谈判',
      category: 'communication',
      description: '辅助合同条款谈判',
      requiredSkillLevel: 4
    }
  ],
  
  Project_Assistant: [
    {
      capabilityId: 'milestone_tracking',
      capabilityName: '里程碑跟踪',
      category: 'analysis',
      description: '跟踪项目里程碑进度',
      requiredSkillLevel: 2
    },
    {
      capabilityId: 'resource_allocation',
      capabilityName: '资源调配',
      category: 'action',
      description: '优化项目资源分配',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'risk_management',
      capabilityName: '风险管理',
      category: 'analysis',
      description: '识别和管理项目风险',
      requiredSkillLevel: 4
    },
    {
      capabilityId: 'stakeholder_communication',
      capabilityName: '干系人沟通',
      category: 'communication',
      description: '管理项目干系人沟通',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'progress_reporting',
      capabilityName: '进度报告',
      category: 'knowledge',
      description: '生成项目进度报告',
      requiredSkillLevel: 2
    }
  ],
  
  Finance_Assistant: [
    {
      capabilityId: 'expense_audit',
      capabilityName: '报销审计',
      category: 'analysis',
      description: '审计报销申请的合规性',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'budget_analysis',
      capabilityName: '预算分析',
      category: 'analysis',
      description: '分析预算执行情况',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'cost_tracking',
      capabilityName: '成本跟踪',
      category: 'analysis',
      description: '跟踪项目和部门成本',
      requiredSkillLevel: 2
    },
    {
      capabilityId: 'invoice_processing',
      capabilityName: '发票处理',
      category: 'action',
      description: '处理发票和付款',
      requiredSkillLevel: 2
    },
    {
      capabilityId: 'financial_reporting',
      capabilityName: '财务报告',
      category: 'knowledge',
      description: '生成财务报告',
      requiredSkillLevel: 3
    }
  ],
  
  Purchase_Assistant: [
    {
      capabilityId: 'supplier_evaluation',
      capabilityName: '供应商评估',
      category: 'analysis',
      description: '评估供应商资质和绩效',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'price_comparison',
      capabilityName: '价格比对',
      category: 'analysis',
      description: '比较不同供应商价格',
      requiredSkillLevel: 2
    },
    {
      capabilityId: 'inventory_management',
      capabilityName: '库存管理',
      category: 'action',
      description: '管理库存水平和补货',
      requiredSkillLevel: 2
    },
    {
      capabilityId: 'order_tracking',
      capabilityName: '订单跟踪',
      category: 'action',
      description: '跟踪采购订单状态',
      requiredSkillLevel: 2
    },
    {
      capabilityId: 'contract_management',
      capabilityName: '合同管理',
      category: 'knowledge',
      description: '管理采购合同',
      requiredSkillLevel: 3
    }
  ],
  
  Production_Assistant: [
    {
      capabilityId: 'production_scheduling',
      capabilityName: '生产排程',
      category: 'action',
      description: '优化生产排程',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'quality_control',
      capabilityName: '质量控制',
      category: 'analysis',
      description: '监控生产质量',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'equipment_maintenance',
      capabilityName: '设备维护',
      category: 'action',
      description: '安排设备维护',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'worker_coordination',
      capabilityName: '人员协调',
      category: 'communication',
      description: '协调生产人员',
      requiredSkillLevel: 2
    },
    {
      capabilityId: 'output_optimization',
      capabilityName: '产出优化',
      category: 'analysis',
      description: '优化生产产出',
      requiredSkillLevel: 4
    }
  ],
  
  Solution_Assistant: [
    {
      capabilityId: 'requirement_analysis',
      capabilityName: '需求分析',
      category: 'analysis',
      description: '分析客户需求',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'solution_design',
      capabilityName: '方案设计',
      category: 'action',
      description: '设计清洗解决方案',
      requiredSkillLevel: 4
    },
    {
      capabilityId: 'reference_matching',
      capabilityName: '参考匹配',
      category: 'knowledge',
      description: '匹配历史成功案例',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'technical_specification',
      capabilityName: '技术规格',
      category: 'knowledge',
      description: '生成技术规格书',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'feasibility_assessment',
      capabilityName: '可行性评估',
      category: 'analysis',
      description: '评估方案可行性',
      requiredSkillLevel: 4
    }
  ],
  
  Quotation_Assistant: [
    {
      capabilityId: 'cost_calculation',
      capabilityName: '成本计算',
      category: 'analysis',
      description: '计算项目成本',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'pricing_strategy',
      capabilityName: '定价策略',
      category: 'analysis',
      description: '制定定价策略',
      requiredSkillLevel: 4
    },
    {
      capabilityId: 'quotation_template',
      capabilityName: '报价模板',
      category: 'action',
      description: '使用报价模板',
      requiredSkillLevel: 2
    },
    {
      capabilityId: 'margin_analysis',
      capabilityName: '利润分析',
      category: 'analysis',
      description: '分析报价利润',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'competitive_pricing',
      capabilityName: '竞争定价',
      category: 'analysis',
      description: '参考竞争对手定价',
      requiredSkillLevel: 3
    }
  ],
  
  KPI_Assistant: [
    {
      capabilityId: 'performance_scoring',
      capabilityName: '绩效评分',
      category: 'analysis',
      description: '计算绩效得分',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'trend_analysis',
      capabilityName: '趋势分析',
      category: 'analysis',
      description: '分析绩效趋势',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'reminder_generation',
      capabilityName: '提醒生成',
      category: 'action',
      description: '生成绩效提醒',
      requiredSkillLevel: 2
    },
    {
      capabilityId: 'improvement_suggestion',
      capabilityName: '改进建议',
      category: 'communication',
      description: '提供改进建议',
      requiredSkillLevel: 4
    },
    {
      capabilityId: 'benchmark_comparison',
      capabilityName: '基准比较',
      category: 'analysis',
      description: '与基准进行比较',
      requiredSkillLevel: 3
    }
  ],
  
  Planning_Assistant: [
    {
      capabilityId: 'plan_generation',
      capabilityName: '计划生成',
      category: 'action',
      description: '生成工作计划',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'schedule_optimization',
      capabilityName: '日程优化',
      category: 'analysis',
      description: '优化工作日程',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'progress_tracking',
      capabilityName: '进度跟踪',
      category: 'analysis',
      description: '跟踪计划执行进度',
      requiredSkillLevel: 2
    },
    {
      capabilityId: 'conflict_resolution',
      capabilityName: '冲突解决',
      category: 'action',
      description: '解决日程冲突',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'resource_planning',
      capabilityName: '资源规划',
      category: 'action',
      description: '规划资源需求',
      requiredSkillLevel: 4
    }
  ],
  
  Quality_Assistant: [
    {
      capabilityId: 'inspection_planning',
      capabilityName: '检验计划',
      category: 'action',
      description: '制定检验计划',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'defect_analysis',
      capabilityName: '缺陷分析',
      category: 'analysis',
      description: '分析产品缺陷',
      requiredSkillLevel: 4
    },
    {
      capabilityId: 'process_improvement',
      capabilityName: '流程改进',
      category: 'action',
      description: '提出流程改进建议',
      requiredSkillLevel: 4
    },
    {
      capabilityId: 'compliance_verification',
      capabilityName: '合规验证',
      category: 'analysis',
      description: '验证产品合规性',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'quality_reporting',
      capabilityName: '质量报告',
      category: 'knowledge',
      description: '生成质量报告',
      requiredSkillLevel: 2
    }
  ],
  
  Service_Assistant: [
    {
      capabilityId: 'on_site_diagnosis',
      capabilityName: '现场诊断',
      category: 'analysis',
      description: '指导现场故障诊断',
      requiredSkillLevel: 4
    },
    {
      capabilityId: 'maintenance_execution',
      capabilityName: '维护执行',
      category: 'action',
      description: '指导维护操作执行',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'customer_training',
      capabilityName: '客户培训',
      category: 'communication',
      description: '提供客户培训支持',
      requiredSkillLevel: 3
    },
    {
      capabilityId: 'spare_parts_management',
      capabilityName: '备件管理',
      category: 'action',
      description: '管理服务备件',
      requiredSkillLevel: 2
    },
    {
      capabilityId: 'service_documentation',
      capabilityName: '服务文档',
      category: 'knowledge',
      description: '生成服务文档',
      requiredSkillLevel: 2
    }
  ]
};

// ============================================================================
// DA订阅服务
// ============================================================================

export class DASubscriptionService {
  /**
   * 根据岗位自动订阅功能型助手
   */
  static getAssistantsForPosition(position: PositionType): {
    primary: AssistantType[];
    secondary: AssistantType[];
    capabilities: string[];
    logicChains: string[];
  } {
    const mapping = POSITION_ASSISTANT_MAPPING[position];
    return {
      primary: mapping.primaryAssistants,
      secondary: mapping.secondaryAssistants,
      capabilities: mapping.inheritedCapabilities,
      logicChains: mapping.logicChains
    };
  }
  
  /**
   * 获取助手的所有能力
   */
  static getAssistantCapabilities(assistantType: AssistantType): AssistantCapability[] {
    return ASSISTANT_CAPABILITIES[assistantType] || [];
  }
  
  /**
   * 检查员工是否有权限使用某能力
   */
  static checkCapabilityAccess(
    employeeSkillLevel: number,
    capability: AssistantCapability
  ): boolean {
    return employeeSkillLevel >= capability.requiredSkillLevel;
  }
  
  /**
   * 生成DA配置
   */
  static generateDAConfig(
    employeeId: string,
    position: PositionType,
    skillLevel: number = 3
  ): DAConfiguration {
    const assistants = this.getAssistantsForPosition(position);
    
    const subscriptions: AssistantSubscription[] = [
      ...assistants.primary.map(type => ({
        assistantType: type,
        subscriptionDate: new Date(),
        autoUpdate: true,
        capabilities: this.getAssistantCapabilities(type)
          .filter(cap => cap.requiredSkillLevel <= skillLevel)
          .map(cap => cap.capabilityId),
        restrictions: []
      })),
      ...assistants.secondary.map(type => ({
        assistantType: type,
        subscriptionDate: new Date(),
        autoUpdate: true,
        capabilities: this.getAssistantCapabilities(type)
          .filter(cap => cap.requiredSkillLevel <= Math.max(1, skillLevel - 1))
          .map(cap => cap.capabilityId),
        restrictions: ['read_only', 'suggestion_only']
      }))
    ];
    
    return {
      daId: `DA-${employeeId}`,
      employeeId,
      subscribedAssistants: subscriptions,
      permissionLevel: this.getPermissionLevel(skillLevel),
      customizations: {
        preferredLanguage: 'zh-CN',
        notificationPreferences: {
          email: true,
          inApp: true,
          sms: false
        },
        workflowAutomation: []
      },
      inheritedLogicChains: assistants.logicChains.map(chainId => ({
        chainId,
        chainName: chainId.replace(/_/g, ' '),
        sourceAssistant: assistants.primary[0],
        triggerConditions: [],
        actions: [],
        safetyChecks: []
      }))
    };
  }
  
  /**
   * 根据技能等级确定权限级别
   */
  private static getPermissionLevel(skillLevel: number): 'basic' | 'standard' | 'advanced' | 'expert' {
    if (skillLevel <= 1) return 'basic';
    if (skillLevel <= 2) return 'standard';
    if (skillLevel <= 4) return 'advanced';
    return 'expert';
  }
}

// ============================================================================
// 类型定义
// ============================================================================

export interface DAConfiguration {
  daId: string;
  employeeId: string;
  subscribedAssistants: AssistantSubscription[];
  permissionLevel: 'basic' | 'standard' | 'advanced' | 'expert';
  customizations: {
    preferredLanguage: string;
    notificationPreferences: {
      email: boolean;
      inApp: boolean;
      sms: boolean;
    };
    workflowAutomation: AutomationRule[];
  };
  inheritedLogicChains: LogicChain[];
}

export interface AssistantSubscription {
  assistantType: AssistantType;
  subscriptionDate: Date;
  autoUpdate: boolean;
  capabilities: string[];
  restrictions: string[];
}

export interface AutomationRule {
  ruleId: string;
  ruleName: string;
  trigger: string;
  action: string;
  isActive: boolean;
}
