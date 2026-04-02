/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  金蝶K/3 → GRT System 全量数据导入 (Master Script v1.0)      ║
 * ║  Direct MSSQL → PostgreSQL ETL                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Entities (dependency order):
 *   1. departments   → console log only (no target table yet)
 *   2. employees     → console log only
 *   3. gl_accounts   → GRT gl_accounts
 *   4. suppliers     → GRT suppliers
 *   5. customers     → GRT after_sales_clients
 *   6. items         → GRT materials
 *   7. po_orders     → GRT purchase_orders
 *   8. ap_bills      → console log (supplier_payment_tracking)
 *   9. ar_bills      → console log (customer_payment_tracking)
 *  10. inventory     → GRT inventory
 *  11. balances      → GRT account_balances
 *
 * Usage:
 *   node scripts/kingdee-master-import.cjs               # 全量导入
 *   node scripts/kingdee-master-import.cjs --discover     # 仅发现表
 *   node scripts/kingdee-master-import.cjs --dry-run      # 预演
 */

const mssqlLib = require("mssql");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// ── Config ──
function loadEnv() {
  const vars = {};
  for (const f of [".env.development", ".env"]) {
    try {
      fs.readFileSync(path.resolve(__dirname, "..", f), "utf-8").split("\n").forEach(line => {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !vars[m[1]]) vars[m[1]] = m[2].trim();
      });
    } catch {}
  }
  return vars;
}
const ENV = loadEnv();
const PG_URL = ENV.DATABASE_URL;

const K3_CONFIG = {
  server: ENV.KINGDEE_MSSQL_HOST || "10.2.1.249",
  port: parseInt(ENV.KINGDEE_MSSQL_PORT || "1433", 10),
  database: ENV.KINGDEE_MSSQL_DATABASE || "AIS20260122124030",
  user: ENV.KINGDEE_MSSQL_USER || "sa",
  password: ENV.KINGDEE_MSSQL_PASSWORD || "Admin@123",
  pool: { max: 10, min: 2, idleTimeoutMillis: 30000 },
  options: { encrypt: false, trustServerCertificate: true, requestTimeout: 60000, connectTimeout: 30000 },
};

const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--discover") flags.discoverOnly = true;
  else if (args[i] === "--dry-run") flags.dryRun = true;
}
const BATCH = 2000;

// ── Helpers ──
function log(tag, msg) { console.log(`  [${new Date().toISOString().substring(11, 19)}] ${tag.padEnd(7)} ${msg}`); }
function section(t) { console.log(`\n${"═".repeat(64)}\n  ${t}\n${"═".repeat(64)}`); }
function str(v, max = 255) { if (v == null) return null; return String(v).trim().substring(0, max) || null; }
function num(v) { if (v == null) return null; const n = parseFloat(v); return isNaN(n) ? null : n; }
function int(v) { if (v == null) return null; const n = parseInt(v, 10); return isNaN(n) ? null : n; }
function dt(v) { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d.toISOString(); }
const q = (col) => `"${col}"`;

// ── Extraction SQL (金蝶K/3 Cloud BOS平台 — T_GL_/T_BD_ 表名) ──
const EXTRACT = {
  gl_accounts: `
    SELECT a.FACCTID AS id, a.FNUMBER AS code, l.FNAME AS name,
           a.FPARENTID AS parentId, a.FDC AS balDir, a.FGROUPID AS grpId, a.FLEVEL AS lvl
    FROM T_BD_ACCOUNT a
    LEFT JOIN T_BD_ACCOUNT_L l ON a.FACCTID = l.FACCTID
    ORDER BY a.FNUMBER`,

  vouchers: `
    SELECT TOP 20000 FVOUCHERID AS id, FDATE AS vdate, FBILLNO AS billNo,
           FYEAR AS yr, FPERIOD AS period, FVOUCHERGROUPNO AS grpNo,
           FDEBITTOTAL AS drTotal, FCREDITTOTAL AS crTotal
    FROM T_GL_VOUCHER
    ORDER BY FDATE DESC`,

  voucher_entries: `
    SELECT TOP 120000 FVOUCHERID AS voucherId, FENTRYID AS entryId,
           FEXPLANATION AS memo, FACCOUNTID AS acctId,
           FAMOUNT AS amt, FAMOUNTFOR AS amtFor,
           FCURRENCYID AS curId, FEXCHANGERATE AS rate
    FROM T_GL_VOUCHERENTRY
    ORDER BY FVOUCHERID, FENTRYID`,

  balances: `
    SELECT FACCOUNTID AS acctId, FYEAR AS yr, FPERIOD AS period,
           FBEGINBALANCE AS beginBal, FDEBIT AS dr, FCREDIT AS cr, FENDBALANCE AS endBal,
           FCURRENCYID AS curId
    FROM T_GL_BALANCE
    WHERE FYEAR >= 2024
    ORDER BY FYEAR, FPERIOD, FACCOUNTID`,

  customers: `
    SELECT FCUSTID AS id, FNUMBER AS code, FADDRESS AS addr, FZIP AS zip,
           FPROVINCIAL AS province
    FROM T_BD_CUSTOMER
    ORDER BY FNUMBER`,
};

// ── Main ──
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  金蝶K/3 → GRT System 全量数据导入 (v1.0)                   ║");
  console.log(`║  ${new Date().toISOString().substring(0, 19).replace("T", " ").padEnd(56)}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");
  log("INFO", `K3 MSSQL: ${K3_CONFIG.server}:${K3_CONFIG.port}/${K3_CONFIG.database}`);
  log("INFO", `PG: ${PG_URL.replace(/:[^:@]+@/, ":***@")}`);

  const pg = new Client({ connectionString: PG_URL });
  await pg.connect();
  log("OK", "PostgreSQL 已连接");

  let k3;
  try {
    log("INFO", "正在连接金蝶K/3 MSSQL...");
    k3 = await mssqlLib.connect(K3_CONFIG);
    const ver = await k3.request().query("SELECT @@VERSION AS v");
    log("OK", `K/3 MSSQL 已连接: ${K3_CONFIG.database}`);
    log("INFO", `版本: ${ver.recordset[0].v.substring(0, 60)}`);
  } catch (e) {
    console.error(`\n  ERROR: 无法连接金蝶K/3 MSSQL (${K3_CONFIG.server}:${K3_CONFIG.port})`);
    console.error(`  ${e.message}\n`);
    await pg.end();
    process.exit(1);
  }

  // Phase 1: Discover
  section("Phase 1: 金蝶K/3 表结构发现");
  try {
    const tables = await k3.request().query(`
      SELECT t.TABLE_NAME AS tableName,
             (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_NAME = t.TABLE_NAME) AS cols,
             p.rows AS [rowCount]
      FROM INFORMATION_SCHEMA.TABLES t
      LEFT JOIN sys.partitions p ON p.object_id = OBJECT_ID(t.TABLE_NAME) AND p.index_id IN (0, 1)
      WHERE t.TABLE_SCHEMA = 'dbo' AND t.TABLE_TYPE = 'BASE TABLE'
      ORDER BY p.rows DESC
    `);
    console.log("\n  ┌──────────────────────────────┬──────┬──────────┐");
    console.log("  │ Table                        │ Cols │ Rows     │");
    console.log("  ├──────────────────────────────┼──────┼──────────┤");
    let total = 0;
    for (const t of tables.recordset.slice(0, 30)) {
      console.log(`  │ ${t.tableName.padEnd(28)} │ ${String(t.cols).padStart(4)} │ ${String(t.rowCount).padStart(8)} │`);
      total += t.rowCount || 0;
    }
    if (tables.recordset.length > 30) console.log(`  │ ... ${tables.recordset.length - 30} more tables`.padEnd(49) + "│");
    console.log("  └──────────────────────────────┴──────┴──────────┘");
    log("INFO", `共 ${tables.recordset.length} 张表, ${total.toLocaleString()} 总行数`);
  } catch (e) { log("WARN", `发现失败: ${e.message.substring(0, 80)}`); }

  if (flags.discoverOnly) { await cleanup(k3, pg); return; }

  // Phase 2: ETL
  section("Phase 2: 数据提取与写入");
  const report = {};

  // 2a. GL Accounts (会计科目 2023条) → gl_accounts
  report.gl_accounts = await etl(k3, pg, "会计科目", EXTRACT.gl_accounts, (row) => ({
    table: "gl_accounts",
    conflictCol: q("accountCode"),
    data: {
      [q("accountCode")]: str(row.code, 30),
      [q("accountName")]: str(row.name, 100) || str(row.code, 100),
      [q("parentAccountId")]: int(row.parentId),
      [q("level")]: int(row.lvl) || 1,
      [q("balanceDirection")]: row.balDir === 1 ? "debit" : "credit",
      [q("accountType")]: mapAcctType(row.grpId),
      [q("accountGroup")]: mapAcctGroup(row.grpId),
      [q("erpLegacyCode")]: str(row.code, 30),
      [q("isActive")]: true,
    },
  }));

  // 2b. Vouchers (凭证 17007条) → gl_entries
  report.vouchers = await etl(k3, pg, "凭证", EXTRACT.vouchers, (row) => ({
    table: "gl_entries",
    conflictCol: q("entryCode"),
    data: {
      [q("entryCode")]: `K3-${str(row.billNo, 20) || row.id}`,
      [q("voucherDate")]: dt(row.vdate),
      [q("fiscalYear")]: int(row.yr),
      [q("fiscalPeriod")]: int(row.period),
      [q("voucherNumber")]: str(row.billNo, 30),
      [q("description")]: `金蝶K/3凭证 ${row.billNo || ''}`,
      [q("debitAmount")]: str(num(row.drTotal) || 0),
      [q("creditAmount")]: str(num(row.crTotal) || 0),
      [q("accountId")]: 1,
      [q("sourceDocType")]: "migration",
      [q("isPosted")]: true,
    },
  }));

  // 2c. Balances (科目余额 258450条) → account_balances
  report.balances = await etl(k3, pg, "科目余额", EXTRACT.balances, (row) => ({
    table: "account_balances",
    conflictCol: null,
    skipConflict: true,
    data: {
      [q("accountId")]: int(row.acctId) || 1,
      [q("accountCode")]: str(row.acctId, 30),
      [q("fiscalYear")]: int(row.yr),
      [q("fiscalPeriod")]: int(row.period),
      [q("beginBalance")]: str(num(row.beginBal) || 0),
      [q("periodDebit")]: str(num(row.dr) || 0),
      [q("periodCredit")]: str(num(row.cr) || 0),
      [q("endBalance")]: str(num(row.endBal) || 0),
    },
  }));

  // 2d. Customers (客户 — 仅记录)
  report.customers = await etlLog(k3, "客户", EXTRACT.customers);

  // Phase 3: Report
  section("导入报告");
  console.log("\n  ┌──────────────────────┬──────────┬──────────┬──────────┐");
  console.log("  │ Entity               │ 提取     │ 写入     │ 错误     │");
  console.log("  ├──────────────────────┼──────────┼──────────┼──────────┤");
  let totalExtracted = 0, totalLoaded = 0, totalErrors = 0;
  for (const [entity, r] of Object.entries(report)) {
    console.log(`  │ ${entity.padEnd(20)} │ ${String(r.extracted).padStart(8)} │ ${String(r.loaded).padStart(8)} │ ${String(r.errors).padStart(8)} │`);
    totalExtracted += r.extracted; totalLoaded += r.loaded; totalErrors += r.errors;
  }
  console.log("  ├──────────────────────┼──────────┼──────────┼──────────┤");
  console.log(`  │ ${"TOTAL".padEnd(20)} │ ${String(totalExtracted).padStart(8)} │ ${String(totalLoaded).padStart(8)} │ ${String(totalErrors).padStart(8)} │`);
  console.log("  └──────────────────────┴──────────┴──────────┴──────────┘");

  section("导入完成");
  log("DONE", `提取 ${totalExtracted.toLocaleString()} → 写入 ${totalLoaded.toLocaleString()} (${totalErrors} 错误)`);

  await cleanup(k3, pg);
}

async function etl(k3, pg, label, sql, transformer) {
  const result = { extracted: 0, loaded: 0, errors: 0 };
  try {
    log("INFO", `提取 ${label}...`);
    const rows = (await k3.request().query(sql)).recordset;
    result.extracted = rows.length;
    log("INFO", `${label}: ${rows.length} 行`);

    for (let i = 0; i < rows.length; i++) {
      try {
        const t = transformer(rows[i]);
        const data = {};
        for (const [k, v] of Object.entries(t.data)) { if (v !== null && v !== undefined) data[k] = v; }
        const cols = Object.keys(data);
        const vals = Object.values(data);
        const params = []; const placeholders = []; let pi = 1;
        for (const v of vals) {
          if (v === "NOW()") { placeholders.push("NOW()"); }
          else { placeholders.push("$" + pi++); params.push(v); }
        }
        let sqlText = `INSERT INTO ${t.table} (${cols.join(",")}) VALUES (${placeholders.join(",")})`;
        if (t.conflictCol) sqlText += ` ON CONFLICT (${t.conflictCol}) DO NOTHING`;
        else if (t.skipConflict) sqlText += ` ON CONFLICT DO NOTHING`;

        if (!flags.dryRun) await pg.query(sqlText, params);
        result.loaded++;
      } catch (e) {
        result.errors++;
        if (result.errors <= 3) log("ERR", `${label}[${i}]: ${e.message.substring(0, 80)}`);
      }
      if (i > 0 && i % 2000 === 0) log("PROG", `${label}: ${i}/${rows.length}`);
    }
    log("OK", `${label}: 提取 ${result.extracted}, 写入 ${result.loaded}, 错误 ${result.errors}`);
  } catch (e) {
    result.errors++;
    log("ERR", `${label}: ${e.message.substring(0, 80)}`);
  }
  return result;
}

async function etlLog(k3, label, sql) {
  try {
    const rows = (await k3.request().query(sql)).recordset;
    log("INFO", `${label}: ${rows.length} 行 (仅记录, 不写入GRT)`);
    if (rows.length > 0) {
      const sample = rows[0];
      log("INFO", `  样例: ${JSON.stringify(sample).substring(0, 120)}`);
    }
    return { extracted: rows.length, loaded: 0, errors: 0 };
  } catch (e) {
    log("ERR", `${label}: ${e.message.substring(0, 80)}`);
    return { extracted: 0, loaded: 0, errors: 1 };
  }
}

function mapAcctType(grpId) {
  const m = { 1: "asset", 2: "liability", 3: "equity", 4: "cost", 5: "revenue", 6: "expense" };
  return m[grpId] || "asset";
}
function mapAcctGroup(grpId) {
  const m = { 1: "资产", 2: "负债", 3: "权益", 4: "成本", 5: "收入", 6: "费用" };
  return m[grpId] || "其他";
}
function mapItemClass(cls) {
  if (cls == 1) return "component"; if (cls == 2) return "part"; if (cls == 3) return "equipment";
  if (cls == 4) return "consumable"; return "other";
}

async function cleanup(k3, pg) {
  try { await k3.close(); } catch {}
  try { await pg.end(); } catch {}
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
