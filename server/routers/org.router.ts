/**
 * Organization Tree Router
 * Serves department + employee data from the database for Clean Slate verification.
 */
import { router, protectedProcedure } from "../_core/trpc";
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
});
