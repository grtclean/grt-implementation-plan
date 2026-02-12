/**
 * 会议模板库服务
 * 为不同类型的会议提供预设模板，加快会议创建流程
 */

export interface MeetingTemplate {
  id: string;
  name: string;
  description: string;
  type: MeetingType;
  defaultDuration: number; // 分钟
  agendaTemplate: AgendaItem[];
  notesTemplate: string;
  defaultParticipants?: string[];
  defaultOwner?: string;
  tags: string[];
}

export type MeetingType =
  | 'employee_interview'
  | 'performance_dialogue'
  | 'production_weekly'
  | 'monthly_analysis'
  | 'monthly_planning'
  | 'annual_planning'
  | 'annual_summary'
  | 'customer_handover'
  | 'customer_drawing_review'
  | 'customer_pre_acceptance'
  | 'customer_final_acceptance'
  | 'project_solution_confirmation'
  | 'custom';

export interface AgendaItem {
  title: string;
  duration: number; // 分钟
  description?: string;
  owner?: string;
}

// 预定义的会议模板库
const MEETING_TEMPLATES: Record<MeetingType, MeetingTemplate> = {
  employee_interview: {
    id: 'tpl_employee_interview',
    name: '员工面试',
    description: '标准的员工招聘面试流程',
    type: 'employee_interview',
    defaultDuration: 60,
    agendaTemplate: [
      {
        title: '自我介绍',
        duration: 5,
        description: '候选人自我介绍',
      },
      {
        title: '工作经历讨论',
        duration: 15,
        description: '讨论候选人的工作经历和技能',
      },
      {
        title: '职位要求讲解',
        duration: 10,
        description: '讲解职位要求和公司文化',
      },
      {
        title: '技能评估',
        duration: 20,
        description: '进行技能测试或案例讨论',
      },
      {
        title: '问题解答',
        duration: 10,
        description: '候选人提问时间',
      },
    ],
    notesTemplate: `# 员工面试记录

## 基本信息
- 候选人: 
- 岗位: 
- 面试官: 

## 面试评分
- 技能匹配度: ☐ 优秀 ☐ 良好 ☐ 一般 ☐ 不符合
- 文化适配度: ☐ 优秀 ☐ 良好 ☐ 一般 ☐ 不符合
- 沟通能力: ☐ 优秀 ☐ 良好 ☐ 一般 ☐ 不符合

## 重点讨论
- 

## 建议
- 

## 下一步
- `,
    tags: ['hr', 'recruitment', 'interview'],
  },

  performance_dialogue: {
    id: 'tpl_performance_dialogue',
    name: '员工绩效对话',
    description: '员工绩效评估和发展对话',
    type: 'performance_dialogue',
    defaultDuration: 45,
    agendaTemplate: [
      {
        title: '上期目标回顾',
        duration: 10,
        description: '回顾上一期设定的目标完成情况',
      },
      {
        title: '本期表现评估',
        duration: 15,
        description: '评估本期的工作表现和贡献',
      },
      {
        title: '发展建议',
        duration: 10,
        description: '提供职业发展建议',
      },
      {
        title: '下期目标制定',
        duration: 10,
        description: '制定下一期的工作目标',
      },
    ],
    notesTemplate: `# 员工绩效对话记录

## 参与者
- 员工: 
- 评估人: 

## 上期目标完成情况
- 

## 本期表现评估
- 

## 发展建议
- 

## 下期目标
- `,
    tags: ['hr', 'performance', 'development'],
  },

  production_weekly: {
    id: 'tpl_production_weekly',
    name: '生产周会',
    description: '每周生产进度和问题讨论',
    type: 'production_weekly',
    defaultDuration: 60,
    agendaTemplate: [
      {
        title: '上周总结',
        duration: 10,
        description: '总结上周生产情况',
      },
      {
        title: '本周计划',
        duration: 10,
        description: '确认本周生产计划',
      },
      {
        title: '问题讨论',
        duration: 20,
        description: '讨论生产中遇到的问题',
      },
      {
        title: '质量评审',
        duration: 10,
        description: '评审产品质量指标',
      },
      {
        title: '下周预告',
        duration: 10,
        description: '预告下周重点工作',
      },
    ],
    notesTemplate: `# 生产周会记录

## 上周总结
- 完成率: 
- 质量指标: 
- 主要问题: 

## 本周计划
- 产量目标: 
- 质量目标: 
- 重点任务: 

## 问题讨论
- 

## 质量评审
- 

## 行动项
- `,
    tags: ['production', 'operations', 'weekly'],
  },

  monthly_analysis: {
    id: 'tpl_monthly_analysis',
    name: '月度运营分析会',
    description: '月度运营数据分析和问题讨论',
    type: 'monthly_analysis',
    defaultDuration: 90,
    agendaTemplate: [
      {
        title: '财务数据回顾',
        duration: 20,
        description: '回顾本月财务指标',
      },
      {
        title: '销售分析',
        duration: 15,
        description: '分析销售业绩和趋势',
      },
      {
        title: '成本分析',
        duration: 15,
        description: '分析成本结构和控制',
      },
      {
        title: '问题讨论',
        duration: 20,
        description: '讨论存在的主要问题',
      },
      {
        title: '下月计划',
        duration: 20,
        description: '制定下月工作计划',
      },
    ],
    notesTemplate: `# 月度运营分析会记录

## 财务数据
- 收入: 
- 成本: 
- 利润: 
- 利润率: 

## 销售分析
- 销售额: 
- 订单数: 
- 平均订单价值: 

## 成本分析
- 主要成本项: 
- 成本控制措施: 

## 主要问题
- 

## 下月目标
- `,
    tags: ['operations', 'finance', 'monthly'],
  },

  monthly_planning: {
    id: 'tpl_monthly_planning',
    name: '月度规划会',
    description: '制定月度工作计划和目标',
    type: 'monthly_planning',
    defaultDuration: 75,
    agendaTemplate: [
      {
        title: '上月回顾',
        duration: 15,
        description: '回顾上月目标完成情况',
      },
      {
        title: '本月目标制定',
        duration: 20,
        description: '制定本月工作目标',
      },
      {
        title: '资源分配',
        duration: 15,
        description: '分配人力和物资资源',
      },
      {
        title: '风险评估',
        duration: 15,
        description: '评估可能的风险',
      },
      {
        title: '行动计划',
        duration: 10,
        description: '确认具体行动计划',
      },
    ],
    notesTemplate: `# 月度规划会记录

## 上月回顾
- 目标完成率: 
- 主要成就: 
- 存在问题: 

## 本月目标
- 

## 资源分配
- 人力: 
- 预算: 
- 其他资源: 

## 风险评估
- 

## 行动计划
- `,
    tags: ['planning', 'strategy', 'monthly'],
  },

  annual_planning: {
    id: 'tpl_annual_planning',
    name: '年度规划会',
    description: '制定年度战略和目标',
    type: 'annual_planning',
    defaultDuration: 180,
    agendaTemplate: [
      {
        title: '上年回顾',
        duration: 30,
        description: '回顾上年度的成就和问题',
      },
      {
        title: '市场分析',
        duration: 30,
        description: '分析市场趋势和竞争环境',
      },
      {
        title: '战略制定',
        duration: 40,
        description: '制定年度战略方向',
      },
      {
        title: '目标设定',
        duration: 30,
        description: '设定具体的年度目标',
      },
      {
        title: '资源规划',
        duration: 20,
        description: '规划年度资源需求',
      },
    ],
    notesTemplate: `# 年度规划会记录

## 上年回顾
- 收入: 
- 利润: 
- 主要成就: 
- 存在问题: 

## 市场分析
- 市场趋势: 
- 竞争环境: 
- 机遇: 
- 威胁: 

## 年度战略
- 

## 年度目标
- 收入目标: 
- 利润目标: 
- 其他关键指标: 

## 资源规划
- 人力需求: 
- 投资需求: 
- 其他资源: `,
    tags: ['strategy', 'planning', 'annual'],
  },

  annual_summary: {
    id: 'tpl_annual_summary',
    name: '年度总结会',
    description: '总结年度工作成果和经验教训',
    type: 'annual_summary',
    defaultDuration: 120,
    agendaTemplate: [
      {
        title: '年度业绩总结',
        duration: 30,
        description: '总结年度业绩和成就',
      },
      {
        title: '团队表现评估',
        duration: 20,
        description: '评估团队整体表现',
      },
      {
        title: '经验教训',
        duration: 30,
        description: '总结经验和教训',
      },
      {
        title: '来年展望',
        duration: 20,
        description: '展望来年的发展方向',
      },
      {
        title: '表彰和激励',
        duration: 20,
        description: '表彰优秀员工和团队',
      },
    ],
    notesTemplate: `# 年度总结会记录

## 年度业绩
- 收入: 
- 利润: 
- 市场份额: 
- 主要成就: 

## 团队表现
- 

## 经验教训
- 成功经验: 
- 失败教训: 

## 来年展望
- 

## 表彰
- `,
    tags: ['summary', 'annual', 'celebration'],
  },

  customer_handover: {
    id: 'tpl_customer_handover',
    name: '客户交接会',
    description: '项目交接给客户',
    type: 'customer_handover',
    defaultDuration: 90,
    agendaTemplate: [
      {
        title: '项目概述',
        duration: 15,
        description: '介绍项目背景和目标',
      },
      {
        title: '交付物讲解',
        duration: 30,
        description: '详细讲解交付物',
      },
      {
        title: '使用培训',
        duration: 25,
        description: '进行使用培训',
      },
      {
        title: '问题解答',
        duration: 15,
        description: '回答客户问题',
      },
      {
        title: '后续支持',
        duration: 5,
        description: '说明后续支持方式',
      },
    ],
    notesTemplate: `# 客户交接会记录

## 项目信息
- 项目名称: 
- 交接日期: 
- 客户代表: 

## 交付物
- 

## 培训内容
- 

## 客户反馈
- 

## 后续支持
- `,
    tags: ['customer', 'handover', 'delivery'],
  },

  customer_drawing_review: {
    id: 'tpl_customer_drawing_review',
    name: '客户图纸评审会',
    description: '评审客户提供的设计图纸',
    type: 'customer_drawing_review',
    defaultDuration: 120,
    agendaTemplate: [
      {
        title: '图纸介绍',
        duration: 15,
        description: '客户介绍设计图纸',
      },
      {
        title: '技术评审',
        duration: 45,
        description: '技术团队进行评审',
      },
      {
        title: '问题讨论',
        duration: 30,
        description: '讨论发现的问题',
      },
      {
        title: '改进建议',
        duration: 20,
        description: '提出改进建议',
      },
      {
        title: '后续计划',
        duration: 10,
        description: '确定后续计划',
      },
    ],
    notesTemplate: `# 客户图纸评审记录

## 图纸信息
- 图纸编号: 
- 版本: 
- 提交日期: 

## 评审意见
- 

## 发现的问题
- 

## 改进建议
- 

## 后续行动
- `,
    tags: ['customer', 'technical', 'review'],
  },

  customer_pre_acceptance: {
    id: 'tpl_customer_pre_acceptance',
    name: '客户预验收会',
    description: '项目预验收阶段的评审',
    type: 'customer_pre_acceptance',
    defaultDuration: 120,
    agendaTemplate: [
      {
        title: '项目进度汇报',
        duration: 15,
        description: '汇报项目完成情况',
      },
      {
        title: '功能演示',
        duration: 40,
        description: '演示项目功能',
      },
      {
        title: '问题讨论',
        duration: 30,
        description: '讨论存在的问题',
      },
      {
        title: '改进计划',
        duration: 20,
        description: '制定改进计划',
      },
      {
        title: '验收标准确认',
        duration: 15,
        description: '确认最终验收标准',
      },
    ],
    notesTemplate: `# 客户预验收记录

## 项目进度
- 完成度: 
- 主要成就: 

## 功能演示
- 

## 发现的问题
- 

## 改进计划
- 

## 验收标准
- `,
    tags: ['customer', 'acceptance', 'qa'],
  },

  customer_final_acceptance: {
    id: 'tpl_customer_final_acceptance',
    name: '客户最终验收会',
    description: '项目最终验收阶段',
    type: 'customer_final_acceptance',
    defaultDuration: 90,
    agendaTemplate: [
      {
        title: '最终检查',
        duration: 30,
        description: '进行最终检查',
      },
      {
        title: '验收标准确认',
        duration: 20,
        description: '确认所有验收标准',
      },
      {
        title: '文档交付',
        duration: 15,
        description: '交付项目文档',
      },
      {
        title: '培训和支持',
        duration: 15,
        description: '提供培训和支持',
      },
      {
        title: '验收签署',
        duration: 10,
        description: '签署验收单据',
      },
    ],
    notesTemplate: `# 客户最终验收记录

## 验收日期
- 

## 验收标准检查
- 

## 文档交付清单
- 

## 培训内容
- 

## 验收结果
- ☐ 通过 ☐ 条件通过 ☐ 不通过

## 备注
- `,
    tags: ['customer', 'acceptance', 'final'],
  },

  project_solution_confirmation: {
    id: 'tpl_project_solution_confirmation',
    name: '项目方案确认会',
    description: '确认项目解决方案',
    type: 'project_solution_confirmation',
    defaultDuration: 120,
    agendaTemplate: [
      {
        title: '需求回顾',
        duration: 20,
        description: '回顾项目需求',
      },
      {
        title: '方案讲解',
        duration: 40,
        description: '详细讲解解决方案',
      },
      {
        title: '技术评估',
        duration: 30,
        description: '进行技术可行性评估',
      },
      {
        title: '成本评估',
        duration: 20,
        description: '进行成本评估',
      },
      {
        title: '方案确认',
        duration: 10,
        description: '确认最终方案',
      },
    ],
    notesTemplate: `# 项目方案确认记录

## 项目信息
- 项目名称: 
- 客户: 
- 项目经理: 

## 需求总结
- 

## 提议方案
- 

## 技术评估
- 可行性: 
- 风险: 

## 成本评估
- 总成本: 
- 成本分解: 

## 方案确认
- ☐ 已确认 ☐ 需要修改

## 下一步
- `,
    tags: ['project', 'solution', 'customer'],
  },

  custom: {
    id: 'tpl_custom',
    name: '自定义会议',
    description: '自定义会议模板',
    type: 'custom',
    defaultDuration: 60,
    agendaTemplate: [
      {
        title: '议程项1',
        duration: 20,
      },
      {
        title: '议程项2',
        duration: 20,
      },
      {
        title: '议程项3',
        duration: 20,
      },
    ],
    notesTemplate: `# 会议记录

## 参与者
- 

## 讨论内容
- 

## 决策
- 

## 行动项
- `,
    tags: ['custom'],
  },
};

/**
 * 获取所有会议模板
 */
export function getAllTemplates(): MeetingTemplate[] {
  return Object.values(MEETING_TEMPLATES);
}

/**
 * 获取特定类型的模板
 */
export function getTemplate(type: MeetingType): MeetingTemplate | null {
  return MEETING_TEMPLATES[type] || null;
}

/**
 * 根据标签搜索模板
 */
export function searchTemplatesByTag(tag: string): MeetingTemplate[] {
  return Object.values(MEETING_TEMPLATES).filter((template) =>
    template.tags.includes(tag)
  );
}

/**
 * 创建自定义模板
 */
export function createCustomTemplate(
  name: string,
  agendas: AgendaItem[],
  notesTemplate: string
): MeetingTemplate {
  const customId = `tpl_custom_${Date.now()}`;
  return {
    id: customId,
    name,
    description: '自定义模板',
    type: 'custom',
    defaultDuration: agendas.reduce((sum, a) => sum + a.duration, 0),
    agendaTemplate: agendas,
    notesTemplate,
    tags: ['custom'],
  };
}
