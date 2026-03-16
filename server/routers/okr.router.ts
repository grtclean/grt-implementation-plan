/**
 * OKR Engine Router — Objectives & Key Results
 *
 * Queries real DB tables:
 *   - okr_objectives: Company → BU → Dept → Individual hierarchy
 *   - okr_key_results: Measurable KRs linked to objectives
 *   - okr_check_ins: Progress check-in records
 *
 * Provides:
 *   - listObjectives: paginated list with optional filters
 *   - getObjective: single objective with KRs + check-ins
 *   - createObjective / updateObjective / deleteObjective
 *   - createKeyResult / updateKeyResult
 *   - checkIn: record KR progress
 *   - dashboard: aggregate OKR KPIs
 *   - seedDemo: insert demo data
 */
import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { eq, desc, sql, count, and, inArray } from "drizzle-orm";
import { okrObjectives, okrKeyResults, okrCheckIns } from "../../drizzle/okr-schema";

export const okrRouter = router({
  /** Legacy list stub — now backed by real DB */
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;
        const rows = await db.select().from(okrObjectives)
          .orderBy(desc(okrObjectives.createdAt))
          .limit(limit)
          .offset(offset);
        const [total] = await db.select({ value: count() }).from(okrObjectives);
        return { items: rows, total: Number(total?.value ?? 0) };
      } catch {
        return { items: [], total: 0 };
      }
    }),

  /** List objectives with filters */
  listObjectives: protectedProcedure
    .input(z.object({
      level: z.enum(["company", "bu", "department", "individual"]).optional(),
      status: z.string().optional(),
      period: z.string().optional(),
      buCode: z.string().optional(),
      ownerId: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const conditions = [];
        if (input.level) conditions.push(eq(okrObjectives.level, input.level));
        if (input.status) conditions.push(eq(okrObjectives.status, input.status));
        if (input.period) conditions.push(eq(okrObjectives.period, input.period));
        if (input.buCode) conditions.push(eq(okrObjectives.buCode, input.buCode));
        if (input.ownerId) conditions.push(eq(okrObjectives.ownerId, input.ownerId));

        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const rows = await db.select().from(okrObjectives)
          .where(where)
          .orderBy(desc(okrObjectives.createdAt))
          .limit(input.limit);

        return rows;
      } catch {
        return [];
      }
    }),

  /** Get single objective with its KRs and recent check-ins */
  getObjective: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await requireDb();
        const [obj] = await db.select().from(okrObjectives)
          .where(eq(okrObjectives.id, input.id)).limit(1000);
        if (!obj) return null;

        const krs = await db.select().from(okrKeyResults)
          .where(eq(okrKeyResults.objectiveId, input.id))
          .orderBy(okrKeyResults.id).limit(1000);

        const krIds = krs.map(kr => kr.id);
        let checkIns: (typeof okrCheckIns.$inferSelect)[] = [];
        if (krIds.length > 0) {
          checkIns = await db.select().from(okrCheckIns)
            .where(inArray(okrCheckIns.keyResultId, krIds))
            .orderBy(desc(okrCheckIns.createdAt))
            .limit(50);
        }

        return { ...obj, keyResults: krs, checkIns };
      } catch {
        return null;
      }
    }),

  /** Create objective */
  createObjective: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      level: z.enum(["company", "bu", "department", "individual"]).default("individual"),
      ownerName: z.string().optional(),
      parentId: z.number().optional(),
      period: z.string(),
      priority: z.enum(["P0", "P1", "P2"]).default("P1"),
      buCode: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await requireDb();
        const [inserted] = await db.insert(okrObjectives).values({
          title: input.title,
          description: input.description ?? null,
          level: input.level,
          ownerId: String(ctx.user.id),
          ownerName: input.ownerName ?? ctx.user.name ?? null,
          parentId: input.parentId ?? null,
          period: input.period,
          priority: input.priority,
          buCode: input.buCode ?? null,
          status: "draft",
          progress: 0,
        }).returning();
        return { ok: true, id: inserted?.id };
      } catch (e: any) {
        return { ok: false, message: e.message };
      }
    }),

  /** Update objective */
  updateObjective: requirePermission('strategy:okr:manage')
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      progress: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const { id, ...data } = input;
        await db.update(okrObjectives).set({
          ...data,
          updatedAt: new Date(),
        }).where(eq(okrObjectives.id, id));
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: e.message };
      }
    }),

  /** Delete objective (cascades KRs and check-ins) */
  deleteObjective: requirePermission('strategy:okr:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        // Delete check-ins for KRs under this objective
        const krs = await db.select({ id: okrKeyResults.id }).from(okrKeyResults)
          .where(eq(okrKeyResults.objectiveId, input.id))
      .limit(1000);
        if (krs.length > 0) {
          await db.delete(okrCheckIns).where(inArray(okrCheckIns.keyResultId, krs.map(k => k.id)));
        }
        await db.delete(okrKeyResults).where(eq(okrKeyResults.objectiveId, input.id));
        await db.delete(okrObjectives).where(eq(okrObjectives.id, input.id));
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: e.message };
      }
    }),

  /** Create key result for an objective */
  createKeyResult: protectedProcedure
    .input(z.object({
      objectiveId: z.number(),
      title: z.string().min(1),
      metricType: z.enum(["number", "percentage", "boolean", "currency"]).default("percentage"),
      startValue: z.number().default(0),
      targetValue: z.number().default(100),
      unit: z.string().default("%"),
      ownerName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await requireDb();
        const [inserted] = await db.insert(okrKeyResults).values({
          objectiveId: input.objectiveId,
          title: input.title,
          metricType: input.metricType,
          startValue: input.startValue,
          targetValue: input.targetValue,
          currentValue: input.startValue,
          unit: input.unit,
          ownerId: String(ctx.user.id),
          ownerName: input.ownerName ?? ctx.user.name ?? null,
          status: "on_track",
          confidence: 0.5,
        }).returning();
        return { ok: true, id: inserted?.id };
      } catch (e: any) {
        return { ok: false, message: e.message };
      }
    }),

  /** Update key result */
  updateKeyResult: requirePermission('strategy:okr:manage')
    .input(z.object({
      id: z.number(),
      currentValue: z.number().optional(),
      status: z.string().optional(),
      confidence: z.number().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        const { id, ...data } = input;
        await db.update(okrKeyResults).set({
          ...data,
          updatedAt: new Date(),
        }).where(eq(okrKeyResults.id, id));

        // Auto-update parent objective progress
        const [kr] = await db.select().from(okrKeyResults).where(eq(okrKeyResults.id, id)).limit(1000);
        if (kr) {
          const allKrs = await db.select().from(okrKeyResults)
            .where(eq(okrKeyResults.objectiveId, kr.objectiveId)).limit(1000);
          const avgProgress = allKrs.length > 0
            ? allKrs.reduce((sum, k) => {
                const range = (k.targetValue ?? 100) - (k.startValue ?? 0);
                const current = (k.currentValue ?? 0) - (k.startValue ?? 0);
                return sum + (range > 0 ? Math.min(100, (current / range) * 100) : 0);
              }, 0) / allKrs.length
            : 0;
          await db.update(okrObjectives).set({
            progress: Math.round(avgProgress),
            updatedAt: new Date(),
          }).where(eq(okrObjectives.id, kr.objectiveId));
        }
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: e.message };
      }
    }),

  /** Delete an objective and its KRs + check-ins (cascade) */
  deleteObjectiveCascade: requirePermission('strategy:okr:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        // Delete check-ins for all KRs of this objective
        const krs = await db.select({ id: okrKeyResults.id }).from(okrKeyResults).where(eq(okrKeyResults.objectiveId, input.id)).limit(1000);
        for (const kr of krs) {
          await db.delete(okrCheckIns).where(eq(okrCheckIns.keyResultId, kr.id));
        }
        // Delete KRs
        await db.delete(okrKeyResults).where(eq(okrKeyResults.objectiveId, input.id));
        // Delete objective
        await db.delete(okrObjectives).where(eq(okrObjectives.id, input.id));
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: e.message };
      }
    }),

  /** Delete a key result and its check-ins */
  deleteKeyResult: requirePermission('strategy:okr:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await requireDb();
        await db.delete(okrCheckIns).where(eq(okrCheckIns.keyResultId, input.id));
        await db.delete(okrKeyResults).where(eq(okrKeyResults.id, input.id));
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: e.message };
      }
    }),

  /** Record a check-in for a key result */
  checkIn: requirePermission('strategy:okr:manage')
    .input(z.object({
      keyResultId: z.number(),
      value: z.number(),
      confidence: z.number().optional(),
      note: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await requireDb();
        await db.insert(okrCheckIns).values({
          keyResultId: input.keyResultId,
          value: input.value,
          confidence: input.confidence ?? 0.5,
          note: input.note ?? null,
          authorId: String(ctx.user.id),
          authorName: ctx.user.name ?? null,
        });
        // Update KR current value
        await db.update(okrKeyResults).set({
          currentValue: input.value,
          confidence: input.confidence ?? undefined,
          updatedAt: new Date(),
        }).where(eq(okrKeyResults.id, input.keyResultId));
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: e.message };
      }
    }),

  /** Dashboard aggregate KPIs */
  dashboard: protectedProcedure
    .query(async () => {
      try {
        const db = await requireDb();
        const allObjs = await db.select().from(okrObjectives).limit(1000);
        const total = allObjs.length;
        if (total === 0) {
          return {
            totalObjectives: 0, avgProgress: 0,
            onTrack: 0, atRisk: 0, behind: 0,
            companyLevel: 0, buLevel: 0, deptLevel: 0, teamLevel: 0,
          };
        }

        const avgProgress = Math.round(allObjs.reduce((s, o) => s + (o.progress ?? 0), 0) / total);
        const statusCounts = { on_track: 0, at_risk: 0, behind: 0 };
        const levelCounts = { company: 0, bu: 0, department: 0, individual: 0 };

        for (const obj of allObjs) {
          const p = obj.progress ?? 0;
          if (p >= 70) statusCounts.on_track++;
          else if (p >= 40) statusCounts.at_risk++;
          else statusCounts.behind++;
          if (obj.level in levelCounts) levelCounts[obj.level as keyof typeof levelCounts]++;
        }

        return {
          totalObjectives: total,
          avgProgress,
          onTrack: statusCounts.on_track,
          atRisk: statusCounts.at_risk,
          behind: statusCounts.behind,
          companyLevel: levelCounts.company,
          buLevel: levelCounts.bu,
          deptLevel: levelCounts.department,
          teamLevel: levelCounts.individual,
        };
      } catch {
        return {
          totalObjectives: 0, avgProgress: 0,
          onTrack: 0, atRisk: 0, behind: 0,
          companyLevel: 0, buLevel: 0, deptLevel: 0, teamLevel: 0,
        };
      }
    }),

  /**
   * Auto-decompose BU sales targets → OKR objectives + key results.
   * Completes the L1 (Strategy) → L2 (BU Target) → L3 (OKR) cascade.
   *
   * For each approved BU sales plan:
   *   - Creates a BU-level objective (if not already linked)
   *   - Creates 2 KRs: quarterly sales target, quarterly output target
   *   - Links to parent company-level objective if one exists for the same period
   */
  decomposeToOkr: requirePermission('strategy:okr:manage')
    .input(z.object({
      year: z.number().default(2026),
      period: z.string().optional(), // e.g. "2026-Q1"
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await requireDb();

        // 1. Read approved BU sales plans for the year
        const plans = await db.execute(sql`
          SELECT id, year, department_id, total_sales_target, total_output_target, status
          FROM bu_sales_plans
          WHERE year = ${input.year} AND status IN ('approved', 'submitted', 'draft')
          ORDER BY id
        `);
        const planRows = (plans.rows ?? []) as any[];
        if (planRows.length === 0) {
          return { ok: true, message: "No BU sales plans found for this year", created: 0 };
        }

        // 2. Find parent company-level objectives for linking
        const period = input.period ?? `${input.year}-Q1`;
        const companyObjs = await db.select().from(okrObjectives)
          .where(and(
            eq(okrObjectives.level, "company"),
            eq(okrObjectives.period, period),
          )).limit(1000);
        const parentId = companyObjs.length > 0 ? companyObjs[0].id : null;

        // 3. Map departmentId → buCode
        const deptToBu: Record<string, string> = {
          "overseas": "overseas",
          "commercial_vehicle": "commercial_vehicle",
          "passenger_vehicle": "passenger_vehicle",
          "semiconductor": "semiconductor",
          "industrial_general": "industrial_general",
          "BU1": "overseas",
          "BU2": "commercial_vehicle",
          "BU3": "passenger_vehicle",
          "BU4": "semiconductor",
          "BU5": "industrial_general",
        };

        let createdCount = 0;

        for (const plan of planRows) {
          const buCode = deptToBu[plan.department_id] ?? plan.department_id;
          const totalSales = Number(plan.total_sales_target ?? 0);
          const totalOutput = Number(plan.total_output_target ?? 0);

          // Check if OKR already exists for this BU + period
          const existing = await db.select().from(okrObjectives)
            .where(and(
              eq(okrObjectives.level, "bu"),
              eq(okrObjectives.buCode, buCode),
              eq(okrObjectives.period, period),
            )).limit(1000);
          if (existing.length > 0) continue; // Skip — already decomposed

          // 4. Create BU-level objective
          const [obj] = await db.insert(okrObjectives).values({
            title: `${buCode} ${input.year}年度销售目标 ${(totalSales / 10000).toFixed(0)}万`,
            description: `来源: BU年度计划 #${plan.id}, 年度销售 ${totalSales.toFixed(0)}, 年度产值 ${totalOutput.toFixed(0)}`,
            level: "bu",
            ownerId: String(ctx.user.id),
            ownerName: ctx.user.name ?? null,
            parentId,
            period,
            priority: "P0",
            buCode,
            status: "active",
            progress: 0,
          }).returning();

          if (!obj) continue;

          // 5. Create KR: quarterly sales target (Q1 = total / 4 as baseline)
          const qSales = totalSales / 4;
          const qOutput = totalOutput / 4;

          await db.insert(okrKeyResults).values([
            {
              objectiveId: obj.id,
              title: `季度签约金额达 ${(qSales / 10000).toFixed(0)} 万`,
              metricType: "currency" as const,
              startValue: 0,
              targetValue: Math.round(qSales),
              currentValue: 0,
              unit: "元",
              status: "on_track",
              confidence: 0.5,
            },
            {
              objectiveId: obj.id,
              title: `季度产值达 ${(qOutput / 10000).toFixed(0)} 万`,
              metricType: "currency" as const,
              startValue: 0,
              targetValue: Math.round(qOutput),
              currentValue: 0,
              unit: "元",
              status: "on_track",
              confidence: 0.5,
            },
          ]);

          createdCount++;
        }

        return {
          ok: true,
          message: `Created ${createdCount} BU OKR objectives from ${planRows.length} sales plans`,
          created: createdCount,
          parentObjectiveId: parentId,
        };
      } catch (e: any) {
        return { ok: false, message: e.message };
      }
    }),

  /** Seed demo OKR data */
  seedDemo: requirePermission('strategy:okr:manage').mutation(async () => {
    try {
      const db = await requireDb();
      const [existing] = await db.select({ value: count() }).from(okrObjectives);
      if (Number(existing?.value ?? 0) > 0) {
        return { ok: true, message: "OKR demo data already exists", count: Number(existing?.value ?? 0) };
      }

      // Company-level objectives
      const companyObjs = [
        { title: "2026年营收突破5亿", level: "company" as const, ownerId: "CEO", ownerName: "倪亚东", period: "2026-Q1", priority: "P0", progress: 65, status: "active" as const },
        { title: "海外市场份额提升至25%", level: "company" as const, ownerId: "CEO", ownerName: "倪亚东", period: "2026-Q1", priority: "P0", progress: 45, status: "active" as const },
        { title: "新产品研发周期缩短20%", level: "company" as const, ownerId: "CTO", ownerName: "胡炜", period: "2026-Q1", priority: "P1", progress: 72, status: "active" as const },
      ];

      const buObjs = [
        { title: "海外BU Q1签约2000万", level: "bu" as const, ownerId: "BU1-GM", ownerName: "廉龙海", period: "2026-Q1", priority: "P0", buCode: "overseas", progress: 58, status: "active" as const },
        { title: "商用车BU客户满意度95%", level: "bu" as const, ownerId: "BU2-GM", ownerName: "马林山", period: "2026-Q1", priority: "P1", buCode: "commercial_vehicle", progress: 80, status: "active" as const },
        { title: "半导体BU产能提升30%", level: "bu" as const, ownerId: "BU4-GM", ownerName: "翁小飞", period: "2026-Q1", priority: "P0", buCode: "semiconductor", progress: 35, status: "active" as const },
      ];

      const deptObjs = [
        { title: "销售部新客户开发20家", level: "department" as const, ownerId: "DEPT-SALES", ownerName: "戴晓燕", period: "2026-Q1", priority: "P1", progress: 55, status: "active" as const },
        { title: "研发部专利申请5项", level: "department" as const, ownerId: "DEPT-RD", ownerName: "洪香龙", period: "2026-Q1", priority: "P2", progress: 40, status: "active" as const },
      ];

      const allObjs = [...companyObjs, ...buObjs, ...deptObjs];
      const insertedIds: number[] = [];

      for (const obj of allObjs) {
        const [row] = await db.insert(okrObjectives).values(obj).returning();
        if (row) insertedIds.push(row.id);
      }

      // Add KRs for first 4 objectives
      const krData = [
        { objectiveId: insertedIds[0], title: "Q1签约金额达1.2亿", metricType: "currency", targetValue: 12000, currentValue: 7800, unit: "万元" },
        { objectiveId: insertedIds[0], title: "大客户续约率90%", metricType: "percentage", targetValue: 90, currentValue: 78, unit: "%" },
        { objectiveId: insertedIds[1], title: "海外展会参展3场", metricType: "number", targetValue: 3, currentValue: 1, unit: "场" },
        { objectiveId: insertedIds[1], title: "海外代理商新签5家", metricType: "number", targetValue: 5, currentValue: 2, unit: "家" },
        { objectiveId: insertedIds[2], title: "平均项目周期从180天降至144天", metricType: "number", targetValue: 144, currentValue: 160, startValue: 180, unit: "天" },
        { objectiveId: insertedIds[3], title: "海外签约2000万", metricType: "currency", targetValue: 2000, currentValue: 1160, unit: "万元" },
        { objectiveId: insertedIds[4], title: "NPS客户满意度", metricType: "percentage", targetValue: 95, currentValue: 88, unit: "%" },
        { objectiveId: insertedIds[5], title: "月产量达标率", metricType: "percentage", targetValue: 100, currentValue: 72, unit: "%" },
      ];

      for (const kr of krData) {
        await db.insert(okrKeyResults).values({
          objectiveId: kr.objectiveId,
          title: kr.title,
          metricType: kr.metricType as any,
          startValue: kr.startValue ?? 0,
          targetValue: kr.targetValue,
          currentValue: kr.currentValue,
          unit: kr.unit,
          status: "on_track",
          confidence: 0.5 + Math.random() * 0.4,
        });
      }

      return { ok: true, objectives: insertedIds.length, keyResults: krData.length };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  }),
});
