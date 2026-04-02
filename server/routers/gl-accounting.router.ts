/**
 * 总账核心路由 (General Ledger)
 *
 * 覆盖:
 * - 会计科目管理 (CRUD + 从金蝶导入)
 * - 凭证录入与过账
 * - 科目余额查询
 * - 试算平衡表
 * - 固定资产管理
 * - 折旧计算与过账
 * - 税务发票管理
 * - 期末结账
 * - 三单匹配查询
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { sql, eq, and, desc, count, gte, lte } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import {
  glAccounts, glEntries, accountBalances,
  fixedAssets, assetDepreciation, assetDisposal,
  taxInvoices, financeRoleAssignments, costCenters,
  periodCloseChecklists,
} from "../../drizzle/gl-accounting-schema";
import { performMatch, type MatchInput } from "../services/bill-matching.service";
import { resolveRole, resolveReimbursementChain } from "../services/finance-role.service";

const log = createChildLogger("gl-accounting");

// ============================================
// Zod Schemas
// ============================================

const AccountCreateSchema = z.object({
  accountCode: z.string().min(1).max(20),
  accountName: z.string().min(1).max(100),
  accountType: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  accountGroup: z.string().optional(),
  parentAccountId: z.number().optional(),
  level: z.number().int().min(1).max(6).default(1),
  isDetailAccount: z.boolean().default(true),
  balanceDirection: z.enum(["debit", "credit"]).default("debit"),
  isActive: z.boolean().default(true),
  erpLegacyCode: z.string().optional(),
});

const AccountUpdateSchema = z.object({
  id: z.number(),
  accountName: z.string().min(1).max(100).optional(),
  accountGroup: z.string().optional(),
  isActive: z.boolean().optional(),
  erpLegacyCode: z.string().optional(),
});

const EntryLineSchema = z.object({
  accountCode: z.string().min(1),
  debitAmount: z.number().min(0).default(0),
  creditAmount: z.number().min(0).default(0),
  description: z.string().optional(),
  costCenterCode: z.string().optional(),
  projectCode: z.string().optional(),
});

const EntryCreateSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Format: YYYY-MM"),
  entryDate: z.string(),
  sourceDocCode: z.string().optional(),
  sourceDocType: z.enum(["manual", "purchase", "sales", "payroll", "depreciation", "adjustment", "closing"]).default("manual"),
  description: z.string().min(1),
  lines: z.array(EntryLineSchema).min(2),
});

const AssetCreateSchema = z.object({
  assetCode: z.string().min(1),
  assetName: z.string().min(1),
  assetCategory: z.enum(["machinery", "vehicle", "office_equipment", "it_equipment", "building", "land_use_right", "intangible", "other"]),
  acquisitionDate: z.string(),
  acquisitionCost: z.number().min(0),
  salvageValue: z.number().min(0).default(0),
  usefulLifeMonths: z.number().int().min(1),
  depreciationMethod: z.enum(["straight_line", "declining_balance", "units_of_production"]).default("straight_line"),
  departmentCode: z.string().optional(),
  location: z.string().optional(),
  invoiceNumber: z.string().optional(),
  glAccountCode: z.string().optional(),
  depreciationGlAccountCode: z.string().optional(),
  projectCode: z.string().optional(),
});

const InvoiceCreateSchema = z.object({
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string(),
  direction: z.enum(["input", "output"]),
  counterpartyName: z.string().min(1),
  counterpartyTaxId: z.string().optional(),
  taxExclusiveAmount: z.number().min(0),
  taxRate: z.number().min(0).max(1),
  taxAmount: z.number().min(0),
  taxInclusiveAmount: z.number().min(0),
  invoiceType: z.enum(["special_vat", "general_vat", "electronic", "other"]).default("special_vat"),
  projectCode: z.string().optional(),
  contractNumber: z.string().optional(),
});

const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(20),
});

// ============================================
// Router
// ============================================

export const glAccountingRouter = router({

  // ────────────────── Chart of Accounts ──────────────────

  /**
   * 查询会计科目列表（支持层级、类型、分组筛选）
   */
  listAccounts: protectedProcedure
    .input(z.object({
      accountType: z.string().optional(),
      accountGroup: z.string().optional(),
      level: z.number().optional(),
      isActive: z.boolean().optional(),
      search: z.string().optional(),
      ...PaginationSchema.shape,
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: any[] = [];
      if (input.accountType) conditions.push(eq(glAccounts.accountType, input.accountType as any));
      if (input.accountGroup) conditions.push(eq(glAccounts.accountGroup, input.accountGroup));
      if (input.level != null) conditions.push(eq(glAccounts.level, input.level));
      if (input.isActive != null) conditions.push(eq(glAccounts.isActive, input.isActive));
      if (input.search) {
        conditions.push(sql`(${glAccounts.accountCode} LIKE ${'%' + input.search + '%'} OR ${glAccounts.accountName} LIKE ${'%' + input.search + '%'})`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db.select({ value: count() }).from(glAccounts).where(whereClause);
      const total = totalResult[0].value;
      const offset = (input.page - 1) * input.pageSize;

      const items = await db.select().from(glAccounts)
        .where(whereClause)
        .orderBy(glAccounts.accountCode)
        .limit(input.pageSize)
        .offset(offset);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /**
   * 获取单个科目（按ID或科目编码）
   */
  getAccount: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      accountCode: z.string().optional(),
    }).refine(d => d.id != null || d.accountCode != null, "id or accountCode required"))
    .query(async ({ input }) => {
      const db = await requireDb();
      const cond = input.id != null
        ? eq(glAccounts.id, input.id)
        : eq(glAccounts.accountCode, input.accountCode!);
      const rows = await db.select().from(glAccounts).where(cond).limit(1);
      return rows[0] ?? null;
    }),

  /**
   * 创建会计科目
   */
  createAccount: requirePermission("finance:gl:manage")
    .input(AccountCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      log.info({ accountCode: input.accountCode, user: ctx.user?.id }, "createAccount");
      const now = new Date().toISOString();
      const rows = await db.insert(glAccounts).values({
        accountCode: input.accountCode,
        accountName: input.accountName,
        accountType: input.accountType,
        accountGroup: input.accountGroup ?? null,
        parentAccountId: input.parentAccountId ?? null,
        level: input.level,
        isDetailAccount: input.isDetailAccount,
        balanceDirection: input.balanceDirection,
        isActive: input.isActive,
        erpLegacyCode: input.erpLegacyCode ?? null,
        createdAt: now,
        updatedAt: now,
      }).returning();
      return rows[0] ?? null;
    }),

  /**
   * 更新会计科目（不可修改编码）
   */
  updateAccount: requirePermission("finance:gl:manage")
    .input(AccountUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      log.info({ id: input.id, user: ctx.user?.id }, "updateAccount");
      const { id, ...updates } = input;
      const rows = await db.update(glAccounts)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(glAccounts.id, id))
        .returning();
      return rows[0] ?? null;
    }),

  /**
   * 从金蝶迁移数据批量导入科目
   */
  importFromKingdee: requirePermission("finance:gl:manage")
    .input(z.object({
      accounts: z.array(z.object({
        accountCode: z.string(),
        accountName: z.string(),
        accountType: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
        accountGroup: z.string().optional(),
        parentAccountId: z.number().optional(),
        level: z.number().default(1),
        balanceDirection: z.enum(["debit", "credit"]).default("debit"),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      log.info({ count: input.accounts.length, user: ctx.user?.id }, "importFromKingdee");
      const now = new Date().toISOString();
      let imported = 0;
      let skipped = 0;

      for (const acct of input.accounts) {
        // Skip if code already exists
        const existing = await db.select({ id: glAccounts.id })
          .from(glAccounts).where(eq(glAccounts.accountCode, acct.accountCode)).limit(1);
        if (existing.length > 0) {
          skipped++;
          continue;
        }
        await db.insert(glAccounts).values({
          accountCode: acct.accountCode,
          accountName: acct.accountName,
          accountType: acct.accountType,
          accountGroup: acct.accountGroup ?? null,
          parentAccountId: acct.parentAccountId ?? null,
          level: acct.level,
          isDetailAccount: true,
          balanceDirection: acct.balanceDirection,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        imported++;
      }

      return { imported, skipped, total: input.accounts.length };
    }),

  // ────────────────── Journal Entries ──────────────────

  /**
   * 创建会计凭证（借贷配平校验）
   */
  createEntry: requirePermission("finance:gl:manage")
    .input(EntryCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // 期间锁定校验 — 已关闭的期间不允许新增凭证
      const [periodYear, periodMonth] = input.period.split("-").map(Number);
      const closedPeriods = await db.select().from(periodCloseChecklists)
        .where(and(
          eq(periodCloseChecklists.fiscalYear, periodYear),
          eq(periodCloseChecklists.fiscalPeriod, periodMonth),
          eq(periodCloseChecklists.checkItem, '结转损益'),
          eq(periodCloseChecklists.status, 'completed'),
        ))
        .limit(1);

      if (closedPeriods.length > 0) {
        return { success: false, message: `期间 ${input.period} 已关闭，不允许新增凭证` };
      }

      // Validate debit/credit balance
      const totalDebit = input.lines.reduce((s, l) => s + l.debitAmount, 0);
      const totalCredit = input.lines.reduce((s, l) => s + l.creditAmount, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.005) {
        throw new Error(`借贷不平衡: 借方 ${totalDebit.toFixed(2)} ≠ 贷方 ${totalCredit.toFixed(2)}`);
      }

      log.info({ period: input.period, lines: input.lines.length, user: ctx.user?.id }, "createEntry");
      const now = new Date().toISOString();

      // Generate entry number: JV-YYYYMM-XXXX
      const countResult = await db.select({ value: count() }).from(glEntries)
        .where(and(eq(glEntries.fiscalYear, periodYear), eq(glEntries.fiscalPeriod, periodMonth)));
      const seq = (countResult[0].value ?? 0) + 1;
      const entryCode = `JV-${input.period.replace("-", "")}-${String(seq).padStart(4, "0")}`;

      const inserted: any[] = [];
      for (const line of input.lines) {
        const rows = await db.insert(glEntries).values({
          entryCode,
          voucherDate: input.entryDate,
          fiscalYear: periodYear,
          fiscalPeriod: periodMonth,
          accountId: 0, // placeholder — resolved by accountCode
          accountCode: line.accountCode,
          debitAmount: String(line.debitAmount),
          creditAmount: String(line.creditAmount),
          description: line.description ?? input.description,
          sourceDocCode: input.sourceDocCode ?? null,
          sourceDocType: input.sourceDocType,
          costCenterCode: line.costCenterCode ?? null,
          projectCode: line.projectCode ?? null,
          isPosted: false,
          createdBy: ctx.user?.id ?? null,
          createdAt: now,
          updatedAt: now,
        }).returning();
        if (rows[0]) inserted.push(rows[0]);
      }

      return { entryCode, lineCount: inserted.length, totalDebit, totalCredit };
    }),

  /**
   * 查询凭证列表
   */
  listEntries: protectedProcedure
    .input(z.object({
      period: z.string().optional(),
      accountCode: z.string().optional(),
      sourceDocCode: z.string().optional(),
      sourceDocType: z.string().optional(),
      isPosted: z.boolean().optional(),
      projectCode: z.string().optional(),
      ...PaginationSchema.shape,
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: any[] = [];
      if (input.period) {
        const [y, m] = input.period.split("-").map(Number);
        conditions.push(eq(glEntries.fiscalYear, y));
        conditions.push(eq(glEntries.fiscalPeriod, m));
      }
      if (input.accountCode) conditions.push(eq(glEntries.accountCode, input.accountCode));
      if (input.sourceDocCode) conditions.push(eq(glEntries.sourceDocCode, input.sourceDocCode));
      if (input.sourceDocType) conditions.push(eq(glEntries.sourceDocType, input.sourceDocType as any));
      if (input.isPosted != null) conditions.push(eq(glEntries.isPosted, input.isPosted));
      if (input.projectCode) conditions.push(eq(glEntries.projectCode, input.projectCode));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db.select({ value: count() }).from(glEntries).where(whereClause);
      const total = totalResult[0].value;
      const offset = (input.page - 1) * input.pageSize;

      const items = await db.select().from(glEntries)
        .where(whereClause)
        .orderBy(desc(glEntries.id))
        .limit(input.pageSize)
        .offset(offset);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /**
   * 批量过账凭证
   */
  postEntries: requirePermission("finance:gl:manage")
    .input(z.object({
      entryCodes: z.array(z.string()).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      log.info({ count: input.entryCodes.length, user: ctx.user?.id }, "postEntries");
      let posted = 0;
      for (const entryCode of input.entryCodes) {
        const result = await db.update(glEntries)
          .set({ isPosted: true, postedAt: new Date().toISOString(), postedBy: ctx.user?.id ?? null })
          .where(and(eq(glEntries.entryCode, entryCode), eq(glEntries.isPosted, false)))
          .returning();
        posted += result.length;
      }
      return { posted, requested: input.entryCodes.length };
    }),

  /**
   * 凭证冲销（生成红字凭证）
   */
  reverseEntry: requirePermission("finance:gl:manage")
    .input(z.object({
      entryCode: z.string(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      log.info({ entryCode: input.entryCode, user: ctx.user?.id }, "reverseEntry");

      // Fetch original lines
      const origLines = await db.select().from(glEntries)
        .where(eq(glEntries.entryCode, input.entryCode))
        .limit(200);

      if (origLines.length === 0) {
        throw new Error(`凭证 ${input.entryCode} 不存在`);
      }

      const fiscalYear = origLines[0].fiscalYear;
      const fiscalPeriod = origLines[0].fiscalPeriod;
      const countResult = await db.select({ value: count() }).from(glEntries)
        .where(and(eq(glEntries.fiscalYear, fiscalYear), eq(glEntries.fiscalPeriod, fiscalPeriod)));
      const seq = (countResult[0].value ?? 0) + 1;
      const periodStr = `${fiscalYear}${String(fiscalPeriod).padStart(2, "0")}`;
      const reversalCode = `JV-${periodStr}-${String(seq).padStart(4, "0")}`;

      const now = new Date().toISOString();
      for (const orig of origLines) {
        await db.insert(glEntries).values({
          entryCode: reversalCode,
          voucherDate: now.slice(0, 10),
          fiscalYear,
          fiscalPeriod,
          accountId: orig.accountId,
          accountCode: orig.accountCode,
          debitAmount: orig.creditAmount, // swap
          creditAmount: orig.debitAmount, // swap
          description: `冲销 ${input.entryCode}: ${input.reason}`,
          sourceDocCode: input.entryCode,
          sourceDocType: "adjustment",
          costCenterCode: orig.costCenterCode,
          projectCode: orig.projectCode,
          isPosted: false,
          createdBy: ctx.user?.id ?? null,
          createdAt: now,
          updatedAt: now,
        });
      }

      return { reversalCode, lineCount: origLines.length };
    }),

  /**
   * 试算平衡表（按科目汇总借/贷发生额）
   */
  getTrialBalance: protectedProcedure
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
      accountType: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [y, m] = input.period.split("-").map(Number);
      const conditions: any[] = [
        eq(glEntries.fiscalYear, y),
        eq(glEntries.fiscalPeriod, m),
        eq(glEntries.isPosted, true),
      ];

      const rows = await db.select({
        accountCode: glEntries.accountCode,
        totalDebit: sql<string>`COALESCE(SUM(CAST(${glEntries.debitAmount} AS DECIMAL(18,2))), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(CAST(${glEntries.creditAmount} AS DECIMAL(18,2))), 0)`,
        lineCount: count(),
      })
        .from(glEntries)
        .where(and(...conditions))
        .groupBy(glEntries.accountCode)
        .limit(10000);

      // Optionally join account info for type filter
      const result = rows.map(r => ({
        accountCode: r.accountCode,
        totalDebit: Number(r.totalDebit),
        totalCredit: Number(r.totalCredit),
        balance: Number(r.totalDebit) - Number(r.totalCredit),
        lineCount: r.lineCount,
      }));

      const grandTotalDebit = result.reduce((s, r) => s + r.totalDebit, 0);
      const grandTotalCredit = result.reduce((s, r) => s + r.totalCredit, 0);

      return {
        period: input.period,
        accounts: result,
        grandTotalDebit,
        grandTotalCredit,
        isBalanced: Math.abs(grandTotalDebit - grandTotalCredit) < 0.01,
      };
    }),

  // ────────────────── Account Balances ──────────────────

  /**
   * 查询科目余额
   */
  getBalances: protectedProcedure
    .input(z.object({
      fiscalYear: z.number().optional(),
      fiscalPeriod: z.number().optional(),
      accountCode: z.string().optional(),
      ...PaginationSchema.shape,
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: any[] = [];
      if (input.fiscalYear != null) conditions.push(eq(accountBalances.fiscalYear, input.fiscalYear));
      if (input.fiscalPeriod != null) conditions.push(eq(accountBalances.fiscalPeriod, input.fiscalPeriod));
      if (input.accountCode) conditions.push(eq(accountBalances.accountCode, input.accountCode));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db.select({ value: count() }).from(accountBalances).where(whereClause);
      const total = totalResult[0].value;
      const offset = (input.page - 1) * input.pageSize;

      const items = await db.select().from(accountBalances)
        .where(whereClause)
        .orderBy(accountBalances.accountCode)
        .limit(input.pageSize)
        .offset(offset);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /**
   * 从凭证重算科目余额（管理工具）
   */
  recalculateBalances: adminProcedure
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      log.warn({ period: input.period, user: ctx.user?.id }, "recalculateBalances — admin tool");

      const [y, m] = input.period.split("-").map(Number);

      // Aggregate posted entries by account
      const agg = await db.select({
        accountCode: glEntries.accountCode,
        totalDebit: sql<string>`COALESCE(SUM(CAST(${glEntries.debitAmount} AS DECIMAL(18,2))), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(CAST(${glEntries.creditAmount} AS DECIMAL(18,2))), 0)`,
      })
        .from(glEntries)
        .where(and(eq(glEntries.fiscalYear, y), eq(glEntries.fiscalPeriod, m), eq(glEntries.isPosted, true)))
        .groupBy(glEntries.accountCode)
        .limit(10000);

      // Delete existing balances for this period then reinsert
      await db.delete(accountBalances).where(and(eq(accountBalances.fiscalYear, y), eq(accountBalances.fiscalPeriod, m)));

      const now = new Date().toISOString();
      let upserted = 0;
      for (const row of agg) {
        const endBal = Number(row.totalDebit) - Number(row.totalCredit);
        await db.insert(accountBalances).values({
          accountId: 0, // placeholder
          accountCode: row.accountCode,
          fiscalYear: y,
          fiscalPeriod: m,
          beginBalance: "0",
          periodDebit: row.totalDebit,
          periodCredit: row.totalCredit,
          endBalance: String(endBal.toFixed(2)),
          updatedAt: now,
        });
        upserted++;
      }

      return { period: input.period, accountsRecalculated: upserted };
    }),

  // ────────────────── Fixed Assets ──────────────────

  /**
   * 登记固定资产
   */
  createAsset: requirePermission("finance:asset:manage")
    .input(AssetCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      log.info({ assetCode: input.assetCode, user: ctx.user?.id }, "createAsset");
      const now = new Date().toISOString();
      const rows = await db.insert(fixedAssets).values({
        assetCode: input.assetCode,
        assetName: input.assetName,
        assetCategory: input.assetCategory,
        acquisitionDate: input.acquisitionDate,
        acquisitionCost: String(input.acquisitionCost),
        salvageValue: String(input.salvageValue),
        usefulLifeMonths: input.usefulLifeMonths,
        depreciationMethod: input.depreciationMethod,
        departmentCode: input.departmentCode ?? null,
        location: input.location ?? null,
        invoiceNumber: input.invoiceNumber ?? null,
        glAccountCode: input.glAccountCode ?? null,
        depreciationGlAccountCode: input.depreciationGlAccountCode ?? null,
        projectCode: input.projectCode ?? null,
        accumulatedDepreciation: "0",
        netBookValue: String(input.acquisitionCost),
        status: "active",
        createdBy: ctx.user?.id ?? null,
        createdAt: now,
        updatedAt: now,
      }).returning();
      return rows[0] ?? null;
    }),

  /**
   * 查询固定资产列表
   */
  listAssets: protectedProcedure
    .input(z.object({
      assetCategory: z.string().optional(),
      status: z.string().optional(),
      departmentCode: z.string().optional(),
      search: z.string().optional(),
      ...PaginationSchema.shape,
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: any[] = [];
      if (input.assetCategory) conditions.push(eq(fixedAssets.assetCategory, input.assetCategory as any));
      if (input.status) conditions.push(eq(fixedAssets.status, input.status as any));
      if (input.departmentCode) conditions.push(eq(fixedAssets.departmentCode, input.departmentCode));
      if (input.search) {
        conditions.push(sql`(${fixedAssets.assetCode} LIKE ${'%' + input.search + '%'} OR ${fixedAssets.assetName} LIKE ${'%' + input.search + '%'})`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db.select({ value: count() }).from(fixedAssets).where(whereClause);
      const total = totalResult[0].value;
      const offset = (input.page - 1) * input.pageSize;

      const items = await db.select().from(fixedAssets)
        .where(whereClause)
        .orderBy(desc(fixedAssets.id))
        .limit(input.pageSize)
        .offset(offset);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /**
   * 计算月度折旧（全部在役资产）
   */
  calculateDepreciation: requirePermission("finance:asset:manage")
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      log.info({ period: input.period, user: ctx.user?.id }, "calculateDepreciation");

      const [y, m] = input.period.split("-").map(Number);

      const activeAssets = await db.select().from(fixedAssets)
        .where(eq(fixedAssets.status, "active"))
        .limit(10000);

      const now = new Date().toISOString();
      let calculated = 0;

      for (const asset of activeAssets) {
        const cost = Number(asset.acquisitionCost);
        const residual = Number(asset.salvageValue);
        const months = asset.usefulLifeMonths;
        let monthlyDep = 0;

        if (asset.depreciationMethod === "straight_line") {
          monthlyDep = (cost - residual) / months;
        } else if (asset.depreciationMethod === "declining_balance") {
          const nbv = Number(asset.netBookValue);
          const rate = 2 / months;
          monthlyDep = Math.max(nbv * rate, (nbv - residual) / Math.max(months - calculated, 1));
        } else {
          monthlyDep = (cost - residual) / months;
        }

        // Check if already calculated for this period
        const existing = await db.select({ id: assetDepreciation.id })
          .from(assetDepreciation)
          .where(and(eq(assetDepreciation.assetId, asset.id), eq(assetDepreciation.fiscalYear, y), eq(assetDepreciation.fiscalPeriod, m)))
          .limit(1);

        if (existing.length > 0) continue;

        const accDep = Number(asset.accumulatedDepreciation) + monthlyDep;
        const nbv = cost - accDep;

        await db.insert(assetDepreciation).values({
          assetId: asset.id,
          assetCode: asset.assetCode,
          fiscalYear: y,
          fiscalPeriod: m,
          depreciationAmount: String(monthlyDep.toFixed(2)),
          accumulatedAfter: String(accDep.toFixed(2)),
          netBookValueAfter: String(Math.max(nbv, 0).toFixed(2)),
          status: "calculated",
          calculatedAt: now,
        });

        // Update asset running totals
        await db.update(fixedAssets)
          .set({
            accumulatedDepreciation: String(accDep.toFixed(2)),
            netBookValue: String(Math.max(nbv, 0).toFixed(2)),
            updatedAt: now,
          })
          .where(eq(fixedAssets.id, asset.id));

        calculated++;
      }

      return { period: input.period, assetsCalculated: calculated, totalActive: activeAssets.length };
    }),

  /**
   * 过账折旧凭证
   */
  postDepreciation: requirePermission("finance:gl:manage")
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      log.info({ period: input.period, user: ctx.user?.id }, "postDepreciation");

      const [y, m] = input.period.split("-").map(Number);

      const unposted = await db.select().from(assetDepreciation)
        .where(and(eq(assetDepreciation.fiscalYear, y), eq(assetDepreciation.fiscalPeriod, m), eq(assetDepreciation.status, "calculated")))
        .limit(10000);

      if (unposted.length === 0) return { posted: 0, message: "无待过账折旧" };

      // Sum total depreciation
      const totalDep = unposted.reduce((s, r) => s + Number(r.depreciationAmount), 0);

      // Create GL entry
      const countResult = await db.select({ value: count() }).from(glEntries)
        .where(and(eq(glEntries.fiscalYear, y), eq(glEntries.fiscalPeriod, m)));
      const seq = (countResult[0].value ?? 0) + 1;
      const entryCode = `JV-${input.period.replace("-", "")}-${String(seq).padStart(4, "0")}`;
      const now = new Date().toISOString();

      // Debit: depreciation expense; Credit: accumulated depreciation
      await db.insert(glEntries).values({
        entryCode,
        voucherDate: now.slice(0, 10),
        fiscalYear: y,
        fiscalPeriod: m,
        accountId: 0,
        accountCode: "660201", // depreciation expense default code
        debitAmount: String(totalDep.toFixed(2)),
        creditAmount: "0",
        description: `${input.period} 月折旧摊销`,
        sourceDocType: "depreciation",
        isPosted: true,
        postedAt: now,
        postedBy: ctx.user?.id ?? null,
        createdBy: ctx.user?.id ?? null,
        createdAt: now,
        updatedAt: now,
      });
      await db.insert(glEntries).values({
        entryCode,
        voucherDate: now.slice(0, 10),
        fiscalYear: y,
        fiscalPeriod: m,
        accountId: 0,
        accountCode: "160201", // accumulated depreciation default code
        debitAmount: "0",
        creditAmount: String(totalDep.toFixed(2)),
        description: `${input.period} 月折旧摊销`,
        sourceDocType: "depreciation",
        isPosted: true,
        postedAt: now,
        postedBy: ctx.user?.id ?? null,
        createdBy: ctx.user?.id ?? null,
        createdAt: now,
        updatedAt: now,
      });

      // Mark depreciation records as posted
      for (const dep of unposted) {
        await db.update(assetDepreciation)
          .set({ status: "posted", postedAt: now })
          .where(eq(assetDepreciation.id, dep.id));
      }

      return { posted: unposted.length, entryCode, totalDepreciation: totalDep.toFixed(2) };
    }),

  /**
   * 资产处置（含损益计算）
   */
  disposeAsset: requirePermission("finance:asset:manage")
    .input(z.object({
      assetId: z.number(),
      disposalDate: z.string(),
      disposalMethod: z.enum(["sale", "scrap", "donation", "transfer"]),
      disposalAmount: z.number().min(0).default(0),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      log.info({ assetId: input.assetId, method: input.disposalMethod, user: ctx.user?.id }, "disposeAsset");

      const assetRows = await db.select().from(fixedAssets)
        .where(eq(fixedAssets.id, input.assetId)).limit(1);
      const asset = assetRows[0];
      if (!asset) throw new Error("资产不存在");
      if (asset.status !== "active") throw new Error("资产非在役状态");

      const nbv = Number(asset.netBookValue);
      const gainLoss = input.disposalAmount - nbv;
      const now = new Date().toISOString();

      await db.insert(assetDisposal).values({
        assetId: input.assetId,
        assetCode: asset.assetCode,
        disposalDate: input.disposalDate,
        disposalMethod: input.disposalMethod,
        disposalAmount: String(input.disposalAmount),
        netBookValueAtDisposal: String(nbv.toFixed(2)),
        gainOrLoss: String(gainLoss.toFixed(2)),
        reason: input.reason ?? null,
        approvedBy: null,
        createdBy: ctx.user?.id ?? null,
        createdAt: now,
      });

      await db.update(fixedAssets)
        .set({ status: "disposed", updatedAt: now })
        .where(eq(fixedAssets.id, input.assetId));

      return {
        assetId: input.assetId,
        assetCode: asset.assetCode,
        netBookValue: nbv,
        disposalAmount: input.disposalAmount,
        gainOrLoss: gainLoss,
        type: gainLoss >= 0 ? "gain" : "loss",
      };
    }),

  // ────────────────── Tax Invoices ──────────────────

  /**
   * 登记进/销项发票
   */
  createInvoice: requirePermission("finance:tax:manage")
    .input(InvoiceCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      log.info({ invoiceNumber: input.invoiceNumber, direction: input.direction, user: ctx.user?.id }, "createInvoice");
      const now = new Date().toISOString();
      const rows = await db.insert(taxInvoices).values({
        invoiceNumber: input.invoiceNumber,
        invoiceDate: input.invoiceDate,
        direction: input.direction,
        counterpartyName: input.counterpartyName,
        counterpartyTaxId: input.counterpartyTaxId ?? null,
        taxExclusiveAmount: String(input.taxExclusiveAmount),
        taxAmount: String(input.taxAmount),
        taxInclusiveAmount: String(input.taxInclusiveAmount),
        taxRate: String(input.taxRate),
        invoiceType: input.invoiceType,
        projectCode: input.projectCode ?? null,
        contractNumber: input.contractNumber ?? null,
        certificationStatus: "pending",
        status: "draft",
        createdBy: ctx.user?.id ?? null,
        createdAt: now,
        updatedAt: now,
      }).returning();
      return rows[0] ?? null;
    }),

  /**
   * 查询发票列表
   */
  listInvoices: protectedProcedure
    .input(z.object({
      direction: z.enum(["input", "output"]).optional(),
      period: z.string().optional(),
      counterpartyName: z.string().optional(),
      certificationStatus: z.string().optional(),
      status: z.string().optional(),
      ...PaginationSchema.shape,
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: any[] = [];
      if (input.direction) conditions.push(eq(taxInvoices.direction, input.direction));
      if (input.period) {
        conditions.push(sql`${taxInvoices.invoiceDate} LIKE ${input.period + '%'}`);
      }
      if (input.counterpartyName) {
        conditions.push(sql`${taxInvoices.counterpartyName} LIKE ${'%' + input.counterpartyName + '%'}`);
      }
      if (input.certificationStatus) conditions.push(eq(taxInvoices.certificationStatus, input.certificationStatus));
      if (input.status) conditions.push(eq(taxInvoices.status, input.status));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db.select({ value: count() }).from(taxInvoices).where(whereClause);
      const total = totalResult[0].value;
      const offset = (input.page - 1) * input.pageSize;

      const items = await db.select().from(taxInvoices)
        .where(whereClause)
        .orderBy(desc(taxInvoices.id))
        .limit(input.pageSize)
        .offset(offset);

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /**
   * 进项发票认证
   */
  certifyInputInvoice: requirePermission("finance:tax:manage")
    .input(z.object({
      invoiceId: z.number(),
      certifiedDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      log.info({ invoiceId: input.invoiceId, user: ctx.user?.id }, "certifyInputInvoice");
      const now = new Date().toISOString();
      const rows = await db.update(taxInvoices)
        .set({
          certificationStatus: "certified",
          certifiedAt: input.certifiedDate ?? now.slice(0, 10),
          status: "validated",
          updatedAt: now,
        })
        .where(and(eq(taxInvoices.id, input.invoiceId), eq(taxInvoices.direction, "input")))
        .returning();
      return rows[0] ?? null;
    }),

  /**
   * 增值税汇总（销项 - 进项 = 应纳税额）
   */
  getVatSummary: protectedProcedure
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const outputResult = await db.select({
        totalAmount: sql<string>`COALESCE(SUM(CAST(${taxInvoices.taxAmount} AS DECIMAL(18,2))), 0)`,
        invoiceCount: count(),
      })
        .from(taxInvoices)
        .where(and(
          eq(taxInvoices.direction, "output"),
          sql`${taxInvoices.invoiceDate} LIKE ${input.period + '%'}`,
        ));

      const inputResult = await db.select({
        totalAmount: sql<string>`COALESCE(SUM(CAST(${taxInvoices.taxAmount} AS DECIMAL(18,2))), 0)`,
        invoiceCount: count(),
        certifiedAmount: sql<string>`COALESCE(SUM(CASE WHEN ${taxInvoices.certificationStatus} = 'certified' THEN CAST(${taxInvoices.taxAmount} AS DECIMAL(18,2)) ELSE 0 END), 0)`,
      })
        .from(taxInvoices)
        .where(and(
          eq(taxInvoices.direction, "input"),
          sql`${taxInvoices.invoiceDate} LIKE ${input.period + '%'}`,
        ));

      const outputTax = Number(outputResult[0]?.totalAmount ?? 0);
      const inputTax = Number(inputResult[0]?.totalAmount ?? 0);
      const certifiedInputTax = Number(inputResult[0]?.certifiedAmount ?? 0);

      return {
        period: input.period,
        outputTax,
        outputInvoiceCount: outputResult[0]?.invoiceCount ?? 0,
        inputTax,
        inputInvoiceCount: inputResult[0]?.invoiceCount ?? 0,
        certifiedInputTax,
        vatPayable: outputTax - certifiedInputTax,
        uncertifiedInputTax: inputTax - certifiedInputTax,
      };
    }),

  // ────────────────── Period Close ──────────────────

  /**
   * 获取期末结账检查项
   */
  getCloseChecklist: protectedProcedure
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [y, m] = input.period.split("-").map(Number);
      const items = await db.select().from(periodCloseChecklists)
        .where(and(eq(periodCloseChecklists.fiscalYear, y), eq(periodCloseChecklists.fiscalPeriod, m)))
        .orderBy(periodCloseChecklists.id)
        .limit(100);

      // If no items exist for this period, seed default checklist
      if (items.length === 0) {
        const defaults = [
          "银行对账",
          "应收账款确认",
          "应付账款确认",
          "折旧计提",
          "摊销计提",
          "工资计提",
          "税金计提",
          "存货盘点核对",
          "试算平衡检查",
          "财务经理复核",
        ];
        const now = new Date().toISOString();
        for (const checkItem of defaults) {
          await db.insert(periodCloseChecklists).values({
            fiscalYear: y,
            fiscalPeriod: m,
            checkItem,
            status: "pending",
            createdAt: now,
            updatedAt: now,
          });
        }
        // Re-read
        const seeded = await db.select().from(periodCloseChecklists)
          .where(and(eq(periodCloseChecklists.fiscalYear, y), eq(periodCloseChecklists.fiscalPeriod, m)))
          .orderBy(periodCloseChecklists.id)
          .limit(100);
        return seeded;
      }

      return items;
    }),

  /**
   * 更新检查项完成状态
   */
  updateCheckItem: requirePermission("finance:gl:manage")
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "in_progress", "completed", "skipped"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const now = new Date().toISOString();
      const isCompleted = input.status === "completed";
      const rows = await db.update(periodCloseChecklists)
        .set({
          status: input.status,
          completedBy: isCompleted ? (ctx.user?.id ?? null) : null,
          completedAt: isCompleted ? now : null,
          notes: input.notes ?? null,
          updatedAt: now,
        })
        .where(eq(periodCloseChecklists.id, input.id))
        .returning();
      return rows[0] ?? null;
    }),

  /**
   * 执行期末结账（阻止该期再过账）
   */
  closePeriod: requirePermission("finance:period:close")
    .input(z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      log.warn({ period: input.period, user: ctx.user?.id }, "closePeriod");

      const [y, m] = input.period.split("-").map(Number);

      // Check all checklist items are completed
      const incomplete = await db.select({ value: count() }).from(periodCloseChecklists)
        .where(and(
          eq(periodCloseChecklists.fiscalYear, y),
          eq(periodCloseChecklists.fiscalPeriod, m),
          sql`${periodCloseChecklists.status} != 'completed' AND ${periodCloseChecklists.status} != 'skipped'`,
        ));

      if ((incomplete[0]?.value ?? 0) > 0) {
        throw new Error(`期末结账检查项未全部完成，尚有 ${incomplete[0].value} 项未完成`);
      }

      // Check trial balance
      const unposted = await db.select({ value: count() }).from(glEntries)
        .where(and(eq(glEntries.fiscalYear, y), eq(glEntries.fiscalPeriod, m), eq(glEntries.isPosted, false)));

      if ((unposted[0]?.value ?? 0) > 0) {
        throw new Error(`期间 ${input.period} 尚有 ${unposted[0].value} 笔未过账凭证`);
      }

      // Mark period as closed (via a special checklist entry)
      const now = new Date().toISOString();
      await db.insert(periodCloseChecklists).values({
        fiscalYear: y,
        fiscalPeriod: m,
        checkItem: "结转损益",
        status: "completed",
        completedBy: ctx.user?.id ?? null,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      return { period: input.period, closedAt: now, closedBy: ctx.user?.id };
    }),

  // ────────────────── Finance Roles ──────────────────

  /**
   * 查询财务岗位分配
   */
  listRoleAssignments: protectedProcedure
    .query(async () => {
      const db = await requireDb();
      const items = await db.select().from(financeRoleAssignments)
        .where(eq(financeRoleAssignments.isActive, true))
        .orderBy(financeRoleAssignments.roleCode)
        .limit(100);
      return items;
    }),

  /**
   * 分配/更新财务岗位
   */
  assignRole: requirePermission("finance:role:manage")
    .input(z.object({
      id: z.number().optional(),
      roleCode: z.string(),
      roleName: z.string(),
      userId: z.number(),
      userName: z.string(),
      buCode: z.string().optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      log.info({ roleCode: input.roleCode, userId: input.userId, user: ctx.user?.id }, "assignRole");
      const now = new Date().toISOString();

      if (input.id) {
        const rows = await db.update(financeRoleAssignments)
          .set({
            userId: input.userId,
            userName: input.userName,
            isActive: input.isActive,
            updatedAt: now,
          })
          .where(eq(financeRoleAssignments.id, input.id))
          .returning();
        return rows[0] ?? null;
      }

      const rows = await db.insert(financeRoleAssignments).values({
        roleCode: input.roleCode,
        roleName: input.roleName,
        userId: input.userId,
        userName: input.userName,
        buCode: input.buCode ?? null,
        isActive: input.isActive,
        effectiveDate: now,
        assignedAt: now,
        updatedAt: now,
      }).returning();
      return rows[0] ?? null;
    }),

  /**
   * 根据金额+BU解析审批链
   */
  resolveApprovalChain: protectedProcedure
    .input(z.object({
      amount: z.number(),
      buCode: z.string().optional(),
      expenseType: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const chain = await resolveReimbursementChain(input.amount, input.buCode);
        return { chain, amount: input.amount, buCode: input.buCode };
      } catch (err) {
        log.error({ err, amount: input.amount }, "resolveApprovalChain error");
        return { chain: [], amount: input.amount, buCode: input.buCode, error: "无法解析审批链" };
      }
    }),

  // ────────────────── Three-Way Matching ──────────────────

  /**
   * 三单匹配（采购订单 / 收货单 / 发票）
   */
  checkMatch: protectedProcedure
    .input(z.object({
      poNumber: z.string(),
      poAmount: z.number(),
      poQuantity: z.number(),
      receiptNumber: z.string().optional(),
      receiptAmount: z.number().optional(),
      receiptQuantity: z.number().optional(),
      invoiceNumber: z.string().optional(),
      invoiceAmount: z.number().optional(),
      invoiceTaxAmount: z.number().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const matchInput: MatchInput = {
          poNumber: input.poNumber,
          poAmount: input.poAmount,
          poQuantity: input.poQuantity,
          receiptNumber: input.receiptNumber,
          receiptAmount: input.receiptAmount,
          receiptQuantity: input.receiptQuantity,
          invoiceNumber: input.invoiceNumber,
          invoiceAmount: input.invoiceAmount,
          invoiceTaxAmount: input.invoiceTaxAmount,
        };
        const result = performMatch(matchInput);
        return result;
      } catch (err) {
        log.error({ err, po: input.poNumber }, "checkMatch error");
        return { matched: false, errors: ["匹配服务异常"], poNumber: input.poNumber } as any;
      }
    }),

  /**
   * 批量三单匹配
   */
  batchCheckMatch: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        poNumber: z.string(),
        poAmount: z.number(),
        poQuantity: z.number(),
        receiptNumber: z.string().optional(),
        receiptAmount: z.number().optional(),
        receiptQuantity: z.number().optional(),
        invoiceNumber: z.string().optional(),
        invoiceAmount: z.number().optional(),
        invoiceTaxAmount: z.number().optional(),
      })).min(1).max(100),
    }))
    .query(async ({ input }) => {
      const results: any[] = [];
      for (const item of input.items) {
        try {
          const matchInput: MatchInput = {
            poNumber: item.poNumber,
            poAmount: item.poAmount,
            poQuantity: item.poQuantity,
            receiptNumber: item.receiptNumber,
            receiptAmount: item.receiptAmount,
            receiptQuantity: item.receiptQuantity,
            invoiceNumber: item.invoiceNumber,
            invoiceAmount: item.invoiceAmount,
            invoiceTaxAmount: item.invoiceTaxAmount,
          };
          const result = performMatch(matchInput);
          results.push(result);
        } catch (err) {
          results.push({ poNumber: item.poNumber, matched: false, errors: ["匹配服务异常"] });
        }
      }
      return { results, total: input.items.length, matchedCount: results.filter(r => r.canPay).length };
    }),

  // ────────────────── Dashboard ──────────────────

  /**
   * 总账仪表盘概览
   */
  getGLDashboard: protectedProcedure
    .query(async () => {
      const db = await requireDb();

      const [accountCount] = await db.select({ value: count() }).from(glAccounts).where(eq(glAccounts.isActive, true));
      const [unpostedCount] = await db.select({ value: count() }).from(glEntries).where(eq(glEntries.isPosted, false));
      const [assetCount] = await db.select({ value: count() }).from(fixedAssets).where(eq(fixedAssets.status, "active"));
      const [invoicePending] = await db.select({ value: count() }).from(taxInvoices).where(eq(taxInvoices.status, "draft"));

      // Current period (YYYY-MM)
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Period balance total
      const balanceResult = await db.select({
        totalDebit: sql<string>`COALESCE(SUM(CAST(${glEntries.debitAmount} AS DECIMAL(18,2))), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(CAST(${glEntries.creditAmount} AS DECIMAL(18,2))), 0)`,
      })
        .from(glEntries)
        .where(and(eq(glEntries.fiscalYear, currentYear), eq(glEntries.fiscalPeriod, currentMonth), eq(glEntries.isPosted, true)));

      return {
        totalAccounts: accountCount.value,
        unpostedEntries: unpostedCount.value,
        activeAssets: assetCount.value,
        pendingInvoices: invoicePending.value,
        currentPeriod,
        periodDebitTotal: Number(balanceResult[0]?.totalDebit ?? 0),
        periodCreditTotal: Number(balanceResult[0]?.totalCredit ?? 0),
      };
    }),
});
