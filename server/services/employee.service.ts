/**
 * 公司员工管理服务
 * v1.3.91 - 组织架构人员清单管理
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// 员工状态类型
export type EmployeeStatus = 'active' | 'inactive' | 'resigned';

// 员工数据结构
export interface Employee {
  id: number;
  employeeId: string;
  name: string;
  department: string;
  position: string;
  buCode: string | null;
  email: string | null;
  phone: string | null;
  hireDate: Date | null;
  status: EmployeeStatus;
  createdAt: Date;
  updatedAt: Date;
}

// 创建员工输入
export interface CreateEmployeeInput {
  employeeId: string;
  name: string;
  department: string;
  position: string;
  buCode?: string;
  email?: string;
  phone?: string;
  hireDate?: Date;
  status?: EmployeeStatus;
}

// 部门到BU的映射
const DEPARTMENT_TO_BU: Record<string, string> = {
  '事业一部': 'BU1',
  '事业二部': 'BU2',
  '事业三部': 'BU3',
  '事业四部': 'BU4',
  '事业十部': 'BU5',
  '总裁办': 'HQ',
  '财务部': 'FIN',
  '人事行政部': 'HR',
  'AI数智部': 'IT',
  '事业部支持部': 'SUP',
};

// BU代码到名称的映射
export const BU_CODE_TO_NAME: Record<string, string> = {
  'BU1': '海外事业部',
  'BU2': '商用车事业部',
  'BU3': '乘用车事业部',
  'BU4': '半导体事业部',
  'BU5': '工业通用事业部',
  'HQ': '总部',
  'FIN': '财务部',
  'HR': '人事行政部',
  'IT': 'AI数智部',
  'SUP': '事业部支持部',
};

/**
 * 根据部门名称获取BU代码
 */
export function getBUCodeFromDepartment(department: string): string | null {
  return DEPARTMENT_TO_BU[department] || null;
}

/**
 * 获取所有员工
 */
export async function getAllEmployees(): Promise<Employee[]> {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT
      id, employee_id as "employeeId", name, department, position,
      bu_code as "buCode", email, phone, hire_date as "hireDate",
      status, created_at as "createdAt", updated_at as "updatedAt"
    FROM company_employees
    WHERE status = 'active'
    ORDER BY employee_id
  `);
  return (result.rows as any[]) || [];
}

/**
 * 按部门获取员工
 */
export async function getEmployeesByDepartment(department: string): Promise<Employee[]> {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT
      id, employee_id as "employeeId", name, department, position,
      bu_code as "buCode", email, phone, hire_date as "hireDate",
      status, created_at as "createdAt", updated_at as "updatedAt"
    FROM company_employees
    WHERE department = ${department} AND status = 'active'
    ORDER BY employee_id
  `);
  return (result.rows as any[]) || [];
}

/**
 * 按BU代码获取员工
 */
export async function getEmployeesByBU(buCode: string): Promise<Employee[]> {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT
      id, employee_id as "employeeId", name, department, position,
      bu_code as "buCode", email, phone, hire_date as "hireDate",
      status, created_at as "createdAt", updated_at as "updatedAt"
    FROM company_employees
    WHERE bu_code = ${buCode} AND status = 'active'
    ORDER BY employee_id
  `);
  return (result.rows as any[]) || [];
}

/**
 * 根据员工编号获取员工
 */
export async function getEmployeeById(employeeId: string): Promise<Employee | null> {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT
      id, employee_id as "employeeId", name, department, position,
      bu_code as "buCode", email, phone, hire_date as "hireDate",
      status, created_at as "createdAt", updated_at as "updatedAt"
    FROM company_employees
    WHERE employee_id = ${employeeId}
    LIMIT 1
  `);
  const rows = (result.rows as any[]) || [];
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 创建员工
 */
export async function createEmployee(input: CreateEmployeeInput): Promise<{ id: number }> {
  const db = await requireDb();
  const buCode = input.buCode || getBUCodeFromDepartment(input.department);
  
  const result = await db.execute(sql`
    INSERT INTO company_employees (employee_id, name, department, position, bu_code, email, phone, hire_date, status)
    VALUES (${input.employeeId}, ${input.name}, ${input.department}, ${input.position},
            ${buCode}, ${input.email || null}, ${input.phone || null},
            ${input.hireDate || null}, ${input.status || 'active'})
    RETURNING id
  `);
  
  return { id: (result.rows as any[])[0]?.id ?? 0 };
}

/**
 * 批量创建员工
 */
export async function batchCreateEmployees(employees: CreateEmployeeInput[]): Promise<{ created: number; skipped: number }> {
  const db = await requireDb();
  let created = 0;
  let skipped = 0;
  
  for (const emp of employees) {
    try {
      const existing = await getEmployeeById(emp.employeeId);
      if (existing) {
        skipped++;
        continue;
      }
      
      const buCode = emp.buCode || getBUCodeFromDepartment(emp.department);
      
      await db.execute(sql`
        INSERT INTO company_employees (employee_id, name, department, position, bu_code, email, phone, status)
        VALUES (${emp.employeeId}, ${emp.name}, ${emp.department}, ${emp.position}, 
                ${buCode}, ${emp.email || null}, ${emp.phone || null}, 'active')
      `);
      created++;
    } catch (error) {
      console.error(`Failed to create employee ${emp.employeeId}:`, error);
      skipped++;
    }
  }
  
  return { created, skipped };
}

/**
 * 更新员工信息
 */
export async function updateEmployee(employeeId: string, updates: Partial<CreateEmployeeInput>): Promise<boolean> {
  const db = await requireDb();

  // Build update using parameterized query to prevent SQL injection
  const name = updates.name;
  const department = updates.department;
  const position = updates.position;
  const email = updates.email;
  const phone = updates.phone;
  const status = updates.status;
  const buCode = department ? getBUCodeFromDepartment(department) : null;

  if (!name && !department && !position && email === undefined && phone === undefined && !status) {
    return false;
  }

  await db.execute(sql`
    UPDATE company_employees SET
      name = COALESCE(${name || null}, name),
      department = COALESCE(${department || null}, department),
      position = COALESCE(${position || null}, position),
      bu_code = COALESCE(${buCode || null}, bu_code),
      email = CASE WHEN ${email !== undefined} THEN ${email || null} ELSE email END,
      phone = CASE WHEN ${phone !== undefined} THEN ${phone || null} ELSE phone END,
      status = COALESCE(${status || null}, status),
      updated_at = NOW()
    WHERE employee_id = ${employeeId}
  `);

  return true;
}

/**
 * 获取部门统计
 */
export async function getDepartmentStats(): Promise<{ department: string; buCode: string; buName: string; count: number }[]> {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT
      department,
      bu_code as "buCode",
      COUNT(*) as count
    FROM company_employees
    WHERE status = 'active'
    GROUP BY department, bu_code
    ORDER BY count DESC
  `);

  const rows = (result.rows as any[]) || [];
  return rows.map(row => ({
    department: row.department,
    buCode: row.buCode || 'UNKNOWN',
    buName: BU_CODE_TO_NAME[row.buCode] || row.department,
    count: Number(row.count),
  }));
}

/**
 * 获取BU统计
 */
export async function getBUStats(): Promise<{ buCode: string; buName: string; count: number; departments: string[] }[]> {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT
      bu_code as "buCode",
      STRING_AGG(DISTINCT department, ',') as departments,
      COUNT(*) as count
    FROM company_employees
    WHERE status = 'active' AND bu_code IS NOT NULL
    GROUP BY bu_code
    ORDER BY count DESC
  `);

  const rows = (result.rows as any[]) || [];
  return rows.map(row => ({
    buCode: row.buCode,
    buName: BU_CODE_TO_NAME[row.buCode] || row.buCode,
    count: Number(row.count),
    departments: row.departments ? row.departments.split(',') : [],
  }));
}

/**
 * 搜索员工
 */
export async function searchEmployees(keyword: string): Promise<Employee[]> {
  const db = await requireDb();
  const searchTerm = `%${keyword}%`;
  const result = await db.execute(sql`
    SELECT
      id, employee_id as "employeeId", name, department, position,
      bu_code as "buCode", email, phone, hire_date as "hireDate",
      status, created_at as "createdAt", updated_at as "updatedAt"
    FROM company_employees
    WHERE status = 'active'
      AND (name ILIKE ${searchTerm} OR employee_id ILIKE ${searchTerm} OR position ILIKE ${searchTerm})
    ORDER BY employee_id
    LIMIT 50
  `);
  return (result.rows as any[]) || [];
}
