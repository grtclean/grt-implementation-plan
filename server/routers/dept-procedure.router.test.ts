/**
 * Dept-Procedure Router Tests — 部门规章制度管理
 *
 * 8 sub-routers, 33 test cases:
 * - categories: list (no filter, with deptCode), create
 * - procedures: list (defaults, filters), getById, getByCode, create, update, publish, archive, search
 * - versions: list, createNewVersion
 * - acknowledgments: acknowledge, myPending, getByProcedure, complianceRate
 * - exceptions: list, create, update, resolve, dashboard
 * - kpiLinks: list, link, unlink
 * - dashboard: overview, deptSummary, expiringProcedures
 * - review: listDueForReview, submitReview
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock service ──────────────────────────────────────────────────────────────
const mockService = vi.hoisted(() => ({
  listCategories: vi.fn().mockResolvedValue([
    { id: 1, deptCode: "PROD", deptName: "生产部", procedureType: "core_procedure", isActive: true },
    { id: 2, deptCode: "QA", deptName: "质量部", procedureType: "compliance", isActive: true },
  ]),
  createCategory: vi.fn().mockResolvedValue({ id: 3, deptCode: "HR", deptName: "人力资源部", procedureType: "regulation" }),

  listProcedures: vi.fn().mockResolvedValue([
    {
      id: 1,
      procedureCode: "PROD-001",
      title: "生产操作规程",
      deptCode: "PROD",
      procedureType: "core_procedure",
      priority: "critical",
      status: "effective",
      currentVersion: "V2.0",
    },
    {
      id: 2,
      procedureCode: "QA-001",
      title: "质量检验制度",
      deptCode: "QA",
      procedureType: "compliance",
      priority: "high",
      status: "effective",
      currentVersion: "V1.1",
    },
  ]),
  getProcedureById: vi.fn().mockResolvedValue({
    id: 1,
    procedureCode: "PROD-001",
    title: "生产操作规程",
    deptCode: "PROD",
    procedureType: "core_procedure",
    priority: "critical",
    status: "effective",
    currentVersion: "V2.0",
    content: "详细操作规程内容...",
    ownerName: "张工",
    effectiveDate: new Date("2026-01-01"),
  }),
  getProcedureByCode: vi.fn().mockResolvedValue({
    id: 1,
    procedureCode: "PROD-001",
    title: "生产操作规程",
    deptCode: "PROD",
    status: "effective",
    currentVersion: "V2.0",
  }),
  createProcedure: vi.fn().mockResolvedValue({ id: 5, procedureCode: "HR-001", title: "员工行为准则", status: "draft" }),
  updateProcedure: vi.fn().mockResolvedValue({ id: 1, updated: true, title: "生产操作规程（修订版）" }),
  publishProcedure: vi.fn().mockResolvedValue({ id: 1, status: "effective", publishedAt: new Date("2026-03-13"), currentVersion: "V2.1" }),
  archiveProcedure: vi.fn().mockResolvedValue({ id: 1, status: "archived", archivedAt: new Date("2026-03-13") }),

  listVersions: vi.fn().mockResolvedValue([
    { id: 3, procedureId: 1, version: "V2.0", changeSummary: "重大修订：增加安全条款", approvedByName: "李总", publishedAt: new Date("2026-01-01") },
    { id: 1, procedureId: 1, version: "V1.0", changeSummary: "初始版本", approvedByName: "王总", publishedAt: new Date("2025-01-01") },
  ]),
  createNewVersion: vi.fn().mockResolvedValue({ id: 4, procedureId: 1, version: "V2.1", status: "draft" }),

  acknowledge: vi.fn().mockResolvedValue({ id: 10, procedureId: 1, userId: 1, acknowledgedAt: new Date("2026-03-13"), isLatestVersion: true }),
  getMyPendingAcks: vi.fn().mockResolvedValue([
    { id: 2, procedureCode: "QA-001", title: "质量检验制度", currentVersion: "V1.1", deptCode: "QA", priority: "high" },
    { id: 3, procedureCode: "HR-002", title: "考勤管理制度", currentVersion: "V1.0", deptCode: "HR", priority: "standard" },
  ]),
  getAcksByProcedure: vi.fn().mockResolvedValue([
    { id: 10, userId: 1, employeeName: "张三", acknowledgedAt: new Date("2026-03-13"), versionAcknowledged: "V2.0", isLatestVersion: true },
    { id: 9, userId: 2, employeeName: "李四", acknowledgedAt: new Date("2026-03-12"), versionAcknowledged: "V2.0", isLatestVersion: true },
  ]),
  getComplianceRate: vi.fn().mockResolvedValue({
    rate: 84,
    totalProcedures: 50,
    totalAcks: 42,
    uniqueAckers: 38,
  }),

  createException: vi.fn().mockResolvedValue({ id: 7, procedureId: 1, exceptionCode: "EXC-2026-007", severity: "major", status: "open" }),
  updateException: vi.fn().mockResolvedValue({ id: 7, status: "investigating", rootCause: "操作人员未接受培训" }),
  resolveException: vi.fn().mockResolvedValue({ id: 7, status: "resolved", resolvedAt: new Date("2026-03-13"), resolvedByName: "张三" }),
  listExceptions: vi.fn().mockResolvedValue([
    { id: 7, procedureId: 1, exceptionCode: "EXC-2026-007", severity: "major", status: "open", description: "违反安全操作规程", department: "生产部" },
    { id: 6, procedureId: 2, exceptionCode: "EXC-2026-006", severity: "minor", status: "resolved", description: "质检记录填写不完整", department: "质量部" },
  ]),

  linkKpi: vi.fn().mockResolvedValue({ id: 5, procedureId: 1, kpiCode: "OEE", kpiName: "设备综合效率", isActive: true }),
  unlinkKpi: vi.fn().mockResolvedValue({ success: true, id: 5, kpiCode: "OEE" }),
  getKpiLinks: vi.fn().mockResolvedValue([
    { id: 5, procedureId: 1, kpiCode: "OEE", kpiName: "设备综合效率", weight: "1.00", isActive: true },
    { id: 4, procedureId: 1, kpiCode: "FPY", kpiName: "一次合格率", weight: "0.80", isActive: true },
  ]),

  getDashboardStats: vi.fn().mockResolvedValue({
    totalProcedures: 128,
    effectiveProcedures: 95,
    draftProcedures: 18,
    archivedProcedures: 15,
    overallComplianceRate: 78.5,
    openExceptions: 3,
    criticalExceptions: 1,
    dueForReview: 7,
    expiringIn30Days: 4,
  }),
  getDeptSummary: vi.fn().mockResolvedValue({
    deptCode: "PROD",
    procedures: { total: 32, effective: 28, draft: 4 },
    exceptions: { open: 2, total: 5 },
    complianceRate: 82,
    totalAcks: 90,
    uniqueAckers: 28,
  }),
  getExpiringProcedures: vi.fn().mockResolvedValue([
    { id: 5, procedureCode: "PROD-005", title: "设备维护制度", expiryDate: new Date("2026-03-25"), daysUntilExpiry: 12, ownerName: "张工" },
    { id: 8, procedureCode: "QA-003", title: "不合格品处理规程", expiryDate: new Date("2026-04-01"), daysUntilExpiry: 19, ownerName: "李工" },
  ]),

  listDueForReview: vi.fn().mockResolvedValue([
    { id: 1, procedureCode: "PROD-001", title: "生产操作规程", nextReviewDate: new Date("2026-03-15"), reviewFrequency: "annual", ownerName: "张工" },
    { id: 3, procedureCode: "HR-001", title: "员工手册", nextReviewDate: new Date("2026-03-20"), reviewFrequency: "annual", ownerName: "王HR" },
  ]),
  submitReview: vi.fn().mockResolvedValue({
    procedure: { id: 1, status: "approved" },
    outcome: "approved",
    notes: "内容仍然适用，无需修订",
  }),
}));

vi.mock("../services/dept-procedure.service", () => mockService);

// ── Stub schema (tables not needed since service is fully mocked) ──────────────
vi.mock("../../drizzle/dept-procedures-schema", () => ({
  deptProcedureCategories: { id: "id", deptCode: "dept_code", procedureType: "procedure_type", isActive: "is_active" },
  deptProcedures: { id: "id", procedureCode: "procedure_code", deptCode: "dept_code", status: "status" },
  deptProcedureVersions: { id: "id", procedureId: "procedure_id", version: "version" },
  deptProcedureAcknowledgments: { id: "id", procedureId: "procedure_id", userId: "user_id" },
  deptProcedureExceptions: { id: "id", procedureId: "procedure_id", status: "status", severity: "severity" },
  deptProcedureKpiLinks: { id: "id", procedureId: "procedure_id", kpiCode: "kpi_code", isActive: "is_active" },
}));

// ── drizzle-orm mock ───────────────────────────────────────────────────────────
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual("drizzle-orm");
  return { ...actual };
});

// ── tRPC core mock ─────────────────────────────────────────────────────────────
vi.mock("../_core/trpc", () => {
  const passthrough = {
    use: vi.fn(() => passthrough),
    input: vi.fn(() => passthrough),
    query: vi.fn((fn: any) => fn),
    mutation: vi.fn((fn: any) => fn),
  };
  return {
    router: vi.fn((routes: any) => routes),
    protectedProcedure: { ...passthrough },
    adminProcedure: { ...passthrough },
    publicProcedure: { ...passthrough },
    requirePermission: vi.fn(() => passthrough),
  };
});

// ── Logger mock ────────────────────────────────────────────────────────────────
vi.mock("../lib/logger", () => ({
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { deptProcedureRouter } from "./dept-procedure.router";

/* ── Test helpers ─────────────────────────────────────────────────────────── */

const ctx = { user: { id: 1, name: "张三", role: "admin" } } as any;

/** Simulate a tRPC query call */
const call = (fn: any, input?: any) =>
  fn({ ctx, input, rawInput: undefined, path: "", type: "query" as const });

/** Simulate a tRPC mutation call */
const mutate = (fn: any, input?: any) =>
  fn({ ctx, input, rawInput: undefined, path: "", type: "mutation" as const });

/* ═══════════════════════════════════════════════════════════════════════════ */

describe("dept-procedure.router", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── categories ─────────────────────────────────────────────────────────────
  describe("categories", () => {
    it("list — returns all categories when no deptCode filter supplied", async () => {
      const result = await call(deptProcedureRouter.categories.list);
      // Router: svc.listCategories(input?.deptCode, input?.procedureType) — both undefined when no input
      expect(mockService.listCategories).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("deptCode", "PROD");
      expect(result[1]).toHaveProperty("procedureType", "compliance");
    });

    it("list — filters by deptCode when supplied", async () => {
      await call(deptProcedureRouter.categories.list, { deptCode: "QA" });
      // Router passes deptCode and procedureType (undefined) as separate args
      expect(mockService.listCategories).toHaveBeenCalledWith("QA", undefined);
    });

    it("create — creates a new category and returns id", async () => {
      const result = await mutate(deptProcedureRouter.categories.create, {
        deptCode: "HR",
        deptName: "人力资源部",
        procedureType: "regulation",
      });
      expect(mockService.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({ deptCode: "HR", deptName: "人力资源部", procedureType: "regulation" }),
      );
      expect(result).toHaveProperty("id", 3);
      expect(result).toHaveProperty("deptCode", "HR");
    });
  });

  // ── procedures ─────────────────────────────────────────────────────────────
  describe("procedures", () => {
    it("list — returns all procedures with default options", async () => {
      const result = await call(deptProcedureRouter.procedures.list);
      // Router default limit is 100 (not 50); field is `type` (not `procedureType`)
      expect(mockService.listProcedures).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100, offset: 0 }),
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("procedureCode", "PROD-001");
      expect(result[0]).toHaveProperty("status", "effective");
    });

    it("list — passes filters when supplied", async () => {
      await call(deptProcedureRouter.procedures.list, {
        deptCode: "PROD",
        status: "effective",
        type: "core_procedure",
        limit: 20,
        offset: 0,
      });
      // Router passes `type` (not `procedureType`) to service
      expect(mockService.listProcedures).toHaveBeenCalledWith(
        expect.objectContaining({
          deptCode: "PROD",
          status: "effective",
          type: "core_procedure",
          limit: 20,
          offset: 0,
        }),
      );
    });

    it("getById — returns a single procedure with full details", async () => {
      const result = await call(deptProcedureRouter.procedures.getById, { id: 1 });
      expect(mockService.getProcedureById).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty("procedureCode", "PROD-001");
      expect(result).toHaveProperty("currentVersion", "V2.0");
      expect(result).toHaveProperty("content");
    });

    it("getByCode — returns a procedure by its code", async () => {
      const result = await call(deptProcedureRouter.procedures.getByCode, { code: "PROD-001" });
      expect(mockService.getProcedureByCode).toHaveBeenCalledWith("PROD-001");
      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("status", "effective");
    });

    it("create — creates a new procedure in draft status", async () => {
      const result = await mutate(deptProcedureRouter.procedures.create, {
        procedureCode: "HR-001",
        title: "员工行为准则",
        deptCode: "HR",
        procedureType: "regulation",
        priority: "high",
      });
      expect(mockService.createProcedure).toHaveBeenCalledWith(
        expect.objectContaining({
          procedureCode: "HR-001",
          title: "员工行为准则",
          createdBy: 1,
        }),
      );
      expect(result).toHaveProperty("status", "draft");
      expect(result).toHaveProperty("procedureCode", "HR-001");
    });

    it("update — updates an existing procedure and returns confirmation", async () => {
      const result = await mutate(deptProcedureRouter.procedures.update, {
        id: 1,
        title: "生产操作规程（修订版）",
        priority: "critical",
      });
      expect(mockService.updateProcedure).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: "生产操作规程（修订版）", updatedBy: 1 }),
      );
      expect(result).toHaveProperty("updated", true);
    });

    it("publish — publishes a procedure and transitions status to effective", async () => {
      // Router input schema: { id, approverName? }
      // Router calls: svc.publishProcedure(input.id, ctx.user.id, approverName)
      const result = await mutate(deptProcedureRouter.procedures.publish, {
        id: 1,
        approverName: "张三",
      });
      expect(mockService.publishProcedure).toHaveBeenCalledWith(
        1,
        1,
        "张三",
      );
      expect(result).toHaveProperty("status", "effective");
      expect(result).toHaveProperty("currentVersion", "V2.1");
    });

    it("archive — archives a procedure and returns confirmation", async () => {
      // Router input schema: { id } only; calls svc.archiveProcedure(id) with 1 arg
      const result = await mutate(deptProcedureRouter.procedures.archive, {
        id: 1,
      });
      expect(mockService.archiveProcedure).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty("status", "archived");
    });

    it("search — full-text search returns ranked results", async () => {
      // Router search uses svc.listProcedures with `search` field (not a separate searchProcedures)
      // Router input field is `search` (not `q`)
      const result = await call(deptProcedureRouter.procedures.search, {
        search: "安全操作",
        deptCode: "PROD",
      });
      expect(mockService.listProcedures).toHaveBeenCalledWith(
        expect.objectContaining({ search: "安全操作", deptCode: "PROD" }),
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("procedureCode", "PROD-001");
    });
  });

  // ── versions ───────────────────────────────────────────────────────────────
  describe("versions", () => {
    it("list — returns version history for a procedure in reverse chronological order", async () => {
      const result = await call(deptProcedureRouter.versions.list, { procedureId: 1 });
      expect(mockService.listVersions).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("version", "V2.0");
      expect(result[1]).toHaveProperty("version", "V1.0");
    });

    it("createNewVersion — creates a new draft version for a procedure", async () => {
      const result = await mutate(deptProcedureRouter.versions.createNewVersion, {
        procedureId: 1,
        changeType: "minor",
        changeSummary: "更新安全责任条款",
        content: "新版本内容...",
      });
      // Router calls: svc.createNewVersion(procedureId, changeType, changeSummary, content, ctx.user.id)
      expect(mockService.createNewVersion).toHaveBeenCalledWith(
        1,
        "minor",
        "更新安全责任条款",
        "新版本内容...",
        1,
      );
      expect(result).toHaveProperty("version", "V2.1");
      expect(result).toHaveProperty("status", "draft");
    });
  });

  // ── acknowledgments ────────────────────────────────────────────────────────
  describe("acknowledgments", () => {
    it("acknowledge — records an acknowledgment for the caller", async () => {
      const result = await mutate(deptProcedureRouter.acknowledgments.acknowledge, {
        procedureId: 1,
        version: "V2.0",
        method: "checkbox",
      });
      // Router calls: svc.acknowledge(procedureId, version, userId, name, dept, method, quizScore, ipAddress)
      expect(mockService.acknowledge).toHaveBeenCalledWith(
        1,
        "V2.0",
        1,
        "张三",
        "",
        "checkbox",
        undefined,
        undefined,
      );
      expect(result).toHaveProperty("id", 10);
      expect(result).toHaveProperty("isLatestVersion", true);
    });

    it("myPending — returns procedures the caller has not yet acknowledged", async () => {
      const result = await call(deptProcedureRouter.acknowledgments.myPending);
      // Router calls: svc.getMyPendingAcks(ctx.user.id, userRole, userDept) — 3 args
      expect(mockService.getMyPendingAcks).toHaveBeenCalledWith(1, "admin", "");
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("procedureCode", "QA-001");
      expect(result[1]).toHaveProperty("procedureCode", "HR-002");
    });

    it("getByProcedure — returns all acknowledgment records for a procedure", async () => {
      const result = await call(deptProcedureRouter.acknowledgments.getByProcedure, { procedureId: 1 });
      expect(mockService.getAcksByProcedure).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("employeeName", "张三");
      expect(result[0]).toHaveProperty("versionAcknowledged", "V2.0");
    });

    it("complianceRate — returns acknowledgment compliance rate scoped by dept", async () => {
      // Router input is { deptCode?: string }, not procedureId
      // svc.getComplianceRate returns { rate, totalProcedures, totalAcks, uniqueAckers }
      const result = await call(deptProcedureRouter.acknowledgments.complianceRate);
      expect(mockService.getComplianceRate).toHaveBeenCalledWith(undefined);
      expect(result).toHaveProperty("rate", 84);
      expect(result).toHaveProperty("totalProcedures", 50);
      expect(result).toHaveProperty("totalAcks", 42);
    });
  });

  // ── exceptions ─────────────────────────────────────────────────────────────
  describe("exceptions", () => {
    it("list — returns all exceptions with default options", async () => {
      const result = await call(deptProcedureRouter.exceptions.list);
      // Router default limit is 100 (not 50)
      expect(mockService.listExceptions).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100, offset: 0 }),
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("severity", "major");
      expect(result[0]).toHaveProperty("status", "open");
    });

    it("list — passes filters when supplied", async () => {
      await call(deptProcedureRouter.exceptions.list, {
        procedureId: 1,
        status: "open",
        severity: "major",
      });
      expect(mockService.listExceptions).toHaveBeenCalledWith(
        expect.objectContaining({ procedureId: 1, status: "open", severity: "major" }),
      );
    });

    it("create — reports a new exception against a procedure", async () => {
      const result = await mutate(deptProcedureRouter.exceptions.create, {
        procedureId: 1,
        description: "违反安全操作规程，未佩戴防护装备",
        severity: "major",
        department: "生产部",
      });
      expect(mockService.createException).toHaveBeenCalledWith(
        expect.objectContaining({
          procedureId: 1,
          severity: "major",
          reportedBy: 1,
          reportedByName: "张三",
        }),
      );
      expect(result).toHaveProperty("exceptionCode", "EXC-2026-007");
      expect(result).toHaveProperty("status", "open");
    });

    it("update — updates exception details (root cause, corrective action)", async () => {
      const result = await mutate(deptProcedureRouter.exceptions.update, {
        id: 7,
        status: "investigating",
        rootCause: "操作人员未接受培训",
        correctiveAction: "立即安排相关培训",
      });
      expect(mockService.updateException).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ status: "investigating", rootCause: "操作人员未接受培训" }),
      );
      expect(result).toHaveProperty("status", "investigating");
    });

    it("resolve — resolves an open exception", async () => {
      // Router input schema: { id, resolvedByName? }
      // Router calls: svc.resolveException(input.id, ctx.user.id, resolvedByName)
      const result = await mutate(deptProcedureRouter.exceptions.resolve, {
        id: 7,
        resolvedByName: "张三",
      });
      expect(mockService.resolveException).toHaveBeenCalledWith(
        7,
        1,
        "张三",
      );
      expect(result).toHaveProperty("status", "resolved");
      expect(result).toHaveProperty("resolvedByName", "张三");
    });

    it("dashboard — returns exception aggregation stats computed inline", async () => {
      // Router does NOT call getExceptionDashboard — it calls listExceptions internally
      // and computes the summary inline. The return shape is:
      // { summary: Record<dept, {open,critical,total}>, totalOpen, totalCritical, total }
      const result = await call(deptProcedureRouter.exceptions.dashboard);
      expect(mockService.listExceptions).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 500 }),
      );
      // Inline computation from the mocked listExceptions result (2 rows: major/open + minor/resolved)
      expect(result).toHaveProperty("totalOpen", 1);   // 1 with status "open"
      expect(result).toHaveProperty("totalCritical", 0); // 0 with severity "critical"
      expect(result).toHaveProperty("total", 2);
      expect(result).toHaveProperty("summary");
    });
  });

  // ── kpiLinks ───────────────────────────────────────────────────────────────
  describe("kpiLinks", () => {
    it("list — returns KPI links for a procedure", async () => {
      const result = await call(deptProcedureRouter.kpiLinks.list, { procedureId: 1 });
      expect(mockService.getKpiLinks).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("kpiCode", "OEE");
      expect(result[1]).toHaveProperty("kpiCode", "FPY");
    });

    it("link — creates a new KPI link for a procedure", async () => {
      const result = await mutate(deptProcedureRouter.kpiLinks.link, {
        procedureId: 1,
        kpiCode: "OEE",
        kpiName: "设备综合效率",
        weight: 1.0,
      });
      // Router calls: svc.linkKpi(procedureId, kpiCode, kpiName, targetValue, weight, kpiNameEn, measurementMethod)
      expect(mockService.linkKpi).toHaveBeenCalledWith(
        1,
        "OEE",
        "设备综合效率",
        undefined,
        1.0,
        undefined,
        undefined,
      );
      expect(result).toHaveProperty("id", 5);
      expect(result).toHaveProperty("isActive", true);
    });

    it("unlink — removes a KPI link and returns confirmation", async () => {
      const result = await mutate(deptProcedureRouter.kpiLinks.unlink, { id: 5 });
      expect(mockService.unlinkKpi).toHaveBeenCalledWith(5);
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("kpiCode", "OEE");
    });
  });

  // ── dashboard ──────────────────────────────────────────────────────────────
  describe("dashboard", () => {
    it("overview — returns system-wide procedure stats", async () => {
      const result = await call(deptProcedureRouter.dashboard.overview);
      expect(mockService.getDashboardStats).toHaveBeenCalled();
      expect(result).toHaveProperty("totalProcedures", 128);
      expect(result).toHaveProperty("effectiveProcedures", 95);
      expect(result).toHaveProperty("overallComplianceRate", 78.5);
      expect(result).toHaveProperty("openExceptions", 3);
      expect(result).toHaveProperty("dueForReview", 7);
    });

    it("deptSummary — returns per-department procedure summary", async () => {
      // Router requires deptCode input: .input(z.object({ deptCode: z.string().min(1).max(50) }))
      const result = await call(deptProcedureRouter.dashboard.deptSummary, { deptCode: "PROD" });
      expect(mockService.getDeptSummary).toHaveBeenCalledWith("PROD");
      expect(result).toHaveProperty("deptCode", "PROD");
      expect(result).toHaveProperty("complianceRate", 82);
    });

    it("expiringProcedures — returns procedures expiring soon", async () => {
      const result = await call(deptProcedureRouter.dashboard.expiringProcedures);
      expect(mockService.getExpiringProcedures).toHaveBeenCalledWith(30);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("procedureCode", "PROD-005");
      expect(result[0]).toHaveProperty("daysUntilExpiry", 12);
    });

    it("expiringProcedures — respects custom days window", async () => {
      await call(deptProcedureRouter.dashboard.expiringProcedures, { withinDays: 60 });
      expect(mockService.getExpiringProcedures).toHaveBeenCalledWith(60);
    });
  });

  // ── review ─────────────────────────────────────────────────────────────────
  describe("review", () => {
    it("listDueForReview — returns procedures due for periodic review", async () => {
      const result = await call(deptProcedureRouter.review.listDueForReview);
      expect(mockService.listDueForReview).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("procedureCode", "PROD-001");
      expect(result[0]).toHaveProperty("reviewFrequency", "annual");
      expect(result[1]).toHaveProperty("ownerName", "王HR");
    });

    it("submitReview — submits a periodic review for a procedure", async () => {
      const result = await mutate(deptProcedureRouter.review.submitReview, {
        procedureId: 1,
        outcome: "approved",
        notes: "内容仍然适用，无需修订",
        nextReviewDate: "2027-03-13",
      });
      // Router calls: svc.submitReview(procedureId, ctx.user.id, reviewerName, outcome, notes, nextReviewDate)
      // The tRPC mock bypasses Zod's .transform(), so nextReviewDate arrives as the raw string.
      expect(mockService.submitReview).toHaveBeenCalledWith(
        1,
        1,
        "张三",
        "approved",
        "内容仍然适用，无需修订",
        "2027-03-13",
      );
      expect(result).toHaveProperty("outcome", "approved");
    });
  });
});
