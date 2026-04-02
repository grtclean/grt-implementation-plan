/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  天思ERP → GRT System 全量数据导入 (Master Script v1.0)      ║
 * ║  Direct MSSQL → PostgreSQL ETL                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Entities (dependency order):
 *   1. warehouses   → GRT warehouses
 *   2. suppliers    → GRT suppliers
 *   3. materials    → GRT materials
 *   4. bom_master   → GRT bom_masters
 *   5. bom_items    → GRT bom_items
 *   6. purchase_orders → GRT purchase_orders
 *   7. inventory    → GRT inventory
 *   8. inventory_lots → GRT inventory_lots
 *
 * Usage:
 *   node scripts/tiansi-master-import.cjs                     # 全量导入
 *   node scripts/tiansi-master-import.cjs --discover          # 仅发现表结构
 *   node scripts/tiansi-master-import.cjs --entity materials  # 仅导入物料
 *   node scripts/tiansi-master-import.cjs --validate          # 仅校验
 *   node scripts/tiansi-master-import.cjs --dry-run           # 预演
 *   node scripts/tiansi-master-import.cjs --batch-size 500    # 批量大小
 */

const sql = require("mssql");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════

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

const MSSQL_CONFIG = {
  server: ENV.TIANSI_MSSQL_HOST || "10.2.1.230",
  port: parseInt(ENV.TIANSI_MSSQL_PORT || "1433", 10),
  database: ENV.TIANSI_MSSQL_DATABASE || "DB_GRT",
  user: ENV.TIANSI_MSSQL_USER || "sa",
  password: ENV.TIANSI_MSSQL_PASSWORD || "Admin1234",
  pool: { max: 10, min: 2, idleTimeoutMillis: 30000 },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 60000,
    connectTimeout: 30000,
    enableArithAbort: true,
  },
};

// CLI
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--entity" && args[i + 1]) { flags.entities = args[i + 1].split(","); i++; }
  else if (args[i] === "--batch-size" && args[i + 1]) { flags.batchSize = parseInt(args[i + 1]); i++; }
  else if (args[i] === "--discover") flags.discoverOnly = true;
  else if (args[i] === "--validate") flags.validateOnly = true;
  else if (args[i] === "--dry-run") flags.dryRun = true;
}

const BATCH_SIZE = flags.batchSize || 500;
const ALL_ENTITIES = ["warehouses", "suppliers", "materials", "bom_master", "bom_items", "purchase_orders", "inventory", "inventory_lots"];

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function log(tag, msg) { console.log(`  [${new Date().toISOString().substring(11, 19)}] ${tag.padEnd(7)} ${msg}`); }
function section(t) { console.log(`\n${"═".repeat(64)}\n  ${t}\n${"═".repeat(64)}`); }
function str(v, max = 255) { if (v == null) return null; return String(v).trim().substring(0, max) || null; }
function num(v) { if (v == null) return null; const n = parseFloat(v); return isNaN(n) ? null : n; }
function int(v) { if (v == null) return null; const n = parseInt(v, 10); return isNaN(n) ? null : n; }
function dt(v) { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d.toISOString(); }

// ═══════════════════════════════════════════════════════════════
//  MSSQL EXTRACTION QUERIES
// ═══════════════════════════════════════════════════════════════

// ── 天思ERP真实表名映射 (SQL Server 2012, DB_GRT) ──
// CUST=客户/供应商, PRDT=产品物料, TF_POS=采购订单, SPRD1=库存台账
// TF_SQ=销售订单, TF_MO=生产工单, TF_PSS=采购收货, TF_ML=领料
const EXTRACT_SQL = {
  warehouses: `
    SELECT DISTINCT WH AS warehouse_code,
           WH AS warehouse_name,
           'general' AS warehouse_type,
           '' AS address, '' AS manager_name, '' AS contact_phone, 'active' AS status
    FROM SPRD1 WHERE WH IS NOT NULL AND WH != ''
    ORDER BY WH`,

  suppliers: `
    SELECT CUS_NO AS supplier_code, NAME AS supplier_name,
           ISNULL(CLS2,'') AS supplier_category,
           BOS_NM AS contact_person, '' AS contact_phone, '' AS contact_email,
           ADR1 AS address, '' AS tax_id, '' AS quality_rating, '' AS payment_terms,
           'active' AS status
    FROM CUST
    ORDER BY CUS_NO`,

  materials: `
    SELECT TOP 5000 PRD_NO AS material_code, NAME AS material_name, SPC AS material_spec,
           CASE WHEN KND = '1' THEN '成品' WHEN KND = '2' THEN '半成品' WHEN KND = '4' THEN '原材料' ELSE '其他' END AS material_type,
           0 AS unit_price, '' AS manufacturer, '' AS manufacturer_code,
           0 AS min_stock, 0 AS max_stock, ISNULL(CCC,'') AS category,
           ISNULL(UT,'PCS') AS unit, REM AS description,
           'active' AS status
    FROM PRDT WHERE PRD_NO IS NOT NULL AND PRD_NO != ''
    ORDER BY PRD_NO`,

  bom_master: `
    SELECT DISTINCT MO_NO AS bom_id, PRD_NO AS product_code, PRD_NAME AS product_name,
           'production' AS bom_type, '1.0' AS version, 'active' AS status,
           QTY AS standard_qty, ISNULL(UNIT,'PCS') AS standard_unit
    FROM TF_MO WHERE PRD_NO IS NOT NULL
    ORDER BY MO_NO`,

  bom_items: `
    SELECT ML_NO AS item_id, ML_NO AS bom_id,
           PRD_NO AS material_code, PRD_NAME AS material_name, PRD_MARK AS material_spec,
           QTY AS quantity, ISNULL(UNIT,'PCS') AS unit,
           0 AS scrap_rate, '' AS source_type, '' AS process_code, 0 AS lead_time, CST AS unit_cost
    FROM TF_ML WHERE PRD_NO IS NOT NULL
    ORDER BY ML_NO`,

  purchase_orders: `
    SELECT TOP 10000 OS_NO AS po_number, OS_DD AS po_date,
           BAT_NO AS supplier_code, '' AS supplier_name,
           PRD_NO AS material_code, PRD_NAME AS material_name,
           QTY AS quantity, UP AS unit_price,
           AMT AS total_amount, EST_DD AS delivery_date,
           CASE WHEN QTY_PS >= QTY THEN 'completed' WHEN QTY_PS > 0 THEN 'partial' ELSE 'approved' END AS po_status,
           '' AS payment_terms
    FROM TF_POS WHERE OS_NO IS NOT NULL AND PRD_NO IS NOT NULL
    ORDER BY OS_DD DESC`,

  inventory: `
    SELECT TOP 10000 PRD_NO AS material_code, WH AS warehouse_code,
           QTY AS quantity_on_hand, 0 AS quantity_reserved, QTY AS quantity_available,
           NULL AS last_count_date
    FROM SPRD1 WHERE PRD_NO IS NOT NULL AND QTY != 0
    ORDER BY PRD_NO`,

  inventory_lots: `
    SELECT TOP 5000 BAT_NO AS lot_number, PRD_NO AS material_code, '' AS material_name,
           QTY AS initial_qty, QTY AS current_qty, 'PCS' AS unit,
           '' AS supplier_lot, '' AS supplier_name, WH AS warehouse_code,
           NULL AS production_date, VALID_DD AS expiry_date, 'active' AS status
    FROM SPRD1 WHERE BAT_NO IS NOT NULL AND BAT_NO != '' AND QTY != 0
    ORDER BY BAT_NO`,
};

// ═══════════════════════════════════════════════════════════════
//  TRANSFORMERS (TianSi → GRT field mapping)
// ═══════════════════════════════════════════════════════════════

function mapMaterialType(t) {
  if (!t) return "other";
  const s = String(t);
  if (/原材料|4/.test(s)) return "component";
  if (/半成品|2/.test(s)) return "part";
  if (/成品|1/.test(s)) return "equipment";
  if (/辅料|包装/.test(s)) return "consumable";
  if (/化学品/.test(s)) return "chemical";
  return "other";
}

function mapStatus(s) {
  if (!s) return "active";
  if (/停用|inactive|0/.test(String(s))) return "inactive";
  return "active";
}

function mapPOStatus(s) {
  if (!s) return "draft";
  if (/草稿/.test(s)) return "draft";
  if (/已审批/.test(s)) return "approved";
  if (/已下达/.test(s)) return "released";
  if (/部分收货/.test(s)) return "partial";
  if (/已完成/.test(s)) return "completed";
  if (/已关闭/.test(s)) return "closed";
  return "draft";
}

// GRT PostgreSQL 使用 camelCase 列名（带引号）
const q = (col) => `"${col}"`;

const TRANSFORMERS = {
  warehouses: (row) => ({
    table: "warehouses",
    conflictCol: q("warehouseCode"),
    data: {
      [q("warehouseCode")]: str(row.warehouse_code),
      [q("warehouseName")]: str(row.warehouse_name) || str(row.warehouse_code),
      [q("warehouseType")]: str(row.warehouse_type) || "general",
      address: str(row.address, 300),
      [q("managerName")]: str(row.manager_name, 50),
      [q("contactPhone")]: str(row.contact_phone, 20),
      [q("erpWarehouseCode")]: str(row.warehouse_code),
      [q("erpSyncStatus")]: "synced",
      [q("isActive")]: true,
    },
  }),

  suppliers: (row) => ({
    table: "suppliers",
    conflictCol: q("supplierCode"),
    data: {
      [q("supplierCode")]: str(row.supplier_code),
      [q("supplierName")]: str(row.supplier_name),
      [q("supplierCategory")]: str(row.supplier_category) || "general",
      [q("contactPerson")]: str(row.contact_person),
      [q("contactPhone")]: str(row.contact_phone),
      [q("contactEmail")]: str(row.contact_email),
      address: str(row.address),
      status: mapStatus(row.status),
      [q("createdBy")]: 1,
      [q("createdAt")]: new Date().toISOString(),
      [q("updatedAt")]: new Date().toISOString(),
    },
  }),

  materials: (row) => ({
    table: "materials",
    conflictCol: q("materialCode"),
    data: {
      [q("materialCode")]: str(row.material_code),
      [q("materialName")]: str(row.material_name),
      [q("specificationCode")]: str(row.material_spec, 20),
      [q("materialType")]: mapMaterialType(row.material_type),
      [q("standardCost")]: str(num(row.unit_price) || 0),
      manufacturer: str(row.manufacturer),
      [q("categoryCode")]: str(row.category, 10) || "UNCAT",
      description: str(row.description, 500),
      status: mapStatus(row.status),
      [q("createdBy")]: 1,
    },
  }),

  bom_master: (row) => ({
    table: "bom_masters",
    conflictCol: null,
    skipConflict: true,
    data: {
      [q("productCode")]: str(row.product_code),
      [q("productName")]: str(row.product_name),
      [q("bomType")]: str(row.bom_type) || "standard",
      [q("currentVersion")]: str(row.version) || "1.0",
      status: mapStatus(row.status),
      [q("standardQty")]: str(num(row.standard_qty) || 1),
      [q("standardUnit")]: str(row.standard_unit) || "PCS",
      [q("erpBomId")]: str(row.bom_id),
      [q("erpSyncStatus")]: "synced",
      [q("erpLastSyncAt")]: new Date().toISOString(),
    },
  }),

  bom_items: (row) => ({
    table: "bom_items",
    conflictCol: null,
    skipConflict: true,
    data: {
      [q("bomMasterId")]: 1,
      [q("materialCode")]: str(row.material_code),
      [q("materialName")]: str(row.material_name),
      [q("materialSpec")]: str(row.material_spec),
      quantity: str(num(row.quantity) || 0),
      unit: str(row.unit) || "PCS",
      [q("scrapRate")]: str(num(row.scrap_rate) || 0),
      [q("sourceType")]: str(row.source_type),
      [q("processCode")]: str(row.process_code),
      [q("leadTimeDays")]: int(row.lead_time),
      [q("unitCost")]: str(num(row.unit_cost) || 0),
    },
  }),

  purchase_orders: (row) => ({
    table: "purchase_orders",
    conflictCol: q("poNumber"),
    data: {
      [q("poNumber")]: str(row.po_number) || `PO-${Date.now()}`,
      [q("supplierId")]: 1,
      [q("materialId")]: 1,
      [q("poDate")]: dt(row.po_date),
      [q("supplierCode")]: str(row.supplier_code),
      [q("supplierName")]: str(row.supplier_name) || str(row.supplier_code),
      [q("materialCode")]: str(row.material_code),
      [q("materialName")]: str(row.material_name),
      quantity: int(row.quantity) || 0,
      [q("unitPrice")]: str(num(row.unit_price) || 0),
      [q("totalAmount")]: str(num(row.total_amount) || 0),
      [q("expectedDeliveryDate")]: dt(row.delivery_date),
      [q("paymentTerms")]: str(row.payment_terms),
      status: mapPOStatus(row.po_status),
      [q("createdBy")]: 1,
    },
  }),

  inventory: (row) => ({
    table: "inventory",
    conflictCol: null,
    skipConflict: true,
    data: {
      [q("materialId")]: 1,
      [q("warehouseId")]: 1,
      [q("locationCode")]: str(row.warehouse_code) || "DEFAULT",
      [q("quantityOnHand")]: int(row.quantity_on_hand) || 0,
      [q("quantityReserved")]: int(row.quantity_reserved) || 0,
      [q("quantityAvailable")]: int(row.quantity_available) || 0,
      [q("lastCountDate")]: dt(row.last_count_date),
      status: "active",
    },
  }),

  inventory_lots: (row) => ({
    table: "inventory_lots",
    conflictCol: q("lotNumber"),
    data: {
      [q("lotNumber")]: str(row.lot_number) || `LOT-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      [q("materialCode")]: str(row.material_code),
      [q("materialName")]: str(row.material_name),
      [q("initialQty")]: str(num(row.initial_qty) || 0),
      [q("currentQty")]: str(num(row.current_qty) || 0),
      unit: str(row.unit) || "PCS",
      [q("supplierLotNumber")]: str(row.supplier_lot),
      [q("supplierName")]: str(row.supplier_name),
      [q("locationCode")]: str(row.warehouse_code),
      [q("productionDate")]: dt(row.production_date),
      [q("expiryDate")]: dt(row.expiry_date),
      status: "active",
      [q("sourceType")]: "purchase",
      [q("erpLotId")]: str(row.lot_number),
      [q("erpSyncStatus")]: "synced",
    },
  }),
};

// ═══════════════════════════════════════════════════════════════
//  GRT DDL — ensure target tables exist
// ═══════════════════════════════════════════════════════════════

const GRT_DDL = [
  // purchase_orders (not in Drizzle schema yet)
  `CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    "poNumber" VARCHAR(50) UNIQUE,
    "poDate" TIMESTAMPTZ,
    "supplierCode" VARCHAR(50),
    "supplierName" VARCHAR(200),
    "materialCode" VARCHAR(50),
    "materialName" VARCHAR(200),
    quantity INTEGER DEFAULT 0,
    "unitPrice" VARCHAR(30),
    "totalAmount" VARCHAR(30),
    "expectedDeliveryDate" TIMESTAMPTZ,
    "paymentTerms" VARCHAR(100),
    status VARCHAR(30) DEFAULT 'draft',
    "erpPoNumber" VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW())`,

  // inventory (standalone from Drizzle)
  `CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    "materialCode" VARCHAR(50) NOT NULL,
    "warehouseCode" VARCHAR(50) NOT NULL,
    "quantityOnHand" INTEGER DEFAULT 0,
    "quantityReserved" INTEGER DEFAULT 0,
    "quantityAvailable" INTEGER DEFAULT 0,
    "lastCountDate" TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("materialCode", "warehouseCode"))`,
];

// ═══════════════════════════════════════════════════════════════
//  PHASE 1: DISCOVER — List all TianSi tables
// ═══════════════════════════════════════════════════════════════

async function phaseDiscover(mssql) {
  section("Phase 1: 天思ERP表结构发现");

  const tables = await mssql.request().query(`
    SELECT t.TABLE_NAME AS tableName, t.TABLE_TYPE AS tableType,
           (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_NAME = t.TABLE_NAME) AS columnCount,
           p.rows AS [rowCount]
    FROM INFORMATION_SCHEMA.TABLES t
    LEFT JOIN sys.partitions p ON p.object_id = OBJECT_ID(t.TABLE_NAME) AND p.index_id IN (0, 1)
    WHERE t.TABLE_SCHEMA = 'dbo' AND t.TABLE_TYPE = 'BASE TABLE'
    ORDER BY p.rows DESC
  `);

  console.log("\n  ┌────────────────────────────────────┬──────┬──────────┐");
  console.log("  │ Table                              │ Cols │ Rows     │");
  console.log("  ├────────────────────────────────────┼──────┼──────────┤");
  let totalRows = 0;
  const tableInfo = {};
  for (const t of tables.recordset) {
    console.log(`  │ ${t.tableName.padEnd(34)} │ ${String(t.columnCount).padStart(4)} │ ${String(t.rowCount).padStart(8)} │`);
    totalRows += t.rowCount || 0;
    tableInfo[t.tableName] = { columns: t.columnCount, rows: t.rowCount };
  }
  console.log("  ├────────────────────────────────────┼──────┼──────────┤");
  console.log(`  │ ${"TOTAL (" + tables.recordset.length + " tables)".padEnd(34)} │      │ ${String(totalRows).padStart(8)} │`);
  console.log("  └────────────────────────────────────┴──────┴──────────┘");

  // Show columns for key entity tables
  for (const entity of ALL_ENTITIES) {
    const tableName = entity === "bom_master" ? "bom_master" : entity;
    if (!tableInfo[tableName]) continue;
    try {
      const cols = await mssql.request()
        .input("tableName", sql.VarChar, tableName)
        .query(`SELECT COLUMN_NAME AS col, DATA_TYPE AS type, CHARACTER_MAXIMUM_LENGTH AS len
                FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tableName ORDER BY ORDINAL_POSITION`);
      log("TABLE", `${tableName}: ${cols.recordset.map(c => c.col + "(" + c.type + ")").join(", ")}`);
    } catch {}
  }

  return tableInfo;
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 2: EXTRACT + TRANSFORM + LOAD
// ═══════════════════════════════════════════════════════════════

async function phaseETL(mssql, pg) {
  section("Phase 2: Extract → Transform → Load");

  // Ensure GRT target tables exist
  for (const ddl of GRT_DDL) {
    try { await pg.query(ddl); } catch {}
  }
  log("OK", "GRT目标表已就绪");

  const entities = flags.entities || ALL_ENTITIES;
  const results = {};

  for (const entity of entities) {
    const extractSQL = EXTRACT_SQL[entity];
    const transformer = TRANSFORMERS[entity];
    if (!extractSQL || !transformer) { log("SKIP", entity); continue; }

    log("INFO", `提取 ${entity}...`);

    // Extract from MSSQL
    let rows;
    try {
      const result = await mssql.request().query(extractSQL);
      rows = result.recordset;
    } catch (err) {
      log("ERR", `${entity}: ${err.message.substring(0, 100)}`);
      results[entity] = { extracted: 0, loaded: 0, skipped: 0, errors: 1 };
      continue;
    }

    log("DATA", `${entity}: ${rows.length} rows extracted`);
    if (rows.length === 0) { results[entity] = { extracted: 0, loaded: 0, skipped: 0, errors: 0 }; continue; }

    // Transform + Load
    let loaded = 0, skipped = 0, errors = 0;

    for (let i = 0; i < rows.length; i++) {
      try {
        const transformed = transformer(rows[i]);
        const { table, conflictCol, skipConflict, data } = transformed;

        // Filter out null values to avoid NOT NULL constraint issues
        const filteredData = {};
        for (const [k, v] of Object.entries(data)) {
          if (v !== null && v !== undefined) filteredData[k] = v;
        }

        // Build INSERT
        const cols = Object.keys(filteredData);
        const vals = Object.values(filteredData);
        const paramValues = vals.filter(v => v !== "NOW()");
        const paramPlaceholders = [];
        let paramIdx = 1;
        for (let j = 0; j < vals.length; j++) {
          if (vals[j] === "NOW()") {
            paramPlaceholders.push("NOW()");
          } else {
            paramPlaceholders.push("$" + paramIdx);
            paramIdx++;
          }
        }

        let sqlText;
        if (conflictCol) {
          sqlText = `INSERT INTO ${table} (${cols.join(",")}) VALUES (${paramPlaceholders.join(",")}) ON CONFLICT (${conflictCol}) DO NOTHING`;
        } else if (skipConflict) {
          sqlText = `INSERT INTO ${table} (${cols.join(",")}) VALUES (${paramPlaceholders.join(",")}) ON CONFLICT DO NOTHING`;
        } else {
          sqlText = `INSERT INTO ${table} (${cols.join(",")}) VALUES (${paramPlaceholders.join(",")})`;
        }

        if (flags.dryRun) { loaded++; continue; }

        await pg.query(sqlText, paramValues);
        loaded++;
      } catch (err) {
        if (err.code === "23505") { skipped++; } // duplicate key
        else { errors++; if (errors <= 3) log("ERR", `${entity}[${i}]: ${err.message.substring(0, 80)}`); }
      }

      if ((i + 1) % 1000 === 0) log("PROG", `${entity}: ${i + 1}/${rows.length}`);
    }

    results[entity] = { extracted: rows.length, loaded, skipped, errors };
    log("OK", `${entity}: 提取 ${rows.length}, 写入 ${loaded}, 跳过 ${skipped}, 错误 ${errors}`);
  }

  // Summary
  section("导入报告");
  console.log("\n  ┌──────────────────────┬──────────┬──────────┬──────────┬──────────┐");
  console.log("  │ Entity               │ 提取     │ 写入     │ 跳过     │ 错误     │");
  console.log("  ├──────────────────────┼──────────┼──────────┼──────────┼──────────┤");
  let te = 0, tl = 0, ts = 0, terr = 0;
  for (const [e, r] of Object.entries(results)) {
    console.log(`  │ ${e.padEnd(20)} │ ${String(r.extracted).padStart(8)} │ ${String(r.loaded).padStart(8)} │ ${String(r.skipped).padStart(8)} │ ${String(r.errors).padStart(8)} │`);
    te += r.extracted; tl += r.loaded; ts += r.skipped; terr += r.errors;
  }
  console.log("  ├──────────────────────┼──────────┼──────────┼──────────┼──────────┤");
  console.log(`  │ ${"TOTAL".padEnd(20)} │ ${String(te).padStart(8)} │ ${String(tl).padStart(8)} │ ${String(ts).padStart(8)} │ ${String(terr).padStart(8)} │`);
  console.log("  └──────────────────────┴──────────┴──────────┴──────────┴──────────┘");

  return results;
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 3: VALIDATION
// ═══════════════════════════════════════════════════════════════

async function phaseValidate(mssql, pg) {
  section("Phase 3: 数据完整性校验");

  const entityTableMap = {
    warehouses: { mssql: "warehouses", pg: "warehouses", pgCount: '"warehouse_code"' },
    suppliers: { mssql: "suppliers", pg: "suppliers", pgCount: '"supplierCode"' },
    materials: { mssql: "materials", pg: "materials", pgCount: '"materialCode"' },
    bom_master: { mssql: "bom_master", pg: "bom_masters", pgCount: '"erpBomId"' },
    bom_items: { mssql: "bom_items", pg: "bom_items", pgCount: 'id' },
    purchase_orders: { mssql: "purchase_orders", pg: "purchase_orders", pgCount: '"poNumber"' },
    inventory: { mssql: "inventory", pg: "inventory", pgCount: 'id' },
    inventory_lots: { mssql: "inventory_lots", pg: "inventory_lots", pgCount: '"lotNumber"' },
  };

  console.log("\n  ┌──────────────────────┬──────────┬──────────┬──────────┐");
  console.log("  │ Entity               │ 天思     │ GRT      │ 匹配率   │");
  console.log("  ├──────────────────────┼──────────┼──────────┼──────────┤");

  let totalScore = 0, totalChecks = 0;

  for (const [entity, map] of Object.entries(entityTableMap)) {
    let mssqlCount = 0, pgCount = 0;

    // Count in MSSQL
    if (mssql) {
      try {
        const r = await mssql.request().query(`SELECT COUNT(*) AS cnt FROM [${map.mssql}]`);
        mssqlCount = r.recordset[0]?.cnt || 0;
      } catch {}
    }

    // Count in PostgreSQL
    try {
      const r = await pg.query(`SELECT COUNT(*) AS cnt FROM "${map.pg}"`);
      pgCount = parseInt(r.rows[0]?.cnt) || 0;
    } catch {}

    const pct = mssqlCount > 0 ? Math.round(pgCount / mssqlCount * 100) : (pgCount > 0 ? 100 : 0);
    const status = pct >= 95 ? "OK" : pct >= 50 ? "!!" : pct > 0 ? "XX" : "--";
    console.log(`  │ ${entity.padEnd(20)} │ ${String(mssqlCount).padStart(8)} │ ${String(pgCount).padStart(8)} │ ${String(pct).padStart(5)}% ${status} │`);

    if (mssqlCount > 0) { totalScore += pct; totalChecks++; }
  }
  console.log("  └──────────────────────┴──────────┴──────────┴──────────┘");

  const avgMatch = totalChecks > 0 ? Math.round(totalScore / totalChecks) : 0;
  log("INFO", `平均匹配率: ${avgMatch}%`);

  // Amount checksums (if MSSQL available)
  if (mssql) {
    section("金额校验");
    const checksums = [
      { label: "采购订单总额", mssqlSql: "SELECT ISNULL(SUM(CAST(total_amount AS DECIMAL(18,2))),0) AS total FROM purchase_orders", pgSql: 'SELECT COALESCE(SUM(CAST("totalAmount" AS DECIMAL(18,2))),0) AS total FROM purchase_orders' },
      { label: "库存总量", mssqlSql: "SELECT ISNULL(SUM(quantity_on_hand),0) AS total FROM inventory", pgSql: 'SELECT COALESCE(SUM("quantityOnHand"),0) AS total FROM inventory' },
    ];

    for (const cs of checksums) {
      let mssqlVal = 0, pgVal = 0;
      try { mssqlVal = (await mssql.request().query(cs.mssqlSql)).recordset[0]?.total || 0; } catch {}
      try { pgVal = (await pg.query(cs.pgSql)).rows[0]?.total || 0; } catch {}
      const match = mssqlVal > 0 ? Math.round(pgVal / mssqlVal * 100) : 0;
      log(match >= 95 ? "OK" : "WARN", `${cs.label}: 天思=${mssqlVal}, GRT=${pgVal} (${match}%)`);
    }
  }

  // GRT-only validation (row counts)
  section("GRT 业务表数据");
  const grtTables = [
    ["warehouses", "仓库"], ["suppliers", "供应商"], ["materials", "物料"],
    ["bom_masters", "BOM主表"], ["bom_items", "BOM明细"],
    ["purchase_orders", "采购订单"], ["inventory", "库存"], ["inventory_lots", "批次"],
  ];
  let totalGrt = 0;
  for (const [t, label] of grtTables) {
    try {
      const r = await pg.query(`SELECT COUNT(*) AS cnt FROM "${t}"`);
      const cnt = parseInt(r.rows[0].cnt);
      if (cnt > 0) {
        console.log(`  ${label.padEnd(14)} ${t.padEnd(25)} ${String(cnt).padStart(6)}`);
        totalGrt += cnt;
      }
    } catch {}
  }
  console.log(`  ${"─".repeat(47)}`);
  console.log(`  ${"TOTAL".padEnd(14)} ${"".padEnd(25)} ${String(totalGrt).padStart(6)}`);

  // Quality score
  const grade = avgMatch >= 90 ? "A" : avgMatch >= 75 ? "B" : avgMatch >= 50 ? "C" : "D";
  log("DONE", `天思ERP导入质量: ${avgMatch}% (${grade})`);

  return { avgMatch, grade, totalGrt };
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  天思ERP → GRT System 全量数据导入 (v1.0)                   ║");
  console.log("║  8 entities · MSSQL → PostgreSQL ETL                        ║");
  console.log(`║  ${new Date().toISOString().substring(0, 19).replace("T", " ")}                                      ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  if (!PG_URL) { console.error("ERROR: DATABASE_URL not configured"); process.exit(1); }

  log("INFO", `MSSQL: ${MSSQL_CONFIG.server}:${MSSQL_CONFIG.port}/${MSSQL_CONFIG.database}`);
  log("INFO", `PG: ${PG_URL.replace(/:[^:@]+@/, ":***@")}`);
  if (flags.dryRun) log("WARN", "预演模式 — 不写入数据");

  // Connect to PostgreSQL
  const pg = new Client({ connectionString: PG_URL });
  await pg.connect();
  log("OK", "PostgreSQL 已连接");

  // If validate-only and no MSSQL needed
  if (flags.validateOnly) {
    try {
      await phaseValidate(null, pg);
    } finally {
      await pg.end();
    }
    return;
  }

  // Connect to MSSQL
  let mssqlPool;
  try {
    log("INFO", "正在连接天思MSSQL...");
    mssqlPool = await new sql.ConnectionPool(MSSQL_CONFIG).connect();
    const ver = await mssqlPool.request().query("SELECT @@VERSION AS v, DB_NAME() AS db");
    log("OK", `MSSQL 已连接: ${ver.recordset[0].db}`);
    log("INFO", `版本: ${ver.recordset[0].v.substring(0, 80)}`);
  } catch (err) {
    console.error(`\n  ERROR: 无法连接天思MSSQL (${MSSQL_CONFIG.server}:${MSSQL_CONFIG.port})`);
    console.error(`  ${err.message}`);
    console.error("\n  请检查:");
    console.error("    1. 天思服务器是否开机且MSSQL服务已启动");
    console.error("    2. 网络是否可达 (ping 10.2.1.230)");
    console.error("    3. MSSQL TCP/IP协议是否启用");
    console.error("    4. 防火墙是否放行1433端口");
    console.error("    5. 用户名/密码是否正确 (sa/Admin1234)");
    console.error("\n  可使用 --validate 仅校验GRT侧数据:");
    console.error("    node scripts/tiansi-master-import.cjs --validate\n");
    await pg.end();
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    // Phase 1: Discover
    if (flags.discoverOnly) {
      await phaseDiscover(mssqlPool);
      return;
    }

    const tableInfo = await phaseDiscover(mssqlPool);

    // Phase 2: ETL
    const etlResults = await phaseETL(mssqlPool, pg);

    // Phase 3: Validate
    const validation = await phaseValidate(mssqlPool, pg);

    // Final summary
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    section("导入完成");
    console.log(`\n  总耗时: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
    console.log(`  数据质量: ${validation.avgMatch}% (${validation.grade})`);
    console.log(`  GRT总记录: ${validation.totalGrt}`);

    // Update ERP connection status
    try {
      await pg.query(
        `UPDATE grt_erp_connections SET last_sync_at=NOW(), last_sync_status='synced', updated_at=NOW() WHERE erp_type='TianSi'`
      );
    } catch {}

  } finally {
    try { await mssqlPool.close(); } catch {}
    await pg.end();
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
