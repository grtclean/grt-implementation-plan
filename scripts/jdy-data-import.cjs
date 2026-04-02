/**
 * 简道云数据分批导入脚本 — 按 target_entity 拉取表单记录并缓存到DB
 *
 * 策略: 先缓存(cache-first)，再转换(transform-later)
 *   Phase A: 拉取所有表单的字段结构 → jiandaoyun_form_mappings.field_schema
 *   Phase B: 分批拉取表单数据 → jiandaoyun_form_data_cache
 *   Phase C: 按 entity 将缓存数据转换写入 GRT 业务表
 *
 * 用法:
 *   node scripts/jdy-data-import.cjs                             # 全量拉取+缓存
 *   node scripts/jdy-data-import.cjs --entity project            # 仅拉取项目类表单
 *   node scripts/jdy-data-import.cjs --entity hrmEmployee,crmCustomer
 *   node scripts/jdy-data-import.cjs --fields-only               # 仅拉字段结构
 *   node scripts/jdy-data-import.cjs --stats                     # 仅显示统计
 *   node scripts/jdy-data-import.cjs --priority                  # 仅拉高优先级 entity
 */

const https = require("https");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// ── Env ──────────────────────────────────────────────
function loadEnv() {
  const vars = {};
  for (const f of [".env.development", ".env"]) {
    try {
      const content = fs.readFileSync(path.resolve(__dirname, "..", f), "utf-8");
      for (const line of content.split("\n")) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !vars[m[1]]) vars[m[1]] = m[2].trim();
      }
    } catch {}
  }
  return vars;
}
const ENV = loadEnv();
const API_KEY = ENV.EXT_SYNC_API_KEY || ENV.JIANDAOYUN_API_KEY;
const DB_URL = ENV.DATABASE_URL;

// ── CLI ──────────────────────────────────────────────
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--entity" && args[i + 1]) { flags.entities = args[i + 1].split(","); i++; }
  else if (args[i] === "--fields-only") flags.fieldsOnly = true;
  else if (args[i] === "--stats") flags.statsOnly = true;
  else if (args[i] === "--priority") {
    flags.entities = [
      "project", "crmCustomer", "salesOrder", "purchaseOrder", "hrmEmployee",
      "supplier", "inventory", "bom", "contract", "productionOrder",
      "finance", "meeting", "task", "hrmAttendance", "hrmPayroll",
      "hrmPerformance", "hrmRecruitment", "afterSales", "quality"
    ];
  }
}

// ── API ──────────────────────────────────────────────
let apiCallCount = 0;
function jdyApi(apiPath, params) {
  apiCallCount++;
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params);
    const req = https.request({
      hostname: "api.jiandaoyun.com", path: apiPath, method: "POST",
      headers: { Authorization: "Bearer " + API_KEY, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        if (!raw) { resolve(null); return; }
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ _error: true, status: res.statusCode, raw: raw.substring(0, 200) }); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Rate limiter: max 20 req/s to be safe (API limit is 30)
let lastCallTime = 0;
async function rateLimitedApi(path, params) {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < 50) await new Promise((r) => setTimeout(r, 50 - elapsed));
  lastCallTime = Date.now();
  return jdyApi(path, params);
}

// ── Logging ──────────────────────────────────────────
function log(tag, msg) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`  [${ts}] ${tag.padEnd(7)} ${msg}`);
}
function section(title) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}`);
}

// ── Phase A: 拉取字段结构 ───────────────────────────
async function phaseFields(db, forms) {
  section("Phase A: 拉取表单字段结构");
  let updated = 0, failed = 0;

  for (let i = 0; i < forms.length; i++) {
    const f = forms[i];
    // Skip if already has field_schema
    if (f.field_schema && Object.keys(f.field_schema).length > 0) continue;

    try {
      const resp = await rateLimitedApi("/api/v5/app/entry/widget/list", {
        app_id: f.jdy_app_id,
        entry_id: f.jdy_form_id,
      });

      if (resp?.widgets) {
        const schema = resp.widgets.map((w) => ({
          id: w.name,
          label: w.label,
          type: w.type,
        }));
        await db.query(
          'UPDATE jiandaoyun_form_mappings SET field_schema=$1, updated_at=NOW() WHERE id=$2',
          [JSON.stringify(schema), f.id]
        );
        updated++;
      } else if (resp?._error) {
        failed++;
      }
    } catch {
      failed++;
    }

    if ((i + 1) % 50 === 0) log("PROG", `${i + 1}/${forms.length} forms processed`);
  }

  log("OK", `字段结构: 更新 ${updated}, 失败 ${failed}, 跳过 ${forms.length - updated - failed}`);
  return { updated, failed };
}

// ── Phase B: 拉取表单数据 ───────────────────────────
async function phaseData(db, forms) {
  section("Phase B: 分批拉取表单数据");

  // Group by target_entity
  const entityGroups = {};
  for (const f of forms) {
    const e = f.target_entity || "unknown";
    if (!entityGroups[e]) entityGroups[e] = [];
    entityGroups[e].push(f);
  }

  const entityList = Object.keys(entityGroups).sort((a, b) => entityGroups[b].length - entityGroups[a].length);
  let totalRecords = 0, totalForms = 0, totalErrors = 0;

  for (const entity of entityList) {
    const entityForms = entityGroups[entity];
    let entityRecords = 0;
    log("ENTITY", `${entity} (${entityForms.length} forms)`);

    for (const f of entityForms) {
      try {
        // Paginated fetch: use data_id cursor
        let dataId = undefined;
        let formRecords = 0;
        let pageCount = 0;

        while (true) {
          const params = { app_id: f.jdy_app_id, entry_id: f.jdy_form_id, limit: 100 };
          if (dataId) params.data_id = dataId;

          const resp = await rateLimitedApi("/api/v5/app/entry/data/list", params);

          if (!resp?.data || resp.data.length === 0) break;
          if (resp._error) { totalErrors++; break; }

          // Batch insert into cache
          for (const record of resp.data) {
            const recordId = record._id || `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            await db.query(
              `INSERT INTO jiandaoyun_form_data_cache
                (jdy_app_id, jdy_form_id, jdy_record_id, record_data, target_entity, jdy_form_name)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (jdy_app_id, jdy_form_id, jdy_record_id) DO UPDATE SET
                 record_data = EXCLUDED.record_data,
                 target_entity = EXCLUDED.target_entity,
                 updated_at = NOW()`,
              [f.jdy_app_id, f.jdy_form_id, recordId, JSON.stringify(record), entity, f.jdy_form_name]
            );
          }

          formRecords += resp.data.length;
          pageCount++;

          // Cursor for next page
          dataId = resp.data[resp.data.length - 1]._id;

          // If less than limit, we're done
          if (resp.data.length < 100) break;

          // Safety: max 50 pages per form (5000 records)
          if (pageCount >= 50) {
            log("WARN", `  ${f.jdy_form_name}: 达到5000条上限，截断`);
            break;
          }
        }

        if (formRecords > 0) {
          log("DATA", `  ${f.jdy_form_name}: ${formRecords} records`);
          // Update record_count in mapping
          await db.query(
            'UPDATE jiandaoyun_form_mappings SET record_count=$1, updated_at=NOW() WHERE id=$2',
            [formRecords, f.id]
          );
        }

        entityRecords += formRecords;
        totalForms++;
      } catch (err) {
        totalErrors++;
        log("ERR", `  ${f.jdy_form_name}: ${err.message}`);
      }
    }

    totalRecords += entityRecords;
    if (entityRecords > 0) {
      log("OK", `${entity}: ${entityRecords} records from ${entityForms.length} forms`);
    }
  }

  log("DONE", `总计: ${totalRecords} records, ${totalForms} forms, ${totalErrors} errors, ${apiCallCount} API calls`);
  return { totalRecords, totalForms, totalErrors };
}

// ── Stats ───────────────────────────────────────────
async function showStats(db) {
  section("数据缓存统计");

  const cacheStats = await db.query(
    `SELECT target_entity, COUNT(DISTINCT jdy_form_id) as forms, COUNT(*) as records
     FROM jiandaoyun_form_data_cache GROUP BY target_entity ORDER BY records DESC`
  );

  console.log("\n  ┌─────────────────────┬───────┬──────────┐");
  console.log("  │ Entity              │ Forms │ Records  │");
  console.log("  ├─────────────────────┼───────┼──────────┤");

  let totalRecords = 0, totalForms = 0;
  for (const r of cacheStats.rows) {
    console.log(`  │ ${(r.target_entity || "?").padEnd(19)} │ ${String(r.forms).padStart(5)} │ ${String(r.records).padStart(8)} │`);
    totalRecords += parseInt(r.records);
    totalForms += parseInt(r.forms);
  }
  console.log("  ├─────────────────────┼───────┼──────────┤");
  console.log(`  │ ${"TOTAL".padEnd(19)} │ ${String(totalForms).padStart(5)} │ ${String(totalRecords).padStart(8)} │`);
  console.log("  └─────────────────────┴───────┴──────────┘");

  // Forms with no data
  const emptyForms = await db.query(
    `SELECT COUNT(*) as cnt FROM jiandaoyun_form_mappings WHERE record_count = 0 OR record_count IS NULL`
  );
  console.log(`\n  空表单 (无数据): ${emptyForms.rows[0].cnt}`);
}

// ── Main ────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  简道云数据分批导入 — cache-first 策略                 ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  if (!API_KEY) { console.error("ERROR: API key not set"); process.exit(1); }

  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  log("OK", "数据库已连接");

  // Ensure cache table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS jiandaoyun_form_data_cache (
      id SERIAL PRIMARY KEY,
      jdy_app_id TEXT NOT NULL,
      jdy_form_id TEXT NOT NULL,
      jdy_record_id TEXT NOT NULL,
      record_data JSONB NOT NULL,
      target_entity TEXT,
      jdy_form_name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(jdy_app_id, jdy_form_id, jdy_record_id)
    )
  `);
  // Index for fast entity queries
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_cache_entity ON jiandaoyun_form_data_cache (target_entity)
  `);

  try {
    if (flags.statsOnly) {
      await showStats(db);
      return;
    }

    // Get forms to process
    let whereClause = "WHERE target_entity IS NOT NULL";
    const params = [];
    if (flags.entities) {
      whereClause += ` AND target_entity = ANY($1)`;
      params.push(flags.entities);
    }
    // Skip personal/system/reference forms
    whereClause += ` AND target_entity NOT IN ('personalExercise','systemReference','systemIntegration','miscellaneous','thirdPartyHR','reference','aiPlugin')`;

    const formsResult = await db.query(
      `SELECT id, jdy_app_id, jdy_app_name, jdy_form_id, jdy_form_name, target_entity, field_schema, record_count
       FROM jiandaoyun_form_mappings ${whereClause}
       ORDER BY target_entity, jdy_app_name`,
      params
    );
    const forms = formsResult.rows;
    log("INFO", `${forms.length} forms to process (${[...new Set(forms.map(f => f.target_entity))].length} entities)`);

    // Phase A: Fields (skip if --no-fields or already done)
    if (!flags.fieldsOnly) {
      // Phase A first
      await phaseFields(db, forms);
    }

    if (flags.fieldsOnly) {
      await phaseFields(db, forms);
      return;
    }

    // Phase B: Data
    await phaseData(db, forms);

    // Show stats
    await showStats(db);
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
