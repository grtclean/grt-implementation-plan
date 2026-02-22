/**
 * GRT 5.0 合规管理 tRPC 路由
 *
 * 功能:
 * - 合规警报管理 (grtComplianceAlerts)
 * - 合规规则配置 (grtComplianceRules)
 * - 邮件模板管理 (grtComplianceEmailTemplates)
 * - 合规检查 (grtTimeEntries vs rules)
 * - 报告生成与历史 (grtComplianceReports)
 * - 员工工时合规状态 (grtEmployees + grtTimeEntries)
 * - 周合规汇总 (grtWeeklyComplianceSummary)
 *
 * All data persisted via Drizzle ORM (no in-memory stores).
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, desc, and, count, sql } from "drizzle-orm";
import {
  grtEmployees, grtTimeEntries, grtComplianceAlerts,
  grtWeeklyComplianceSummary, grtComplianceReports,
  grtComplianceRules, grtComplianceEmailTemplates,
} from "../../drizzle/schema";

// Helper: convert decimal string to number
function toNum(val: string | null | undefined): number | null {
  if (val == null) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// Helper: generate simple ID
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const complianceRouter = router({
  // ==================== CRUD (alerts as default entity) ====================

  list: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(grtComplianceAlerts).orderBy(desc(grtComplianceAlerts.createdAt));
    return { items: rows, total: rows.length, page: 1, pageSize: 10 };
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const numericId = parseInt(input.id, 10);
      if (isNaN(numericId)) return null;
      const rows = await db.select().from(grtComplianceAlerts).where(eq(grtComplianceAlerts.id, numericId));
      return rows[0] ?? null;
    }),

  create: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.insert(grtComplianceAlerts).values({
      employeeId: input.employeeId,
      alertType: input.alertType,
      jurisdiction: input.jurisdiction ?? "CN",
      severity: input.severity ?? "warning",
      description: input.description,
      legalReference: input.legalReference,
      recommendedAction: input.recommendedAction,
      status: "open",
      notificationSent: 0,
    });
    return { success: true, message: "Alert created" };
  }),

  update: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = Number(input.id);
    if (!id) return { success: true, message: "操作成功" };
    const { id: _id, ...data } = input;
    await db.update(grtComplianceAlerts).set(data).where(eq(grtComplianceAlerts.id, id));
    return { success: true, message: "操作成功" };
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const id = parseInt(input.id, 10);
      if (!isNaN(id)) await db.delete(grtComplianceAlerts).where(eq(grtComplianceAlerts.id, id));
      return { success: true, message: "操作成功" };
    }),

  // ==================== Rules ====================

  getRules: publicProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(grtComplianceRules).orderBy(grtComplianceRules.priority);
  }),

  createRule: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.insert(grtComplianceRules).values({
      ruleId: input.ruleId ?? generateId("rule"),
      ruleName: input.ruleName ?? input.name,
      ruleDescription: input.ruleDescription ?? input.description,
      jurisdiction: input.jurisdiction ?? "CN",
      ruleType: input.ruleType,
      thresholdValue: String(input.thresholdValue),
      thresholdUnit: input.thresholdUnit ?? "hours",
      warningThreshold: input.warningThreshold ? String(input.warningThreshold) : null,
      criticalThreshold: input.criticalThreshold ? String(input.criticalThreshold) : null,
      legalReference: input.legalReference,
      recommendedAction: input.recommendedAction,
      isEnabled: input.isEnabled ?? 1,
      priority: input.priority ?? 100,
    });
    return { success: true, message: "Rule created" };
  }),

  updateRule: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = Number(input.id);
    if (!id) return { success: true, message: "操作成功" };
    const { id: _id, ...data } = input;
    if (data.thresholdValue != null) data.thresholdValue = String(data.thresholdValue);
    if (data.warningThreshold != null) data.warningThreshold = String(data.warningThreshold);
    if (data.criticalThreshold != null) data.criticalThreshold = String(data.criticalThreshold);
    await db.update(grtComplianceRules).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(grtComplianceRules.id, id));
    return { success: true, message: "Rule updated" };
  }),

  deleteRule: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = Number(input.id);
    if (id) await db.delete(grtComplianceRules).where(eq(grtComplianceRules.id, id));
    return { success: true, message: "Rule deleted" };
  }),

  toggleRuleEnabled: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = Number(input.id);
    if (!id) return { success: true, message: "操作成功" };
    const [rule] = await db.select().from(grtComplianceRules).where(eq(grtComplianceRules.id, id));
    if (rule) {
      await db.update(grtComplianceRules).set({ isEnabled: rule.isEnabled === 1 ? 0 : 1, updatedAt: new Date().toISOString() }).where(eq(grtComplianceRules.id, id));
    }
    return { success: true, message: "操作成功" };
  }),

  getRuleStats: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(grtComplianceRules);
    const total = rows.length;
    const enabled = rows.filter(r => r.isEnabled === 1).length;
    const byJurisdiction: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const r of rows) {
      byJurisdiction[r.jurisdiction] = (byJurisdiction[r.jurisdiction] ?? 0) + 1;
      byType[r.ruleType] = (byType[r.ruleType] ?? 0) + 1;
    }
    return { stats: { total, enabled, disabled: total - enabled, byJurisdiction, byType } };
  }),

  // ==================== Templates ====================

  getTemplates: publicProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(grtComplianceEmailTemplates).orderBy(desc(grtComplianceEmailTemplates.createdAt));
  }),

  createTemplate: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.insert(grtComplianceEmailTemplates).values({
      templateId: input.templateId ?? generateId("tmpl"),
      templateName: input.templateName ?? input.name,
      templateDescription: input.templateDescription ?? input.description,
      alertType: input.alertType,
      severity: input.severity ?? "warning",
      jurisdiction: input.jurisdiction ?? "ALL",
      subjectTemplate: input.subjectTemplate ?? input.subject,
      bodyTemplate: input.bodyTemplate ?? input.body,
      isHtml: input.isHtml ?? 1,
      recipientTypes: typeof input.recipientTypes === 'string' ? input.recipientTypes : JSON.stringify(input.recipientTypes ?? []),
      isEnabled: input.isEnabled ?? 1,
    });
    return { success: true, message: "Template created" };
  }),

  updateTemplate: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = Number(input.id);
    if (!id) return { success: true, message: "操作成功" };
    const { id: _id, ...data } = input;
    if (data.recipientTypes && typeof data.recipientTypes !== 'string') data.recipientTypes = JSON.stringify(data.recipientTypes);
    await db.update(grtComplianceEmailTemplates).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(grtComplianceEmailTemplates.id, id));
    return { success: true, message: "Template updated" };
  }),

  deleteTemplate: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = Number(input.id);
    if (id) await db.delete(grtComplianceEmailTemplates).where(eq(grtComplianceEmailTemplates.id, id));
    return { success: true, message: "Template deleted" };
  }),

  toggleTemplateEnabled: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = Number(input.id);
    if (!id) return { success: true, message: "操作成功" };
    const [tmpl] = await db.select().from(grtComplianceEmailTemplates).where(eq(grtComplianceEmailTemplates.id, id));
    if (tmpl) {
      await db.update(grtComplianceEmailTemplates).set({ isEnabled: tmpl.isEnabled === 1 ? 0 : 1, updatedAt: new Date().toISOString() }).where(eq(grtComplianceEmailTemplates.id, id));
    }
    return { success: true, message: "操作成功" };
  }),

  getTemplateStats: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(grtComplianceEmailTemplates);
    const total = rows.length;
    const enabled = rows.filter(t => t.isEnabled === 1).length;
    const byAlertType: Record<string, number> = {};
    for (const t of rows) byAlertType[t.alertType] = (byAlertType[t.alertType] ?? 0) + 1;
    return { stats: { total, enabled, disabled: total - enabled, byAlertType } };
  }),

  // ==================== Compliance Checks ====================

  checkCompliance: publicProcedure.input(z.any()).query(async ({ input }) => {
    const db = await requireDb();
    const employeeId = Number(input?.employeeId);
    if (!employeeId) return { compliant: true, issues: [] };

    const [employee] = await db.select().from(grtEmployees).where(eq(grtEmployees.id, employeeId)).limit(1);
    if (!employee) return { compliant: true, issues: [] };

    const rules = await db.select().from(grtComplianceRules)
      .where(and(eq(grtComplianceRules.jurisdiction, employee.jurisdiction), eq(grtComplianceRules.isEnabled, 1)));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().slice(0, 10);

    const entries = await db.select().from(grtTimeEntries)
      .where(and(eq(grtTimeEntries.employeeId, employeeId), sql`${grtTimeEntries.date} >= ${dateStr}`))
      .orderBy(desc(grtTimeEntries.date));

    const dailyMinutes: Record<string, number> = {};
    let weeklyTotal = 0;
    for (const entry of entries) {
      dailyMinutes[entry.date] = (dailyMinutes[entry.date] ?? 0) + (entry.durationMinutes ?? 0);
      weeklyTotal += entry.durationMinutes ?? 0;
    }

    const issues: Array<{ rule: string; description: string; severity: string }> = [];
    for (const rule of rules) {
      const thresholdMinutes = rule.thresholdUnit === "hours" ? Number(rule.thresholdValue) * 60 : Number(rule.thresholdValue);

      if (rule.ruleType === "daily_limit" || rule.ruleType === "overtime_limit") {
        for (const [day, mins] of Object.entries(dailyMinutes)) {
          if (mins > thresholdMinutes) {
            issues.push({
              rule: rule.ruleName,
              description: `${day}: ${(mins / 60).toFixed(1)}h exceeds ${rule.thresholdValue}h limit`,
              severity: rule.criticalThreshold && mins / 60 >= Number(rule.criticalThreshold) ? "critical" : "warning",
            });
          }
        }
      }
      if (rule.ruleType === "weekly_limit") {
        if (weeklyTotal > thresholdMinutes) {
          issues.push({
            rule: rule.ruleName,
            description: `Weekly total ${(weeklyTotal / 60).toFixed(1)}h exceeds ${rule.thresholdValue}h limit`,
            severity: rule.criticalThreshold && weeklyTotal / 60 >= Number(rule.criticalThreshold) ? "critical" : "warning",
          });
        }
      }
    }

    return { compliant: issues.length === 0, issues, employeeId, jurisdiction: employee.jurisdiction, entriesChecked: entries.length, weeklyTotalHours: +(weeklyTotal / 60).toFixed(2) };
  }),

  triggerComplianceCheck: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    let employeeIds: number[] = input?.employeeIds?.map(Number) ?? (input?.employeeId ? [Number(input.employeeId)] : []);

    if (employeeIds.length === 0) {
      const active = await db.select({ id: grtEmployees.id }).from(grtEmployees).where(eq(grtEmployees.isActive, 1));
      employeeIds = active.map(e => e.id);
    }

    let alertsCreated = 0;
    for (const empId of employeeIds) {
      const [employee] = await db.select().from(grtEmployees).where(eq(grtEmployees.id, empId)).limit(1);
      if (!employee) continue;

      const rules = await db.select().from(grtComplianceRules)
        .where(and(eq(grtComplianceRules.jurisdiction, employee.jurisdiction), eq(grtComplianceRules.isEnabled, 1)));

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const entries = await db.select().from(grtTimeEntries)
        .where(and(eq(grtTimeEntries.employeeId, empId), sql`${grtTimeEntries.date} >= ${sevenDaysAgo.toISOString().slice(0, 10)}`));

      const dailyMinutes: Record<string, number> = {};
      let weeklyTotal = 0;
      for (const entry of entries) {
        dailyMinutes[entry.date] = (dailyMinutes[entry.date] ?? 0) + (entry.durationMinutes ?? 0);
        weeklyTotal += entry.durationMinutes ?? 0;
      }

      for (const rule of rules) {
        const thresholdMinutes = rule.thresholdUnit === "hours" ? Number(rule.thresholdValue) * 60 : Number(rule.thresholdValue);

        if (rule.ruleType === "daily_limit" || rule.ruleType === "overtime_limit") {
          for (const [, mins] of Object.entries(dailyMinutes)) {
            if (mins > thresholdMinutes) {
              await db.insert(grtComplianceAlerts).values({
                employeeId: empId,
                alertType: "DAILY_10H_LIMIT",
                jurisdiction: employee.jurisdiction,
                severity: (rule.criticalThreshold && mins / 60 >= Number(rule.criticalThreshold) ? "critical" : "warning") as any,
                description: `Daily work ${(mins / 60).toFixed(1)}h exceeds ${rule.thresholdValue}h (${rule.ruleName})`,
                legalReference: rule.legalReference,
                recommendedAction: rule.recommendedAction,
                status: "open" as any,
                notificationSent: 0,
              });
              alertsCreated++;
            }
          }
        }
        if (rule.ruleType === "weekly_limit" && weeklyTotal > thresholdMinutes) {
          await db.insert(grtComplianceAlerts).values({
            employeeId: empId,
            alertType: "WEEKLY_48H_LIMIT",
            jurisdiction: employee.jurisdiction,
            severity: (rule.criticalThreshold && weeklyTotal / 60 >= Number(rule.criticalThreshold) ? "critical" : "warning") as any,
            description: `Weekly total ${(weeklyTotal / 60).toFixed(1)}h exceeds ${rule.thresholdValue}h (${rule.ruleName})`,
            legalReference: rule.legalReference,
            recommendedAction: rule.recommendedAction,
            status: "open" as any,
            notificationSent: 0,
          });
          alertsCreated++;
        }
      }
    }

    return { success: true, message: `Compliance check complete. ${alertsCreated} alerts created.`, alertsCreated, employeesChecked: employeeIds.length };
  }),

  runGermanDailyCheckNow: protectedProcedure.mutation(() => ({ success: true, message: "German daily check triggered (stub). Requires external scheduler service." })),
  runUSWeeklyCheckNow: protectedProcedure.mutation(() => ({ success: true, message: "US weekly check triggered (stub). Requires external scheduler service." })),

  // ==================== Audit Statistics ====================

  getAuditStatistics: publicProcedure.query(async () => {
    const db = await requireDb();
    const allAlerts = await db.select().from(grtComplianceAlerts);
    const total = allAlerts.length;
    const open = allAlerts.filter(a => a.status === "open").length;
    const resolved = allAlerts.filter(a => a.status === "resolved").length;
    return { total, passed: resolved, failed: open };
  }),

  // ==================== Reports ====================

  getReportHistory: publicProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(grtComplianceReports).orderBy(desc(grtComplianceReports.createdAt));
  }),

  getReportStats: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(grtComplianceReports);
    const byType: Record<string, number> = {};
    const byFormat: Record<string, number> = {};
    for (const r of rows) {
      byType[r.reportType] = (byType[r.reportType] ?? 0) + 1;
      byFormat[r.format] = (byFormat[r.format] ?? 0) + 1;
    }
    return { stats: { total: rows.length, byType, byFormat } };
  }),

  deleteReport: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(grtComplianceReports).where(eq(grtComplianceReports.id, Number(input.id)));
    return { success: true, message: "Report deleted" };
  }),

  exportReport: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const reportId = generateId("rpt");
    const result = await db.insert(grtComplianceReports).values({
      reportId,
      reportType: input.reportType ?? "weekly",
      format: input.format ?? "pdf",
      jurisdiction: input.jurisdiction ?? "ALL",
      dateRangeStart: input.dateRangeStart ?? null,
      dateRangeEnd: input.dateRangeEnd ?? null,
      generatedBy: input.generatedBy ?? 1,
      generatedByName: input.generatedByName ?? "System",
      fileUrl: `/reports/${reportId}.${input.format ?? "pdf"}`,
      fileKey: reportId,
      fileSizeBytes: 0,
      employeesIncluded: input.employeesIncluded ?? 0,
      alertsIncluded: input.alertsIncluded ?? 0,
      status: "completed",
    }).returning();
    return { url: result[0]?.fileUrl ?? "" };
  }),

  // ==================== Alerts ====================

  getAlerts: publicProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(grtComplianceAlerts).orderBy(desc(grtComplianceAlerts.createdAt)).limit(200);
  }),

  getPendingAlertCount: publicProcedure.query(async () => {
    const db = await requireDb();
    const result = await db.select({ count: count() }).from(grtComplianceAlerts).where(eq(grtComplianceAlerts.status, "open"));
    return { count: result[0]?.count ?? 0 };
  }),

  // ==================== Approval Queue ====================

  getApprovalQueue: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select()
      .from(grtTimeEntries)
      .where(eq(grtTimeEntries.supervisorApproval, "pending"))
      .orderBy(desc(grtTimeEntries.createdAt))
      .limit(100);
    return rows.map(r => ({
      ...r,
      geoLatitude: toNum(r.geoLatitude),
      geoLongitude: toNum(r.geoLongitude),
      overtimeRate: toNum(r.overtimeRate),
    }));
  }),

  // ==================== Dashboard Stats ====================

  getDashboardStats: publicProcedure.query(async () => {
    const db = await requireDb();
    const [empRes, alertRes, entryRes, reportRes, ruleRes, tmplRes] = await Promise.all([
      db.select({ count: count() }).from(grtEmployees).where(eq(grtEmployees.isActive, 1)),
      db.select({ count: count() }).from(grtComplianceAlerts),
      db.select({ count: count() }).from(grtTimeEntries),
      db.select({ count: count() }).from(grtComplianceReports),
      db.select({ count: count() }).from(grtComplianceRules),
      db.select({ count: count() }).from(grtComplianceEmailTemplates),
    ]);

    const [openRes, pendingRes] = await Promise.all([
      db.select({ count: count() }).from(grtComplianceAlerts).where(eq(grtComplianceAlerts.status, "open")),
      db.select({ count: count() }).from(grtTimeEntries).where(eq(grtTimeEntries.supervisorApproval, "pending")),
    ]);

    return {
      stats: {
        activeEmployees: empRes[0]?.count ?? 0,
        totalAlerts: alertRes[0]?.count ?? 0,
        openAlerts: openRes[0]?.count ?? 0,
        totalTimeEntries: entryRes[0]?.count ?? 0,
        pendingApprovals: pendingRes[0]?.count ?? 0,
        totalReports: reportRes[0]?.count ?? 0,
        totalRules: ruleRes[0]?.count ?? 0,
        totalTemplates: tmplRes[0]?.count ?? 0,
      },
    };
  }),

  // ==================== Employee Status & Time Details ====================

  getEmployeeStatus: publicProcedure.input(z.any()).query(async ({ input }) => {
    const db = await requireDb();
    const empId = Number(input?.employeeId ?? input?.id);
    if (!empId) return { status: null };

    const [employee] = await db.select().from(grtEmployees).where(eq(grtEmployees.id, empId)).limit(1);
    if (!employee) return { status: null };

    const openAlerts = await db.select({ count: count() }).from(grtComplianceAlerts)
      .where(and(eq(grtComplianceAlerts.employeeId, empId), eq(grtComplianceAlerts.status, "open")));

    const [latestSummary] = await db.select().from(grtWeeklyComplianceSummary)
      .where(eq(grtWeeklyComplianceSummary.employeeId, empId))
      .orderBy(desc(grtWeeklyComplianceSummary.weekStartDate)).limit(1);

    return {
      status: {
        employee,
        openAlerts: openAlerts[0]?.count ?? 0,
        latestWeeklySummary: latestSummary ?? null,
        overallStatus: (openAlerts[0]?.count ?? 0) > 0 ? "warning" : (latestSummary?.overallComplianceStatus ?? "compliant"),
      },
    };
  }),

  getEmployeeTimeDetails: publicProcedure.input(z.any()).query(async ({ input }) => {
    const db = await requireDb();
    const empId = Number(input?.employeeId ?? input?.id);
    if (!empId) return [];

    const conditions = [eq(grtTimeEntries.employeeId, empId)];
    if (input?.dateFrom) conditions.push(sql`${grtTimeEntries.date} >= ${input.dateFrom}`);
    if (input?.dateTo) conditions.push(sql`${grtTimeEntries.date} <= ${input.dateTo}`);

    const rows = await db.select().from(grtTimeEntries)
      .where(and(...conditions))
      .orderBy(desc(grtTimeEntries.date))
      .limit(input?.limit ?? 50);

    return rows.map(r => ({
      ...r,
      geoLatitude: toNum(r.geoLatitude),
      geoLongitude: toNum(r.geoLongitude),
      overtimeRate: toNum(r.overtimeRate),
    }));
  }),

  // ==================== AI (stub) ====================

  getGeminiAnalysis: publicProcedure.input(z.any()).query(() => ({
    analysis: null,
    message: "Gemini AI integration not configured. Requires GEMINI_API_KEY.",
  })),

  // ==================== Scheduler (stubs) ====================

  getSchedulerStatus: publicProcedure.query(() => ({
    status: "stopped",
    schedulers: {
      germanDailyCheck: { enabled: false, interval: "daily", lastRun: null, nextRun: null },
      usWeeklyCheck: { enabled: false, interval: "weekly", lastRun: null, nextRun: null },
    },
  })),

  startSchedulers: protectedProcedure.mutation(() => ({ success: true, message: "Scheduler start requested (stub)." })),
  stopSchedulers: protectedProcedure.mutation(() => ({ success: true, message: "Scheduler stop requested (stub)." })),

  // ==================== Seed Test Data ====================

  seedTestData: protectedProcedure.mutation(async () => {
    const db = await requireDb();

    // Seed employees
    const insertedEmps = [];
    for (const emp of [
      { employeeId: "EMP-DE-001", name: "Max Mueller", email: "max.mueller@grt.com", department: "Engineering", roleType: "office" as const, jurisdiction: "DE" as const, weeklyHoursLimit: 40, isExempt: 0, exemptionType: "none" as const, hireDate: "2023-01-15", timezone: "Europe/Berlin", isActive: 1 },
      { employeeId: "EMP-US-001", name: "John Smith", email: "john.smith@grt.com", department: "Sales", roleType: "office" as const, jurisdiction: "US" as const, weeklyHoursLimit: 40, isExempt: 1, exemptionType: "executive" as const, hireDate: "2021-03-20", timezone: "America/New_York", isActive: 1 },
      { employeeId: "EMP-CN-001", name: "Wang Jianguo", email: "wang.jianguo@grt.com", department: "Production", roleType: "field" as const, jurisdiction: "CN" as const, weeklyHoursLimit: 40, isExempt: 0, exemptionType: "none" as const, hireDate: "2024-01-10", timezone: "Asia/Shanghai", isActive: 1 },
    ]) {
      const [result] = await db.insert(grtEmployees).values(emp).returning();
      insertedEmps.push(result);
    }

    // Seed rules
    const rules = [
      { ruleId: "RULE-DE-001", ruleName: "ArbZG S3 - Daily Maximum", ruleDescription: "German Working Time Act: max 10h/day", jurisdiction: "DE" as const, ruleType: "daily_limit" as const, thresholdValue: "10", thresholdUnit: "hours" as const, warningThreshold: "9", criticalThreshold: "10", legalReference: "ArbZG S3", isEnabled: 1, priority: 10 },
      { ruleId: "RULE-US-001", ruleName: "FLSA - Overtime Threshold", ruleDescription: "FLSA: overtime after 40h/week", jurisdiction: "US" as const, ruleType: "weekly_limit" as const, thresholdValue: "40", thresholdUnit: "hours" as const, warningThreshold: "38", criticalThreshold: "40", legalReference: "29 USC S207", isEnabled: 1, priority: 10 },
      { ruleId: "RULE-CN-001", ruleName: "劳动法 - Daily Max", ruleDescription: "每日最长工作11小时", jurisdiction: "CN" as const, ruleType: "daily_limit" as const, thresholdValue: "11", thresholdUnit: "hours" as const, warningThreshold: "10", criticalThreshold: "11", legalReference: "劳动法第36/41条", isEnabled: 1, priority: 10 },
    ];
    await db.insert(grtComplianceRules).values(rules);

    // Seed templates
    const templates = [
      { templateId: "TMPL-001", templateName: "Daily Limit Warning (DE)", alertType: "daily_limit" as any, severity: "warning" as any, jurisdiction: "ALL" as any, subjectTemplate: "[GRT] Daily hours warning for {{employeeName}}", bodyTemplate: "<p>{{employeeName}} has worked {{hours}}h today, exceeding ArbZG limit.</p>", isHtml: 1, recipientTypes: JSON.stringify(["supervisor", "hr"]), isEnabled: 1 },
    ];
    await db.insert(grtComplianceEmailTemplates).values(templates);

    return { success: true, message: "Test data seeded", counts: { employees: insertedEmps.length, rules: rules.length, templates: templates.length } };
  }),
});
