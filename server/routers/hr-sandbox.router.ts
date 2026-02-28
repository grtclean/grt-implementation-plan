/**
 * HR Sandbox Capability Router — 6 tRPC procedures
 *
 * Uses ai_tasks queue for async parsing with LLM + algorithmic fallback.
 * No new tables needed — reuses ai_tasks table.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { aiTasks } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  CAPABILITY_DICTIONARY,
  ROLE_CRITERIA,
  EMPLOYEE_ASSESSMENTS,
} from "./capability-system.router";
import { parseCapabilityModel, whatIfSimulate, type ParsingResult } from "../services/hr-sandbox.service";
import { submitTask } from "../services/task-worker.service";

const TASK_TYPE = "HR_CAPABILITY_PARSING";

// ─── Ensure ai_tasks table exists ───────────────────────────
let tablesEnsured = false;
async function ensureTables() {
  if (tablesEnsured) return;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_tasks (
        id SERIAL PRIMARY KEY,
        task_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        input_data JSONB,
        result_data JSONB,
        error_message VARCHAR(500),
        created_by VARCHAR(50),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    tablesEnsured = true;
  } catch (err) {
    console.warn("[HR Sandbox] ensureTables failed:", err);
  }
}

// ─── RBAC helper ────────────────────────────────────────────
const ROLE_LEVELS: Record<string, number> = {
  guest: 0, employee: 1, production_worker: 1,
  team_lead: 2, bu_sales: 2, bu_mech: 2, bu_elec: 2, procurement_eng: 2, cs_engineer: 2,
  dept_manager: 3, bu_pm: 3, hr_specialist: 3, finance_specialist: 3,
  hr_manager: 4, finance_manager: 4, director: 5, bu_gm: 6, admin: 10,
};

// ─── Router ─────────────────────────────────────────────────
export const hrSandboxRouter = router({
  /**
   * initSandbox — returns dictionary + roleCriteria + employees + departments
   */
  initSandbox: protectedProcedure.query(() => {
    const departments = [...new Set(EMPLOYEE_ASSESSMENTS.map(e => e.department))].sort();
    return {
      dictionary: CAPABILITY_DICTIONARY,
      roleCriteria: ROLE_CRITERIA,
      employees: EMPLOYEE_ASSESSMENTS,
      departments,
    };
  }),

  /**
   * submitParsing — create ai_task → synchronously parse → return result
   */
  submitParsing: protectedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      role: z.string(),
      freeformText: z.string().optional(),
      currentScores: z.object({
        T: z.number(), S: z.number(), D: z.number(),
        C: z.number(), K: z.number(), L: z.number(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ensureTables();
      const db = await requireDb();

      // Create the task
      const [task] = await db.insert(aiTasks).values({
        taskType: TASK_TYPE,
        inputData: input as Record<string, unknown>,
        status: "pending",
        createdBy: ctx.user?.name ?? "system",
      }).returning();

      // Synchronously parse
      try {
        const result = await parseCapabilityModel(task.id);
        return { taskId: task.id, status: "completed" as const, result };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        await db.update(aiTasks).set({
          status: "failed",
          errorMessage: msg.slice(0, 500),
          completedAt: new Date().toISOString(),
        }).where(eq(aiTasks.id, task.id));
        return { taskId: task.id, status: "failed" as const, error: msg };
      }
    }),

  /**
   * getParsingResult — poll a task result by taskId
   */
  getParsingResult: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const [task] = await db.select().from(aiTasks).where(eq(aiTasks.id, input.taskId));
      if (!task) throw new Error("Task not found");
      return {
        taskId: task.id,
        status: task.status,
        result: task.resultData as unknown as ParsingResult | null,
        error: task.errorMessage,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      };
    }),

  /**
   * batchParse — parse all employees in a department (RBAC: roleLevel ≥ 3)
   */
  batchParse: protectedProcedure
    .input(z.object({
      department: z.string(),
      userRole: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const roleLevel = ROLE_LEVELS[input.userRole ?? "employee"] ?? 1;
      if (roleLevel < 3) {
        throw new Error("Only managers and above (level ≥ 3) can run batch parsing");
      }

      await ensureTables();
      const db = await requireDb();

      const employees = EMPLOYEE_ASSESSMENTS.filter(e => e.department === input.department);
      if (employees.length === 0) throw new Error(`No employees found in department: ${input.department}`);

      // Create all tasks first
      const taskIds: number[] = [];
      for (const emp of employees) {
        const [task] = await db.insert(aiTasks).values({
          taskType: TASK_TYPE,
          inputData: { employeeId: emp.employeeId, role: emp.role } as Record<string, unknown>,
          status: "pending",
          createdBy: ctx.user?.name ?? "system",
        }).returning();
        taskIds.push(task.id);
      }

      // Process concurrently with limit of 3
      const results: Array<{ taskId: number; employeeId: number; name: string; status: string }> = [];
      const chunks: number[][] = [];
      for (let i = 0; i < taskIds.length; i += 3) {
        chunks.push(taskIds.slice(i, i + 3));
      }

      for (const chunk of chunks) {
        const settled = await Promise.allSettled(
          chunk.map(async (taskId, idx) => {
            const empIdx = taskIds.indexOf(taskId);
            const emp = employees[empIdx];
            try {
              await parseCapabilityModel(taskId);
              return { taskId, employeeId: emp.employeeId, name: emp.name, status: "completed" };
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Unknown error";
              await db.update(aiTasks).set({
                status: "failed",
                errorMessage: msg.slice(0, 500),
                completedAt: new Date().toISOString(),
              }).where(eq(aiTasks.id, taskId));
              return { taskId, employeeId: emp.employeeId, name: emp.name, status: "failed" };
            }
          })
        );
        for (const s of settled) {
          results.push(s.status === "fulfilled" ? s.value : { taskId: 0, employeeId: 0, name: "unknown", status: "failed" });
        }
      }

      return { department: input.department, totalEmployees: employees.length, taskIds, results };
    }),

  /**
   * whatIfSimulation — slider-based what-if for a single employee
   */
  whatIfSimulation: protectedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      role: z.string(),
      baseScores: z.object({
        T: z.number(), S: z.number(), D: z.number(),
        C: z.number(), K: z.number(), L: z.number(),
      }),
      adjustments: z.object({
        T: z.number().optional(), S: z.number().optional(), D: z.number().optional(),
        C: z.number().optional(), K: z.number().optional(), L: z.number().optional(),
      }),
    }))
    .mutation(({ input }) => {
      return whatIfSimulate(input.baseScores, input.adjustments, input.role);
    }),

  /**
   * submitDocParsing — async: submit DOC_PARSING task to worker queue
   */
  submitDocParsing: protectedProcedure
    .input(z.object({
      documentText: z.string(),
      employeeName: z.string().optional(),
      role: z.string().optional(),
      department: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { taskId } = await submitTask(
        "DOC_PARSING",
        input as Record<string, unknown>,
        ctx.user?.name ?? "system",
      );
      return { taskId, status: "pending" as const };
    }),

  /**
   * submitIncidentAnalysis — async: submit INCIDENT_ANALYSIS task to worker queue
   */
  submitIncidentAnalysis: protectedProcedure
    .input(z.object({
      incidentTitle: z.string(),
      incidentDescription: z.string(),
      severity: z.enum(["MINOR", "MAJOR", "CRITICAL"]),
      sourceModule: z.string(),
      affectedBU: z.string().optional(),
      relatedDocuments: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { taskId } = await submitTask(
        "INCIDENT_ANALYSIS",
        input as Record<string, unknown>,
        ctx.user?.name ?? "system",
      );
      return { taskId, status: "pending" as const };
    }),

  /**
   * submitCompensationCheck — async: submit COMPENSATION_RULE task to worker queue
   */
  submitCompensationCheck: protectedProcedure
    .input(z.object({
      ruleConfig: z.object({
        salaryCapMultiplier: z.number().optional(),
        bonusFloor: z.number().optional(),
        bonusCeiling: z.number().optional(),
        frozenBUIds: z.array(z.number()).optional(),
        maxRaisePercent: z.number().optional(),
      }),
      employeeData: z.object({
        userId: z.number(),
        buId: z.number(),
        currentSalary: z.number(),
        bandMidpoint: z.number(),
        proposedBonus: z.number(),
        proposedRaise: z.number(),
        kpiScore: z.number(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const { taskId } = await submitTask(
        "COMPENSATION_RULE",
        input as Record<string, unknown>,
        ctx.user?.name ?? "system",
      );
      return { taskId, status: "pending" as const };
    }),

  /**
   * exportReport — aggregate results for a list of task IDs
   */
  exportReport: protectedProcedure
    .input(z.object({ taskIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const rows = await db.select().from(aiTasks)
        .where(and(
          eq(aiTasks.taskType, TASK_TYPE),
        ))
        .orderBy(desc(aiTasks.createdAt));

      const filtered = input.taskIds.length > 0
        ? rows.filter(r => input.taskIds.includes(r.id))
        : rows;

      const items = filtered.map(r => {
        const inp = r.inputData as Record<string, unknown> | null;
        const res = r.resultData as unknown as ParsingResult | null;
        const emp = inp?.employeeId
          ? EMPLOYEE_ASSESSMENTS.find(e => e.employeeId === inp.employeeId)
          : undefined;
        return {
          taskId: r.id,
          employeeName: emp?.name ?? "未知",
          department: emp?.department ?? "-",
          role: emp?.roleName ?? "-",
          status: r.status,
          overallScore: res?.overallScore ?? 0,
          overallGrade: res?.overallGrade ?? "-",
          parsedScores: res?.parsedScores ?? null,
          gaps: res?.gaps ?? [],
          source: res?.source ?? "-",
          createdAt: r.createdAt,
        };
      });

      return {
        generatedAt: new Date().toISOString(),
        total: items.length,
        items,
      };
    }),
});
