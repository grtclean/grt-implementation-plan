/**
 * Supplier Governance Router — 供应商治理体系
 *
 * CEO 倪亚东批复的供应商管理流程:
 * 1. 审核计划 (沈迎凤制定) — audit plans
 * 2. 新供应商准入 (采购申请→质量审核→商务→特批→签字) — qualification
 * 3. 季度抽检 (金晓锋/戴晓燕各5单) — spot checks
 * 4. 评标委员会 (戴晓燕/金晓锋/王秀萍) — committee reviews
 * 5. 淘汰与月报 (沈迎凤) — elimination + reports
 * 6. 双源供应商强制检查 — no single-source allowed
 */
import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql, SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import { invokeLLM } from "../_core/llm";

const log = createChildLogger("supplier-governance");

// ── Ensure tables ────────────────────────────────────────────
let tablesReady = false;
async function ensureTables() {
  if (tablesReady) return;
  try {
    const db = await requireDb();
    // Enums
    for (const [name, vals] of [
      ["supplier_audit_status", "planned,in_progress,completed,cancelled"],
      ["supplier_qual_app_status", "draft,submitted,quality_review,quality_passed,quality_rejected,commercial_review,special_approval,pending_sign_off,approved,rejected"],
      ["spot_check_result", "conforming,minor_issue,major_issue,critical"],
      ["elimination_status", "proposed,under_review,approved,executed,cancelled"],
    ] as const) {
      await db.execute(sql.raw(`DO $$ BEGIN CREATE TYPE ${name} AS ENUM (${(vals as string).split(",").map(v => `'${v}'`).join(",")}); EXCEPTION WHEN duplicate_object THEN NULL; END $$`));
    }
    // Tables
    await db.execute(sql`CREATE TABLE IF NOT EXISTS supplier_audit_plans (
      id SERIAL PRIMARY KEY, plan_code VARCHAR(30) NOT NULL, title VARCHAR(200) NOT NULL,
      description TEXT, year INTEGER NOT NULL, quarter INTEGER, month INTEGER,
      plan_type VARCHAR(30) NOT NULL, supplier_ids JSONB, audit_team JSONB,
      planned_start_date VARCHAR(10), planned_end_date VARCHAR(10),
      status supplier_audit_status NOT NULL DEFAULT 'planned',
      created_by VARCHAR(50), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS supplier_audits (
      id SERIAL PRIMARY KEY, audit_code VARCHAR(30) NOT NULL, plan_id INTEGER,
      supplier_id INTEGER NOT NULL, supplier_name VARCHAR(200) NOT NULL,
      audit_type VARCHAR(30) NOT NULL, audit_date VARCHAR(10),
      has_iso_9001 BOOLEAN DEFAULT false, has_iso_14001 BOOLEAN DEFAULT false, has_iatf_16949 BOOLEAN DEFAULT false,
      iso_status VARCHAR(30), iso_cert_expiry VARCHAR(10),
      material_process_score INTEGER, quality_system_score INTEGER, delivery_capability_score INTEGER,
      price_competitiveness_score INTEGER, overall_score INTEGER, overall_grade VARCHAR(5),
      findings JSONB, recommendation VARCHAR(30), corrective_actions JSONB,
      lead_auditor VARCHAR(50), audit_team JSONB, financial_participant VARCHAR(50),
      status supplier_audit_status NOT NULL DEFAULT 'planned', report_url VARCHAR(500),
      created_by VARCHAR(50), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS supplier_qualification_apps (
      id SERIAL PRIMARY KEY, app_code VARCHAR(30) NOT NULL,
      supplier_name VARCHAR(200) NOT NULL, supplier_contact VARCHAR(100), supplier_phone VARCHAR(50),
      supplier_email VARCHAR(200), supplier_address TEXT, business_license VARCHAR(100),
      has_iso_9001 BOOLEAN DEFAULT false, has_iso_14001 BOOLEAN DEFAULT false, has_iatf_16949 BOOLEAN DEFAULT false,
      other_certifications JSONB, supply_category VARCHAR(100), supply_materials JSONB,
      estimated_annual_volume VARCHAR(100),
      status supplier_qual_app_status NOT NULL DEFAULT 'draft',
      applicant VARCHAR(50), applicant_dept VARCHAR(50), applied_at TIMESTAMP,
      quality_reviewer VARCHAR(50), quality_review_result VARCHAR(30), quality_review_notes TEXT, quality_reviewed_at TIMESTAMP,
      commercial_reviewer VARCHAR(50), commercial_notes TEXT, commercial_reviewed_at TIMESTAMP,
      requires_special_approval BOOLEAN DEFAULT false, special_approver VARCHAR(50),
      special_approval_notes TEXT, special_approved_at TIMESTAMP,
      sign_off_approver VARCHAR(50), sign_off_notes TEXT, sign_off_at TIMESTAMP,
      resulting_supplier_id INTEGER,
      created_by VARCHAR(50), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS supplier_committee_reviews (
      id SERIAL PRIMARY KEY, review_code VARCHAR(30) NOT NULL, review_type VARCHAR(30) NOT NULL,
      title VARCHAR(200) NOT NULL, description TEXT,
      supplier_id INTEGER, supplier_name VARCHAR(200), project_no VARCHAR(50),
      committee_members JSONB, final_decision VARCHAR(30), final_score NUMERIC(5,2),
      decision_notes TEXT, meeting_date VARCHAR(10),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_by VARCHAR(50), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS supplier_spot_checks (
      id SERIAL PRIMARY KEY, check_code VARCHAR(30) NOT NULL, year INTEGER NOT NULL, quarter INTEGER NOT NULL,
      purchase_order_id INTEGER, po_number VARCHAR(50),
      supplier_id INTEGER NOT NULL, supplier_name VARCHAR(200) NOT NULL, material_name VARCHAR(200),
      inspector VARCHAR(50) NOT NULL, inspection_date VARCHAR(10),
      document_check spot_check_result, quality_check spot_check_result,
      delivery_check spot_check_result, price_check spot_check_result, process_check spot_check_result,
      overall_result spot_check_result,
      findings TEXT, corrective_actions TEXT, report_url VARCHAR(500),
      financial_participant VARCHAR(50), financial_notes TEXT,
      created_by VARCHAR(50), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS supplier_elimination_records (
      id SERIAL PRIMARY KEY, elimination_code VARCHAR(30) NOT NULL,
      supplier_id INTEGER NOT NULL, supplier_name VARCHAR(200) NOT NULL,
      reason VARCHAR(50) NOT NULL, reason_detail TEXT,
      last_audit_score INTEGER, defect_rate NUMERIC(5,2), risk_score INTEGER,
      replacement_supplier_id INTEGER, replacement_supplier_name VARCHAR(200),
      status elimination_status NOT NULL DEFAULT 'proposed',
      proposed_by VARCHAR(50), proposed_at TIMESTAMP,
      reviewed_by VARCHAR(50), reviewed_at TIMESTAMP,
      approved_by VARCHAR(50), approved_at TIMESTAMP,
      executed_at TIMESTAMP,
      monthly_report_month VARCHAR(7),
      created_by VARCHAR(50), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )`);
    // 7. 采购比价单 + 审批流
    await db.execute(sql`DO $$ BEGIN CREATE TYPE procurement_approval_status AS ENUM ('draft','price_comparison','manager_review','negotiation','ceo_approval','approved','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS procurement_price_comparisons (
      id SERIAL PRIMARY KEY,
      comparison_code VARCHAR(30) NOT NULL,
      project_no VARCHAR(50), project_name VARCHAR(200),
      material_name VARCHAR(200) NOT NULL, material_model VARCHAR(200),
      quantity INTEGER NOT NULL, unit VARCHAR(20) DEFAULT '套',
      quotations JSONB NOT NULL DEFAULT '[]',
      history_base_year INTEGER, history_base_price NUMERIC(12,2),
      history_reduction_pct NUMERIC(5,2), history_notes TEXT,
      recommended_supplier VARCHAR(200), recommended_unit_price NUMERIC(12,2),
      recommended_total_price NUMERIC(12,2), recommendation_reason TEXT,
      payment_terms TEXT,
      status procurement_approval_status NOT NULL DEFAULT 'draft',
      applicant VARCHAR(50), applicant_date VARCHAR(10),
      procurement_manager VARCHAR(50), procurement_manager_opinion TEXT, procurement_manager_date VARCHAR(10),
      negotiator VARCHAR(50), negotiated_price NUMERIC(12,2), negotiation_notes TEXT, negotiation_date VARCHAR(10),
      ceo_approver VARCHAR(50), ceo_opinion TEXT, ceo_approved_date VARCHAR(10),
      purchase_order_id INTEGER,
      created_by VARCHAR(50), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )`);
    // 7b. 供应商准入补充字段 (临时代码/正式代号/供货范围/有效期/补资料)
    const qualAlters = [
      `ALTER TABLE supplier_qualification_apps ADD COLUMN IF NOT EXISTS temp_code VARCHAR(30)`,
      `ALTER TABLE supplier_qualification_apps ADD COLUMN IF NOT EXISTS formal_code VARCHAR(30)`,
      `ALTER TABLE supplier_qualification_apps ADD COLUMN IF NOT EXISTS approved_supply_scope TEXT`,
      `ALTER TABLE supplier_qualification_apps ADD COLUMN IF NOT EXISTS valid_from VARCHAR(10)`,
      `ALTER TABLE supplier_qualification_apps ADD COLUMN IF NOT EXISTS valid_until VARCHAR(10)`,
      `ALTER TABLE supplier_qualification_apps ADD COLUMN IF NOT EXISTS is_conditional BOOLEAN DEFAULT false`,
      `ALTER TABLE supplier_qualification_apps ADD COLUMN IF NOT EXISTS conditional_items JSONB`,
      `ALTER TABLE supplier_qualification_apps ADD COLUMN IF NOT EXISTS conditional_deadline VARCHAR(10)`,
      `ALTER TABLE supplier_qualification_apps ADD COLUMN IF NOT EXISTS conditional_completed_items JSONB`,
      `ALTER TABLE supplier_qualification_apps ADD COLUMN IF NOT EXISTS next_review_date VARCHAR(10)`,
      `ALTER TABLE supplier_qualification_apps ADD COLUMN IF NOT EXISTS review_cycle_months INTEGER DEFAULT 12`,
    ];
    for (const ddl of qualAlters) {
      await db.execute(sql.raw(ddl));
    }
    // 8. 供应商门户令牌
    await db.execute(sql`CREATE TABLE IF NOT EXISTS supplier_portal_tokens (
      id SERIAL PRIMARY KEY,
      token VARCHAR(128) NOT NULL UNIQUE,
      supplier_id INTEGER, supplier_name VARCHAR(200) NOT NULL,
      supplier_contact VARCHAR(100), supplier_email VARCHAR(200),
      purpose VARCHAR(50) NOT NULL DEFAULT 'document_upload',
      expires_at TIMESTAMP NOT NULL,
      max_uses INTEGER DEFAULT 100,
      use_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_by VARCHAR(50), created_at TIMESTAMP DEFAULT NOW()
    )`);
    // 9. 供应商文档 (上传确认后不可撤销)
    await db.execute(sql`DO $$ BEGIN CREATE TYPE supplier_doc_status AS ENUM ('uploading','pending_confirm','confirmed','revoke_requested','revoke_approved','revoked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS supplier_documents (
      id SERIAL PRIMARY KEY,
      doc_code VARCHAR(30) NOT NULL,
      supplier_id INTEGER, supplier_name VARCHAR(200) NOT NULL,
      portal_token_id INTEGER,
      doc_type VARCHAR(50) NOT NULL,
      doc_category VARCHAR(50) NOT NULL,
      file_name VARCHAR(300) NOT NULL,
      file_size INTEGER,
      file_path VARCHAR(500),
      mime_type VARCHAR(100),
      status supplier_doc_status NOT NULL DEFAULT 'uploading',
      confirmed_at TIMESTAMP,
      confirmed_by VARCHAR(100),
      is_immutable BOOLEAN DEFAULT false,
      revoke_reason TEXT,
      revoke_requested_at TIMESTAMP,
      revoke_requested_by VARCHAR(100),
      revoke_approved_by VARCHAR(50),
      revoke_approved_at TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )`);
    // 10. 竞价项目 (多轮竞价引擎)
    await db.execute(sql`DO $$ BEGIN CREATE TYPE bidding_status AS ENUM ('draft','open','round_closed','evaluating','awarded','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS supplier_bidding_projects (
      id SERIAL PRIMARY KEY,
      bidding_code VARCHAR(30) NOT NULL,
      title VARCHAR(200) NOT NULL,
      project_no VARCHAR(50),
      material_name VARCHAR(200) NOT NULL,
      material_model VARCHAR(200),
      quantity INTEGER NOT NULL,
      unit VARCHAR(20) DEFAULT '套',
      specifications TEXT,
      budget_ceiling NUMERIC(12,2),
      -- 竞价规则
      bidding_type VARCHAR(20) NOT NULL DEFAULT 'sealed',
      max_rounds INTEGER DEFAULT 3,
      current_round INTEGER DEFAULT 1,
      round_deadline TIMESTAMP,
      allow_see_ranking BOOLEAN DEFAULT false,
      min_bidders INTEGER DEFAULT 3,
      -- 参与供应商
      invited_suppliers JSONB DEFAULT '[]',
      -- 评分权重 (%)
      weight_price INTEGER DEFAULT 40,
      weight_quality INTEGER DEFAULT 25,
      weight_delivery INTEGER DEFAULT 20,
      weight_service INTEGER DEFAULT 15,
      -- 结果
      status bidding_status NOT NULL DEFAULT 'draft',
      winner_supplier_name VARCHAR(200),
      winner_bid_price NUMERIC(12,2),
      award_reason TEXT,
      -- 流程
      created_by VARCHAR(50),
      opened_by VARCHAR(50),
      opened_at TIMESTAMP,
      awarded_by VARCHAR(50),
      awarded_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);
    // 11. 竞价报价记录
    await db.execute(sql`CREATE TABLE IF NOT EXISTS supplier_bids (
      id SERIAL PRIMARY KEY,
      bidding_project_id INTEGER NOT NULL,
      round INTEGER NOT NULL DEFAULT 1,
      supplier_name VARCHAR(200) NOT NULL,
      supplier_id INTEGER,
      supplier_contact VARCHAR(100),
      -- 报价
      unit_price NUMERIC(12,2) NOT NULL,
      total_price NUMERIC(12,2),
      lead_time_days INTEGER,
      payment_terms TEXT,
      warranty_months INTEGER,
      technical_notes TEXT,
      -- 评分
      price_score NUMERIC(5,2),
      quality_score NUMERIC(5,2),
      delivery_score NUMERIC(5,2),
      service_score NUMERIC(5,2),
      total_score NUMERIC(5,2),
      ranking INTEGER,
      -- 时间
      submitted_at TIMESTAMP DEFAULT NOW(),
      is_valid BOOLEAN DEFAULT true
    )`);
    tablesReady = true;
    log.info("[SupplierGovernance] Tables ensured");
  } catch (err) {
    tablesReady = true;
    log.warn({ err }, "[SupplierGovernance] ensureTables partial");
  }
}

// ── Router ───────────────────────────────────────────────────
export const supplierGovernanceRouter = router({

  // ═══════ Dashboard ═══════
  dashboard: protectedProcedure.query(async () => {
    await ensureTables();
    const db = await requireDb();
    const [plans] = (await db.execute(sql`SELECT COUNT(*) as c FROM supplier_audit_plans`)).rows as any[];
    const [apps] = (await db.execute(sql`SELECT COUNT(*) as c FROM supplier_qualification_apps WHERE status NOT IN ('approved','rejected')`)).rows as any[];
    const [checks] = (await db.execute(sql`SELECT COUNT(*) as c FROM supplier_spot_checks WHERE year = 2026`)).rows as any[];
    const [elims] = (await db.execute(sql`SELECT COUNT(*) as c FROM supplier_elimination_records WHERE status IN ('proposed','under_review')`)).rows as any[];
    // Dual-source check: find materials with only 1 active supplier
    const singleSource = await db.execute(sql`
      SELECT supply_category, COUNT(*) as cnt
      FROM (SELECT DISTINCT ON (s.id) s.id, COALESCE(
        (SELECT supply_category FROM supplier_qualification_apps WHERE resulting_supplier_id = s.id LIMIT 1),
        'unknown'
      ) as supply_category
      FROM suppliers s WHERE s.status = 'active') t
      GROUP BY supply_category HAVING COUNT(*) < 2
    `);
    return {
      totalPlans: Number(plans?.c || 0),
      pendingApps: Number(apps?.c || 0),
      spotChecks2026: Number(checks?.c || 0),
      pendingEliminations: Number(elims?.c || 0),
      singleSourceCategories: singleSource.rows,
    };
  }),

  // ═══════ Audit Plans (沈迎凤) ═══════
  createAuditPlan: protectedProcedure
    .input(z.object({
      title: z.string().min(1), description: z.string().optional(),
      year: z.number(), quarter: z.number().optional(), month: z.number().optional(),
      planType: z.enum(["regular", "new_supplier", "elimination", "spot_check"]),
      supplierIds: z.array(z.number()).optional(),
      auditTeam: z.array(z.string()).optional(),
      plannedStartDate: z.string().optional(), plannedEndDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const code = `SAP-${input.year}-Q${input.quarter || 0}-${String(Date.now()).slice(-4)}`;
      const result = await db.execute(sql`
        INSERT INTO supplier_audit_plans (plan_code,title,description,year,quarter,month,plan_type,supplier_ids,audit_team,planned_start_date,planned_end_date,created_by)
        VALUES (${code},${input.title},${input.description||null},${input.year},${input.quarter||null},${input.month||null},${input.planType},${JSON.stringify(input.supplierIds||[])}::jsonb,${JSON.stringify(input.auditTeam||[])}::jsonb,${input.plannedStartDate||null},${input.plannedEndDate||null},${ctx.user?.name||'system'})
        RETURNING id
      `);
      return { success: true, id: (result.rows[0] as any).id, planCode: code };
    }),

  listAuditPlans: protectedProcedure
    .input(z.object({ year: z.number().optional(), status: z.string().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conds: SQL[] = [];
      if (input?.year) conds.push(sql`year = ${input.year}`);
      if (input?.status) conds.push(sql`status = ${input.status}`);
      const where = conds.length ? sql`WHERE ${sql.join(conds, sql` AND `)}` : sql``;
      const result = await db.execute(sql`SELECT * FROM supplier_audit_plans ${where} ORDER BY created_at DESC LIMIT ${input?.limit||50}`);
      return result.rows;
    }),

  // ═══════ Audits ═══════
  createAudit: protectedProcedure
    .input(z.object({
      planId: z.number().optional(), supplierId: z.number(), supplierName: z.string(),
      auditType: z.enum(["initial","periodic","special","spot_check"]),
      auditDate: z.string().optional(),
      hasIso9001: z.boolean().optional(), hasIso14001: z.boolean().optional(), hasIatf16949: z.boolean().optional(),
      isoStatus: z.string().optional(),
      materialProcessScore: z.number().optional(), qualitySystemScore: z.number().optional(),
      deliveryCapabilityScore: z.number().optional(), priceCompetitivenessScore: z.number().optional(),
      leadAuditor: z.string().optional(), financialParticipant: z.string().optional(),
      recommendation: z.enum(["approve","conditional","reject","eliminate"]).optional(),
      findings: z.array(z.object({ category: z.string(), description: z.string(), severity: z.string() })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const scores = [input.materialProcessScore, input.qualitySystemScore, input.deliveryCapabilityScore, input.priceCompetitivenessScore].filter(s => s != null) as number[];
      const overall = scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : null;
      const grade = overall == null ? null : overall >= 90 ? "A" : overall >= 75 ? "B" : overall >= 60 ? "C" : overall >= 40 ? "D" : "F";
      const code = `SA-2026-${String(Date.now()).slice(-6)}`;
      const result = await db.execute(sql`
        INSERT INTO supplier_audits (audit_code,plan_id,supplier_id,supplier_name,audit_type,audit_date,has_iso_9001,has_iso_14001,has_iatf_16949,iso_status,material_process_score,quality_system_score,delivery_capability_score,price_competitiveness_score,overall_score,overall_grade,lead_auditor,financial_participant,recommendation,findings,status,created_by)
        VALUES (${code},${input.planId||null},${input.supplierId},${input.supplierName},${input.auditType},${input.auditDate||null},${input.hasIso9001||false},${input.hasIso14001||false},${input.hasIatf16949||false},${input.isoStatus||null},${input.materialProcessScore||null},${input.qualitySystemScore||null},${input.deliveryCapabilityScore||null},${input.priceCompetitivenessScore||null},${overall},${grade},${input.leadAuditor||null},${input.financialParticipant||null},${input.recommendation||null},${JSON.stringify(input.findings||[])}::jsonb,'completed',${ctx.user?.name||'system'})
        RETURNING id
      `);
      log.info({ supplierId: input.supplierId, grade }, "[SupplierGovernance] Audit completed");
      return { success: true, id: (result.rows[0] as any).id, overallScore: overall, grade };
    }),

  listAudits: protectedProcedure
    .input(z.object({ supplierId: z.number().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const where = input?.supplierId ? sql`WHERE supplier_id = ${input.supplierId}` : sql``;
      return (await db.execute(sql`SELECT * FROM supplier_audits ${where} ORDER BY created_at DESC LIMIT ${input?.limit||50}`)).rows;
    }),

  // ═══════ New Supplier Qualification ═══════
  submitQualification: protectedProcedure
    .input(z.object({
      supplierName: z.string().min(1), supplierContact: z.string().optional(),
      supplierPhone: z.string().optional(), supplierEmail: z.string().optional(),
      supplierAddress: z.string().optional(), businessLicense: z.string().optional(),
      hasIso9001: z.boolean(), hasIso14001: z.boolean().optional(), hasIatf16949: z.boolean().optional(),
      otherCertifications: z.array(z.string()).optional(),
      supplyCategory: z.string(), supplyMaterials: z.array(z.string()).optional(),
      estimatedAnnualVolume: z.string().optional(),
      requiresSpecialApproval: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const code = `SQA-2026-${String(Date.now()).slice(-6)}`;
      // CEO 原则: 没有ISO体系的原则上不用
      const isoWarning = !input.hasIso9001 ? "⚠️ 该供应商无ISO 9001认证，原则上不予准入（需特批）" : null;
      const result = await db.execute(sql`
        INSERT INTO supplier_qualification_apps (app_code,supplier_name,supplier_contact,supplier_phone,supplier_email,supplier_address,business_license,has_iso_9001,has_iso_14001,has_iatf_16949,other_certifications,supply_category,supply_materials,estimated_annual_volume,status,applicant,applicant_dept,applied_at,requires_special_approval,created_by)
        VALUES (${code},${input.supplierName},${input.supplierContact||null},${input.supplierPhone||null},${input.supplierEmail||null},${input.supplierAddress||null},${input.businessLicense||null},${input.hasIso9001},${input.hasIso14001||false},${input.hasIatf16949||false},${JSON.stringify(input.otherCertifications||[])}::jsonb,${input.supplyCategory},${JSON.stringify(input.supplyMaterials||[])}::jsonb,${input.estimatedAnnualVolume||null},'submitted',${ctx.user?.name||'system'},${null},${'NOW()'},${!input.hasIso9001 || input.requiresSpecialApproval || false},${ctx.user?.name||'system'})
        RETURNING id
      `);
      return { success: true, id: (result.rows[0] as any).id, appCode: code, isoWarning };
    }),

  advanceQualification: protectedProcedure
    .input(z.object({
      appId: z.number(),
      action: z.enum(["quality_pass","quality_reject","commercial_done","special_approve","sign_off","reject"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const user = ctx.user?.name || "system";
      const now = new Date().toISOString();
      const statusMap: Record<string, string> = {
        quality_pass: "quality_passed", quality_reject: "quality_rejected",
        commercial_done: "pending_sign_off", special_approve: "pending_sign_off",
        sign_off: "approved", reject: "rejected",
      };
      let finalStatus = statusMap[input.action];
      const notes = input.notes ?? null;

      if (input.action === "quality_pass" || input.action === "quality_reject") {
        if (input.action === "quality_pass") finalStatus = "commercial_review";
        await db.execute(sql`UPDATE supplier_qualification_apps SET
          status = ${finalStatus}, updated_at = NOW(),
          quality_reviewer = ${user}, quality_review_result = ${input.action === "quality_pass" ? "pass" : "fail"},
          quality_reviewed_at = ${now}, quality_review_notes = COALESCE(${notes}, quality_review_notes)
          WHERE id = ${input.appId}`);
      } else if (input.action === "commercial_done") {
        await db.execute(sql`UPDATE supplier_qualification_apps SET
          status = ${finalStatus}, updated_at = NOW(),
          commercial_reviewer = ${user}, commercial_reviewed_at = ${now},
          commercial_notes = COALESCE(${notes}, commercial_notes)
          WHERE id = ${input.appId}`);
      } else if (input.action === "special_approve") {
        await db.execute(sql`UPDATE supplier_qualification_apps SET
          status = ${finalStatus}, updated_at = NOW(),
          special_approver = ${user}, special_approved_at = ${now},
          special_approval_notes = COALESCE(${notes}, special_approval_notes)
          WHERE id = ${input.appId}`);
      } else if (input.action === "sign_off") {
        await db.execute(sql`UPDATE supplier_qualification_apps SET
          status = ${finalStatus}, updated_at = NOW(),
          sign_off_approver = ${user}, sign_off_at = ${now},
          sign_off_notes = COALESCE(${notes}, sign_off_notes)
          WHERE id = ${input.appId}`);
      } else {
        await db.execute(sql`UPDATE supplier_qualification_apps SET
          status = ${finalStatus}, updated_at = NOW()
          WHERE id = ${input.appId}`);
      }
      log.info({ appId: input.appId, action: input.action, user }, "[SupplierGovernance] Qualification advanced");
      return { success: true, newStatus: finalStatus };
    }),

  listQualifications: protectedProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const where = input?.status ? sql`WHERE status = ${input.status}` : sql``;
      return (await db.execute(sql`SELECT * FROM supplier_qualification_apps ${where} ORDER BY created_at DESC LIMIT ${input?.limit||50}`)).rows;
    }),

  /** 批准准入后: 分配正式代号 + 供货范围 + 有效期 */
  finalizeQualification: protectedProcedure
    .input(z.object({
      appId: z.number(),
      formalCode: z.string().min(1),         // 正式供应商代号 e.g. SUP-2026-001
      approvedSupplyScope: z.string().min(1), // 批准供货范围
      validFrom: z.string(),                  // 有效期开始 2026-03-24
      validUntil: z.string(),                 // 有效期结束 2027-03-24
      isConditional: z.boolean().default(false),
      conditionalItems: z.array(z.object({
        item: z.string(),
        deadline: z.string(),
        completed: z.boolean().default(false),
      })).optional(),
      conditionalDeadline: z.string().optional(),
      reviewCycleMonths: z.number().min(3).max(24).default(12),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const user = ctx.user?.name || "system";
      // Generate temp code if not yet assigned
      const tempCode = `TMP-${String(Date.now()).slice(-6)}`;
      const nextReview = new Date(new Date(input.validFrom).getTime() + input.reviewCycleMonths * 30 * 86400000).toISOString().slice(0, 10);
      await db.execute(sql.raw(`
        UPDATE supplier_qualification_apps SET
          temp_code = '${tempCode}',
          formal_code = '${input.formalCode.replace(/'/g, "''")}',
          approved_supply_scope = '${input.approvedSupplyScope.replace(/'/g, "''")}',
          valid_from = '${input.validFrom}',
          valid_until = '${input.validUntil}',
          is_conditional = ${input.isConditional},
          conditional_items = '${JSON.stringify(input.conditionalItems || [])}'::jsonb,
          conditional_deadline = ${input.conditionalDeadline ? `'${input.conditionalDeadline}'` : "NULL"},
          next_review_date = '${nextReview}',
          review_cycle_months = ${input.reviewCycleMonths},
          updated_at = NOW()
        WHERE id = ${input.appId}
      `));
      log.info({ appId: input.appId, formalCode: input.formalCode, user }, "[SupplierGovernance] Qualification finalized");
      return { success: true, tempCode, formalCode: input.formalCode, nextReviewDate: nextReview };
    }),

  /** 有条件准入: 标记补交资料完成 */
  completeConditionalItem: protectedProcedure
    .input(z.object({ appId: z.number(), itemIndex: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      // Read current items
      const result = await db.execute(sql`SELECT conditional_items FROM supplier_qualification_apps WHERE id = ${input.appId} LIMIT 1`);
      const row = result.rows[0] as any;
      if (!row) throw new Error("申请不存在");
      const items = (row.conditional_items || []) as Array<{item: string; deadline: string; completed: boolean}>;
      if (input.itemIndex >= items.length) throw new Error("项目索引无效");
      items[input.itemIndex].completed = true;
      await db.execute(sql.raw(`
        UPDATE supplier_qualification_apps SET
          conditional_completed_items = '${JSON.stringify(items)}'::jsonb,
          conditional_items = '${JSON.stringify(items)}'::jsonb,
          updated_at = NOW()
        WHERE id = ${input.appId}
      `));
      // Check if all completed → auto upgrade to full qualification
      const allDone = items.every(i => i.completed);
      if (allDone) {
        await db.execute(sql.raw(`UPDATE supplier_qualification_apps SET is_conditional = false, updated_at = NOW() WHERE id = ${input.appId}`));
      }
      return { success: true, allCompleted: allDone };
    }),

  /** 列出即将到期/需审查的供应商 */
  listExpiringSuppliers: protectedProcedure
    .query(async () => {
      await ensureTables();
      const db = await requireDb();
      const today = new Date().toISOString().slice(0, 10);
      const in30days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const in60days = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
      // Expiring within 60 days
      const expiring = await db.execute(sql`
        SELECT id, app_code, formal_code, supplier_name, approved_supply_scope, valid_until, next_review_date, is_conditional
        FROM supplier_qualification_apps
        WHERE status = 'approved' AND (valid_until <= ${in60days} OR next_review_date <= ${in60days})
        ORDER BY LEAST(COALESCE(valid_until, '9999-12-31'), COALESCE(next_review_date, '9999-12-31')) ASC
      `);
      // Conditional with pending items
      const conditional = await db.execute(sql`
        SELECT id, app_code, formal_code, supplier_name, conditional_items, conditional_deadline, is_conditional
        FROM supplier_qualification_apps
        WHERE status = 'approved' AND is_conditional = true
        ORDER BY conditional_deadline ASC NULLS LAST
      `);
      return { expiring: expiring.rows, conditional: conditional.rows, today };
    }),

  // ═══════ Quarterly Spot Checks (金晓锋/戴晓燕 各5单) ═══════
  createSpotCheck: protectedProcedure
    .input(z.object({
      year: z.number(), quarter: z.number(),
      poNumber: z.string().optional(), supplierId: z.number(), supplierName: z.string(),
      materialName: z.string().optional(), inspector: z.string(),
      inspectionDate: z.string().optional(),
      documentCheck: z.enum(["conforming","minor_issue","major_issue","critical"]).optional(),
      qualityCheck: z.enum(["conforming","minor_issue","major_issue","critical"]).optional(),
      deliveryCheck: z.enum(["conforming","minor_issue","major_issue","critical"]).optional(),
      priceCheck: z.enum(["conforming","minor_issue","major_issue","critical"]).optional(),
      processCheck: z.enum(["conforming","minor_issue","major_issue","critical"]).optional(),
      findings: z.string().optional(), financialParticipant: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const code = `SSC-${input.year}-Q${input.quarter}-${String(Date.now()).slice(-4)}`;
      const checks = [input.documentCheck, input.qualityCheck, input.deliveryCheck, input.priceCheck, input.processCheck].filter(Boolean);
      const worst = checks.includes("critical") ? "critical" : checks.includes("major_issue") ? "major_issue" : checks.includes("minor_issue") ? "minor_issue" : "conforming";
      const result = await db.execute(sql`
        INSERT INTO supplier_spot_checks (check_code,year,quarter,po_number,supplier_id,supplier_name,material_name,inspector,inspection_date,document_check,quality_check,delivery_check,price_check,process_check,overall_result,findings,financial_participant,created_by)
        VALUES (${code},${input.year},${input.quarter},${input.poNumber||null},${input.supplierId},${input.supplierName},${input.materialName||null},${input.inspector},${input.inspectionDate||null},${input.documentCheck||null},${input.qualityCheck||null},${input.deliveryCheck||null},${input.priceCheck||null},${input.processCheck||null},${worst},${input.findings||null},${input.financialParticipant||null},${ctx.user?.name||'system'})
        RETURNING id
      `);
      return { success: true, id: (result.rows[0] as any).id, checkCode: code, overallResult: worst };
    }),

  listSpotChecks: protectedProcedure
    .input(z.object({ year: z.number().optional(), quarter: z.number().optional(), inspector: z.string().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conds: SQL[] = [];
      if (input?.year) conds.push(sql`year = ${input.year}`);
      if (input?.quarter) conds.push(sql`quarter = ${input.quarter}`);
      if (input?.inspector) conds.push(sql`inspector = ${input.inspector}`);
      const where = conds.length ? sql`WHERE ${sql.join(conds, sql` AND `)}` : sql``;
      return (await db.execute(sql`SELECT * FROM supplier_spot_checks ${where} ORDER BY created_at DESC LIMIT ${input?.limit||50}`)).rows;
    }),

  spotCheckProgress: protectedProcedure
    .input(z.object({ year: z.number(), quarter: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT inspector, COUNT(*) as completed
        FROM supplier_spot_checks
        WHERE year = ${input.year} AND quarter = ${input.quarter}
        GROUP BY inspector
      `);
      return {
        target: 5, // 每人每季度5单
        progress: result.rows as Array<{ inspector: string; completed: number }>,
      };
    }),

  // ═══════ Committee Reviews (评标委员会) ═══════
  createCommitteeReview: protectedProcedure
    .input(z.object({
      reviewType: z.enum(["bid_evaluation","quarterly_review","elimination_review"]),
      title: z.string(), description: z.string().optional(),
      supplierId: z.number().optional(), supplierName: z.string().optional(),
      projectNo: z.string().optional(), meetingDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const code = `SCR-2026-${String(Date.now()).slice(-6)}`;
      // 默认评标委员会成员: 戴晓燕(监督者), 金晓锋(监督者), 王秀萍(财务监督)
      const defaultMembers = [
        { name: "戴晓燕", role: "监督者", score: null, comments: "", votedAt: null },
        { name: "金晓锋", role: "监督者", score: null, comments: "", votedAt: null },
        { name: "王秀萍", role: "财务监督", score: null, comments: "", votedAt: null },
      ];
      const result = await db.execute(sql`
        INSERT INTO supplier_committee_reviews (review_code,review_type,title,description,supplier_id,supplier_name,project_no,committee_members,meeting_date,created_by)
        VALUES (${code},${input.reviewType},${input.title},${input.description||null},${input.supplierId||null},${input.supplierName||null},${input.projectNo||null},${JSON.stringify(defaultMembers)}::jsonb,${input.meetingDate||null},${ctx.user?.name||'system'})
        RETURNING id
      `);
      return { success: true, id: (result.rows[0] as any).id, reviewCode: code };
    }),

  submitCommitteeVote: protectedProcedure
    .input(z.object({ reviewId: z.number(), voterName: z.string(), score: z.number().min(0).max(100), comments: z.string().optional() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const now = new Date().toISOString();
      // Update the voter's entry in committee_members JSON array
      await db.execute(sql.raw(`
        UPDATE supplier_committee_reviews
        SET committee_members = (
          SELECT jsonb_agg(
            CASE WHEN elem->>'name' = '${input.voterName.replace(/'/g, "''")}'
            THEN jsonb_set(jsonb_set(jsonb_set(elem, '{score}', '${input.score}'), '{comments}', '"${(input.comments||'').replace(/"/g, '\\"')}"'), '{votedAt}', '"${now}"')
            ELSE elem END
          ) FROM jsonb_array_elements(committee_members) elem
        ), updated_at = NOW()
        WHERE id = ${input.reviewId}
      `));
      return { success: true };
    }),

  listCommitteeReviews: protectedProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const where = input?.status ? sql`WHERE status = ${input.status}` : sql``;
      return (await db.execute(sql`SELECT * FROM supplier_committee_reviews ${where} ORDER BY created_at DESC LIMIT ${input?.limit||50}`)).rows;
    }),

  // ═══════ Elimination (淘汰) ═══════
  proposeElimination: protectedProcedure
    .input(z.object({
      supplierId: z.number(), supplierName: z.string(),
      reason: z.enum(["no_iso","quality_failure","delivery_failure","price","single_source_replacement"]),
      reasonDetail: z.string().optional(),
      lastAuditScore: z.number().optional(), defectRate: z.string().optional(), riskScore: z.number().optional(),
      replacementSupplierId: z.number().optional(), replacementSupplierName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const code = `SER-2026-${String(Date.now()).slice(-6)}`;
      const month = new Date().toISOString().slice(0, 7);
      const result = await db.execute(sql`
        INSERT INTO supplier_elimination_records (elimination_code,supplier_id,supplier_name,reason,reason_detail,last_audit_score,defect_rate,risk_score,replacement_supplier_id,replacement_supplier_name,proposed_by,proposed_at,monthly_report_month,created_by)
        VALUES (${code},${input.supplierId},${input.supplierName},${input.reason},${input.reasonDetail||null},${input.lastAuditScore||null},${input.defectRate||null},${input.riskScore||null},${input.replacementSupplierId||null},${input.replacementSupplierName||null},${ctx.user?.name||'system'},NOW(),${month},${ctx.user?.name||'system'})
        RETURNING id
      `);
      return { success: true, id: (result.rows[0] as any).id, eliminationCode: code };
    }),

  advanceElimination: protectedProcedure
    .input(z.object({ id: z.number(), action: z.enum(["review","approve","execute","cancel"]), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const user = ctx.user?.name || "system";
      const statusMap: Record<string, string> = { review: "under_review", approve: "approved", execute: "executed", cancel: "cancelled" };
      const newStatus = statusMap[input.action];
      const dateField = input.action === "review" ? "reviewed_at" : input.action === "approve" ? "approved_at" : input.action === "execute" ? "executed_at" : null;
      const byField = input.action === "review" ? "reviewed_by" : input.action === "approve" ? "approved_by" : null;
      const parts = [`status = '${newStatus}'`, `updated_at = NOW()`];
      if (dateField) parts.push(`${dateField} = NOW()`);
      if (byField) parts.push(`${byField} = '${user}'`);
      await db.execute(sql.raw(`UPDATE supplier_elimination_records SET ${parts.join(", ")} WHERE id = ${input.id}`));
      return { success: true, newStatus };
    }),

  listEliminations: protectedProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const where = input?.status ? sql`WHERE status = ${input.status}` : sql``;
      return (await db.execute(sql`SELECT * FROM supplier_elimination_records ${where} ORDER BY created_at DESC LIMIT ${input?.limit||50}`)).rows;
    }),

  // ═══════ Monthly Report (沈经理) ═══════
  monthlyReport: protectedProcedure
    .input(z.object({ month: z.string() })) // "2026-03"
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const ym = input.month;
      const audits = await db.execute(sql`SELECT COUNT(*) as c, AVG(overall_score) as avg_score FROM supplier_audits WHERE audit_date LIKE ${ym + '%'}`);
      const newApps = await db.execute(sql`SELECT COUNT(*) as c FROM supplier_qualification_apps WHERE created_at >= ${ym + '-01'} AND created_at < ${ym + '-32'}`);
      const elims = await db.execute(sql`SELECT COUNT(*) as c FROM supplier_elimination_records WHERE monthly_report_month = ${ym}`);
      const checks = await db.execute(sql`SELECT inspector, COUNT(*) as c FROM supplier_spot_checks WHERE inspection_date LIKE ${ym + '%'} GROUP BY inspector`);
      return {
        month: ym,
        auditsCompleted: Number((audits.rows[0] as any)?.c || 0),
        averageAuditScore: Math.round(Number((audits.rows[0] as any)?.avg_score || 0)),
        newApplications: Number((newApps.rows[0] as any)?.c || 0),
        eliminations: Number((elims.rows[0] as any)?.c || 0),
        spotChecks: checks.rows,
        reportBy: "沈迎凤",
      };
    }),

  // ═══════ 采购比价单 + 审批流 ═══════

  /** 提交比价单 (采购工程师) */
  submitPriceComparison: protectedProcedure
    .input(z.object({
      projectNo: z.string().optional(),
      projectName: z.string().optional(),
      materialName: z.string().min(1),
      materialModel: z.string().optional(),
      quantity: z.number().min(1),
      unit: z.string().default("套"),
      quotations: z.array(z.object({
        supplierName: z.string(),
        unitPrice: z.number(),
        totalPrice: z.number(),
        isLongTermPartner: z.boolean().optional(),
        notes: z.string().optional(),
      })),
      historyBaseYear: z.number().optional(),
      historyBasePrice: z.number().optional(),
      historyReductionPct: z.number().optional(),
      historyNotes: z.string().optional(),
      recommendedSupplier: z.string(),
      recommendedUnitPrice: z.number(),
      recommendationReason: z.string().optional(),
      paymentTerms: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const code = `PPC-${input.projectNo || "GEN"}-${String(Date.now()).slice(-6)}`;
      const user = ctx.user?.name || "system";
      const today = new Date().toISOString().slice(0, 10);
      const result = await db.execute(sql`
        INSERT INTO procurement_price_comparisons
          (comparison_code, project_no, project_name, material_name, material_model,
           quantity, unit, quotations,
           history_base_year, history_base_price, history_reduction_pct, history_notes,
           recommended_supplier, recommended_unit_price, recommended_total_price, recommendation_reason,
           payment_terms, status, applicant, applicant_date, created_by)
        VALUES
          (${code}, ${input.projectNo || null}, ${input.projectName || null},
           ${input.materialName}, ${input.materialModel || null},
           ${input.quantity}, ${input.unit},
           ${JSON.stringify(input.quotations)}::jsonb,
           ${input.historyBaseYear || null}, ${input.historyBasePrice || null},
           ${input.historyReductionPct || null}, ${input.historyNotes || null},
           ${input.recommendedSupplier}, ${input.recommendedUnitPrice},
           ${input.recommendedUnitPrice * input.quantity},
           ${input.recommendationReason || null},
           ${input.paymentTerms || null},
           'price_comparison', ${user}, ${today}, ${user})
        RETURNING id
      `);
      log.info({ code, project: input.projectNo }, "[SupplierGovernance] Price comparison submitted");
      return { success: true, id: (result.rows[0] as any).id, comparisonCode: code };
    }),

  /** 推进审批流 */
  advancePriceApproval: protectedProcedure
    .input(z.object({
      id: z.number(),
      action: z.enum(["manager_approve", "send_to_negotiate", "submit_negotiated_price", "ceo_approve", "ceo_reject"]),
      opinion: z.string().optional(),
      negotiatedPrice: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const user = ctx.user?.name || "system";
      const today = new Date().toISOString().slice(0, 10);
      const opinion = input.opinion ?? null;
      const priceId = Number(input.id);

      if (input.action === "manager_approve" || input.action === "send_to_negotiate") {
        const op = opinion || (input.action === "manager_approve" ? "同意" : "转谈判");
        await db.execute(sql`UPDATE procurement_price_comparisons SET status = 'negotiation', procurement_manager = ${user}, procurement_manager_opinion = ${op}, procurement_manager_date = ${today}, updated_at = NOW() WHERE id = ${priceId}`);
      } else if (input.action === "submit_negotiated_price") {
        await db.execute(sql`UPDATE procurement_price_comparisons SET status = 'ceo_approval', negotiator = ${user}, negotiated_price = ${input.negotiatedPrice || 0}, negotiation_notes = ${opinion || ""}, negotiation_date = ${today}, updated_at = NOW() WHERE id = ${priceId}`);
      } else if (input.action === "ceo_approve") {
        await db.execute(sql`UPDATE procurement_price_comparisons SET status = 'approved', ceo_approver = ${user}, ceo_opinion = ${opinion || "批准"}, ceo_approved_date = ${today}, updated_at = NOW() WHERE id = ${priceId}`);
      } else if (input.action === "ceo_reject") {
        await db.execute(sql`UPDATE procurement_price_comparisons SET status = 'rejected', ceo_approver = ${user}, ceo_opinion = ${opinion || "驳回"}, ceo_approved_date = ${today}, updated_at = NOW() WHERE id = ${priceId}`);
      }
      log.info({ id: input.id, action: input.action, user }, "[SupplierGovernance] Price approval advanced");
      return { success: true };
    }),

  /** 列出比价单 */
  listPriceComparisons: protectedProcedure
    .input(z.object({ status: z.string().optional(), projectNo: z.string().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conds: SQL[] = [];
      if (input?.status) conds.push(sql`status = ${input.status}`);
      if (input?.projectNo) conds.push(sql`project_no = ${input.projectNo}`);
      const where = conds.length ? sql`WHERE ${sql.join(conds, sql` AND `)}` : sql``;
      return (await db.execute(sql`SELECT * FROM procurement_price_comparisons ${where} ORDER BY created_at DESC LIMIT ${input?.limit || 50}`)).rows;
    }),

  /** 获取单条比价单详情 */
  getPriceComparison: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`SELECT * FROM procurement_price_comparisons WHERE id = ${input.id} LIMIT 1`);
      return result.rows[0] || null;
    }),

  // ═══════ 供应商门户令牌管理 (GRT内部) ═══════

  /** 生成供应商门户访问令牌 */
  generatePortalToken: protectedProcedure
    .input(z.object({
      supplierName: z.string().min(1),
      supplierId: z.number().optional(),
      supplierContact: z.string().optional(),
      supplierEmail: z.string().optional(),
      purpose: z.enum(["document_upload", "qualification", "audit_response"]).default("document_upload"),
      expiresInDays: z.number().min(1).max(90).default(30),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + input.expiresInDays * 86400000).toISOString();
      const result = await db.execute(sql`
        INSERT INTO supplier_portal_tokens (token, supplier_id, supplier_name, supplier_contact, supplier_email, purpose, expires_at, created_by)
        VALUES (${token}, ${input.supplierId || null}, ${input.supplierName}, ${input.supplierContact || null}, ${input.supplierEmail || null}, ${input.purpose}, ${expires}, ${ctx.user?.name || "system"})
        RETURNING id
      `);
      const portalUrl = `/supplier-portal/${token}`;
      log.info({ supplier: input.supplierName, tokenId: (result.rows[0] as any).id }, "[SupplierGovernance] Portal token generated");
      return { success: true, token, portalUrl, expiresAt: expires };
    }),

  /** 列出门户令牌 */
  listPortalTokens: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().default(true) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const where = input?.activeOnly ? sql`WHERE is_active = true AND expires_at > NOW()` : sql``;
      return (await db.execute(sql`SELECT id, supplier_name, supplier_email, purpose, expires_at, use_count, max_uses, is_active, created_by, created_at FROM supplier_portal_tokens ${where} ORDER BY created_at DESC LIMIT 100`)).rows;
    }),

  /** 停用令牌 */
  revokePortalToken: protectedProcedure
    .input(z.object({ tokenId: z.number() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`UPDATE supplier_portal_tokens SET is_active = false WHERE id = ${input.tokenId}`);
      return { success: true };
    }),

  // ═══════ 供应商文档 (门户公开接口 — 无需登录) ═══════

  /** 验证门户令牌 (供应商端，无需auth) */
  validatePortalToken: protectedProcedure
    .input(z.object({ token: z.string().min(32) }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT id, supplier_id, supplier_name, supplier_contact, supplier_email, purpose, expires_at, use_count, max_uses, is_active
        FROM supplier_portal_tokens WHERE token = ${input.token} LIMIT 1
      `);
      const row = result.rows[0] as any;
      if (!row) return { valid: false, error: "令牌无效" };
      if (!row.is_active) return { valid: false, error: "令牌已停用" };
      if (new Date(row.expires_at) < new Date()) return { valid: false, error: "令牌已过期" };
      if (row.use_count >= row.max_uses) return { valid: false, error: "令牌使用次数已达上限" };
      // Increment use count
      await db.execute(sql`UPDATE supplier_portal_tokens SET use_count = use_count + 1 WHERE id = ${row.id}`);
      return { valid: true, supplier: { id: row.supplier_id, name: row.supplier_name, contact: row.supplier_contact, email: row.supplier_email, purpose: row.purpose } };
    }),

  /** 供应商上传文档记录 */
  uploadDocument: protectedProcedure
    .input(z.object({
      token: z.string().min(32),
      docType: z.enum(["iso_9001_cert", "iso_14001_cert", "iatf_16949_cert", "business_license", "quality_report", "test_report", "signed_confirmation", "capability_statement", "price_list", "other"]),
      docCategory: z.enum(["certification", "legal", "quality", "commercial", "other"]),
      fileName: z.string().min(1),
      fileSize: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      // Validate token
      const tkResult = await db.execute(sql`SELECT id, supplier_id, supplier_name, is_active, expires_at FROM supplier_portal_tokens WHERE token = ${input.token} LIMIT 1`);
      const tk = tkResult.rows[0] as any;
      if (!tk || !tk.is_active || new Date(tk.expires_at) < new Date()) {
        throw new Error("门户令牌无效或已过期");
      }
      const code = `SD-${String(Date.now()).slice(-8)}`;
      const filePath = `data/supplier-uploads/${tk.supplier_name}/${code}-${input.fileName}`;
      const result = await db.execute(sql`
        INSERT INTO supplier_documents (doc_code, supplier_id, supplier_name, portal_token_id, doc_type, doc_category, file_name, file_size, file_path, status, notes)
        VALUES (${code}, ${tk.supplier_id || null}, ${tk.supplier_name}, ${tk.id}, ${input.docType}, ${input.docCategory}, ${input.fileName}, ${input.fileSize}, ${filePath}, 'pending_confirm', ${input.notes || null})
        RETURNING id
      `);
      return { success: true, docId: (result.rows[0] as any).id, docCode: code };
    }),

  /** 供应商确认文档 (确认后不可撤销) */
  confirmDocument: protectedProcedure
    .input(z.object({ docId: z.number(), token: z.string() }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Verify doc belongs to this token's supplier
      const doc = await db.execute(sql`SELECT id, status, portal_token_id FROM supplier_documents WHERE id = ${input.docId} LIMIT 1`);
      const d = doc.rows[0] as any;
      if (!d) throw new Error("文档不存在");
      if (d.status === "confirmed") throw new Error("文档已确认，不可重复操作");
      if (d.status !== "pending_confirm") throw new Error("文档状态不允许确认");
      // Lock it
      await db.execute(sql`
        UPDATE supplier_documents SET status = 'confirmed', is_immutable = true, confirmed_at = NOW(), confirmed_by = 'supplier', updated_at = NOW()
        WHERE id = ${input.docId}
      `);
      log.info({ docId: input.docId }, "[SupplierGovernance] Document confirmed (now immutable)");
      return { success: true, message: "文档已确认锁定，如需撤销请提交撤销申请" };
    }),

  /** 供应商申请撤销文档 */
  requestDocRevoke: protectedProcedure
    .input(z.object({ docId: z.number(), reason: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const doc = await db.execute(sql`SELECT id, status, is_immutable FROM supplier_documents WHERE id = ${input.docId} LIMIT 1`);
      const d = doc.rows[0] as any;
      if (!d) throw new Error("文档不存在");
      if (!d.is_immutable) throw new Error("文档尚未确认，可直接删除");
      if (d.status === "revoke_requested") throw new Error("撤销申请已提交，请等待审批");
      await db.execute(sql`
        UPDATE supplier_documents SET status = 'revoke_requested', revoke_reason = ${input.reason}, revoke_requested_at = NOW(), revoke_requested_by = 'supplier', updated_at = NOW()
        WHERE id = ${input.docId}
      `);
      return { success: true, message: "撤销申请已提交，待GRT内部审批" };
    }),

  /** GRT内部批准撤销 */
  approveDocRevoke: protectedProcedure
    .input(z.object({ docId: z.number(), approve: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const user = ctx.user?.name || "system";
      if (input.approve) {
        await db.execute(sql`UPDATE supplier_documents SET status = 'revoked', is_immutable = false, revoke_approved_by = ${user}, revoke_approved_at = NOW(), updated_at = NOW() WHERE id = ${input.docId}`);
      } else {
        await db.execute(sql`UPDATE supplier_documents SET status = 'confirmed', revoke_reason = NULL, revoke_requested_at = NULL, updated_at = NOW() WHERE id = ${input.docId}`);
      }
      return { success: true };
    }),

  /** 列出供应商文档 */
  listDocuments: protectedProcedure
    .input(z.object({ supplierName: z.string().optional(), status: z.string().optional(), token: z.string().optional(), limit: z.number().default(100) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const conds: SQL[] = [];
      if (input?.supplierName) conds.push(sql`supplier_name = ${input.supplierName}`);
      if (input?.status) conds.push(sql`status = ${input.status}`);
      if (input?.token) {
        // Get supplier name from token
        const tk = await db.execute(sql`SELECT supplier_name FROM supplier_portal_tokens WHERE token = ${input.token} LIMIT 1`);
        if (tk.rows[0]) conds.push(sql`supplier_name = ${(tk.rows[0] as any).supplier_name}`);
      }
      const where = conds.length ? sql`WHERE ${sql.join(conds, sql` AND `)}` : sql``;
      return (await db.execute(sql`SELECT * FROM supplier_documents ${where} ORDER BY created_at DESC LIMIT ${input?.limit || 100}`)).rows;
    }),

  /** GRT内部上传供应商文档 (采购工程师代传，无需token) */
  internalUploadDocument: protectedProcedure
    .input(z.object({
      supplierName: z.string().min(1),
      supplierId: z.number().optional(),
      docType: z.enum(["iso_9001_cert", "iso_14001_cert", "iatf_16949_cert", "business_license", "quality_report", "test_report", "signed_confirmation", "capability_statement", "price_list", "other"]),
      docCategory: z.enum(["certification", "legal", "quality", "commercial", "other"]),
      fileName: z.string().min(1),
      fileSize: z.number(),
      notes: z.string().optional(),
      autoConfirm: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const user = ctx.user?.name || "system";
      const code = `SD-INT-${String(Date.now()).slice(-8)}`;
      const filePath = `data/supplier-uploads/${input.supplierName}/${code}-${input.fileName}`;
      const status = input.autoConfirm ? "confirmed" : "pending_confirm";
      const result = await db.execute(sql`
        INSERT INTO supplier_documents (doc_code, supplier_id, supplier_name, doc_type, doc_category, file_name, file_size, file_path, status, is_immutable, confirmed_at, confirmed_by, notes)
        VALUES (${code}, ${input.supplierId || null}, ${input.supplierName}, ${input.docType}, ${input.docCategory}, ${input.fileName}, ${input.fileSize}, ${filePath}, ${status}, ${input.autoConfirm}, ${input.autoConfirm ? new Date().toISOString() : null}, ${input.autoConfirm ? user : null}, ${input.notes || null})
        RETURNING id
      `);
      log.info({ code, supplier: input.supplierName, uploadedBy: user }, "[SupplierGovernance] Internal doc upload");
      return { success: true, docId: (result.rows[0] as any).id, docCode: code };
    }),

  // ═══════ 竞价引擎 ═══════

  /** 创建竞价项目 */
  createBiddingProject: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      projectNo: z.string().optional(),
      materialName: z.string().min(1),
      materialModel: z.string().optional(),
      quantity: z.number().min(1),
      unit: z.string().default("套"),
      specifications: z.string().optional(),
      budgetCeiling: z.number().optional(),
      biddingType: z.enum(["sealed", "open", "reverse_auction"]).default("sealed"),
      maxRounds: z.number().min(1).max(5).default(3),
      roundDeadlineDays: z.number().min(1).max(30).default(7),
      allowSeeRanking: z.boolean().default(false),
      minBidders: z.number().min(2).default(3),
      invitedSuppliers: z.array(z.object({ name: z.string(), contact: z.string().optional(), email: z.string().optional() })),
      weightPrice: z.number().default(40),
      weightQuality: z.number().default(25),
      weightDelivery: z.number().default(20),
      weightService: z.number().default(15),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const code = `BID-${input.projectNo || "GEN"}-${String(Date.now()).slice(-5)}`;
      const deadline = new Date(Date.now() + input.roundDeadlineDays * 86400000).toISOString();
      const result = await db.execute(sql`
        INSERT INTO supplier_bidding_projects
          (bidding_code, title, project_no, material_name, material_model, quantity, unit,
           specifications, budget_ceiling, bidding_type, max_rounds, current_round,
           round_deadline, allow_see_ranking, min_bidders, invited_suppliers,
           weight_price, weight_quality, weight_delivery, weight_service,
           status, created_by)
        VALUES (${code}, ${input.title}, ${input.projectNo || null}, ${input.materialName},
           ${input.materialModel || null}, ${input.quantity}, ${input.unit},
           ${input.specifications || null}, ${input.budgetCeiling || null},
           ${input.biddingType}, ${input.maxRounds}, 1,
           ${deadline}, ${input.allowSeeRanking}, ${input.minBidders},
           ${JSON.stringify(input.invitedSuppliers)}::jsonb,
           ${input.weightPrice}, ${input.weightQuality}, ${input.weightDelivery}, ${input.weightService},
           'draft', ${ctx.user?.name || "system"})
        RETURNING id
      `);
      return { success: true, id: (result.rows[0] as any).id, biddingCode: code };
    }),

  /** 开标 (状态→open) */
  openBidding: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`UPDATE supplier_bidding_projects SET status = 'open', opened_by = ${ctx.user?.name || "system"}, opened_at = NOW(), updated_at = NOW() WHERE id = ${input.id}`);
      return { success: true };
    }),

  /** 提交报价 */
  submitBid: protectedProcedure
    .input(z.object({
      biddingProjectId: z.number(),
      supplierName: z.string(),
      supplierId: z.number().optional(),
      supplierContact: z.string().optional(),
      unitPrice: z.number().min(0),
      leadTimeDays: z.number().optional(),
      paymentTerms: z.string().optional(),
      warrantyMonths: z.number().optional(),
      technicalNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Get current round
      const proj = await db.execute(sql`SELECT current_round, quantity, status FROM supplier_bidding_projects WHERE id = ${input.biddingProjectId} LIMIT 1`);
      const p = proj.rows[0] as any;
      if (!p || p.status !== "open") throw new Error("竞价项目未开放");
      const totalPrice = input.unitPrice * (p.quantity || 1);
      const result = await db.execute(sql`
        INSERT INTO supplier_bids (bidding_project_id, round, supplier_name, supplier_id, supplier_contact, unit_price, total_price, lead_time_days, payment_terms, warranty_months, technical_notes)
        VALUES (${input.biddingProjectId}, ${p.current_round}, ${input.supplierName}, ${input.supplierId || null}, ${input.supplierContact || null}, ${input.unitPrice}, ${totalPrice}, ${input.leadTimeDays || null}, ${input.paymentTerms || null}, ${input.warrantyMonths || null}, ${input.technicalNotes || null})
        RETURNING id
      `);
      return { success: true, bidId: (result.rows[0] as any).id };
    }),

  /** 关闭当前轮 + 自动评分排名 */
  closeRound: protectedProcedure
    .input(z.object({
      biddingProjectId: z.number(),
      qualityScores: z.array(z.object({ supplierName: z.string(), score: z.number() })).optional(),
      deliveryScores: z.array(z.object({ supplierName: z.string(), score: z.number() })).optional(),
      serviceScores: z.array(z.object({ supplierName: z.string(), score: z.number() })).optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const proj = await db.execute(sql`SELECT * FROM supplier_bidding_projects WHERE id = ${input.biddingProjectId} LIMIT 1`);
      const p = proj.rows[0] as any;
      if (!p) throw new Error("项目不存在");
      const round = p.current_round;
      // Get all bids for this round
      const bids = await db.execute(sql`SELECT * FROM supplier_bids WHERE bidding_project_id = ${input.biddingProjectId} AND round = ${round} AND is_valid = true ORDER BY unit_price ASC`);
      const bidRows = bids.rows as any[];
      if (bidRows.length === 0) throw new Error("本轮无有效报价");
      // Price scoring: lowest gets 100, others proportional
      const minPrice = Math.min(...bidRows.map(b => Number(b.unit_price)));
      const wP = p.weight_price || 40, wQ = p.weight_quality || 25, wD = p.weight_delivery || 20, wS = p.weight_service || 15;
      for (const bid of bidRows) {
        const priceScore = minPrice > 0 ? Math.round((minPrice / Number(bid.unit_price)) * 100) : 50;
        const qs = input.qualityScores?.find(s => s.supplierName === bid.supplier_name)?.score ?? 70;
        const ds = input.deliveryScores?.find(s => s.supplierName === bid.supplier_name)?.score ?? 70;
        const ss = input.serviceScores?.find(s => s.supplierName === bid.supplier_name)?.score ?? 70;
        const total = Math.round((priceScore * wP + qs * wQ + ds * wD + ss * wS) / 100);
        await db.execute(sql.raw(`UPDATE supplier_bids SET price_score = ${priceScore}, quality_score = ${qs}, delivery_score = ${ds}, service_score = ${ss}, total_score = ${total} WHERE id = ${bid.id}`));
      }
      // Rank by total_score desc
      const scored = await db.execute(sql`SELECT id, total_score FROM supplier_bids WHERE bidding_project_id = ${input.biddingProjectId} AND round = ${round} AND is_valid = true ORDER BY total_score DESC`);
      for (let i = 0; i < scored.rows.length; i++) {
        await db.execute(sql.raw(`UPDATE supplier_bids SET ranking = ${i + 1} WHERE id = ${(scored.rows[i] as any).id}`));
      }
      // Advance round or set evaluating
      const nextRound = round + 1;
      if (nextRound > (p.max_rounds || 3)) {
        await db.execute(sql`UPDATE supplier_bidding_projects SET status = 'evaluating', current_round = ${round}, updated_at = NOW() WHERE id = ${input.biddingProjectId}`);
      } else {
        const newDeadline = new Date(Date.now() + 7 * 86400000).toISOString();
        await db.execute(sql`UPDATE supplier_bidding_projects SET current_round = ${nextRound}, round_deadline = ${newDeadline}, updated_at = NOW() WHERE id = ${input.biddingProjectId}`);
      }
      return { success: true, rankings: scored.rows };
    }),

  /** 定标 (选定中标方) */
  awardBidding: protectedProcedure
    .input(z.object({ biddingProjectId: z.number(), winnerSupplierName: z.string(), winnerBidPrice: z.number(), awardReason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      await db.execute(sql`UPDATE supplier_bidding_projects SET status = 'awarded', winner_supplier_name = ${input.winnerSupplierName}, winner_bid_price = ${input.winnerBidPrice}, award_reason = ${input.awardReason || null}, awarded_by = ${ctx.user?.name || "system"}, awarded_at = NOW(), updated_at = NOW() WHERE id = ${input.biddingProjectId}`);
      return { success: true };
    }),

  /** 列出竞价项目 */
  listBiddingProjects: protectedProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const where = input?.status ? sql`WHERE status = ${input.status}` : sql``;
      return (await db.execute(sql`SELECT * FROM supplier_bidding_projects ${where} ORDER BY created_at DESC LIMIT ${input?.limit || 50}`)).rows;
    }),

  /** 获取竞价项目详情 + 所有报价 */
  getBiddingDetail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const proj = await db.execute(sql`SELECT * FROM supplier_bidding_projects WHERE id = ${input.id} LIMIT 1`);
      const bids = await db.execute(sql`SELECT * FROM supplier_bids WHERE bidding_project_id = ${input.id} ORDER BY round ASC, total_score DESC NULLS LAST, unit_price ASC`);
      return { project: proj.rows[0] || null, bids: bids.rows };
    }),

  // ═══════ AI 供应商智能分析 ═══════

  /** AI 供应商资格审查 — 基于上传资料+ISO体系+历史数据自动审查 */
  aiQualificationReview: protectedProcedure
    .input(z.object({
      supplierName: z.string(),
      hasIso9001: z.boolean(),
      hasIso14001: z.boolean().optional(),
      hasIatf16949: z.boolean().optional(),
      supplyCategory: z.string(),
      auditScore: z.number().optional(),
      defectRate: z.number().optional(),
      deliveryOnTimeRate: z.number().optional(),
      annualVolume: z.string().optional(),
      specialNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `你是GRT(杰瑞德自动化)的供应商资格审查AI专家。请基于以下供应商信息进行资格审查评估。

供应商: ${input.supplierName}
供应品类: ${input.supplyCategory}
ISO 9001: ${input.hasIso9001 ? "已认证" : "未认证"}
ISO 14001: ${input.hasIso14001 ? "已认证" : "未认证/未知"}
IATF 16949: ${input.hasIatf16949 ? "已认证" : "未认证/未知"}
${input.auditScore ? `审核评分: ${input.auditScore}/100` : ""}
${input.defectRate != null ? `缺陷率: ${input.defectRate}%` : ""}
${input.deliveryOnTimeRate != null ? `准时交货率: ${input.deliveryOnTimeRate}%` : ""}
${input.annualVolume ? `年采购量: ${input.annualVolume}` : ""}
${input.specialNotes ? `特殊说明: ${input.specialNotes}` : ""}

GRT政策:
- 无ISO体系原则上不用
- 杜绝单一供应商，引入竞争
- IATF 16949为汽车行业供应商优先要求

请输出JSON格式:
{
  "qualificationResult": "合格/有条件合格/不合格",
  "riskLevel": "低/中/高",
  "score": 0-100,
  "strengths": ["优势1", "优势2"],
  "risks": ["风险1", "风险2"],
  "recommendations": ["建议1", "建议2"],
  "isoComplianceNote": "ISO体系合规性说明",
  "requiredActions": ["需要供应商补充的材料或行动"],
  "predictedReliability": "高/中/低 — 基于现有数据的可靠性预测"
}`;

      try {
        const result = await invokeLLM({ system: "你是工业供应链资格审查专家，严格按JSON格式输出。", prompt });
        const text = result.content || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        return { success: true, analysis: parsed, rawText: text };
      } catch (err: any) {
        log.warn({ err }, "[SupplierGovernance] AI qualification review failed");
        return { success: false, analysis: null, rawText: "", error: err.message };
      }
    }),

  /** AI 行业信息通报 — 分析供应商所在行业趋势/风险/价格走势 */
  aiIndustryBriefing: protectedProcedure
    .input(z.object({
      supplyCategory: z.string(),
      materialName: z.string().optional(),
      currentSuppliers: z.array(z.string()).optional(),
      recentPriceChanges: z.string().optional(),
      context: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `你是GRT(杰瑞德自动化·工业清洗设备制造商)的供应链情报分析师。请基于以下信息生成行业通报。

GRT主营: 非标自动化工业清洗设备(超声波/高压喷淋/真空干燥)
分析品类: ${input.supplyCategory}
${input.materialName ? `具体物料: ${input.materialName}` : ""}
${input.currentSuppliers?.length ? `现有供应商: ${input.currentSuppliers.join("、")}` : ""}
${input.recentPriceChanges ? `近期价格变化: ${input.recentPriceChanges}` : ""}
${input.context ? `补充背景: ${input.context}` : ""}

请输出JSON格式:
{
  "briefingTitle": "行业通报标题",
  "industryTrends": [
    {"trend": "趋势描述", "impact": "对GRT的影响", "timeframe": "短期/中期/长期"}
  ],
  "priceOutlook": {
    "direction": "上涨/稳定/下降",
    "confidence": "高/中/低",
    "factors": ["影响因素1", "影响因素2"],
    "prediction": "未来3-6个月价格预测"
  },
  "supplyChainRisks": [
    {"risk": "风险描述", "probability": "高/中/低", "severity": "高/中/低", "mitigation": "建议对策"}
  ],
  "competitorIntelligence": "竞争格局变化(如有)",
  "recommendations": [
    {"action": "建议操作", "priority": "紧急/重要/一般", "responsible": "建议负责人"}
  ],
  "newSupplierOpportunities": ["可考虑引入的新供应商方向"],
  "generatedAt": "${new Date().toISOString().slice(0, 10)}"
}`;

      try {
        const result = await invokeLLM({ system: "你是工业供应链情报分析专家，精通中国制造业供应链动态。严格按JSON格式输出。", prompt });
        const text = result.content || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        return { success: true, briefing: parsed, rawText: text };
      } catch (err: any) {
        log.warn({ err }, "[SupplierGovernance] AI industry briefing failed");
        return { success: false, briefing: null, rawText: "", error: err.message };
      }
    }),

  /** AI 供应商风险预测 — 综合分析所有供应商数据预测风险 */
  aiRiskPrediction: protectedProcedure
    .input(z.object({
      supplierName: z.string(),
      historicalData: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      // Gather all data for this supplier
      const audits = await db.execute(sql`SELECT overall_score, overall_grade, recommendation, audit_date FROM supplier_audits WHERE supplier_name = ${input.supplierName} ORDER BY audit_date DESC LIMIT 10`);
      const checks = await db.execute(sql`SELECT overall_result, findings, inspection_date FROM supplier_spot_checks WHERE supplier_name = ${input.supplierName} ORDER BY created_at DESC LIMIT 10`);
      const elims = await db.execute(sql`SELECT reason, status FROM supplier_elimination_records WHERE supplier_name = ${input.supplierName} LIMIT 5`);

      const prompt = `你是GRT供应商风险预测AI。请基于以下供应商历史数据进行风险预测。

供应商: ${input.supplierName}
${input.historicalData ? `补充数据: ${input.historicalData}` : ""}

审核历史 (最近10次):
${JSON.stringify(audits.rows, null, 2)}

抽检记录 (最近10次):
${JSON.stringify(checks.rows, null, 2)}

淘汰记录:
${JSON.stringify(elims.rows, null, 2)}

请输出JSON格式:
{
  "overallRiskLevel": "低/中/高/极高",
  "riskScore": 0-100,
  "trendDirection": "improving/stable/declining",
  "keyRisks": [
    {"risk": "风险", "probability": 0-100, "impact": "高/中/低", "earlyWarning": "预警信号"}
  ],
  "predictions": {
    "qualityOutlook3m": "未来3个月质量趋势预测",
    "deliveryOutlook3m": "未来3个月交付趋势预测",
    "priceOutlook3m": "未来3个月价格趋势预测",
    "survivalProbability": "该供应商12个月内保持合格状态的概率(%)"
  },
  "actionPlan": [
    {"action": "建议行动", "urgency": "立即/本周/本月/本季度", "owner": "负责人"}
  ],
  "alternativeSuppliers": "如果该供应商淘汰，建议寻找替代方向"
}`;

      try {
        const result = await invokeLLM({ system: "你是供应链风险预测专家。严格按JSON格式输出。", prompt });
        const text = result.content || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        return { success: true, prediction: parsed, rawText: text };
      } catch (err: any) {
        log.warn({ err }, "[SupplierGovernance] AI risk prediction failed");
        return { success: false, prediction: null, rawText: "", error: err.message };
      }
    }),
});
