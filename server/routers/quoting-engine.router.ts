/**
 * 非标工业清洗机报价引擎 Router
 *
 * 5 Sections, ~20 procedures:
 *   1. Rate Configuration      — 年度费率管理
 *   2. Quote CRUD             — 报价单增删改查
 *   3. Line Items             — 报价明细行
 *   4. Auto-Populate          — 从工序工时/BOM自动填充
 *   5. Post-Order & Actuals   — 订单后调整 + 实际成本跟踪
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// ── DDL auto-bootstrap ──────────────────────────────────
let _tablesReady = false;
async function ensureTables() {
  if (_tablesReady) return;
  const db = await requireDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quote_rate_configs (
      id SERIAL PRIMARY KEY,
      fiscal_year INTEGER NOT NULL,
      category VARCHAR(30) NOT NULL,
      rate_code VARCHAR(50) NOT NULL,
      rate_name VARCHAR(100) NOT NULL,
      rate_name_en VARCHAR(100),
      hourly_rate NUMERIC(10,2),
      fixed_amount NUMERIC(14,2),
      rate_unit VARCHAR(20) NOT NULL,
      allocation_base VARCHAR(50),
      bu_code VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      approved_by INTEGER,
      approved_at TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(fiscal_year, rate_code, bu_code)
    );
    CREATE TABLE IF NOT EXISTS project_quotes (
      id SERIAL PRIMARY KEY,
      quote_code VARCHAR(50) NOT NULL UNIQUE,
      project_id INTEGER,
      project_code VARCHAR(50),
      bid_project_id INTEGER,
      customer_name VARCHAR(200) NOT NULL,
      customer_id INTEGER,
      equipment_model VARCHAR(100),
      equipment_description TEXT,
      bu_code VARCHAR(50) NOT NULL,
      fiscal_year INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      parent_quote_id INTEGER,
      quote_type VARCHAR(30) NOT NULL DEFAULT 'initial',
      total_mfg_labor_cost NUMERIC(14,2) DEFAULT 0,
      total_material_cost NUMERIC(14,2) DEFAULT 0,
      total_engineering_cost NUMERIC(14,2) DEFAULT 0,
      total_sales_expense NUMERIC(14,2) DEFAULT 0,
      total_warranty_provision NUMERIC(14,2) DEFAULT 0,
      total_other_cost NUMERIC(14,2) DEFAULT 0,
      total_cost NUMERIC(14,2) DEFAULT 0,
      target_margin_pct NUMERIC(5,2),
      target_margin_amount NUMERIC(14,2) DEFAULT 0,
      quoted_price NUMERIC(14,2) DEFAULT 0,
      contract_value NUMERIC(14,2),
      status VARCHAR(30) NOT NULL DEFAULT 'draft',
      prepared_by INTEGER,
      reviewed_by INTEGER, reviewed_at TIMESTAMP,
      approved_by INTEGER, approved_at TIMESTAMP,
      order_received_date TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS quote_line_items (
      id SERIAL PRIMARY KEY,
      quote_id INTEGER NOT NULL,
      category VARCHAR(30) NOT NULL,
      sub_category VARCHAR(50) NOT NULL,
      item_name VARCHAR(200) NOT NULL,
      item_name_en VARCHAR(200),
      estimated_hours NUMERIC(10,2),
      hourly_rate NUMERIC(10,2),
      rate_config_id INTEGER,
      quantity NUMERIC(10,2),
      unit_price NUMERIC(12,2),
      estimated_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
      bom_item_id INTEGER,
      supplier_id INTEGER,
      po_id INTEGER,
      source_type VARCHAR(30),
      source_ref_id VARCHAR(50),
      notes TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS project_cost_actuals (
      id SERIAL PRIMARY KEY,
      quote_id INTEGER NOT NULL,
      quote_line_item_id INTEGER,
      project_id INTEGER NOT NULL,
      category VARCHAR(30) NOT NULL,
      sub_category VARCHAR(50) NOT NULL,
      budget_hours NUMERIC(10,2) DEFAULT 0,
      budget_cost NUMERIC(14,2) DEFAULT 0,
      actual_hours NUMERIC(10,2) DEFAULT 0,
      actual_cost NUMERIC(14,2) DEFAULT 0,
      variance_hours NUMERIC(10,2) DEFAULT 0,
      variance_cost NUMERIC(14,2) DEFAULT 0,
      variance_pct NUMERIC(8,2) DEFAULT 0,
      completion_pct NUMERIC(5,2) DEFAULT 0,
      forecast_final_cost NUMERIC(14,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'on_track',
      last_synced_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(quote_id, category, sub_category)
    );
  `);
  // Indexes
  try {
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_rate_year_cat ON quote_rate_configs(fiscal_year, category)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pq_project ON project_quotes(project_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pq_bu ON project_quotes(bu_code)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pq_status ON project_quotes(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_qli_quote_cat ON quote_line_items(quote_id, category)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pca_project ON project_cost_actuals(project_id)`);
  } catch { /* indexes may already exist */ }
  _tablesReady = true;
}

// ── Process code ↔ column mapping ─────────────────────────
const PROCESS_MAP = [
  { code: "laser_cutting",       name: "激光切割",       nameEn: "Laser Cutting",       col: "laser_cutting" },
  { code: "machining",           name: "机加工",         nameEn: "Machining",            col: "machining" },
  { code: "shearing_bending",    name: "剪板折弯",       nameEn: "Shearing & Bending",   col: "shearing_bending" },
  { code: "sub_assembly",        name: "部件制作",       nameEn: "Sub-Assembly",         col: "sub_assembly" },
  { code: "mechanical_assembly", name: "机械装配",       nameEn: "Mechanical Assembly",  col: "mechanical_assembly" },
  { code: "electrical_assembly", name: "电气装配",       nameEn: "Electrical Assembly",  col: "electrical_assembly" },
  { code: "debug_ship_install",  name: "调试/发货/安装", nameEn: "Debug/Ship/Install",    col: "debug_ship_install" },
];

const ENG_MAP = [
  { code: "sales",         name: "销售工时",     nameEn: "Sales" },
  { code: "mech_rnd",      name: "机械研发工时", nameEn: "Mechanical R&D" },
  { code: "elec_rnd",      name: "电气研发工时", nameEn: "Electrical R&D" },
  { code: "commissioning", name: "调试工时",     nameEn: "Commissioning" },
  { code: "pm",            name: "项目管理工时", nameEn: "Project Management" },
  { code: "service",       name: "服务工时",     nameEn: "Service" },
];

// ═══════════════════════════════════════════════════════════
export const quotingEngineRouter = router({

  // ────────────────────────────────────────
  // Section 1: Rate Configuration
  // ────────────────────────────────────────

  listRateConfigs: protectedProcedure
    .input(z.object({
      fiscalYear: z.number().optional(),
      category: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const year = input?.fiscalYear ?? new Date().getFullYear();
      const result = input?.category
        ? await db.execute(sql`
            SELECT * FROM quote_rate_configs WHERE fiscal_year = ${year} AND category = ${input.category} ORDER BY rate_code
          `)
        : await db.execute(sql`
            SELECT * FROM quote_rate_configs WHERE fiscal_year = ${year} ORDER BY category, rate_code
          `);
      return result.rows;
    }),

  upsertRateConfig: protectedProcedure
    .input(z.object({
      fiscalYear: z.number(),
      category: z.string(),
      rateCode: z.string(),
      rateName: z.string(),
      rateNameEn: z.string().optional(),
      hourlyRate: z.number().optional(),
      fixedAmount: z.number().optional(),
      rateUnit: z.string(),
      allocationBase: z.string().optional(),
      buCode: z.string().nullable().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`
        INSERT INTO quote_rate_configs (fiscal_year, category, rate_code, rate_name, rate_name_en, hourly_rate, fixed_amount, rate_unit, allocation_base, bu_code, notes)
        VALUES (${input.fiscalYear}, ${input.category}, ${input.rateCode}, ${input.rateName}, ${input.rateNameEn ?? null},
                ${input.hourlyRate ?? null}, ${input.fixedAmount ?? null}, ${input.rateUnit}, ${input.allocationBase ?? null},
                ${input.buCode ?? null}, ${input.notes ?? null})
        ON CONFLICT (fiscal_year, rate_code, bu_code) DO UPDATE SET
          rate_name = ${input.rateName}, hourly_rate = ${input.hourlyRate ?? null},
          fixed_amount = ${input.fixedAmount ?? null}, rate_unit = ${input.rateUnit},
          allocation_base = ${input.allocationBase ?? null}, notes = ${input.notes ?? null}, updated_at = NOW()
      `);
      return { success: true };
    }),

  cloneRatesForYear: protectedProcedure
    .input(z.object({
      fromYear: z.number(),
      toYear: z.number(),
      adjustmentPct: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const factor = 1 + input.adjustmentPct / 100;
      await db.execute(sql`
        INSERT INTO quote_rate_configs (fiscal_year, category, rate_code, rate_name, rate_name_en, hourly_rate, fixed_amount, rate_unit, allocation_base, bu_code, notes)
        SELECT ${input.toYear}, category, rate_code, rate_name, rate_name_en,
               CASE WHEN hourly_rate IS NOT NULL THEN round((hourly_rate * ${factor})::numeric, 2) ELSE NULL END,
               CASE WHEN fixed_amount IS NOT NULL THEN round((fixed_amount * ${factor})::numeric, 2) ELSE NULL END,
               rate_unit, allocation_base, bu_code,
               '从' || ${input.fromYear}::text || '年克隆, 调整' || ${input.adjustmentPct}::text || '%'
        FROM quote_rate_configs WHERE fiscal_year = ${input.fromYear} AND is_active = true
        ON CONFLICT (fiscal_year, rate_code, bu_code) DO NOTHING
      `);
      const cnt = await db.execute(sql`SELECT count(*) FROM quote_rate_configs WHERE fiscal_year = ${input.toYear}`);
      return { success: true, count: Number((cnt.rows as any[])[0]?.count ?? 0) };
    }),

  getEffectiveRates: protectedProcedure
    .input(z.object({ fiscalYear: z.number(), buCode: z.string().optional() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // BU-specific rate overrides fall back to generic (bu_code IS NULL)
      const result = await db.execute(sql`
        SELECT DISTINCT ON (rate_code)
          id, fiscal_year, category, rate_code, rate_name, rate_name_en,
          hourly_rate, fixed_amount, rate_unit, allocation_base, bu_code
        FROM quote_rate_configs
        WHERE fiscal_year = ${input.fiscalYear} AND is_active = true
          AND (bu_code = ${input.buCode ?? null} OR bu_code IS NULL)
        ORDER BY rate_code, bu_code NULLS LAST
      `);
      return result.rows;
    }),

  // ────────────────────────────────────────
  // Section 2: Quote CRUD
  // ────────────────────────────────────────

  createQuote: protectedProcedure
    .input(z.object({
      customerName: z.string(),
      buCode: z.string(),
      equipmentModel: z.string().optional(),
      equipmentDescription: z.string().optional(),
      projectCode: z.string().optional(),
      targetMarginPct: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const year = new Date().getFullYear();
      const seq = await db.execute(sql`SELECT count(*)+1 as seq FROM project_quotes WHERE fiscal_year = ${year}`);
      const seqNum = String((seq.rows as any[])[0]?.seq ?? 1).padStart(3, "0");
      const quoteCode = `QT-${input.buCode}-${year}-${seqNum}`;

      await db.execute(sql`
        INSERT INTO project_quotes (quote_code, customer_name, bu_code, fiscal_year, equipment_model, equipment_description,
          project_code, target_margin_pct, prepared_by, notes)
        VALUES (${quoteCode}, ${input.customerName}, ${input.buCode}, ${year},
          ${input.equipmentModel ?? null}, ${input.equipmentDescription ?? null},
          ${input.projectCode ?? null}, ${input.targetMarginPct ?? 25}, ${(ctx as any).userId ?? null}, ${input.notes ?? null})
      `);
      return { success: true, quoteCode };
    }),

  getQuote: protectedProcedure
    .input(z.object({ quoteCode: z.string().optional(), quoteId: z.number().optional() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const quote = input?.quoteCode
        ? await db.execute(sql`SELECT * FROM project_quotes WHERE quote_code = ${input.quoteCode} LIMIT 1`)
        : await db.execute(sql`SELECT * FROM project_quotes WHERE id = ${input?.quoteId ?? 0} LIMIT 1`);
      if (!(quote.rows as any[]).length) return null;
      const q = (quote.rows as any[])[0];

      const lines = await db.execute(sql`SELECT * FROM quote_line_items WHERE quote_id = ${q.id} ORDER BY category, sort_order, id`);
      const actuals = await db.execute(sql`SELECT * FROM project_cost_actuals WHERE quote_id = ${q.id}`);

      return { ...q, lineItems: lines.rows, actuals: actuals.rows };
    }),

  listQuotes: protectedProcedure
    .input(z.object({
      buCode: z.string().optional(),
      status: z.string().optional(),
      fiscalYear: z.number().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT id, quote_code, customer_name, equipment_model, bu_code, fiscal_year,
          version, quote_type, total_cost, target_margin_pct, quoted_price, contract_value,
          status, created_at
        FROM project_quotes
        ORDER BY created_at DESC
        LIMIT ${input?.limit ?? 50}
      `);
      let rows = result.rows as any[];
      if (input?.buCode) rows = rows.filter(r => r.bu_code === input.buCode);
      if (input?.status) rows = rows.filter(r => r.status === input.status);
      if (input?.fiscalYear) rows = rows.filter(r => r.fiscal_year === input.fiscalYear);
      if (input?.search) {
        const q = input.search.toLowerCase();
        rows = rows.filter(r => r.customer_name?.toLowerCase().includes(q) || r.equipment_model?.toLowerCase().includes(q));
      }
      return rows;
    }),

  updateQuoteHeader: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      targetMarginPct: z.number().optional(),
      customerName: z.string().optional(),
      equipmentModel: z.string().optional(),
      notes: z.string().optional(),
      contractValue: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`
        UPDATE project_quotes SET
          target_margin_pct = COALESCE(${input.targetMarginPct ?? null}, target_margin_pct),
          customer_name = COALESCE(${input.customerName ?? null}, customer_name),
          equipment_model = COALESCE(${input.equipmentModel ?? null}, equipment_model),
          notes = COALESCE(${input.notes ?? null}, notes),
          contract_value = COALESCE(${input.contractValue ?? null}, contract_value),
          updated_at = NOW()
        WHERE id = ${input.quoteId}
      `);
      return { success: true };
    }),

  // ────────────────────────────────────────
  // Section 3: Line Items
  // ────────────────────────────────────────

  addLineItem: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      category: z.string(),
      subCategory: z.string(),
      itemName: z.string(),
      estimatedHours: z.number().optional(),
      hourlyRate: z.number().optional(),
      quantity: z.number().optional(),
      unitPrice: z.number().optional(),
      estimatedCost: z.number().optional(),
      notes: z.string().optional(),
      sourceType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const cost = input.estimatedCost
        ?? (input.estimatedHours && input.hourlyRate ? input.estimatedHours * input.hourlyRate : null)
        ?? (input.quantity && input.unitPrice ? input.quantity * input.unitPrice : 0);

      await db.execute(sql`
        INSERT INTO quote_line_items (quote_id, category, sub_category, item_name,
          estimated_hours, hourly_rate, quantity, unit_price, estimated_cost, source_type, notes)
        VALUES (${input.quoteId}, ${input.category}, ${input.subCategory}, ${input.itemName},
          ${input.estimatedHours ?? null}, ${input.hourlyRate ?? null},
          ${input.quantity ?? null}, ${input.unitPrice ?? null}, ${cost},
          ${input.sourceType ?? "manual"}, ${input.notes ?? null})
      `);
      return { success: true };
    }),

  removeLineItem: protectedProcedure
    .input(z.object({ lineItemId: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`DELETE FROM quote_line_items WHERE id = ${input.lineItemId}`);
      return { success: true };
    }),

  recalculateQuoteTotals: protectedProcedure
    .input(z.object({ quoteId: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const sums = await db.execute(sql`
        SELECT category, COALESCE(sum(estimated_cost), 0) AS total
        FROM quote_line_items WHERE quote_id = ${input.quoteId}
        GROUP BY category
      `);

      const catTotals: Record<string, number> = {};
      for (const r of sums.rows as any[]) catTotals[r.category] = Number(r.total);

      const mfg = catTotals["mfg_labor"] ?? 0;
      const mat = catTotals["material"] ?? 0;
      const eng = catTotals["engineering"] ?? 0;
      const sales = catTotals["sales_expense"] ?? 0;
      const warranty = catTotals["warranty"] ?? 0;
      const other = catTotals["other"] ?? 0;
      const totalCost = mfg + mat + eng + sales + warranty + other;

      // Read margin pct from quote header
      const q = await db.execute(sql`SELECT target_margin_pct FROM project_quotes WHERE id = ${input.quoteId}`);
      const marginPct = Number((q.rows as any[])[0]?.target_margin_pct ?? 25);
      const marginAmt = Math.round(totalCost * marginPct / 100);
      const quotedPrice = totalCost + marginAmt;

      await db.execute(sql`
        UPDATE project_quotes SET
          total_mfg_labor_cost = ${mfg}, total_material_cost = ${mat}, total_engineering_cost = ${eng},
          total_sales_expense = ${sales}, total_warranty_provision = ${warranty}, total_other_cost = ${other},
          total_cost = ${totalCost}, target_margin_amount = ${marginAmt}, quoted_price = ${quotedPrice},
          updated_at = NOW()
        WHERE id = ${input.quoteId}
      `);

      return {
        totalMfgLaborCost: mfg, totalMaterialCost: mat, totalEngineeringCost: eng,
        totalSalesExpense: sales, totalWarrantyProvision: warranty, totalOtherCost: other,
        totalCost, targetMarginAmount: marginAmt, quotedPrice,
      };
    }),

  // ────────────────────────────────────────
  // Section 4: Auto-Populate from process hours
  // ────────────────────────────────────────

  /** A1: 从工序工时自动填充制造工时成本 */
  populateFromProcessHours: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      projectCode: z.string(),
      hoursType: z.enum(["theory", "planned"]).default("theory"),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // Get whole-machine process hours
      const hours = await db.execute(sql`
        SELECT laser_cutting, machining, shearing_bending, sub_assembly,
               mechanical_assembly, electrical_assembly, debug_ship_install
        FROM project_process_hours
        WHERE project_code = ${input.projectCode} AND part_no = '00' AND hours_type = ${input.hoursType}
        LIMIT 1
      `);
      if (!(hours.rows as any[]).length) return { success: false, message: "Project not found in process hours" };
      const h = (hours.rows as any[])[0];

      // Get fiscal year from quote
      const q = await db.execute(sql`SELECT fiscal_year FROM project_quotes WHERE id = ${input.quoteId}`);
      const year = (q.rows as any[])[0]?.fiscal_year ?? new Date().getFullYear();

      // Get effective rates
      const rates = await db.execute(sql`
        SELECT rate_code, hourly_rate, id FROM quote_rate_configs
        WHERE fiscal_year = ${year} AND category = 'mfg_process' AND is_active = true AND bu_code IS NULL
      `);
      const rateMap: Record<string, { rate: number; id: number }> = {};
      for (const r of rates.rows as any[]) rateMap[r.rate_code] = { rate: Number(r.hourly_rate), id: r.id };

      // Delete existing mfg_labor items for this quote
      await db.execute(sql`DELETE FROM quote_line_items WHERE quote_id = ${input.quoteId} AND category = 'mfg_labor'`);

      let count = 0;
      for (const p of PROCESS_MAP) {
        const hrs = Number(h[p.col] ?? 0);
        if (hrs <= 0) continue;
        const rate = rateMap[p.code]?.rate ?? 100;
        const rateId = rateMap[p.code]?.id ?? null;
        const cost = Math.round(hrs * rate * 100) / 100;

        await db.execute(sql`
          INSERT INTO quote_line_items (quote_id, category, sub_category, item_name, item_name_en,
            estimated_hours, hourly_rate, rate_config_id, estimated_cost, source_type, source_ref_id, sort_order)
          VALUES (${input.quoteId}, 'mfg_labor', ${p.code}, ${p.name}, ${p.nameEn},
            ${hrs}, ${rate}, ${rateId}, ${cost}, 'from_process_hours', ${input.projectCode}, ${count})
        `);
        count++;
      }
      return { success: true, lineItemsCreated: count };
    }),

  /** A3: 填充工程工时默认值 */
  populateEngineeringDefaults: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      totalMfgHours: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const q = await db.execute(sql`SELECT fiscal_year FROM project_quotes WHERE id = ${input.quoteId}`);
      const year = (q.rows as any[])[0]?.fiscal_year ?? new Date().getFullYear();

      // Get engineering rates
      const rates = await db.execute(sql`
        SELECT rate_code, hourly_rate, id FROM quote_rate_configs
        WHERE fiscal_year = ${year} AND category = 'engineering' AND is_active = true AND bu_code IS NULL
      `);
      const rateMap: Record<string, { rate: number; id: number }> = {};
      for (const r of rates.rows as any[]) rateMap[r.rate_code] = { rate: Number(r.hourly_rate), id: r.id };

      // Get total mfg hours from existing line items
      const mfgSum = await db.execute(sql`
        SELECT COALESCE(sum(estimated_hours), 0) as total FROM quote_line_items WHERE quote_id = ${input.quoteId} AND category = 'mfg_labor'
      `);
      const totalMfg = input.totalMfgHours ?? Number((mfgSum.rows as any[])[0]?.total ?? 1000);

      // Standard engineering hour ratios (based on GRT historical data)
      const ENG_RATIOS: Record<string, number> = {
        sales: 0.03,         // ~3% of mfg hours
        mech_rnd: 0.12,      // ~12% — mechanical design
        elec_rnd: 0.08,      // ~8% — electrical design
        commissioning: 0.06, // ~6% — on-site commissioning
        pm: 0.05,            // ~5% — project management
        service: 0.02,       // ~2% — after-sales
      };

      await db.execute(sql`DELETE FROM quote_line_items WHERE quote_id = ${input.quoteId} AND category = 'engineering'`);

      let count = 0;
      for (const e of ENG_MAP) {
        const hrs = Math.round(totalMfg * (ENG_RATIOS[e.code] ?? 0.05));
        const rate = rateMap[e.code]?.rate ?? 150;
        const cost = Math.round(hrs * rate * 100) / 100;

        await db.execute(sql`
          INSERT INTO quote_line_items (quote_id, category, sub_category, item_name, item_name_en,
            estimated_hours, hourly_rate, rate_config_id, estimated_cost, source_type, sort_order)
          VALUES (${input.quoteId}, 'engineering', ${e.code}, ${e.name}, ${e.nameEn},
            ${hrs}, ${rate}, ${rateMap[e.code]?.id ?? null}, ${cost}, 'from_rate_config', ${count})
        `);
        count++;
      }
      return { success: true, lineItemsCreated: count };
    }),

  /** A4+A5+A6: 填充销售/质保/其他费用 */
  populateOverheadDefaults: protectedProcedure
    .input(z.object({ quoteId: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // Calculate subtotal of A1+A2+A3
      const sub = await db.execute(sql`
        SELECT COALESCE(sum(estimated_cost), 0) as subtotal
        FROM quote_line_items WHERE quote_id = ${input.quoteId} AND category IN ('mfg_labor', 'material', 'engineering')
      `);
      const subtotal = Number((sub.rows as any[])[0]?.subtotal ?? 0);

      // Delete existing overhead items
      await db.execute(sql`DELETE FROM quote_line_items WHERE quote_id = ${input.quoteId} AND category IN ('sales_expense', 'warranty', 'other')`);

      const overheads = [
        { cat: "sales_expense", sub: "travel",          name: "差旅费",   pct: 0.02 },
        { cat: "sales_expense", sub: "entertainment",   name: "商务招待", pct: 0.01 },
        { cat: "warranty",      sub: "warranty_provision", name: "质保金", pct: 0.03 },
        { cat: "other",         sub: "packaging",       name: "包装费",   pct: 0.005 },
        { cat: "other",         sub: "transport",       name: "运输费",   pct: 0.015 },
        { cat: "other",         sub: "insurance",       name: "保险费",   pct: 0.005 },
        { cat: "other",         sub: "contingency",     name: "不可预见费", pct: 0.02 },
      ];

      for (const o of overheads) {
        const cost = Math.round(subtotal * o.pct * 100) / 100;
        await db.execute(sql`
          INSERT INTO quote_line_items (quote_id, category, sub_category, item_name,
            estimated_cost, source_type, notes)
          VALUES (${input.quoteId}, ${o.cat}, ${o.sub}, ${o.name},
            ${cost}, 'from_rate_config', ${`${(o.pct * 100).toFixed(1)}% × 成本小计`})
        `);
      }
      return { success: true, lineItemsCreated: overheads.length };
    }),

  // ────────────────────────────────────────
  // Section 5: Post-Order & Actuals
  // ────────────────────────────────────────

  /** B: 订单后调整 — 按实际合同价值重新分配成本 */
  createAdjustedQuote: protectedProcedure
    .input(z.object({
      sourceQuoteId: z.number(),
      contractValue: z.number(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // Read source quote
      const src = await db.execute(sql`SELECT * FROM project_quotes WHERE id = ${input.sourceQuoteId}`);
      if (!(src.rows as any[]).length) return { success: false, message: "Source quote not found" };
      const s = (src.rows as any[])[0];

      const originalTotal = Number(s.quoted_price) || 1;
      const scaleFactor = input.contractValue / originalTotal;

      // Create adjusted version
      const newCode = `${s.quote_code}-v${(Number(s.version) || 1) + 1}`;
      await db.execute(sql`
        INSERT INTO project_quotes (quote_code, project_id, project_code, customer_name, bu_code, fiscal_year,
          version, parent_quote_id, quote_type, contract_value, target_margin_pct, status, notes, equipment_model)
        VALUES (${newCode}, ${s.project_id}, ${s.project_code}, ${s.customer_name}, ${s.bu_code}, ${s.fiscal_year},
          ${(Number(s.version) || 1) + 1}, ${s.id}, 'adjusted', ${input.contractValue}, ${s.target_margin_pct},
          'order_received', ${"按合同价值 " + input.contractValue + " 调整 (缩放系数 " + scaleFactor.toFixed(3) + ")"}, ${s.equipment_model})
      `);

      const newQ = await db.execute(sql`SELECT id FROM project_quotes WHERE quote_code = ${newCode}`);
      const newId = (newQ.rows as any[])[0]?.id;

      // Copy & scale line items
      const lines = await db.execute(sql`SELECT * FROM quote_line_items WHERE quote_id = ${input.sourceQuoteId}`);
      for (const l of lines.rows as any[]) {
        const scaledCost = Math.round(Number(l.estimated_cost) * scaleFactor * 100) / 100;
        const scaledHours = l.estimated_hours ? Math.round(Number(l.estimated_hours) * scaleFactor * 10) / 10 : null;
        await db.execute(sql`
          INSERT INTO quote_line_items (quote_id, category, sub_category, item_name, item_name_en,
            estimated_hours, hourly_rate, rate_config_id, quantity, unit_price, estimated_cost, source_type, sort_order)
          VALUES (${newId}, ${l.category}, ${l.sub_category}, ${l.item_name}, ${l.item_name_en},
            ${scaledHours}, ${l.hourly_rate}, ${l.rate_config_id}, ${l.quantity}, ${l.unit_price},
            ${scaledCost}, 'adjusted', ${l.sort_order})
        `);
      }

      // Recalculate totals on new quote — call inline logic
      const sums2 = await db.execute(sql`
        SELECT category, sum(estimated_cost) as total FROM quote_line_items WHERE quote_id = ${newId} GROUP BY category
      `);
      const t: Record<string, number> = {};
      for (const r of sums2.rows as any[]) t[r.category] = Number(r.total);
      const tc = Object.values(t).reduce((a, b) => a + b, 0);
      const mp = Number(s.target_margin_pct ?? 25);
      await db.execute(sql`
        UPDATE project_quotes SET
          total_mfg_labor_cost=${t["mfg_labor"]??0}, total_material_cost=${t["material"]??0},
          total_engineering_cost=${t["engineering"]??0}, total_sales_expense=${t["sales_expense"]??0},
          total_warranty_provision=${t["warranty"]??0}, total_other_cost=${t["other"]??0},
          total_cost=${tc}, target_margin_amount=${Math.round(tc*mp/100)}, quoted_price=${input.contractValue},
          updated_at=NOW()
        WHERE id = ${newId}
      `);

      return { success: true, adjustedQuoteCode: newCode, adjustedQuoteId: newId, scaleFactor };
    }),

  /** C: 项目成本仪表板 — 报价 vs 调整 vs 实际 */
  getProjectCostDashboard: protectedProcedure
    .input(z.object({ quoteId: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const quote = await db.execute(sql`SELECT * FROM project_quotes WHERE id = ${input.quoteId}`);
      if (!(quote.rows as any[]).length) return null;
      const q = (quote.rows as any[])[0];

      const lines = await db.execute(sql`
        SELECT category, sub_category, item_name, estimated_hours, hourly_rate, estimated_cost
        FROM quote_line_items WHERE quote_id = ${input.quoteId} ORDER BY category, sort_order
      `);

      const actuals = await db.execute(sql`
        SELECT category, sub_category, budget_hours, budget_cost, actual_hours, actual_cost,
          variance_cost, variance_pct, completion_pct, forecast_final_cost, status
        FROM project_cost_actuals WHERE quote_id = ${input.quoteId}
      `);

      // Category summary
      const catSummary = await db.execute(sql`
        SELECT category,
          sum(estimated_cost) AS budget,
          0 AS actual,
          sum(estimated_cost) AS variance
        FROM quote_line_items WHERE quote_id = ${input.quoteId}
        GROUP BY category
      `);

      return {
        quote: q,
        lineItems: lines.rows,
        actuals: actuals.rows,
        categorySummary: catSummary.rows,
      };
    }),

  /** 种子：初始化2026年默认费率 */
  seedDefaultRates: protectedProcedure
    .input(z.object({ fiscalYear: z.number().default(2026) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const year = input.fiscalYear;

      const RATES = [
        // A1: 制造工序费率
        { cat: "mfg_process", code: "laser_cutting",       name: "激光切割",       nameEn: "Laser Cutting",       rate: 95,  unit: "rmb_per_hour" },
        { cat: "mfg_process", code: "machining",           name: "机加工",         nameEn: "Machining",           rate: 110, unit: "rmb_per_hour" },
        { cat: "mfg_process", code: "shearing_bending",    name: "剪板折弯",       nameEn: "Shearing & Bending",  rate: 90,  unit: "rmb_per_hour" },
        { cat: "mfg_process", code: "sub_assembly",        name: "部件制作",       nameEn: "Sub-Assembly",        rate: 100, unit: "rmb_per_hour" },
        { cat: "mfg_process", code: "mechanical_assembly", name: "机械装配",       nameEn: "Mechanical Assembly", rate: 125, unit: "rmb_per_hour" },
        { cat: "mfg_process", code: "electrical_assembly", name: "电气装配",       nameEn: "Electrical Assembly", rate: 130, unit: "rmb_per_hour" },
        { cat: "mfg_process", code: "debug_ship_install",  name: "调试/发货/安装", nameEn: "Debug/Ship/Install",  rate: 140, unit: "rmb_per_hour" },
        // A3: 工程费率
        { cat: "engineering", code: "sales",         name: "销售工时",     nameEn: "Sales",              rate: 150, unit: "rmb_per_hour" },
        { cat: "engineering", code: "mech_rnd",      name: "机械研发工时", nameEn: "Mechanical R&D",     rate: 160, unit: "rmb_per_hour" },
        { cat: "engineering", code: "elec_rnd",      name: "电气研发工时", nameEn: "Electrical R&D",     rate: 165, unit: "rmb_per_hour" },
        { cat: "engineering", code: "commissioning", name: "调试工时",     nameEn: "Commissioning",      rate: 145, unit: "rmb_per_hour" },
        { cat: "engineering", code: "pm",            name: "项目管理工时", nameEn: "Project Management", rate: 155, unit: "rmb_per_hour" },
        { cat: "engineering", code: "service",       name: "服务工时",     nameEn: "Service",            rate: 120, unit: "rmb_per_hour" },
      ];

      let count = 0;
      for (const r of RATES) {
        await db.execute(sql`
          INSERT INTO quote_rate_configs (fiscal_year, category, rate_code, rate_name, rate_name_en, hourly_rate, rate_unit)
          VALUES (${year}, ${r.cat}, ${r.code}, ${r.name}, ${r.nameEn}, ${r.rate}, ${r.unit})
          ON CONFLICT (fiscal_year, rate_code, bu_code) DO UPDATE SET
            hourly_rate = ${r.rate}, rate_name = ${r.name}, updated_at = NOW()
        `);
        count++;
      }
      return { success: true, count };
    }),

  // ────────────────────────────────────────
  // Section 6: 产值核算 + 效率分析
  // ────────────────────────────────────────

  /**
   * 项目效率分析 — 理论产值 vs 实际工时 vs 无效工时
   *
   * 规则：
   *   有效工时 = min(实际工时, 理论工时)  → 产生产值
   *   无效工时 = max(0, 实际工时 - 理论工时) → 无产值，仅统计
   *   产值 = 有效工时 × 工序费率
   *   效率 = 理论工时 / 实际工时 × 100%  (>100% = 高效, <100% = 低效)
   */
  getProjectEfficiencyAnalysis: protectedProcedure
    .input(z.object({ projectCode: z.string() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // 1. 理论工时 (整机)
      const theory = await db.execute(sql`
        SELECT laser_cutting, machining, shearing_bending, sub_assembly,
               mechanical_assembly, electrical_assembly, debug_ship_install
        FROM project_process_hours
        WHERE project_code = ${input.projectCode} AND part_no = '00' AND hours_type = 'theory'
        LIMIT 1
      `);
      if (!(theory.rows as any[]).length) return { error: "No theory hours found" };
      const th = (theory.rows as any[])[0];

      // 2. 计划工时
      const planned = await db.execute(sql`
        SELECT laser_cutting, machining, shearing_bending, sub_assembly,
               mechanical_assembly, electrical_assembly, debug_ship_install
        FROM project_process_hours
        WHERE project_code = ${input.projectCode} AND part_no = '00' AND hours_type = 'planned'
        LIMIT 1
      `);
      const pl = (planned.rows as any[])?.[0] ?? {};

      // 3. 实际工时消耗
      const actual = await db.execute(sql`
        SELECT process_name, planned_hours, theory_hours, actual_hours, completion_rate, consumption_rate
        FROM process_consumption_stats
        WHERE project_code = ${input.projectCode}
      `);
      const actualMap: Record<string, { actualHours: number; completionRate: number; consumptionRate: number }> = {};
      for (const r of actual.rows as any[]) {
        // Map process_name like "5.2激光切割" to code
        const pn = String(r.process_name);
        let code = "";
        if (pn.includes("激光") || pn.includes("5.2")) code = "laser_cutting";
        else if (pn.includes("机加工") || pn.includes("5.3")) code = "machining";
        else if (pn.includes("剪板") || pn.includes("折弯") || pn.includes("5.4")) code = "shearing_bending";
        else if (pn.includes("部件") || pn.includes("5.5")) code = "sub_assembly";
        else if (pn.includes("机械装配") || pn.includes("5.6")) code = "mechanical_assembly";
        else if (pn.includes("电气装配") || pn.includes("5.7")) code = "electrical_assembly";
        else if (pn.includes("调试") || pn.includes("发货") || pn.includes("安装")) code = "debug_ship_install";
        if (code) {
          actualMap[code] = {
            actualHours: Number(r.actual_hours ?? 0),
            completionRate: Number(r.completion_rate ?? 0),
            consumptionRate: Number(r.consumption_rate ?? 0),
          };
        }
      }

      // 4. 获取费率
      const year = new Date().getFullYear();
      const rates = await db.execute(sql`
        SELECT rate_code, hourly_rate FROM quote_rate_configs
        WHERE fiscal_year = ${year} AND category = 'mfg_process' AND is_active = true AND bu_code IS NULL
      `);
      const rateMap: Record<string, number> = {};
      for (const r of rates.rows as any[]) rateMap[r.rate_code] = Number(r.hourly_rate);

      // 5. 逐工序计算
      const processes = [];
      let totalTheoryHours = 0, totalPlannedHours = 0, totalActualHours = 0;
      let totalEffectiveHours = 0, totalInvalidHours = 0;
      let totalTheoryValue = 0, totalEffectiveValue = 0;

      for (const p of PROCESS_MAP) {
        const theoryH = Number(th[p.col] ?? 0);
        const plannedH = Number(pl[p.col] ?? 0);
        const act = actualMap[p.code];
        const actualH = act?.actualHours ?? 0;
        const rate = rateMap[p.code] ?? 100;

        // 有效工时 = min(实际, 理论); 无效工时 = max(0, 实际-理论)
        const effectiveH = Math.min(actualH, theoryH);
        const invalidH = Math.max(0, actualH - theoryH);
        const efficiency = actualH > 0 ? Math.round(theoryH / actualH * 1000) / 10 : 0;

        const theoryValue = Math.round(theoryH * rate * 100) / 100;
        const effectiveValue = Math.round(effectiveH * rate * 100) / 100;
        const invalidValue = Math.round(invalidH * rate * 100) / 100; // 无产值但计算成本

        totalTheoryHours += theoryH;
        totalPlannedHours += plannedH;
        totalActualHours += actualH;
        totalEffectiveHours += effectiveH;
        totalInvalidHours += invalidH;
        totalTheoryValue += theoryValue;
        totalEffectiveValue += effectiveValue;

        processes.push({
          code: p.code,
          name: p.name,
          nameEn: p.nameEn,
          hourlyRate: rate,
          theoryHours: theoryH,
          plannedHours: plannedH,
          actualHours: actualH,
          effectiveHours: effectiveH,   // 有效工时（产值工时）
          invalidHours: invalidH,       // 无效工时（超理论部分）
          efficiency,                    // 效率 %
          theoryValue,                   // 理论产值
          effectiveValue,                // 实际产值
          invalidCost: invalidValue,     // 无效工时成本（亏损）
          completionRate: act?.completionRate ?? 0,
        });
      }

      const overallEfficiency = totalActualHours > 0
        ? Math.round(totalTheoryHours / totalActualHours * 1000) / 10
        : 0;

      return {
        projectCode: input.projectCode,
        processes,
        summary: {
          totalTheoryHours: Math.round(totalTheoryHours * 10) / 10,
          totalPlannedHours: Math.round(totalPlannedHours * 10) / 10,
          totalActualHours: Math.round(totalActualHours * 10) / 10,
          totalEffectiveHours: Math.round(totalEffectiveHours * 10) / 10,
          totalInvalidHours: Math.round(totalInvalidHours * 10) / 10,
          overallEfficiency,
          totalTheoryValue: Math.round(totalTheoryValue),    // 理论总产值
          totalEffectiveValue: Math.round(totalEffectiveValue), // 实际总产值
          invalidCostTotal: Math.round((totalActualHours - totalEffectiveHours) * (totalTheoryValue / Math.max(totalTheoryHours, 1))), // 无效工时总成本
          valueRealizationRate: totalTheoryValue > 0 ? Math.round(totalEffectiveValue / totalTheoryValue * 1000) / 10 : 0,
        },
      };
    }),
});
