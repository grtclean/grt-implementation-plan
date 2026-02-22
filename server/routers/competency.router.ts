/**
 * HR Competency Assessment Router — IATF 16949 Capability Matrix
 * Reads from the flat `employee_competence_assessments` table.
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

export const competencyRouter = router({
  // ── Flat assessment list (new table) ──
  getAssessments: publicProcedure
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
        SELECT
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
        ORDER BY department, employee_name
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

  // ── Distinct departments ──
  getDepartments: publicProcedure.query(async () => {
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT DISTINCT department
      FROM employee_competence_assessments
      WHERE department IS NOT NULL
      ORDER BY department
    `);
    return (result.rows as any[]).map((r: any) => r.department);
  }),
});
