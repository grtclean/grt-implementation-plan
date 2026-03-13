/**
 * Security & Compliance Router — 安全防线闭环 tRPC 路由
 *
 * 审计 API:
 *   logAuditEvent          — 异步记录敏感操作 (fire-and-forget, 不阻塞业务)
 *   getAuditLogs           — 查询审计日志 (总裁办/管理员)
 *   getAuditStats          — 今日审计统计仪表板数据
 *
 * 承诺书:
 *   checkMonthlyCommitment — 检查当月是否已签署
 *   signCommitment         — 签署月度自律承诺书
 *
 * 举报箱:
 *   submitReport           — 提交举报 (匿名)
 *   getReports             — 查看举报列表 (总裁办)
 *   updateReportStatus     — 更新举报处理状态 (总裁办)
 *
 * 水印:
 *   getSecureDocument      — 签发带水印元数据的文档下载凭证
 */
import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  securityAuditLogs,
  whistleblowerReports,
  complianceCommitments,
} from "../../drizzle/security-compliance-schema";
import { eq, and, desc, sql, SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("security-compliance");

// ── Idempotent DDL ──────────────────────────────────────────
let tablesEnsured = false;

async function ensureTables() {
  if (tablesEnsured) return;
  try {
    const db = await requireDb();

    // Enums
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE audit_action_type AS ENUM (
          'LOGIN','LOGOUT','DOWNLOAD_CAD','DOWNLOAD_BOM','DOWNLOAD_PDF',
          'EXPORT_DATA','UNAUTHORIZED_ACCESS','PERMISSION_ESCALATION',
          'BULK_QUERY','SENSITIVE_VIEW','CONFIG_CHANGE','DATA_DELETE',
          'API_KEY_ACCESS','AFTER_HOURS_ACCESS'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE report_status AS ENUM ('PENDING','INVESTIGATING','RESOLVED','DISMISSED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // security_audit_logs
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        user_name VARCHAR(200),
        action_type audit_action_type NOT NULL,
        resource_type VARCHAR(100),
        resource_id VARCHAR(200),
        resource_name VARCHAR(500),
        ip_address VARCHAR(45),
        user_agent VARCHAR(500),
        metadata JSONB,
        risk_level VARCHAR(20) DEFAULT 'low',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sal_user_idx ON security_audit_logs (user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sal_action_idx ON security_audit_logs (action_type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sal_created_idx ON security_audit_logs (created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sal_risk_idx ON security_audit_logs (risk_level)`);

    // whistleblower_reports
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS whistleblower_reports (
        id SERIAL PRIMARY KEY,
        encrypted_content TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        is_anonymous BOOLEAN DEFAULT true NOT NULL,
        reporter_id INTEGER,
        target_name VARCHAR(200),
        status report_status DEFAULT 'PENDING' NOT NULL,
        investigation_notes TEXT,
        handled_by VARCHAR(200),
        handled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS wr_status_idx ON whistleblower_reports (status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS wr_created_idx ON whistleblower_reports (created_at)`);

    // compliance_commitments
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS compliance_commitments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_name VARCHAR(200),
        period VARCHAR(7) NOT NULL,
        is_agreed BOOLEAN DEFAULT false NOT NULL,
        signed_at TIMESTAMP,
        signed_from_ip VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS cc_user_period_idx ON compliance_commitments (user_id, period)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS cc_period_idx ON compliance_commitments (period)`);

    tablesEnsured = true;
    log.info("[SecurityCompliance] Tables ensured");
  } catch (err) {
    log.warn({ err }, "[SecurityCompliance] ensureTables failed");
  }
}

// ── Helper: current period string ────────────────────────────
function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════
// Router
// ═══════════════════════════════════════════════════════════

export const securityComplianceRouter = router({

  // ──────────────────────────────────────────────────────────
  //  审计 API
  // ──────────────────────────────────────────────────────────

  /** 异步记录敏感操作 — fire-and-forget, 不阻塞调用方 */
  logAuditEvent: protectedProcedure
    .input(z.object({
      actionType: z.enum([
        "LOGIN", "LOGOUT", "DOWNLOAD_CAD", "DOWNLOAD_BOM", "DOWNLOAD_PDF",
        "EXPORT_DATA", "UNAUTHORIZED_ACCESS", "PERMISSION_ESCALATION",
        "BULK_QUERY", "SENSITIVE_VIEW", "CONFIG_CHANGE", "DATA_DELETE",
        "API_KEY_ACCESS", "AFTER_HOURS_ACCESS",
      ]),
      resourceType: z.string().max(100).optional(),
      resourceId: z.string().max(200).optional(),
      resourceName: z.string().max(500).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();

      // Determine risk level
      const highRiskActions = ["UNAUTHORIZED_ACCESS", "PERMISSION_ESCALATION", "DATA_DELETE", "AFTER_HOURS_ACCESS"];
      const medRiskActions = ["DOWNLOAD_CAD", "DOWNLOAD_BOM", "EXPORT_DATA", "BULK_QUERY", "API_KEY_ACCESS"];
      let riskLevel = "low";
      if (highRiskActions.includes(input.actionType)) riskLevel = "high";
      else if (medRiskActions.includes(input.actionType)) riskLevel = "medium";

      // Check after-hours access (22:00 - 06:00)
      const hour = new Date().getHours();
      if (hour >= 22 || hour < 6) riskLevel = "high";

      // Fire-and-forget: async insert, never block the caller
      const db = await requireDb();
      db.insert(securityAuditLogs).values({
        userId: ctx.user.id,
        userName: ctx.user.name ?? null,
        actionType: input.actionType,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        resourceName: input.resourceName ?? null,
        ipAddress: null, // populated by gateway middleware if available
        metadata: input.metadata ?? null,
        riskLevel,
      }).then(() => {
        log.debug({ action: input.actionType, userId: ctx.user.id }, "Audit event logged");
      }).catch((err: unknown) => {
        log.error({ err, action: input.actionType }, "Failed to log audit event");
      });

      return { success: true };
    }),

  /** 查询审计日志 (总裁办/管理员) */
  getAuditLogs: requirePermission("system:security:audit")
    .input(z.object({
      actionType: z.string().optional(),
      riskLevel: z.string().optional(),
      userId: z.number().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().min(1).max(500).default(50),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const conditions: SQL[] = [];
      if (input?.actionType) conditions.push(sql`action_type = ${input.actionType}`);
      if (input?.riskLevel) conditions.push(sql`risk_level = ${input.riskLevel}`);
      if (input?.userId) conditions.push(sql`user_id = ${input.userId}`);
      if (input?.dateFrom) conditions.push(sql`created_at >= ${input.dateFrom}`);
      if (input?.dateTo) conditions.push(sql`created_at <= ${input.dateTo}`);

      const whereClause = conditions.length > 0
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``;

      const result = await db.execute(sql`
        SELECT id, user_id, user_name, action_type, resource_type,
               resource_id, resource_name, ip_address, metadata,
               risk_level, created_at
        FROM security_audit_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${input?.limit ?? 50}
      `);

      return (result.rows as Record<string, unknown>[]).map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        actionType: r.action_type,
        resourceType: r.resource_type,
        resourceId: r.resource_id,
        resourceName: r.resource_name,
        ipAddress: r.ip_address,
        metadata: r.metadata,
        riskLevel: r.risk_level,
        createdAt: r.created_at,
      }));
    }),

  /** 今日审计统计 — 仪表板数据 */
  getAuditStats: requirePermission("system:security:audit")
    .query(async () => {
      await ensureTables();
      const db = await requireDb();

      const result = await db.execute(sql`
        SELECT
          COUNT(*)::int AS total_events,
          COUNT(*) FILTER (WHERE risk_level = 'high')::int AS high_risk_count,
          COUNT(*) FILTER (WHERE risk_level = 'medium')::int AS medium_risk_count,
          COUNT(DISTINCT user_id)::int AS unique_users,
          COUNT(*) FILTER (WHERE action_type = 'UNAUTHORIZED_ACCESS')::int AS unauthorized_count,
          COUNT(*) FILTER (WHERE action_type = 'AFTER_HOURS_ACCESS')::int AS after_hours_count,
          COUNT(*) FILTER (WHERE action_type IN ('DOWNLOAD_CAD','DOWNLOAD_BOM','DOWNLOAD_PDF','EXPORT_DATA'))::int AS download_count
        FROM security_audit_logs
        WHERE created_at >= CURRENT_DATE
      `);

      const row = (result.rows[0] ?? {}) as Record<string, number>;
      return {
        totalEvents: row.total_events ?? 0,
        highRiskCount: row.high_risk_count ?? 0,
        mediumRiskCount: row.medium_risk_count ?? 0,
        uniqueUsers: row.unique_users ?? 0,
        unauthorizedCount: row.unauthorized_count ?? 0,
        afterHoursCount: row.after_hours_count ?? 0,
        downloadCount: row.download_count ?? 0,
      };
    }),

  /** 高危事件列表 (今日) */
  getTodayHighRiskEvents: requirePermission("system:security:audit")
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const result = await db.execute(sql`
        SELECT id, user_id, user_name, action_type, resource_type,
               resource_name, metadata, risk_level, created_at
        FROM security_audit_logs
        WHERE created_at >= CURRENT_DATE AND risk_level IN ('high', 'medium')
        ORDER BY
          CASE risk_level WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
          created_at DESC
        LIMIT ${input?.limit ?? 20}
      `);
      return (result.rows as Record<string, unknown>[]).map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        actionType: r.action_type,
        resourceType: r.resource_type,
        resourceName: r.resource_name,
        metadata: r.metadata,
        riskLevel: r.risk_level,
        createdAt: r.created_at,
      }));
    }),

  // ──────────────────────────────────────────────────────────
  //  承诺书 API
  // ──────────────────────────────────────────────────────────

  /** 检查当月承诺书签署状态 */
  checkMonthlyCommitment: protectedProcedure
    .query(async ({ ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const period = currentPeriod();

      const [record] = await db.select()
        .from(complianceCommitments)
        .where(and(
          eq(complianceCommitments.userId, ctx.user.id),
          eq(complianceCommitments.period, period),
          eq(complianceCommitments.isAgreed, true),
        ))
        .limit(1);

      return {
        signed: !!record,
        period,
        signedAt: record?.signedAt ?? null,
      };
    }),

  /** 签署月度自律承诺书 */
  signCommitment: protectedProcedure
    .input(z.object({
      isAgreed: z.literal(true),
    }))
    .mutation(async ({ ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const period = currentPeriod();
      const now = new Date().toISOString();

      // Check if already signed
      const [existing] = await db.select()
        .from(complianceCommitments)
        .where(and(
          eq(complianceCommitments.userId, ctx.user.id),
          eq(complianceCommitments.period, period),
        ))
        .limit(1);

      if (existing?.isAgreed) {
        return { success: true, alreadySigned: true, period };
      }

      if (existing) {
        // Update existing record
        await db.update(complianceCommitments)
          .set({ isAgreed: true, signedAt: now, userName: ctx.user.name ?? null })
          .where(eq(complianceCommitments.id, existing.id));
      } else {
        // Create new record
        await db.insert(complianceCommitments).values({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          period,
          isAgreed: true,
          signedAt: now,
        });
      }

      log.info({ userId: ctx.user.id, period }, "Compliance commitment signed");
      return { success: true, alreadySigned: false, period };
    }),

  /** 承诺书签署统计 (总裁办) */
  getCommitmentStats: requirePermission("system:security:audit")
    .input(z.object({ period: z.string().max(7).optional() }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();
      const period = input?.period ?? currentPeriod();

      const result = await db.execute(sql`
        SELECT
          COUNT(*)::int AS total_signed,
          COUNT(*) FILTER (WHERE is_agreed = true)::int AS agreed_count
        FROM compliance_commitments
        WHERE period = ${period}
      `);

      const row = (result.rows[0] ?? {}) as Record<string, number>;
      return {
        period,
        totalSigned: row.total_signed ?? 0,
        agreedCount: row.agreed_count ?? 0,
      };
    }),

  // ──────────────────────────────────────────────────────────
  //  举报箱 API
  // ──────────────────────────────────────────────────────────

  /** 提交举报 (可匿名) */
  submitReport: protectedProcedure
    .input(z.object({
      /**
       * RSA-OAEP 加密后的举报内容 (Base64 字符串)。
       * 前端使用总裁办公开的 RSA 公钥加密,
       * 仅持有 RSA 私钥的总裁办成员可解密阅读。
       */
      encryptedContent: z.string().min(1).max(100_000),
      category: z.enum(["信息泄露", "贪腐", "违规操作", "职场欺凌", "其他"]),
      isAnonymous: z.boolean().default(true),
      targetName: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();

      const [report] = await db.insert(whistleblowerReports).values({
        encryptedContent: input.encryptedContent,
        category: input.category,
        isAnonymous: input.isAnonymous,
        reporterId: input.isAnonymous ? null : ctx.user.id,
        targetName: input.targetName ?? null,
        status: "PENDING",
      }).returning();

      log.info({ reportId: report.id, category: input.category, anonymous: input.isAnonymous },
        "Whistleblower report submitted");

      return { success: true, reportId: report.id };
    }),

  /** 查看举报列表 (总裁办) */
  getReports: requirePermission("system:security:audit")
    .input(z.object({
      status: z.enum(["PENDING", "INVESTIGATING", "RESOLVED", "DISMISSED"]).optional(),
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const conditions: SQL[] = [];
      if (input?.status) conditions.push(sql`status = ${input.status}`);

      const whereClause = conditions.length > 0
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``;

      const result = await db.execute(sql`
        SELECT id, category, is_anonymous, target_name, status,
               investigation_notes, handled_by, handled_at, created_at
        FROM whistleblower_reports
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${input?.limit ?? 20}
      `);

      // NOTE: encrypted_content is NOT returned in list view — only via dedicated decrypt endpoint
      return (result.rows as Record<string, unknown>[]).map(r => ({
        id: r.id,
        category: r.category,
        isAnonymous: r.is_anonymous,
        targetName: r.target_name,
        status: r.status,
        investigationNotes: r.investigation_notes,
        handledBy: r.handled_by,
        handledAt: r.handled_at,
        createdAt: r.created_at,
      }));
    }),

  /** 更新举报处理状态 (总裁办) */
  updateReportStatus: requirePermission("system:security:audit")
    .input(z.object({
      reportId: z.number(),
      status: z.enum(["INVESTIGATING", "RESOLVED", "DISMISSED"]),
      investigationNotes: z.string().max(5000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();

      await db.update(whistleblowerReports)
        .set({
          status: input.status,
          investigationNotes: input.investigationNotes ?? null,
          handledBy: ctx.user.name ?? String(ctx.user.id),
          handledAt: new Date().toISOString(),
        })
        .where(eq(whistleblowerReports.id, input.reportId));

      log.info({ reportId: input.reportId, status: input.status }, "Whistleblower report updated");
      return { success: true };
    }),

  // ──────────────────────────────────────────────────────────
  //  水印签发
  // ──────────────────────────────────────────────────────────

  /**
   * 签发安全文档下载凭证 — 包含水印元数据
   * 前端渲染层必须叠加半透明水印: userId + 时间戳
   */
  getSecureDocument: requirePermission("rnd:solutions:manage")
    .input(z.object({
      documentId: z.string().max(200),
      documentType: z.enum(["CAD", "PDF", "BOM", "DRAWING"]),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();

      const watermarkText = `${ctx.user.name ?? ctx.user.id} | ${new Date().toISOString()}`;
      const watermarkToken = Buffer.from(JSON.stringify({
        userId: ctx.user.id,
        userName: ctx.user.name,
        timestamp: new Date().toISOString(),
        documentId: input.documentId,
        documentType: input.documentType,
      })).toString("base64");

      // Fire-and-forget audit log
      const db = await requireDb();
      db.insert(securityAuditLogs).values({
        userId: ctx.user.id,
        userName: ctx.user.name ?? null,
        actionType: input.documentType === "CAD" ? "DOWNLOAD_CAD"
          : input.documentType === "PDF" ? "DOWNLOAD_PDF"
          : "DOWNLOAD_BOM",
        resourceType: "document",
        resourceId: input.documentId,
        riskLevel: "medium",
      }).then(() => {
        log.debug({ documentId: input.documentId }, "Document download audit logged");
      }).catch((err: unknown) => {
        log.error({ err }, "Failed to log document download audit");
      });

      log.info({ documentId: input.documentId, userId: ctx.user.id }, "Secure document watermark issued");

      return {
        watermarkText,
        watermarkToken,
        watermarkStyle: {
          opacity: 0.15,
          fontSize: "14px",
          color: "#000",
          rotation: -30,
          repeat: true,
        },
      };
    }),
});
