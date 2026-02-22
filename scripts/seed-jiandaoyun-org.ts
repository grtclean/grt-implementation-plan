/**
 * 简道云组织架构导入脚本
 * Jiandaoyun Org Migration Script
 *
 * 功能:
 * 1. 检查 data/jiandaoyun_org.csv 是否存在，不存在则自动生成GRT真实组织架构
 * 2. 解析CSV数据
 * 3. 创建 departments 表 (IF NOT EXISTS)
 * 4. 插入部门层级数据
 * 5. 插入/更新员工数据到 company_employees 表
 *
 * 用法: npx tsx scripts/seed-jiandaoyun-org.ts
 */

import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, "..");
const CSV_PATH = path.join(PROJECT_ROOT, "data", "jiandaoyun_org.csv");

// ---------------------------------------------------------------------------
// Department configuration with BU mapping
// ---------------------------------------------------------------------------
const DEPT_CONFIG: Record<string, { nameEn: string; buCode: string; sortOrder: number }> = {
  "总裁办":     { nameEn: "Executive Office",           buCode: "HQ",  sortOrder: 1 },
  "财务部":     { nameEn: "Finance",                    buCode: "FIN", sortOrder: 2 },
  "人事行政部": { nameEn: "HR & Admin",                 buCode: "HR",  sortOrder: 3 },
  "AI数智部":   { nameEn: "AI & Digital",               buCode: "IT",  sortOrder: 4 },
  "事业部支持部": { nameEn: "BU Support",               buCode: "SUP", sortOrder: 5 },
  "事业一部":   { nameEn: "BU1 - Overseas",             buCode: "BU1", sortOrder: 10 },
  "事业二部":   { nameEn: "BU2 - Commercial Vehicles",  buCode: "BU2", sortOrder: 11 },
  "事业三部":   { nameEn: "BU3 - Passenger Vehicles",   buCode: "BU3", sortOrder: 12 },
  "事业四部":   { nameEn: "BU4 - Semiconductors",       buCode: "BU4", sortOrder: 13 },
  "事业十部":   { nameEn: "BU5 - Industrial General",   buCode: "BU5", sortOrder: 14 },
};

// ---------------------------------------------------------------------------
// Real GRT employee data (from init-employees.mjs)
// ---------------------------------------------------------------------------
const EMPLOYEES = [
  { employeeId: "GRT001", name: "侯亚东",  department: "总裁办",     position: "董事长",           email: "yadong.hou@gerrytech.com",   phone: "" },
  { employeeId: "GRT080", name: "刘凯运",  department: "AI数智部",   position: "董事长助理",       email: "kaiyun.liu@gerrytech.com",   phone: "" },
  { employeeId: "GRT002", name: "黄晓三",  department: "财务部",     position: "会计",             email: "xiaosan.huang@gerrytech.com", phone: "" },
  { employeeId: "GRT054", name: "王秀萍",  department: "财务部",     position: "总账会计",         email: "xiuping.wang@gerrytech.com",  phone: "" },
  { employeeId: "GRT101", name: "王汝月",  department: "财务部",     position: "会计助理",         email: "ruyue.wang@gerrytech.com",    phone: "" },
  { employeeId: "GRT066", name: "李新正",  department: "财务部",     position: "仓库管理员",       email: "xinzheng.li@gerrytech.com",   phone: "" },
  { employeeId: "GRT067", name: "沙建梅",  department: "人事行政部", position: "人事行政主管",     email: "jianmei.sha@gerrytech.com",   phone: "" },
  { employeeId: "GRT053", name: "段天珠",  department: "人事行政部", position: "前法",             email: "tianzhu.duan@gerrytech.com",  phone: "" },
  { employeeId: "GRT100", name: "田桃红",  department: "人事行政部", position: "行政助理",         email: "taohong.tian@gerrytech.com",  phone: "" },
  { employeeId: "GRT049", name: "胡炜",    department: "AI数智部",   position: "IT工程师",         email: "wei.hu@gerrytech.com",        phone: "" },
  { employeeId: "GRT062", name: "朱宇浩",  department: "AI数智部",   position: "IT工程师",         email: "yuhao.zhu@gerrytech.com",     phone: "" },
  { employeeId: "GRT096", name: "侯晓丽",  department: "AI数智部",   position: "部门研发工程师",   email: "xiaoli.hou@gerrytech.com",    phone: "" },
  { employeeId: "GRT083", name: "刘坤",    department: "AI数智部",   position: "销售与项目工程师", email: "kun.liu@gerrytech.com",        phone: "" },
  { employeeId: "GRT103", name: "朱文栋",  department: "AI数智部",   position: "市场专员",         email: "wendong.zhu@gerrytech.com",   phone: "" },
  { employeeId: "GRT004", name: "戴晓燕",  department: "事业一部",   position: "高级销售经理",     email: "xiaoyan.dai@gerrytech.com",   phone: "" },
  { employeeId: "GRT005", name: "金晓锋",  department: "事业一部",   position: "制造质量经理",     email: "xiaofeng.jin@gerrytech.com",  phone: "" },
  { employeeId: "GRT022", name: "李大鹏",  department: "事业一部",   position: "电气工程师",       email: "dapeng.li@gerrytech.com",     phone: "" },
  { employeeId: "GRT063", name: "刘建康",  department: "事业一部",   position: "销售经理",         email: "jiankang.liu@gerrytech.com",  phone: "" },
  { employeeId: "GRT006", name: "洪希龙",  department: "事业二部",   position: "机械设计经理",     email: "xilong.hong@gerrytech.com",   phone: "" },
  { employeeId: "GRT044", name: "洪小东",  department: "事业二部",   position: "机械研发工程师",   email: "xiaodong.hong@gerrytech.com", phone: "" },
  { employeeId: "GRT097", name: "钱绍辉",  department: "事业二部",   position: "电气工程师",       email: "shaohui.qian@gerrytech.com",  phone: "" },
  { employeeId: "GRT003", name: "侯亚琴",  department: "事业三部",   position: "采购与项目工程师", email: "yaqin.hou@gerrytech.com",     phone: "" },
  { employeeId: "GRT007", name: "孙坚",    department: "事业三部",   position: "电气主管",         email: "jian.sun@gerrytech.com",      phone: "" },
  { employeeId: "GRT055", name: "沈迎风",  department: "事业三部",   position: "商务经理",         email: "yingfeng.shen@gerrytech.com", phone: "" },
  { employeeId: "GRT019", name: "冯艳",    department: "事业三部",   position: "销售与项目工程师", email: "yan.feng@gerrytech.com",      phone: "" },
  { employeeId: "GRT018", name: "孙国祥",  department: "事业四部",   position: "电气工程师",       email: "guoxiang.sun@gerrytech.com",  phone: "" },
  { employeeId: "GRT024", name: "张鹏飞",  department: "事业四部",   position: "机加工班组长",     email: "pengfei.zhang@gerrytech.com", phone: "" },
  { employeeId: "GRT008", name: "马柯",    department: "事业十部",   position: "质量专员",         email: "ke.ma@gerrytech.com",         phone: "" },
  { employeeId: "GRT009", name: "史龙昌",  department: "事业十部",   position: "激光切作班组长",   email: "longchang.shi@gerrytech.com", phone: "" },
  { employeeId: "GRT045", name: "杨勇",    department: "事业部支持部", position: "客户与服务经理", email: "yong.yang@gerrytech.com",     phone: "" },
];

// ---------------------------------------------------------------------------
// CSV auto-generation
// ---------------------------------------------------------------------------
function generateCsv(): string {
  const header = "Name,Department,JobTitle,Email,Phone";
  const rows = EMPLOYEES.map(
    (e) => `${e.name},${e.department},${e.position},${e.email},${e.phone}`
  );
  return [header, ...rows].join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// CSV parsing (simple split — no commas in our field values)
// ---------------------------------------------------------------------------
interface CsvRow {
  name: string;
  department: string;
  jobTitle: string;
  email: string;
  phone: string;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  // Skip header line
  const dataLines = lines.slice(1);
  const rows: CsvRow[] = [];

  for (const line of dataLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(",");
    if (parts.length < 3) {
      console.warn(`  [WARN] Skipping malformed CSV line: ${trimmed}`);
      continue;
    }

    rows.push({
      name: parts[0]?.trim() || "",
      department: parts[1]?.trim() || "",
      jobTitle: parts[2]?.trim() || "",
      email: parts[3]?.trim() || "",
      phone: parts[4]?.trim() || "",
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function main() {
  console.log("=".repeat(60));
  console.log("  Jiandaoyun Org Migration Script");
  console.log("  简道云组织架构导入");
  console.log("=".repeat(60));
  console.log();

  // ---- Step 0: Validate DATABASE_URL ----
  if (!process.env.DATABASE_URL) {
    console.error("[ERROR] DATABASE_URL environment variable is not set.");
    console.error("  Please create a .env file with DATABASE_URL=postgresql://...");
    process.exit(1);
  }

  // ---- Step 1: Check / generate CSV ----
  let csvContent: string;
  if (fs.existsSync(CSV_PATH)) {
    console.log(`[CSV] Found existing file: ${CSV_PATH}`);
    csvContent = fs.readFileSync(CSV_PATH, "utf-8");
  } else {
    console.log(`[CSV] File not found at: ${CSV_PATH}`);
    console.log("[CSV] Auto-generating from GRT real org structure...");

    // Ensure data directory exists
    const dataDir = path.dirname(CSV_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    csvContent = generateCsv();
    fs.writeFileSync(CSV_PATH, csvContent, "utf-8");
    console.log(`[CSV] Written ${EMPLOYEES.length} employees to ${CSV_PATH}`);
  }

  // ---- Step 2: Parse CSV ----
  const rows = parseCsv(csvContent);
  console.log(`[CSV] Parsed ${rows.length} employee records`);
  if (rows.length === 0) {
    console.error("[ERROR] No employee records found in CSV. Aborting.");
    process.exit(1);
  }
  console.log();

  // ---- Step 3: Connect to database ----
  console.log("[DB] Connecting to PostgreSQL...");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Quick connectivity test
    const testResult = await pool.query("SELECT NOW() AS now");
    console.log(`[DB] Connected successfully at ${testResult.rows[0].now}`);
    console.log();

    // ---- Step 4: Create departments table ----
    console.log("[SCHEMA] Creating departments table (IF NOT EXISTS)...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        name_en VARCHAR(100),
        parent_id INTEGER REFERENCES departments(id),
        bu_code VARCHAR(20),
        sort_order INTEGER DEFAULT 0,
        head_employee_id VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[SCHEMA] departments table ready.");
    console.log();

    // ---- Step 5: Begin transaction for data insertion ----
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // ---- 5a: Insert departments ----
      console.log("[DEPT] Inserting departments...");
      const uniqueDepts = new Set<string>();
      for (const row of rows) {
        if (row.department) uniqueDepts.add(row.department);
      }

      let deptCreated = 0;
      let deptSkipped = 0;

      for (const deptName of uniqueDepts) {
        const config = DEPT_CONFIG[deptName];
        if (!config) {
          console.warn(`  [WARN] Unknown department "${deptName}" not in DEPT_CONFIG, inserting with defaults`);
        }

        const nameEn = config?.nameEn || deptName;
        const buCode = config?.buCode || "OTHER";
        const sortOrder = config?.sortOrder || 99;

        try {
          const result = await client.query(
            `INSERT INTO departments (name, name_en, parent_id, bu_code, sort_order, is_active, created_at, updated_at)
             VALUES ($1, $2, NULL, $3, $4, true, NOW(), NOW())
             ON CONFLICT (name) DO UPDATE SET
               name_en = EXCLUDED.name_en,
               bu_code = EXCLUDED.bu_code,
               sort_order = EXCLUDED.sort_order,
               updated_at = NOW()
             RETURNING id`,
            [deptName, nameEn, buCode, sortOrder]
          );
          const action = result.rowCount && result.rowCount > 0 ? "upserted" : "exists";
          console.log(`  ${deptName} (${nameEn}) [${buCode}] -> ${action}, id=${result.rows[0]?.id}`);
          deptCreated++;
        } catch (err: any) {
          console.error(`  [ERROR] Department "${deptName}": ${err.message}`);
          deptSkipped++;
        }
      }

      console.log(`[DEPT] Done: ${deptCreated} upserted, ${deptSkipped} errors`);
      console.log();

      // ---- 5b: Insert employees into company_employees ----
      console.log("[EMP] Inserting employees into company_employees...");
      let empInserted = 0;
      let empUpdated = 0;
      let empErrors = 0;

      for (const row of rows) {
        const buCode = DEPT_CONFIG[row.department]?.buCode || "OTHER";

        // Derive employeeId from the EMPLOYEES constant if possible
        const knownEmp = EMPLOYEES.find(
          (e) => e.name === row.name && e.department === row.department
        );
        const employeeId = knownEmp?.employeeId || `GRT_${row.name}`;

        try {
          const result = await client.query(
            `INSERT INTO company_employees (employee_id, name, department, position, bu_code, email, phone, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())
             ON CONFLICT (employee_id) DO UPDATE SET
               name = EXCLUDED.name,
               department = EXCLUDED.department,
               position = EXCLUDED.position,
               bu_code = EXCLUDED.bu_code,
               email = EXCLUDED.email,
               phone = EXCLUDED.phone,
               updated_at = NOW()`,
            [
              employeeId,
              row.name,
              row.department,
              row.jobTitle,
              buCode,
              row.email || null,
              row.phone || null,
            ]
          );
          if (result.command === "INSERT") {
            empInserted++;
          } else {
            empUpdated++;
          }
          console.log(`  ${employeeId} ${row.name} (${row.department} / ${row.jobTitle})`);
        } catch (err: any) {
          // If ON CONFLICT fails (e.g., no unique index on employee_id), try fallback
          if (err.message.includes("there is no unique or exclusion constraint")) {
            console.warn("  [WARN] No unique constraint on employee_id — using fallback DELETE+INSERT strategy");
            try {
              await client.query(
                `DELETE FROM company_employees WHERE employee_id = $1`,
                [employeeId]
              );
              await client.query(
                `INSERT INTO company_employees (employee_id, name, department, position, bu_code, email, phone, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())`,
                [
                  employeeId,
                  row.name,
                  row.department,
                  row.jobTitle,
                  buCode,
                  row.email || null,
                  row.phone || null,
                ]
              );
              empInserted++;
              console.log(`  ${employeeId} ${row.name} (fallback insert OK)`);
            } catch (fallbackErr: any) {
              console.error(`  [ERROR] Employee "${row.name}" fallback failed: ${fallbackErr.message}`);
              empErrors++;
            }
          } else {
            console.error(`  [ERROR] Employee "${row.name}" (${employeeId}): ${err.message}`);
            empErrors++;
          }
        }
      }

      console.log(`[EMP] Done: ${empInserted} inserted, ${empUpdated} updated, ${empErrors} errors`);
      console.log();

      // ---- Commit transaction ----
      await client.query("COMMIT");
      console.log("[TX] Transaction committed successfully.");
      console.log();

      // ---- Step 6: Verification ----
      console.log("=".repeat(60));
      console.log("  Verification / 验证结果");
      console.log("=".repeat(60));
      console.log();

      // Department counts
      const deptStats = await pool.query(`
        SELECT d.name AS department, d.name_en, d.bu_code,
               COUNT(ce.id) AS employee_count
        FROM departments d
        LEFT JOIN company_employees ce ON ce.department = d.name AND ce.status = 'active'
        GROUP BY d.id, d.name, d.name_en, d.bu_code
        ORDER BY d.sort_order
      `);

      console.log("  Department                    | BU   | Employees");
      console.log("  " + "-".repeat(56));

      let totalVerified = 0;
      for (const row of deptStats.rows) {
        const deptDisplay = (row.department + " (" + row.name_en + ")").padEnd(30);
        const buDisplay = (row.bu_code || "").padEnd(4);
        const count = Number(row.employee_count);
        totalVerified += count;
        console.log(`  ${deptDisplay} | ${buDisplay} | ${count}`);
      }

      console.log("  " + "-".repeat(56));
      console.log(`  Total departments: ${deptStats.rows.length}`);
      console.log(`  Total employees (active): ${totalVerified}`);
      console.log();

      // Total in company_employees
      const totalEmp = await pool.query(
        `SELECT COUNT(*) AS total FROM company_employees WHERE status = 'active'`
      );
      console.log(`  company_employees total (all active): ${totalEmp.rows[0].total}`);
      console.log();

    } catch (txErr: any) {
      await client.query("ROLLBACK");
      console.error("[TX] Transaction rolled back due to error:", txErr.message);
      throw txErr;
    } finally {
      client.release();
    }

  } catch (err: any) {
    console.error("[FATAL] Script failed:", err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
    console.log("[DB] Connection pool closed.");
  }

  console.log();
  console.log("=".repeat(60));
  console.log("  Seed complete!");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
