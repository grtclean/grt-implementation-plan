/**
 * GRT智能会议专业模板配置
 * 包含11种专业会议类型的完整模板定义
 */

export interface MeetingAgendaItem {
  id: string;
  title: string;
  duration: number; // 分钟
  description: string;
  responsible?: string;
  required: boolean;
  outputs?: string[];
}

export interface MeetingTemplate {
  id: string;
  name: string;
  nameEn: string;
  category: 'internal' | 'customer';
  subcategory: string;
  icon: string;
  color: string;
  description: string;
  defaultDuration: number; // 分钟
  participants: {
    required: string[];
    optional: string[];
  };
  agenda: MeetingAgendaItem[];
  outputs: {
    id: string;
    name: string;
    template: string;
    required: boolean;
  }[];
  followUpActions: string[];
  aiPrompts: {
    summary: string;
    actionItems: string;
    assessment: string;
  };
  bestPractices: string[];
}

// ============================================
// 内部管理类会议模板
// ============================================

export const EMPLOYEE_INTERVIEW_TEMPLATE: MeetingTemplate = {
  id: 'employee_interview',
  name: '员工访谈',
  nameEn: 'Employee Interview',
  category: 'internal',
  subcategory: 'HR管理',
  icon: 'UserCircle',
  color: '#3B82F6',
  description: '一对一员工访谈，了解员工工作状态、职业发展需求和建议反馈',
  defaultDuration: 60,
  participants: {
    required: ['直属主管', '被访谈员工'],
    optional: ['HR代表', '部门经理'],
  },
  agenda: [
    {
      id: 'opening',
      title: '开场与氛围营造',
      duration: 5,
      description: '创造轻松的交流氛围，说明访谈目的',
      required: true,
      outputs: [],
    },
    {
      id: 'work_review',
      title: '工作回顾与成果',
      duration: 15,
      description: '回顾近期工作内容、完成情况和主要成果',
      required: true,
      outputs: ['工作成果清单'],
    },
    {
      id: 'challenges',
      title: '困难与挑战讨论',
      duration: 10,
      description: '了解员工面临的困难、资源需求和支持期望',
      required: true,
      outputs: ['问题清单', '资源需求'],
    },
    {
      id: 'career_development',
      title: '职业发展规划',
      duration: 15,
      description: '讨论职业发展方向、培训需求和晋升路径',
      required: true,
      outputs: ['发展计划'],
    },
    {
      id: 'feedback',
      title: '双向反馈',
      duration: 10,
      description: '员工对团队/公司的建议，主管对员工的反馈',
      required: true,
      outputs: ['改进建议'],
    },
    {
      id: 'action_plan',
      title: '行动计划确认',
      duration: 5,
      description: '确认后续行动项和跟进时间',
      required: true,
      outputs: ['行动计划'],
    },
  ],
  outputs: [
    { id: 'interview_record', name: '访谈记录', template: 'interview_record_template', required: true },
    { id: 'action_items', name: '行动计划', template: 'action_items_template', required: true },
    { id: 'development_plan', name: '发展计划', template: 'development_plan_template', required: false },
  ],
  followUpActions: [
    '24小时内发送访谈纪要给员工确认',
    '一周内跟进资源需求落实情况',
    '下次访谈前回顾行动计划完成情况',
  ],
  aiPrompts: {
    summary: '请总结本次员工访谈的核心内容，包括员工的工作状态、主要诉求和发展期望',
    actionItems: '请从访谈内容中提取需要跟进的行动项，明确责任人和完成时间',
    assessment: '请评估员工的工作态度、能力发展和团队融入情况',
  },
  bestPractices: [
    '保持开放和倾听的态度，让员工充分表达',
    '避免打断，使用开放式问题引导',
    '记录关键信息，会后及时整理',
    '承诺的事项必须跟进落实',
  ],
};

export const PERFORMANCE_DIALOGUE_TEMPLATE: MeetingTemplate = {
  id: 'performance_dialogue',
  name: '员工绩效对话',
  nameEn: 'Performance Dialogue',
  category: 'internal',
  subcategory: 'HR管理',
  icon: 'TrendingUp',
  color: '#10B981',
  description: '绩效周期内的正式绩效沟通，包括目标回顾、绩效评估和改进计划',
  defaultDuration: 90,
  participants: {
    required: ['直属主管', '被评估员工'],
    optional: ['HR代表', '跨级主管'],
  },
  agenda: [
    {
      id: 'goal_review',
      title: '目标完成回顾',
      duration: 20,
      description: '逐项回顾绩效周期内的目标完成情况',
      required: true,
      outputs: ['目标完成度评估'],
    },
    {
      id: 'achievement_highlight',
      title: '亮点与成就',
      duration: 15,
      description: '肯定员工的突出表现和重要贡献',
      required: true,
      outputs: ['成就清单'],
    },
    {
      id: 'improvement_areas',
      title: '改进领域讨论',
      duration: 15,
      description: '坦诚讨论需要改进的方面和原因分析',
      required: true,
      outputs: ['改进建议'],
    },
    {
      id: 'competency_assessment',
      title: '能力评估',
      duration: 15,
      description: '基于能力模型进行全面评估',
      required: true,
      outputs: ['能力评估表'],
    },
    {
      id: 'rating_discussion',
      title: '绩效评级沟通',
      duration: 10,
      description: '说明绩效评级结果和依据',
      required: true,
      outputs: ['绩效评级'],
    },
    {
      id: 'next_cycle_goals',
      title: '下周期目标设定',
      duration: 10,
      description: '共同制定下一绩效周期的目标',
      required: true,
      outputs: ['新周期目标'],
    },
    {
      id: 'development_plan',
      title: '发展计划制定',
      duration: 5,
      description: '确定能力提升计划和培训需求',
      required: true,
      outputs: ['个人发展计划'],
    },
  ],
  outputs: [
    { id: 'performance_record', name: '绩效评估记录', template: 'performance_record_template', required: true },
    { id: 'rating_form', name: '绩效评级表', template: 'rating_form_template', required: true },
    { id: 'idp', name: '个人发展计划(IDP)', template: 'idp_template', required: true },
    { id: 'next_goals', name: '下周期目标', template: 'goals_template', required: true },
  ],
  followUpActions: [
    '3个工作日内完成绩效系统录入',
    '员工签字确认绩效评估结果',
    '制定并启动个人发展计划',
    '按月跟进目标进展',
  ],
  aiPrompts: {
    summary: '请总结本次绩效对话的核心结论，包括绩效评级、主要成就和改进方向',
    actionItems: '请提取绩效改进行动项和发展计划的具体措施',
    assessment: '请基于对话内容评估员工的绩效表现和发展潜力',
  },
  bestPractices: [
    '提前准备充分的数据和案例支撑',
    '先肯定成绩，再讨论改进',
    '使用STAR法则描述具体行为',
    '确保员工理解并认同评估结果',
  ],
};

export const PRODUCTION_WEEKLY_TEMPLATE: MeetingTemplate = {
  id: 'production_weekly',
  name: '生产周会',
  nameEn: 'Production Weekly Meeting',
  category: 'internal',
  subcategory: '生产管理',
  icon: 'Factory',
  color: '#F59E0B',
  description: '生产部门周度例会，回顾生产进度、质量问题和下周计划',
  defaultDuration: 60,
  participants: {
    required: ['生产经理', '各班组长', '质量主管'],
    optional: ['计划员', '设备主管', '仓库主管'],
  },
  agenda: [
    {
      id: 'kpi_review',
      title: '上周KPI回顾',
      duration: 10,
      description: '回顾产量、质量、交付、安全等核心指标',
      responsible: '生产经理',
      required: true,
      outputs: ['KPI达成表'],
    },
    {
      id: 'order_progress',
      title: '订单进度汇报',
      duration: 15,
      description: '各项目/订单的生产进度和异常情况',
      responsible: '各班组长',
      required: true,
      outputs: ['订单进度表'],
    },
    {
      id: 'quality_issues',
      title: '质量问题分析',
      duration: 10,
      description: '上周质量问题汇总和根因分析',
      responsible: '质量主管',
      required: true,
      outputs: ['质量问题清单', '8D报告'],
    },
    {
      id: 'equipment_status',
      title: '设备运行状态',
      duration: 5,
      description: '设备故障、维护和OEE情况',
      responsible: '设备主管',
      required: false,
      outputs: ['设备状态报告'],
    },
    {
      id: 'next_week_plan',
      title: '下周生产计划',
      duration: 10,
      description: '下周生产任务分配和资源协调',
      responsible: '计划员',
      required: true,
      outputs: ['周生产计划'],
    },
    {
      id: 'issues_escalation',
      title: '问题升级与协调',
      duration: 10,
      description: '需要跨部门协调或管理层支持的问题',
      responsible: '生产经理',
      required: true,
      outputs: ['问题升级清单'],
    },
  ],
  outputs: [
    { id: 'weekly_report', name: '生产周报', template: 'production_weekly_template', required: true },
    { id: 'action_items', name: '行动项清单', template: 'action_items_template', required: true },
    { id: 'next_week_plan', name: '下周计划', template: 'weekly_plan_template', required: true },
  ],
  followUpActions: [
    '会后2小时内发布会议纪要',
    '质量问题24小时内启动8D流程',
    '设备故障当天完成维修或制定计划',
    '下周一前完成资源协调',
  ],
  aiPrompts: {
    summary: '请总结本周生产情况，包括KPI达成、主要问题和下周重点',
    actionItems: '请提取需要跟进的生产问题和改进措施',
    assessment: '请评估生产效率和质量管控水平',
  },
  bestPractices: [
    '用数据说话，准备好各项指标',
    '问题讨论聚焦解决方案',
    '明确责任人和完成时间',
    '控制会议时间，提高效率',
  ],
};

export const MONTHLY_BUSINESS_REVIEW_TEMPLATE: MeetingTemplate = {
  id: 'monthly_business_review',
  name: '月度经营分析会',
  nameEn: 'Monthly Business Review',
  category: 'internal',
  subcategory: '经营管理',
  icon: 'BarChart3',
  color: '#8B5CF6',
  description: '公司月度经营分析会议，全面回顾经营指标、财务状况和市场动态',
  defaultDuration: 120,
  participants: {
    required: ['总经理', '各部门负责人', '财务总监'],
    optional: ['董事会代表', '战略顾问'],
  },
  agenda: [
    {
      id: 'financial_review',
      title: '财务指标回顾',
      duration: 20,
      description: '收入、利润、现金流、费用等核心财务指标分析',
      responsible: '财务总监',
      required: true,
      outputs: ['财务月报'],
    },
    {
      id: 'sales_review',
      title: '销售业绩分析',
      duration: 15,
      description: '订单、回款、客户开发、市场份额分析',
      responsible: '销售总监',
      required: true,
      outputs: ['销售月报'],
    },
    {
      id: 'production_review',
      title: '生产运营分析',
      duration: 15,
      description: '产量、质量、交付、成本等运营指标',
      responsible: '生产总监',
      required: true,
      outputs: ['生产月报'],
    },
    {
      id: 'project_review',
      title: '重点项目进展',
      duration: 15,
      description: '在执行项目的进度、风险和资源需求',
      responsible: '项目总监',
      required: true,
      outputs: ['项目进度报告'],
    },
    {
      id: 'market_analysis',
      title: '市场与竞争分析',
      duration: 10,
      description: '行业动态、竞争对手情报、市场机会',
      responsible: '市场部',
      required: false,
      outputs: ['市场分析报告'],
    },
    {
      id: 'hr_review',
      title: '人力资源状况',
      duration: 10,
      description: '人员变动、培训、绩效、组织发展',
      responsible: 'HR总监',
      required: false,
      outputs: ['HR月报'],
    },
    {
      id: 'risk_assessment',
      title: '风险与问题升级',
      duration: 15,
      description: '重大风险识别和需要决策的问题',
      responsible: '总经理',
      required: true,
      outputs: ['风险清单'],
    },
    {
      id: 'next_month_focus',
      title: '下月工作重点',
      duration: 20,
      description: '确定下月关键任务和资源配置',
      responsible: '总经理',
      required: true,
      outputs: ['月度工作计划'],
    },
  ],
  outputs: [
    { id: 'monthly_report', name: '月度经营报告', template: 'monthly_report_template', required: true },
    { id: 'financial_statement', name: '财务报表', template: 'financial_template', required: true },
    { id: 'action_plan', name: '月度行动计划', template: 'action_plan_template', required: true },
    { id: 'risk_register', name: '风险登记表', template: 'risk_register_template', required: false },
  ],
  followUpActions: [
    '3个工作日内发布经营分析报告',
    '重大决策事项48小时内启动执行',
    '风险事项制定应对计划',
    '各部门更新月度目标和计划',
  ],
  aiPrompts: {
    summary: '请总结本月经营状况，包括关键指标达成、主要问题和改进方向',
    actionItems: '请提取需要各部门跟进的行动项和决策事项',
    assessment: '请评估公司整体经营健康度和发展趋势',
  },
  bestPractices: [
    '数据准确，提前验证各项指标',
    '问题分析深入到根因',
    '决策事项明确责任和时限',
    '关注趋势变化，不只看单月数据',
  ],
};

export const MONTHLY_PLANNING_TEMPLATE: MeetingTemplate = {
  id: 'monthly_planning',
  name: '月度计划会议',
  nameEn: 'Monthly Planning Meeting',
  category: 'internal',
  subcategory: '经营管理',
  icon: 'CalendarDays',
  color: '#06B6D4',
  description: '制定下月工作计划，协调资源配置，明确重点任务',
  defaultDuration: 90,
  participants: {
    required: ['总经理', '各部门负责人'],
    optional: ['计划专员', '项目经理'],
  },
  agenda: [
    {
      id: 'last_month_review',
      title: '上月计划执行回顾',
      duration: 15,
      description: '回顾上月计划完成情况和未完成事项',
      responsible: '各部门负责人',
      required: true,
      outputs: ['计划执行报告'],
    },
    {
      id: 'company_objectives',
      title: '公司月度目标',
      duration: 10,
      description: '明确公司层面的月度关键目标',
      responsible: '总经理',
      required: true,
      outputs: ['月度目标'],
    },
    {
      id: 'department_plans',
      title: '部门计划汇报',
      duration: 30,
      description: '各部门下月工作计划和资源需求',
      responsible: '各部门负责人',
      required: true,
      outputs: ['部门月度计划'],
    },
    {
      id: 'resource_coordination',
      title: '资源协调',
      duration: 15,
      description: '跨部门资源需求协调和冲突解决',
      responsible: '总经理',
      required: true,
      outputs: ['资源配置方案'],
    },
    {
      id: 'key_milestones',
      title: '关键里程碑确认',
      duration: 10,
      description: '确定月度关键里程碑和检查点',
      responsible: '总经理',
      required: true,
      outputs: ['里程碑清单'],
    },
    {
      id: 'risk_identification',
      title: '风险识别与应对',
      duration: 10,
      description: '识别可能影响计划执行的风险',
      responsible: '各部门负责人',
      required: true,
      outputs: ['风险应对计划'],
    },
  ],
  outputs: [
    { id: 'monthly_plan', name: '月度工作计划', template: 'monthly_plan_template', required: true },
    { id: 'milestone_tracker', name: '里程碑跟踪表', template: 'milestone_template', required: true },
    { id: 'resource_plan', name: '资源配置计划', template: 'resource_plan_template', required: false },
  ],
  followUpActions: [
    '会后24小时内发布月度计划',
    '各部门分解到周计划',
    '每周检查里程碑进度',
    '月中进行计划执行评估',
  ],
  aiPrompts: {
    summary: '请总结下月工作重点和关键目标',
    actionItems: '请提取各部门的关键任务和里程碑',
    assessment: '请评估计划的可行性和资源匹配度',
  },
  bestPractices: [
    '计划要SMART化，可衡量可追踪',
    '预留弹性空间应对变化',
    '关注部门间的协同和依赖',
    '定期检查，及时调整',
  ],
};

export const ANNUAL_PLANNING_TEMPLATE: MeetingTemplate = {
  id: 'annual_planning',
  name: '年度规划会议',
  nameEn: 'Annual Planning Meeting',
  category: 'internal',
  subcategory: '战略管理',
  icon: 'Compass',
  color: '#EC4899',
  description: '制定年度战略目标、经营计划和资源预算',
  defaultDuration: 240,
  participants: {
    required: ['董事长/总经理', '各部门负责人', '财务总监'],
    optional: ['董事会成员', '战略顾问', '核心骨干'],
  },
  agenda: [
    {
      id: 'year_review',
      title: '年度回顾与总结',
      duration: 30,
      description: '回顾本年度战略目标达成和经验教训',
      responsible: '总经理',
      required: true,
      outputs: ['年度总结报告'],
    },
    {
      id: 'market_outlook',
      title: '市场环境分析',
      duration: 20,
      description: '行业趋势、竞争格局、机会与威胁分析',
      responsible: '市场部',
      required: true,
      outputs: ['市场分析报告'],
    },
    {
      id: 'strategic_direction',
      title: '战略方向研讨',
      duration: 40,
      description: '明确公司发展战略和核心竞争力建设方向',
      responsible: '董事长/总经理',
      required: true,
      outputs: ['战略规划'],
    },
    {
      id: 'annual_objectives',
      title: '年度目标设定',
      duration: 30,
      description: '制定年度经营目标（收入、利润、市场份额等）',
      responsible: '总经理',
      required: true,
      outputs: ['年度目标'],
    },
    {
      id: 'department_plans',
      title: '部门年度计划',
      duration: 40,
      description: '各部门年度工作计划和关键举措',
      responsible: '各部门负责人',
      required: true,
      outputs: ['部门年度计划'],
    },
    {
      id: 'budget_planning',
      title: '预算规划',
      duration: 30,
      description: '年度预算编制和资源配置',
      responsible: '财务总监',
      required: true,
      outputs: ['年度预算'],
    },
    {
      id: 'hr_planning',
      title: '人力资源规划',
      duration: 20,
      description: '人员编制、招聘计划、培训发展规划',
      responsible: 'HR总监',
      required: true,
      outputs: ['人力资源计划'],
    },
    {
      id: 'investment_planning',
      title: '投资与项目规划',
      duration: 20,
      description: '重大投资项目和能力建设计划',
      responsible: '总经理',
      required: false,
      outputs: ['投资计划'],
    },
    {
      id: 'risk_management',
      title: '风险管理',
      duration: 10,
      description: '识别年度重大风险和应对策略',
      responsible: '总经理',
      required: true,
      outputs: ['风险管理计划'],
    },
  ],
  outputs: [
    { id: 'annual_plan', name: '年度经营计划', template: 'annual_plan_template', required: true },
    { id: 'budget', name: '年度预算', template: 'budget_template', required: true },
    { id: 'strategic_map', name: '战略地图', template: 'strategy_map_template', required: true },
    { id: 'kpi_system', name: 'KPI体系', template: 'kpi_template', required: true },
  ],
  followUpActions: [
    '一周内完成年度计划定稿',
    '各部门分解季度/月度计划',
    '建立目标跟踪和复盘机制',
    '季度进行战略回顾',
  ],
  aiPrompts: {
    summary: '请总结年度战略方向和核心目标',
    actionItems: '请提取各部门的年度关键任务和里程碑',
    assessment: '请评估年度计划的战略一致性和可执行性',
  },
  bestPractices: [
    '战略目标要有挑战性但可实现',
    '预算与战略目标相匹配',
    '建立清晰的目标分解体系',
    '定期复盘，动态调整',
  ],
};

export const ANNUAL_SUMMARY_TEMPLATE: MeetingTemplate = {
  id: 'annual_summary',
  name: '年度总结会议',
  nameEn: 'Annual Summary Meeting',
  category: 'internal',
  subcategory: '战略管理',
  icon: 'Award',
  color: '#F97316',
  description: '全面总结年度工作成果、经验教训和表彰先进',
  defaultDuration: 180,
  participants: {
    required: ['董事长/总经理', '全体管理层', '各部门代表'],
    optional: ['董事会成员', '优秀员工代表'],
  },
  agenda: [
    {
      id: 'company_review',
      title: '公司年度业绩回顾',
      duration: 30,
      description: '全面回顾年度经营目标达成情况',
      responsible: '总经理',
      required: true,
      outputs: ['年度业绩报告'],
    },
    {
      id: 'department_summaries',
      title: '部门年度总结',
      duration: 60,
      description: '各部门年度工作总结和亮点展示',
      responsible: '各部门负责人',
      required: true,
      outputs: ['部门总结报告'],
    },
    {
      id: 'lessons_learned',
      title: '经验教训分享',
      duration: 20,
      description: '总结成功经验和失败教训',
      responsible: '各部门负责人',
      required: true,
      outputs: ['经验教训库'],
    },
    {
      id: 'awards_ceremony',
      title: '表彰与奖励',
      duration: 30,
      description: '年度优秀团队和个人表彰',
      responsible: 'HR总监',
      required: true,
      outputs: ['表彰名单'],
    },
    {
      id: 'next_year_outlook',
      title: '新年展望',
      duration: 20,
      description: '展望新年发展方向和重点工作',
      responsible: '总经理',
      required: true,
      outputs: ['新年展望'],
    },
    {
      id: 'closing',
      title: '总结致辞',
      duration: 20,
      description: '领导总结致辞和新年寄语',
      responsible: '董事长/总经理',
      required: true,
      outputs: [],
    },
  ],
  outputs: [
    { id: 'annual_report', name: '年度工作报告', template: 'annual_report_template', required: true },
    { id: 'awards_list', name: '年度表彰名单', template: 'awards_template', required: true },
    { id: 'lessons_document', name: '经验教训文档', template: 'lessons_template', required: false },
  ],
  followUpActions: [
    '会后发布年度工作报告',
    '兑现表彰奖励',
    '经验教训纳入知识库',
    '启动新年度工作',
  ],
  aiPrompts: {
    summary: '请总结年度核心成就和关键数据',
    actionItems: '请提取需要延续到新年度的工作事项',
    assessment: '请评估年度目标达成情况和团队表现',
  },
  bestPractices: [
    '用数据说话，客观呈现成果',
    '既总结成绩也反思不足',
    '表彰要公平公正，激励士气',
    '展望要鼓舞人心，凝聚共识',
  ],
};

// ============================================
// 客户项目类会议模板
// ============================================

export const CUSTOMER_FIRST_MEETING_TEMPLATE: MeetingTemplate = {
  id: 'customer_first_meeting',
  name: '客户首次沟通交流',
  nameEn: 'Customer First Meeting',
  category: 'customer',
  subcategory: '商务洽谈',
  icon: 'Handshake',
  color: '#0EA5E9',
  description: '与潜在客户的首次正式沟通，了解需求，建立信任',
  defaultDuration: 90,
  participants: {
    required: ['销售经理', '技术支持'],
    optional: ['项目经理', '方案工程师', '公司高管'],
  },
  agenda: [
    {
      id: 'introduction',
      title: '公司介绍',
      duration: 15,
      description: '介绍公司背景、核心能力和成功案例',
      responsible: '销售经理',
      required: true,
      outputs: ['公司介绍PPT'],
    },
    {
      id: 'customer_background',
      title: '客户背景了解',
      duration: 15,
      description: '了解客户公司、行业、业务现状',
      responsible: '销售经理',
      required: true,
      outputs: ['客户信息表'],
    },
    {
      id: 'requirement_discovery',
      title: '需求挖掘',
      duration: 25,
      description: '深入了解客户的具体需求、痛点和期望',
      responsible: '技术支持',
      required: true,
      outputs: ['需求清单'],
    },
    {
      id: 'solution_preview',
      title: '初步方案探讨',
      duration: 15,
      description: '基于需求提供初步解决思路',
      responsible: '技术支持',
      required: true,
      outputs: ['初步方案'],
    },
    {
      id: 'timeline_budget',
      title: '时间与预算沟通',
      duration: 10,
      description: '了解客户的项目时间要求和预算范围',
      responsible: '销售经理',
      required: true,
      outputs: ['项目概况'],
    },
    {
      id: 'next_steps',
      title: '后续安排',
      duration: 10,
      description: '确定下一步行动计划和跟进方式',
      responsible: '销售经理',
      required: true,
      outputs: ['行动计划'],
    },
  ],
  outputs: [
    { id: 'meeting_record', name: '会议纪要', template: 'meeting_record_template', required: true },
    { id: 'requirement_doc', name: '需求文档', template: 'requirement_template', required: true },
    { id: 'follow_up_plan', name: '跟进计划', template: 'follow_up_template', required: true },
  ],
  followUpActions: [
    '24小时内发送会议纪要和感谢信',
    '3个工作日内提供初步方案/报价',
    '一周内安排技术深入交流',
    '及时更新CRM系统',
  ],
  aiPrompts: {
    summary: '请总结客户的核心需求和关注点',
    actionItems: '请提取需要跟进的事项和承诺',
    assessment: '请评估商机的成熟度和成功概率',
  },
  bestPractices: [
    '多听少说，充分了解客户需求',
    '展示专业能力，建立信任',
    '不要过度承诺，实事求是',
    '记录关键信息，及时跟进',
  ],
};

export const DRAWING_REVIEW_TEMPLATE: MeetingTemplate = {
  id: 'drawing_review',
  name: '客户图纸评审会',
  nameEn: 'Drawing Review Meeting',
  category: 'customer',
  subcategory: '技术评审',
  icon: 'FileSearch',
  color: '#14B8A6',
  description: '与客户共同评审技术图纸，确认设计方案和技术要求',
  defaultDuration: 120,
  participants: {
    required: ['项目经理', '设计工程师', '客户技术代表'],
    optional: ['质量工程师', '工艺工程师', '客户项目经理'],
  },
  agenda: [
    {
      id: 'drawing_overview',
      title: '图纸总体说明',
      duration: 15,
      description: '介绍图纸版本、范围和主要内容',
      responsible: '设计工程师',
      required: true,
      outputs: ['图纸清单'],
    },
    {
      id: 'technical_review',
      title: '技术方案评审',
      duration: 40,
      description: '逐项评审技术方案和设计细节',
      responsible: '设计工程师',
      required: true,
      outputs: ['技术评审记录'],
    },
    {
      id: 'spec_confirmation',
      title: '技术规格确认',
      duration: 20,
      description: '确认关键技术参数和性能指标',
      responsible: '设计工程师',
      required: true,
      outputs: ['技术规格书'],
    },
    {
      id: 'interface_review',
      title: '接口与配合评审',
      duration: 15,
      description: '评审设备接口、安装条件和配合要求',
      responsible: '项目经理',
      required: true,
      outputs: ['接口清单'],
    },
    {
      id: 'change_discussion',
      title: '变更与优化讨论',
      duration: 15,
      description: '讨论需要修改或优化的内容',
      responsible: '设计工程师',
      required: true,
      outputs: ['变更清单'],
    },
    {
      id: 'approval_process',
      title: '审批流程确认',
      duration: 10,
      description: '确认图纸审批流程和时间节点',
      responsible: '项目经理',
      required: true,
      outputs: ['审批计划'],
    },
    {
      id: 'action_items',
      title: '行动项确认',
      duration: 5,
      description: '确认双方的行动项和完成时间',
      responsible: '项目经理',
      required: true,
      outputs: ['行动项清单'],
    },
  ],
  outputs: [
    { id: 'review_record', name: '评审记录', template: 'review_record_template', required: true },
    { id: 'change_list', name: '变更清单', template: 'change_list_template', required: true },
    { id: 'approval_form', name: '图纸审批单', template: 'approval_form_template', required: true },
  ],
  followUpActions: [
    '48小时内发送评审纪要',
    '按计划完成图纸修改',
    '修改后重新提交评审',
    '获取客户正式签字确认',
  ],
  aiPrompts: {
    summary: '请总结图纸评审的关键结论和待确认事项',
    actionItems: '请提取需要修改的图纸内容和技术变更',
    assessment: '请评估技术方案的完整性和风险点',
  },
  bestPractices: [
    '提前发送图纸供客户预审',
    '准备好技术说明和依据',
    '详细记录客户的每个意见',
    '变更要评估影响和成本',
  ],
};

export const PRE_ACCEPTANCE_TEMPLATE: MeetingTemplate = {
  id: 'pre_acceptance',
  name: '客户预验收会议',
  nameEn: 'Pre-Acceptance Meeting',
  category: 'customer',
  subcategory: '项目交付',
  icon: 'ClipboardCheck',
  color: '#A855F7',
  description: '设备出厂前的预验收会议，确认设备符合合同要求',
  defaultDuration: 180,
  participants: {
    required: ['项目经理', '质量工程师', '客户验收代表'],
    optional: ['调试工程师', '销售经理', '客户技术专家'],
  },
  agenda: [
    {
      id: 'project_overview',
      title: '项目概况回顾',
      duration: 10,
      description: '回顾项目背景、合同要求和验收标准',
      responsible: '项目经理',
      required: true,
      outputs: ['项目概况'],
    },
    {
      id: 'document_review',
      title: '文档资料审查',
      duration: 20,
      description: '审查技术文档、操作手册、合格证书等',
      responsible: '质量工程师',
      required: true,
      outputs: ['文档清单'],
    },
    {
      id: 'visual_inspection',
      title: '外观检查',
      duration: 20,
      description: '检查设备外观、标识、安全防护等',
      responsible: '质量工程师',
      required: true,
      outputs: ['外观检查表'],
    },
    {
      id: 'function_test',
      title: '功能测试',
      duration: 60,
      description: '按照测试大纲进行功能验证',
      responsible: '调试工程师',
      required: true,
      outputs: ['功能测试报告'],
    },
    {
      id: 'performance_test',
      title: '性能测试',
      duration: 40,
      description: '验证关键性能指标是否达标',
      responsible: '调试工程师',
      required: true,
      outputs: ['性能测试报告'],
    },
    {
      id: 'issue_discussion',
      title: '问题讨论与处理',
      duration: 20,
      description: '讨论发现的问题和整改方案',
      responsible: '项目经理',
      required: true,
      outputs: ['问题清单', 'OPL清单'],
    },
    {
      id: 'acceptance_decision',
      title: '验收结论',
      duration: 10,
      description: '确认验收结论和后续安排',
      responsible: '项目经理',
      required: true,
      outputs: ['预验收报告'],
    },
  ],
  outputs: [
    { id: 'pre_acceptance_report', name: '预验收报告', template: 'pre_acceptance_template', required: true },
    { id: 'test_report', name: '测试报告', template: 'test_report_template', required: true },
    { id: 'opl_list', name: 'OPL清单', template: 'opl_template', required: true },
    { id: 'acceptance_form', name: '预验收确认单', template: 'acceptance_form_template', required: true },
  ],
  followUpActions: [
    '24小时内发送预验收报告',
    'OPL问题按计划整改',
    '整改完成后通知客户确认',
    '安排发货和现场安装',
  ],
  aiPrompts: {
    summary: '请总结预验收的关键结论和遗留问题',
    actionItems: '请提取OPL清单和整改要求',
    assessment: '请评估设备的整体质量状况和交付风险',
  },
  bestPractices: [
    '提前准备好所有测试条件',
    '按照测试大纲逐项验证',
    '问题要当场记录并确认',
    'OPL要明确责任人和时间',
  ],
};

export const CUSTOMER_SOLUTION_MEETING_TEMPLATE: MeetingTemplate = {
  id: 'customer_solution_meeting',
  name: '客户方案沟通确认会议',
  nameEn: 'Customer Solution Meeting',
  category: 'customer',
  subcategory: '方案沟通',
  icon: 'Building2',
  color: '#8B5CF6',
  description: '与客户进行方案沟通确认，支持图纸上传、AI案例匹配、智能方案建议和语音识别',
  defaultDuration: 120,
  participants: {
    required: ['销售经理', '方案工程师', '客户项目负责人'],
    optional: ['技术总监', '项目经理', '客户技术人员', '客户采购'],
  },
  agenda: [
    {
      id: 'opening',
      title: '会议开场',
      duration: 5,
      description: '介绍与会人员，说明会议目的和议程',
      responsible: '销售经理',
      required: true,
      outputs: [],
    },
    {
      id: 'requirement_review',
      title: '客户需求回顾',
      duration: 15,
      description: '回顾客户需求，确认产品类型、清洁度要求、节拍等关键参数',
      responsible: '方案工程师',
      required: true,
      outputs: ['需求确认表'],
    },
    {
      id: 'drawing_review',
      title: '图纸资料评审',
      duration: 20,
      description: '评审客户提供的图纸、清洁度要求文档、零件照片等资料',
      responsible: '方案工程师',
      required: true,
      outputs: ['资料评审记录'],
    },
    {
      id: 'ai_case_matching',
      title: 'AI案例匹配分析',
      duration: 15,
      description: 'AI自动分析并匹配相似/相近历史案例，展示匹配结果',
      responsible: '方案工程师',
      required: true,
      outputs: ['案例匹配报告'],
    },
    {
      id: 'case_discussion',
      title: '相似案例讨论',
      duration: 15,
      description: '讨论匹配的历史案例，分析可借鉴的经验和方案',
      responsible: '方案工程师',
      required: true,
      outputs: ['案例分析记录'],
    },
    {
      id: 'solution_proposal',
      title: '方案建议呈现',
      duration: 20,
      description: 'AI生成的方案建议，包括设备配置、工艺流程、M0-M12阶段资料',
      responsible: '方案工程师',
      required: true,
      outputs: ['方案建议书'],
    },
    {
      id: 'technical_discussion',
      title: '技术资料讨论',
      duration: 15,
      description: '调用T1-T15工序资料进行技术讨论',
      responsible: '方案工程师',
      required: false,
      outputs: ['技术讨论记录'],
    },
    {
      id: 'customer_feedback',
      title: '客户反馈收集',
      duration: 10,
      description: '收集客户对方案的反馈和修改建议',
      responsible: '销售经理',
      required: true,
      outputs: ['客户反馈记录'],
    },
    {
      id: 'next_steps',
      title: '后续计划确认',
      duration: 5,
      description: '确认后续工作计划、责任人和时间节点',
      responsible: '销售经理',
      required: true,
      outputs: ['后续计划表'],
    },
  ],
  outputs: [
    { id: 'meeting_minutes', name: '会议纪要', template: 'solution_meeting_minutes_template', required: true },
    { id: 'case_match_report', name: '案例匹配报告', template: 'case_match_template', required: true },
    { id: 'solution_proposal', name: '方案建议书', template: 'solution_proposal_template', required: true },
    { id: 'action_items', name: '行动项清单', template: 'action_items_template', required: true },
  ],
  followUpActions: [
    '当天完成会议纪要并发送给客户',
    '三天内完成方案优化并提交审核',
    '一周内完成正式方案报价',
    '定期跟进客户反馈',
  ],
  aiPrompts: {
    summary: '请总结客户核心需求、匹配的案例和方案建议要点',
    actionItems: '请提取需要跟进的行动项和责任人',
    assessment: '请评估方案与客户需求的匹配度和成功率',
  },
  bestPractices: [
    '会前确保客户资料已上传完整',
    '充分利用AI案例匹配提高效率',
    '方案建议要结合客户实际情况调整',
    '记录客户反馈作为方案优化依据',
    '明确后续跟进节点和责任人',
  ],
};

export const FINAL_ACCEPTANCE_TEMPLATE: MeetingTemplate = {
  id: 'final_acceptance',
  name: '客户终验收会议',
  nameEn: 'Final Acceptance Meeting',
  category: 'customer',
  subcategory: '项目交付',
  icon: 'CheckCircle2',
  color: '#22C55E',
  description: '设备现场安装调试后的最终验收会议，完成项目交付',
  defaultDuration: 240,
  participants: {
    required: ['项目经理', '现场工程师', '客户项目负责人', '客户验收委员会'],
    optional: ['公司高管', '销售经理', '客户高层'],
  },
  agenda: [
    {
      id: 'project_summary',
      title: '项目执行总结',
      duration: 20,
      description: '回顾项目执行过程和关键里程碑',
      responsible: '项目经理',
      required: true,
      outputs: ['项目总结报告'],
    },
    {
      id: 'opl_closure',
      title: 'OPL关闭确认',
      duration: 20,
      description: '确认所有OPL问题已关闭',
      responsible: '项目经理',
      required: true,
      outputs: ['OPL关闭报告'],
    },
    {
      id: 'document_handover',
      title: '文档资料移交',
      duration: 20,
      description: '移交全套技术文档和培训资料',
      responsible: '项目经理',
      required: true,
      outputs: ['文档移交清单'],
    },
    {
      id: 'site_inspection',
      title: '现场检查',
      duration: 30,
      description: '现场检查设备安装和运行状态',
      responsible: '现场工程师',
      required: true,
      outputs: ['现场检查表'],
    },
    {
      id: 'production_verification',
      title: '生产验证',
      duration: 60,
      description: '进行生产验证测试，确认达到生产要求',
      responsible: '现场工程师',
      required: true,
      outputs: ['生产验证报告'],
    },
    {
      id: 'training_confirmation',
      title: '培训确认',
      duration: 20,
      description: '确认操作人员培训完成',
      responsible: '现场工程师',
      required: true,
      outputs: ['培训记录'],
    },
    {
      id: 'warranty_handover',
      title: '质保与服务说明',
      duration: 15,
      description: '说明质保条款和售后服务流程',
      responsible: '项目经理',
      required: true,
      outputs: ['质保说明'],
    },
    {
      id: 'spare_parts',
      title: '备件移交',
      duration: 15,
      description: '移交随机备件和工具',
      responsible: '项目经理',
      required: true,
      outputs: ['备件清单'],
    },
    {
      id: 'acceptance_signing',
      title: '验收签字',
      duration: 20,
      description: '签署终验收报告和相关文件',
      responsible: '项目经理',
      required: true,
      outputs: ['终验收报告'],
    },
    {
      id: 'celebration',
      title: '项目庆祝',
      duration: 20,
      description: '项目成功交付庆祝和感谢',
      responsible: '项目经理',
      required: false,
      outputs: [],
    },
  ],
  outputs: [
    { id: 'final_acceptance_report', name: '终验收报告', template: 'final_acceptance_template', required: true },
    { id: 'handover_list', name: '移交清单', template: 'handover_template', required: true },
    { id: 'warranty_certificate', name: '质保证书', template: 'warranty_template', required: true },
    { id: 'project_closure', name: '项目结项报告', template: 'closure_template', required: true },
  ],
  followUpActions: [
    '当天完成验收签字',
    '一周内完成项目结项',
    '启动质保期服务',
    '收集客户满意度反馈',
    '总结项目经验教训',
  ],
  aiPrompts: {
    summary: '请总结项目交付成果和客户满意度',
    actionItems: '请提取质保期需要跟进的事项',
    assessment: '请评估项目的整体执行质量和客户关系',
  },
  bestPractices: [
    '确保所有OPL问题已关闭',
    '文档资料要完整齐全',
    '培训要确保操作人员掌握',
    '验收签字要规范完整',
  ],
};

// ============================================
// 模板集合
// ============================================

// ============================================
// 销售管理类会议模板
// ============================================

// ============================================
// 公司级周期性会议模板
// ============================================

export const DEPT_WALKTHROUGH_TEMPLATE: MeetingTemplate = {
  id: 'dept_walkthrough',
  name: '部门长走线会',
  nameEn: 'Department Head Gemba Walk',
  category: 'internal',
  subcategory: '公司级会议',
  icon: 'Footprints',
  color: '#dc2626',
  description: '每周四全公司部门长走线检查。现场巡检一楼大厅及车间，确认OPL（One Point Lesson）执行情况，检查质量/5S/交付/工艺/安全等发现项状态。结果关联智能绩效红黑榜。',
  defaultDuration: 60,
  participants: {
    required: ['全体部门长/事业部经理', 'CEO', '质量总监'],
    optional: ['CTO', 'HR总监', '安全主管', '5S专员'],
  },
  agenda: [
    { id: 'dw1', title: '上周OPL回顾', duration: 15, description: '逐项回顾上周及前几周的OPL(One Point Lesson)完成状态：已关闭/进行中/逾期', responsible: '质量总监', required: true, outputs: ['OPL状态汇总表'] },
    { id: 'dw2', title: '现场走线巡检', duration: 25, description: '按路线巡检一楼大厅→车间各工位，现场发现问题立即记录', responsible: '全体部门长', required: true, outputs: ['现场巡检记录'] },
    { id: 'dw3', title: '发现项分类登记', duration: 10, description: '将巡检发现项分类（质量/5S/交付/工艺/安全），指定责任人和整改周期', responsible: '质量总监', required: true, outputs: ['发现项登记表'] },
    { id: 'dw4', title: '红黑榜更新', duration: 5, description: '根据OPL完成率和新发现项数量更新部门红黑榜排名', responsible: 'CEO/质量总监', required: true, outputs: ['红黑榜更新'] },
    { id: 'dw5', title: '优秀改善案例分享', duration: 5, description: '选取1个本周最佳改善案例进行3分钟分享', responsible: '相关部门长', required: false, outputs: ['改善案例记录'] },
  ],
  outputs: [
    { id: 'dw_o1', name: '走线检查报告', template: '## 部门长走线会报告 {{date}} (周四)\n\n### OPL状态汇总\n| 序号 | OPL描述 | 类别 | 责任人 | 发现日期 | 计划关闭 | 状态 |\n|------|---------|------|--------|----------|----------|------|\n\n### 本周新发现项\n| 序号 | 发现项 | 类别 | 区域 | 责任人 | 整改周期 | 优先级 |\n|------|--------|------|------|--------|----------|--------|\n\n### 类别统计\n| 类别 | 开放项数 | 本周新增 | 本周关闭 | 逾期数 |\n|------|----------|----------|----------|--------|\n| 质量 | | | | |\n| 5S | | | | |\n| 交付 | | | | |\n| 工艺 | | | | |\n| 安全 | | | | |\n\n### 红黑榜\n| 排名 | 部门 | OPL完成率 | 新发现项 | 评级 |\n|------|------|-----------|----------|------|\n\n### 优秀改善案例\n', required: true },
  ],
  followUpActions: [
    '24小时内将发现项录入OPL系统',
    '责任人48小时内提交整改计划',
    '红黑榜同步更新到智能绩效系统',
    '逾期项升级至CEO周报',
    '优秀案例纳入改善案例库',
  ],
  aiPrompts: {
    summary: '请总结本次走线会：(1)OPL整体完成率趋势 (2)高频问题类别分析 (3)重复发现项预警 (4)各部门表现排名 (5)需CEO关注的关键项',
    actionItems: '请提取每个发现项的行动计划：[区域] - [发现项] - [类别] - [责任人] - [整改日期] - [优先级]',
    assessment: '请评估走线会效能：(1)OPL关闭率是否达标(≥85%) (2)重复发现项比例 (3)整改周期是否合理 (4)各部门参与度',
  },
  bestPractices: [
    '走线路线每月轮换，避免盲区',
    '发现项必须现场拍照留证',
    '责任人必须当场确认整改周期',
    '逾期超过2周的项自动升级为红色预警',
    '每月评选最佳改善部门，奖励公示',
  ],
};

export const BU_MORNING_STANDUP_TEMPLATE: MeetingTemplate = {
  id: 'bu_morning_standup',
  name: '事业部晨会',
  nameEn: 'BU Morning Standup',
  category: 'internal',
  subcategory: '公司级会议',
  icon: 'Sun',
  color: '#f97316',
  description: '每周一早晨各事业部在车间现场召开晨会。总结上周产值/交付/质量/销售/客户反馈，布置本周主要任务。站立式会议，控制在30分钟内。',
  defaultDuration: 30,
  participants: {
    required: ['事业部经理', '项目经理', '生产主管', '质量主管', '销售工程师'],
    optional: ['CTO', '设计工程师', '采购'],
  },
  agenda: [
    { id: 'bm1', title: '上周产值回顾', duration: 5, description: '上周产值完成率，与月度目标对比，差异分析', responsible: '生产主管', required: true, outputs: ['产值完成率'] },
    { id: 'bm2', title: '项目交付进度', duration: 5, description: '在手项目M0-M12进度更新，延期项预警', responsible: '项目经理', required: true, outputs: ['项目进度表'] },
    { id: 'bm3', title: '质量指标', duration: 5, description: '上周IQC/过程/终检合格率，NCR状态，客户投诉', responsible: '质量主管', required: true, outputs: ['质量周报'] },
    { id: 'bm4', title: '销售与客户动态', duration: 5, description: '新询价/报价/订单动态，客户反馈/投诉，本周客户来访计划', responsible: '销售工程师', required: true, outputs: ['销售动态'] },
    { id: 'bm5', title: '本周重点任务', duration: 5, description: '本周Top 5重点任务，资源需求，跨部门协调事项', responsible: '事业部经理', required: true, outputs: ['周任务清单'] },
    { id: 'bm6', title: '优秀案例/表扬', duration: 5, description: '上周优秀表现人员/团队表扬，典型案例分享', responsible: '事业部经理', required: false, outputs: ['表扬记录'] },
  ],
  outputs: [
    { id: 'bm_o1', name: '事业部周报', template: '## {{buName}} 事业部晨会纪要 {{date}} (周一)\n\n### 上周产值\n- 计划产值: ¥___万\n- 实际产值: ¥___万\n- 完成率: ___%\n- 月度累计完成率: ___%\n\n### 项目交付\n| 项目 | 阶段 | 进度 | 风险 | 备注 |\n|------|------|------|------|------|\n\n### 质量指标\n- IQC合格率: ___%\n- 过程合格率: ___%\n- 终检合格率: ___%\n- 开放NCR: ___项\n- 客户投诉: ___起\n\n### 销售动态\n- 新询价: ___个\n- 发出报价: ___个\n- 新订单: ___个 / ¥___万\n- 本周客户来访: \n\n### 本周重点\n| 序号 | 任务 | 责任人 | 截止 |\n|------|------|--------|------|\n| 1 | | | |\n| 2 | | | |\n| 3 | | | |\n\n### 表扬\n', required: true },
  ],
  followUpActions: [
    '晨会纪要10分钟内发送至事业部全员+CEO',
    '延期项目升级至项目管理系统',
    '客户投诉24小时内启动8D流程',
    '客户来访通知相关部门做好接待准备',
    '优秀案例纳入月度评优候选',
  ],
  aiPrompts: {
    summary: '请总结事业部晨会：(1)产值完成率与趋势 (2)项目交付风险项 (3)质量异常预警 (4)销售管线健康度 (5)本周关键任务',
    actionItems: '请提取晨会行动项：[责任人] - [任务] - [截止日期] - [类别(生产/质量/销售/项目)]',
    assessment: '请评估事业部运营健康度：(1)产值趋势(连续增长/下降) (2)交付准时率 (3)质量稳定性 (4)客户满意度信号',
  },
  bestPractices: [
    '站立式会议，严格控制30分钟',
    '每人汇报不超过3分钟，数据说话',
    '问题只提出不讨论，需要讨论的另行安排',
    '延期和质量异常必须有根因分析',
    '晨会在车间现场进行，增强现场感',
  ],
};

export const SALES_WEEKLY_REVIEW_TEMPLATE: MeetingTemplate = {
  id: 'sales_weekly_review',
  name: '销售周例会',
  nameEn: 'Sales Weekly Review',
  category: 'internal',
  subcategory: '销售管理',
  icon: 'TrendingUp',
  color: '#0ea5e9',
  description: '每周销售团队例会，回顾本周销售进展、客户拜访、项目推进情况，制定下周行动计划。适用于事业部销售工程师团队（王志强、冯燕、韩宝程等）。',
  defaultDuration: 60,
  participants: {
    required: ['销售总监/事业部经理', '全体销售工程师'],
    optional: ['技术支持工程师', 'CTO', 'CEO'],
  },
  agenda: [
    { id: 'sw1', title: '上周行动项回顾', duration: 10, description: '逐一回顾上周行动项完成情况，标记完成/延期/取消', responsible: '会议主持', required: true, outputs: ['行动项完成率统计'] },
    { id: 'sw2', title: '本周客户拜访汇报', duration: 15, description: '每位销售工程师汇报本周客户拜访：客户名称、拜访目的、关键反馈、下一步', responsible: '全体销售', required: true, outputs: ['客户拜访记录'] },
    { id: 'sw3', title: '项目漏斗更新', duration: 10, description: '更新M0-M3项目状态：新增线索、阶段推进、丢单分析', responsible: '全体销售', required: true, outputs: ['漏斗变化记录'] },
    { id: 'sw4', title: '本周订单/报价进展', duration: 10, description: '在手订单进展、新报价发出、报价跟踪', responsible: '全体销售', required: true, outputs: ['订单/报价汇总'] },
    { id: 'sw5', title: '竞争情报分享', duration: 5, description: '竞争对手动态、客户侧听到的市场信息', responsible: '全体销售', required: false, outputs: ['竞争情报记录'] },
    { id: 'sw6', title: '下周重点行动计划', duration: 10, description: '每位销售工程师制定下周Top 3行动项，含责任人和完成时间', responsible: '全体销售', required: true, outputs: ['下周行动计划'] },
  ],
  outputs: [
    { id: 'sw_o1', name: '销售周报', template: '## 销售周报 {{date}}\n\n### 客户拜访汇总\n| 销售 | 客户 | 目的 | 反馈 | 下一步 |\n|------|------|------|------|--------|\n\n### 项目漏斗变化\n- M0新增: \n- M1推进: \n- M2推进: \n- M3推进: \n- 丢单: \n\n### 订单/报价\n- 新订单: \n- 新报价: \n\n### 下周重点\n| 销售 | 行动项 | 截止日期 |\n|------|--------|----------|\n', required: true },
  ],
  followUpActions: [
    '更新CRM系统中的客户拜访记录',
    '更新项目漏斗M0-M3状态',
    '发送周报至事业部经理和CTO',
    '设置下周客户拜访日历提醒',
    '超期行动项升级至事业部经理',
  ],
  aiPrompts: {
    summary: '请总结本次销售周例会的要点，包括：(1)客户拜访亮点和需关注的客户反馈 (2)项目漏斗变化趋势 (3)订单和报价进展 (4)竞争情报关键发现 (5)下周重点行动',
    actionItems: '请从会议记录中提取每位销售工程师的行动项，格式为：[销售姓名] - [行动内容] - [截止日期] - [优先级]',
    assessment: '请评估本次销售周会的效率：(1)各销售的客户拜访量是否达标(每周≥3次) (2)项目漏斗是否健康(M0→M1转化率) (3)行动项执行率 (4)会议时间利用率',
  },
  bestPractices: [
    '每位销售工程师汇报控制在3分钟内',
    '客户拜访汇报必须包含"客户说了什么"而非"我做了什么"',
    '项目漏斗更新必须有数据支撑（报价金额、预计签约时间）',
    '下周行动项必须SMART（具体、可衡量、有截止日期）',
    '会议结束后2小时内发送周报',
  ],
};

export const SALES_MONTHLY_KPI_TEMPLATE: MeetingTemplate = {
  id: 'sales_monthly_kpi',
  name: '销售月度指标分析会',
  nameEn: 'Sales Monthly KPI Review',
  category: 'internal',
  subcategory: '销售管理',
  icon: 'BarChart3',
  color: '#8b5cf6',
  description: '每月销售指标回顾与分析会议。对比月度销售目标与实际达成，分析差距原因，制定改进措施。含个人KPI评审和团队整体分析。',
  defaultDuration: 90,
  participants: {
    required: ['销售总监/事业部经理', '全体销售工程师', 'CEO/CTO'],
    optional: ['财务经理', 'HR经理', '技术总监'],
  },
  agenda: [
    { id: 'sm1', title: '月度业绩总览', duration: 10, description: '展示团队整体月度KPI：合同额、回款、新客户数、客户拜访量、报价转化率', responsible: '销售总监', required: true, outputs: ['月度KPI仪表板'] },
    { id: 'sm2', title: '个人KPI逐一评审', duration: 30, description: '每位销售工程师汇报个人月度指标达成情况，对比目标差距分析', responsible: '全体销售', required: true, outputs: ['个人KPI评审表'] },
    { id: 'sm3', title: '重点项目深度分析', duration: 15, description: '选取3-5个重点项目做深度分析：进展、风险、需要的资源支持', responsible: '相关销售', required: true, outputs: ['重点项目分析报告'] },
    { id: 'sm4', title: '丢单/失败案例复盘', duration: 10, description: '本月丢单项目复盘：原因分析、教训总结、改进建议', responsible: '相关销售', required: true, outputs: ['丢单复盘记录'] },
    { id: 'sm5', title: '市场趋势与行业洞察', duration: 10, description: '行业展会、客户动态、竞争对手情报汇总分析', responsible: '销售总监', required: false, outputs: ['市场分析报告'] },
    { id: 'sm6', title: '下月目标与策略', duration: 15, description: '设定下月各项KPI目标，制定重点攻关客户和策略', responsible: '销售总监+全体销售', required: true, outputs: ['下月销售计划'] },
  ],
  outputs: [
    { id: 'sm_o1', name: '月度销售KPI报告', template: '## 月度销售KPI报告 {{month}}\n\n### 团队总览\n| 指标 | 目标 | 实际 | 达成率 |\n|------|------|------|--------|\n| 合同额(万元) | | | |\n| 回款额(万元) | | | |\n| 新客户数 | | | |\n| 客户拜访量 | | | |\n| 报价数 | | | |\n| 报价转化率 | | | |\n\n### 个人KPI\n| 销售 | 合同额 | 回款 | 拜访量 | 报价数 | 综合达成率 |\n|------|--------|------|--------|--------|------------|\n| 王志强 | | | | | |\n| 冯燕 | | | | | |\n| 韩宝程 | | | | | |\n\n### 重点项目\n\n### 丢单复盘\n\n### 下月计划\n', required: true },
  ],
  followUpActions: [
    '更新个人月度KPI到绩效系统',
    '发送月度销售报告至CEO/CTO',
    '未达标销售制定改进计划并提交',
    '更新下月销售预测到财务系统',
    '安排重点客户攻关专项会议',
    '丢单教训纳入销售培训材料库',
  ],
  aiPrompts: {
    summary: '请总结本次销售月度分析会的要点：(1)团队整体KPI达成情况及趋势 (2)表现突出和需要关注的销售 (3)重点项目进展 (4)丢单的共性原因 (5)下月关键策略',
    actionItems: '请提取每位销售工程师的改进行动项和下月重点目标，格式：[姓名] - [当月达成率] - [改进措施] - [下月目标]',
    assessment: '请评估销售团队健康度：(1)漏斗充足率(M0-M3各阶段项目数) (2)客户覆盖度(新客户vs老客户比例) (3)报价转化率趋势 (4)回款及时率 (5)个人间业绩差异分析',
  },
  bestPractices: [
    '数据说话：所有指标必须有数据支撑，不接受定性描述',
    '个人KPI评审控制在每人5分钟以内',
    '丢单复盘要找根因，不是简单的"价格太高"',
    '下月目标要与年度目标对齐，不能脱节',
    '会议结束24小时内出月报并发送全员',
    '连续2个月未达标的销售需制定专项辅导计划',
  ],
};

export const SALES_QUARTERLY_STRATEGY_TEMPLATE: MeetingTemplate = {
  id: 'sales_quarterly_strategy',
  name: '销售季度战略会',
  nameEn: 'Sales Quarterly Strategy Meeting',
  category: 'internal',
  subcategory: '销售管理',
  icon: 'Target',
  color: '#f59e0b',
  description: '每季度一次的销售战略回顾与规划会议。分析季度业绩、市场变化、竞争格局，调整下季度销售策略和资源配置。',
  defaultDuration: 120,
  participants: {
    required: ['CEO', 'CTO', '销售总监/事业部经理', '全体销售工程师'],
    optional: ['财务总监', 'HR总监', '研发总监', '质量总监'],
  },
  agenda: [
    { id: 'sq1', title: '季度业绩回顾', duration: 20, description: '对比季度销售目标与实际：合同额、回款、利润率、新客户开发、行业分布', responsible: '销售总监', required: true, outputs: ['季度业绩报告'] },
    { id: 'sq2', title: '行业与市场分析', duration: 15, description: '新能源/汽车/半导体/工业通用四大行业趋势分析', responsible: '销售总监', required: true, outputs: ['行业分析报告'] },
    { id: 'sq3', title: '竞争格局变化', duration: 10, description: '主要竞争对手动态、新进入者、技术替代风险', responsible: '销售总监', required: true, outputs: ['竞争分析'] },
    { id: 'sq4', title: '重点客户战略评审', duration: 20, description: '战略客户(CATL/BYD/Bosch等)合作深度分析、扩展机会', responsible: '对口销售', required: true, outputs: ['客户战略地图'] },
    { id: 'sq5', title: '产品技术匹配分析', duration: 15, description: 'CTO分享技术路线图与客户需求匹配度，新产品推广计划', responsible: 'CTO', required: true, outputs: ['技术匹配矩阵'] },
    { id: 'sq6', title: '下季度策略与目标', duration: 20, description: '制定下季度销售策略、目标分解、资源配置', responsible: 'CEO+销售总监', required: true, outputs: ['季度销售计划'] },
    { id: 'sq7', title: '销售团队能力建设', duration: 10, description: '培训需求、人员调整、激励政策讨论', responsible: '销售总监+HR', required: false, outputs: ['团队建设计划'] },
    { id: 'sq8', title: 'CEO/CTO总结指示', duration: 10, description: '高层战略方向指引和资源承诺', responsible: 'CEO/CTO', required: true, outputs: ['战略方向纪要'] },
  ],
  outputs: [
    { id: 'sq_o1', name: '季度销售战略报告', template: '## Q{{quarter}} {{year}} 销售战略报告\n\n### 业绩回顾\n| 指标 | Q目标 | Q实际 | 达成率 | 同比 |\n|------|-------|-------|--------|------|\n\n### 行业分析\n\n### 竞争格局\n\n### 战略客户分析\n\n### 下季度策略\n\n### 目标分解\n| 销售 | 合同额目标 | 重点客户 | 重点行业 |\n|------|-----------|---------|----------|\n| 王志强 | | | |\n| 冯燕 | | | |\n| 韩宝程 | | | |\n', required: true },
  ],
  followUpActions: [
    '发布季度销售战略报告至全员',
    '更新年度销售预测',
    '启动下季度重点客户攻关计划',
    '安排销售培训（如需）',
    '调整激励政策（如需）',
    '更新CRM中的客户战略标签',
  ],
  aiPrompts: {
    summary: '请从战略视角总结本次季度会议：(1)业绩趋势和增长引擎 (2)面临的主要挑战 (3)市场机会窗口 (4)下季度必赢之战 (5)需要CEO/CTO决策的事项',
    actionItems: '请提取高优先级战略行动项：[负责人] - [行动] - [截止日期] - [预期成果] - [所需资源]',
    assessment: '请评估GRT销售竞争力：(1)市场份额变化 (2)客户粘性(复购率) (3)新市场渗透进度 (4)技术竞争力vs对手 (5)团队执行力评分',
  },
  bestPractices: [
    'CEO/CTO必须全程参加，体现战略重视',
    '数据驱动，避免主观感受',
    '聚焦"必赢之战"，不超过3个战略方向',
    '每个行动项必须有明确的"所有者"和"里程碑"',
    '会议结束48小时内发布战略报告',
  ],
};

export const MEETING_TEMPLATES: MeetingTemplate[] = [
  // 内部管理类
  EMPLOYEE_INTERVIEW_TEMPLATE,
  PERFORMANCE_DIALOGUE_TEMPLATE,
  PRODUCTION_WEEKLY_TEMPLATE,
  MONTHLY_BUSINESS_REVIEW_TEMPLATE,
  MONTHLY_PLANNING_TEMPLATE,
  ANNUAL_PLANNING_TEMPLATE,
  ANNUAL_SUMMARY_TEMPLATE,
  // 公司级周期性会议
  DEPT_WALKTHROUGH_TEMPLATE,
  BU_MORNING_STANDUP_TEMPLATE,
  // 销售管理类
  SALES_WEEKLY_REVIEW_TEMPLATE,
  SALES_MONTHLY_KPI_TEMPLATE,
  SALES_QUARTERLY_STRATEGY_TEMPLATE,
  // 客户项目类
  CUSTOMER_FIRST_MEETING_TEMPLATE,
  CUSTOMER_SOLUTION_MEETING_TEMPLATE,
  DRAWING_REVIEW_TEMPLATE,
  PRE_ACCEPTANCE_TEMPLATE,
  FINAL_ACCEPTANCE_TEMPLATE,
];

export const MEETING_CATEGORIES = [
  {
    id: 'internal',
    name: '内部管理',
    nameEn: 'Internal Management',
    subcategories: [
      { id: 'company', name: '公司级会议', templates: ['dept_walkthrough', 'bu_morning_standup'] },
      { id: 'hr', name: 'HR管理', templates: ['employee_interview', 'performance_dialogue'] },
      { id: 'production', name: '生产管理', templates: ['production_weekly'] },
      { id: 'business', name: '经营管理', templates: ['monthly_business_review', 'monthly_planning'] },
      { id: 'strategy', name: '战略管理', templates: ['annual_planning', 'annual_summary'] },
      { id: 'sales', name: '销售管理', templates: ['sales_weekly_review', 'sales_monthly_kpi', 'sales_quarterly_strategy'] },
    ],
  },
  {
    id: 'customer',
    name: '客户项目',
    nameEn: 'Customer Projects',
    subcategories: [
      { id: 'sales', name: '商务洽谈', templates: ['customer_first_meeting'] },
      { id: 'solution', name: '方案沟通', templates: ['customer_solution_meeting'] },
      { id: 'technical', name: '技术评审', templates: ['drawing_review'] },
      { id: 'delivery', name: '项目交付', templates: ['pre_acceptance', 'final_acceptance'] },
    ],
  },
];

export function getMeetingTemplate(templateId: string): MeetingTemplate | undefined {
  return MEETING_TEMPLATES.find(t => t.id === templateId);
}

export function getMeetingTemplatesByCategory(category: 'internal' | 'customer'): MeetingTemplate[] {
  return MEETING_TEMPLATES.filter(t => t.category === category);
}

export function getMeetingTemplatesBySubcategory(subcategory: string): MeetingTemplate[] {
  return MEETING_TEMPLATES.filter(t => t.subcategory === subcategory);
}
