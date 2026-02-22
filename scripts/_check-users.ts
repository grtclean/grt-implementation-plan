import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const r = await pool.query(`SELECT id, name, email, role, "loginMethod", "openId" FROM users ORDER BY id`);
  console.log("=== Current Users ===");
  for (const row of r.rows) {
    console.log(`  id=${row.id} name=${row.name} email=${row.email} role=${row.role} login=${row.loginMethod} openId=${row.openId ? 'yes' : 'null'}`);
  }
  console.log(`\nTotal: ${r.rows.length} users`);
  await pool.end();
}
main();
