/**
 * 会议任务闭环管理系统 - 数据库Schema定义
 * Meeting Task Loop Management System - Database Schema
 * 
 * 实现完整的会议→纪要→任务→执行→上报→归档闭环
 */

import { sql } from "drizzle-orm";

// ============================================================================
// 1. 会议纪要表 (Meeting Minutes V2)
// ============================================================================
export const MEETING_MINUTES_V2_SCHEMA = `
CREATE TABLE IF NOT EXISTS meeting_minutes_v2 (
  id VARCHAR(36) PRIMARY KEY,
  meeting_id VARCHAR(36) NOT NULL,
  
  -- 纪要内容
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  key_decisions JSON DEFAULT '[]',
  discussion_points JSON DEFAULT '[]',
  
  -- AI生成相关
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_model VARCHAR(100),
  ai_prompt_used TEXT,
  generation_timestamp TIMESTAMP,
  
  -- 编辑状态
  status ENUM('draft', 'pending_review', 'approved', 'archived') DEFAULT 'draft',
  edited_by VARCHAR(36),
  edited_at TIMESTAMP,
  approved_by VARCHAR(36),
  approved_at TIMESTAMP,
  
  -- 版本控制
  version INT DEFAULT 1,
  previous_version_id VARCHAR(36),
  
  -- 元数据
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (meeting_id) REFERENCES meeting_records(id) ON DELETE CASCADE,
  INDEX idx_meeting_minutes_meeting (meeting_id),
  INDEX idx_meeting_minutes_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// ============================================================================
// 2. 会议任务表 (Meeting Action Items)
// ============================================================================
export const MEETING_ACTION_ITEMS_SCHEMA = `
CREATE TABLE IF NOT EXISTS meeting_action_items (
  id VARCHAR(36) PRIMARY KEY,
  meeting_id VARCHAR(36) NOT NULL,
  minutes_id VARCHAR(36),
  
  -- 任务基本信息
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  
  -- 责任人信息
  owner_id VARCHAR(36) NOT NULL,
  owner_name VARCHAR(100) NOT NULL,
  supporter_ids JSON DEFAULT '[]',
  supporter_names JSON DEFAULT '[]',
  
  -- 时间信息
  due_date DATE NOT NULL,
  reminder_before_days INT DEFAULT 3,
  
  -- 状态追踪
  status ENUM('pending', 'assigned', 'accepted', 'in_progress', 'completed', 'overdue', 'cancelled') DEFAULT 'pending',
  progress_percent INT DEFAULT 0,
  
  -- 完成信息
  completed_at TIMESTAMP,
  completion_notes TEXT,
  evidence_urls JSON DEFAULT '[]',
  
  -- 关联信息
  source_agenda_item_id VARCHAR(100),
  related_project_id VARCHAR(36),
  planner_task_id VARCHAR(255),
  
  -- 元数据
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (meeting_id) REFERENCES meeting_records(id) ON DELETE CASCADE,
  INDEX idx_action_items_meeting (meeting_id),
  INDEX idx_action_items_owner (owner_id),
  INDEX idx_action_items_status (status),
  INDEX idx_action_items_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// ============================================================================
// 3. 任务分发记录表 (Task Assignments)
// ============================================================================
export const TASK_ASSIGNMENTS_SCHEMA = `
CREATE TABLE IF NOT EXISTS task_assignments (
  id VARCHAR(36) PRIMARY KEY,
  action_item_id VARCHAR(36) NOT NULL,
  
  -- 分发信息
  assignee_id VARCHAR(36) NOT NULL,
  assignee_name VARCHAR(100) NOT NULL,
  assignee_role ENUM('owner', 'supporter', 'observer') DEFAULT 'owner',
  
  -- 分发状态
  assignment_status ENUM('pending', 'sent', 'viewed', 'accepted', 'rejected') DEFAULT 'pending',
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  responded_at TIMESTAMP,
  
  -- 确认信息
  acceptance_notes TEXT,
  rejection_reason TEXT,
  
  -- 通知方式
  notification_channels JSON DEFAULT '["system"]',
  notification_sent BOOLEAN DEFAULT FALSE,
  
  -- 元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (action_item_id) REFERENCES meeting_action_items(id) ON DELETE CASCADE,
  INDEX idx_assignments_action_item (action_item_id),
  INDEX idx_assignments_assignee (assignee_id),
  INDEX idx_assignments_status (assignment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// ============================================================================
// 4. 个人任务清单表 (Personal Tasks)
// ============================================================================
export const PERSONAL_TASKS_SCHEMA = `
CREATE TABLE IF NOT EXISTS personal_tasks (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  
  -- 任务来源
  source_type ENUM('meeting', 'project', 'manual', 'system') DEFAULT 'manual',
  source_meeting_id VARCHAR(36),
  source_action_item_id VARCHAR(36),
  source_project_id VARCHAR(36),
  
  -- 任务信息
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  category VARCHAR(50),
  tags JSON DEFAULT '[]',
  
  -- 时间信息
  due_date DATE,
  start_date DATE,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  
  -- 状态追踪
  status ENUM('todo', 'in_progress', 'blocked', 'completed', 'cancelled') DEFAULT 'todo',
  progress_percent INT DEFAULT 0,
  
  -- 完成信息
  completed_at TIMESTAMP,
  completion_notes TEXT,
  evidence_urls JSON DEFAULT '[]',
  
  -- 上报状态
  report_status ENUM('not_required', 'pending', 'reported', 'confirmed') DEFAULT 'not_required',
  reported_to_meeting_id VARCHAR(36),
  reported_at TIMESTAMP,
  
  -- 元数据
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_personal_tasks_user (user_id),
  INDEX idx_personal_tasks_status (status),
  INDEX idx_personal_tasks_due_date (due_date),
  INDEX idx_personal_tasks_source (source_type, source_meeting_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// ============================================================================
// 5. 任务完成上报表 (Task Completion Reports)
// ============================================================================
export const TASK_COMPLETION_REPORTS_SCHEMA = `
CREATE TABLE IF NOT EXISTS task_completion_reports (
  id VARCHAR(36) PRIMARY KEY,
  
  -- 关联信息
  personal_task_id VARCHAR(36) NOT NULL,
  action_item_id VARCHAR(36),
  source_meeting_id VARCHAR(36),
  target_meeting_id VARCHAR(36),
  
  -- 上报人信息
  reporter_id VARCHAR(36) NOT NULL,
  reporter_name VARCHAR(100) NOT NULL,
  
  -- 上报内容
  report_title VARCHAR(255) NOT NULL,
  report_summary TEXT,
  completion_details TEXT,
  evidence_urls JSON DEFAULT '[]',
  attachments JSON DEFAULT '[]',
  
  -- 上报状态
  status ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'archived') DEFAULT 'draft',
  submitted_at TIMESTAMP,
  
  -- MO审核
  reviewed_by VARCHAR(36),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  
  -- 自动上传设置
  auto_upload_enabled BOOLEAN DEFAULT FALSE,
  auto_upload_triggered BOOLEAN DEFAULT FALSE,
  
  -- 元数据
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (personal_task_id) REFERENCES personal_tasks(id) ON DELETE CASCADE,
  INDEX idx_completion_reports_task (personal_task_id),
  INDEX idx_completion_reports_reporter (reporter_id),
  INDEX idx_completion_reports_status (status),
  INDEX idx_completion_reports_target_meeting (target_meeting_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// ============================================================================
// 6. Meeting Owner表 (Meeting Owners)
// ============================================================================
export const MEETING_OWNERS_SCHEMA = `
CREATE TABLE IF NOT EXISTS meeting_owners (
  id VARCHAR(36) PRIMARY KEY,
  
  -- MO基本信息
  user_id VARCHAR(36) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  
  -- 会议类型绑定
  meeting_type_id VARCHAR(100) NOT NULL,
  meeting_type_name VARCHAR(255) NOT NULL,
  
  -- 权限范围
  scope ENUM('company', 'department', 'project', 'team') DEFAULT 'department',
  scope_id VARCHAR(36),
  scope_name VARCHAR(255),
  
  -- MO职责
  responsibilities JSON DEFAULT '[]',
  
  -- 状态
  status ENUM('active', 'inactive', 'delegated') DEFAULT 'active',
  delegated_to VARCHAR(36),
  delegation_start DATE,
  delegation_end DATE,
  
  -- 通知设置
  notification_preferences JSON DEFAULT '{"email": true, "system": true, "webhook": false}',
  
  -- 元数据
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_meeting_owner (user_id, meeting_type_id, scope, scope_id),
  INDEX idx_meeting_owners_user (user_id),
  INDEX idx_meeting_owners_type (meeting_type_id),
  INDEX idx_meeting_owners_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// ============================================================================
// 7. 会议效果评估表 (Meeting Effectiveness)
// ============================================================================
export const MEETING_EFFECTIVENESS_SCHEMA = `
CREATE TABLE IF NOT EXISTS meeting_effectiveness (
  id VARCHAR(36) PRIMARY KEY,
  meeting_id VARCHAR(36) NOT NULL,
  
  -- 评估人信息
  evaluator_id VARCHAR(36) NOT NULL,
  evaluator_name VARCHAR(100) NOT NULL,
  evaluator_role ENUM('organizer', 'participant', 'observer') DEFAULT 'participant',
  
  -- 效率指标 (1-5分)
  punctuality_score INT CHECK (punctuality_score BETWEEN 1 AND 5),
  agenda_completion_score INT CHECK (agenda_completion_score BETWEEN 1 AND 5),
  decision_quality_score INT CHECK (decision_quality_score BETWEEN 1 AND 5),
  participation_score INT CHECK (participation_score BETWEEN 1 AND 5),
  time_efficiency_score INT CHECK (time_efficiency_score BETWEEN 1 AND 5),
  
  -- 定性评估
  overall_rating ENUM('poor', 'fair', 'good', 'excellent') DEFAULT 'good',
  strengths TEXT,
  improvements TEXT,
  suggestions TEXT,
  
  -- 统计数据
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP,
  planned_duration_minutes INT,
  actual_duration_minutes INT,
  agenda_items_completed INT,
  agenda_items_total INT,
  decisions_made INT,
  action_items_created INT,
  
  -- 元数据
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (meeting_id) REFERENCES meeting_records(id) ON DELETE CASCADE,
  UNIQUE KEY uk_meeting_evaluator (meeting_id, evaluator_id),
  INDEX idx_effectiveness_meeting (meeting_id),
  INDEX idx_effectiveness_evaluator (evaluator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// ============================================================================
// 8. 自定义会议模板表 (Custom Meeting Templates)
// ============================================================================
export const CUSTOM_MEETING_TEMPLATES_SCHEMA = `
CREATE TABLE IF NOT EXISTS custom_meeting_templates (
  id VARCHAR(36) PRIMARY KEY,
  
  -- 模板基本信息
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  description TEXT,
  category ENUM('internal', 'customer', 'custom') DEFAULT 'custom',
  subcategory VARCHAR(100),
  
  -- 创建者信息
  created_by VARCHAR(36) NOT NULL,
  created_by_name VARCHAR(100),
  
  -- 共享设置
  visibility ENUM('private', 'team', 'department', 'company') DEFAULT 'private',
  shared_with JSON DEFAULT '[]',
  
  -- 模板配置
  icon VARCHAR(50) DEFAULT 'FileText',
  color VARCHAR(20) DEFAULT '#3B82F6',
  default_duration INT DEFAULT 60,
  
  -- 议程配置
  agenda JSON DEFAULT '[]',
  
  -- 参会人员配置
  participants JSON DEFAULT '{"required": [], "optional": []}',
  
  -- 输出文档配置
  outputs JSON DEFAULT '[]',
  
  -- 最佳实践
  best_practices JSON DEFAULT '[]',
  follow_up_actions JSON DEFAULT '[]',
  
  -- AI提示词配置
  ai_prompts JSON DEFAULT '{}',
  
  -- 使用统计
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMP,
  
  -- 状态
  status ENUM('active', 'archived', 'draft') DEFAULT 'active',
  
  -- 基于的系统模板
  based_on_template_id VARCHAR(100),
  
  -- 元数据
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_custom_templates_creator (created_by),
  INDEX idx_custom_templates_category (category),
  INDEX idx_custom_templates_visibility (visibility),
  INDEX idx_custom_templates_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// ============================================================================
// 9. 任务提醒表 (Task Reminders)
// ============================================================================
export const TASK_REMINDERS_SCHEMA = `
CREATE TABLE IF NOT EXISTS task_reminders (
  id VARCHAR(36) PRIMARY KEY,
  
  -- 关联信息
  task_type ENUM('action_item', 'personal_task', 'completion_report') NOT NULL,
  task_id VARCHAR(36) NOT NULL,
  
  -- 提醒对象
  recipient_id VARCHAR(36) NOT NULL,
  recipient_name VARCHAR(100) NOT NULL,
  
  -- 提醒设置
  reminder_type ENUM('due_date', 'overdue', 'status_update', 'mo_review', 'custom') DEFAULT 'due_date',
  scheduled_at TIMESTAMP NOT NULL,
  
  -- 提醒内容
  title VARCHAR(255) NOT NULL,
  message TEXT,
  
  -- 发送状态
  status ENUM('scheduled', 'sent', 'failed', 'cancelled') DEFAULT 'scheduled',
  sent_at TIMESTAMP,
  error_message TEXT,
  
  -- 通知渠道
  channels JSON DEFAULT '["system"]',
  
  -- 元数据
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_task_reminders_task (task_type, task_id),
  INDEX idx_task_reminders_recipient (recipient_id),
  INDEX idx_task_reminders_scheduled (scheduled_at),
  INDEX idx_task_reminders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// ============================================================================
// 导出所有Schema
// ============================================================================
export const ALL_MEETING_TASK_LOOP_SCHEMAS = [
  MEETING_MINUTES_V2_SCHEMA,
  MEETING_ACTION_ITEMS_SCHEMA,
  TASK_ASSIGNMENTS_SCHEMA,
  PERSONAL_TASKS_SCHEMA,
  TASK_COMPLETION_REPORTS_SCHEMA,
  MEETING_OWNERS_SCHEMA,
  MEETING_EFFECTIVENESS_SCHEMA,
  CUSTOM_MEETING_TEMPLATES_SCHEMA,
  TASK_REMINDERS_SCHEMA,
];

// ============================================================================
// 默认Meeting Owner职责定义
// ============================================================================
export const DEFAULT_MO_RESPONSIBILITIES = {
  weekly_meeting: [
    '确保会议按时开始和结束',
    '审核会议纪要并确认发布',
    '跟踪上周任务完成情况',
    '协调本周工作安排',
    '收集并汇总完成证据',
  ],
  monthly_analysis: [
    '准备月度经营数据',
    '组织数据分析讨论',
    '审核月度报告',
    '跟踪月度目标达成',
    '汇总各部门完成情况',
  ],
  annual_planning: [
    '制定年度规划议程',
    '协调各部门年度计划',
    '审核年度目标设定',
    '跟踪年度计划执行',
    '组织年度总结评审',
  ],
  customer_meeting: [
    '准备客户会议资料',
    '记录客户需求和反馈',
    '跟踪客户问题解决',
    '协调内部资源支持',
    '维护客户关系档案',
  ],
};

// ============================================================================
// 默认会议类型与MO绑定
// ============================================================================
export const DEFAULT_MEETING_TYPE_MO_MAPPING = [
  { typeId: 'production_weekly', typeName: '生产周会', defaultScope: 'department' },
  { typeId: 'monthly_analysis', typeName: '月度经营分析会', defaultScope: 'company' },
  { typeId: 'monthly_planning', typeName: '月度计划会议', defaultScope: 'department' },
  { typeId: 'annual_planning', typeName: '年度规划会议', defaultScope: 'company' },
  { typeId: 'annual_summary', typeName: '年度总结会议', defaultScope: 'company' },
  { typeId: 'employee_interview', typeName: '员工访谈', defaultScope: 'team' },
  { typeId: 'performance_dialog', typeName: '员工绩效对话', defaultScope: 'team' },
  { typeId: 'customer_first_contact', typeName: '客户首次沟通', defaultScope: 'project' },
  { typeId: 'customer_drawing_review', typeName: '客户图纸评审会', defaultScope: 'project' },
  { typeId: 'customer_pre_acceptance', typeName: '客户预验收会议', defaultScope: 'project' },
  { typeId: 'customer_final_acceptance', typeName: '客户终验收会议', defaultScope: 'project' },
];
