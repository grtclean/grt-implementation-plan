/**
 * Kiosk Router — Comprehensive Automated Test Suite
 *
 * Covers all 8 procedures:
 *   - identifyOperator (query) — operator lookup + qualification check
 *   - getStationQueue (query) — prioritized task queue for station
 *   - submitInspection (mutation) — IATF 16949 inspection submission
 *   - getStationSOP (query) — SOP + checkpoints retrieval
 *   - operatorPunchIn (mutation) — VDA 6.3 qualification verification
 *   - createQrSession (mutation) — QR session creation (in-memory)
 *   - pollQrSession (query) — QR session status polling
 *   - confirmQrSession (mutation) — QR session confirmation
 *   - getQrSessionInfo (query) — QR session info retrieval
 *
 * Run: npx vitest run server/routers/kiosk.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB (two-layer pattern to avoid thenable unwrapping) ────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [];
const selectResultsQueue: any[][] = [];

let mockExecuteResult: any = [[]];

function getNextResult() {
  return selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : mockQueryResult;
}

function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from", "where", "orderBy", "limit", "offset", "values", "set",
    "onConflictDoUpdate", "onConflictDoNothing", "groupBy", "having",
    "innerJoin", "leftJoin", "rightJoin", "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try { return resolve(getNextResult()); }
    catch (e) { if (reject) return reject(e); throw e; }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => Promise.resolve(mockExecuteResult)),
    $count: vi.fn(() => Promise.resolve(0)),
    transaction: vi.fn(async (fn: any) => fn(db)),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  getDb: vi.fn(async () => mockDb),
  requireDb: vi.fn(async () => mockDb),
}));

// ─── Mock schema modules ─────────────────────────────────────────────
vi.mock("../../drizzle/schema", () => ({
  users: {
    id: "users.id",
    openId: "users.openId",
    name: "users.name",
    role: "users.role",
  },
  sopTemplates: {
    id: "sopTemplates.id",
    processCode: "sopTemplates.processCode",
    title: "sopTemplates.title",
    version: "sopTemplates.version",
    steps: "sopTemplates.steps",
    difficultyLevel: "sopTemplates.difficultyLevel",
  },
}));

vi.mock("../../drizzle/kiosk-station-schema", () => ({
  stations: {
    id: "stations.id",
    code: "stations.code",
  },
  defectCodes: {
    id: "defectCodes.id",
    code: "defectCodes.code",
  },
  executionLogs: {
    id: "executionLogs.id",
  },
}));

// ─── Import caller utility AFTER mocks ──────────────────────────────
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ─── Helper to reset everything ──────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  mockExecuteResult = [[]];
  selectResultsQueue.length = 0;
});

// =====================================================================
// 1. identifyOperator
// =====================================================================
describe("kiosk.identifyOperator", () => {
  it("should return operator info when user is found", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      { id: 42, name: "Zhang Wei", openId: "EMP-001", role: "operator" },
    ]);
    // For the certifications query via db.execute
    mockExecuteResult = { rows: [] };

    const result = await caller.kiosk.identifyOperator({ employeeId: "EMP-001" });

    expect(result.operator).not.toBeNull();
    expect(result.operator!.id).toBe(42);
    expect(result.operator!.name).toBe("Zhang Wei");
    expect(result.operator!.role).toBe("operator");
    expect(result.qualificationStatus).toBe("none");
  });

  it("should return not_found when no user matches", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);

    const result = await caller.kiosk.identifyOperator({ employeeId: "INVALID-999" });

    expect(result.operator).toBeNull();
    expect(result.qualificationStatus).toBe("not_found");
  });

  it("should return valid qualification status when certs exist and are current", async () => {
    const caller = createAuthenticatedCaller();
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    selectResultsQueue.push([
      { id: 10, name: "Li Ming", openId: "EMP-010", role: "employee" },
    ]);
    mockExecuteResult = {
      rows: [
        { name: "焊接资质证", expiry_date: futureDate },
        { name: "安全培训证", expiry_date: futureDate },
      ],
    };

    const result = await caller.kiosk.identifyOperator({ employeeId: "EMP-010" });

    expect(result.operator).not.toBeNull();
    expect(result.operator!.qualifications).toHaveLength(2);
    expect(result.operator!.qualifications[0].isValid).toBe(true);
    expect(result.operator!.qualifications[1].isValid).toBe(true);
    expect(result.qualificationStatus).toBe("valid");
  });

  it("should return expired status when any cert is expired", async () => {
    const caller = createAuthenticatedCaller();
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    selectResultsQueue.push([
      { id: 11, name: "Wang Fang", openId: "EMP-011", role: "employee" },
    ]);
    mockExecuteResult = {
      rows: [
        { name: "过期资质", expiry_date: pastDate },
        { name: "有效资质", expiry_date: futureDate },
      ],
    };

    const result = await caller.kiosk.identifyOperator({ employeeId: "EMP-011" });

    expect(result.qualificationStatus).toBe("expired");
    expect(result.operator!.qualifications[0].isValid).toBe(false);
    expect(result.operator!.qualifications[1].isValid).toBe(true);
  });

  it("should treat null expiry_date as valid", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      { id: 12, name: "Chen Jie", openId: "EMP-012", role: "employee" },
    ]);
    mockExecuteResult = {
      rows: [
        { name: "永久资质", expiry_date: null },
      ],
    };

    const result = await caller.kiosk.identifyOperator({ employeeId: "EMP-012" });

    expect(result.qualificationStatus).toBe("valid");
    expect(result.operator!.qualifications[0].isValid).toBe(true);
    expect(result.operator!.qualifications[0].expiresAt).toBeNull();
  });

  it("should use employeeId as fallback name when user.name is null", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      { id: 13, name: null, openId: "EMP-013", role: "employee" },
    ]);
    mockExecuteResult = { rows: [] };

    const result = await caller.kiosk.identifyOperator({ employeeId: "EMP-013" });

    expect(result.operator!.name).toBe("EMP-013");
  });

  it("should default role to 'employee' when user.role is null", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      { id: 14, name: "No Role", openId: "EMP-014", role: null },
    ]);
    mockExecuteResult = { rows: [] };

    const result = await caller.kiosk.identifyOperator({ employeeId: "EMP-014" });

    expect(result.operator!.role).toBe("employee");
  });

  it("should handle certification query failure gracefully", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      { id: 15, name: "Test User", openId: "EMP-015", role: "operator" },
    ]);
    // db.execute throws — the router catches and proceeds without qualifications
    mockDb.execute.mockRejectedValueOnce(new Error("Table not found"));

    const result = await caller.kiosk.identifyOperator({ employeeId: "EMP-015" });

    expect(result.operator).not.toBeNull();
    expect(result.operator!.qualifications).toHaveLength(0);
    expect(result.qualificationStatus).toBe("none");
  });

  it("should reject empty employeeId", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.kiosk.identifyOperator({ employeeId: "" })
    ).rejects.toThrow();
  });
});

// =====================================================================
// 2. getStationQueue
// =====================================================================
describe("kiosk.getStationQueue", () => {
  it("should return tasks from production stages", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = {
      rows: [
        {
          id: 1,
          project_id: 100,
          stage_code: "T3",
          status: "Pending",
          assigned_user_name: "Zhang Wei",
          updated_at: "2026-03-01T10:00:00Z",
          project_code: "PRJ-100",
          customer_name: "ABC Corp",
        },
        {
          id: 2,
          project_id: 101,
          stage_code: "T5",
          status: "InProgress",
          assigned_user_name: "Li Ming",
          updated_at: "2026-03-01T09:00:00Z",
          project_code: "PRJ-101",
          customer_name: "",
        },
      ],
    };

    const result = await caller.kiosk.getStationQueue({ stationId: "S001" });

    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].id).toBe(1);
    expect(result.tasks[0].projectCode).toBe("PRJ-100");
    expect(result.tasks[0].status).toBe("pending");
    expect(result.tasks[1].status).toBe("in_progress");
  });

  it("should return empty tasks when no production stages match", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = { rows: [] };

    const result = await caller.kiosk.getStationQueue({ stationId: "S999" });

    expect(result.tasks).toEqual([]);
  });

  it("should handle optional processCode filter", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = { rows: [] };

    const result = await caller.kiosk.getStationQueue({
      stationId: "S001",
      processCode: "T3",
    });

    expect(result.tasks).toEqual([]);
    expect(mockDb.execute).toHaveBeenCalled();
  });

  it("should handle optional operatorId parameter", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = { rows: [] };

    const result = await caller.kiosk.getStationQueue({
      stationId: "S001",
      operatorId: 42,
    });

    expect(result.tasks).toEqual([]);
  });

  it("should fallback project code when project_code is null", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = {
      rows: [
        {
          id: 3,
          project_id: 200,
          stage_code: "T1",
          status: "Ready",
          assigned_user_name: null,
          updated_at: "2026-03-01T08:00:00Z",
          project_code: null,
          customer_name: null,
        },
      ],
    };

    const result = await caller.kiosk.getStationQueue({ stationId: "S001" });

    expect(result.tasks[0].projectCode).toBe("P-200");
    expect(result.tasks[0].customerName).toBe("");
  });

  it("should lowercase status values correctly", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = {
      rows: [
        {
          id: 4, project_id: 300, stage_code: "T2", status: "Ready",
          assigned_user_name: null, updated_at: null, project_code: "P-300",
          customer_name: "",
        },
      ],
    };

    const result = await caller.kiosk.getStationQueue({ stationId: "S001" });

    expect(result.tasks[0].status).toBe("ready");
  });

  it("should handle null status gracefully", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = {
      rows: [
        {
          id: 5, project_id: 400, stage_code: "T4", status: null,
          assigned_user_name: null, updated_at: null, project_code: "P-400",
          customer_name: "",
        },
      ],
    };

    const result = await caller.kiosk.getStationQueue({ stationId: "S001" });

    expect(result.tasks[0].status).toBe("pending");
  });

  it("should return empty tasks on db error", async () => {
    const caller = createAuthenticatedCaller();
    mockDb.execute.mockRejectedValueOnce(new Error("DB error"));

    const result = await caller.kiosk.getStationQueue({ stationId: "S001" });

    expect(result.tasks).toEqual([]);
  });

  it("should handle non-array execute result", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = "not-an-array";

    const result = await caller.kiosk.getStationQueue({ stationId: "S001" });

    expect(result.tasks).toEqual([]);
  });
});

// =====================================================================
// 3. submitInspection
// =====================================================================
describe("kiosk.submitInspection", () => {
  const baseInput = {
    projectId: "PRJ-100",
    processCode: "T3",
    result: "pass" as const,
    stationId: "S001",
    materialBarcode: "BC-12345",
  };

  it("should submit a passing inspection successfully", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = { insertId: 42 };
    // Station FK lookup returns a station
    selectResultsQueue.push([{ id: 1 }]);

    const result = await caller.kiosk.submitInspection(baseInput);

    expect(result.success).toBe(true);
    expect(result.nextAction).toBe("continue");
  });

  it("should return review_required for failed inspections", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = { insertId: 43 };
    selectResultsQueue.push([{ id: 1 }]);

    const result = await caller.kiosk.submitInspection({
      ...baseInput,
      result: "fail",
      defectType: "surface_scratch",
      defectCode: "E-001",
    });

    expect(result.success).toBe(true);
    expect(result.nextAction).toBe("review_required");
  });

  it("should create defect record when result is fail with defectType", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = { insertId: 44 };
    selectResultsQueue.push([{ id: 1 }]);

    const result = await caller.kiosk.submitInspection({
      ...baseInput,
      result: "fail",
      defectType: "contamination",
      defectCode: "E-002",
      remark: "表面有油污残留",
    });

    expect(result.success).toBe(true);
    // db.execute called multiple times: insert check result, insert defect, insert execution_log fallback
    expect(mockDb.execute).toHaveBeenCalled();
  });

  it("should handle optional checkpointId", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = { insertId: 45 };
    selectResultsQueue.push([{ id: 1 }]);

    const result = await caller.kiosk.submitInspection({
      ...baseInput,
      checkpointId: 7,
    });

    expect(result.success).toBe(true);
  });

  it("should handle optional batchId", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = { insertId: 46 };
    selectResultsQueue.push([{ id: 1 }]);

    const result = await caller.kiosk.submitInspection({
      ...baseInput,
      batchId: "BATCH-2026-001",
    });

    expect(result.success).toBe(true);
  });

  it("should handle clientTimestamp for cycle time calculation", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = { insertId: 47 };
    selectResultsQueue.push([{ id: 1 }]);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const result = await caller.kiosk.submitInspection({
      ...baseInput,
      clientTimestamp: fiveMinutesAgo,
    });

    expect(result.success).toBe(true);
  });

  it("should reject missing materialBarcode (empty string)", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.kiosk.submitInspection({
        ...baseInput,
        materialBarcode: "",
      })
    ).rejects.toThrow();
  });

  it("should handle DB error gracefully and return success=false", async () => {
    const caller = createAuthenticatedCaller();
    mockDb.execute.mockRejectedValueOnce(new Error("Connection lost"));

    const result = await caller.kiosk.submitInspection(baseInput);

    expect(result.success).toBe(false);
    expect(result.inspectionId).toBe(0);
    expect(result.nextAction).toBe("error");
  });

  it("should handle insertId from rows array format", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = { rows: [{ insertId: 99 }] };
    selectResultsQueue.push([{ id: 1 }]);

    const result = await caller.kiosk.submitInspection(baseInput);

    expect(result.success).toBe(true);
    expect(result.inspectionId).toBe(99);
  });

  it("should use stationId FK path when station found in kiosk schema", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = { insertId: 50 };
    // Station lookup returns a row -> triggers ORM insert path
    selectResultsQueue.push([{ id: 5 }]);

    const result = await caller.kiosk.submitInspection(baseInput);

    expect(result.success).toBe(true);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("should fallback to raw SQL when station FK not found", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = { insertId: 51 };
    // Station lookup returns empty -> triggers raw SQL fallback
    selectResultsQueue.push([]);
    // defect code lookup (empty, no fail)
    // no further selects needed for pass

    const result = await caller.kiosk.submitInspection(baseInput);

    expect(result.success).toBe(true);
  });

  it("should resolve defect code FK when result is fail", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = { insertId: 52 };
    // Station lookup
    selectResultsQueue.push([{ id: 3 }]);
    // Defect code lookup
    selectResultsQueue.push([{ id: 7 }]);

    const result = await caller.kiosk.submitInspection({
      ...baseInput,
      result: "fail",
      defectType: "dimensional",
      defectCode: "E-003",
    });

    expect(result.success).toBe(true);
    expect(result.nextAction).toBe("review_required");
  });
});

// =====================================================================
// 4. getStationSOP
// =====================================================================
describe("kiosk.getStationSOP", () => {
  it("should return SOP with steps and checkpoints", async () => {
    const caller = createAuthenticatedCaller();
    const sopSteps = JSON.stringify([
      { stepNo: 1, title: "准备清洗液", description: "按比例配制", duration: 5, tools: ["量杯"], safetyNotes: "戴手套" },
      { stepNo: 2, title: "放置工件", description: "固定夹具", duration: 3 },
    ]);
    selectResultsQueue.push([
      { id: 1, title: "超声波清洗SOP", version: "2.1", processCode: "T1", steps: sopSteps, difficultyLevel: "high" },
    ]);
    mockExecuteResult = {
      rows: [
        { id: 10, checkpoint_name: "温度检查", checkpoint_type: "measurement", acceptance_criteria: "60-70°C", is_mandatory: true },
        { id: 11, checkpoint_name: "浊度检查", checkpoint_type: "visual", acceptance_criteria: "<50 NTU", is_mandatory: false },
      ],
    };

    const result = await caller.kiosk.getStationSOP({ projectId: 100, processCode: "T1" });

    expect(result.sop).not.toBeNull();
    expect(result.sop!.name).toBe("超声波清洗SOP");
    expect(result.sop!.version).toBe("2.1");
    expect(result.sop!.difficultyLevel).toBe("high");
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].title).toBe("准备清洗液");
    expect(result.steps[0].tools).toEqual(["量杯"]);
    expect(result.steps[0].safetyWarning).toBe("戴手套");
    expect(result.steps[1].safetyWarning).toBeNull();
    expect(result.checkpoints).toHaveLength(2);
    expect(result.checkpoints[0].name).toBe("温度检查");
    expect(result.checkpoints[0].isMandatory).toBe(true);
    expect(result.checkpoints[1].isMandatory).toBe(false);
  });

  it("should return null sop when no SOP template found", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);
    mockExecuteResult = { rows: [] };

    const result = await caller.kiosk.getStationSOP({ projectId: "PRJ-200", processCode: "T99" });

    expect(result.sop).toBeNull();
    expect(result.steps).toEqual([]);
    expect(result.checkpoints).toEqual([]);
  });

  it("should accept string projectId", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);
    mockExecuteResult = { rows: [] };

    const result = await caller.kiosk.getStationSOP({ projectId: "PRJ-300", processCode: "T5" });

    expect(result.sop).toBeNull();
  });

  it("should accept numeric projectId", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);
    mockExecuteResult = { rows: [] };

    const result = await caller.kiosk.getStationSOP({ projectId: 42, processCode: "T5" });

    expect(result.sop).toBeNull();
  });

  it("should handle SOP with already-parsed steps (object, not string)", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      {
        id: 2, title: "Assembly SOP", version: "1.0", processCode: "T8",
        steps: [
          { name: "Assemble", description: "Put parts together", estimatedMinutes: 10, imageUrl: "/img/step1.png" },
        ],
        difficultyLevel: "medium",
      },
    ]);
    mockExecuteResult = { rows: [] };

    const result = await caller.kiosk.getStationSOP({ projectId: 1, processCode: "T8" });

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].title).toBe("Assemble");
    expect(result.steps[0].imageUrl).toBe("/img/step1.png");
  });

  it("should handle malformed steps JSON gracefully", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      {
        id: 3, title: "Bad SOP", version: "0.1", processCode: "T2",
        steps: "not valid json {{{",
        difficultyLevel: null,
      },
    ]);
    mockExecuteResult = { rows: [] };

    const result = await caller.kiosk.getStationSOP({ projectId: 1, processCode: "T2" });

    expect(result.sop).not.toBeNull();
    expect(result.steps).toEqual([]);
  });

  it("should handle steps that is not an array", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      {
        id: 4, title: "Object SOP", version: "1.0", processCode: "T3",
        steps: JSON.stringify({ step: "not array" }),
        difficultyLevel: "low",
      },
    ]);
    mockExecuteResult = { rows: [] };

    const result = await caller.kiosk.getStationSOP({ projectId: 1, processCode: "T3" });

    expect(result.steps).toEqual([]);
  });

  it("should handle null steps field", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      { id: 5, title: "Empty SOP", version: "1.0", processCode: "T4", steps: null, difficultyLevel: null },
    ]);
    mockExecuteResult = { rows: [] };

    const result = await caller.kiosk.getStationSOP({ projectId: 1, processCode: "T4" });

    expect(result.steps).toEqual([]);
    expect(result.sop!.difficultyLevel).toBe("medium");
  });

  it("should use processCode as fallback sop name when title/name is null", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([
      { id: 6, title: null, name: null, version: null, processCode: "T6", steps: null, difficultyLevel: null },
    ]);
    mockExecuteResult = { rows: [] };

    const result = await caller.kiosk.getStationSOP({ projectId: 1, processCode: "T6" });

    expect(result.sop!.name).toBe("T6");
    expect(result.sop!.version).toBe("1.0");
  });

  it("should default is_mandatory to true when null", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);
    mockExecuteResult = {
      rows: [
        { id: 20, checkpoint_name: "Check A", checkpoint_type: "visual", acceptance_criteria: null, is_mandatory: null },
      ],
    };

    const result = await caller.kiosk.getStationSOP({ projectId: 1, processCode: "T1" });

    expect(result.checkpoints[0].isMandatory).toBe(true);
    expect(result.checkpoints[0].criteria).toBe("");
  });

  it("should return empty on DB error", async () => {
    const caller = createAuthenticatedCaller();
    // First select (sopTemplates) throws
    selectResultsQueue.push([]);
    mockDb.execute.mockRejectedValueOnce(new Error("DB error"));

    const result = await caller.kiosk.getStationSOP({ projectId: 1, processCode: "T1" });

    // getStationSOP has try/catch that handles checkpoint query failure
    // but the outer try/catch will catch the error
    expect(result.checkpoints).toEqual([]);
  });
});

// =====================================================================
// 5. operatorPunchIn
// =====================================================================
describe("kiosk.operatorPunchIn", () => {
  const baseInput = { stationId: "S001", processCode: "T3" };

  it("should allow punch-in when qualifications are valid", async () => {
    const caller = createAuthenticatedCaller();
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    mockExecuteResult = {
      rows: [
        { name: "焊接证", expiry_date: futureDate, status: "active" },
      ],
    };

    const result = await caller.kiosk.operatorPunchIn(baseInput);

    expect(result.allowed).toBe(true);
  });

  it("should deny punch-in when qualification is expired", async () => {
    const caller = createAuthenticatedCaller();
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    mockExecuteResult = {
      rows: [
        { name: "过期资质", expiry_date: pastDate, status: "expired" },
      ],
    };

    const result = await caller.kiosk.operatorPunchIn(baseInput);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("操作资质已过期，请联系主管");
    expect((result as any).qualificationExpiry).toBe(pastDate);
  });

  it("should allow with supervision note when no qualifications found", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = { rows: [] };

    const result = await caller.kiosk.operatorPunchIn(baseInput);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("无资质记录，允许在监督下操作");
  });

  it("should allow by default when certifications table doesn't exist", async () => {
    const caller = createAuthenticatedCaller();
    mockDb.execute.mockRejectedValueOnce(new Error("Table does not exist"));

    const result = await caller.kiosk.operatorPunchIn(baseInput);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("无资质验证表，默认放行");
  });

  it("should allow with error message on unexpected errors", async () => {
    const caller = createAuthenticatedCaller();
    // Mock requireDb to throw (outer try/catch)
    const { requireDb } = await import("../db");
    (requireDb as any).mockRejectedValueOnce(new Error("Pool exhausted"));

    const result = await caller.kiosk.operatorPunchIn(baseInput);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("资质验证服务异常，默认放行");
  });

  it("should handle qualifications with null expiry_date (never expires)", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = {
      rows: [
        { name: "永久资质", expiry_date: null, status: "active" },
      ],
    };

    const result = await caller.kiosk.operatorPunchIn(baseInput);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("should handle mixed valid and expired qualifications (any expired blocks)", async () => {
    const caller = createAuthenticatedCaller();
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    mockExecuteResult = {
      rows: [
        { name: "过期证", expiry_date: pastDate, status: "active" },
        { name: "有效证", expiry_date: futureDate, status: "active" },
        { name: "永久证", expiry_date: null, status: "active" },
      ],
    };

    const result = await caller.kiosk.operatorPunchIn(baseInput);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("操作资质已过期，请联系主管");
  });

  it("should handle non-array execute result for qualifications", async () => {
    const caller = createAuthenticatedCaller();
    mockExecuteResult = "invalid-result";

    const result = await caller.kiosk.operatorPunchIn(baseInput);

    // non-array would be treated as not-array -> qualifications = []
    // empty qualifications -> allowed with supervision
    expect(result.allowed).toBe(true);
  });
});

// =====================================================================
// 6. createQrSession
// =====================================================================
describe("kiosk.createQrSession", () => {
  it("should create a new QR session and return sessionId", async () => {
    const caller = createAuthenticatedCaller();

    const result = await caller.kiosk.createQrSession({
      stationId: "S001",
      departmentCode: "DEPT-A",
    });

    expect(result.sessionId).toBeDefined();
    expect(typeof result.sessionId).toBe("string");
    expect(result.sessionId.length).toBeGreaterThan(0);
  });

  it("should create unique session IDs for consecutive calls", async () => {
    const caller = createAuthenticatedCaller();

    const result1 = await caller.kiosk.createQrSession({ stationId: "S001", departmentCode: "DEPT-A" });
    const result2 = await caller.kiosk.createQrSession({ stationId: "S002", departmentCode: "DEPT-B" });

    expect(result1.sessionId).not.toBe(result2.sessionId);
  });
});

// =====================================================================
// 7. pollQrSession
// =====================================================================
describe("kiosk.pollQrSession", () => {
  it("should return expired for unknown session", async () => {
    const caller = createAuthenticatedCaller();

    const result = await caller.kiosk.pollQrSession({ sessionId: "nonexistent-session-id" });

    expect(result.status).toBe("expired");
    expect(result.operator).toBeNull();
  });

  it("should return pending for a newly created session", async () => {
    const caller = createAuthenticatedCaller();

    // Create a session first
    const { sessionId } = await caller.kiosk.createQrSession({
      stationId: "S001",
      departmentCode: "DEPT-A",
    });

    // Poll it
    const result = await caller.kiosk.pollQrSession({ sessionId });

    expect(result.status).toBe("pending");
    expect(result.operator).toBeNull();
  });
});

// =====================================================================
// 8. confirmQrSession
// =====================================================================
describe("kiosk.confirmQrSession", () => {
  it("should return error for expired/unknown session", async () => {
    const caller = createAuthenticatedCaller();

    const result = await caller.kiosk.confirmQrSession({
      sessionId: "nonexistent-session",
      employeeId: "EMP-001",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("会话已过期");
    expect(result.operatorName).toBeNull();
    expect(result.stationId).toBeNull();
  });

  it("should confirm session when user is found", async () => {
    const caller = createAuthenticatedCaller();

    // Create a QR session
    const { sessionId } = await caller.kiosk.createQrSession({
      stationId: "S001",
      departmentCode: "DEPT-A",
    });

    // Mock the user lookup for confirm
    selectResultsQueue.push([
      { id: 42, name: "Zhang Wei", openId: "EMP-001" },
    ]);

    const result = await caller.kiosk.confirmQrSession({
      sessionId,
      employeeId: "EMP-001",
    });

    expect(result.success).toBe(true);
    expect(result.operatorName).toBe("Zhang Wei");
    expect(result.stationId).toBe("S001");
    expect(result.error).toBeNull();
  });

  it("should return error when employeeId not found in DB", async () => {
    const caller = createAuthenticatedCaller();

    const { sessionId } = await caller.kiosk.createQrSession({
      stationId: "S002",
      departmentCode: "DEPT-B",
    });

    selectResultsQueue.push([]);

    const result = await caller.kiosk.confirmQrSession({
      sessionId,
      employeeId: "INVALID-999",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("工号未找到");
    expect(result.stationId).toBe("S002");
  });

  it("should reject already confirmed session", async () => {
    const caller = createAuthenticatedCaller();

    const { sessionId } = await caller.kiosk.createQrSession({
      stationId: "S003",
      departmentCode: "DEPT-C",
    });

    // First confirmation
    selectResultsQueue.push([
      { id: 50, name: "Li Ming", openId: "EMP-050" },
    ]);
    await caller.kiosk.confirmQrSession({ sessionId, employeeId: "EMP-050" });

    // Second confirmation attempt
    const result = await caller.kiosk.confirmQrSession({
      sessionId,
      employeeId: "EMP-999",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("该二维码已被使用");
    expect(result.stationId).toBe("S003");
  });

  it("should use employeeId as fallback name when user.name is null", async () => {
    const caller = createAuthenticatedCaller();

    const { sessionId } = await caller.kiosk.createQrSession({
      stationId: "S004",
      departmentCode: "DEPT-D",
    });

    selectResultsQueue.push([
      { id: 60, name: null, openId: "EMP-060" },
    ]);

    const result = await caller.kiosk.confirmQrSession({
      sessionId,
      employeeId: "EMP-060",
    });

    expect(result.success).toBe(true);
    expect(result.operatorName).toBe("EMP-060");
  });

  it("should reject empty employeeId", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.kiosk.confirmQrSession({ sessionId: "test", employeeId: "" })
    ).rejects.toThrow();
  });

  it("should return server error on DB failure", async () => {
    const caller = createAuthenticatedCaller();

    const { sessionId } = await caller.kiosk.createQrSession({
      stationId: "S005",
      departmentCode: "DEPT-E",
    });

    // Mock requireDb to fail
    const { requireDb } = await import("../db");
    (requireDb as any).mockRejectedValueOnce(new Error("Connection refused"));

    const result = await caller.kiosk.confirmQrSession({
      sessionId,
      employeeId: "EMP-001",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("服务器错误");
    expect(result.stationId).toBe("S005");
  });

  it("should update poll status after confirmation", async () => {
    const caller = createAuthenticatedCaller();

    const { sessionId } = await caller.kiosk.createQrSession({
      stationId: "S006",
      departmentCode: "DEPT-F",
    });

    // Confirm the session
    selectResultsQueue.push([
      { id: 70, name: "Chen Jie", openId: "EMP-070" },
    ]);
    await caller.kiosk.confirmQrSession({ sessionId, employeeId: "EMP-070" });

    // Poll should now show confirmed
    const pollResult = await caller.kiosk.pollQrSession({ sessionId });

    expect(pollResult.status).toBe("confirmed");
    expect(pollResult.operator).toEqual({ id: 70, name: "Chen Jie" });
  });
});

// =====================================================================
// 9. getQrSessionInfo
// =====================================================================
describe("kiosk.getQrSessionInfo", () => {
  it("should return found=false for unknown session", async () => {
    const caller = createAuthenticatedCaller();

    const result = await caller.kiosk.getQrSessionInfo({ sessionId: "nonexistent" });

    expect(result.found).toBe(false);
    expect(result.stationId).toBeNull();
    expect(result.departmentCode).toBeNull();
  });

  it("should return session info for a valid session", async () => {
    const caller = createAuthenticatedCaller();

    const { sessionId } = await caller.kiosk.createQrSession({
      stationId: "S010",
      departmentCode: "DEPT-X",
    });

    const result = await caller.kiosk.getQrSessionInfo({ sessionId });

    expect(result.found).toBe(true);
    expect(result.stationId).toBe("S010");
    expect(result.departmentCode).toBe("DEPT-X");
  });
});

// =====================================================================
// 10. Authentication guards
// =====================================================================
describe("kiosk auth guards", () => {
  it("should reject unauthenticated caller for identifyOperator", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.kiosk.identifyOperator({ employeeId: "EMP-001" })
    ).rejects.toThrow();
  });

  it("should reject unauthenticated caller for getStationQueue", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.kiosk.getStationQueue({ stationId: "S001" })
    ).rejects.toThrow();
  });

  it("should reject unauthenticated caller for submitInspection", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.kiosk.submitInspection({
        projectId: "PRJ-1",
        processCode: "T1",
        result: "pass",
        stationId: "S001",
        materialBarcode: "BC-1",
      })
    ).rejects.toThrow();
  });

  it("should reject unauthenticated caller for getStationSOP", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.kiosk.getStationSOP({ projectId: 1, processCode: "T1" })
    ).rejects.toThrow();
  });

  it("should reject unauthenticated caller for operatorPunchIn", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.kiosk.operatorPunchIn({ stationId: "S001", processCode: "T1" })
    ).rejects.toThrow();
  });

  it("should reject unauthenticated caller for createQrSession", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.kiosk.createQrSession({ stationId: "S001", departmentCode: "DEPT-A" })
    ).rejects.toThrow();
  });

  it("should reject unauthenticated caller for pollQrSession", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.kiosk.pollQrSession({ sessionId: "test" })
    ).rejects.toThrow();
  });

  it("should reject unauthenticated caller for confirmQrSession", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.kiosk.confirmQrSession({ sessionId: "test", employeeId: "EMP-001" })
    ).rejects.toThrow();
  });

  it("should reject unauthenticated caller for getQrSessionInfo", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.kiosk.getQrSessionInfo({ sessionId: "test" })
    ).rejects.toThrow();
  });
});

// =====================================================================
// 11. Input validation edge cases
// =====================================================================
describe("kiosk input validation", () => {
  it("identifyOperator should reject missing employeeId field", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      (caller.kiosk.identifyOperator as any)({})
    ).rejects.toThrow();
  });

  it("submitInspection should reject invalid result enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.kiosk.submitInspection({
        projectId: "PRJ-1",
        processCode: "T1",
        result: "maybe" as any,
        stationId: "S001",
        materialBarcode: "BC-1",
      })
    ).rejects.toThrow();
  });

  it("getStationSOP should accept both string and number projectId", async () => {
    const caller = createAuthenticatedCaller();
    selectResultsQueue.push([]);
    mockExecuteResult = { rows: [] };
    // Number input
    const r1 = await caller.kiosk.getStationSOP({ projectId: 123, processCode: "T1" });
    expect(r1.sop).toBeNull();

    selectResultsQueue.push([]);
    mockExecuteResult = { rows: [] };
    // String input
    const r2 = await caller.kiosk.getStationSOP({ projectId: "PRJ-123", processCode: "T1" });
    expect(r2.sop).toBeNull();
  });
});
