/**
 * AI Open Claw Router — Unit Tests
 *
 * Tests 15 procedures across 3 sub-routers:
 *   registry  (5) — list, get, register, update, deactivate
 *   access    (4) — listByTool, listByRole, grant, revoke
 *   execution (6) — execute, getStatus, approve, reject, listRecent, stats
 *
 * Mocks: db (drizzle chain), ai-claw.service, clawWorker
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue, returningQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return { selectResultsQueue, returningQueue };
});

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
      groupBy: vi.fn(() => chain),
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

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  and: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

// ── Mock service functions ─────────────────────────────────────

const mockResolveTool = vi.fn();
const mockCheckRoleToolAccess = vi.fn();
const mockLogClawAudit = vi.fn();
const mockCreateClawTask = vi.fn();

vi.mock("../services/ai-claw.service", () => ({
  resolveTool: (...args: any[]) => mockResolveTool(...args),
  checkRoleToolAccess: (...args: any[]) => mockCheckRoleToolAccess(...args),
  logClawAudit: (...args: any[]) => mockLogClawAudit(...args),
  createClawTask: (...args: any[]) => mockCreateClawTask(...args),
}));

const mockTriggerClawWorker = vi.fn();
vi.mock("../workers/clawWorker", () => ({
  triggerClawWorker: (...args: any[]) => mockTriggerClawWorker(...args),
}));

// ── Helpers ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
  mockResolveTool.mockReset();
  mockCheckRoleToolAccess.mockReset();
  mockLogClawAudit.mockReset();
  mockCreateClawTask.mockReset();
  mockTriggerClawWorker.mockReturnValue(Promise.resolve());
});

const caller = () => createAdminCaller();
const anonCaller = () => createAnonymousCaller();

const sampleTool = {
  id: 1,
  toolCode: "web_search",
  name: "网络搜索",
  nameEn: "Web Search",
  category: "search",
  endpointUrl: "https://api.example.com/search?q={query}",
  httpMethod: "GET",
  defaultHeaders: null,
  defaultParams: null,
  timeoutMs: 30000,
  maxRetries: 3,
  requiresApproval: false,
  riskLevel: "low",
  isActive: true,
  createdBy: 1,
  createdAt: "2026-03-09T10:00:00.000Z",
  updatedAt: "2026-03-09T10:00:00.000Z",
};

const sampleMapping = {
  id: 1,
  roleCode: "admin",
  toolId: 1,
  canExecute: true,
  canApprove: false,
  grantedBy: 1,
  createdAt: "2026-03-09T10:00:00.000Z",
};

const sampleTask = {
  id: 10,
  taskType: "CLAW_EXTERNAL_TOOL",
  status: "pending",
  inputData: { toolCode: "web_search", toolId: 1, params: { query: "test" } },
  resultData: null,
  errorMessage: null,
  createdBy: "1",
  startedAt: null,
  completedAt: null,
  createdAt: "2026-03-09T10:00:00.000Z",
};

// ═══════════════════════════════════════════════════════════════
// 1. Registry sub-router
// ═══════════════════════════════════════════════════════════════

describe("ai-claw registry", () => {
  describe("list", () => {
    it("returns all tools", async () => {
      selectResultsQueue.push([sampleTool]);
      const result = await caller().aiClaw.registry.list();
      expect(result).toHaveLength(1);
      expect(result[0].toolCode).toBe("web_search");
    });

    it("returns empty when no tools", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiClaw.registry.list();
      expect(result).toHaveLength(0);
    });

    it("accepts category filter", async () => {
      selectResultsQueue.push([sampleTool]);
      const result = await caller().aiClaw.registry.list({ category: "search" });
      expect(result).toHaveLength(1);
    });
  });

  describe("get", () => {
    it("returns tool by code", async () => {
      mockResolveTool.mockResolvedValue(sampleTool);
      const result = await caller().aiClaw.registry.get({ toolCode: "web_search" });
      expect(result.toolCode).toBe("web_search");
    });

    it("throws NOT_FOUND for unknown tool", async () => {
      mockResolveTool.mockResolvedValue(null);
      await expect(caller().aiClaw.registry.get({ toolCode: "nope" }))
        .rejects.toThrow(/not found/i);
    });
  });

  describe("register", () => {
    it("creates a new tool", async () => {
      returningQueue.push([{ ...sampleTool, id: 5 }]);
      const result = await caller().aiClaw.registry.register({
        toolCode: "new_tool",
        name: "新工具",
        category: "general",
        endpointUrl: "https://api.example.com/new",
      });
      expect(result.id).toBe(5);
    });

    it("rejects invalid URL", async () => {
      await expect(caller().aiClaw.registry.register({
        toolCode: "bad",
        name: "Bad",
        category: "general",
        endpointUrl: "not-a-url",
      })).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("updates tool config", async () => {
      returningQueue.push([{ ...sampleTool, name: "Updated" }]);
      const result = await caller().aiClaw.registry.update({
        toolCode: "web_search",
        name: "Updated",
      });
      expect(result.name).toBe("Updated");
    });

    it("throws NOT_FOUND for missing tool", async () => {
      returningQueue.push([]);
      await expect(caller().aiClaw.registry.update({
        toolCode: "nope",
        name: "Nope",
      })).rejects.toThrow(/not found/i);
    });
  });

  describe("deactivate", () => {
    it("soft-deactivates a tool", async () => {
      returningQueue.push([{ ...sampleTool, isActive: false }]);
      const result = await caller().aiClaw.registry.deactivate({ toolCode: "web_search" });
      expect(result.success).toBe(true);
    });

    it("throws NOT_FOUND for missing tool", async () => {
      returningQueue.push([]);
      await expect(caller().aiClaw.registry.deactivate({ toolCode: "nope" }))
        .rejects.toThrow(/not found/i);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Access sub-router
// ═══════════════════════════════════════════════════════════════

describe("ai-claw access", () => {
  describe("listByTool", () => {
    it("returns role mappings for a tool", async () => {
      selectResultsQueue.push([sampleMapping]);
      const result = await caller().aiClaw.access.listByTool({ toolId: 1 });
      expect(result).toHaveLength(1);
      expect(result[0].roleCode).toBe("admin");
    });
  });

  describe("listByRole", () => {
    it("returns tool mappings for a role", async () => {
      selectResultsQueue.push([sampleMapping]);
      const result = await caller().aiClaw.access.listByRole({ roleCode: "admin" });
      expect(result).toHaveLength(1);
    });
  });

  describe("grant", () => {
    it("grants role access to a tool", async () => {
      returningQueue.push([{ ...sampleMapping, id: 5 }]);
      const result = await caller().aiClaw.access.grant({
        roleCode: "director",
        toolId: 1,
        canExecute: true,
        canApprove: true,
      });
      expect(result.id).toBe(5);
    });
  });

  describe("revoke", () => {
    it("revokes role access", async () => {
      returningQueue.push([sampleMapping]);
      const result = await caller().aiClaw.access.revoke({
        roleCode: "admin",
        toolId: 1,
      });
      expect(result.success).toBe(true);
    });

    it("throws NOT_FOUND when mapping missing", async () => {
      returningQueue.push([]);
      await expect(caller().aiClaw.access.revoke({
        roleCode: "nobody",
        toolId: 999,
      })).rejects.toThrow(/not found/i);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Execution sub-router
// ═══════════════════════════════════════════════════════════════

describe("ai-claw execution", () => {
  describe("execute", () => {
    it("executes tool (no approval needed)", async () => {
      mockResolveTool.mockResolvedValue(sampleTool);
      mockCheckRoleToolAccess.mockResolvedValue({ canExecute: true, canApprove: false });
      mockCreateClawTask.mockResolvedValue(10);

      const result = await caller().aiClaw.execution.execute({
        toolCode: "web_search",
        params: { query: "test" },
      });

      expect(result.taskId).toBe(10);
      expect(result.status).toBe("pending");
      expect(result.requiresApproval).toBe(false);
      expect(mockTriggerClawWorker).toHaveBeenCalled();
      expect(mockLogClawAudit).toHaveBeenCalled();
    });

    it("queues for approval when tool requires it", async () => {
      const approvalTool = { ...sampleTool, requiresApproval: true, riskLevel: "high" };
      mockResolveTool.mockResolvedValue(approvalTool);
      mockCheckRoleToolAccess.mockResolvedValue({ canExecute: true, canApprove: false });
      mockCreateClawTask.mockResolvedValue(11);

      const result = await caller().aiClaw.execution.execute({
        toolCode: "web_search",
        params: {},
      });

      expect(result.status).toBe("pending_approval");
      expect(result.requiresApproval).toBe(true);
      // Worker should NOT be triggered for approval-required tools
      expect(mockTriggerClawWorker).not.toHaveBeenCalled();
    });

    it("throws NOT_FOUND for unknown tool", async () => {
      mockResolveTool.mockResolvedValue(null);
      await expect(caller().aiClaw.execution.execute({
        toolCode: "nonexistent",
      })).rejects.toThrow(/not found/i);
    });

    it("throws FORBIDDEN when role lacks access", async () => {
      mockResolveTool.mockResolvedValue(sampleTool);
      mockCheckRoleToolAccess.mockResolvedValue({ canExecute: false, canApprove: false });

      await expect(caller().aiClaw.execution.execute({
        toolCode: "web_search",
      })).rejects.toThrow(/does not have execute access/i);
    });

    it("rejects anonymous users", async () => {
      await expect(anonCaller().aiClaw.execution.execute({
        toolCode: "web_search",
      })).rejects.toThrow();
    });
  });

  describe("getStatus", () => {
    it("returns task status", async () => {
      selectResultsQueue.push([sampleTask]);
      const result = await caller().aiClaw.execution.getStatus({ taskId: 10 });
      expect(result.status).toBe("pending");
      expect(result.taskType).toBe("CLAW_EXTERNAL_TOOL");
    });

    it("throws NOT_FOUND for missing task", async () => {
      selectResultsQueue.push([]);
      await expect(caller().aiClaw.execution.getStatus({ taskId: 999 }))
        .rejects.toThrow(/not found/i);
    });
  });

  describe("approve", () => {
    it("approves pending_approval task and fires worker", async () => {
      const pendingTask = { ...sampleTask, status: "pending_approval" };
      selectResultsQueue.push([pendingTask]);
      mockResolveTool.mockResolvedValue(sampleTool);

      const result = await caller().aiClaw.execution.approve({ taskId: 10 });
      expect(result.status).toBe("pending");
      expect(mockTriggerClawWorker).toHaveBeenCalled();
      expect(mockLogClawAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "APPROVE" })
      );
    });

    it("rejects approval for non-pending_approval task", async () => {
      selectResultsQueue.push([{ ...sampleTask, status: "completed" }]);
      await expect(caller().aiClaw.execution.approve({ taskId: 10 }))
        .rejects.toThrow(/expected 'pending_approval'/i);
    });

    it("throws NOT_FOUND for missing task", async () => {
      selectResultsQueue.push([]);
      await expect(caller().aiClaw.execution.approve({ taskId: 999 }))
        .rejects.toThrow(/not found/i);
    });
  });

  describe("reject", () => {
    it("rejects pending_approval task", async () => {
      selectResultsQueue.push([{ ...sampleTask, status: "pending_approval" }]);
      const result = await caller().aiClaw.execution.reject({
        taskId: 10,
        reason: "Not needed",
      });
      expect(result.status).toBe("rejected");
      expect(mockLogClawAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "REJECT" })
      );
    });

    it("rejects rejection for non-pending_approval task", async () => {
      selectResultsQueue.push([{ ...sampleTask, status: "processing" }]);
      await expect(caller().aiClaw.execution.reject({ taskId: 10 }))
        .rejects.toThrow(/expected 'pending_approval'/i);
    });
  });

  describe("listRecent", () => {
    it("returns recent CLAW tasks", async () => {
      selectResultsQueue.push([sampleTask]);
      const result = await caller().aiClaw.execution.listRecent();
      expect(result).toHaveLength(1);
    });

    it("returns empty when no tasks", async () => {
      selectResultsQueue.push([]);
      const result = await caller().aiClaw.execution.listRecent();
      expect(result).toHaveLength(0);
    });
  });

  describe("stats", () => {
    it("returns execution stats grouped by status", async () => {
      selectResultsQueue.push([
        { status: "completed", count: 15 },
        { status: "failed", count: 3 },
        { status: "pending", count: 1 },
      ]);
      const result = await caller().aiClaw.execution.stats();
      expect(result).toHaveLength(3);
      expect(result[0].status).toBe("completed");
    });
  });
});
