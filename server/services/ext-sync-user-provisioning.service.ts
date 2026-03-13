/**
 * 外部平台用户开通服务
 * 将 externalSyncUserMappings 中的成员自动开通为 GRT 系统用户
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { DEPARTMENT_TO_BU } from "./employee.service";

// 默认密码（从环境变量读取，禁止硬编码）
const DEFAULT_PASSWORD = process.env.EXT_SYNC_DEFAULT_PASSWORD ?? 'changeme';
let cachedDefaultHash: string | null = null;

async function getDefaultPasswordHash(): Promise<string> {
  if (!cachedDefaultHash) {
    const salt = await bcrypt.genSalt(10);
    cachedDefaultHash = await bcrypt.hash(DEFAULT_PASSWORD, salt);
  }
  return cachedDefaultHash;
}

// 职位关键字 → GRT 角色（按优先级排序）
const POSITION_ROLE_RULES: Array<{ keywords: string[]; role: string }> = [
  { keywords: ["董事长", "总裁", "总经理"], role: "admin" },
  { keywords: ["董事长助理"], role: "director" },
  { keywords: ["经理"], role: "dept_manager" },
  { keywords: ["主管", "班长", "班组长"], role: "team_lead" },
  { keywords: ["销售", "商务", "项目工程师"], role: "bu_sales" },
  { keywords: ["采购"], role: "procurement_eng" },
  { keywords: ["机械研发", "机械设计"], role: "bu_mech" },
  { keywords: ["电气工程师", "电气设计"], role: "bu_elec" },
  { keywords: ["售后", "客户服务"], role: "cs_engineer" },
  { keywords: ["人事", "行政"], role: "hr_specialist" },
  { keywords: ["会计", "仓库"], role: "finance_specialist" },
  { keywords: ["装配", "焊工", "激光", "数控", "CNC", "冷作", "铣工", "车工", "机加工"], role: "production_worker" },
];

/**
 * 根据职位推断 GRT 角色
 */
export function inferRoleFromPosition(position: string | null): string {
  if (!position) return "employee";
  for (const rule of POSITION_ROLE_RULES) {
    if (rule.keywords.some(kw => position.includes(kw))) {
      return rule.role;
    }
  }
  return "employee";
}

/**
 * 根据职位判断 users 表的 role 字段（只有 'admin' | 'user'）
 */
function inferUserRole(position: string | null): "admin" | "user" {
  if (!position) return "user";
  if (["董事长", "总裁", "总经理"].some(kw => position.includes(kw))) {
    return "admin";
  }
  return "user";
}

/**
 * 查询 externalSyncDeptMappings 获取部门中文名
 */
async function resolveDepartmentName(db: any, deptNos: number[] | null): Promise<string> {
  if (!deptNos || deptNos.length === 0) return "未分配";
  const deptNo = deptNos[0];
  const result = await db.execute(sql`
    SELECT jdy_dept_name FROM jiandaoyun_dept_mappings
    WHERE jdy_dept_no = ${deptNo}
    LIMIT 1
  `);
  const rows = (result.rows as any[]) || [];
  return rows.length > 0 ? rows[0].jdy_dept_name : "未分配";
}

/**
 * 按姓名匹配已有员工，或生成新 GRT 编号
 */
async function getOrGenerateEmployeeId(db: any, name: string): Promise<{ employeeId: string; isExisting: boolean; existingPosition?: string }> {
  // 按姓名精确匹配
  const existing = await db.execute(sql`
    SELECT employee_id, position FROM company_employees
    WHERE name = ${name} AND status = 'active'
    LIMIT 1
  `);
  const rows = (existing.rows as any[]) || [];
  if (rows.length > 0) {
    return {
      employeeId: rows[0].employee_id,
      isExisting: true,
      existingPosition: rows[0].position,
    };
  }

  // 生成下一个序号
  const maxResult = await db.execute(sql`
    SELECT employee_id FROM company_employees
    WHERE employee_id ~ '^GRT[0-9]+$'
    ORDER BY CAST(SUBSTRING(employee_id FROM 4) AS INTEGER) DESC
    LIMIT 1
  `);
  const maxRows = (maxResult.rows as any[]) || [];
  let nextNum = 1;
  if (maxRows.length > 0) {
    const currentMax = parseInt(maxRows[0].employee_id.substring(3), 10);
    nextNum = currentMax + 1;
  }
  return {
    employeeId: `GRT${String(nextNum).padStart(3, "0")}`,
    isExisting: false,
  };
}

// 开通结果统计
export interface ProvisionResult {
  usersCreated: number;
  usersLinked: number;
  usersUpdated: number;
  usersSkipped: number;
  employeesCreated: number;
  employeesUpdated: number;
  errors: Array<{ extUsername: string; error: string }>;
  details: Array<{
    extUsername: string;
    extName: string;
    action: "created" | "linked" | "updated" | "skipped" | "error";
    openId?: string;
    employeeId?: string;
    department?: string;
    role?: string;
    message?: string;
  }>;
}

/**
 * 核心：从 externalSyncUserMappings 批量开通用户
 * @param dryRun - true 时仅预览，不写入数据库
 */
export async function provisionUsersFromExternalSync(dryRun: boolean = false): Promise<ProvisionResult> {
  const db = await requireDb();
  const passwordHash = await getDefaultPasswordHash();
  const loginMethod = `local:${passwordHash}`;

  const result: ProvisionResult = {
    usersCreated: 0,
    usersLinked: 0,
    usersUpdated: 0,
    usersSkipped: 0,
    employeesCreated: 0,
    employeesUpdated: 0,
    errors: [],
    details: [],
  };

  // 获取所有外部平台用户映射
  const mappingsResult = await db.execute(sql`
    SELECT id, jdy_username, jdy_name, jdy_departments, jdy_status,
           grt_user_id, grt_open_id, "syncStatus"
    FROM jiandaoyun_user_mappings
    ORDER BY id
  `);
  const mappings = (mappingsResult.rows as any[]) || [];

  for (const mapping of mappings) {
    try {
      const extUsername = mapping.jdy_username;
      const extName = mapping.jdy_name;
      const extDepts = mapping.jdy_departments as number[] | null;
      const grtUserId = mapping.grt_user_id;

      // 解析部门 — quarantine unmapped users to isolation zone
      let departmentName = await resolveDepartmentName(db, extDepts);
      let buCode = DEPARTMENT_TO_BU[departmentName] || null;
      const isQuarantined = departmentName === "未分配";
      if (isQuarantined) {
        departmentName = "系统迁移隔离区";
        buCode = null;
      }

      if (!grtUserId) {
        // 场景 1 & 2：grt_user_id 为空
        // 检查 users 表是否已有该 openId
        const existingUserResult = await db.execute(sql`
          SELECT id, name FROM users WHERE "openId" = ${extUsername} LIMIT 1
        `);
        const existingUsers = (existingUserResult.rows as any[]) || [];

        if (existingUsers.length > 0) {
          // 场景 2：users 表已有该 openId，仅补链
          const userId = existingUsers[0].id;
          if (!dryRun) {
            await db.execute(sql`
              UPDATE jiandaoyun_user_mappings
              SET grt_user_id = ${userId}, grt_open_id = ${extUsername},
                  "syncStatus" = 'synced', last_sync_at = NOW(), updated_at = NOW()
              WHERE id = ${mapping.id}
            `);
          }
          result.usersLinked++;
          result.details.push({
            extUsername, extName,
            action: "linked",
            openId: extUsername,
            message: `已关联到现有用户 ID=${userId}`,
          });
        } else {
          // 场景 1：创建新用户
          // 查找/生成员工编号
          const empInfo = await getOrGenerateEmployeeId(db, extName);
          const position = empInfo.existingPosition || null;
          const userRole = inferUserRole(position);

          if (!dryRun) {
            // 创建 users 记录
            const insertResult = await db.execute(sql`
              INSERT INTO users ("openId", name, "loginMethod", role, "createdAt", "updatedAt", "lastSignedIn")
              VALUES (${extUsername}, ${extName}, ${loginMethod}, ${userRole}, NOW(), NOW(), NOW())
              RETURNING id
            `);
            const newUserId = (insertResult.rows as any[])[0]?.id;

            // 回写 mapping 关联 (quarantined if dept unmapped)
            await db.execute(sql`
              UPDATE jiandaoyun_user_mappings
              SET grt_user_id = ${newUserId}, grt_open_id = ${extUsername},
                  "syncStatus" = ${isQuarantined ? "quarantined" : "synced"}, last_sync_at = NOW(), updated_at = NOW()
              WHERE id = ${mapping.id}
            `);

            // 创建或更新 company_employees
            if (empInfo.isExisting) {
              // 已有员工记录，更新部门和 BU
              await db.execute(sql`
                UPDATE company_employees
                SET department = COALESCE(${departmentName !== "未分配" ? departmentName : null}, department),
                    bu_code = COALESCE(${buCode}, bu_code),
                    updated_at = NOW()
                WHERE employee_id = ${empInfo.employeeId}
              `);
              result.employeesUpdated++;
            } else {
              // 创建新员工记录
              await db.execute(sql`
                INSERT INTO company_employees (employee_id, name, department, position, bu_code, status)
                VALUES (${empInfo.employeeId}, ${extName}, ${departmentName}, ${"员工"}, ${buCode}, 'active')
              `);
              result.employeesCreated++;
            }
          }

          result.usersCreated++;
          result.details.push({
            extUsername, extName,
            action: "created",
            openId: extUsername,
            employeeId: empInfo.employeeId,
            department: departmentName,
            role: userRole,
            message: empInfo.isExisting ? "复用已有员工记录" : "创建新员工记录",
          });
        }
      } else {
        // 场景 3：grt_user_id 已有值，检查是否需要更新
        const userResult = await db.execute(sql`
          SELECT id, name, "openId" FROM users WHERE id = ${grtUserId} LIMIT 1
        `);
        const existingUser = (userResult.rows as any[])?.[0];

        if (!existingUser) {
          result.usersSkipped++;
          result.details.push({
            extUsername, extName,
            action: "skipped",
            message: `关联的用户 ID=${grtUserId} 不存在`,
          });
          continue;
        }

        // 检查姓名是否变化
        const nameChanged = existingUser.name !== extName;
        if (nameChanged && !dryRun) {
          await db.execute(sql`
            UPDATE users SET name = ${extName}, "updatedAt" = NOW()
            WHERE id = ${grtUserId}
          `);
        }

        // 检查员工记录的部门是否需要更新
        const empResult = await db.execute(sql`
          SELECT employee_id, department FROM company_employees
          WHERE name = ${extName} AND status = 'active'
          LIMIT 1
        `);
        const empRow = (empResult.rows as any[])?.[0];
        const deptChanged = empRow && departmentName !== "未分配" && empRow.department !== departmentName;

        if (deptChanged && !dryRun) {
          await db.execute(sql`
            UPDATE company_employees
            SET department = ${departmentName}, bu_code = ${buCode}, updated_at = NOW()
            WHERE employee_id = ${empRow.employee_id}
          `);
        }

        if (nameChanged || deptChanged) {
          result.usersUpdated++;
          if (!dryRun) {
            await db.execute(sql`
              UPDATE jiandaoyun_user_mappings
              SET "syncStatus" = 'synced', last_sync_at = NOW(), updated_at = NOW()
              WHERE id = ${mapping.id}
            `);
          }
          result.details.push({
            extUsername, extName,
            action: "updated",
            department: departmentName,
            message: [
              nameChanged ? `姓名更新: ${existingUser.name} → ${extName}` : null,
              deptChanged ? `部门更新: ${empRow.department} → ${departmentName}` : null,
            ].filter(Boolean).join("; "),
          });
        } else {
          result.usersSkipped++;
          result.details.push({
            extUsername, extName,
            action: "skipped",
            message: "无变化",
          });
        }
      }
    } catch (error: any) {
      result.errors.push({
        extUsername: mapping.jdy_username,
        error: error.message,
      });
      result.details.push({
        extUsername: mapping.jdy_username,
        extName: mapping.jdy_name,
        action: "error",
        message: error.message,
      });
    }
  }

  return result;
}
