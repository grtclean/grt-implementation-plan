/**
 * Violation Event Router — Red-Line Event Bus
 *
 * CRUD for violation events + severity-based auto-freeze logic.
 * When a MAJOR/CRITICAL violation is confirmed, the system automatically
 * freezes the associated performance record.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { violationEvents, performanceRecords } from "../../drizzle/performance-schema";
import { eq, and, desc, sql, count, type SQL } from "drizzle-orm";

export const violationEventRouter = router({
  /**
   * list — paginated violation events with optional filters
   */
  list: protectedProcedure
    .input(z.object({
      buId: z.number().optional(),
      userId: z.number().optional(),
      severity: z.enum(["MINOR", "MAJOR", "CRITICAL"]).optional(),
      status: z.enum(["open", "investigating", "confirmed", "resolved", "dismissed"]).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const conditions: SQL[] = [];
      if (input.buId) conditions.push(eq(violationEvents.buId, input.buId));
      if (input.userId) conditions.push(eq(violationEvents.userId, input.userId));
      if (input.severity) conditions.push(eq(violationEvents.severity, input.severity));
      if (input.status) conditions.push(eq(violationEvents.status, input.status));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, totalResult] = await Promise.all([
        db.select().from(violationEvents)
          .where(where)
          .orderBy(desc(violationEvents.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ total: count() }).from(violationEvents).where(where),
      ]);

      return {
        items: rows,
        total: totalResult[0]?.total ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * getById — single event detail
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(violationEvents).where(eq(violationEvents.id, input.id));
      if (!row) throw new Error("Violation event not found");
      return row;
    }),

  /**
   * create — report a new violation event
   * If severity >= MAJOR, auto-freezes matching performance record.
   */
  create: protectedProcedure
    .input(z.object({
      eventType: z.string(),
      severity: z.enum(["MINOR", "MAJOR", "CRITICAL"]),
      sourceModule: z.string().optional(),
      buId: z.number().optional(),
      departmentId: z.number().optional(),
      userId: z.number().optional(),
      projectId: z.number().optional(),
      title: z.string(),
      description: z.string().optional(),
      impactDescription: z.string().optional(),
      triggeredBy: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      const [event] = await db.insert(violationEvents).values({
        ...input,
        status: "open",
        triggeredBy: input.triggeredBy ?? ctx.user?.name ?? "system",
      }).returning();

      // Auto-freeze on MAJOR/CRITICAL
      if (input.severity !== "MINOR" && input.buId) {
        await autoFreezePerformance(db, event.id, input.buId, input.severity, input.title);
      }

      return event;
    }),

  /**
   * updateStatus — transition event status (investigating → confirmed → resolved)
   */
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["open", "investigating", "confirmed", "resolved", "dismissed"]),
      resolutionNotes: z.string().optional(),
      correctionPlan: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      const updates: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date().toISOString(),
      };

      if (input.resolutionNotes) updates.resolutionNotes = input.resolutionNotes;
      if (input.correctionPlan) updates.correctionPlan = input.correctionPlan;

      if (input.status === "resolved" || input.status === "dismissed") {
        updates.resolvedAt = new Date().toISOString();
        updates.resolvedBy = ctx.user?.name ?? "system";
      }

      const [updated] = await db.update(violationEvents)
        .set(updates as any)
        .where(eq(violationEvents.id, input.id))
        .returning();

      // If resolved/dismissed AND it froze a performance record → optionally unfreeze
      if ((input.status === "resolved" || input.status === "dismissed") && updated?.frozePerformanceId) {
        try {
          await db.update(performanceRecords).set({
            isFrozen: false,
            updatedAt: new Date().toISOString(),
          }).where(eq(performanceRecords.id, updated.frozePerformanceId));
        } catch {
          // best-effort unfreeze
        }
      }

      return updated;
    }),

  /**
   * addActionItems — attach investigation action items to event
   */
  addActionItems: protectedProcedure
    .input(z.object({
      id: z.number(),
      actionItems: z.array(z.object({
        step: z.number(),
        description: z.string(),
        responsible: z.string(),
        deadline: z.string().optional(),
        status: z.string().default("pending"),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [updated] = await db.update(violationEvents)
        .set({
          actionItemsJson: input.actionItems,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(violationEvents.id, input.id))
        .returning();
      return updated;
    }),

  /**
   * stats — summary counts by severity and status
   */
  stats: protectedProcedure
    .input(z.object({ buId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      try {
        const rows = await db.select().from(violationEvents)
          .where(input.buId ? eq(violationEvents.buId, input.buId) : undefined);

        const bySeverity = { MINOR: 0, MAJOR: 0, CRITICAL: 0 };
        const byStatus = { open: 0, investigating: 0, confirmed: 0, resolved: 0, dismissed: 0 };

        for (const r of rows) {
          if (r.severity in bySeverity) bySeverity[r.severity as keyof typeof bySeverity]++;
          if (r.status in byStatus) byStatus[r.status as keyof typeof byStatus]++;
        }

        return {
          total: rows.length,
          bySeverity,
          byStatus,
          activeCount: rows.filter(r => r.status !== "resolved" && r.status !== "dismissed").length,
        };
      } catch {
        return {
          total: 0,
          bySeverity: { MINOR: 0, MAJOR: 0, CRITICAL: 0 },
          byStatus: { open: 0, investigating: 0, confirmed: 0, resolved: 0, dismissed: 0 },
          activeCount: 0,
        };
      }
    }),

  /**
   * seedDemo — create demo violation events for testing
   */
  seedDemo: protectedProcedure.mutation(async () => {
    const db = await requireDb();

    // Ensure table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS violation_events (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        severity violation_severity NOT NULL DEFAULT 'MINOR',
        source_module VARCHAR(50),
        bu_id INTEGER,
        department_id INTEGER,
        user_id INTEGER,
        project_id INTEGER,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        evidence_json JSONB,
        impact_description TEXT,
        correction_plan TEXT,
        action_items_json JSONB,
        froze_performance_id INTEGER,
        status violation_status NOT NULL DEFAULT 'open',
        triggered_by VARCHAR(50),
        resolved_by VARCHAR(50),
        resolved_at TIMESTAMP,
        resolution_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const demoEvents = [
      {
        eventType: "quality_defect",
        severity: "MAJOR" as const,
        sourceModule: "quality",
        buId: 1,
        title: "客户退货：清洗机喷嘴压力不达标",
        description: "海外BU出货的UCS-3000型号喷嘴压力测试不合格，客户批量退货12台。",
        triggeredBy: "system",
        status: "investigating" as const,
      },
      {
        eventType: "safety_incident",
        severity: "CRITICAL" as const,
        sourceModule: "safety",
        buId: 2,
        title: "车间操作人员手部轻伤事故",
        description: "商用车BU装配线工人未佩戴防护手套操作切割设备，导致手指划伤。",
        triggeredBy: "安全主管",
        status: "open" as const,
      },
      {
        eventType: "compliance_breach",
        severity: "MINOR" as const,
        sourceModule: "compliance",
        buId: 3,
        title: "IATF 16949文档过期未更新",
        description: "乘用车BU的3份SOP文件超过审核周期（12个月）未更新。",
        triggeredBy: "system",
        status: "confirmed" as const,
      },
    ];

    const results = [];
    for (const evt of demoEvents) {
      try {
        const [row] = await db.insert(violationEvents).values(evt).returning();
        results.push({ id: row.id, title: row.title, status: "created" });
      } catch (err) {
        results.push({ id: 0, title: evt.title, status: "error", error: String(err) });
      }
    }

    return { seeded: results.length, results };
  }),
});

// ── Auto-freeze helper ───────────────────────────────────────

async function autoFreezePerformance(
  db: any,
  violationId: number,
  buId: number,
  severity: string,
  reason: string,
): Promise<void> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);

    // Find current quarter's performance record for this BU
    const [record] = await db.select().from(performanceRecords)
      .where(and(
        eq(performanceRecords.buId, buId),
        eq(performanceRecords.year, year),
        eq(performanceRecords.quarter, quarter),
        eq(performanceRecords.isFrozen, false),
      ));

    if (record) {
      await db.update(performanceRecords).set({
        isFrozen: true,
        frozenAt: now.toISOString(),
        frozenBy: "system",
        frozenReason: `[AUTO] ${severity}级违规: ${reason}`,
        updatedAt: now.toISOString(),
      }).where(eq(performanceRecords.id, record.id));

      // Link the violation to the frozen record
      await db.update(violationEvents).set({
        frozePerformanceId: record.id,
      }).where(eq(violationEvents.id, violationId));

      console.log(`[ViolationEvent] Auto-froze performance #${record.id} due to ${severity} violation #${violationId}`);
    }
  } catch (err) {
    console.warn("[ViolationEvent] Auto-freeze failed (non-fatal):", err);
  }
}
