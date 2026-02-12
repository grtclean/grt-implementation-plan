/**
 * Meeting Owner 初始化配置服务
 * 为各类会议设置默认的Meeting Owner配置
 */

import { requireDb } from '../db';
import { sql } from 'drizzle-orm';

// 会议类型与MO配置
export interface MeetingOwnerConfig {
  meetingType: string;           // 会议类型
  meetingTypeName: string;       // 会议类型名称
  defaultOwnerRole: string;      // 默认负责人角色
  autoReportEnabled: boolean;    // 是否启用自动上报
  reportFrequency: string;       // 上报频率
  evidenceRequired: boolean;     // 是否需要举证
  evidenceTypes: string[];       // 举证类型
  reminderDays: number;          // 提前提醒天数
  escalationDays: number;        // 升级天数
  description: string;           // 描述
}

// 预定义的会议类型MO配置
export const DEFAULT_MO_CONFIGS: MeetingOwnerConfig[] = [
  // 内部管理类会议
  {
    meetingType: 'employee_interview',
    meetingTypeName: '员工访谈',
    defaultOwnerRole: 'HR经理',
    autoReportEnabled: true,
    reportFrequency: 'after_meeting',
    evidenceRequired: true,
    evidenceTypes: ['访谈记录', '员工反馈表', '改进计划'],
    reminderDays: 1,
    escalationDays: 3,
    description: '员工一对一访谈，了解员工状态和诉求'
  },
  {
    meetingType: 'performance_dialogue',
    meetingTypeName: '员工绩效对话',
    defaultOwnerRole: '部门经理',
    autoReportEnabled: true,
    reportFrequency: 'after_meeting',
    evidenceRequired: true,
    evidenceTypes: ['绩效评估表', '目标设定表', '改进计划', '签字确认'],
    reminderDays: 2,
    escalationDays: 5,
    description: '绩效周期内的正式绩效沟通'
  },
  {
    meetingType: 'production_weekly',
    meetingTypeName: '生产周会',
    defaultOwnerRole: '生产经理',
    autoReportEnabled: true,
    reportFrequency: 'weekly',
    evidenceRequired: true,
    evidenceTypes: ['周报', '生产数据', '问题清单', '改进措施'],
    reminderDays: 1,
    escalationDays: 2,
    description: '每周生产情况回顾和下周计划'
  },
  {
    meetingType: 'monthly_operation_analysis',
    meetingTypeName: '月度经营分析会',
    defaultOwnerRole: '运营总监',
    autoReportEnabled: true,
    reportFrequency: 'monthly',
    evidenceRequired: true,
    evidenceTypes: ['月度报表', '财务数据', 'KPI达成情况', '问题分析', '改进计划'],
    reminderDays: 3,
    escalationDays: 5,
    description: '月度经营数据分析和决策'
  },
  {
    meetingType: 'monthly_planning',
    meetingTypeName: '月度计划会议',
    defaultOwnerRole: '计划经理',
    autoReportEnabled: true,
    reportFrequency: 'monthly',
    evidenceRequired: true,
    evidenceTypes: ['月度计划', '资源需求', '风险评估', '里程碑'],
    reminderDays: 3,
    escalationDays: 5,
    description: '下月工作计划制定和资源协调'
  },
  {
    meetingType: 'annual_planning',
    meetingTypeName: '年度规划会议',
    defaultOwnerRole: '总经理',
    autoReportEnabled: true,
    reportFrequency: 'yearly',
    evidenceRequired: true,
    evidenceTypes: ['年度规划', '预算计划', '组织架构', '战略目标', '关键举措'],
    reminderDays: 7,
    escalationDays: 14,
    description: '年度战略规划和目标设定'
  },
  {
    meetingType: 'annual_summary',
    meetingTypeName: '年度总结会议',
    defaultOwnerRole: '总经理',
    autoReportEnabled: true,
    reportFrequency: 'yearly',
    evidenceRequired: true,
    evidenceTypes: ['年度总结报告', '业绩数据', '经验教训', '表彰名单', '改进建议'],
    reminderDays: 7,
    escalationDays: 14,
    description: '年度工作总结和表彰'
  },

  // 客户项目类会议
  {
    meetingType: 'customer_first_contact',
    meetingTypeName: '客户首次沟通交流',
    defaultOwnerRole: '销售经理',
    autoReportEnabled: true,
    reportFrequency: 'after_meeting',
    evidenceRequired: true,
    evidenceTypes: ['客户信息表', '需求记录', '初步方案', '跟进计划'],
    reminderDays: 1,
    escalationDays: 3,
    description: '与新客户的首次接触和需求了解'
  },
  {
    meetingType: 'customer_drawing_review',
    meetingTypeName: '客户图纸评审会',
    defaultOwnerRole: '技术经理',
    autoReportEnabled: true,
    reportFrequency: 'after_meeting',
    evidenceRequired: true,
    evidenceTypes: ['图纸评审记录', '技术问题清单', '修改建议', '确认签字'],
    reminderDays: 2,
    escalationDays: 5,
    description: '客户图纸技术评审和确认'
  },
  {
    meetingType: 'customer_pre_acceptance',
    meetingTypeName: '客户预验收会议',
    defaultOwnerRole: '项目经理',
    autoReportEnabled: true,
    reportFrequency: 'after_meeting',
    evidenceRequired: true,
    evidenceTypes: ['预验收报告', '测试数据', '问题清单', '整改计划', '客户签字'],
    reminderDays: 3,
    escalationDays: 7,
    description: '设备出厂前的客户预验收'
  },
  {
    meetingType: 'customer_final_acceptance',
    meetingTypeName: '客户终验收会议',
    defaultOwnerRole: '项目经理',
    autoReportEnabled: true,
    reportFrequency: 'after_meeting',
    evidenceRequired: true,
    evidenceTypes: ['终验收报告', '性能测试数据', '培训记录', '移交清单', '验收签字'],
    reminderDays: 3,
    escalationDays: 7,
    description: '设备现场安装调试后的终验收'
  },
  {
    meetingType: 'customer_solution_confirmation',
    meetingTypeName: '客户方案沟通确认会议',
    defaultOwnerRole: '技术总监',
    autoReportEnabled: true,
    reportFrequency: 'after_meeting',
    evidenceRequired: true,
    evidenceTypes: ['方案文档', '技术规格', '报价单', '项目计划', '客户确认函'],
    reminderDays: 2,
    escalationDays: 5,
    description: '与客户确认技术方案和项目范围'
  }
];

/**
 * 初始化Meeting Owner配置
 */
export async function initializeMeetingOwnerConfigs(): Promise<{
  success: boolean;
  created: number;
  skipped: number;
  errors: string[];
}> {
  const db = await requireDb();
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const config of DEFAULT_MO_CONFIGS) {
    try {
      // 检查是否已存在
      const existingResult = await db.execute(sql`SELECT id FROM meeting_owners WHERE meeting_type = ${config.meetingType}`);

      if (existingResult.rows.length > 0) {
        skipped++;
        continue;
      }

      // 创建新配置
      const id = `mo_${config.meetingType}_${Date.now()}`;
      const now = new Date().toISOString();

      await db.execute(sql`INSERT INTO meeting_owners
              (id, meeting_type, meeting_type_name, default_owner_role,
               auto_report_enabled, report_frequency, evidence_required,
               evidence_types, reminder_days, escalation_days, description,
               created_at, updated_at)
              VALUES (${id}, ${config.meetingType}, ${config.meetingTypeName}, ${config.defaultOwnerRole}, ${config.autoReportEnabled ? 1 : 0}, ${config.reportFrequency}, ${config.evidenceRequired ? 1 : 0}, ${JSON.stringify(config.evidenceTypes)}, ${config.reminderDays}, ${config.escalationDays}, ${config.description}, ${now}, ${now})`);

      created++;
    } catch (error) {
      errors.push(`${config.meetingTypeName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    success: errors.length === 0,
    created,
    skipped,
    errors
  };
}

/**
 * 获取所有MO配置
 */
export async function getMeetingOwnerConfigs(): Promise<MeetingOwnerConfig[]> {
  const db = await requireDb();

  const result = await db.execute(sql`SELECT * FROM meeting_owners ORDER BY meeting_type_name`);

  return result.rows.map((row: any) => ({
    meetingType: row.meeting_type,
    meetingTypeName: row.meeting_type_name,
    defaultOwnerRole: row.default_owner_role,
    autoReportEnabled: row.auto_report_enabled === 1,
    reportFrequency: row.report_frequency,
    evidenceRequired: row.evidence_required === 1,
    evidenceTypes: JSON.parse(row.evidence_types || '[]'),
    reminderDays: row.reminder_days,
    escalationDays: row.escalation_days,
    description: row.description
  }));
}

/**
 * 更新MO配置
 */
export async function updateMeetingOwnerConfig(
  meetingType: string,
  updates: Partial<MeetingOwnerConfig>
): Promise<{ success: boolean }> {
  const db = await requireDb();
  const now = new Date().toISOString();

  // Build dynamic update query
  let updateQuery = sql`UPDATE meeting_owners SET updated_at = ${now}`;

  if (updates.defaultOwnerRole !== undefined) {
    updateQuery = sql`${updateQuery}, default_owner_role = ${updates.defaultOwnerRole}`;
  }
  if (updates.autoReportEnabled !== undefined) {
    updateQuery = sql`${updateQuery}, auto_report_enabled = ${updates.autoReportEnabled ? 1 : 0}`;
  }
  if (updates.reportFrequency !== undefined) {
    updateQuery = sql`${updateQuery}, report_frequency = ${updates.reportFrequency}`;
  }
  if (updates.evidenceRequired !== undefined) {
    updateQuery = sql`${updateQuery}, evidence_required = ${updates.evidenceRequired ? 1 : 0}`;
  }
  if (updates.evidenceTypes !== undefined) {
    updateQuery = sql`${updateQuery}, evidence_types = ${JSON.stringify(updates.evidenceTypes)}`;
  }
  if (updates.reminderDays !== undefined) {
    updateQuery = sql`${updateQuery}, reminder_days = ${updates.reminderDays}`;
  }
  if (updates.escalationDays !== undefined) {
    updateQuery = sql`${updateQuery}, escalation_days = ${updates.escalationDays}`;
  }

  updateQuery = sql`${updateQuery} WHERE meeting_type = ${meetingType}`;

  await db.execute(updateQuery);

  return { success: true };
}

/**
 * 指派具体的MO负责人
 */
export async function assignMeetingOwner(
  meetingType: string,
  userId: string,
  userName: string
): Promise<{ success: boolean }> {
  const db = await requireDb();
  const now = new Date().toISOString();

  await db.execute(sql`UPDATE meeting_owners
          SET assigned_owner_id = ${userId}, assigned_owner_name = ${userName}, updated_at = ${now}
          WHERE meeting_type = ${meetingType}`);

  return { success: true };
}

export default {
  initializeMeetingOwnerConfigs,
  getMeetingOwnerConfigs,
  updateMeetingOwnerConfig,
  assignMeetingOwner,
  DEFAULT_MO_CONFIGS
};
