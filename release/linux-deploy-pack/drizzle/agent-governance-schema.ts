/**
 * GRT 5.0 Agent治理扩展Schema
 *
 * 扩展agent_registry为完整的"数字员工HR管理"
 * - 版本管理
 * - 权限边界
 * - 知识源范围
 * - 沙盘/生产状态
 * - 人工确认节点
 * - 回滚策略
 * - 审计日志
 */

import { pgTable, serial, integer, varchar, text, timestamp, decimal, boolean, index, unique } from 'drizzle-orm/pg-core';
import { users } from './schema';

// Agent治理主表 (扩展agent_registry)
export const agentGovernance = pgTable('agent_governance', {
  id: serial().primaryKey(),
  agentCode: varchar({ length: 50 }).notNull(),
  agentName: varchar({ length: 200 }).notNull(),
  agentCategory: varchar({ length: 50 }).notNull(), // business/hr/finance/project/quotation/compliance/training/meeting/customer_portal/audit

  // 业务定义
  businessObjective: text().notNull(), // 业务目标
  inputSchema: text(), // JSON: 输入参数定义
  outputSchema: text(), // JSON: 输出参数定义
  prerequisites: text(), // JSON: 前提条件列表
  executionSteps: text(), // JSON: 执行步骤列表

  // 风险与权限
  riskLevel: varchar({ length: 20 }).default('medium'), // low/medium/high/critical
  impactScope: text(), // JSON: 影响范围 ["project","finance","hr"]
  permissionBoundary: text(), // JSON: 权限边界定义
  humanReviewRequired: boolean().default(true), // 是否需要人工确认
  humanReviewSteps: text(), // JSON: 哪些步骤需要人工确认

  // 知识源
  knowledgeSources: text(), // JSON: ["sop_library","project_history","material_specs"]
  aiProvider: varchar({ length: 50 }).default('claude'), // claude/openai/deepseek/ollama
  aiModel: varchar({ length: 100 }),
  systemPrompt: text(),
  temperature: decimal({ precision: 3, scale: 2 }).default('0.3'),

  // 版本管理
  version: integer().default(1),
  previousVersionId: integer(), // self-reference for version chain
  changeLog: text(), // JSON: [{version, date, changes, changedBy}]

  // 生命周期
  environment: varchar({ length: 20 }).default('sandbox'), // sandbox/staging/production
  status: varchar({ length: 20 }).default('draft'), // draft/active/paused/disabled/retired
  activatedAt: timestamp({ mode: 'string' }),
  activatedBy: integer().references(() => users.id),
  pausedAt: timestamp({ mode: 'string' }),
  pausedReason: text(),
  retiredAt: timestamp({ mode: 'string' }),

  // 回滚策略
  rollbackStrategy: varchar({ length: 50 }).default('manual'), // manual/auto_on_error/auto_on_threshold
  rollbackThreshold: decimal({ precision: 5, scale: 2 }), // error rate % to trigger auto-rollback
  rollbackTargetVersionId: integer(), // which version to rollback to

  // 执行统计
  totalExecutions: integer().default(0),
  successfulExecutions: integer().default(0),
  failedExecutions: integer().default(0),
  averageExecutionTimeMs: integer().default(0),
  totalTokensConsumed: integer().default(0),
  lastExecutedAt: timestamp({ mode: 'string' }),

  // 审计
  createdBy: integer().references(() => users.id),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedBy: integer().references(() => users.id),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique('agent_governance_uk_code_version').on(table.agentCode, table.version),
  index('agent_governance_idx_category').on(table.agentCategory),
  index('agent_governance_idx_status').on(table.status),
  index('agent_governance_idx_environment').on(table.environment),
  index('agent_governance_idx_risk').on(table.riskLevel),
]);

// Agent执行审计日志
export const agentExecutionLogs = pgTable('agent_execution_logs', {
  id: serial().primaryKey(),
  agentGovernanceId: integer().notNull(),
  agentCode: varchar({ length: 50 }).notNull(),
  version: integer().notNull(),

  // 执行上下文
  executionId: varchar({ length: 50 }).notNull(), // unique execution ID
  triggeredBy: varchar({ length: 50 }).notNull(), // user/schedule/event/agent
  triggerUserId: integer().references(() => users.id),
  triggerContext: text(), // JSON: what triggered this execution

  // 输入/输出
  inputData: text(), // JSON: actual input (sanitized)
  outputData: text(), // JSON: actual output

  // 执行结果
  status: varchar({ length: 20 }).notNull(), // started/running/completed/failed/timeout/cancelled/rolled_back
  errorMessage: text(),
  executionTimeMs: integer(),
  tokensUsed: integer().default(0),

  // 人工审核
  requiresHumanReview: boolean().default(false),
  humanReviewStatus: varchar({ length: 20 }), // pending/approved/rejected/modified
  humanReviewerId: integer().references(() => users.id),
  humanReviewedAt: timestamp({ mode: 'string' }),
  humanReviewNotes: text(),

  // 影响追踪
  affectedEntities: text(), // JSON: [{type:"project", id:123, action:"updated"}]
  rollbackPerformed: boolean().default(false),
  rollbackAt: timestamp({ mode: 'string' }),

  // 人工基线对比 (Agent结果 vs 人工结果)
  referenceManualResultId: integer(), // link to a manual execution for comparison
  referenceManualResult: text(), // JSON: the manual/human result for the same task
  comparisonScore: decimal({ precision: 5, scale: 2 }), // similarity/quality score 0-100
  comparisonNotes: text(), // analyst notes on divergence

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('agent_exec_logs_idx_agent').on(table.agentGovernanceId),
  index('agent_exec_logs_idx_code').on(table.agentCode),
  index('agent_exec_logs_idx_execution').on(table.executionId),
  index('agent_exec_logs_idx_status').on(table.status),
  index('agent_exec_logs_idx_created').on(table.createdAt),
]);

// Agent知识源关联
export const agentKnowledgeLinks = pgTable('agent_knowledge_links', {
  id: serial().primaryKey(),
  agentGovernanceId: integer().notNull(),
  knowledgeSourceType: varchar({ length: 50 }).notNull(), // sop_library/project_history/material_specs/customer_cases/fmea/training_material/policy_document
  knowledgeSourceId: varchar({ length: 100 }), // specific resource ID if applicable
  knowledgeSourceName: varchar({ length: 200 }).notNull(),
  accessLevel: varchar({ length: 20 }).default('read'), // read/write/execute
  isRequired: boolean().default(true), // agent cannot execute without this source
  lastSyncAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('agent_knowledge_idx_agent').on(table.agentGovernanceId),
  index('agent_knowledge_idx_type').on(table.knowledgeSourceType),
]);
