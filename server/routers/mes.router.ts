import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { verifyWorkerSkillForStation, InsufficientSkillError } from "../services/mes-quality-guard";

export const mesRouter = router({
  getOperators: protectedProcedure.query(async () => {
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT DISTINCT employee_id AS "employeeId", employee_name AS "employeeName", department, position
      FROM employee_competence_assessments
      ORDER BY department, employee_name
    `);
    return (result.rows as any[]).map((r: any) => ({
      id: r.employeeId,
      name: r.employeeName,
      department: r.department || "",
      position: r.position || "",
    }));
  }),

  verifySkill: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      domain: z.string(),
      requiredLevel: z.number(),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await verifyWorkerSkillForStation(
          input.employeeId,
          input.domain,
          input.requiredLevel
        );
        return {
          success: true,
          passed: true,
          ...result,
          message: `Skill verified. Assembly started. ${result.employeeName} has L${result.currentLevel} in ${result.domain} (required: L${result.requiredLevel}).`,
        };
      } catch (error) {
        if (error instanceof InsufficientSkillError) {
          return {
            success: false,
            passed: false,
            employeeId: error.employeeId,
            employeeName: error.employeeName,
            domain: error.domain,
            currentLevel: error.currentLevel,
            requiredLevel: error.requiredLevel,
            score: "0",
            message: error.iatfWarning,
          };
        }
        return {
          success: false,
          passed: false,
          employeeId: input.employeeId,
          employeeName: "Unknown",
          domain: input.domain,
          currentLevel: 0,
          requiredLevel: input.requiredLevel,
          score: "0",
          message: (error as Error).message || "Verification failed",
        };
      }
    }),
});
