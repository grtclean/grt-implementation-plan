/**
 * Meeting Intelligence Router — 智能会议中枢 tRPC 路由
 *
 * 2 核心异步接口:
 *   analyzeMeetingTranscript — 文本分析 → ai_tasks 队列 → 痛点/修改意见/Action Items
 *   iterateProposal          — 会议反馈 + 老方案 → 新版本方案草稿
 *
 * 辅助:
 *   getAnalysisStatus        — 轮询转写分析任务状态
 *   getIterationStatus       — 轮询方案迭代任务状态
 *
 * 规则: 绝对异步、禁止阻塞 — 所有 AI 操作入队列，前端轮询获取结果
 */
import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { aiTasks, projectNumberCounters, projectsV2 } from "../../drizzle/schema";
import { sysMeetings, customerInteractionFeedback, tProjects, tProjectEvidence } from "../../drizzle/smart-meetings-schema";
import { aiSolutionProposals } from "../../drizzle/solution-engine-schema";
import { eq, desc, sql, and, type SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("meeting-intelligence");

// ── Idempotent DDL: ensure new columns exist on legacy tables ──
let columnsEnsured = false;

async function ensureColumns() {
  if (columnsEnsured) return;
  try {
    const db = await requireDb();
    // sys_meetings new columns
    await db.execute(sql`ALTER TABLE sys_meetings ADD COLUMN IF NOT EXISTS ai_summary JSONB`);
    await db.execute(sql`ALTER TABLE sys_meetings ADD COLUMN IF NOT EXISTS project_id INTEGER`);
    await db.execute(sql`ALTER TABLE sys_meetings ADD COLUMN IF NOT EXISTS department_id INTEGER`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sys_meetings_project_idx ON sys_meetings (project_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sys_meetings_department_idx ON sys_meetings (department_id)`);
    // customer_interaction_feedback table
    await db.execute(sql`CREATE TABLE IF NOT EXISTS customer_interaction_feedback (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL,
      meeting_id INTEGER,
      feedback_type VARCHAR(30) NOT NULL,
      content TEXT NOT NULL,
      severity VARCHAR(10) NOT NULL DEFAULT 'medium',
      resolved_at TIMESTAMP,
      resolved_by VARCHAR(50),
      proposal_id INTEGER,
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS cif_project_idx ON customer_interaction_feedback (project_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS cif_meeting_idx ON customer_interaction_feedback (meeting_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS cif_feedback_type_idx ON customer_interaction_feedback (feedback_type)`);
    // sys_meetings: t_project_id column
    await db.execute(sql`ALTER TABLE sys_meetings ADD COLUMN IF NOT EXISTS t_project_id INTEGER`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sys_meetings_t_project_idx ON sys_meetings (t_project_id)`);
    // M0-M12 stage + meeting category + direction columns
    await db.execute(sql`ALTER TABLE sys_meetings ADD COLUMN IF NOT EXISTS stage_code VARCHAR(10)`);
    await db.execute(sql`ALTER TABLE sys_meetings ADD COLUMN IF NOT EXISTS meeting_category VARCHAR(30) DEFAULT 'OTHER'`);
    await db.execute(sql`ALTER TABLE sys_meetings ADD COLUMN IF NOT EXISTS direction VARCHAR(10) DEFAULT 'INTERNAL'`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sys_meetings_stage_code_idx ON sys_meetings (stage_code)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sys_meetings_meeting_category_idx ON sys_meetings (meeting_category)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sys_meetings_direction_idx ON sys_meetings (direction)`);
    // t_projects table
    await db.execute(sql`CREATE TABLE IF NOT EXISTS t_projects (
      id SERIAL PRIMARY KEY,
      t_number VARCHAR(20) NOT NULL,
      display_name VARCHAR(300) NOT NULL,
      customer_id INTEGER,
      customer_name VARCHAR(200),
      status VARCHAR(30) NOT NULL DEFAULT 'INQUIRY',
      converted_project_id INTEGER,
      grt_number VARCHAR(20),
      converted_at TIMESTAMP,
      converted_by VARCHAR(100),
      description TEXT,
      ai_comm_analysis JSONB,
      created_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS t_projects_t_number_idx ON t_projects (t_number)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS t_projects_status_idx ON t_projects (status)`);
    // t_project_evidence table
    await db.execute(sql`CREATE TABLE IF NOT EXISTS t_project_evidence (
      id SERIAL PRIMARY KEY,
      t_project_id INTEGER NOT NULL,
      meeting_id INTEGER,
      evidence_type VARCHAR(30) NOT NULL,
      title VARCHAR(300) NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB,
      recorded_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS t_project_evidence_t_project_idx ON t_project_evidence (t_project_id)`);
    columnsEnsured = true;
    log.info("[MeetingIntelligence] Columns ensured");
  } catch (err) {
    log.warn({ err }, "[MeetingIntelligence] ensureColumns failed (table may not exist yet)");
  }
}

// ══════════════════════════════════════════════════════════════
// Task handlers registered in: server/services/ai-async-handlers.service.ts
//   - MEETING_TRANSCRIPT_ANALYSIS: extracts painPoints/suggestions/actionItems → writes aiSummary
//   - PROPOSAL_ITERATION: copies old proposal fields → creates DRAFT version
// The task-worker.service polls ai_tasks and dispatches to these handlers.
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
// tRPC Router 定义
// ══════════════════════════════════════════════════════════════

export const meetingIntelligenceRouter = router({

  // ──────────────────────────────────────────────────────────
  //  analyzeMeetingTranscript — 异步转写分析
  //  接收 meetingId + 文本 → 入队列 → 返回 taskId
  // ──────────────────────────────────────────────────────────
  analyzeMeetingTranscript: requirePermission("collab:meeting:hub")
    .input(z.object({
      meetingId: z.number(),
      transcript: z.string().min(1).max(100_000),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureColumns();
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      // 1. 验证会议存在
      const [meeting] = await db.select()
        .from(sysMeetings)
        .where(eq(sysMeetings.id, input.meetingId))
        .limit(1);

      if (!meeting) {
        throw new Error(`Meeting #${input.meetingId} not found`);
      }

      // 2. 保存转写文本到会议记录
      await db.update(sysMeetings)
        .set({ transcript: input.transcript, updatedAt: new Date() })
        .where(eq(sysMeetings.id, input.meetingId));

      // 3. 创建 AI 任务 (入队列)
      const [newTask] = await db.insert(aiTasks).values({
        taskType: "MEETING_TRANSCRIPT_ANALYSIS",
        status: "pending",
        inputData: {
          meetingId: input.meetingId,
          transcriptLength: input.transcript.length,
          requestedBy: userId,
        } as Record<string, unknown>,
        createdBy: userId,
      }).returning();

      log.info({ taskId: newTask.id, meetingId: input.meetingId, transcriptLen: input.transcript.length },
        "[MeetingIntelligence] Transcript analysis queued");

      // Task worker will pick up MEETING_TRANSCRIPT_ANALYSIS from ai_tasks queue
      // Handler: server/services/ai-async-handlers.service.ts

      return {
        success: true,
        taskId: newTask.id,
        meetingId: input.meetingId,
        message: "转写分析已入队列，请轮询 getAnalysisStatus 获取结果",
      };
    }),

  // ──────────────────────────────────────────────────────────
  //  getAnalysisStatus — 轮询转写分析结果
  // ──────────────────────────────────────────────────────────
  getAnalysisStatus: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const [task] = await db.select()
        .from(aiTasks)
        .where(eq(aiTasks.id, input.taskId))
        .limit(1);

      if (!task) {
        return { status: "not_found" as const, taskId: input.taskId };
      }

      // 如果已完成，附带 AI 摘要
      let aiSummary = null;
      if (task.status === "completed" && task.resultData) {
        const result = task.resultData as Record<string, unknown>;
        const meetingId = result.meetingId as number;

        const [meeting] = await db.select({
          aiSummary: sysMeetings.aiSummary,
        })
          .from(sysMeetings)
          .where(eq(sysMeetings.id, meetingId))
          .limit(1);

        aiSummary = meeting?.aiSummary ?? null;
      }

      return {
        taskId: task.id,
        status: task.status,
        errorMessage: task.errorMessage,
        result: task.status === "completed" ? {
          painPoints: ((task.resultData as Record<string, unknown>)?.painPoints as string[]) ?? [],
          suggestions: ((task.resultData as Record<string, unknown>)?.suggestions as string[]) ?? [],
          actionItems: ((task.resultData as Record<string, unknown>)?.actionItems as Array<{ assignee: string; task: string }>) ?? [],
          aiSummary,
        } : null,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      };
    }),

  // ──────────────────────────────────────────────────────────
  //  iterateProposal — 基于会议反馈迭代方案
  //  读取老方案 → 结合反馈 → 新版本 (version+1)
  // ──────────────────────────────────────────────────────────
  iterateProposal: requirePermission("rnd:solutions:manage")
    .input(z.object({
      proposalId: z.number(),
      meetingFeedback: z.string().min(1).max(50_000),
      meetingId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureColumns();
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      // 1. 读取老方案
      const [oldProposal] = await db.select()
        .from(aiSolutionProposals)
        .where(eq(aiSolutionProposals.id, input.proposalId))
        .limit(1);

      if (!oldProposal) {
        throw new Error(`Proposal #${input.proposalId} not found`);
      }

      const newVersion = (oldProposal.version ?? 1) + 1;

      // 2. 创建 AI 任务
      const [newTask] = await db.insert(aiTasks).values({
        taskType: "PROPOSAL_ITERATION",
        status: "pending",
        inputData: {
          parentProposalId: oldProposal.id,
          requirementId: oldProposal.requirementId,
          newVersion,
          meetingId: input.meetingId ?? null,
          feedbackLength: input.meetingFeedback.length,
          requestedBy: userId,
        } as Record<string, unknown>,
        createdBy: userId,
      }).returning();

      // 3. 创建新版本方案记录 (GENERATING 状态)
      const [newProposal] = await db.insert(aiSolutionProposals).values({
        requirementId: oldProposal.requirementId,
        version: newVersion,
        parentProposalId: oldProposal.id,
        iterationReason: input.meetingFeedback.slice(0, 2000),
        aiTaskId: newTask.id,
        status: "GENERATING",
        createdBy: userId,
      }).returning();

      log.info({
        taskId: newTask.id,
        newProposalId: newProposal.id,
        parentId: oldProposal.id,
        version: newVersion,
      }, "[MeetingIntelligence] Proposal iteration started");

      // Task worker will pick up PROPOSAL_ITERATION from ai_tasks queue
      // Handler: server/services/ai-async-handlers.service.ts

      return {
        success: true,
        taskId: newTask.id,
        newProposalId: newProposal.id,
        parentProposalId: oldProposal.id,
        version: newVersion,
        message: `方案 V${newVersion} 迭代已启动，请轮询 getIterationStatus 获取进度`,
      };
    }),

  // ──────────────────────────────────────────────────────────
  //  getIterationStatus — 轮询方案迭代结果
  // ──────────────────────────────────────────────────────────
  getIterationStatus: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const [task] = await db.select()
        .from(aiTasks)
        .where(eq(aiTasks.id, input.taskId))
        .limit(1);

      if (!task) {
        return { status: "not_found" as const, taskId: input.taskId };
      }

      let proposal = null;
      if (task.status === "completed") {
        const resultData = task.resultData as Record<string, unknown> | null;
        const newProposalId = resultData?.newProposalId as number | undefined;

        if (newProposalId) {
          const [p] = await db.select()
            .from(aiSolutionProposals)
            .where(eq(aiSolutionProposals.id, newProposalId))
            .limit(1);
          proposal = p ? {
            id: p.id,
            version: p.version,
            parentProposalId: p.parentProposalId,
            iterationReason: p.iterationReason,
            status: p.status,
            processFlow: p.processFlow,
            equipmentConfig: p.equipmentConfig,
            budgetEstimate: p.budgetEstimate,
          } : null;
        }
      }

      return {
        taskId: task.id,
        status: task.status,
        errorMessage: task.errorMessage,
        proposal,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      };
    }),

  // ──────────────────────────────────────────────────────────
  //  getProposalVersionHistory — 查询方案版本链
  // ──────────────────────────────────────────────────────────
  getProposalVersionHistory: protectedProcedure
    .input(z.object({
      requirementId: z.number(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const proposals = await db.select({
        id: aiSolutionProposals.id,
        version: aiSolutionProposals.version,
        parentProposalId: aiSolutionProposals.parentProposalId,
        iterationReason: aiSolutionProposals.iterationReason,
        status: aiSolutionProposals.status,
        createdBy: aiSolutionProposals.createdBy,
        createdAt: aiSolutionProposals.createdAt,
      })
        .from(aiSolutionProposals)
        .where(eq(aiSolutionProposals.requirementId, input.requirementId))
        .orderBy(desc(aiSolutionProposals.version))
        .limit(input.limit);

      return proposals;
    }),

  // ──────────────────────────────────────────────────────────
  //  submitCustomerFeedback — 结构化客户反馈录入
  // ──────────────────────────────────────────────────────────
  submitCustomerFeedback: requirePermission("collab:meeting:hub")
    .input(z.object({
      projectId: z.number(),
      meetingId: z.number().optional(),
      feedbackType: z.enum(["pain_point", "requirement_change", "objection", "budget_signal"]),
      content: z.string().min(1).max(5000),
      severity: z.enum(["high", "medium", "low"]).default("medium"),
      proposalId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureColumns();
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      const [feedback] = await db.insert(customerInteractionFeedback).values({
        projectId: input.projectId,
        meetingId: input.meetingId ?? null,
        feedbackType: input.feedbackType,
        content: input.content,
        severity: input.severity,
        proposalId: input.proposalId ?? null,
        createdBy: userId,
      }).returning();

      log.info({ feedbackId: feedback.id, projectId: input.projectId, type: input.feedbackType },
        "[MeetingIntelligence] Customer feedback submitted");

      return { success: true, feedbackId: feedback.id };
    }),

  // ──────────────────────────────────────────────────────────
  //  getProjectFeedback — 按项目查询反馈列表
  // ──────────────────────────────────────────────────────────
  getProjectFeedback: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      feedbackType: z.enum(["pain_point", "requirement_change", "objection", "budget_signal"]).optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      await ensureColumns();
      const db = await requireDb();

      const conditions = [eq(customerInteractionFeedback.projectId, input.projectId)];
      if (input.feedbackType) {
        conditions.push(eq(customerInteractionFeedback.feedbackType, input.feedbackType));
      }

      const feedbacks = await db.select()
        .from(customerInteractionFeedback)
        .where(and(...conditions))
        .orderBy(desc(customerInteractionFeedback.createdAt))
        .limit(input.limit);

      return feedbacks;
    }),

  // ──────────────────────────────────────────────────────────
  //  getProposalDiff — 对比两版方案 JSONB 字段差异
  // ──────────────────────────────────────────────────────────
  getProposalDiff: protectedProcedure
    .input(z.object({
      oldProposalId: z.number(),
      newProposalId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const [oldP] = await db.select()
        .from(aiSolutionProposals)
        .where(eq(aiSolutionProposals.id, input.oldProposalId))
        .limit(1);
      const [newP] = await db.select()
        .from(aiSolutionProposals)
        .where(eq(aiSolutionProposals.id, input.newProposalId))
        .limit(1);

      if (!oldP || !newP) {
        throw new Error("One or both proposals not found");
      }

      function computeJsonDiff(oldObj: Record<string, unknown> | null, newObj: Record<string, unknown> | null) {
        const o = oldObj ?? {};
        const n = newObj ?? {};
        const added = Object.keys(n).filter(k => !(k in o));
        const removed = Object.keys(o).filter(k => !(k in n));
        const changed = Object.keys(o).filter(k => k in n && JSON.stringify(o[k]) !== JSON.stringify(n[k]));
        const oldValues: Record<string, unknown> = {};
        const newValues: Record<string, unknown> = {};
        for (const k of changed) { oldValues[k] = o[k]; newValues[k] = n[k]; }
        return { added, removed, changed, oldValues, newValues };
      }

      return {
        oldProposalId: oldP.id,
        newProposalId: newP.id,
        oldVersion: oldP.version,
        newVersion: newP.version,
        processFlowDiff: computeJsonDiff(
          oldP.processFlow as Record<string, unknown> | null,
          newP.processFlow as Record<string, unknown> | null,
        ),
        equipmentConfigDiff: computeJsonDiff(
          oldP.equipmentConfig as Record<string, unknown> | null,
          newP.equipmentConfig as Record<string, unknown> | null,
        ),
        budgetEstimateDiff: computeJsonDiff(
          oldP.budgetEstimate as Record<string, unknown> | null,
          newP.budgetEstimate as Record<string, unknown> | null,
        ),
        iterationReason: newP.iterationReason,
      };
    }),

  // ──────────────────────────────────────────────────────────
  //  confirmIteration — 选择性合并 diff 字段到新方案
  // ──────────────────────────────────────────────────────────
  confirmIteration: requirePermission("rnd:solutions:manage")
    .input(z.object({
      proposalId: z.number(),
      acceptFields: z.array(z.enum(["processFlow", "equipmentConfig", "budgetEstimate"])),
      parentProposalId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      const [newP] = await db.select()
        .from(aiSolutionProposals)
        .where(eq(aiSolutionProposals.id, input.proposalId))
        .limit(1);
      const [oldP] = await db.select()
        .from(aiSolutionProposals)
        .where(eq(aiSolutionProposals.id, input.parentProposalId))
        .limit(1);

      if (!newP || !oldP) {
        throw new Error("Proposal not found");
      }

      // Selective merge: for fields NOT accepted, revert to old values
      const updateSet: Record<string, unknown> = {
        status: "PENDING_REVIEW",
        updatedAt: new Date().toISOString(),
      };
      const fieldMap = {
        processFlow: { new: newP.processFlow, old: oldP.processFlow },
        equipmentConfig: { new: newP.equipmentConfig, old: oldP.equipmentConfig },
        budgetEstimate: { new: newP.budgetEstimate, old: oldP.budgetEstimate },
      } as const;
      for (const [field, vals] of Object.entries(fieldMap)) {
        if (!input.acceptFields.includes(field as keyof typeof fieldMap)) {
          updateSet[field] = vals.old; // revert to old version
        }
        // accepted fields keep their new values (already in DB)
      }

      await db.update(aiSolutionProposals)
        .set(updateSet)
        .where(eq(aiSolutionProposals.id, input.proposalId));

      log.info({ proposalId: input.proposalId, accepted: input.acceptFields },
        "[MeetingIntelligence] Iteration confirmed");

      return { success: true, proposalId: input.proposalId, status: "PENDING_REVIEW", acceptedFields: input.acceptFields };
    }),

  // ──────────────────────────────────────────────────────────
  //  pushToM3 — 将 APPROVED 方案推入 M3 阶段
  // ──────────────────────────────────────────────────────────
  pushToM3: requirePermission("rnd:solutions:manage")
    .input(z.object({ proposalId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      const [proposal] = await db.select()
        .from(aiSolutionProposals)
        .where(eq(aiSolutionProposals.id, input.proposalId))
        .limit(1);

      if (!proposal) {
        throw new Error(`Proposal #${input.proposalId} not found`);
      }
      if (proposal.status !== "APPROVED") {
        throw new Error(`Only APPROVED proposals can be pushed to M3. Current status: ${proposal.status}`);
      }

      await db.update(aiSolutionProposals)
        .set({
          status: "PUSHED_TO_M3",
          pushedToM3At: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(aiSolutionProposals.id, input.proposalId));

      log.info({ proposalId: input.proposalId, version: proposal.version },
        "[MeetingIntelligence] Proposal pushed to M3");

      return { success: true, proposalId: input.proposalId, status: "PUSHED_TO_M3" };
    }),

  // ══════════════════════════════════════════════════════════
  //  T-Project Numbering System (T-项目编号系统)
  // ══════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────
  //  createTProject — 自动生成 T+yyMMdd+序号 编号
  // ──────────────────────────────────────────────────────────
  createTProject: requirePermission("collab:meeting:hub")
    .input(z.object({
      displayName: z.string().min(1).max(300),
      customerId: z.number().optional(),
      customerName: z.string().max(200).optional(),
      description: z.string().max(5000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureColumns();
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      // Generate T-number: T + yyMMdd + 2-digit sequence
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const datePrefix = `T${yy}${mm}${dd}`;

      // Count existing T-projects with same date prefix
      const existing = await db.select()
        .from(tProjects)
        .where(sql`${tProjects.tNumber} LIKE ${datePrefix + "%"}`)
        .limit(100);

      const seq = existing.length + 1;
      const tNumber = `${datePrefix}${String(seq).padStart(2, "0")}`;

      const [project] = await db.insert(tProjects).values({
        tNumber,
        displayName: input.displayName,
        customerId: input.customerId ?? null,
        customerName: input.customerName ?? null,
        description: input.description ?? null,
        status: "INQUIRY",
        createdBy: userId,
      }).returning();

      log.info({ tNumber, id: project.id }, "[MeetingIntelligence] T-Project created");
      return { success: true, tProjectId: project.id, tNumber };
    }),

  // ──────────────────────────────────────────────────────────
  //  listTProjects — 查询 T-项目列表
  // ──────────────────────────────────────────────────────────
  listTProjects: protectedProcedure
    .input(z.object({
      status: z.enum(["INQUIRY", "NEGOTIATING", "ORDER_RECEIVED", "CONVERTED", "CANCELLED"]).optional(),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      await ensureColumns();
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input?.status) {
        conditions.push(eq(tProjects.status, input.status));
      }
      return db.select()
        .from(tProjects)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(tProjects.createdAt))
        .limit(input?.limit ?? 50);
    }),

  // ──────────────────────────────────────────────────────────
  //  assignMeetingToTProject — 将会议关联到 T-项目
  // ──────────────────────────────────────────────────────────
  assignMeetingToTProject: requirePermission("collab:meeting:hub")
    .input(z.object({
      meetingId: z.number(),
      tProjectId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await ensureColumns();
      const db = await requireDb();

      const [tp] = await db.select().from(tProjects).where(eq(tProjects.id, input.tProjectId)).limit(1);
      if (!tp) throw new Error(`T-Project #${input.tProjectId} not found`);

      const [meeting] = await db.select().from(sysMeetings).where(eq(sysMeetings.id, input.meetingId)).limit(1);
      if (!meeting) throw new Error(`Meeting #${input.meetingId} not found`);

      await db.update(sysMeetings)
        .set({ tProjectId: input.tProjectId, updatedAt: new Date() })
        .where(eq(sysMeetings.id, input.meetingId));

      log.info({ meetingId: input.meetingId, tProjectId: input.tProjectId },
        "[MeetingIntelligence] Meeting assigned to T-Project");
      return { success: true, meetingId: input.meetingId, tProjectId: input.tProjectId, tNumber: tp.tNumber };
    }),

  // ──────────────────────────────────────────────────────────
  //  convertToGRT — T-项目转正式 GRT-6xx 编号
  // ──────────────────────────────────────────────────────────
  convertToGRT: requirePermission("rnd:solutions:manage")
    .input(z.object({
      tProjectId: z.number(),
      projectName: z.string().min(1).max(200),
      customerId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureColumns();
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      const [tp] = await db.select().from(tProjects).where(eq(tProjects.id, input.tProjectId)).limit(1);
      if (!tp) throw new Error(`T-Project #${input.tProjectId} not found`);
      if (tp.status === "CONVERTED") throw new Error(`T-Project ${tp.tNumber} already converted to ${tp.grtNumber}`);

      // Atomic GRT number via projectNumberCounters
      const [counter] = await db.select()
        .from(projectNumberCounters)
        .where(eq(projectNumberCounters.prefix, "GRT"))
        .limit(1);

      let nextNum: number;
      if (!counter) {
        await db.insert(projectNumberCounters).values({
          prefix: "GRT",
          currentMax: 600,
          nextAvailable: 601,
          formatDigits: 3,
          numberingVersion: "V1.0",
        }).returning();
        nextNum = 600;
      } else {
        nextNum = counter.nextAvailable;
        await db.update(projectNumberCounters)
          .set({ currentMax: nextNum, nextAvailable: nextNum + 1 })
          .where(eq(projectNumberCounters.prefix, "GRT"));
      }

      const grtNumber = `GRT-${nextNum}`;

      // Create formal project in projects_v2
      const [formalProject] = await db.insert(projectsV2).values({
        projectCode: grtNumber,
        projectName: input.projectName,
        customerId: input.customerId,
      }).returning();

      // Update T-project
      await db.update(tProjects)
        .set({
          status: "CONVERTED",
          convertedProjectId: formalProject.id,
          grtNumber,
          convertedAt: new Date(),
          convertedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(tProjects.id, input.tProjectId));

      log.info({ tNumber: tp.tNumber, grtNumber, formalProjectId: formalProject.id },
        "[MeetingIntelligence] T-Project converted to GRT");
      return { success: true, tNumber: tp.tNumber, grtNumber, formalProjectId: formalProject.id };
    }),

  // ──────────────────────────────────────────────────────────
  //  analyzeCommStrategy — AI 沟通策略分析 (异步)
  // ──────────────────────────────────────────────────────────
  analyzeCommStrategy: requirePermission("collab:meeting:hub")
    .input(z.object({
      tProjectId: z.number(),
      meetingId: z.number().optional(),
      communicationNotes: z.string().min(1).max(50_000),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureColumns();
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      const [tp] = await db.select().from(tProjects).where(eq(tProjects.id, input.tProjectId)).limit(1);
      if (!tp) throw new Error(`T-Project #${input.tProjectId} not found`);

      const [newTask] = await db.insert(aiTasks).values({
        taskType: "COMM_STRATEGY_ANALYSIS",
        status: "pending",
        inputData: {
          tProjectId: input.tProjectId,
          tNumber: tp.tNumber,
          customerName: tp.customerName,
          meetingId: input.meetingId ?? null,
          notesLength: input.communicationNotes.length,
          requestedBy: userId,
        } as Record<string, unknown>,
        createdBy: userId,
      }).returning();

      log.info({ taskId: newTask.id, tProjectId: input.tProjectId },
        "[MeetingIntelligence] Comm strategy analysis queued");
      return { success: true, taskId: newTask.id, tProjectId: input.tProjectId };
    }),

  // ──────────────────────────────────────────────────────────
  //  recordEvidence — 记录客户沟通证据
  // ──────────────────────────────────────────────────────────
  recordEvidence: requirePermission("collab:meeting:hub")
    .input(z.object({
      tProjectId: z.number(),
      meetingId: z.number().optional(),
      evidenceType: z.enum(["communication_record", "customer_feedback", "technical_note", "site_visit", "email"]),
      title: z.string().min(1).max(300),
      content: z.string().min(1).max(50_000),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureColumns();
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      const [tp] = await db.select().from(tProjects).where(eq(tProjects.id, input.tProjectId)).limit(1);
      if (!tp) throw new Error(`T-Project #${input.tProjectId} not found`);

      const [evidence] = await db.insert(tProjectEvidence).values({
        tProjectId: input.tProjectId,
        meetingId: input.meetingId ?? null,
        evidenceType: input.evidenceType,
        title: input.title,
        content: input.content,
        metadata: input.metadata ?? null,
        recordedBy: userId,
      }).returning();

      log.info({ evidenceId: evidence.id, tProjectId: input.tProjectId, type: input.evidenceType },
        "[MeetingIntelligence] Evidence recorded");
      return { success: true, evidenceId: evidence.id };
    }),

  // ──────────────────────────────────────────────────────────
  //  getProjectEvidence — 查询 T-项目证据列表
  // ──────────────────────────────────────────────────────────
  getProjectEvidence: protectedProcedure
    .input(z.object({
      tProjectId: z.number(),
      evidenceType: z.enum(["communication_record", "customer_feedback", "technical_note", "site_visit", "email"]).optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      await ensureColumns();
      const db = await requireDb();
      const conditions: SQL[] = [eq(tProjectEvidence.tProjectId, input.tProjectId)];
      if (input.evidenceType) {
        conditions.push(eq(tProjectEvidence.evidenceType, input.evidenceType));
      }
      return db.select()
        .from(tProjectEvidence)
        .where(and(...conditions))
        .orderBy(desc(tProjectEvidence.createdAt))
        .limit(input.limit);
    }),

  // ──────────────────────────────────────────────────────────
  //  seedTProjects — 初始化演示 T-项目
  // ──────────────────────────────────────────────────────────
  seedTProjects: requirePermission("collab:meeting:hub")
    .mutation(async ({ ctx }) => {
      await ensureColumns();
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      const existing = await db.select().from(tProjects).limit(1);
      if (existing.length > 0) {
        return { message: "T-Projects already seeded", count: 0, projects: [] };
      }

      const [tp1] = await db.insert(tProjects).values({
        tNumber: "T26030601",
        displayName: "某汽车零部件清洗线项目",
        customerName: "大众汽车一汽",
        status: "NEGOTIATING",
        description: "客户咨询发动机缸体清洗线方案",
        createdBy: userId,
      }).returning();

      const [tp2] = await db.insert(tProjects).values({
        tNumber: "T26030701",
        displayName: "半导体晶圆清洗设备项目",
        customerName: "华虹半导体",
        status: "INQUIRY",
        description: "晶圆清洗设备初步技术交流",
        createdBy: userId,
      }).returning();

      // Assign existing meetings to T-projects
      const meetings = await db.select()
        .from(sysMeetings)
        .orderBy(sysMeetings.id)
        .limit(2);

      for (let i = 0; i < meetings.length; i++) {
        const tpId = i === 0 ? tp1.id : tp2.id;
        await db.update(sysMeetings)
          .set({
            tProjectId: tpId,
            stageCode: i === 0 ? "M1" : "M0",
            meetingCategory: i === 0 ? "CUSTOMER_MEETING" : "SITE_VISIT",
            direction: "EXTERNAL",
            updatedAt: new Date(),
          })
          .where(eq(sysMeetings.id, meetings[i].id));
      }

      // Sample evidence
      await db.insert(tProjectEvidence).values({
        tProjectId: tp1.id,
        evidenceType: "communication_record",
        title: "首次技术交流纪要",
        content: "客户要求清洁度 VDA 19.1 标准，最大颗粒物 500μm，节拍 120s/件。预算约 200 万。",
        recordedBy: userId,
      }).returning();

      log.info({ tp1: tp1.tNumber, tp2: tp2.tNumber }, "[MeetingIntelligence] T-Projects seeded");
      return { message: "T-Projects seeded", count: 2, projects: [tp1.tNumber, tp2.tNumber] };
    }),
});
