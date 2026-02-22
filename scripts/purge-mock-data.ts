/**
 * GRT System — The Great Purge
 * Safely deletes mock/simulation data from the database.
 * Rows only — no tables dropped.
 *
 * Usage: npx tsx scripts/purge-mock-data.ts
 */
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const MOCK_USER_CONDITION = `(email ILIKE '%mock%' OR email ILIKE '%test%' OR email ILIKE '%simulation%' OR email ILIKE '%example.com%' OR email ILIKE '%fake%')`;

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  GRT System — The Great Purge");
  console.log("  Removing mock/simulation data");
  console.log("═══════════════════════════════════════════\n");

  if (!process.env.DATABASE_URL) {
    console.error("[ERROR] DATABASE_URL not set.");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  const stats: Record<string, number> = {};

  try {
    await client.query("BEGIN");

    // 1. Purge grt_employees (compliance test data)
    const r1 = await client.query(`DELETE FROM grt_employees RETURNING id`);
    stats["grt_employees"] = r1.rowCount ?? 0;
    console.log(`[1/8] grt_employees: deleted ${stats["grt_employees"]} rows`);

    // 2. Purge hrm_employees (non-GRT simulation records)
    const r2 = await client.query(
      `DELETE FROM hrm_employees WHERE "employeeCode" NOT LIKE 'GRT%' RETURNING id`
    );
    stats["hrm_employees"] = r2.rowCount ?? 0;
    console.log(`[2/8] hrm_employees: deleted ${stats["hrm_employees"]} rows`);

    // 3. Purge dev_tasks (test tasks)
    const r3 = await client.query(
      `DELETE FROM dev_tasks WHERE LOWER(title) LIKE '%test task%' OR LOWER(title) LIKE '%task to update%' RETURNING id`
    );
    stats["dev_tasks"] = r3.rowCount ?? 0;
    console.log(`[3/8] dev_tasks: deleted ${stats["dev_tasks"]} rows`);

    // 4. FK cascade cleanup — delete child rows referencing mock users BEFORE deleting users
    //    Find all tables with FK to users.id and clean them
    const fkChildTables = [
      "employee_capabilities",
      "employee_domain_scores",
      "employee_skill_maps",
      "employee_ai_assistants",
      "employee_digital_assistants",
      "employee_xp",
      "employee_achievements",
      "employee_levels",
      "user_favorites",
      "user_menu_customization",
    ];

    let fkTotal = 0;
    for (const tbl of fkChildTables) {
      // Check if table exists first
      const exists = await client.query(
        `SELECT to_regclass($1) AS oid`, [`public.${tbl}`]
      );
      if (!exists.rows[0]?.oid) continue;

      // Check which column references users (could be employee_id, user_id, or employeeId)
      // Only match integer columns (users.id is integer)
      const colCheck = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        AND column_name IN ('employee_id', 'user_id', 'employeeId')
        AND data_type = 'integer'
        LIMIT 1
      `, [tbl]);
      if (colCheck.rows.length === 0) continue;

      const col = colCheck.rows[0].column_name;
      const fkResult = await client.query(
        `DELETE FROM "${tbl}" WHERE "${col}" IN (SELECT id FROM users WHERE ${MOCK_USER_CONDITION})`
      );
      const cnt = fkResult.rowCount ?? 0;
      if (cnt > 0) {
        fkTotal += cnt;
        console.log(`  [FK] ${tbl}: deleted ${cnt} dependent rows`);
      }
    }
    stats["fk_child_rows"] = fkTotal;
    console.log(`[4/8] FK child cleanup: deleted ${fkTotal} dependent rows total`);

    // 5. Purge mock users
    const r5 = await client.query(
      `DELETE FROM users WHERE ${MOCK_USER_CONDITION} RETURNING id`
    );
    stats["users"] = r5.rowCount ?? 0;
    console.log(`[5/8] users: deleted ${stats["users"]} mock user rows`);

    // 6. Purge orphaned user_roles
    const r6 = await client.query(
      `DELETE FROM user_roles WHERE user_id NOT IN (SELECT id FROM users) RETURNING id`
    );
    stats["user_roles"] = r6.rowCount ?? 0;
    console.log(`[6/8] user_roles: deleted ${stats["user_roles"]} orphaned rows`);

    // 7. Purge JDY import run logs (if table exists)
    const jdyExists = await client.query(`SELECT to_regclass('public.jiandaoyun_import_runs') AS oid`);
    if (jdyExists.rows[0]?.oid) {
      const r7 = await client.query(`DELETE FROM jiandaoyun_import_runs RETURNING id`);
      stats["jiandaoyun_import_runs"] = r7.rowCount ?? 0;
    } else {
      stats["jiandaoyun_import_runs"] = 0;
    }
    console.log(`[7/8] jiandaoyun_import_runs: deleted ${stats["jiandaoyun_import_runs"]} rows`);

    // 8. Purge non-GRT company_employees
    const r8 = await client.query(
      `DELETE FROM company_employees WHERE employee_id NOT LIKE 'GRT%'`
    );
    stats["company_employees"] = r8.rowCount ?? 0;
    console.log(`[8/8] company_employees: deleted ${stats["company_employees"]} non-GRT rows`);

    await client.query("COMMIT");

    // Summary
    const totalDeleted = Object.values(stats).reduce((a, b) => a + b, 0);
    console.log("\n═══════════════════════════════════════════");
    console.log("  PURGE COMPLETE");
    console.log("═══════════════════════════════════════════");
    console.log(`  Total rows deleted: ${totalDeleted}`);
    for (const [table, count] of Object.entries(stats)) {
      if (count > 0) console.log(`    ${table}: ${count}`);
    }
    console.log("═══════════════════════════════════════════");

    // Post-purge verification
    console.log("\n[Verification] Remaining data:");
    const v1 = await client.query(`SELECT count(*) as cnt FROM users`);
    console.log(`  users: ${v1.rows[0].cnt} rows`);
    const v2 = await client.query(`SELECT count(*) as cnt FROM company_employees`);
    console.log(`  company_employees: ${v2.rows[0].cnt} rows`);
    const v3 = await client.query(`SELECT count(*) as cnt FROM hrm_employees`);
    console.log(`  hrm_employees: ${v3.rows[0].cnt} rows`);

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\n[ERROR] Purge failed:", error);
    console.error("Transaction rolled back — no data was deleted.");
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
