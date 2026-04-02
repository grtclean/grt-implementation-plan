/**
 * HR Competency Assessment Router — IATF 16949 Capability Matrix
 * Reads from the flat `employee_competence_assessments` table.
 */
import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

export const competencyRouter = router({
  // ── Flat assessment list (new table) ──
  getAssessments: protectedProcedure
    .input(
      z
        .object({
          department: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();

      const raw = await db.execute(sql`
        SELECT DISTINCT ON (employee_id)
          id,
          employee_id   AS "employeeId",
          employee_name  AS "employeeName",
          department,
          position,
          t_score        AS "tScore",
          s_score        AS "sScore",
          d_score        AS "dScore",
          c_score        AS "cScore",
          k_score        AS "kScore",
          l_score        AS "lScore",
          assessed_at    AS "assessedAt"
        FROM employee_competence_assessments
        ORDER BY employee_id, assessed_at DESC
      `);

      let results = raw.rows as any[];

      if (input?.department) {
        results = results.filter(
          (r: any) => r.department === input.department
        );
      }

      if (input?.search) {
        const q = input.search.toLowerCase();
        results = results.filter(
          (r: any) =>
            r.employeeName?.toLowerCase().includes(q) ||
            r.department?.toLowerCase().includes(q)
        );
      }

      return { items: results, total: results.length };
    }),

  // ── Update score (manual input by 倪微薇/倪亚东) ──
  updateScore: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      field: z.enum(["t_score", "s_score", "d_score", "c_score", "k_score", "l_score"]),
      value: z.string().min(1).max(10),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const allowedField = input.field; // already validated by z.enum
      await db.execute(sql`
        UPDATE employee_competence_assessments
        SET ${sql.raw(allowedField)} = ${input.value},
            assessed_at = NOW(),
            updated_at = NOW()
        WHERE employee_id = ${input.employeeId}
      `);
      return { success: true };
    }),

  // ── Distinct departments ──
  getDepartments: protectedProcedure.query(async () => {
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT DISTINCT department
      FROM employee_competence_assessments
      WHERE department IS NOT NULL
      ORDER BY department
    `);
    return (result.rows as any[]).map((r: any) => r.department);
  }),

  // ══════════════════════════════════════════════════════════════
  // 岗位技能矩阵 (Position Skill Matrix) — 机加工等专项技能
  // ══════════════════════════════════════════════════════════════

  // ── 获取技能字典（按类别） ──
  getSkillDictionary: protectedProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = input?.category
        ? await db.execute(sql`
            SELECT id, code, name, name_zh AS "nameZh", domain, category, description, is_certifiable AS "isCertifiable"
            FROM skill_dictionary WHERE category = ${input.category} ORDER BY id
          `)
        : await db.execute(sql`
            SELECT id, code, name, name_zh AS "nameZh", domain, category, description, is_certifiable AS "isCertifiable"
            FROM skill_dictionary ORDER BY category, id
          `);
      return result.rows;
    }),

  // ── 获取岗位技能矩阵（带员工姓名） ──
  getPositionSkillMatrix: protectedProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      // 1. Skills in this category
      const skills = await db.execute(sql`
        SELECT id, code, name_zh AS "nameZh", domain
        FROM skill_dictionary WHERE category = ${input.category} ORDER BY id
      `);

      // 2. All capabilities for these skills, joined with user names
      const caps = await db.execute(sql`
        SELECT ec.employee_id AS "employeeId", u.name AS "employeeName",
               ec.skill_id AS "skillId", ec.current_level AS "currentLevel",
               ec.target_level AS "targetLevel", ec.assessed_by AS "assessedBy"
        FROM employee_capabilities ec
        JOIN skill_dictionary sd ON sd.id = ec.skill_id AND sd.category = ${input.category}
        LEFT JOIN users u ON u."openId" = ('GRT' || LPAD(ec.employee_id::text, 3, '0'))
        ORDER BY ec.employee_id, ec.skill_id
      `);

      // 3. Build matrix: group by employee
      const employeeMap = new Map<number, any>();
      for (const row of caps.rows as any[]) {
        if (!employeeMap.has(row.employeeId)) {
          employeeMap.set(row.employeeId, {
            employeeId: row.employeeId,
            employeeName: row.employeeName || `GRT${String(row.employeeId).padStart(3, '0')}`,
            skills: {},
          });
        }
        employeeMap.get(row.employeeId)!.skills[row.skillId] = {
          currentLevel: row.currentLevel,
          targetLevel: row.targetLevel,
        };
      }

      return {
        skills: skills.rows,
        employees: [...employeeMap.values()],
      };
    }),

  // ── 更新岗位技能评分 ──
  updateSkillLevel: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      skillId: z.number(),
      currentLevel: z.number().min(0).max(5),
      targetLevel: z.number().min(1).max(5).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql`
        INSERT INTO employee_capabilities (employee_id, skill_id, current_level, target_level, assessed_by)
        VALUES (${input.employeeId}, ${input.skillId}, ${input.currentLevel}, ${input.targetLevel ?? 3}, '系统更新')
        ON CONFLICT (employee_id, skill_id) DO UPDATE SET
          current_level = ${input.currentLevel},
          target_level = COALESCE(${input.targetLevel ?? null}, employee_capabilities.target_level),
          updated_at = NOW()
      `);
      return { success: true };
    }),

  // ── 技能类别列表 ──
  getSkillCategories: protectedProcedure.query(async () => {
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT category, count(*) AS "skillCount"
      FROM skill_dictionary GROUP BY category ORDER BY category
    `);
    return result.rows;
  }),
});
