/**
 * 绩效运营中心 Router
 *
 * 补齐缺失环节：KPI库CRUD → 岗位KPI分配 → 年度目标级联 → 人为微调 → 综合评分
 * 接入: hrmKpiLibrary, hrmPositionKpiTargets, hrmMonthlyPerformanceReviews,
 *       annualGoalAgreements, annualGoalDimensions, annualGoalCheckpoints
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, and, desc, asc, sql, count, inArray } from "drizzle-orm";

// ── KPI库管理 ──
const kpiLibraryRouter = router({
  /** 列出所有KPI指标 */
  list: protectedProcedure
    .input(z.object({ category: z.string().optional(), buCode: z.string().optional() }).optional().default({}))
    .query(async ({ input }) => {
      const db = await requireDb();
      try {
        const rows = await db.execute(sql`
          SELECT * FROM hrm_kpi_library
          ${input.category ? sql`WHERE kpi_type = ${input.category}` : sql``}
          ORDER BY kpi_code ASC LIMIT 200
        `);
        return rows.rows || rows;
      } catch {
        return [];
      }
    }),

  /** 创建KPI指标 */
  create: requirePermission("hr:goal:manage")
    .input(z.object({
      kpiCode: z.string(),
      kpiName: z.string(),
      unit: z.string().optional(),
      kpiType: z.string().optional(),
      formula: z.string().optional(),
      dataSource: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql`
        INSERT INTO hrm_kpi_library (kpi_code, kpi_name, unit, kpi_type, formula, data_source, description, created_at)
        VALUES (${input.kpiCode}, ${input.kpiName}, ${input.unit || 'count'}, ${input.kpiType || 'internal_process'},
                ${input.formula || ''}, ${input.dataSource || 'manual'}, ${input.description || ''}, NOW())
        ON CONFLICT (kpi_code) DO UPDATE SET kpi_name = EXCLUDED.kpi_name, updated_at = NOW()
      `);
      return { success: true };
    }),

  /** 删除KPI */
  delete: requirePermission("hr:goal:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql`DELETE FROM hrm_kpi_library WHERE id = ${input.id}`);
      return { success: true };
    }),
});

// ── 岗位KPI分配 ──
const positionKpiRouter = router({
  /** 某岗位的KPI目标列表 */
  listByPosition: protectedProcedure
    .input(z.object({ positionId: z.number(), year: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const year = input.year || new Date().getFullYear();
      try {
        const rows = await db.execute(sql`
          SELECT t.*, k.kpi_name, k.unit, k.kpi_type
          FROM hrm_position_kpi_targets t
          LEFT JOIN hrm_kpi_library k ON t.kpi_id = k.id
          WHERE t.position_id = ${input.positionId} AND t.year = ${year}
          ORDER BY t.weight DESC LIMIT 50
        `);
        return rows.rows || rows;
      } catch {
        return [];
      }
    }),

  /** 分配KPI到岗位 */
  assign: requirePermission("hr:goal:manage")
    .input(z.object({
      positionId: z.number(),
      kpiId: z.number(),
      year: z.number().optional(),
      targetValue: z.string(),
      challengeValue: z.string().optional(),
      minimumValue: z.string().optional(),
      weight: z.number(),
      scoringMethod: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const year = input.year || new Date().getFullYear();
      await db.execute(sql`
        INSERT INTO hrm_position_kpi_targets (position_id, kpi_id, year, target_value, challenge_value, minimum_value, weight, scoring_method, created_at)
        VALUES (${input.positionId}, ${input.kpiId}, ${year}, ${input.targetValue}, ${input.challengeValue || input.targetValue},
                ${input.minimumValue || '0'}, ${input.weight}, ${input.scoringMethod || 'linear'}, NOW())
        ON CONFLICT (position_id, kpi_id, year) DO UPDATE SET
          target_value = EXCLUDED.target_value, weight = EXCLUDED.weight, updated_at = NOW()
      `);
      return { success: true };
    }),

  /** 批量分配（从年度计划级联） */
  cascadeFromPlan: requirePermission("hr:goal:manage")
    .input(z.object({
      positionId: z.number(),
      year: z.number().optional(),
      kpis: z.array(z.object({
        kpiId: z.number(),
        targetValue: z.string(),
        weight: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const year = input.year || new Date().getFullYear();
      let assigned = 0;
      for (const kpi of input.kpis) {
        await db.execute(sql`
          INSERT INTO hrm_position_kpi_targets (position_id, kpi_id, year, target_value, weight, scoring_method, created_at)
          VALUES (${input.positionId}, ${kpi.kpiId}, ${year}, ${kpi.targetValue}, ${kpi.weight}, 'linear', NOW())
          ON CONFLICT (position_id, kpi_id, year) DO UPDATE SET
            target_value = EXCLUDED.target_value, weight = EXCLUDED.weight, updated_at = NOW()
        `);
        assigned++;
      }
      return { success: true, assigned };
    }),
});

// ── 月度评审 ──
const monthlyReviewRouter = router({
  /** 某员工的月度评审列表 */
  listByEmployee: protectedProcedure
    .input(z.object({ employeeId: z.number(), year: z.number().optional(), limit: z.number().optional().default(12) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      try {
        const rows = await db.execute(sql`
          SELECT * FROM hrm_monthly_performance_reviews
          WHERE employee_id = ${input.employeeId}
          ORDER BY review_month DESC LIMIT ${input.limit}
        `);
        return rows.rows || rows;
      } catch {
        return [];
      }
    }),

  /** 创建/更新月度评审 */
  upsert: requirePermission("hr:goal:manage")
    .input(z.object({
      employeeId: z.number(),
      reviewMonth: z.string(),
      overallScore: z.number().min(0).max(100),
      bonusCoefficient: z.number().optional(),
      kpiDetailsJson: z.any().optional(),
      managerComments: z.string().optional(),
      status: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql`
        INSERT INTO hrm_monthly_performance_reviews (employee_id, review_month, overall_score, bonus_coefficient, kpi_details_json, manager_comments, status, created_at)
        VALUES (${input.employeeId}, ${input.reviewMonth}, ${input.overallScore}, ${input.bonusCoefficient || 1.0},
                ${JSON.stringify(input.kpiDetailsJson || [])}, ${input.managerComments || ''}, ${input.status || 'draft'}, NOW())
        ON CONFLICT (employee_id, review_month) DO UPDATE SET
          overall_score = EXCLUDED.overall_score, bonus_coefficient = EXCLUDED.bonus_coefficient,
          kpi_details_json = EXCLUDED.kpi_details_json, manager_comments = EXCLUDED.manager_comments,
          status = EXCLUDED.status, updated_at = NOW()
      `);
      return { success: true };
    }),
});

// ── 人为微调 ──
const adjustmentRouter = router({
  /** 提交维度调整申请 */
  submitAdjustment: requirePermission("hr:goal:manage")
    .input(z.object({
      agreementId: z.number(),
      adjustmentType: z.string(),
      reason: z.string(),
      previousStateJson: z.any().optional(),
      proposedStateJson: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql`
        INSERT INTO annual_goal_adjustments (agreement_id, adjustment_type, reason, previous_state_json, proposed_state_json, status, requested_by, created_at)
        VALUES (${input.agreementId}, ${input.adjustmentType}, ${input.reason},
                ${JSON.stringify(input.previousStateJson || {})}, ${JSON.stringify(input.proposedStateJson || {})},
                'pending_manager', 0, NOW())
      `);
      return { success: true };
    }),

  /** 审批调整 */
  approveAdjustment: requirePermission("hr:goal:manage")
    .input(z.object({ adjustmentId: z.number(), approved: z.boolean(), reviewComment: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const newStatus = input.approved ? "approved" : "rejected";
      await db.execute(sql`
        UPDATE annual_goal_adjustments SET status = ${newStatus}, review_comment = ${input.reviewComment || ''},
        reviewed_by = 0, reviewed_at = NOW(), updated_at = NOW()
        WHERE id = ${input.adjustmentId}
      `);
      return { success: true };
    }),

  /** 待审批调整列表 */
  listPending: protectedProcedure.query(async () => {
    const db = await requireDb();
    try {
      const rows = await db.execute(sql`
        SELECT a.*, g.employee_id, g.manager_id
        FROM annual_goal_adjustments a
        LEFT JOIN annual_goal_agreements g ON a.agreement_id = g.id
        WHERE a.status IN ('pending_manager', 'pending_hr')
        ORDER BY a.created_at DESC LIMIT 50
      `);
      return rows.rows || rows;
    } catch {
      return [];
    }
  }),

  /** 直接修改维度权重（管理员/HR微调） */
  adjustDimensionWeight: requirePermission("hr:goal:manage")
    .input(z.object({
      dimensionId: z.number(),
      newWeight: z.number().min(0).max(100),
      newTargetJson: z.any().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql`
        UPDATE annual_goal_dimensions SET weight = ${input.newWeight},
        ${input.newTargetJson ? sql`kpi_targets_json = ${JSON.stringify(input.newTargetJson)},` : sql``}
        updated_at = NOW()
        WHERE id = ${input.dimensionId}
      `);
      return { success: true };
    }),

  /** 直接修改检查点得分（人为校准） */
  calibrateCheckpoint: requirePermission("hr:goal:manage")
    .input(z.object({
      checkpointId: z.number(),
      overallScore: z.number().min(0).max(100),
      performanceLevel: z.string().optional(),
      managerComments: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql`
        UPDATE annual_goal_checkpoints SET overall_score = ${input.overallScore},
        performance_level = ${input.performanceLevel || ''},
        manager_comments = ${input.managerComments || ''},
        status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE id = ${input.checkpointId}
      `);
      return { success: true };
    }),
});

// ── 综合评分计算 ──
const scoringRouter = router({
  /** 计算员工综合绩效分 */
  calculateComposite: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      year: z.number().optional(),
      objectiveWeight: z.number().optional().default(50),
      subjectiveGrade: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const year = input.year || new Date().getFullYear();

      // 1. 客观分 — 从年度维度目标完成率加权
      let objectiveScore = 0;
      try {
        const dims = await db.execute(sql`
          SELECT weight, current_score FROM annual_goal_dimensions d
          JOIN annual_goal_agreements a ON d.agreement_id = a.id
          WHERE a.employee_id = ${input.employeeId} AND a.year = ${year}
        `);
        const rows = (dims.rows || dims) as any[];
        const totalWeight = rows.reduce((s: number, r: any) => s + Number(r.weight || 0), 0);
        if (totalWeight > 0) {
          objectiveScore = rows.reduce((s: number, r: any) =>
            s + (Number(r.current_score || 0) * Number(r.weight || 0)) / totalWeight, 0
          );
        }
      } catch { /* table may not exist yet */ }

      // 2. 主观分 — A/B/C/D等级映射
      const gradeMap: Record<string, number> = { S: 100, A: 90, B: 75, C: 60, D: 40 };
      const subjectiveScore = gradeMap[input.subjectiveGrade || "B"] ?? 75;

      // 3. 综合分
      const objW = input.objectiveWeight / 100;
      const subW = 1 - objW;
      const compositeScore = objectiveScore * objW + subjectiveScore * subW;

      // 4. 映射绩效薪资档位
      let performanceTier: string;
      let bonusMonths: number;
      if (compositeScore >= 90) { performanceTier = "A档(优秀)"; bonusMonths = 3; }
      else if (compositeScore >= 75) { performanceTier = "B档(良好)"; bonusMonths = 2; }
      else if (compositeScore >= 60) { performanceTier = "C档(合格)"; bonusMonths = 1; }
      else { performanceTier = "D档(待改进)"; bonusMonths = 0; }

      return {
        employeeId: input.employeeId,
        year,
        objectiveScore: Number(objectiveScore.toFixed(1)),
        subjectiveGrade: input.subjectiveGrade || "B",
        subjectiveScore,
        objectiveWeight: input.objectiveWeight,
        compositeScore: Number(compositeScore.toFixed(1)),
        performanceTier,
        bonusMonths,
      };
    }),

  /** 批量计算（团队/部门） */
  batchCalculate: requirePermission("hr:goal:manage")
    .input(z.object({
      employeeIds: z.array(z.number()),
      year: z.number().optional(),
      objectiveWeight: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const year = input.year || new Date().getFullYear();
      const results: any[] = [];

      for (const empId of input.employeeIds.slice(0, 100)) {
        let objectiveScore = 0;
        try {
          const dims = await db.execute(sql`
            SELECT weight, current_score FROM annual_goal_dimensions d
            JOIN annual_goal_agreements a ON d.agreement_id = a.id
            WHERE a.employee_id = ${empId} AND a.year = ${year}
          `);
          const rows = (dims.rows || dims) as any[];
          const totalWeight = rows.reduce((s: number, r: any) => s + Number(r.weight || 0), 0);
          if (totalWeight > 0) {
            objectiveScore = rows.reduce((s: number, r: any) =>
              s + (Number(r.current_score || 0) * Number(r.weight || 0)) / totalWeight, 0
            );
          }
        } catch { /* skip */ }

        results.push({
          employeeId: empId,
          objectiveScore: Number(objectiveScore.toFixed(1)),
          tier: objectiveScore >= 90 ? "A" : objectiveScore >= 75 ? "B" : objectiveScore >= 60 ? "C" : "D",
        });
      }
      return results;
    }),

  /** 团队绩效分布统计 */
  teamDistribution: protectedProcedure
    .input(z.object({ year: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const year = input.year || new Date().getFullYear();
      try {
        const rows = await db.execute(sql`
          SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN d.avg_score >= 90 THEN 1 END) as tier_a,
            COUNT(CASE WHEN d.avg_score >= 75 AND d.avg_score < 90 THEN 1 END) as tier_b,
            COUNT(CASE WHEN d.avg_score >= 60 AND d.avg_score < 75 THEN 1 END) as tier_c,
            COUNT(CASE WHEN d.avg_score < 60 THEN 1 END) as tier_d,
            AVG(d.avg_score) as overall_avg
          FROM (
            SELECT a.employee_id,
              SUM(dim.current_score::numeric * dim.weight::numeric) / NULLIF(SUM(dim.weight::numeric), 0) as avg_score
            FROM annual_goal_agreements a
            JOIN annual_goal_dimensions dim ON dim.agreement_id = a.id
            WHERE a.year = ${year} AND a.status IN ('active', 'in_review', 'year_end_review', 'finalized')
            GROUP BY a.employee_id
          ) d
        `);
        return (rows.rows || rows)?.[0] || { total: 0, tier_a: 0, tier_b: 0, tier_c: 0, tier_d: 0, overall_avg: 0 };
      } catch {
        return { total: 0, tier_a: 0, tier_b: 0, tier_c: 0, tier_d: 0, overall_avg: 0 };
      }
    }),
});

// ── 组合导出 ──
export const performanceOpsRouter = router({
  kpiLibrary: kpiLibraryRouter,
  positionKpi: positionKpiRouter,
  monthlyReview: monthlyReviewRouter,
  adjustment: adjustmentRouter,
  scoring: scoringRouter,
});
