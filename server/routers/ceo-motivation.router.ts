/**
 * CEO Smart Motivation Command Router
 *
 * CEO主动激励指挥系统 — ~35 procedures across 5 sections:
 *   Smart Tasks (8), State Signals (5), KPI Alerts (7), Motivation Moments (6), Technical Assist (8)
 *
 * Tables auto-created via ensureTables() DDL on first access.
 */
import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql, eq, desc, and, isNull, lte, or } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import {
  smartTaskAssignments,
  employeeStateSignals,
  kpiProactiveAlerts,
  motivationMoments,
  technicalAssistSessions,
} from "../../drizzle/ceo-motivation-schema";

const log = createChildLogger("ceo-motivation");

const flexibleId = z.union([z.string(), z.number()]);

// ─── Auto-DDL ─────────────────────────────────────────────────
let tablesEnsured = false;
async function ensureTables() {
  if (tablesEnsured) return;
  const db = await requireDb();
  try {
    // --- Table 1: smart_task_assignments ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "smart_task_assignments" (
        "id" serial PRIMARY KEY NOT NULL,
        "task_title" varchar(300) NOT NULL,
        "task_description" text,
        "challenge_level" varchar(20) DEFAULT 'normal',
        "assigned_to" integer NOT NULL,
        "assigned_to_name" varchar(100),
        "assigned_by" integer NOT NULL,
        "assigned_by_name" varchar(100),
        "project_id" integer,
        "process_code" varchar(20),
        "estimated_hours" decimal(8,2),
        "deadline_at" timestamp,
        "status" varchar(20) DEFAULT 'pending',
        "priority_score" integer DEFAULT 5,
        "motivational_note" text,
        "technical_hints" text,
        "collaborator_ids" json,
        "scheduled_push_time" timestamp,
        "flash_annotation" text,
        "flash_until_acknowledged" boolean DEFAULT true,
        "acknowledged_at" timestamp,
        "employee_state_required" varchar(30),
        "kpi_impact_area" varchar(100),
        "kpi_boost_points" integer DEFAULT 0,
        "completed_at" timestamp,
        "completion_quality" varchar(20),
        "ceo_feedback" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "sta_assigned_to_idx" ON "smart_task_assignments" ("assigned_to")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "sta_assigned_by_idx" ON "smart_task_assignments" ("assigned_by")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "sta_status_idx" ON "smart_task_assignments" ("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "sta_priority_score_idx" ON "smart_task_assignments" ("priority_score")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "sta_scheduled_push_time_idx" ON "smart_task_assignments" ("scheduled_push_time")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "sta_challenge_level_idx" ON "smart_task_assignments" ("challenge_level")`);

    // --- Table 2: employee_state_signals ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "employee_state_signals" (
        "id" serial PRIMARY KEY NOT NULL,
        "employee_id" integer NOT NULL,
        "signal_type" varchar(30) NOT NULL,
        "detected_at" timestamp DEFAULT now(),
        "source" varchar(20) DEFAULT 'uwb',
        "zone_id" varchar(50),
        "station_id" integer,
        "confidence" decimal(3,2) DEFAULT 1.0,
        "metadata" json,
        "expires_at" timestamp,
        "created_at" timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "ess_employee_id_idx" ON "employee_state_signals" ("employee_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "ess_signal_type_idx" ON "employee_state_signals" ("signal_type")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "ess_detected_at_idx" ON "employee_state_signals" ("detected_at")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "ess_employee_signal_idx" ON "employee_state_signals" ("employee_id", "signal_type")`);

    // --- Table 3: kpi_proactive_alerts ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "kpi_proactive_alerts" (
        "id" serial PRIMARY KEY NOT NULL,
        "employee_id" integer,
        "employee_name" varchar(100),
        "department_id" varchar(50),
        "kpi_domain" varchar(100) NOT NULL,
        "current_value" decimal(10,2),
        "target_value" decimal(10,2),
        "predicted_value" decimal(10,2),
        "trend_direction" varchar(10),
        "risk_level" varchar(20) DEFAULT 'normal',
        "alert_message" text NOT NULL,
        "suggested_action" text,
        "suggested_task_id" integer,
        "acknowledged_by" integer,
        "acknowledged_at" timestamp,
        "auto_generated_task" boolean DEFAULT false,
        "period_start" varchar(10),
        "period_end" varchar(10),
        "calculated_at" timestamp DEFAULT now(),
        "created_at" timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "kpa_employee_id_idx" ON "kpi_proactive_alerts" ("employee_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "kpa_kpi_domain_idx" ON "kpi_proactive_alerts" ("kpi_domain")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "kpa_risk_level_idx" ON "kpi_proactive_alerts" ("risk_level")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "kpa_trend_direction_idx" ON "kpi_proactive_alerts" ("trend_direction")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "kpa_calculated_at_idx" ON "kpi_proactive_alerts" ("calculated_at")`);

    // --- Table 4: motivation_moments ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "motivation_moments" (
        "id" serial PRIMARY KEY NOT NULL,
        "employee_id" integer NOT NULL,
        "employee_name" varchar(100),
        "moment_type" varchar(30) NOT NULL,
        "trigger_event" text NOT NULL,
        "ceo_message" text,
        "delivery_method" varchar(20) DEFAULT 'in_app',
        "delivered_at" timestamp,
        "employee_reaction" varchar(20),
        "reaction_note" text,
        "kpi_boost_awarded" integer DEFAULT 0,
        "points_awarded" integer DEFAULT 0,
        "visibility" varchar(20) DEFAULT 'private',
        "created_by" integer,
        "created_at" timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "mm_employee_id_idx" ON "motivation_moments" ("employee_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "mm_moment_type_idx" ON "motivation_moments" ("moment_type")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "mm_delivered_at_idx" ON "motivation_moments" ("delivered_at")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "mm_visibility_idx" ON "motivation_moments" ("visibility")`);

    // --- Table 5: technical_assist_sessions ---
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "technical_assist_sessions" (
        "id" serial PRIMARY KEY NOT NULL,
        "request_title" varchar(300) NOT NULL,
        "request_description" text,
        "requested_by" integer NOT NULL,
        "requested_by_name" varchar(100),
        "project_id" integer,
        "process_code" varchar(20),
        "difficulty_level" varchar(20) DEFAULT 'hard',
        "status" varchar(20) DEFAULT 'open',
        "analysis_tools" json,
        "suggested_experts" json,
        "scheduled_at" timestamp,
        "meeting_link" varchar(500),
        "resolution" text,
        "resolution_attachments" json,
        "resolved_by" integer,
        "resolved_by_name" varchar(100),
        "time_to_resolution_hours" decimal(8,2),
        "lessons_learned" text,
        "knowledge_base_linked" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "tas_requested_by_idx" ON "technical_assist_sessions" ("requested_by")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "tas_status_idx" ON "technical_assist_sessions" ("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "tas_difficulty_level_idx" ON "technical_assist_sessions" ("difficulty_level")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "tas_project_id_idx" ON "technical_assist_sessions" ("project_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "tas_scheduled_at_idx" ON "technical_assist_sessions" ("scheduled_at")`);

    tablesEnsured = true;
    log.info("CEO motivation tables ensured");
  } catch (err) {
    log.error({ err }, "Failed to ensure CEO motivation tables");
  }
}

// ─── Motivation Note Auto-Suggestions ─────────────────────────
function generateMotivationalNote(challengeLevel: string, taskTitle: string): string {
  const suggestions: Record<string, string[]> = {
    easy: [
      `轻松搞定「${taskTitle}」，为更大的挑战热身！`,
      `这个任务是你的舒适区，快速完成后看看还能做什么。`,
    ],
    normal: [
      `「${taskTitle}」正好匹配你的能力，期待你的高质量交付。`,
      `稳扎稳打完成「${taskTitle}」，这是团队信任的体现。`,
    ],
    challenging: [
      `「${taskTitle}」有一定挑战，但我相信你能突破。遇到困难随时沟通！`,
      `挑战任务「${taskTitle}」交给你，是因为你具备这个潜力。加油！`,
    ],
    stretch: [
      `「${taskTitle}」是一个突破性任务——完成它意味着你进入了新的层次！`,
      `CEO亲自指派的拉伸任务「${taskTitle}」，这是对你能力的最高认可。全力以赴！`,
    ],
  };
  const pool = suggestions[challengeLevel] || suggestions.normal;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Router ─────────────────────────────────────────────────────
export const ceoMotivationRouter = router({
  // ═══════════════════════════════════════════════════════════════
  //  Smart Task Assignment (8)
  // ═══════════════════════════════════════════════════════════════

  /** 1. 创建智能任务 */
  createSmartTask: requirePermission('mfg:mes:dispatch')
    .input(z.object({
      taskTitle: z.string().min(1).max(300),
      taskDescription: z.string().optional(),
      challengeLevel: z.enum(['easy', 'normal', 'challenging', 'stretch']).default('normal'),
      assignedTo: z.number().int(),
      assignedToName: z.string().max(100).optional(),
      assignedBy: z.number().int(),
      assignedByName: z.string().max(100).optional(),
      projectId: z.number().int().optional(),
      processCode: z.string().max(20).optional(),
      estimatedHours: z.string().optional(),
      deadlineAt: z.string().optional(),
      priorityScore: z.number().int().min(1).max(10).default(5),
      motivationalNote: z.string().optional(),
      technicalHints: z.string().optional(),
      collaboratorIds: z.array(z.number()).optional(),
      scheduledPushTime: z.string().optional(),
      flashAnnotation: z.string().optional(),
      flashUntilAcknowledged: z.boolean().default(true),
      employeeStateRequired: z.enum(['seated', 'focused', 'post_meeting', 'morning_arrival']).optional(),
      kpiImpactArea: z.string().max(100).optional(),
      kpiBoostPoints: z.number().int().default(0),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // Auto-generate motivational note if not provided
      const motivationalNote = input.motivationalNote
        || generateMotivationalNote(input.challengeLevel, input.taskTitle);

      const [created] = await db
        .insert(smartTaskAssignments)
        .values({
          ...input,
          motivationalNote,
          collaboratorIds: input.collaboratorIds ?? null,
        })
        .returning();

      log.info({ taskId: created.id, assignedTo: input.assignedTo }, "Smart task created");
      return { success: true, task: created };
    }),

  /** 2. 查询任务列表 */
  listSmartTasks: protectedProcedure
    .input(z.object({
      assignedTo: z.number().int().optional(),
      status: z.enum(['pending', 'accepted', 'in_progress', 'blocked', 'completed', 'exceeded']).optional(),
      challengeLevel: z.enum(['easy', 'normal', 'challenging', 'stretch']).optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conditions = [];
      if (input.assignedTo != null) conditions.push(eq(smartTaskAssignments.assignedTo, input.assignedTo));
      if (input.status) conditions.push(eq(smartTaskAssignments.status, input.status));
      if (input.challengeLevel) conditions.push(eq(smartTaskAssignments.challengeLevel, input.challengeLevel));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(smartTaskAssignments)
        .where(where)
        .orderBy(desc(smartTaskAssignments.priorityScore), desc(smartTaskAssignments.createdAt))
        .limit(input.limit);

      return { tasks: rows, total: rows.length };
    }),

  /** 3. 获取单个任务 */
  getSmartTask: protectedProcedure
    .input(z.object({ id: flexibleId }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [task] = await db
        .select()
        .from(smartTaskAssignments)
        .where(eq(smartTaskAssignments.id, Number(input.id)))
        .limit(1);
      return { task: task ?? null };
    }),

  /** 4. 确认接受任务 */
  acknowledgeTask: protectedProcedure
    .input(z.object({ id: flexibleId }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [updated] = await db
        .update(smartTaskAssignments)
        .set({
          acknowledgedAt: sql`now()`.mapWith(String),
          status: 'accepted',
          updatedAt: sql`now()`.mapWith(String),
        })
        .where(eq(smartTaskAssignments.id, Number(input.id)))
        .returning();
      log.info({ taskId: Number(input.id) }, "Task acknowledged");
      return { success: true, task: updated };
    }),

  /** 5. 更新任务进度 */
  updateTaskProgress: protectedProcedure
    .input(z.object({
      id: flexibleId,
      status: z.enum(['pending', 'accepted', 'in_progress', 'blocked', 'completed', 'exceeded']),
      completionQuality: z.enum(['outstanding', 'good', 'acceptable', 'needs_improvement']).optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const updates: Record<string, unknown> = {
        status: input.status,
        updatedAt: sql`now()`,
      };
      if (input.completionQuality) updates.completionQuality = input.completionQuality;

      const [updated] = await db
        .update(smartTaskAssignments)
        .set(updates)
        .where(eq(smartTaskAssignments.id, Number(input.id)))
        .returning();
      return { success: true, task: updated };
    }),

  /** 6. 完成任务 + 奖励KPI积分 */
  completeTask: protectedProcedure
    .input(z.object({
      id: flexibleId,
      completionQuality: z.enum(['outstanding', 'good', 'acceptable', 'needs_improvement']),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // Get the task to read kpiBoostPoints
      const [task] = await db
        .select()
        .from(smartTaskAssignments)
        .where(eq(smartTaskAssignments.id, Number(input.id)))
        .limit(1);

      if (!task) return { success: false, error: "Task not found" };

      const [updated] = await db
        .update(smartTaskAssignments)
        .set({
          status: 'completed',
          completedAt: sql`now()`.mapWith(String),
          completionQuality: input.completionQuality,
          updatedAt: sql`now()`.mapWith(String),
        })
        .where(eq(smartTaskAssignments.id, Number(input.id)))
        .returning();

      log.info({ taskId: Number(input.id), quality: input.completionQuality, kpiBoost: task.kpiBoostPoints }, "Task completed");
      return { success: true, task: updated, kpiBoostAwarded: task.kpiBoostPoints ?? 0 };
    }),

  /** 7. CEO反馈 */
  addCeoFeedback: requirePermission('mfg:mes:dispatch')
    .input(z.object({
      id: flexibleId,
      ceoFeedback: z.string().min(1),
      kpiBoostPoints: z.number().int().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const updates: Record<string, unknown> = {
        ceoFeedback: input.ceoFeedback,
        updatedAt: sql`now()`,
      };
      if (input.kpiBoostPoints != null) updates.kpiBoostPoints = input.kpiBoostPoints;

      const [updated] = await db
        .update(smartTaskAssignments)
        .set(updates)
        .where(eq(smartTaskAssignments.id, Number(input.id)))
        .returning();
      log.info({ taskId: Number(input.id) }, "CEO feedback added");
      return { success: true, task: updated };
    }),

  /** 8. 获取待闪烁推送的任务 */
  getPendingFlashTasks: protectedProcedure
    .input(z.object({ employeeId: z.number().int() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db
        .select()
        .from(smartTaskAssignments)
        .where(and(
          eq(smartTaskAssignments.assignedTo, input.employeeId),
          eq(smartTaskAssignments.flashUntilAcknowledged, true),
          isNull(smartTaskAssignments.acknowledgedAt),
          or(
            isNull(smartTaskAssignments.scheduledPushTime),
            lte(smartTaskAssignments.scheduledPushTime, sql`now()`.mapWith(String)),
          ),
        ))
        .orderBy(desc(smartTaskAssignments.priorityScore))
        .limit(50);
      return { tasks: rows };
    }),

  // ═══════════════════════════════════════════════════════════════
  //  Employee State Signals (5)
  // ═══════════════════════════════════════════════════════════════

  /** 9. 记录状态信号 */
  recordStateSignal: protectedProcedure
    .input(z.object({
      employeeId: z.number().int(),
      signalType: z.enum(['seated', 'arrived', 'focused', 'in_meeting', 'break', 'left', 'high_energy', 'low_energy', 'post_achievement']),
      source: z.enum(['uwb', 'manual', 'calendar', 'system']).default('uwb'),
      zoneId: z.string().max(50).optional(),
      stationId: z.number().int().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [created] = await db
        .insert(employeeStateSignals)
        .values({
          employeeId: input.employeeId,
          signalType: input.signalType,
          source: input.source,
          zoneId: input.zoneId ?? null,
          stationId: input.stationId ?? null,
          metadata: input.metadata ?? null,
        })
        .returning();
      return { success: true, signal: created };
    }),

  /** 10. 获取员工当前综合状态 */
  getEmployeeCurrentState: protectedProcedure
    .input(z.object({ employeeId: z.number().int() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Get latest signal per type for this employee
      const signals = await db.execute(sql`
        SELECT DISTINCT ON (signal_type) *
        FROM employee_state_signals
        WHERE employee_id = ${input.employeeId}
        ORDER BY signal_type, detected_at DESC
      `);
      // Also get the absolute latest signal
      const [latest] = await db
        .select()
        .from(employeeStateSignals)
        .where(eq(employeeStateSignals.employeeId, input.employeeId))
        .orderBy(desc(employeeStateSignals.detectedAt))
        .limit(1);

      return {
        employeeId: input.employeeId,
        latestSignal: latest ?? null,
        signalsByType: signals.rows ?? signals,
      };
    }),

  /** 11. 获取团队到位情况 */
  getTeamPresence: protectedProcedure
    .query(async () => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.execute(sql`
        SELECT DISTINCT ON (employee_id) employee_id, signal_type, detected_at, zone_id, source
        FROM employee_state_signals
        WHERE signal_type IN ('arrived', 'seated', 'left', 'break', 'focused', 'in_meeting')
        ORDER BY employee_id, detected_at DESC
      `);
      return { presence: rows.rows ?? rows };
    }),

  /** 12. 检查任务触发条件 */
  checkTaskTriggerConditions: protectedProcedure
    .input(z.object({ employeeId: z.number().int() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // Get employee's latest state
      const [latestSignal] = await db
        .select()
        .from(employeeStateSignals)
        .where(eq(employeeStateSignals.employeeId, input.employeeId))
        .orderBy(desc(employeeStateSignals.detectedAt))
        .limit(1);

      if (!latestSignal) return { matchingTasks: [], currentState: null };

      // Find pending tasks that match the employee's current state
      const matchingTasks = await db
        .select()
        .from(smartTaskAssignments)
        .where(and(
          eq(smartTaskAssignments.assignedTo, input.employeeId),
          eq(smartTaskAssignments.status, 'pending'),
          eq(smartTaskAssignments.employeeStateRequired, latestSignal.signalType),
        ))
        .orderBy(desc(smartTaskAssignments.priorityScore))
        .limit(50);

      return { matchingTasks, currentState: latestSignal.signalType };
    }),

  /** 13. 状态信号历史 */
  getStateHistory: protectedProcedure
    .input(z.object({
      employeeId: z.number().int(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conditions = [eq(employeeStateSignals.employeeId, input.employeeId)];
      if (input.dateFrom) {
        conditions.push(sql`${employeeStateSignals.detectedAt} >= ${input.dateFrom}` as any);
      }
      if (input.dateTo) {
        conditions.push(sql`${employeeStateSignals.detectedAt} <= ${input.dateTo}` as any);
      }
      const rows = await db
        .select()
        .from(employeeStateSignals)
        .where(and(...conditions))
        .orderBy(desc(employeeStateSignals.detectedAt))
        .limit(input.limit);
      return { history: rows };
    }),

  // ═══════════════════════════════════════════════════════════════
  //  KPI Proactive Alerts (7)
  // ═══════════════════════════════════════════════════════════════

  /** 14. 生成KPI预警（批量扫描） */
  generateKpiAlerts: requirePermission('mfg:mes:dispatch')
    .input(z.object({
      periodStart: z.string().optional(),
      periodEnd: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // Scan: compute trends and generate alerts for each KPI domain
      const kpiDomains = ['quality', 'delivery', 'cost', 'efficiency', 'innovation', 'collaboration'];
      const now = new Date().toISOString().slice(0, 10);
      const periodStart = input.periodStart || `${now.slice(0, 7)}-01`;
      const periodEnd = input.periodEnd || now;

      // Simulate AI-driven KPI scan: generate sample alerts for declining trends
      // In production, this would query actual KPI metrics tables
      const sampleAlerts = kpiDomains.flatMap(domain => {
        const currentVal = 60 + Math.floor(Math.random() * 35);
        const targetVal = 85;
        const predicted = currentVal + Math.floor(Math.random() * 10) - 5;
        const trend = predicted < currentVal ? 'declining' : predicted > targetVal ? 'improving' : 'stable';
        const risk = predicted < 60 ? 'critical' : predicted < 70 ? 'warning' : predicted < 80 ? 'watch' : 'normal';

        if (risk === 'normal') return [];

        return [{
          kpiDomain: domain,
          currentValue: String(currentVal),
          targetValue: String(targetVal),
          predictedValue: String(predicted),
          trendDirection: trend,
          riskLevel: risk,
          alertMessage: `${domain}域KPI预测月底值${predicted}，低于目标${targetVal}，建议关注`,
          suggestedAction: `建议分配${domain}相关任务或安排技术攻关`,
          periodStart,
          periodEnd,
        }];
      });

      if (sampleAlerts.length === 0) {
        return { success: true, alertsGenerated: 0 };
      }

      const inserted = await db
        .insert(kpiProactiveAlerts)
        .values(sampleAlerts)
        .returning();

      log.info({ count: inserted.length }, "KPI proactive alerts generated");
      return { success: true, alertsGenerated: inserted.length, alerts: inserted };
    }),

  /** 15. 查询KPI预警列表 */
  listKpiAlerts: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().optional(),
      kpiDomain: z.string().optional(),
      riskLevel: z.enum(['normal', 'watch', 'warning', 'critical']).optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conditions = [];
      if (input.employeeId != null) conditions.push(eq(kpiProactiveAlerts.employeeId, input.employeeId));
      if (input.kpiDomain) conditions.push(eq(kpiProactiveAlerts.kpiDomain, input.kpiDomain));
      if (input.riskLevel) conditions.push(eq(kpiProactiveAlerts.riskLevel, input.riskLevel));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(kpiProactiveAlerts)
        .where(where)
        .orderBy(desc(kpiProactiveAlerts.calculatedAt))
        .limit(input.limit);
      return { alerts: rows, total: rows.length };
    }),

  /** 16. KPI趋势看板（聚合） */
  getKpiTrendDashboard: protectedProcedure
    .query(async () => {
      await ensureTables();
      const db = await requireDb();

      const [byRisk, byDomain, atRiskCount] = await Promise.all([
        db.execute(sql`
          SELECT risk_level, count(*)::int AS count
          FROM kpi_proactive_alerts
          GROUP BY risk_level
          ORDER BY count DESC
        `),
        db.execute(sql`
          SELECT kpi_domain, risk_level, count(*)::int AS count
          FROM kpi_proactive_alerts
          GROUP BY kpi_domain, risk_level
          ORDER BY kpi_domain
        `),
        db.execute(sql`
          SELECT count(DISTINCT employee_id)::int AS count
          FROM kpi_proactive_alerts
          WHERE risk_level IN ('warning', 'critical')
        `),
      ]);

      return {
        byRiskLevel: byRisk.rows ?? byRisk,
        byDomain: byDomain.rows ?? byDomain,
        employeesAtRisk: ((atRiskCount.rows ?? atRiskCount) as any)[0]?.count ?? 0,
      };
    }),

  /** 17. 确认KPI预警 */
  acknowledgeKpiAlert: protectedProcedure
    .input(z.object({
      id: flexibleId,
      acknowledgedBy: z.number().int(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [updated] = await db
        .update(kpiProactiveAlerts)
        .set({
          acknowledgedBy: input.acknowledgedBy,
          acknowledgedAt: sql`now()`.mapWith(String),
        })
        .where(eq(kpiProactiveAlerts.id, Number(input.id)))
        .returning();
      return { success: true, alert: updated };
    }),

  /** 18. 从预警创建先发制人任务 */
  createPreemptiveTask: requirePermission('mfg:mes:dispatch')
    .input(z.object({ alertId: flexibleId }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // Fetch the alert
      const [alert] = await db
        .select()
        .from(kpiProactiveAlerts)
        .where(eq(kpiProactiveAlerts.id, Number(input.alertId)))
        .limit(1);

      if (!alert) return { success: false, error: "Alert not found" };

      const taskTitle = `KPI改善任务: ${alert.kpiDomain}域预警处理`;
      const motivationalNote = generateMotivationalNote('challenging', taskTitle);
      const technicalHints = `当前值: ${alert.currentValue}, 目标: ${alert.targetValue}, 预测: ${alert.predictedValue}。建议: ${alert.suggestedAction || '分析根因并制定改善计划'}`;

      const [task] = await db
        .insert(smartTaskAssignments)
        .values({
          taskTitle,
          taskDescription: alert.alertMessage,
          challengeLevel: 'challenging',
          assignedTo: alert.employeeId ?? 0,
          assignedToName: alert.employeeName,
          assignedBy: 0, // system
          assignedByName: 'CEO指挥系统',
          kpiImpactArea: alert.kpiDomain,
          kpiBoostPoints: 10,
          motivationalNote,
          technicalHints,
          priorityScore: alert.riskLevel === 'critical' ? 10 : alert.riskLevel === 'warning' ? 8 : 6,
        })
        .returning();

      // Update alert with linked task
      await db
        .update(kpiProactiveAlerts)
        .set({ suggestedTaskId: task.id, autoGeneratedTask: true })
        .where(eq(kpiProactiveAlerts.id, Number(input.alertId)));

      log.info({ alertId: Number(input.alertId), taskId: task.id }, "Preemptive task created from KPI alert");
      return { success: true, task, alert };
    }),

  /** 19. 员工KPI快照 */
  getEmployeeKpiSnapshot: protectedProcedure
    .input(z.object({ employeeId: z.number().int() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.execute(sql`
        SELECT DISTINCT ON (kpi_domain)
          kpi_domain, current_value, target_value, predicted_value, trend_direction, risk_level, calculated_at
        FROM kpi_proactive_alerts
        WHERE employee_id = ${input.employeeId}
        ORDER BY kpi_domain, calculated_at DESC
      `);
      return { employeeId: input.employeeId, domains: rows.rows ?? rows };
    }),

  /** 20. KPI风险矩阵 */
  getKpiRiskMatrix: protectedProcedure
    .query(async () => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db.execute(sql`
        SELECT a.employee_id, a.employee_name, a.kpi_domain, a.risk_level, a.current_value, a.target_value, a.predicted_value
        FROM kpi_proactive_alerts a
        INNER JOIN (
          SELECT employee_id, kpi_domain, MAX(calculated_at) AS max_calc
          FROM kpi_proactive_alerts
          WHERE employee_id IS NOT NULL
          GROUP BY employee_id, kpi_domain
        ) b ON a.employee_id = b.employee_id AND a.kpi_domain = b.kpi_domain AND a.calculated_at = b.max_calc
        ORDER BY a.employee_id, a.kpi_domain
      `);
      return { matrix: rows.rows ?? rows };
    }),

  // ═══════════════════════════════════════════════════════════════
  //  Motivation Moments (6)
  // ═══════════════════════════════════════════════════════════════

  /** 21. 创建激励时刻 */
  createMotivationMoment: requirePermission('mfg:mes:dispatch')
    .input(z.object({
      employeeId: z.number().int(),
      employeeName: z.string().max(100).optional(),
      momentType: z.enum(['challenge_accepted', 'stretch_completed', 'kpi_exceeded', 'peer_recognized', 'streak_maintained', 'breakthrough', 'first_of_kind']),
      triggerEvent: z.string().min(1),
      ceoMessage: z.string().optional(),
      deliveryMethod: z.enum(['in_app', 'flash_annotation', 'team_broadcast', 'one_on_one']).default('in_app'),
      kpiBoostAwarded: z.number().int().default(0),
      pointsAwarded: z.number().int().default(0),
      visibility: z.enum(['private', 'team', 'department', 'company']).default('private'),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const createdBy = ctx.user?.id ? Number(ctx.user.id) : null;

      const [created] = await db
        .insert(motivationMoments)
        .values({
          ...input,
          createdBy,
          deliveredAt: sql`now()`.mapWith(String),
        })
        .returning();

      log.info({ momentId: created.id, employeeId: input.employeeId, type: input.momentType }, "Motivation moment created");
      return { success: true, moment: created };
    }),

  /** 22. 查询激励时刻列表 */
  listMotivationMoments: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().optional(),
      momentType: z.string().optional(),
      visibility: z.enum(['private', 'team', 'department', 'company']).optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conditions = [];
      if (input.employeeId != null) conditions.push(eq(motivationMoments.employeeId, input.employeeId));
      if (input.momentType) conditions.push(eq(motivationMoments.momentType, input.momentType));
      if (input.visibility) conditions.push(eq(motivationMoments.visibility, input.visibility));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(motivationMoments)
        .where(where)
        .orderBy(desc(motivationMoments.createdAt))
        .limit(input.limit);
      return { moments: rows, total: rows.length };
    }),

  /** 23. 记录员工反应 */
  recordReaction: protectedProcedure
    .input(z.object({
      id: flexibleId,
      employeeReaction: z.enum(['inspired', 'grateful', 'motivated', 'neutral']),
      reactionNote: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [updated] = await db
        .update(motivationMoments)
        .set({
          employeeReaction: input.employeeReaction,
          reactionNote: input.reactionNote ?? null,
        })
        .where(eq(motivationMoments.id, Number(input.id)))
        .returning();
      return { success: true, moment: updated };
    }),

  /** 24. 员工激励时间线 */
  getMotivationTimeline: protectedProcedure
    .input(z.object({ employeeId: z.number().int() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const rows = await db
        .select()
        .from(motivationMoments)
        .where(eq(motivationMoments.employeeId, input.employeeId))
        .orderBy(desc(motivationMoments.createdAt))
        .limit(200);
      return { timeline: rows };
    }),

  /** 25. 团队激励看板 */
  getTeamMotivationBoard: protectedProcedure
    .query(async () => {
      await ensureTables();
      const db = await requireDb();

      const [recentCompany, topMotivated, streakLeaders] = await Promise.all([
        // Recent company-visible moments
        db
          .select()
          .from(motivationMoments)
          .where(eq(motivationMoments.visibility, 'company'))
          .orderBy(desc(motivationMoments.createdAt))
          .limit(20),
        // Top motivated employees (most moments)
        db.execute(sql`
          SELECT employee_id, employee_name, count(*)::int AS moment_count,
                 sum(points_awarded)::int AS total_points
          FROM motivation_moments
          GROUP BY employee_id, employee_name
          ORDER BY moment_count DESC
          LIMIT 10
        `),
        // Streak leaders (streak_maintained type)
        db.execute(sql`
          SELECT employee_id, employee_name, count(*)::int AS streak_count
          FROM motivation_moments
          WHERE moment_type = 'streak_maintained'
          GROUP BY employee_id, employee_name
          ORDER BY streak_count DESC
          LIMIT 10
        `),
      ]);

      return {
        recentCompanyMoments: recentCompany,
        topMotivatedEmployees: topMotivated.rows ?? topMotivated,
        streakLeaders: streakLeaders.rows ?? streakLeaders,
      };
    }),

  /** 26. CEO激励统计 */
  getCeoMotivationStats: protectedProcedure
    .query(async () => {
      await ensureTables();
      const db = await requireDb();

      const [monthStats, reactionDist, typeDist] = await Promise.all([
        db.execute(sql`
          SELECT count(*)::int AS total_moments,
                 avg(CASE
                   WHEN employee_reaction = 'inspired' THEN 4
                   WHEN employee_reaction = 'motivated' THEN 3
                   WHEN employee_reaction = 'grateful' THEN 3
                   WHEN employee_reaction = 'neutral' THEN 1
                   ELSE NULL
                 END)::decimal(3,1) AS avg_reaction_score
          FROM motivation_moments
          WHERE created_at >= date_trunc('month', now())
        `),
        db.execute(sql`
          SELECT employee_reaction, count(*)::int AS count
          FROM motivation_moments
          WHERE employee_reaction IS NOT NULL
          GROUP BY employee_reaction
        `),
        db.execute(sql`
          SELECT moment_type, count(*)::int AS count
          FROM motivation_moments
          GROUP BY moment_type
          ORDER BY count DESC
        `),
      ]);

      return {
        thisMonth: ((monthStats.rows ?? monthStats) as any)[0] ?? { total_moments: 0, avg_reaction_score: null },
        reactionDistribution: reactionDist.rows ?? reactionDist,
        typeDistribution: typeDist.rows ?? typeDist,
      };
    }),

  // ═══════════════════════════════════════════════════════════════
  //  Technical Assist Sessions (8)
  // ═══════════════════════════════════════════════════════════════

  /** 27. 创建技术攻关会话 */
  createAssistSession: protectedProcedure
    .input(z.object({
      requestTitle: z.string().min(1).max(300),
      requestDescription: z.string().optional(),
      projectId: z.number().int().optional(),
      processCode: z.string().max(20).optional(),
      difficultyLevel: z.enum(['moderate', 'hard', 'extreme', 'breakthrough']).default('hard'),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const userId = ctx.user?.id ? Number(ctx.user.id) : 0;
      const userName = ctx.user?.name || '';

      const [created] = await db
        .insert(technicalAssistSessions)
        .values({
          ...input,
          requestedBy: userId,
          requestedByName: userName,
        })
        .returning();

      log.info({ sessionId: created.id, difficulty: input.difficultyLevel }, "Technical assist session created");
      return { success: true, session: created };
    }),

  /** 28. AI分析并推荐工具+专家 */
  analyzeAndSuggest: requirePermission('mfg:mes:dispatch')
    .input(z.object({ id: flexibleId }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const [session] = await db
        .select()
        .from(technicalAssistSessions)
        .where(eq(technicalAssistSessions.id, Number(input.id)))
        .limit(1);

      if (!session) return { success: false, error: "Session not found" };

      // Auto-populate analysis tools based on difficulty
      const analysisTools = [
        { tool: '5M1E分析', description: '人/机/料/法/环/测六要素排查', url: '/tools/5m1e' },
        { tool: '鱼骨图', description: '因果分析图，逐层分解根因', url: '/tools/fishbone' },
        { tool: 'FMEA', description: '失效模式与影响分析', url: '/tools/fmea' },
        { tool: 'Pareto分析', description: '帕累托图，识别关键少数', url: '/tools/pareto' },
        { tool: 'SPC控制图', description: '统计过程控制，监控异常波动', url: '/tools/spc' },
      ];

      // Query employee competence for expert suggestions
      let suggestedExperts: Array<{ employeeId: number; name: string; expertise: string; availability: string }> = [];
      try {
        const experts = await db.execute(sql`
          SELECT DISTINCT ON (u.id) u.id AS employee_id, u.full_name AS name,
                 'domain_expert' AS expertise, 'available' AS availability
          FROM users u
          WHERE u.role IN ('engineer', 'senior_engineer', 'tech_lead', 'cto')
          ORDER BY u.id
          LIMIT 5
        `);
        suggestedExperts = ((experts.rows ?? experts) as any[]).map(e => ({
          employeeId: Number(e.employee_id),
          name: String(e.name || ''),
          expertise: String(e.expertise || 'domain_expert'),
          availability: String(e.availability || 'available'),
        }));
      } catch {
        // If users table query fails, provide empty list
        suggestedExperts = [];
      }

      const [updated] = await db
        .update(technicalAssistSessions)
        .set({
          analysisTools: JSON.stringify(analysisTools),
          suggestedExperts: JSON.stringify(suggestedExperts),
          status: 'analyzing',
          updatedAt: sql`now()`.mapWith(String),
        })
        .where(eq(technicalAssistSessions.id, Number(input.id)))
        .returning();

      log.info({ sessionId: Number(input.id), expertCount: suggestedExperts.length }, "Analysis and suggestions generated");
      return { success: true, session: updated, analysisTools, suggestedExperts };
    }),

  /** 29. 安排协作会议 */
  scheduleCollaboration: requirePermission('mfg:mes:dispatch')
    .input(z.object({
      id: flexibleId,
      scheduledAt: z.string(),
      meetingLink: z.string().max(500).optional(),
      expertIds: z.array(z.number().int()),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [updated] = await db
        .update(technicalAssistSessions)
        .set({
          scheduledAt: input.scheduledAt,
          meetingLink: input.meetingLink ?? null,
          status: 'scheduled',
          updatedAt: sql`now()`.mapWith(String),
        })
        .where(eq(technicalAssistSessions.id, Number(input.id)))
        .returning();
      log.info({ sessionId: Number(input.id), scheduledAt: input.scheduledAt, experts: input.expertIds }, "Collaboration scheduled");
      return { success: true, session: updated };
    }),

  /** 30. 解决会话 */
  resolveSession: protectedProcedure
    .input(z.object({
      id: flexibleId,
      resolution: z.string().min(1),
      resolvedBy: z.number().int(),
      resolvedByName: z.string().max(100),
      lessonsLearned: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // Calculate time to resolution
      const [session] = await db
        .select()
        .from(technicalAssistSessions)
        .where(eq(technicalAssistSessions.id, Number(input.id)))
        .limit(1);

      let timeToResolutionHours: string | null = null;
      if (session?.createdAt) {
        const created = new Date(session.createdAt).getTime();
        const now = Date.now();
        timeToResolutionHours = ((now - created) / (1000 * 60 * 60)).toFixed(2);
      }

      const [updated] = await db
        .update(technicalAssistSessions)
        .set({
          resolution: input.resolution,
          resolvedBy: input.resolvedBy,
          resolvedByName: input.resolvedByName,
          lessonsLearned: input.lessonsLearned ?? null,
          timeToResolutionHours,
          status: 'resolved',
          updatedAt: sql`now()`.mapWith(String),
        })
        .where(eq(technicalAssistSessions.id, Number(input.id)))
        .returning();

      log.info({ sessionId: Number(input.id), hours: timeToResolutionHours }, "Session resolved");
      return { success: true, session: updated };
    }),

  /** 31. 列表查询 */
  listAssistSessions: protectedProcedure
    .input(z.object({
      status: z.enum(['open', 'analyzing', 'scheduled', 'in_progress', 'resolved', 'escalated']).optional(),
      difficultyLevel: z.enum(['moderate', 'hard', 'extreme', 'breakthrough']).optional(),
      requestedBy: z.number().int().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conditions = [];
      if (input.status) conditions.push(eq(technicalAssistSessions.status, input.status));
      if (input.difficultyLevel) conditions.push(eq(technicalAssistSessions.difficultyLevel, input.difficultyLevel));
      if (input.requestedBy != null) conditions.push(eq(technicalAssistSessions.requestedBy, input.requestedBy));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(technicalAssistSessions)
        .where(where)
        .orderBy(desc(technicalAssistSessions.createdAt))
        .limit(input.limit);
      return { sessions: rows, total: rows.length };
    }),

  /** 32. 获取会话详情 */
  getSessionDetail: protectedProcedure
    .input(z.object({ id: flexibleId }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [session] = await db
        .select()
        .from(technicalAssistSessions)
        .where(eq(technicalAssistSessions.id, Number(input.id)))
        .limit(1);
      return { session: session ?? null };
    }),

  /** 33. 关联知识库 */
  linkToKnowledgeBase: requirePermission('mfg:mes:dispatch')
    .input(z.object({ id: flexibleId }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [updated] = await db
        .update(technicalAssistSessions)
        .set({
          knowledgeBaseLinked: true,
          updatedAt: sql`now()`.mapWith(String),
        })
        .where(eq(technicalAssistSessions.id, Number(input.id)))
        .returning();
      log.info({ sessionId: Number(input.id) }, "Session linked to knowledge base");
      return { success: true, session: updated };
    }),

  /** 34. 技术攻关仪表盘 */
  getAssistDashboard: protectedProcedure
    .query(async () => {
      await ensureTables();
      const db = await requireDb();

      const [openCount, avgResolution, topRequesters, commonDomains] = await Promise.all([
        db.execute(sql`
          SELECT status, count(*)::int AS count
          FROM technical_assist_sessions
          GROUP BY status
          ORDER BY count DESC
        `),
        db.execute(sql`
          SELECT avg(time_to_resolution_hours)::decimal(8,2) AS avg_hours,
                 min(time_to_resolution_hours)::decimal(8,2) AS min_hours,
                 max(time_to_resolution_hours)::decimal(8,2) AS max_hours
          FROM technical_assist_sessions
          WHERE status = 'resolved' AND time_to_resolution_hours IS NOT NULL
        `),
        db.execute(sql`
          SELECT requested_by, requested_by_name, count(*)::int AS request_count
          FROM technical_assist_sessions
          GROUP BY requested_by, requested_by_name
          ORDER BY request_count DESC
          LIMIT 10
        `),
        db.execute(sql`
          SELECT process_code, count(*)::int AS count
          FROM technical_assist_sessions
          WHERE process_code IS NOT NULL
          GROUP BY process_code
          ORDER BY count DESC
          LIMIT 10
        `),
      ]);

      return {
        statusBreakdown: openCount.rows ?? openCount,
        resolutionStats: ((avgResolution.rows ?? avgResolution) as any)[0] ?? { avg_hours: null, min_hours: null, max_hours: null },
        topRequesters: topRequesters.rows ?? topRequesters,
        commonDomains: commonDomains.rows ?? commonDomains,
      };
    }),
});
