/**
 * Operations Dashboard Router — Comprehensive Unit Tests
 *
 * Covers all 6 procedures:
 *   - getPositions   (query) — returns positions from ai_assistant_dashboard
 *   - getGanttTasks  (query) — returns gantt tasks
 *   - getMaterials   (query) — returns materials
 *   - getProcesses   (query) — returns processes
 *   - getTeamMembers (query) — returns team members
 *   - getUSOrders    (query) — returns US orders
 *
 * Also tests:
 *   - ensureOpsDashData() bootstrap (CREATE TABLE + seed on first call)
 *   - _opsDashReady flag (subsequent calls skip bootstrap)
 *   - Empty rows fallback → returns []
 *   - Authentication guard (protectedProcedure rejects anonymous)
 *
 * Run: npx vitest run server/routers/operations-dashboard.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB with execute() queue ─────────────────────────────────────
const { executeResults } = vi.hoisted(() => {
  const executeResults: any[] = [];
  return { executeResults };
});

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => ({
    execute: vi.fn(async () => {
      return executeResults.length > 0 ? executeResults.shift()! : { rows: [] };
    }),
  })),
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

// ─── Import callers AFTER mocks ─────────────────────────────────────
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ─── Reset ──────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  executeResults.length = 0;
});

// =====================================================================
// Sample data helpers
// =====================================================================

const samplePositions = [
  { id: 1, title: "高级机械工程师", dept: "研发设计部", bu: "BU3", applicants: 12, status: "招聘中", urgency: "紧急", salary: "20-35K" },
  { id: 2, title: "PLC程序员", dept: "研发设计部", bu: "BU1", applicants: 8, status: "招聘中", urgency: "高", salary: "18-28K" },
];

const sampleGanttTasks = [
  { id: 1, name: "需求分析", project: "缸体清洗线", start: 1, duration: 3, progress: 100, color: "bg-green-500" },
  { id: 2, name: "方案设计", project: "缸体清洗线", start: 3, duration: 4, progress: 80, color: "bg-blue-500" },
];

const sampleMaterials = [
  { id: "MAT-001", name: "304不锈钢板 3mm", batch: "B2026-001", location: "A区-01-03", qty: 120, unit: "张", status: "在库", project: "缸体清洗线" },
];

const sampleProcesses = [
  { id: "WP-001", name: "钢结构焊接", category: "结构", avgTime: "4.5h", workers: 3, status: "进行中", quality: 98 },
  { id: "WP-002", name: "管路安装", category: "管路", avgTime: "3.0h", workers: 2, status: "进行中", quality: 97 },
];

const sampleTeamMembers = [
  { id: "user1", name: "张工程师", role: "高级服务工程师", capabilities: { T: 4, S: 3, D: 4, C: 3, K: 2, L: 2 }, totalPoints: 850 },
  { id: "user2", name: "李技术员", role: "技术支持工程师", capabilities: { T: 3, S: 4, D: 3, C: 4, K: 3, L: 2 }, totalPoints: 720 },
];

const sampleUSOrders = [
  { order_id: "US-2026-0042", customer_name: "John Doe", customer_email: "john.doe@acme-corp.com", unit_price: 2500, total_price: 5000, sku: "GRT-CLN-R200", quantity: 2 },
  { order_id: "US-2026-0043", customer_name: "Sarah Miller", customer_email: "s.miller@globaltech.io", unit_price: 8200, total_price: 24600, sku: "GRT-WLD-X500", quantity: 3 },
];

// =====================================================================
// 1. getPositions — first call triggers bootstrap
// =====================================================================
describe("operationsDashboard.getPositions", () => {
  it("returns positions (first call triggers bootstrap)", async () => {
    // Bootstrap: CREATE TABLE → SELECT COUNT → (count > 0, skip seed)
    executeResults.push({ rows: [] });                  // CREATE TABLE IF NOT EXISTS
    executeResults.push({ rows: [{ cnt: 5 }] });        // SELECT COUNT → non-zero = skip seed insert
    // Actual query
    executeResults.push({ rows: [{ items: samplePositions }] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getPositions();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("高级机械工程师");
    expect(result[1].dept).toBe("研发设计部");
  });

  it("returns items from rows when data exists (bootstrap already done)", async () => {
    // After first call, _opsDashReady is true — no bootstrap execute calls
    executeResults.push({ rows: [{ items: samplePositions }] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getPositions();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[0].salary).toBe("20-35K");
  });

  it("returns empty array when rows is empty", async () => {
    executeResults.push({ rows: [] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getPositions();
    expect(result).toEqual([]);
  });

  it("returns empty array when items is undefined", async () => {
    executeResults.push({ rows: [{}] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getPositions();
    expect(result).toEqual([]);
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.operationsDashboard.getPositions()).rejects.toThrow();
  });
});

// =====================================================================
// 2. getGanttTasks
// =====================================================================
describe("operationsDashboard.getGanttTasks", () => {
  it("returns gantt tasks when data exists", async () => {
    executeResults.push({ rows: [{ items: sampleGanttTasks }] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getGanttTasks();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("需求分析");
    expect(result[0].progress).toBe(100);
    expect(result[1].duration).toBe(4);
  });

  it("returns empty array when no rows", async () => {
    executeResults.push({ rows: [] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getGanttTasks();
    expect(result).toEqual([]);
  });

  it("returns empty array when items is missing from row", async () => {
    executeResults.push({ rows: [{ something_else: "data" }] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getGanttTasks();
    expect(result).toEqual([]);
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.operationsDashboard.getGanttTasks()).rejects.toThrow();
  });
});

// =====================================================================
// 3. getMaterials
// =====================================================================
describe("operationsDashboard.getMaterials", () => {
  it("returns materials when data exists", async () => {
    executeResults.push({ rows: [{ items: sampleMaterials }] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getMaterials();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("MAT-001");
    expect(result[0].name).toBe("304不锈钢板 3mm");
    expect(result[0].qty).toBe(120);
  });

  it("returns empty array when no rows", async () => {
    executeResults.push({ rows: [] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getMaterials();
    expect(result).toEqual([]);
  });

  it("returns empty array when items is null", async () => {
    executeResults.push({ rows: [{ items: null }] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getMaterials();
    // null ?? [] → []
    expect(result).toEqual([]);
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.operationsDashboard.getMaterials()).rejects.toThrow();
  });
});

// =====================================================================
// 4. getProcesses
// =====================================================================
describe("operationsDashboard.getProcesses", () => {
  it("returns processes when data exists", async () => {
    executeResults.push({ rows: [{ items: sampleProcesses }] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getProcesses();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("WP-001");
    expect(result[0].name).toBe("钢结构焊接");
    expect(result[0].quality).toBe(98);
    expect(result[1].category).toBe("管路");
  });

  it("returns empty array when no rows", async () => {
    executeResults.push({ rows: [] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getProcesses();
    expect(result).toEqual([]);
  });

  it("returns empty array when row has no items field", async () => {
    executeResults.push({ rows: [{}] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getProcesses();
    expect(result).toEqual([]);
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.operationsDashboard.getProcesses()).rejects.toThrow();
  });
});

// =====================================================================
// 5. getTeamMembers
// =====================================================================
describe("operationsDashboard.getTeamMembers", () => {
  it("returns team members when data exists", async () => {
    executeResults.push({ rows: [{ items: sampleTeamMembers }] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getTeamMembers();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("user1");
    expect(result[0].name).toBe("张工程师");
    expect(result[0].capabilities.T).toBe(4);
    expect(result[0].totalPoints).toBe(850);
    expect(result[1].role).toBe("技术支持工程师");
  });

  it("returns empty array when no rows", async () => {
    executeResults.push({ rows: [] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getTeamMembers();
    expect(result).toEqual([]);
  });

  it("returns empty array when items is undefined in row", async () => {
    executeResults.push({ rows: [{ items: undefined }] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getTeamMembers();
    // undefined ?? [] → []
    expect(result).toEqual([]);
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.operationsDashboard.getTeamMembers()).rejects.toThrow();
  });
});

// =====================================================================
// 6. getUSOrders
// =====================================================================
describe("operationsDashboard.getUSOrders", () => {
  it("returns US orders when data exists", async () => {
    executeResults.push({ rows: [{ items: sampleUSOrders }] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getUSOrders();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].order_id).toBe("US-2026-0042");
    expect(result[0].customer_name).toBe("John Doe");
    expect(result[0].total_price).toBe(5000);
    expect(result[1].sku).toBe("GRT-WLD-X500");
    expect(result[1].quantity).toBe(3);
  });

  it("returns empty array when no rows", async () => {
    executeResults.push({ rows: [] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getUSOrders();
    expect(result).toEqual([]);
  });

  it("returns empty array when items is null", async () => {
    executeResults.push({ rows: [{ items: null }] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getUSOrders();
    expect(result).toEqual([]);
  });

  it("returns actual items array (not nested)", async () => {
    const singleOrder = [{ order_id: "US-2026-0099", customer_name: "Test Customer" }];
    executeResults.push({ rows: [{ items: singleOrder }] });

    const caller = createAdminCaller();
    const result = await caller.operationsDashboard.getUSOrders();
    expect(result).toHaveLength(1);
    expect(result[0].order_id).toBe("US-2026-0099");
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.operationsDashboard.getUSOrders()).rejects.toThrow();
  });
});

// =====================================================================
// Bootstrap edge cases
// =====================================================================
describe("operationsDashboard — bootstrap behavior", () => {
  it("skips bootstrap on all calls after first (flag persists across procedures)", async () => {
    // Since _opsDashReady was set to true by the first test suite above,
    // all subsequent calls only need the actual query result.
    // Each procedure just needs 1 executeResult for the SELECT query.
    executeResults.push({ rows: [{ items: samplePositions }] });
    executeResults.push({ rows: [{ items: sampleGanttTasks }] });
    executeResults.push({ rows: [{ items: sampleMaterials }] });

    const caller = createAdminCaller();

    const positions = await caller.operationsDashboard.getPositions();
    expect(positions).toHaveLength(2);

    const gantt = await caller.operationsDashboard.getGanttTasks();
    expect(gantt).toHaveLength(2);

    const materials = await caller.operationsDashboard.getMaterials();
    expect(materials).toHaveLength(1);
  });

  it("handles all six procedures in sequence without extra bootstrap calls", async () => {
    executeResults.push({ rows: [{ items: [{ id: 1 }] }] });
    executeResults.push({ rows: [{ items: [{ id: 2 }] }] });
    executeResults.push({ rows: [{ items: [{ id: 3 }] }] });
    executeResults.push({ rows: [{ items: [{ id: 4 }] }] });
    executeResults.push({ rows: [{ items: [{ id: 5 }] }] });
    executeResults.push({ rows: [{ items: [{ id: 6 }] }] });

    const caller = createAdminCaller();

    const r1 = await caller.operationsDashboard.getPositions();
    expect(r1).toEqual([{ id: 1 }]);

    const r2 = await caller.operationsDashboard.getGanttTasks();
    expect(r2).toEqual([{ id: 2 }]);

    const r3 = await caller.operationsDashboard.getMaterials();
    expect(r3).toEqual([{ id: 3 }]);

    const r4 = await caller.operationsDashboard.getProcesses();
    expect(r4).toEqual([{ id: 4 }]);

    const r5 = await caller.operationsDashboard.getTeamMembers();
    expect(r5).toEqual([{ id: 5 }]);

    const r6 = await caller.operationsDashboard.getUSOrders();
    expect(r6).toEqual([{ id: 6 }]);
  });
});

// =====================================================================
// Authentication guards — comprehensive
// =====================================================================
describe("operationsDashboard — authentication", () => {
  it("rejects anonymous for all six procedures", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.operationsDashboard.getPositions()).rejects.toThrow();
    await expect(caller.operationsDashboard.getGanttTasks()).rejects.toThrow();
    await expect(caller.operationsDashboard.getMaterials()).rejects.toThrow();
    await expect(caller.operationsDashboard.getProcesses()).rejects.toThrow();
    await expect(caller.operationsDashboard.getTeamMembers()).rejects.toThrow();
    await expect(caller.operationsDashboard.getUSOrders()).rejects.toThrow();
  });
});
