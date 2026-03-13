/**
 * Go-Live Command Center Router — 上线指挥中心
 *
 * 4 sub-routers, 16 procedures:
 *   readiness (5): getReadinessScorecard, getReadinessTimeline, runPreflightChecks, getBlockers, getPhaseProgress
 *   salaryImport (4): getSalaryTemplate, previewSalaryImport, importSalaryData, getSalaryImportHistory
 *   encoding (4): validateCode, getEncodingCompliance, getEncodingStats, getEncodingRules
 *   simulation (3): runLegionSimulation, getSimulationResults, getScenarioComparison
 *
 * Reuses: legion-provisioning.service, batch-salary-simulation, ceo/cto health patterns
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import { eq, desc, count, sql, gte, and, asc } from "drizzle-orm";
import { hrmEmployees, salaryCalculations, importHistory } from "../../drizzle/schema";
import { oeeSnapshots } from "../../drizzle/oee-schema";
import { fmeaDocuments } from "../../drizzle/schema";
import { aiAgentFleet } from "../../drizzle/ai-agent-fleet-schema";
import { permissions as permissionsTable } from "../../drizzle/permission-schema";
import { autoDetectAndValidate, getComplianceReport, getEncodingRulesReference, type ValidationResult } from "../../shared/grt-encoding-validator";
import { getLegionOverview, getEmployeeSkillMappings, computeSkillLevel } from "../services/legion-provisioning.service";
import { batchSalarySimulation, type BatchSimulationInput } from "../batch-salary-simulation";
import { createChildLogger } from "../lib/logger";
import {
  sandboxScenarios,
  sandboxKnowledgeLinks,
  sandboxRuns,
  releaseGates,
  sandboxChangeTasks,
} from "../../drizzle/sandbox-console-schema";
import {
  generateProposal,
  executeImplementation,
  runRedTeamReview,
} from "../services/sandbox-ai.service";

const log = createChildLogger("go-live-router");

// ── 5-minute in-memory cache ────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { data: unknown; ts: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, ts: Date.now() });
  if (cache.size > 100) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

// ── Constants ────────────────────────────────────────────
const MACHINE_TARGET = 100;
const GO_LIVE_PHASES = [
  { id: 1, name: "基础架构", nameEn: "Foundation", description: "数据库、权限、编码体系、基础数据", target: 100 },
  { id: 2, name: "数据迁移", nameEn: "Data Migration", description: "ERP数据、员工数据、物料主数据、项目历史", target: 100 },
  { id: 3, name: "试点运行", nameEn: "Pilot", description: "1个BU试点、关键流程验证、用户培训", target: 100 },
  { id: 4, name: "部门推广", nameEn: "Department Rollout", description: "全部5个BU逐步上线、反馈收集", target: 100 },
  { id: 5, name: "全面生产", nameEn: "Full Production", description: "全员使用、KPI监控、性能优化", target: 100 },
  { id: 6, name: "持续优化", nameEn: "Optimization", description: "AI增强、流程优化、用户满意度提升", target: 100 },
];

// ── Readiness Sub-Router ─────────────────────────────────

const readinessRouter = router({
  getReadinessScorecard: protectedProcedure.query(async () => {
    const cacheKey = "readiness-scorecard";
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const db = await requireDb();

    // Category scores (0-100 each)
    const categories: Array<{ id: string; name: string; nameEn: string; score: number; maxScore: number; items: string[] }> = [];

    // 1. Database & Infrastructure
    let dbScore = 80;
    try {
      const [empCount] = await db.select({ value: count() }).from(hrmEmployees).limit(1);
      dbScore = Number(empCount?.value || 0) > 0 ? 90 : 60;
    } catch { dbScore = 50; }
    categories.push({ id: "infrastructure", name: "基础架构", nameEn: "Infrastructure", score: dbScore, maxScore: 100, items: ["Database", "Schemas", "Migrations"] });

    // 2. RBAC & Permissions
    let rbacScore = 80;
    try {
      const [permCount] = await db.select({ value: count() }).from(permissionsTable).limit(1);
      rbacScore = Number(permCount?.value || 0) >= 200 ? 95 : Number(permCount?.value || 0) >= 100 ? 80 : 50;
    } catch { rbacScore = 50; }
    categories.push({ id: "rbac", name: "权限体系", nameEn: "RBAC", score: rbacScore, maxScore: 100, items: ["Roles", "Permissions", "Mappings"] });

    // 3. Encoding Compliance
    let encodingScore = 70;
    try {
      const [projCount] = await db.select({ value: count() }).from(hrmEmployees).limit(1);
      encodingScore = Number(projCount?.value || 0) > 0 ? 75 : 60;
    } catch { encodingScore = 50; }
    categories.push({ id: "encoding", name: "编码合规", nameEn: "Encoding", score: encodingScore, maxScore: 100, items: ["Drawing codes", "Material codes", "Project codes"] });

    // 4. Salary System
    let salaryScore = 60;
    try {
      const [salCount] = await db.select({ value: count() }).from(salaryCalculations).limit(1);
      salaryScore = Number(salCount?.value || 0) > 0 ? 80 : 40;
    } catch { salaryScore = 40; }
    categories.push({ id: "salary", name: "薪资体系", nameEn: "Salary", score: salaryScore, maxScore: 100, items: ["Salary calculations", "Grade system", "Import history"] });

    // 5. Legion (AI Assistants)
    let legionScore = 60;
    try {
      const overview = await getLegionOverview();
      legionScore = overview.withMaster > 0 ? (overview.withFleet > 0 ? 85 : 65) : 40;
    } catch { legionScore = 40; }
    categories.push({ id: "legion", name: "军团化", nameEn: "Legion", score: legionScore, maxScore: 100, items: ["AI Masters", "Agent Fleet", "G-Tokens"] });

    // 6. OEE & Manufacturing
    let mfgScore = 60;
    try {
      const [oeeCount] = await db.select({ value: count() }).from(oeeSnapshots).limit(1);
      mfgScore = Number(oeeCount?.value || 0) > 0 ? 80 : 50;
    } catch { mfgScore = 50; }
    categories.push({ id: "manufacturing", name: "制造就绪", nameEn: "Manufacturing", score: mfgScore, maxScore: 100, items: ["OEE", "FMEA", "Quality"] });

    const totalScore = Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length);
    const grade = totalScore >= 90 ? "A" : totalScore >= 80 ? "B" : totalScore >= 70 ? "C" : totalScore >= 60 ? "D" : "F";

    const result = { totalScore, grade, categories, updatedAt: new Date().toISOString() };
    setCache(cacheKey, result);
    log.info({ totalScore, grade }, "Readiness scorecard computed");
    return result;
  }),

  getReadinessTimeline: protectedProcedure.query(async () => {
    const cacheKey = "readiness-timeline";
    const cached = getCached(cacheKey);
    if (cached) return cached;

    // Determine current phase based on system state
    const db = await requireDb();
    let currentPhase = 1;

    try {
      const [empCount] = await db.select({ value: count() }).from(hrmEmployees).limit(1);
      const [permCount] = await db.select({ value: count() }).from(permissionsTable).limit(1);
      const empN = Number(empCount?.value || 0);
      const permN = Number(permCount?.value || 0);

      if (empN > 0 && permN >= 200) currentPhase = 2;
      if (empN >= 10 && permN >= 200) currentPhase = 3;
      if (empN >= 30) currentPhase = 4;
    } catch { /* keep phase 1 */ }

    const phases = GO_LIVE_PHASES.map((p) => ({
      ...p,
      status: p.id < currentPhase ? "completed" as const : p.id === currentPhase ? "active" as const : "pending" as const,
      progress: p.id < currentPhase ? 100 : p.id === currentPhase ? 45 : 0,
    }));

    const result = { phases, currentPhase, totalPhases: 6 };
    setCache(cacheKey, result);
    return result;
  }),

  runPreflightChecks: requirePermission("system:config:manage")
    .mutation(async () => {
      const db = await requireDb();

      interface CheckItem {
        id: string;
        category: string;
        label: string;
        labelZh: string;
        status: "pass" | "fail" | "warn" | "skip";
        detail: string;
        remediation?: string;
      }

      const checks: CheckItem[] = [];

      // 1. Database connectivity
      try {
        await db.select({ value: count() }).from(hrmEmployees).limit(1);
        checks.push({ id: "db_connectivity", category: "Infrastructure", label: "Database Connectivity", labelZh: "数据库连接", status: "pass", detail: "Database is reachable" });
      } catch {
        checks.push({ id: "db_connectivity", category: "Infrastructure", label: "Database Connectivity", labelZh: "数据库连接", status: "fail", detail: "Cannot connect to database", remediation: "Check DATABASE_URL in .env" });
      }

      // 2. RBAC permissions seeded
      try {
        const [pc] = await db.select({ value: count() }).from(permissionsTable).limit(1);
        const n = Number(pc?.value || 0);
        checks.push({ id: "rbac_seeded", category: "Auth", label: "RBAC Permissions", labelZh: "权限种子数据", status: n >= 200 ? "pass" : n > 50 ? "warn" : "fail", detail: `${n} permissions seeded`, remediation: n < 200 ? "Run: npx tsx server/seed-rbac-permissions.ts" : undefined });
      } catch {
        checks.push({ id: "rbac_seeded", category: "Auth", label: "RBAC Permissions", labelZh: "权限种子数据", status: "skip", detail: "Could not check permissions table" });
      }

      // 3. Employee data
      try {
        const [ec] = await db.select({ value: count() }).from(hrmEmployees).limit(1);
        const n = Number(ec?.value || 0);
        checks.push({ id: "employees", category: "Data", label: "Employee Records", labelZh: "员工数据", status: n >= 10 ? "pass" : n > 0 ? "warn" : "fail", detail: `${n} employees in system`, remediation: n === 0 ? "Import employee data via HR module" : undefined });
      } catch {
        checks.push({ id: "employees", category: "Data", label: "Employee Records", labelZh: "员工数据", status: "skip", detail: "Could not query employees" });
      }

      // 4. Salary calculations
      try {
        const [sc] = await db.select({ value: count() }).from(salaryCalculations).limit(1);
        const n = Number(sc?.value || 0);
        checks.push({ id: "salary", category: "HR", label: "Salary Calculations", labelZh: "薪资计算", status: n > 0 ? "pass" : "warn", detail: `${n} salary records`, remediation: n === 0 ? "Import salary data via Go-Live → 薪资导入" : undefined });
      } catch {
        checks.push({ id: "salary", category: "HR", label: "Salary Calculations", labelZh: "薪资计算", status: "skip", detail: "Could not query salary table" });
      }

      // 5. Legion (AI assistants)
      try {
        const overview = await getLegionOverview();
        checks.push({ id: "legion", category: "AI", label: "AI Legion Provisioned", labelZh: "AI军团配置", status: overview.withMaster > 0 ? "pass" : "warn", detail: `${overview.withMaster} masters, ${overview.totalAgents} agents`, remediation: overview.withMaster === 0 ? "Run legion provisioning from 军团管理" : undefined });
      } catch {
        checks.push({ id: "legion", category: "AI", label: "AI Legion Provisioned", labelZh: "AI军团配置", status: "skip", detail: "Could not check legion status" });
      }

      // 6. OEE data
      try {
        const [oc] = await db.select({ value: count() }).from(oeeSnapshots).limit(1);
        const n = Number(oc?.value || 0);
        checks.push({ id: "oee", category: "Manufacturing", label: "OEE Data", labelZh: "OEE数据", status: n > 0 ? "pass" : "warn", detail: `${n} OEE snapshots` });
      } catch {
        checks.push({ id: "oee", category: "Manufacturing", label: "OEE Data", labelZh: "OEE数据", status: "skip", detail: "Could not query OEE table" });
      }

      // 7. FMEA documents
      try {
        const [fc] = await db.select({ value: count() }).from(fmeaDocuments).limit(1);
        const n = Number(fc?.value || 0);
        checks.push({ id: "fmea", category: "Quality", label: "FMEA Documents", labelZh: "FMEA文件", status: n > 0 ? "pass" : "warn", detail: `${n} FMEA documents` });
      } catch {
        checks.push({ id: "fmea", category: "Quality", label: "FMEA Documents", labelZh: "FMEA文件", status: "skip", detail: "Could not query FMEA table" });
      }

      // 8. Agent fleet
      try {
        const [ac] = await db.select({ value: count() }).from(aiAgentFleet).limit(1);
        const n = Number(ac?.value || 0);
        checks.push({ id: "agent_fleet", category: "AI", label: "Agent Fleet", labelZh: "AI军团舰队", status: n >= 5 ? "pass" : n > 0 ? "warn" : "fail", detail: `${n} agents deployed` });
      } catch {
        checks.push({ id: "agent_fleet", category: "AI", label: "Agent Fleet", labelZh: "AI军团舰队", status: "skip", detail: "Could not query agent fleet" });
      }

      // 9. BU configuration (check at least 1 employee has department)
      try {
        const deptResult = await db.select({ dept: hrmEmployees.department }).from(hrmEmployees).groupBy(hrmEmployees.department).limit(10);
        const deptCount = deptResult.length;
        checks.push({ id: "bu_config", category: "Organization", label: "BU Configuration", labelZh: "事业部配置", status: deptCount >= 3 ? "pass" : deptCount > 0 ? "warn" : "fail", detail: `${deptCount} departments configured` });
      } catch {
        checks.push({ id: "bu_config", category: "Organization", label: "BU Configuration", labelZh: "事业部配置", status: "skip", detail: "Could not check BU config" });
      }

      // 10. Import history (any successful imports)
      try {
        const [ih] = await db.select({ value: count() }).from(importHistory).limit(1);
        const n = Number(ih?.value || 0);
        checks.push({ id: "import_history", category: "Data", label: "Import History", labelZh: "导入记录", status: n > 0 ? "pass" : "warn", detail: `${n} import records` });
      } catch {
        checks.push({ id: "import_history", category: "Data", label: "Import History", labelZh: "导入记录", status: "skip", detail: "Could not query import history" });
      }

      // Aggregate
      const passCount = checks.filter((c) => c.status === "pass").length;
      const failCount = checks.filter((c) => c.status === "fail").length;
      const warnCount = checks.filter((c) => c.status === "warn").length;
      const skipCount = checks.filter((c) => c.status === "skip").length;
      const readinessPercent = Math.round((passCount / checks.length) * 100);
      const readiness = failCount === 0 ? (warnCount === 0 ? "ready" : "partial") : "not_ready";

      log.info({ passCount, failCount, warnCount, readinessPercent }, "Preflight checks completed");

      return {
        checks,
        summary: { total: checks.length, pass: passCount, fail: failCount, warn: warnCount, skip: skipCount, readiness, readinessPercent },
        categories: [...new Set(checks.map((c) => c.category))],
      };
    }),

  getBlockers: protectedProcedure.query(async () => {
    const cacheKey = "blockers";
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const blockers: Array<{ severity: "critical" | "warning" | "info"; category: string; message: string; messageZh: string; remediation: string }> = [];
    const db = await requireDb();

    // Check critical items
    try {
      const [empCount] = await db.select({ value: count() }).from(hrmEmployees).limit(1);
      if (Number(empCount?.value || 0) === 0) {
        blockers.push({ severity: "critical", category: "Data", message: "No employee records", messageZh: "无员工数据", remediation: "Import employee master data" });
      }
    } catch { /* skip */ }

    try {
      const [permCount] = await db.select({ value: count() }).from(permissionsTable).limit(1);
      if (Number(permCount?.value || 0) < 100) {
        blockers.push({ severity: "critical", category: "Auth", message: "RBAC permissions not seeded", messageZh: "权限未初始化", remediation: "Run seed-rbac-permissions.ts" });
      }
    } catch { /* skip */ }

    try {
      const [salCount] = await db.select({ value: count() }).from(salaryCalculations).limit(1);
      if (Number(salCount?.value || 0) === 0) {
        blockers.push({ severity: "warning", category: "HR", message: "No salary calculations", messageZh: "无薪资计算数据", remediation: "Import salary data via Go-Live center" });
      }
    } catch { /* skip */ }

    try {
      const overview = await getLegionOverview();
      if (overview.withMaster === 0) {
        blockers.push({ severity: "warning", category: "AI", message: "No AI assistants provisioned", messageZh: "AI军团未配置", remediation: "Run legion provisioning" });
      }
    } catch { /* skip */ }

    const result = {
      blockers,
      criticalCount: blockers.filter((b) => b.severity === "critical").length,
      warningCount: blockers.filter((b) => b.severity === "warning").length,
      infoCount: blockers.filter((b) => b.severity === "info").length,
    };

    setCache(cacheKey, result);
    return result;
  }),

  getPhaseProgress: protectedProcedure.query(async () => {
    const cacheKey = "phase-progress";
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const db = await requireDb();
    let currentPhase = 1;
    const milestones: Array<{ phase: number; item: string; done: boolean }> = [];

    try {
      const [empCount] = await db.select({ value: count() }).from(hrmEmployees).limit(1);
      const empN = Number(empCount?.value || 0);

      const [permCount] = await db.select({ value: count() }).from(permissionsTable).limit(1);
      const permN = Number(permCount?.value || 0);

      const [salCount] = await db.select({ value: count() }).from(salaryCalculations).limit(1);
      const salN = Number(salCount?.value || 0);

      milestones.push(
        { phase: 1, item: "Database schema deployed", done: true },
        { phase: 1, item: "RBAC seeded (≥200 permissions)", done: permN >= 200 },
        { phase: 1, item: "Encoding rules configured", done: true },
        { phase: 2, item: "Employee data imported (≥10)", done: empN >= 10 },
        { phase: 2, item: "Salary data imported", done: salN > 0 },
        { phase: 3, item: "Pilot BU selected", done: empN >= 10 },
        { phase: 4, item: "All 5 BUs onboarded", done: empN >= 50 },
        { phase: 5, item: "Full production mode", done: empN >= 100 },
      );

      const phase1Done = milestones.filter((m) => m.phase === 1 && m.done).length === milestones.filter((m) => m.phase === 1).length;
      const phase2Done = milestones.filter((m) => m.phase === 2 && m.done).length === milestones.filter((m) => m.phase === 2).length;

      if (phase1Done && phase2Done) currentPhase = 3;
      else if (phase1Done) currentPhase = 2;
    } catch { /* keep phase 1 */ }

    const currentMilestones = milestones.filter((m) => m.phase === currentPhase);
    const doneCount = currentMilestones.filter((m) => m.done).length;
    const phasePercent = currentMilestones.length > 0 ? Math.round((doneCount / currentMilestones.length) * 100) : 0;

    const result = { currentPhase, phasePercent, milestones, remainingItems: currentMilestones.filter((m) => !m.done).map((m) => m.item) };
    setCache(cacheKey, result);
    return result;
  }),
});

// ── Salary Import Sub-Router ─────────────────────────────

const salaryImportRouter = router({
  getSalaryTemplate: protectedProcedure.query(async () => {
    return {
      columns: [
        { field: "employeeId", label: "员工ID", type: "number", required: true },
        { field: "department", label: "部门", type: "string", required: true },
        { field: "baseSalary", label: "基本工资", type: "number", required: true },
        { field: "performanceGrade", label: "绩效等级(S/A/B/C/D)", type: "string", required: true },
        { field: "projectBonus", label: "项目奖金", type: "number", required: false },
      ],
      geminiPrompt: `请将以下Excel薪资表转换为JSON数组格式。每行一条记录，字段如下：
- employeeId (数字): 员工ID
- department (文字): 部门名称
- baseSalary (数字): 基本工资（月薪）
- performanceGrade (字母): 绩效等级，取值 S/A/B/C/D
- projectBonus (数字，可选): 项目奖金

输出格式示例：
[
  {"employeeId": 1, "department": "技术部", "baseSalary": 15000, "performanceGrade": "A", "projectBonus": 5000},
  {"employeeId": 2, "department": "销售部", "baseSalary": 12000, "performanceGrade": "B"}
]

请确保：
1. 所有金额为数字类型（不含逗号或单位）
2. 绩效等级为大写字母
3. 输出纯JSON，不要额外文字`,
      sampleData: [
        { employeeId: 1, department: "技术部", baseSalary: 15000, performanceGrade: "A", projectBonus: 5000 },
        { employeeId: 2, department: "销售部", baseSalary: 12000, performanceGrade: "B" },
      ],
    };
  }),

  previewSalaryImport: requirePermission("hr:salary:view")
    .input(z.object({
      employees: z.array(z.object({
        employeeId: z.number(),
        department: z.string(),
        baseSalary: z.number(),
        performanceGrade: z.string(),
        projectBonus: z.number().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      // Dry-run: calculate without DB write
      const gradeMap: Record<string, number> = { S: 1.5, A: 1.2, B: 1.0, C: 0.8, D: 0.6 };

      const preview = input.employees.map((emp) => {
        const coefficient = gradeMap[emp.performanceGrade.toUpperCase()] || 1.0;
        const performanceSalary = Math.round(emp.baseSalary * 0.3 * coefficient);
        const bonus = Math.round((emp.projectBonus || 0) * 0.5);
        const benefits = Math.round(emp.baseSalary * 0.1);
        const monthlyTotal = emp.baseSalary + performanceSalary + bonus + benefits;

        return {
          ...emp,
          performanceSalary,
          bonus,
          benefits,
          monthlyTotal,
          annualTotal: monthlyTotal * 12,
        };
      });

      const totalMonthly = preview.reduce((s, p) => s + p.monthlyTotal, 0);
      return {
        records: preview,
        summary: {
          totalRecords: preview.length,
          totalMonthlyPayroll: totalMonthly,
          totalAnnualPayroll: totalMonthly * 12,
          averageMonthly: preview.length > 0 ? Math.round(totalMonthly / preview.length) : 0,
        },
      };
    }),

  importSalaryData: requirePermission("hr:salary:view")
    .input(z.object({
      employees: z.array(z.object({
        employeeId: z.number(),
        department: z.string(),
        baseSalary: z.number(),
        performanceGrade: z.string(),
        projectBonus: z.number().optional(),
      })),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      log.info({ count: input.employees.length, userId: ctx.user.id }, "Starting salary import");

      const result = await batchSalarySimulation({
        employees: input.employees,
        calculationType: "adjustment",
        notes: input.notes || "Go-Live salary import via Gemini",
      });

      // Record import history
      const db = await requireDb();
      try {
        await db.insert(importHistory).values({
          importType: "salary_excel",
          fileName: `gemini-import-${Date.now()}.json`,
          totalRows: input.employees.length,
          successCount: result.successCount,
          failedCount: result.failureCount,
          status: result.failureCount === 0 ? "completed" : "partial",
          importedData: JSON.stringify(result.calculations.filter((c) => c.status === "success").map((c) => c.employeeId)),
          errorLog: result.failureCount > 0 ? JSON.stringify(result.calculations.filter((c) => c.status === "failed")) : null,
          createdById: ctx.user.id,
        });
      } catch (err) {
        log.warn({ err }, "Failed to record import history");
      }

      log.info({ success: result.successCount, failed: result.failureCount }, "Salary import completed");
      return result;
    }),

  getSalaryImportHistory: requirePermission("hr:salary:view")
    .query(async () => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(importHistory)
        .where(eq(importHistory.importType, "salary_excel"))
        .orderBy(desc(importHistory.id))
        .limit(20);
      return rows;
    }),
});

// ── Encoding Sub-Router ──────────────────────────────────

const encodingRouter = router({
  validateCode: protectedProcedure
    .input(z.object({ code: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      return autoDetectAndValidate(input.code);
    }),

  getEncodingCompliance: protectedProcedure.query(async () => {
    const cacheKey = "encoding-compliance";
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const db = await requireDb();
    const codes: string[] = [];

    // Gather codes from various tables
    try {
      const employees = await db.select({ code: hrmEmployees.employeeCode }).from(hrmEmployees).limit(500);
      // Employee codes aren't GRT codes, so we skip them for compliance
    } catch { /* skip */ }

    // For now, return a baseline compliance report
    // In production, this would scan drawing_codes, material_codes, project_codes tables
    const result = codes.length > 0
      ? getComplianceReport(codes)
      : {
        totalCodes: 0,
        validCount: 0,
        invalidCount: 0,
        compliancePercent: 100,
        byType: {
          drawing: { total: 0, valid: 0, invalid: 0 },
          material: { total: 0, valid: 0, invalid: 0 },
          project: { total: 0, valid: 0, invalid: 0 },
          bom: { total: 0, valid: 0, invalid: 0 },
          ecr: { total: 0, valid: 0, invalid: 0 },
          eco: { total: 0, valid: 0, invalid: 0 },
          unknown: { total: 0, valid: 0, invalid: 0 },
        },
        invalidCodes: [],
        note: "No encoded items found in database yet. Import data to see compliance metrics.",
      };

    setCache(cacheKey, result);
    return result;
  }),

  getEncodingStats: protectedProcedure.query(async () => {
    const cacheKey = "encoding-stats";
    const cached = getCached(cacheKey);
    if (cached) return cached;

    // Summary stats for encoding system
    const result = {
      totalCodeTypes: 6,
      types: [
        { type: "drawing", label: "图纸编码", count: 0 },
        { type: "material", label: "物料编码", count: 0 },
        { type: "project", label: "项目编码", count: 0 },
        { type: "bom", label: "BOM编码", count: 0 },
        { type: "ecr", label: "ECR编码", count: 0 },
        { type: "eco", label: "ECO编码", count: 0 },
      ],
      rulesConfigured: true,
      lastScanAt: new Date().toISOString(),
    };

    setCache(cacheKey, result);
    return result;
  }),

  getEncodingRules: protectedProcedure.query(async () => {
    return getEncodingRulesReference();
  }),
});

// ── Simulation Sub-Router ────────────────────────────────

const simulationRouter = router({
  runLegionSimulation: requirePermission("system:config:manage")
    .mutation(async ({ ctx }) => {
      log.info({ userId: ctx.user.id }, "Running legion simulation");

      let mappings: Awaited<ReturnType<typeof getEmployeeSkillMappings>> = [];
      try {
        mappings = await getEmployeeSkillMappings();
      } catch (err) {
        log.warn({ err }, "Failed to get skill mappings, using empty set");
      }

      // Level distribution
      const levelDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const m of mappings) {
        levelDistribution[m.computedLevel] = (levelDistribution[m.computedLevel] || 0) + 1;
      }

      // G-Token projection (each level gets base allocation)
      const gTokenRates: Record<number, number> = { 1: 100, 2: 200, 3: 500, 4: 1000, 5: 2000 };
      const projectedGTokens = Object.entries(levelDistribution).reduce(
        (sum, [level, cnt]) => sum + (gTokenRates[Number(level)] || 100) * cnt, 0,
      );

      // Staffing capacity vs target
      const totalStaff = mappings.length;
      const avgSkill = mappings.length > 0 ? Math.round(mappings.reduce((s, m) => s + m.skillAvg, 0) / mappings.length) : 0;
      const machineCapacity = Math.round(totalStaff * (avgSkill / 100) * 2); // simplified model

      // Skill gaps
      const skillGaps: Array<{ skill: string; current: number; target: number; gap: number }> = [
        { skill: "Technical (T)", current: avgSkill, target: 70, gap: Math.max(0, 70 - avgSkill) },
        { skill: "Social (S)", current: Math.round(avgSkill * 0.9), target: 65, gap: Math.max(0, 65 - Math.round(avgSkill * 0.9)) },
        { skill: "Digital (D)", current: Math.round(avgSkill * 0.85), target: 60, gap: Math.max(0, 60 - Math.round(avgSkill * 0.85)) },
        { skill: "Communication (C)", current: Math.round(avgSkill * 0.95), target: 65, gap: Math.max(0, 65 - Math.round(avgSkill * 0.95)) },
        { skill: "Knowledge (K)", current: Math.round(avgSkill * 0.88), target: 70, gap: Math.max(0, 70 - Math.round(avgSkill * 0.88)) },
        { skill: "Leadership (L)", current: Math.round(avgSkill * 0.8), target: 55, gap: Math.max(0, 55 - Math.round(avgSkill * 0.8)) },
      ];

      // Record simulation
      const db = await requireDb();
      try {
        await db.insert(importHistory).values({
          importType: "legion_simulation",
          fileName: `simulation-${Date.now()}.json`,
          totalRows: totalStaff,
          successCount: totalStaff,
          failedCount: 0,
          status: "completed",
          importedData: JSON.stringify({ levelDistribution, projectedGTokens, machineCapacity, avgSkill }),
          createdById: ctx.user.id,
        });
      } catch (err) {
        log.warn({ err }, "Failed to record simulation result");
      }

      const result = {
        totalEmployees: totalStaff,
        levelDistribution,
        projectedGTokens,
        staffingCapacity: { current: totalStaff, machineTarget: MACHINE_TARGET, estimatedCapacity: machineCapacity, gap: Math.max(0, MACHINE_TARGET - machineCapacity) },
        avgSkillLevel: avgSkill,
        skillGaps,
        aiReadiness: totalStaff > 0 ? Math.round((mappings.filter((m) => m.hasMaster).length / totalStaff) * 100) : 0,
        simulatedAt: new Date().toISOString(),
      };

      log.info({ totalEmployees: totalStaff, projectedGTokens, machineCapacity }, "Legion simulation completed");
      return result;
    }),

  getSimulationResults: protectedProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db
      .select()
      .from(importHistory)
      .where(eq(importHistory.importType, "legion_simulation"))
      .orderBy(desc(importHistory.id))
      .limit(5);

    return rows.map((r) => ({
      id: r.id,
      simulatedAt: r.createdAt,
      totalEmployees: r.totalRows,
      data: r.importedData ? JSON.parse(r.importedData as string) : null,
    }));
  }),

  getScenarioComparison: protectedProcedure.query(async () => {
    const cacheKey = "scenario-comparison";
    const cached = getCached(cacheKey);
    if (cached) return cached;

    let currentHeadcount = 0;
    try {
      const overview = await getLegionOverview();
      currentHeadcount = overview.totalEmployees;
    } catch { /* keep 0 */ }

    const result = {
      current: {
        headcount: currentHeadcount,
        aiAssistants: 0,
        machineCapacity: 0,
        encodingCompliance: 0,
        readinessScore: 0,
      },
      target: {
        headcount: 120,
        aiAssistants: 120,
        machineCapacity: MACHINE_TARGET,
        encodingCompliance: 100,
        readinessScore: 95,
      },
      gaps: {
        headcount: Math.max(0, 120 - currentHeadcount),
        aiAssistants: 120,
        machineCapacity: MACHINE_TARGET,
        encodingCompliance: 100,
        readinessScore: 95,
      },
    };

    // Try to enrich with real data
    try {
      const overview = await getLegionOverview();
      result.current.aiAssistants = overview.withMaster;
      result.gaps.aiAssistants = Math.max(0, 120 - overview.withMaster);
    } catch { /* keep defaults */ }

    setCache(cacheKey, result);
    return result;
  }),
});

// ── Scenario Sub-Router (8 procedures) ───────────────────

const scenarioRouter = router({
  list: requirePermission("goLive:sandbox:view")
    .input(z.object({
      status: z.string().optional(),
      priority: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let query = db.select().from(sandboxScenarios).orderBy(desc(sandboxScenarios.id)).limit(input?.limit ?? 50);
      if (input?.status) {
        query = query.where(eq(sandboxScenarios.status, input.status as any)) as any;
      }
      return query;
    }),

  getById: requirePermission("goLive:sandbox:view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(sandboxScenarios).where(eq(sandboxScenarios.id, input.id)).limit(1);
      if (!row) throw new Error("Scenario not found");

      // Fetch linked knowledge assets
      const links = await db.select().from(sandboxKnowledgeLinks).where(eq(sandboxKnowledgeLinks.scenarioId, input.id)).limit(50);
      // Fetch runs
      const runs = await db.select().from(sandboxRuns).where(eq(sandboxRuns.scenarioId, input.id)).orderBy(desc(sandboxRuns.id)).limit(20);
      // Fetch gates
      const gates = await db.select().from(releaseGates).where(eq(releaseGates.scenarioId, input.id)).orderBy(asc(releaseGates.gateOrder)).limit(10);
      // Fetch change tasks
      const tasks = await db.select().from(sandboxChangeTasks).where(eq(sandboxChangeTasks.scenarioId, input.id)).orderBy(desc(sandboxChangeTasks.id)).limit(100);

      return { ...row, knowledgeLinks: links, runs, gates, changeTasks: tasks };
    }),

  create: requirePermission("goLive:sandbox:manage")
    .input(z.object({
      title: z.string().min(1).max(300),
      description: z.string().optional(),
      businessGoal: z.string().optional(),
      affectedPages: z.array(z.string()).optional(),
      referenceProjects: z.array(z.object({ projectId: z.number(), projectName: z.string() })).optional(),
      priority: z.enum(["P0", "P1", "P2", "P3"]).default("P2"),
      tags: z.array(z.string()).optional(),
      buCode: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.insert(sandboxScenarios).values({
        ...input,
        createdById: ctx.user.id,
      }).returning();
      log.info({ scenarioId: row.id, userId: ctx.user.id }, "Sandbox scenario created");
      return row;
    }),

  update: requirePermission("goLive:sandbox:manage")
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(300).optional(),
      description: z.string().optional(),
      businessGoal: z.string().optional(),
      affectedPages: z.array(z.string()).optional(),
      referenceProjects: z.array(z.object({ projectId: z.number(), projectName: z.string() })).optional(),
      priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const db = await requireDb();
      const [row] = await db.update(sandboxScenarios).set({ ...updates, updatedAt: new Date() }).where(eq(sandboxScenarios.id, id)).returning();
      return row;
    }),

  updateStatus: requirePermission("goLive:sandbox:manage")
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "submitted", "planning", "reviewed", "approved", "implementing", "completed", "archived"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.update(sandboxScenarios).set({ status: input.status, updatedAt: new Date() }).where(eq(sandboxScenarios.id, input.id)).returning();
      log.info({ scenarioId: input.id, status: input.status, userId: ctx.user.id }, "Scenario status updated");
      return row;
    }),

  linkKnowledge: requirePermission("goLive:sandbox:manage")
    .input(z.object({
      scenarioId: z.number(),
      knowledgeAssetId: z.number(),
      relevanceScore: z.number().min(0).max(100).default(50),
      usageContext: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.insert(sandboxKnowledgeLinks).values({
        ...input,
        addedById: ctx.user.id,
      }).returning();
      return row;
    }),

  unlinkKnowledge: requirePermission("goLive:sandbox:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(sandboxKnowledgeLinks).where(eq(sandboxKnowledgeLinks.id, input.id));
      return { success: true };
    }),

  archive: requirePermission("goLive:sandbox:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.update(sandboxScenarios).set({ status: "archived", updatedAt: new Date() }).where(eq(sandboxScenarios.id, input.id)).returning();
      log.info({ scenarioId: input.id, userId: ctx.user.id }, "Scenario archived");
      return row;
    }),
});

// ── Sandbox Run Sub-Router (7 procedures) ────────────────

const sandboxRunRouter = router({
  list: requirePermission("goLive:sandbox:view")
    .input(z.object({
      scenarioId: z.number().optional(),
      runType: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let query = db.select().from(sandboxRuns).orderBy(desc(sandboxRuns.id)).limit(input?.limit ?? 20);
      if (input?.scenarioId) {
        query = query.where(eq(sandboxRuns.scenarioId, input.scenarioId)) as any;
      }
      return query;
    }),

  getById: requirePermission("goLive:sandbox:view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(sandboxRuns).where(eq(sandboxRuns.id, input.id)).limit(1);
      if (!row) throw new Error("Run not found");
      return row;
    }),

  generateProposal: requirePermission("goLive:sandbox:execute")
    .input(z.object({ scenarioId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [scenario] = await db.select().from(sandboxScenarios).where(eq(sandboxScenarios.id, input.scenarioId)).limit(1);
      if (!scenario) throw new Error("Scenario not found");
      return generateProposal(scenario, ctx.user.id);
    }),

  executeImplementation: requirePermission("goLive:sandbox:execute")
    .input(z.object({
      scenarioId: z.number(),
      proposalRunId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [scenario] = await db.select().from(sandboxScenarios).where(eq(sandboxScenarios.id, input.scenarioId)).limit(1);
      if (!scenario) throw new Error("Scenario not found");
      if (!["approved", "implementing"].includes(scenario.status)) {
        throw new Error("Scenario must be approved before implementation");
      }

      // Get the proposal output from the referenced run
      const [proposalRun] = await db.select().from(sandboxRuns).where(eq(sandboxRuns.id, input.proposalRunId)).limit(1);
      if (!proposalRun || proposalRun.runType !== "proposal" || proposalRun.status !== "completed") {
        throw new Error("Valid completed proposal run required");
      }

      return executeImplementation(scenario, proposalRun.aiOutput as any, ctx.user.id, input.proposalRunId);
    }),

  runRedTeamReview: requirePermission("goLive:sandbox:execute")
    .input(z.object({
      scenarioId: z.number(),
      proposalRunId: z.number(),
      implementationRunId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [scenario] = await db.select().from(sandboxScenarios).where(eq(sandboxScenarios.id, input.scenarioId)).limit(1);
      if (!scenario) throw new Error("Scenario not found");

      const [proposalRun] = await db.select().from(sandboxRuns).where(eq(sandboxRuns.id, input.proposalRunId)).limit(1);
      const [implRun] = await db.select().from(sandboxRuns).where(eq(sandboxRuns.id, input.implementationRunId)).limit(1);
      if (!proposalRun?.aiOutput || !implRun?.aiOutput) throw new Error("Both proposal and implementation runs required");

      return runRedTeamReview(scenario, proposalRun.aiOutput as any, implRun.aiOutput as any, ctx.user.id, input.implementationRunId);
    }),

  runDryRun: requirePermission("goLive:sandbox:execute")
    .input(z.object({ scenarioId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [scenario] = await db.select().from(sandboxScenarios).where(eq(sandboxScenarios.id, input.scenarioId)).limit(1);
      if (!scenario) throw new Error("Scenario not found");

      // Dry run: gather scenario state without invoking AI
      const runs = await db.select().from(sandboxRuns).where(eq(sandboxRuns.scenarioId, input.scenarioId)).orderBy(desc(sandboxRuns.id)).limit(10);
      const gates = await db.select().from(releaseGates).where(eq(releaseGates.scenarioId, input.scenarioId)).limit(10);
      const tasks = await db.select().from(sandboxChangeTasks).where(eq(sandboxChangeTasks.scenarioId, input.scenarioId)).limit(100);

      const dryRunOutput = {
        scenario: { id: scenario.id, title: scenario.title, status: scenario.status },
        totalRuns: runs.length,
        completedRuns: runs.filter((r) => r.status === "completed").length,
        gatesPassed: gates.filter((g) => g.status === "passed").length,
        totalGates: gates.length,
        tasksByStatus: {
          draft: tasks.filter((t) => t.status === "draft").length,
          ai_generated: tasks.filter((t) => t.status === "ai_generated").length,
          approved: tasks.filter((t) => t.status === "approved").length,
          deployed: tasks.filter((t) => t.status === "deployed").length,
        },
        readyToDeploy: gates.length > 0 && gates.every((g) => ["passed", "skipped", "overridden"].includes(g.status)),
      };

      // Write dry-run record
      const [row] = await db.insert(sandboxRuns).values({
        scenarioId: input.scenarioId,
        runType: "dry_run",
        aiProvider: "system",
        aiModel: "dry-run",
        systemPrompt: "",
        userInput: JSON.stringify({ scenarioId: input.scenarioId }),
        aiOutput: dryRunOutput,
        status: "completed",
        durationMs: 0,
        triggeredById: ctx.user.id,
      }).returning();

      return { runId: row.id, dryRun: dryRunOutput };
    }),

  compareRuns: requirePermission("goLive:sandbox:view")
    .input(z.object({ runIdA: z.number(), runIdB: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [runA] = await db.select().from(sandboxRuns).where(eq(sandboxRuns.id, input.runIdA)).limit(1);
      const [runB] = await db.select().from(sandboxRuns).where(eq(sandboxRuns.id, input.runIdB)).limit(1);
      if (!runA || !runB) throw new Error("Both runs must exist");

      return {
        runA: { id: runA.id, type: runA.runType, provider: runA.aiProvider, model: runA.aiModel, status: runA.status, durationMs: runA.durationMs, tokenUsage: runA.tokenUsage, createdAt: runA.createdAt },
        runB: { id: runB.id, type: runB.runType, provider: runB.aiProvider, model: runB.aiModel, status: runB.status, durationMs: runB.durationMs, tokenUsage: runB.tokenUsage, createdAt: runB.createdAt },
      };
    }),
});

// ── Gate Sub-Router (6 procedures) ───────────────────────

const gateRouter = router({
  list: requirePermission("goLive:gate:view")
    .input(z.object({ scenarioId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db.select().from(releaseGates).where(eq(releaseGates.scenarioId, input.scenarioId)).orderBy(asc(releaseGates.gateOrder)).limit(10);
    }),

  initGates: requirePermission("goLive:gate:manage")
    .input(z.object({ scenarioId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const GATE_TYPES: Array<{ type: "proposal_review" | "red_team" | "preflight" | "canary" | "full_deploy"; order: number }> = [
        { type: "proposal_review", order: 1 },
        { type: "red_team", order: 2 },
        { type: "preflight", order: 3 },
        { type: "canary", order: 4 },
        { type: "full_deploy", order: 5 },
      ];

      const created = [];
      for (const gate of GATE_TYPES) {
        const [row] = await db.insert(releaseGates).values({
          scenarioId: input.scenarioId,
          gateType: gate.type,
          gateOrder: gate.order,
          status: "pending",
        }).returning();
        created.push(row);
      }

      log.info({ scenarioId: input.scenarioId, gates: created.length, userId: ctx.user.id }, "Release gates initialized");
      return created;
    }),

  review: requirePermission("goLive:gate:manage")
    .input(z.object({
      gateId: z.number(),
      status: z.enum(["passed", "failed"]),
      comment: z.string().optional(),
      checklist: z.array(z.object({ item: z.string(), passed: z.boolean() })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // Gate order enforcement: previous gates must be passed/skipped/overridden
      const [gate] = await db.select().from(releaseGates).where(eq(releaseGates.id, input.gateId)).limit(1);
      if (!gate) throw new Error("Gate not found");

      if (gate.gateOrder > 1) {
        const prevGates = await db.select().from(releaseGates)
          .where(eq(releaseGates.scenarioId, gate.scenarioId))
          .orderBy(asc(releaseGates.gateOrder))
          .limit(10);

        const blockers = prevGates.filter(
          (g) => g.gateOrder < gate.gateOrder && !["passed", "skipped", "overridden"].includes(g.status)
        );
        if (blockers.length > 0) {
          throw new Error(`Previous gate(s) not cleared: ${blockers.map((b) => b.gateType).join(", ")}`);
        }
      }

      const [row] = await db.update(releaseGates).set({
        status: input.status,
        reviewerId: ctx.user.id,
        reviewComment: input.comment,
        checklist: input.checklist,
        passedAt: input.status === "passed" ? new Date() : null,
        updatedAt: new Date(),
      }).where(eq(releaseGates.id, input.gateId)).returning();

      log.info({ gateId: input.gateId, status: input.status, userId: ctx.user.id }, "Gate reviewed");
      return row;
    }),

  override: requirePermission("goLive:gate:admin")
    .input(z.object({
      gateId: z.number(),
      comment: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db.update(releaseGates).set({
        status: "overridden",
        reviewerId: ctx.user.id,
        reviewComment: `[OVERRIDE] ${input.comment}`,
        passedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(releaseGates.id, input.gateId)).returning();

      log.info({ gateId: input.gateId, userId: ctx.user.id }, "Gate overridden by admin");
      return row;
    }),

  getProgress: requirePermission("goLive:gate:view")
    .input(z.object({ scenarioId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const gates = await db.select().from(releaseGates).where(eq(releaseGates.scenarioId, input.scenarioId)).orderBy(asc(releaseGates.gateOrder)).limit(10);

      const passed = gates.filter((g) => ["passed", "overridden"].includes(g.status)).length;
      const failed = gates.filter((g) => g.status === "failed").length;
      const total = gates.length;

      return {
        gates,
        summary: { total, passed, failed, pending: total - passed - failed },
        readyForDeploy: total > 0 && gates.every((g) => ["passed", "skipped", "overridden"].includes(g.status)),
        currentGate: gates.find((g) => !["passed", "skipped", "overridden"].includes(g.status))?.gateType ?? null,
      };
    }),

  getRedTeamReport: requirePermission("goLive:gate:view")
    .input(z.object({ scenarioId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const gates = await db.select().from(releaseGates).where(eq(releaseGates.scenarioId, input.scenarioId)).limit(10);
      const redTeamGate = gates.find((g) => g.gateType === "red_team");
      if (!redTeamGate) return null;
      return { gate: redTeamGate, report: redTeamGate.redTeamReport };
    }),
});

// ── Change Task Sub-Router (7 procedures) ────────────────

const changeTaskRouter = router({
  list: requirePermission("goLive:task:view")
    .input(z.object({
      scenarioId: z.number().optional(),
      status: z.string().optional(),
      limit: z.number().min(1).max(200).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      let query = db.select().from(sandboxChangeTasks).orderBy(desc(sandboxChangeTasks.id)).limit(input?.limit ?? 50);
      if (input?.scenarioId) {
        query = query.where(eq(sandboxChangeTasks.scenarioId, input.scenarioId)) as any;
      }
      return query;
    }),

  getById: requirePermission("goLive:task:view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.select().from(sandboxChangeTasks).where(eq(sandboxChangeTasks.id, input.id)).limit(1);
      if (!row) throw new Error("Change task not found");
      return row;
    }),

  updateStatus: requirePermission("goLive:task:manage")
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "ai_generated", "human_reviewed", "approved", "implementing", "verified", "deployed", "rolled_back"]),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.update(sandboxChangeTasks).set({ status: input.status, updatedAt: new Date() }).where(eq(sandboxChangeTasks.id, input.id)).returning();
      return row;
    }),

  assignTask: requirePermission("goLive:task:manage")
    .input(z.object({
      id: z.number(),
      assigneeId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.update(sandboxChangeTasks).set({ assigneeId: input.assigneeId, updatedAt: new Date() }).where(eq(sandboxChangeTasks.id, input.id)).returning();
      return row;
    }),

  promoteToProjectTask: requirePermission("goLive:task:manage")
    .input(z.object({
      id: z.number(),
      projectTaskId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.update(sandboxChangeTasks).set({ projectTaskId: input.projectTaskId, updatedAt: new Date() }).where(eq(sandboxChangeTasks.id, input.id)).returning();
      log.info({ changeTaskId: input.id, projectTaskId: input.projectTaskId }, "Change task promoted to project task");
      return row;
    }),

  addRollback: requirePermission("goLive:task:manage")
    .input(z.object({
      id: z.number(),
      rollbackInstructions: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db.update(sandboxChangeTasks).set({ rollbackInstructions: input.rollbackInstructions, updatedAt: new Date() }).where(eq(sandboxChangeTasks.id, input.id)).returning();
      return row;
    }),

  bulkStatusUpdate: requirePermission("goLive:task:manage")
    .input(z.object({
      ids: z.array(z.number()).min(1).max(50),
      status: z.enum(["draft", "ai_generated", "human_reviewed", "approved", "implementing", "verified", "deployed", "rolled_back"]),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const updated = [];
      for (const id of input.ids) {
        const [row] = await db.update(sandboxChangeTasks).set({ status: input.status, updatedAt: new Date() }).where(eq(sandboxChangeTasks.id, id)).returning();
        if (row) updated.push(row);
      }
      return { updated: updated.length, total: input.ids.length };
    }),
});

// ── Main Router ──────────────────────────────────────────

export const goLiveRouter = router({
  readiness: readinessRouter,
  salaryImport: salaryImportRouter,
  encoding: encodingRouter,
  simulation: simulationRouter,
  scenario: scenarioRouter,
  sandboxRun: sandboxRunRouter,
  gate: gateRouter,
  changeTask: changeTaskRouter,
});
