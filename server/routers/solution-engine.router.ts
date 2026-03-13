/**
 * Solution Engine Router — 清洗工艺效能与方案推演引擎
 *
 * P1: 技术需求解析与管理
 * P2: AI 方案推演 (异步队列驱动)
 *
 * 遵循开发第一定律: 异步队列、防闪退
 */
import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { aiTasks } from "../../drizzle/schema";
import {
  customerTechnicalRequirements,
  aiSolutionProposals,
} from "../../drizzle/solution-engine-schema";
import { eq, desc, sql, and, SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import { triggerSolutionGenerationWorker } from "../workers/solutionEngineWorker";

const log = createChildLogger("solution-engine");

// ─── ensureTables ────────────────────────────────────────────
let tablesEnsured = false;

async function ensureTables() {
  if (tablesEnsured) return;
  try {
    const db = await requireDb();

    // Create enums if not exist
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE requirement_status AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PROPOSAL_READY', 'REJECTED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE cleaning_type AS ENUM ('ULTRASONIC', 'SPRAY', 'IMMERSION', 'VACUUM_DRY', 'HOT_AIR_DRY', 'COMBINATION', 'OTHER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    // Idempotent: add 'OTHER' to existing cleaning_type enum
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TYPE cleaning_type ADD VALUE IF NOT EXISTS 'OTHER';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE proposal_status AS ENUM ('GENERATING', 'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUSHED_TO_M3', 'REJECTED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // Create customer_technical_requirements table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customer_technical_requirements (
        id SERIAL PRIMARY KEY,
        project_id INTEGER,
        project_no VARCHAR(50),
        customer_id INTEGER,
        customer_name VARCHAR(200),
        workpiece_name VARCHAR(200) NOT NULL,
        workpiece_name_en VARCHAR(200),
        workpiece_material VARCHAR(100),
        workpiece_dimensions JSONB,
        particle_limit JSONB,
        surface_tension_limit DECIMAL(8,2),
        residual_oil_limit DECIMAL(8,4),
        cycle_time INTEGER,
        daily_capacity INTEGER,
        annual_capacity INTEGER,
        shift_mode VARCHAR(20),
        preferred_cleaning_type cleaning_type,
        chemical_restrictions TEXT,
        temperature_range JSONB,
        site_conditions JSONB,
        special_requirements TEXT,
        industry_standards JSONB,
        source_document VARCHAR(300),
        ai_task_id INTEGER REFERENCES ai_tasks(id),
        status requirement_status NOT NULL DEFAULT 'DRAFT',
        created_by VARCHAR(50),
        reviewed_by VARCHAR(50),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create ai_solution_proposals table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_solution_proposals (
        id SERIAL PRIMARY KEY,
        requirement_id INTEGER REFERENCES customer_technical_requirements(id) ON DELETE CASCADE NOT NULL,
        ai_task_id INTEGER REFERENCES ai_tasks(id),
        benchmark_project_ids JSONB,
        benchmark_projects JSONB,
        process_flow JSONB,
        equipment_config JSONB,
        competitor_analysis JSONB,
        budget_estimate JSONB,
        ai_model VARCHAR(50),
        generation_prompt TEXT,
        generation_tokens INTEGER,
        generation_time_ms INTEGER,
        status proposal_status NOT NULL DEFAULT 'GENERATING',
        approved_by VARCHAR(50),
        approved_at TIMESTAMP,
        pushed_to_m3_at TIMESTAMP,
        m3_phase_id INTEGER,
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create historical benchmark projects table (for manual entry)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS historical_benchmark_projects (
        id SERIAL PRIMARY KEY,
        project_no VARCHAR(50) NOT NULL,
        customer_name VARCHAR(200) NOT NULL,
        workpiece VARCHAR(200) NOT NULL,
        workpiece_material VARCHAR(100),
        cleaning_type VARCHAR(50),
        delivery_year INTEGER,
        equipment_model VARCHAR(100),
        cycle_time INTEGER,
        particle_standard VARCHAR(100),
        highlights TEXT[],
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Idempotent: add particle_size_limit + particle_count_limit columns
    await db.execute(sql`ALTER TABLE historical_benchmark_projects ADD COLUMN IF NOT EXISTS particle_size_limit NUMERIC`);
    await db.execute(sql`ALTER TABLE historical_benchmark_projects ADD COLUMN IF NOT EXISTS particle_count_limit INTEGER`);

    // Idempotent: add version iteration chain columns to ai_solution_proposals
    await db.execute(sql`ALTER TABLE ai_solution_proposals ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1`);
    await db.execute(sql`ALTER TABLE ai_solution_proposals ADD COLUMN IF NOT EXISTS parent_proposal_id INTEGER`);
    await db.execute(sql`ALTER TABLE ai_solution_proposals ADD COLUMN IF NOT EXISTS iteration_reason TEXT`);

    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ctr_project_idx ON customer_technical_requirements (project_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ctr_status_idx ON customer_technical_requirements (status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS asp_requirement_idx ON ai_solution_proposals (requirement_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS asp_status_idx ON ai_solution_proposals (status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS hbp_workpiece_idx ON historical_benchmark_projects (workpiece)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS hbp_active_idx ON historical_benchmark_projects (is_active)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS asp_parent_idx ON ai_solution_proposals (parent_proposal_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS asp_version_idx ON ai_solution_proposals (requirement_id, version)`);

    tablesEnsured = true;
    log.info("[SolutionEngine] Tables ensured");
  } catch (err) {
    log.warn({ err }, "[SolutionEngine] ensureTables failed");
  }
}

// ─── Router ──────────────────────────────────────────────────
export const solutionEngineRouter = router({
  // ══════════════════════════════════════════════════════════════
  // P1: 技术需求管理
  // ══════════════════════════════════════════════════════════════

  /** 创建技术需求 */
  createRequirement: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      projectNo: z.string().max(50).optional(),
      customerId: z.number().optional(),
      customerName: z.string().max(200).optional(),
      workpieceName: z.string().min(1).max(200),
      workpieceNameEn: z.string().max(200).optional(),
      workpieceMaterial: z.string().max(100).optional(),
      workpieceDimensions: z.object({
        length: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        weight: z.number().optional(),
        unit: z.string().optional(),
      }).optional(),
      particleLimit: z.object({
        maxParticleSize: z.number().optional(),
        maxParticleCount: z.number().optional(),
        gravimetricLimit: z.number().optional(),
        standard: z.string().optional(),
      }).optional(),
      surfaceTensionLimit: z.string().optional(),
      residualOilLimit: z.string().optional(),
      cycleTime: z.number().optional(),
      dailyCapacity: z.number().optional(),
      annualCapacity: z.number().optional(),
      shiftMode: z.string().max(20).optional(),
      preferredCleaningType: z.enum(['ULTRASONIC', 'SPRAY', 'IMMERSION', 'VACUUM_DRY', 'HOT_AIR_DRY', 'COMBINATION']).optional(),
      chemicalRestrictions: z.string().optional(),
      temperatureRange: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        unit: z.string().optional(),
      }).optional(),
      siteConditions: z.object({
        availableSpace: z.object({
          length: z.number().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
        }).optional(),
        powerSupply: z.string().optional(),
        waterQuality: z.string().optional(),
        compressedAir: z.boolean().optional(),
        exhaustSystem: z.boolean().optional(),
      }).optional(),
      specialRequirements: z.string().optional(),
      industryStandards: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      const [requirement] = await db.insert(customerTechnicalRequirements).values({
        projectId: input.projectId ?? null,
        projectNo: input.projectNo ?? null,
        customerId: input.customerId ?? null,
        customerName: input.customerName ?? null,
        workpieceName: input.workpieceName,
        workpieceNameEn: input.workpieceNameEn ?? null,
        workpieceMaterial: input.workpieceMaterial ?? null,
        workpieceDimensions: input.workpieceDimensions ?? null,
        particleLimit: input.particleLimit ?? null,
        surfaceTensionLimit: input.surfaceTensionLimit ?? null,
        residualOilLimit: input.residualOilLimit ?? null,
        cycleTime: input.cycleTime ?? null,
        dailyCapacity: input.dailyCapacity ?? null,
        annualCapacity: input.annualCapacity ?? null,
        shiftMode: input.shiftMode ?? null,
        preferredCleaningType: input.preferredCleaningType ?? null,
        chemicalRestrictions: input.chemicalRestrictions ?? null,
        temperatureRange: input.temperatureRange ?? null,
        siteConditions: input.siteConditions ?? null,
        specialRequirements: input.specialRequirements ?? null,
        industryStandards: input.industryStandards ?? null,
        status: 'DRAFT',
        createdBy: userId,
      }).returning();

      log.info({ requirementId: requirement.id }, "[SolutionEngine] Requirement created");
      return { success: true, requirementId: requirement.id };
    }),

  /** 获取技术需求详情 */
  getRequirement: protectedProcedure
    .input(z.object({ requirementId: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const [requirement] = await db.select().from(customerTechnicalRequirements)
        .where(eq(customerTechnicalRequirements.id, input.requirementId))
        .limit(1);

      if (!requirement) {
        throw new Error("Requirement not found");
      }
      return requirement;
    }),

  /** 列出技术需求 */
  listRequirements: protectedProcedure
    .input(z.object({
      status: z.enum(['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PROPOSAL_READY', 'REJECTED']).optional(),
      customerId: z.number().optional(),
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const conditions: SQL[] = [];
      if (input?.status) conditions.push(sql`status = ${input.status}`);
      if (input?.customerId) conditions.push(sql`customer_id = ${input.customerId}`);

      const whereClause = conditions.length > 0
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``;

      const result = await db.execute(sql`
        SELECT id, project_no, customer_name, workpiece_name, workpiece_material,
               particle_limit, cycle_time, status, created_by, created_at
        FROM customer_technical_requirements
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${input?.limit ?? 20}
      `);

      return result.rows;
    }),

  // ══════════════════════════════════════════════════════════════
  // P2: AI 方案推演 (异步队列驱动)
  // ══════════════════════════════════════════════════════════════

  /**
   * 触发 AI 方案生成 (Fire and Forget)
   * 返回 taskId 供前端轮询
   */
  generateProposal: requirePermission('rnd:solutions:manage')
    .input(z.object({
      requirementId: z.number(),
      includeCompetitorAnalysis: z.boolean().default(true),
      includeBudgetEstimate: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      // 1. 验证需求存在
      const [requirement] = await db.select().from(customerTechnicalRequirements)
        .where(eq(customerTechnicalRequirements.id, input.requirementId))
        .limit(1);

      if (!requirement) {
        throw new Error("Requirement not found");
      }

      // 2. 创建 AI 任务
      const [newTask] = await db.insert(aiTasks).values({
        taskType: 'SOLUTION_PROPOSAL_GENERATION',
        status: 'pending',
        inputData: {
          requirementId: input.requirementId,
          workpieceName: requirement.workpieceName,
          includeCompetitorAnalysis: input.includeCompetitorAnalysis,
          includeBudgetEstimate: input.includeBudgetEstimate,
        } as Record<string, unknown>,
        createdBy: userId,
      }).returning();

      // 3. 创建方案记录 (初始状态 GENERATING)
      const [proposal] = await db.insert(aiSolutionProposals).values({
        requirementId: input.requirementId,
        aiTaskId: newTask.id,
        status: 'GENERATING',
        createdBy: userId,
      }).returning();

      log.info({
        taskId: newTask.id,
        proposalId: proposal.id,
        requirementId: input.requirementId,
      }, "[SolutionEngine] Proposal generation started");

      // 4. 触发后台 Worker (异步, 不等待)
      triggerSolutionGenerationWorker(
        newTask.id,
        proposal.id,
        input.requirementId,
        {
          includeCompetitorAnalysis: input.includeCompetitorAnalysis,
          includeBudgetEstimate: input.includeBudgetEstimate,
        }
      ).catch(err => {
        log.error({ err, taskId: newTask.id }, "[SolutionEngine] Worker trigger failed");
      });

      return {
        success: true,
        taskId: newTask.id,
        proposalId: proposal.id,
        message: "方案生成已启动，请轮询 getProposalStatus 获取进度",
      };
    }),

  /**
   * 轮询方案生成状态
   * 前端使用 refetchInterval 进行轮询
   */
  getProposalStatus: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const [task] = await db.select().from(aiTasks)
        .where(eq(aiTasks.id, input.taskId))
        .limit(1);

      if (!task) {
        return { status: 'not_found', taskId: input.taskId };
      }

      // 如果完成，获取方案详情
      let proposal = null;
      if (task.status === 'completed') {
        const [p] = await db.select().from(aiSolutionProposals)
          .where(eq(aiSolutionProposals.aiTaskId, input.taskId))
          .limit(1);
        proposal = p;
      }

      return {
        taskId: task.id,
        status: task.status,
        errorMessage: task.errorMessage,
        proposal: proposal ? {
          id: proposal.id,
          status: proposal.status,
          benchmarkProjects: proposal.benchmarkProjects,
          processFlow: proposal.processFlow,
          competitorAnalysis: proposal.competitorAnalysis,
          budgetEstimate: proposal.budgetEstimate,
        } : null,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      };
    }),

  /**
   * 获取完整方案详情
   */
  getProposal: protectedProcedure
    .input(z.object({ proposalId: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const [proposal] = await db.select().from(aiSolutionProposals)
        .where(eq(aiSolutionProposals.id, input.proposalId))
        .limit(1);

      if (!proposal) {
        throw new Error("Proposal not found");
      }

      // 获取关联的需求
      const [requirement] = await db.select().from(customerTechnicalRequirements)
        .where(eq(customerTechnicalRequirements.id, proposal.requirementId))
        .limit(1);

      return {
        ...proposal,
        requirement,
      };
    }),

  /**
   * 确认方案并推入 M3
   */
  approveAndPushToM3: requirePermission('rnd:solutions:manage')
    .input(z.object({
      proposalId: z.number(),
      m3PhaseId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      const now = new Date().toISOString();

      // 更新方案状态
      await db.update(aiSolutionProposals)
        .set({
          status: 'PUSHED_TO_M3',
          approvedBy: userId,
          approvedAt: now,
          pushedToM3At: now,
          m3PhaseId: input.m3PhaseId ?? null,
          updatedAt: now,
        })
        .where(eq(aiSolutionProposals.id, input.proposalId));

      // 更新需求状态
      const [proposal] = await db.select().from(aiSolutionProposals)
        .where(eq(aiSolutionProposals.id, input.proposalId))
        .limit(1);

      if (proposal) {
        await db.update(customerTechnicalRequirements)
          .set({
            status: 'PROPOSAL_READY',
            updatedAt: now,
          })
          .where(eq(customerTechnicalRequirements.id, proposal.requirementId));
      }

      log.info({ proposalId: input.proposalId, userId }, "[SolutionEngine] Proposal approved and pushed to M3");

      return { success: true, message: "方案已确认并推入 M3 阶段" };
    }),

  /**
   * 列出方案
   */
  listProposals: protectedProcedure
    .input(z.object({
      requirementId: z.number().optional(),
      status: z.enum(['GENERATING', 'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUSHED_TO_M3', 'REJECTED']).optional(),
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const conditions: SQL[] = [];
      if (input?.requirementId) conditions.push(sql`p.requirement_id = ${input.requirementId}`);
      if (input?.status) conditions.push(sql`p.status = ${input.status}`);

      const whereClause = conditions.length > 0
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``;

      const result = await db.execute(sql`
        SELECT p.id, p.requirement_id, p.status, p.ai_model,
               p.budget_estimate, p.created_at, p.approved_at, p.pushed_to_m3_at,
               r.workpiece_name, r.customer_name
        FROM ai_solution_proposals p
        LEFT JOIN customer_technical_requirements r ON p.requirement_id = r.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT ${input?.limit ?? 20}
      `);

      return result.rows;
    }),

  /**
   * 导出方案为 Markdown/HTML 格式
   * 前端可将 HTML 转为 PDF 打印
   */
  exportProposal: requirePermission('rnd:solutions:manage')
    .input(z.object({
      proposalId: z.number(),
      format: z.enum(['markdown', 'html']).default('html'),
      includeBenchmarkProjects: z.boolean().default(false),    // 默认不包含历史项目
      includeCompetitorAnalysis: z.boolean().default(false),   // 默认不包含竞品分析
      includeBudgetEstimate: z.boolean().default(false),       // 默认不包含预算
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      // 获取方案
      const [proposal] = await db.select().from(aiSolutionProposals)
        .where(eq(aiSolutionProposals.id, input.proposalId))
        .limit(1);

      if (!proposal) {
        throw new Error("Proposal not found");
      }

      // 获取需求
      const [requirement] = await db.select().from(customerTechnicalRequirements)
        .where(eq(customerTechnicalRequirements.id, proposal.requirementId))
        .limit(1);

      if (!requirement) {
        throw new Error("Requirement not found");
      }

      // 动态导入导出服务
      const { exportProposalAsMarkdown, exportProposalAsHTML } = await import("../services/proposal-export.service");

      const exportData = {
        requirement: {
          workpieceName: requirement.workpieceName,
          workpieceNameEn: requirement.workpieceNameEn ?? undefined,
          workpieceMaterial: requirement.workpieceMaterial ?? undefined,
          customerName: requirement.customerName ?? undefined,
          projectNo: requirement.projectNo ?? undefined,
          particleLimit: requirement.particleLimit as { maxParticleSize?: number; maxParticleCount?: number; standard?: string } | undefined,
          cycleTime: requirement.cycleTime ?? undefined,
          dailyCapacity: requirement.dailyCapacity ?? undefined,
        },
        proposal: {
          id: proposal.id,
          benchmarkProjects: proposal.benchmarkProjects as any,
          processFlow: proposal.processFlow as any,
          equipmentConfig: proposal.equipmentConfig as any,
          competitorAnalysis: proposal.competitorAnalysis as any,
          budgetEstimate: proposal.budgetEstimate as any,
          createdAt: proposal.createdAt,
        },
        exportedBy: userId,
        includeBenchmarkProjects: input.includeBenchmarkProjects,
        includeCompetitorAnalysis: input.includeCompetitorAnalysis,
        includeBudgetEstimate: input.includeBudgetEstimate,
      };

      const content = input.format === 'markdown'
        ? exportProposalAsMarkdown(exportData)
        : exportProposalAsHTML(exportData);

      const filename = `GRT方案_${requirement.workpieceName}_SP-${String(proposal.id).padStart(6, '0')}.${input.format === 'markdown' ? 'md' : 'html'}`;

      log.info({ proposalId: input.proposalId, format: input.format }, "[SolutionEngine] Proposal exported");

      return {
        content,
        filename,
        format: input.format,
        mimeType: input.format === 'markdown' ? 'text/markdown' : 'text/html',
      };
    }),

  // ══════════════════════════════════════════════════════════════
  // 历史对标项目管理
  // ══════════════════════════════════════════════════════════════

  /** 列出历史对标项目 */
  listBenchmarkProjects: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      includeInactive: z.boolean().default(false),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const activeFilter = input?.includeInactive ? sql`` : sql`WHERE is_active = true`;
      const result = await db.execute(sql`
        SELECT id, project_no, customer_name, workpiece, workpiece_material,
               cleaning_type, delivery_year, equipment_model, cycle_time,
               particle_standard, highlights, notes, is_active, created_at
        FROM historical_benchmark_projects
        ${activeFilter}
        ORDER BY delivery_year DESC, created_at DESC
        LIMIT ${input?.limit ?? 50}
      `);

      return result.rows;
    }),

  /** 获取单个历史项目 */
  getBenchmarkProject: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const result = await db.execute(sql`
        SELECT * FROM historical_benchmark_projects WHERE id = ${input.id}
      `);

      if (!result.rows || result.rows.length === 0) {
        throw new Error("Project not found");
      }

      return result.rows[0];
    }),

  /** 创建历史对标项目 */
  createBenchmarkProject: protectedProcedure
    .input(z.object({
      projectNo: z.string().min(1).max(50),
      customerName: z.string().min(1).max(200),
      workpiece: z.string().min(1).max(200),
      workpieceMaterial: z.string().max(100).optional(),
      cleaningType: z.enum(['ULTRASONIC', 'SPRAY', 'IMMERSION', 'VACUUM_DRY', 'HOT_AIR_DRY', 'COMBINATION', 'OTHER']).optional(),
      deliveryYear: z.number().min(2000).max(2100).optional(),
      equipmentModel: z.string().max(100).optional(),
      cycleTime: z.number().min(1).optional(),
      particleStandard: z.string().max(100).optional(),
      particleSizeLimit: z.number().optional(),
      particleCountLimit: z.number().int().optional(),
      highlights: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      // Build highlights as a Postgres ARRAY literal via sql.raw (validated by Zod z.array(z.string()))
      const highlightsValue: SQL = input.highlights && input.highlights.length > 0
        ? sql`ARRAY[${sql.join(input.highlights.map(h => sql`${h}`), sql`,`)}]::text[]`
        : sql`NULL`;

      const result = await db.execute(sql`
        INSERT INTO historical_benchmark_projects
          (project_no, customer_name, workpiece, workpiece_material, cleaning_type,
           delivery_year, equipment_model, cycle_time, particle_standard, particle_size_limit, particle_count_limit,
           highlights, notes, created_by)
        VALUES
          (${input.projectNo},
           ${input.customerName},
           ${input.workpiece},
           ${input.workpieceMaterial ?? null},
           ${input.cleaningType ?? null},
           ${input.deliveryYear ?? null},
           ${input.equipmentModel ?? null},
           ${input.cycleTime ?? null},
           ${input.particleStandard ?? null},
           ${input.particleSizeLimit ?? null},
           ${input.particleCountLimit ?? null},
           ${highlightsValue},
           ${input.notes ?? null},
           ${userId})
        RETURNING id
      `);

      log.info({ projectNo: input.projectNo }, "[SolutionEngine] Benchmark project created");
      return { success: true, id: (result.rows[0] as { id: number }).id };
    }),

  /** 更新历史对标项目 */
  updateBenchmarkProject: protectedProcedure
    .input(z.object({
      id: z.number(),
      projectNo: z.string().min(1).max(50).optional(),
      customerName: z.string().min(1).max(200).optional(),
      workpiece: z.string().min(1).max(200).optional(),
      workpieceMaterial: z.string().max(100).optional(),
      cleaningType: z.enum(['ULTRASONIC', 'SPRAY', 'IMMERSION', 'VACUUM_DRY', 'HOT_AIR_DRY', 'COMBINATION', 'OTHER']).optional(),
      deliveryYear: z.number().min(2000).max(2100).optional(),
      equipmentModel: z.string().max(100).optional(),
      cycleTime: z.number().min(1).optional(),
      particleStandard: z.string().max(100).optional(),
      particleSizeLimit: z.number().optional(),
      particleCountLimit: z.number().int().optional(),
      highlights: z.array(z.string()).optional(),
      notes: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const setParts: SQL[] = [];
      if (input.projectNo) setParts.push(sql`project_no = ${input.projectNo}`);
      if (input.customerName) setParts.push(sql`customer_name = ${input.customerName}`);
      if (input.workpiece) setParts.push(sql`workpiece = ${input.workpiece}`);
      if (input.workpieceMaterial !== undefined) setParts.push(sql`workpiece_material = ${input.workpieceMaterial ?? null}`);
      if (input.cleaningType !== undefined) setParts.push(sql`cleaning_type = ${input.cleaningType ?? null}`);
      if (input.deliveryYear !== undefined) setParts.push(sql`delivery_year = ${input.deliveryYear ?? null}`);
      if (input.equipmentModel !== undefined) setParts.push(sql`equipment_model = ${input.equipmentModel ?? null}`);
      if (input.cycleTime !== undefined) setParts.push(sql`cycle_time = ${input.cycleTime ?? null}`);
      if (input.particleStandard !== undefined) setParts.push(sql`particle_standard = ${input.particleStandard ?? null}`);
      if (input.particleSizeLimit !== undefined) setParts.push(sql`particle_size_limit = ${input.particleSizeLimit ?? null}`);
      if (input.particleCountLimit !== undefined) setParts.push(sql`particle_count_limit = ${input.particleCountLimit ?? null}`);
      if (input.highlights !== undefined) {
        const arr: SQL = input.highlights.length > 0
          ? sql`ARRAY[${sql.join(input.highlights.map(h => sql`${h}`), sql`,`)}]::text[]`
          : sql`NULL`;
        setParts.push(sql`highlights = ${arr}`);
      }
      if (input.notes !== undefined) setParts.push(sql`notes = ${input.notes ?? null}`);
      if (input.isActive !== undefined) setParts.push(sql`is_active = ${input.isActive}`);
      setParts.push(sql`updated_at = NOW()`);

      if (setParts.length === 0) {
        return { success: true };
      }

      await db.execute(sql`
        UPDATE historical_benchmark_projects
        SET ${sql.join(setParts, sql`, `)}
        WHERE id = ${input.id}
      `);

      log.info({ id: input.id }, "[SolutionEngine] Benchmark project updated");
      return { success: true };
    }),

  /** 删除历史对标项目 (软删除) */
  deleteBenchmarkProject: requirePermission('rnd:solutions:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      await db.execute(sql`
        UPDATE historical_benchmark_projects
        SET is_active = false, updated_at = NOW()
        WHERE id = ${input.id}
      `);

      log.info({ id: input.id }, "[SolutionEngine] Benchmark project deleted (soft)");
      return { success: true };
    }),
});
