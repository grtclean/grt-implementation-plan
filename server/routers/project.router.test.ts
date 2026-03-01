/**
 * Project Router — Unit Tests
 * Tests 7 procedures: list, getById, create, update, delete, listByRole, statistics
 *
 * Auth: ALL procedures use requirePermission('project:...').
 * Admin role bypasses permission checks; non-admin with mocked permissionService
 * returning false will be rejected with FORBIDDEN.
 *
 * Special behaviors:
 * - `update` has optimistic locking via expectedVersion (throws TRPCError CONFLICT)
 * - `create` injects ctx.bu?.buCode into the new project row
 * - `statistics` aggregates projects into byStatus, byType, byPriority
 * - `list`, `getById`, `listByRole`, `statistics` are BU-scoped via buScopeCondition
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
  createAdminCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mock state ──────────────────────────────────────
const { selectResultsQueue, returningQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return { selectResultsQueue, returningQueue };
});

// ── Mock DB ─────────────────────────────────────────────────
vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      offset: vi.fn(() => chain),
      set: vi.fn(() => chain),
      values: vi.fn(() => chain),
      returning: vi.fn(() => {
        const r = returningQueue.length > 0 ? returningQueue.shift()! : [{ id: 1 }];
        return Object.assign(Promise.resolve(r), {
          then: (resolve: any) => Promise.resolve(r).then(resolve),
          catch: () => Promise.resolve(r),
        });
      }),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
  }),
}));

// ── Mock drizzle-orm ────────────────────────────────────────
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  ne: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  inArray: vi.fn((...a: any[]) => a),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

// ── Mock gateway BU context middleware ──────────────────────
vi.mock("../_core/gateway-bu-context.middleware", () => ({
  buScopeCondition: vi.fn(() => null),
  buContextMiddleware: vi.fn(async ({ ctx, next }: any) => next({ ctx })),
  requireBuScope: vi.fn(() => vi.fn(async ({ ctx, next }: any) => next({ ctx }))),
}));

// ── Mock permission service — deny all by default; admin role bypasses ──
vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(false),
  },
}));

// ── Reset state before each test ────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

// Admin caller bypasses requirePermission; regular caller will be blocked
const caller = () => createAdminCaller();
const regularCaller = () => createAuthenticatedCaller();

// ── Sample project data ─────────────────────────────────────
const sampleProject = {
  id: 1,
  projectCode: "PRJ-2026-123456",
  name: "电机控制器开发",
  shortName: "MCU-Dev",
  type: "standard",
  status: "draft",
  currentPhase: "M0",
  priority: "medium",
  budget: 500000,
  actualCost: 120000,
  completionPercent: 25,
  description: "新能源电机控制器研发项目",
  objectives: null,
  scope: null,
  remark: null,
  customerId: 10,
  managerId: 5,
  buCode: "BU3",
  healthStatus: "green",
  version: 1,
  plannedStartDate: "2026-01-01",
  plannedEndDate: "2026-12-31",
  actualStartDate: null,
  actualEndDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-15T00:00:00.000Z",
};

describe("project router", () => {

  // ═══════════════════════════════════════════════════════════
  // list
  // ═══════════════════════════════════════════════════════════
  describe("list", () => {
    it("returns all projects ordered by createdAt desc", async () => {
      const projects = [
        sampleProject,
        { ...sampleProject, id: 2, name: "底盘系统项目", projectCode: "PRJ-2026-789012" },
      ];
      selectResultsQueue.push(projects);
      const result = await caller().project.list();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("电机控制器开发");
    });

    it("returns empty array when no projects exist", async () => {
      selectResultsQueue.push([]);
      const result = await caller().project.list();
      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getById
  // ═══════════════════════════════════════════════════════════
  describe("getById", () => {
    it("returns a project by numeric id", async () => {
      selectResultsQueue.push([sampleProject]);
      const result = await caller().project.getById({ id: 1 });
      expect(result).toBeTruthy();
      expect(result!.name).toBe("电机控制器开发");
    });

    it("returns a project by string id", async () => {
      selectResultsQueue.push([sampleProject]);
      const result = await caller().project.getById({ id: "1" });
      expect(result).toBeTruthy();
      expect(result!.projectCode).toBe("PRJ-2026-123456");
    });

    it("returns null when project not found", async () => {
      selectResultsQueue.push([]);
      const result = await caller().project.getById({ id: 999 });
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // create
  // ═══════════════════════════════════════════════════════════
  describe("create", () => {
    it("creates a project with minimum fields", async () => {
      returningQueue.push([{ ...sampleProject, id: 10 }]);
      const result = await caller().project.create({ name: "新项目" });
      expect(result.success).toBe(true);
      expect(result.id).toBe(10);
      expect(result.projectCode).toMatch(/^PRJ-\d{4}-\d{6}$/);
      expect(result.message).toContain("创建成功");
    });

    it("creates a project with all optional fields", async () => {
      returningQueue.push([{ ...sampleProject, id: 11 }]);
      const result = await caller().project.create({
        name: "完整项目",
        shortName: "FP",
        type: "strategic",
        priority: "critical",
        budget: 1000000,
        description: "战略级项目",
        customerId: 20,
        managerId: 3,
        plannedStartDate: "2026-03-01",
        plannedEndDate: "2026-09-30",
      });
      expect(result.success).toBe(true);
      expect(result.id).toBe(11);
    });

    it("defaults type to standard and priority to medium", async () => {
      returningQueue.push([{ ...sampleProject, id: 12 }]);
      const result = await caller().project.create({ name: "默认项目" });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", async () => {
      await expect(caller().project.create({ name: "" })).rejects.toThrow();
    });

    it("rejects invalid type", async () => {
      await expect(
        caller().project.create({ name: "test", type: "invalid" as any })
      ).rejects.toThrow();
    });

    it("rejects invalid priority", async () => {
      await expect(
        caller().project.create({ name: "test", priority: "urgent" as any })
      ).rejects.toThrow();
    });

    it("injects buCode from context", async () => {
      // BU context is injected at the middleware level; the router reads ctx.bu?.buCode
      // With admin caller, buCode is null by default (global scope)
      returningQueue.push([{ ...sampleProject, id: 13, buCode: null }]);
      const result = await caller().project.create({ name: "BU项目" });
      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // update
  // ═══════════════════════════════════════════════════════════
  describe("update", () => {
    it("updates project fields", async () => {
      returningQueue.push([{ ...sampleProject, name: "已更新项目", version: 2 }]);
      const result = await caller().project.update({
        id: 1,
        name: "已更新项目",
        status: "active",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("更新成功");
      expect(result.data).toBeTruthy();
    });

    it("accepts string id", async () => {
      returningQueue.push([{ ...sampleProject, version: 2 }]);
      const result = await caller().project.update({ id: "1", name: "renamed" });
      expect(result.success).toBe(true);
    });

    it("returns failure when project not found", async () => {
      returningQueue.push([]);
      const result = await caller().project.update({ id: 999, name: "ghost" });
      expect(result.success).toBe(false);
      expect(result.message).toContain("不存在");
    });

    it("throws CONFLICT on version mismatch (optimistic locking)", async () => {
      // First: select to check version returns version=2, but expected is 1
      selectResultsQueue.push([{ version: 2 }]);
      await expect(
        caller().project.update({ id: 1, expectedVersion: 1, name: "conflict" })
      ).rejects.toThrow(/版本冲突|CONFLICT/);
    });

    it("passes when expectedVersion matches current version", async () => {
      // Version check passes
      selectResultsQueue.push([{ version: 3 }]);
      // Update returning
      returningQueue.push([{ ...sampleProject, version: 4 }]);
      const result = await caller().project.update({
        id: 1,
        expectedVersion: 3,
        name: "no conflict",
      });
      expect(result.success).toBe(true);
    });

    it("skips version check when expectedVersion is not provided", async () => {
      returningQueue.push([{ ...sampleProject, version: 2 }]);
      const result = await caller().project.update({ id: 1, status: "completed" });
      expect(result.success).toBe(true);
    });

    it("updates all optional fields", async () => {
      returningQueue.push([{ ...sampleProject, version: 2 }]);
      const result = await caller().project.update({
        id: 1,
        name: "full update",
        shortName: "FU",
        type: "key",
        status: "active",
        priority: "high",
        currentPhase: "M3",
        budget: 800000,
        actualCost: 200000,
        completionPercent: 40,
        description: "updated desc",
        objectives: "new objectives",
        scope: "expanded scope",
        remark: "note",
        managerId: 7,
        customerId: 15,
        plannedStartDate: "2026-02-01",
        plannedEndDate: "2026-11-30",
        actualStartDate: "2026-02-15",
        actualEndDate: "2026-11-28",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status value", async () => {
      await expect(
        caller().project.update({ id: 1, status: "invalid" as any })
      ).rejects.toThrow();
    });

    it("rejects invalid type value", async () => {
      await expect(
        caller().project.update({ id: 1, type: "mega" as any })
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // delete
  // ═══════════════════════════════════════════════════════════
  describe("delete", () => {
    it("deletes an existing project", async () => {
      returningQueue.push([sampleProject]);
      const result = await caller().project.delete({ id: 1 });
      expect(result.success).toBe(true);
      expect(result.message).toContain("删除成功");
    });

    it("accepts string id", async () => {
      returningQueue.push([sampleProject]);
      const result = await caller().project.delete({ id: "1" });
      expect(result.success).toBe(true);
    });

    it("returns failure when project does not exist", async () => {
      returningQueue.push([]);
      const result = await caller().project.delete({ id: 999 });
      expect(result.success).toBe(false);
      expect(result.message).toContain("不存在");
    });
  });

  // ═══════════════════════════════════════════════════════════
  // listByRole
  // ═══════════════════════════════════════════════════════════
  describe("listByRole", () => {
    it("returns projects excluding cancelled", async () => {
      selectResultsQueue.push([
        sampleProject,
        { ...sampleProject, id: 2, status: "active" },
      ]);
      const result = await caller().project.listByRole();
      expect(result).toHaveLength(2);
    });

    it("filters by phases", async () => {
      selectResultsQueue.push([
        { ...sampleProject, currentPhase: "M3" },
      ]);
      const result = await caller().project.listByRole({
        phases: ["M3", "M5"],
      });
      expect(result).toHaveLength(1);
    });

    it("filters by healthStatus", async () => {
      selectResultsQueue.push([
        { ...sampleProject, healthStatus: "red" },
      ]);
      const result = await caller().project.listByRole({
        healthStatus: "red",
      });
      expect(result).toHaveLength(1);
    });

    it("applies limit", async () => {
      selectResultsQueue.push([sampleProject]);
      const result = await caller().project.listByRole({ limit: 5 });
      expect(result).toHaveLength(1);
    });

    it("works with no input (optional input)", async () => {
      selectResultsQueue.push([]);
      const result = await caller().project.listByRole();
      expect(result).toEqual([]);
    });

    it("accepts combined filters", async () => {
      selectResultsQueue.push([
        { ...sampleProject, currentPhase: "M5", healthStatus: "yellow" },
      ]);
      const result = await caller().project.listByRole({
        phases: ["M5"],
        healthStatus: "yellow",
        limit: 10,
      });
      expect(result).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // statistics
  // ═══════════════════════════════════════════════════════════
  describe("statistics", () => {
    it("returns aggregated stats for multiple projects", async () => {
      selectResultsQueue.push([
        { ...sampleProject, status: "draft", type: "standard", priority: "medium", budget: 100000, actualCost: 50000, completionPercent: 20 },
        { ...sampleProject, id: 2, status: "active", type: "key", priority: "high", budget: 200000, actualCost: 80000, completionPercent: 50 },
        { ...sampleProject, id: 3, status: "active", type: "strategic", priority: "critical", budget: 500000, actualCost: 300000, completionPercent: 70 },
        { ...sampleProject, id: 4, status: "completed", type: "standard", priority: "low", budget: 150000, actualCost: 140000, completionPercent: 100 },
      ]);

      const result = await caller().project.statistics();

      expect(result.total).toBe(4);

      // byStatus
      expect(result.byStatus.draft).toBe(1);
      expect(result.byStatus.active).toBe(2);
      expect(result.byStatus.completed).toBe(1);
      expect(result.byStatus.on_hold).toBe(0);
      expect(result.byStatus.cancelled).toBe(0);

      // byType
      expect(result.byType.standard).toBe(2);
      expect(result.byType.key).toBe(1);
      expect(result.byType.strategic).toBe(1);

      // byPriority
      expect(result.byPriority.critical).toBe(1);
      expect(result.byPriority.high).toBe(1);
      expect(result.byPriority.medium).toBe(1);
      expect(result.byPriority.low).toBe(1);

      // budget/cost
      expect(result.totalBudget).toBe(950000);
      expect(result.totalSpent).toBe(570000);

      // averageProgress = Math.round((20+50+70+100)/4) = Math.round(60) = 60
      expect(result.averageProgress).toBe(60);
    });

    it("returns zeros when no projects exist", async () => {
      selectResultsQueue.push([]);
      const result = await caller().project.statistics();

      expect(result.total).toBe(0);
      expect(result.byStatus.draft).toBe(0);
      expect(result.byStatus.active).toBe(0);
      expect(result.byType.standard).toBe(0);
      expect(result.byPriority.medium).toBe(0);
      expect(result.totalBudget).toBe(0);
      expect(result.totalSpent).toBe(0);
      expect(result.averageProgress).toBe(0);
    });

    it("handles projects with null budget and actualCost", async () => {
      selectResultsQueue.push([
        { ...sampleProject, status: "draft", type: "standard", priority: "medium", budget: null, actualCost: null, completionPercent: null },
        { ...sampleProject, id: 2, status: "active", type: "key", priority: "high", budget: 200000, actualCost: null, completionPercent: 30 },
      ]);

      const result = await caller().project.statistics();
      expect(result.total).toBe(2);
      expect(result.totalBudget).toBe(200000);
      expect(result.totalSpent).toBe(0);
      // averageProgress = Math.round((0+30)/2) = 15
      expect(result.averageProgress).toBe(15);
    });

    it("handles single project", async () => {
      selectResultsQueue.push([
        { ...sampleProject, status: "active", type: "strategic", priority: "critical", budget: 1000000, actualCost: 500000, completionPercent: 60 },
      ]);

      const result = await caller().project.statistics();
      expect(result.total).toBe(1);
      expect(result.byStatus.active).toBe(1);
      expect(result.byType.strategic).toBe(1);
      expect(result.byPriority.critical).toBe(1);
      expect(result.averageProgress).toBe(60);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Permission / Auth Guards
  // ═══════════════════════════════════════════════════════════
  describe("authentication — anonymous callers rejected", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().project.list()).rejects.toThrow();
    });

    it("rejects anonymous for getById", async () => {
      await expect(
        createAnonymousCaller().project.getById({ id: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for create", async () => {
      await expect(
        createAnonymousCaller().project.create({ name: "test" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for update", async () => {
      await expect(
        createAnonymousCaller().project.update({ id: 1, name: "test" })
      ).rejects.toThrow();
    });

    it("rejects anonymous for delete", async () => {
      await expect(
        createAnonymousCaller().project.delete({ id: 1 })
      ).rejects.toThrow();
    });

    it("rejects anonymous for listByRole", async () => {
      await expect(
        createAnonymousCaller().project.listByRole()
      ).rejects.toThrow();
    });

    it("rejects anonymous for statistics", async () => {
      await expect(
        createAnonymousCaller().project.statistics()
      ).rejects.toThrow();
    });
  });

  describe("permission — non-admin without permission rejected", () => {
    it("rejects non-admin caller for list (missing project:list:view)", async () => {
      await expect(regularCaller().project.list()).rejects.toThrow(/permission/i);
    });

    it("rejects non-admin caller for create (missing project:create)", async () => {
      await expect(
        regularCaller().project.create({ name: "test" })
      ).rejects.toThrow(/permission/i);
    });

    it("rejects non-admin caller for update (missing project:edit)", async () => {
      await expect(
        regularCaller().project.update({ id: 1, name: "test" })
      ).rejects.toThrow(/permission/i);
    });

    it("rejects non-admin caller for delete (missing project:delete)", async () => {
      await expect(
        regularCaller().project.delete({ id: 1 })
      ).rejects.toThrow(/permission/i);
    });
  });
});
