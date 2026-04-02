/**
 * Organization Tree Router
 * Serves department + employee data from the database for Clean Slate verification.
 */
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { requireDb } from "../db";

export const orgRouter = router({
  getDepartments: protectedProcedure.query(async () => {
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT id, name, name_en, parent_id, bu_code, sort_order, head_employee_id, is_active
      FROM departments
      WHERE is_active = true
      ORDER BY sort_order, name
    `);
    return result.rows;
  }),

  getEmployees: protectedProcedure.query(async () => {
    const db = await requireDb();
    const result = await db.execute(sql`
      SELECT id, employee_id, name, department, position, bu_code, email, phone, status
      FROM company_employees
      WHERE status = 'active'
      ORDER BY department, employee_id
    `);
    return result.rows;
  }),

  getOrgTree: protectedProcedure.query(async () => {
    const db = await requireDb();
    // Get departments
    const deptResult = await db.execute(sql`
      SELECT id, name, name_en, parent_id, bu_code, sort_order, head_employee_id
      FROM departments
      WHERE is_active = true
      ORDER BY sort_order, name
    `);
    // Get employees
    const empResult = await db.execute(sql`
      SELECT id, employee_id, name, department, position, bu_code, email, phone
      FROM company_employees
      WHERE status = 'active'
      ORDER BY employee_id
    `);
    return {
      departments: deptResult.rows,
      employees: empResult.rows,
      summary: {
        totalDepartments: deptResult.rows.length,
        totalEmployees: empResult.rows.length,
      },
    };
  }),

  getOrgStats: protectedProcedure.query(async () => {
    const db = await requireDb();
    const deptResult = await db.execute(sql`
      SELECT COUNT(*)::int as total,
        SUM(CASE WHEN bu_code IS NOT NULL THEN 1 ELSE 0 END)::int as bu_count
      FROM departments WHERE is_active = true
    `);
    const empResult = await db.execute(sql`
      SELECT COUNT(*)::int as total,
        COUNT(DISTINCT position)::int as positions
      FROM company_employees WHERE status = 'active'
    `);
    const dept = (deptResult as any).rows?.[0] ?? { total: 0, bu_count: 0 };
    const emp = (empResult as any).rows?.[0] ?? { total: 0, positions: 0 };
    return {
      buCount: Number(dept.bu_count ?? 0),
      deptCount: Number(dept.total ?? 0),
      totalEmployees: Number(emp.total ?? 0),
      positionTypes: Number(emp.positions ?? 0),
    };
  }),

  createDepartment: requirePermission('hr:org:manage')
    .input(z.object({
      name: z.string().min(1),
      nameEn: z.string().optional(),
      parentId: z.number().optional(),
      buCode: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql`
        INSERT INTO departments (name, name_en, parent_id, bu_code, is_active, sort_order)
        VALUES (${input.name}, ${input.nameEn ?? null}, ${input.parentId ?? null}, ${input.buCode ?? null}, true, 0)
      `);
      return { success: true };
    }),

  updateDepartment: requirePermission('hr:org:manage')
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nameEn: z.string().optional(),
      parentId: z.number().optional(),
      buCode: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const setClauses: ReturnType<typeof sql>[] = [];
      if (input.name) setClauses.push(sql`name = ${input.name}`);
      if (input.nameEn) setClauses.push(sql`name_en = ${input.nameEn}`);
      if (input.parentId !== undefined) setClauses.push(sql`parent_id = ${input.parentId}`);
      if (input.buCode) setClauses.push(sql`bu_code = ${input.buCode}`);
      if (setClauses.length === 0) return { success: false };
      await db.execute(sql`UPDATE departments SET ${sql.join(setClauses, sql`, `)} WHERE id = ${input.id}`);
      return { success: true };
    }),

  /** 从 grt_employees 表获取完整上下级关系树 */
  getHierarchy: protectedProcedure.query(async () => {
    const db = await requireDb();
    try {
      const result: any = await db.execute(sql`
        SELECT
          e.id, e.employee_id, e.name, e.department,
          e.supervisor_id,
          s.name AS supervisor_name,
          e.is_active
        FROM grt_employees e
        LEFT JOIN grt_employees s ON e.supervisor_id = s.id
        WHERE e.is_active = 1
        ORDER BY e.supervisor_id NULLS FIRST, e.department, e.name
      `);
      const rows = result?.rows ?? result ?? [];
      return { employees: rows };
    } catch {
      return { employees: [] };
    }
  }),
});
