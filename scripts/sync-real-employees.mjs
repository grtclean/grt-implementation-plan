/**
 * GRT Employee Data Sync Script
 *
 * 1. Deletes all test/demo users from `users` table
 * 2. Upserts `company_employees` from employees.json (authoritative source)
 * 3. Creates proper user accounts for all real employees
 *
 * Usage: node scripts/sync-real-employees.mjs
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "data", "employees.json");

// Department → BU mapping
const departmentToBU = {
  "事业一部": "BU1",
  "事业二部": "BU2",
  "事业三部": "BU3",
  "事业四部": "BU4",
  "事业十部": "BU5",
  "总裁办": "HQ",
  "财务部": "FINANCE",
  "人事行政部": "HR",
  "AI数智部": "IT",
  "事业部支持部": "SUPPORT",
};

// Position → role mapping
function positionToRole(position, department) {
  const p = position || "";
  if (p.includes("董事长")) return "ceo";
  if (p.includes("总经理")) return "director";
  if (p.includes("部门经理") || p.includes("AI数智&人事行政部经理")) return "dept_manager";
  if (p.includes("经理") && (p.includes("高级销售") || p.includes("质量经理") || p.includes("设计经理"))) return "dept_manager";
  if (p.includes("主管") || p.includes("班组长") || p.includes("副班长")) return "team_leader";
  if (p.includes("会计") || p.includes("会计助理") || p.includes("财务")) return "finance_specialist";
  if (p.includes("人事") || p.includes("行政") || p.includes("前台")) return "hr_specialist";
  if (p.includes("工程师") || p.includes("研发")) return "employee";
  if (p.includes("技工") || p.includes("装配") || p.includes("焊工") || p.includes("冷作") || p.includes("激光") || p.includes("铣工") || p.includes("钳工") || p.includes("铆工") || p.includes("机加工")) return "production_worker";
  if (p.includes("质量")) return "employee";
  if (p.includes("采购")) return "employee";
  if (p.includes("销售") || p.includes("市场")) return "employee";
  if (p.includes("售后")) return "cs_engineer";
  return "employee";
}

async function main() {
  const connStr = process.env.DATABASE_URL;
  if (!connStr) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const Pool = pg.Pool || pg.default?.Pool;
  const pool = new Pool({ connectionString: connStr });

  try {
    // Load employees.json
    const raw = fs.readFileSync(dataPath, "utf-8");
    const { employees } = JSON.parse(raw);
    console.log(`Loaded ${employees.length} employees from employees.json`);

    // ── Step 1: Mark test/demo users (can't delete due to FK constraints) ──
    const testNames = ["camellia", "Xiwang", "糊糊糊", "Test Admin", "Camellia Ni", "测试员（无管理权限）", "Bonnie"];
    const deactivateResult = await pool.query(
      `UPDATE users SET name = CONCAT('[已停用]', name)
       WHERE (name = ANY($1) OR "openId" LIKE 'jdy-%' OR "openId" = 'testadmin')
       AND name NOT LIKE '[已停用]%'`,
      [testNames]
    );
    console.log(`Marked ${deactivateResult.rowCount} test/demo users as deactivated`);

    // ── Step 2: De-duplicate users table ──
    // For duplicate names, keep the one with highest ID and mark others
    const dupeResult = await pool.query(`
      UPDATE users SET name = CONCAT('[重复]', name)
      WHERE id NOT IN (
        SELECT MAX(id) FROM users WHERE name NOT LIKE '[已停用]%' AND name NOT LIKE '[重复]%' GROUP BY name
      ) AND "openId" != 'admin'
      AND name NOT LIKE '[已停用]%' AND name NOT LIKE '[重复]%'
    `);
    console.log(`Marked ${dupeResult.rowCount} duplicate user entries`);

    // ── Step 3: Upsert company_employees from employees.json ──
    // First, clear existing data
    await pool.query(`DELETE FROM company_employees`);
    console.log("Cleared company_employees table");

    let insertedCount = 0;
    for (const emp of employees) {
      const buCode = departmentToBU[emp.department] || "OTHER";
      const role = positionToRole(emp.position, emp.department);
      await pool.query(`
        INSERT INTO company_employees (employee_id, name, department, position, bu_code, system_role, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        ON CONFLICT (employee_id) DO UPDATE SET
          name = EXCLUDED.name,
          department = EXCLUDED.department,
          position = EXCLUDED.position,
          bu_code = EXCLUDED.bu_code,
          system_role = EXCLUDED.system_role,
          status = 'active'
      `, [emp.id, emp.name, emp.department, emp.position, buCode, role]);
      insertedCount++;
    }
    console.log(`Upserted ${insertedCount} company_employees records`);

    // ── Step 4: Ensure all real employees have user accounts ──
    // For employees not yet in the users table, create accounts with default password
    const defaultPassword = "Gerry123";
    const hash = bcrypt.hashSync(defaultPassword, 10);

    let createdCount = 0;
    let updatedCount = 0;
    for (const emp of employees) {
      const functionalRole = positionToRole(emp.position, emp.department);
      // users table only has enum: user/admin
      const dbRole = (emp.id === "GRT001") ? "admin" : "user";

      // Check if this employee already has a user account (match by name, skip marked)
      const existing = await pool.query(
        `SELECT id, "openId", name, role FROM users WHERE name = $1 AND name NOT LIKE '[已停用]%' AND name NOT LIKE '[重复]%' LIMIT 1`,
        [emp.name]
      );

      if (existing.rows.length > 0) {
        // Already exists — no need to create
        updatedCount++;
      } else {
        // Create new user account with employeeId as openId
        const openId = emp.id.toLowerCase(); // e.g., "grt001"
        // Check if openId already exists
        const existingOpenId = await pool.query(
          `SELECT id FROM users WHERE "openId" = $1 LIMIT 1`, [openId]
        );
        if (existingOpenId.rows.length > 0) {
          await pool.query(
            `UPDATE users SET name = $1 WHERE "openId" = $2`, [emp.name, openId]
          );
        } else {
          await pool.query(`
            INSERT INTO users ("openId", name, role, "loginMethod", "lastSignedIn")
            VALUES ($1, $2, $3, $4, NOW())
          `, [openId, emp.name, dbRole, `local:${hash}`]);
        }
        createdCount++;
      }
    }
    console.log(`Created ${createdCount} new user accounts (password: ${defaultPassword})`);
    console.log(`Updated ${updatedCount} existing user roles`);

    // ── Step 5: Update admin user to have CEO's name ──
    await pool.query(`UPDATE users SET name = '倪亚东' WHERE "openId" = 'admin'`);
    console.log("Updated admin user name to 倪亚东");

    // ── Summary ──
    const finalUsers = await pool.query(`SELECT COUNT(*) as cnt FROM users`);
    const finalEmployees = await pool.query(`SELECT COUNT(*) as cnt FROM company_employees`);
    console.log("\n=== Final State ===");
    console.log(`users table: ${finalUsers.rows[0].cnt} records`);
    console.log(`company_employees table: ${finalEmployees.rows[0].cnt} records`);

    // Show a sample
    const sample = await pool.query(`
      SELECT ce.employee_id, ce.name, ce.department, ce.position, ce.system_role, u.id as user_id
      FROM company_employees ce
      LEFT JOIN users u ON u.name = ce.name AND u.name NOT LIKE '[已停用]%' AND u.name NOT LIKE '[重复]%'
      ORDER BY ce.employee_id
      LIMIT 10
    `);
    console.log("\nSample (first 10):");
    sample.rows.forEach(r => {
      console.log(`  ${r.employee_id} ${r.name.padEnd(6)} ${r.department.padEnd(8)} ${r.position.padEnd(20)} role=${r.system_role} user_id=${r.user_id || 'N/A'}`);
    });

  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
