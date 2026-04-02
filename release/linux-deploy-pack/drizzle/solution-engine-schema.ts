/**
 * Solution Engine Schema — 清洗工艺效能与方案推演引擎
 *
 * P1: Customer Technical Requirements (客户技术需求解析)
 * P2: AI Solution Proposals (AI 工艺方案推演)
 *
 * 支持: 颗粒物限制、节拍时间、历史项目检索、竞品分析、预算预估
 */
import { pgTable, serial, varchar, text, timestamp, integer, json, decimal, index, pgEnum } from 'drizzle-orm/pg-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { aiTasks } from './schema';

// ══════════════════════════════════════════════════════════════
// P1: Customer Technical Requirements — 客户技术需求结构化存储
// ══════════════════════════════════════════════════════════════

export const requirementStatusEnum = pgEnum('requirement_status', [
  'DRAFT',           // 草稿
  'PENDING_REVIEW',  // 待评审
  'APPROVED',        // 已批准
  'PROPOSAL_READY',  // 方案已生成
  'REJECTED',        // 已驳回
]);

export const cleaningTypeEnum = pgEnum('cleaning_type', [
  'ULTRASONIC',      // 超声波清洗
  'SPRAY',           // 喷淋清洗
  'IMMERSION',       // 浸泡清洗
  'VACUUM_DRY',      // 真空干燥
  'HOT_AIR_DRY',     // 热风干燥
  'COMBINATION',     // 组合工艺
]);

/**
 * 客户技术需求表
 * 存储 P1 阶段解析后的结构化数据
 */
export const customerTechnicalRequirements = pgTable('customer_technical_requirements', {
  id: serial('id').primaryKey(),

  // ─── 项目关联 ─────────────────────────────────────────────
  projectId: integer('project_id'),
  projectNo: varchar('project_no', { length: 50 }),
  customerId: integer('customer_id'),
  customerName: varchar('customer_name', { length: 200 }),

  // ─── 清洗对象信息 ─────────────────────────────────────────
  workpieceName: varchar('workpiece_name', { length: 200 }).notNull(),
  workpieceNameEn: varchar('workpiece_name_en', { length: 200 }),
  workpieceMaterial: varchar('workpiece_material', { length: 100 }), // 铝合金、钢、铸铁等
  workpieceDimensions: json('workpiece_dimensions').$type<{
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    unit?: string;
  }>(),

  // ─── 清洁度要求 (核心技术参数) ─────────────────────────────
  particleLimit: json('particle_limit').$type<{
    maxParticleSize?: number;    // 最大颗粒物尺寸 (μm)
    maxParticleCount?: number;   // 最大颗粒物数量
    gravimetricLimit?: number;   // 重量法限值 (mg)
    standard?: string;           // VDA 19.1, ISO 16232 等
  }>(),
  surfaceTensionLimit: decimal('surface_tension_limit', { precision: 8, scale: 2 }), // 表面张力 (mN/m)
  residualOilLimit: decimal('residual_oil_limit', { precision: 8, scale: 4 }),       // 残油量 (mg/cm²)

  // ─── 产能与节拍要求 ─────────────────────────────────────────
  cycleTime: integer('cycle_time'),              // 节拍时间 (秒/件)
  dailyCapacity: integer('daily_capacity'),       // 日产能 (件/天)
  annualCapacity: integer('annual_capacity'),     // 年产能 (件/年)
  shiftMode: varchar('shift_mode', { length: 20 }), // 单班/双班/三班

  // ─── 工艺偏好 ─────────────────────────────────────────────
  preferredCleaningType: cleaningTypeEnum('preferred_cleaning_type'),
  chemicalRestrictions: text('chemical_restrictions'),    // 化学品限制
  temperatureRange: json('temperature_range').$type<{
    min?: number;
    max?: number;
    unit?: string;
  }>(),

  // ─── 现场环境条件 ─────────────────────────────────────────
  siteConditions: json('site_conditions').$type<{
    availableSpace?: { length?: number; width?: number; height?: number };
    powerSupply?: string;         // 380V/50Hz 等
    waterQuality?: string;        // 市政水/纯水/去离子水
    compressedAir?: boolean;
    exhaustSystem?: boolean;
  }>(),

  // ─── 特殊要求 ─────────────────────────────────────────────
  specialRequirements: text('special_requirements'),
  industryStandards: json('industry_standards').$type<string[]>(), // VDA 19.1, ISO 16232 等

  // ─── 来源与状态 ─────────────────────────────────────────────
  sourceDocument: varchar('source_document', { length: 300 }), // 原始文档名
  aiTaskId: integer('ai_task_id').references(() => aiTasks.id), // 如果是 AI 解析生成的
  status: requirementStatusEnum('status').default('DRAFT').notNull(),

  // ─── 审计字段 ─────────────────────────────────────────────
  createdBy: varchar('created_by', { length: 50 }),
  reviewedBy: varchar('reviewed_by', { length: 50 }),
  reviewedAt: timestamp('reviewed_at', { mode: 'string' }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('ctr_project_idx').on(table.projectId),
  index('ctr_customer_idx').on(table.customerId),
  index('ctr_status_idx').on(table.status),
  index('ctr_workpiece_idx').on(table.workpieceName),
]);

export type CustomerTechnicalRequirement = InferSelectModel<typeof customerTechnicalRequirements>;
export type InsertCustomerTechnicalRequirement = InferInsertModel<typeof customerTechnicalRequirements>;

// ══════════════════════════════════════════════════════════════
// P2: AI Solution Proposals — AI 工艺方案推演结果
// ══════════════════════════════════════════════════════════════

export const proposalStatusEnum = pgEnum('proposal_status', [
  'GENERATING',      // AI 生成中
  'DRAFT',           // 草稿
  'PENDING_REVIEW',  // 待评审
  'APPROVED',        // 已批准
  'PUSHED_TO_M3',    // 已推入 M3
  'REJECTED',        // 已驳回
]);

/**
 * AI 工艺方案推演表
 * 存储 Claude 生成的完整工艺方案
 */
export const aiSolutionProposals = pgTable('ai_solution_proposals', {
  id: serial('id').primaryKey(),

  // ─── 关联需求 ─────────────────────────────────────────────
  requirementId: integer('requirement_id')
    .references(() => customerTechnicalRequirements.id, { onDelete: 'cascade' })
    .notNull(),

  // ─── 版本迭代链 ─────────────────────────────────────────────
  version: integer('version').default(1).notNull(),
  parentProposalId: integer('parent_proposal_id'), // self-ref: 指向上一版方案 ID
  iterationReason: text('iteration_reason'),        // 迭代原因 (客户反馈/评审意见/参数变更)

  // ─── AI 任务关联 ─────────────────────────────────────────────
  aiTaskId: integer('ai_task_id').references(() => aiTasks.id),

  // ─── 历史项目对标 ─────────────────────────────────────────────
  benchmarkProjectIds: json('benchmark_project_ids').$type<number[]>(), // 关联的历史项目 ID 数组
  benchmarkProjects: json('benchmark_projects').$type<Array<{
    projectId: number;
    projectNo: string;
    customerName: string;
    workpiece: string;
    similarity: number;       // 相似度 0-100
    deliveryYear: number;
    equipmentModel: string;
    highlights: string[];     // 亮点
  }>>(),

  // ─── 主工艺流程推荐 ─────────────────────────────────────────
  processFlow: json('process_flow').$type<{
    stages: Array<{
      stageNo: number;
      stageName: string;
      stageNameEn: string;
      processType: string;      // ULTRASONIC, SPRAY, DRY 等
      duration: number;         // 秒
      temperature?: number;     // 温度
      parameters?: Record<string, unknown>;
      description: string;
    }>;
    totalCycleTime: number;     // 总节拍 (秒)
    layoutType: string;         // 线性/U型/圆盘
    automationLevel: string;    // 全自动/半自动/手动
  }>(),

  // ─── 设备配置建议 ─────────────────────────────────────────────
  equipmentConfig: json('equipment_config').$type<{
    mainEquipment: Array<{
      name: string;
      model: string;
      quantity: number;
      specs: Record<string, unknown>;
    }>;
    auxiliaryEquipment: Array<{
      name: string;
      model: string;
      quantity: number;
    }>;
    chemicals: Array<{
      name: string;
      type: string;
      consumption: string;
    }>;
  }>(),

  // ─── 竞品分析 SWOT ─────────────────────────────────────────────
  competitorAnalysis: json('competitor_analysis').$type<{
    competitors: Array<{
      name: string;
      country: string;
      strengths: string[];
      weaknesses: string[];
    }>;
    ourAdvantages: string[];
    ourChallenges: string[];
    winStrategy: string;
  }>(),

  // ─── 预算预估 ─────────────────────────────────────────────────
  budgetEstimate: json('budget_estimate').$type<{
    equipmentCost: { min: number; max: number; currency: string };
    installationCost: { min: number; max: number; currency: string };
    chemicalsCostPerYear: { min: number; max: number; currency: string };
    maintenanceCostPerYear: { min: number; max: number; currency: string };
    totalProjectCost: { min: number; max: number; currency: string };
    paybackPeriodMonths: number;
    confidence: number; // 置信度 0-100
  }>(),

  // ─── AI 生成元数据 ─────────────────────────────────────────────
  aiModel: varchar('ai_model', { length: 50 }),
  generationPrompt: text('generation_prompt'),
  generationTokens: integer('generation_tokens'),
  generationTimeMs: integer('generation_time_ms'),

  // ─── 状态与审批 ─────────────────────────────────────────────
  status: proposalStatusEnum('status').default('GENERATING').notNull(),
  approvedBy: varchar('approved_by', { length: 50 }),
  approvedAt: timestamp('approved_at', { mode: 'string' }),
  pushedToM3At: timestamp('pushed_to_m3_at', { mode: 'string' }),
  m3PhaseId: integer('m3_phase_id'), // 关联的 M3 阶段 ID

  // ─── 审计字段 ─────────────────────────────────────────────
  createdBy: varchar('created_by', { length: 50 }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('asp_requirement_idx').on(table.requirementId),
  index('asp_status_idx').on(table.status),
  index('asp_ai_task_idx').on(table.aiTaskId),
  index('asp_parent_idx').on(table.parentProposalId),
  index('asp_version_idx').on(table.requirementId, table.version),
]);

export type AiSolutionProposal = InferSelectModel<typeof aiSolutionProposals>;
export type InsertAiSolutionProposal = InferInsertModel<typeof aiSolutionProposals>;

// ══════════════════════════════════════════════════════════════
// 辅助类型: JSON 字段类型导出
// ══════════════════════════════════════════════════════════════

export type ParticleLimit = NonNullable<CustomerTechnicalRequirement['particleLimit']>;
export type ProcessFlow = NonNullable<AiSolutionProposal['processFlow']>;
export type BenchmarkProject = NonNullable<AiSolutionProposal['benchmarkProjects']>[number];
export type CompetitorAnalysis = NonNullable<AiSolutionProposal['competitorAnalysis']>;
export type BudgetEstimate = NonNullable<AiSolutionProposal['budgetEstimate']>;
