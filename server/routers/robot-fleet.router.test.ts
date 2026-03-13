/**
 * Robot Fleet Router — Unit Tests
 * Covers all 5 sub-routers (~25 procedures, ~30 tests)
 *
 * Run: pnpm test -- server/routers/robot-fleet.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ─────────────────────────────────────────────────────────
let mockQueryResult: any[] = [];
let mockReturningResult: any[] = [{ id: 1 }];
let selectResultsQueue: any[][] = [];

const createMockDbChain = () => {
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.and = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.groupBy = vi.fn(() => chain);
  chain.returning = vi.fn(async () => mockReturningResult);
  chain.then = (resolve: any, reject?: any) => {
    try {
      resolve(mockQueryResult);
    } catch (e) {
      reject?.(e);
    }
  };
  return chain;
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => ({
    select: vi.fn(() => {
      const chain = createMockDbChain();
      if (selectResultsQueue.length > 0) {
        const nextResult = selectResultsQueue.shift()!;
        chain.then = (resolve: any) => resolve(nextResult);
      }
      return chain;
    }),
    insert: vi.fn(() => createMockDbChain()),
    update: vi.fn(() => createMockDbChain()),
    delete: vi.fn(() => createMockDbChain()),
  })),
}));

// ─── Mock schema tables ──────────────────────────────────────────────
vi.mock("../../drizzle/robot-fleet-schema", () => ({
  robotFleetRegistry: {
    id: "id", robotCode: "robotCode", brand: "brand", model: "model",
    serialNumber: "serialNumber", controllerType: "controllerType",
    firmwareVersion: "firmwareVersion", protocolType: "protocolType",
    gatewayHost: "gatewayHost", gatewayPort: "gatewayPort",
    gatewayAuthToken: "gatewayAuthToken", status: "status",
    lastHeartbeatAt: "lastHeartbeatAt", maxPayloadKg: "maxPayloadKg",
    reachMm: "reachMm", repeatabilityMm: "repeatabilityMm",
    axisCount: "axisCount", location: "location", cellId: "cellId",
    assignedProcess: "assignedProcess", dtAssetId: "dtAssetId",
    iotEquipmentId: "iotEquipmentId", createdAt: "createdAt",
    updatedAt: "updatedAt", createdBy: "createdBy",
  },
  robotProtocolConfigs: {
    id: "id", robotId: "robotId", protocolName: "protocolName",
    gatewayUrl: "gatewayUrl", gatewayPort: "gatewayPort",
    authMethod: "authMethod", authCredential: "authCredential",
    connectionTimeoutMs: "connectionTimeoutMs",
    commandTimeoutMs: "commandTimeoutMs", maxRetries: "maxRetries",
    heartbeatIntervalMs: "heartbeatIntervalMs",
    telemetryIntervalMs: "telemetryIntervalMs",
    customConfig: "customConfig", createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  robotConnectionLogs: {
    id: "id", robotId: "robotId", eventType: "eventType",
    success: "success", latencyMs: "latencyMs", errorCode: "errorCode",
    errorMessage: "errorMessage", protocolDetails: "protocolDetails",
    createdAt: "createdAt",
  },
  robotDtStateSnapshots: {
    id: "id", robotId: "robotId", snapshotAt: "snapshotAt",
    j1Deg: "j1Deg", j2Deg: "j2Deg", j3Deg: "j3Deg",
    j4Deg: "j4Deg", j5Deg: "j5Deg", j6Deg: "j6Deg",
    tcpX: "tcpX", tcpY: "tcpY", tcpZ: "tcpZ",
    tcpRx: "tcpRx", tcpRy: "tcpRy", tcpRz: "tcpRz",
    payloadKg: "payloadKg", speedPct: "speedPct",
    overridePct: "overridePct", motorTempsC: "motorTempsC",
    operatingMode: "operatingMode", programName: "programName",
    programLine: "programLine", createdAt: "createdAt",
  },
  robotConditionAlerts: {
    id: "id", robotId: "robotId", alertType: "alertType",
    severity: "severity", message: "message", details: "details",
    jointIndex: "jointIndex", measuredValue: "measuredValue",
    thresholdValue: "thresholdValue", unit: "unit",
    acknowledgedAt: "acknowledgedAt", acknowledgedBy: "acknowledgedBy",
    createdAt: "createdAt",
  },
}));

// ─── Mock stage integration schema ──────────────────────────────────
vi.mock("../../drizzle/robot-stage-integration-schema", () => ({
  robotStageAssignments: {
    id: "id", projectId: "projectId", robotId: "robotId", stageCode: "stageCode",
    role: "role", status: "status", assignedBy: "assignedBy", notes: "notes",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  equipmentPrograms: {
    id: "id", projectId: "projectId", robotId: "robotId", stageCode: "stageCode",
    programName: "programName", programType: "programType", version: "version",
    versionString: "versionString", previousVersionId: "previousVersionId",
    status: "status", programContent: "programContent", storageUrl: "storageUrl",
    parameters: "parameters", revisionReason: "revisionReason",
    approvedBy: "approvedBy", approvedAt: "approvedAt",
    createdBy: "createdBy", createdAt: "createdAt", updatedAt: "updatedAt",
  },
  programExecutionLogs: {
    id: "id", programId: "programId", robotId: "robotId", projectId: "projectId",
    stageCode: "stageCode", triggerType: "triggerType", result: "result",
    durationMs: "durationMs", telemetryAtStart: "telemetryAtStart",
    telemetryAtEnd: "telemetryAtEnd", metrics: "metrics",
    errorCode: "errorCode", errorMessage: "errorMessage",
    executedBy: "executedBy", createdAt: "createdAt",
  },
  stageCommissioningChecklists: {
    id: "id", assignmentId: "assignmentId", robotId: "robotId", projectId: "projectId",
    checkItem: "checkItem", category: "category", isMandatory: "isMandatory",
    status: "status", measuredValue: "measuredValue", targetValue: "targetValue",
    unit: "unit", executionLogId: "executionLogId",
    completedBy: "completedBy", completedAt: "completedAt",
    notes: "notes", createdAt: "createdAt", updatedAt: "updatedAt",
  },
}));

// ─── Mock fleet service ──────────────────────────────────────────────
const mockFleetService = vi.hoisted(() => ({
  registerRobot: vi.fn(async (data: any) => ({ id: 1, robotCode: data.robotCode, brand: data.brand })),
  connectRobot: vi.fn(async () => ({ connected: true, latencyMs: 12, lastHeartbeat: new Date().toISOString() })),
  disconnectRobot: vi.fn(async () => ({ success: true })),
  getRobotTelemetry: vi.fn(async () => ({
    joints: [0, -45, 90, 0, 30, 0],
    tcp: { x: 500, y: 100, z: 800, rx: 0, ry: 90, rz: 0 },
    speed: 75, payload: 15, motorTemps: [35, 38, 40, 33, 37, 36],
    operatingMode: "auto", programName: "MAIN", programLine: 42,
    timestamp: new Date().toISOString(),
  })),
  sendRobotCommand: vi.fn(async () => ({ success: true, response: { simulated: true } })),
  runProtocolTest: vi.fn(async () => ({
    robotId: 1, robotCode: "KUKA-01", brand: "kuka",
    timestamp: new Date().toISOString(),
    ping: { ok: true, latencyMs: 3 },
    telemetry: { ok: true },
    command: { ok: true },
    overall: "pass",
  })),
  syncDigitalTwin: vi.fn(async () => ({ synced: true, telemetry: { joints: [0, 0, 0, 0, 0, 0] } })),
  getHealthScore: vi.fn(async () => ({ robotId: 1, healthScore: 92, alertCounts: [] })),
  getFleetDashboard: vi.fn(async () => ({ total: 4, online: 3, byBrand: { kuka: 1, fanuc: 1, abb: 1, staubli: 1 }, robots: [] })),
  getBrandSpecs: vi.fn(() => [
    { brand: "kuka", protocolName: "RSI", models: ["KR 60-3"], controllerTypes: ["KRC4"], maxPayloadKg: 60, reachMm: 2033, repeatabilityMm: 0.05, description: "KUKA RSI" },
    { brand: "fanuc", protocolName: "PCDK", models: ["M-20iD/25"], controllerTypes: ["R-30iB"], maxPayloadKg: 25, reachMm: 1831, repeatabilityMm: 0.04, description: "FANUC PCDK" },
  ]),
  getBrandSpec: vi.fn(() => ({ brand: "kuka", protocolName: "RSI", models: ["KR 60-3"], controllerTypes: ["KRC4"] })),
}));

vi.mock("../services/robot-fleet/robot-fleet.service", () => mockFleetService);

// ─── Mock stage integration service ─────────────────────────
const mockStageService = vi.hoisted(() => ({
  assignRobotToStage: vi.fn(async (data: any) => ({
    id: 1, projectId: data.projectId, robotId: data.robotId, stageCode: data.stageCode,
    role: data.role ?? "primary", status: "planned", createdAt: new Date().toISOString(),
  })),
  getStageAssignments: vi.fn(async () => [
    { id: 1, projectId: 1, robotId: 1, stageCode: "M7", role: "primary", status: "active" },
  ]),
  getProjectAssignments: vi.fn(async () => [
    { id: 1, projectId: 1, robotId: 1, stageCode: "M7", role: "primary", status: "active" },
    { id: 2, projectId: 1, robotId: 2, stageCode: "M8", role: "backup", status: "planned" },
  ]),
  releaseRobotFromStage: vi.fn(async () => ({ id: 1, status: "released" })),
  getStageReadiness: vi.fn(async () => ({
    ready: true, reason: "All primary robots online", assignments: [], issues: [],
  })),
  createProgram: vi.fn(async (data: any) => ({
    id: 1, projectId: data.projectId, robotId: data.robotId, stageCode: data.stageCode,
    programName: data.programName, version: 1, versionString: "V1.0", status: "draft",
  })),
  iterateProgram: vi.fn(async (data: any) => ({
    id: 2, previousVersionId: data.previousProgramId, version: 2, versionString: "V1.1",
    status: "draft", revisionReason: data.revisionReason,
  })),
  updateProgramStatus: vi.fn(async (id: number, status: string) => ({
    id, status, approvedBy: "admin",
  })),
  getProgramHistory: vi.fn(async () => [
    { id: 2, version: 2, versionString: "V1.1", previousVersionId: 1 },
    { id: 1, version: 1, versionString: "V1.0", previousVersionId: null },
  ]),
  getStagePrograms: vi.fn(async () => [
    { id: 1, programName: "ASSEMBLY_MAIN", versionString: "V1.0", status: "approved" },
  ]),
  executeProgram: vi.fn(async (data: any) => ({
    id: 1, programId: data.programId, robotId: data.robotId, result: "success", durationMs: 1200,
  })),
  getExecutionLogs: vi.fn(async () => [
    { id: 1, programId: 1, robotId: 1, result: "success", durationMs: 1200 },
  ]),
  createCommissioningChecklist: vi.fn(async () => [
    { id: 1, checkItem: "Controller check", category: "controller", status: "pending", isMandatory: true },
    { id: 2, checkItem: "Safety check", category: "safety", status: "pending", isMandatory: true },
  ]),
  getCommissioningChecklist: vi.fn(async () => [
    { id: 1, checkItem: "Controller check", category: "controller", status: "pending", isMandatory: true },
  ]),
  updateCommissioningItem: vi.fn(async () => ({
    id: 1, status: "passed", completedBy: "admin",
  })),
  runStageProtocolTest: vi.fn(async () => ({
    projectId: 1, stageCode: "M7", allPass: true,
    robots: [{ robotId: 1, robotCode: "KUKA-01", result: "pass" }],
  })),
}));

vi.mock("../services/robot-fleet/robot-stage-integration.service", () => mockStageService);

// ─── Mock adapter factory ────────────────────────────────────────────
vi.mock("../services/robot-fleet/adapter-factory", () => ({
  getOrCreateAdapter: vi.fn(() => ({
    brand: "kuka",
    protocolName: "RSI",
    ping: vi.fn(async () => ({ ok: true, latencyMs: 5 })),
    getTelemetry: vi.fn(async () => ({ joints: [0, 0, 0, 0, 0, 0] })),
    sendCommand: vi.fn(async () => ({ success: true })),
  })),
}));

// ─── Mock drizzle-orm (for sql, eq, etc.) ────────────────────────────
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  count: vi.fn(() => "count"),
  gte: vi.fn((...args: any[]) => args),
  lte: vi.fn((...args: any[]) => args),
  sql: vi.fn((strings: any, ...vals: any[]) => ({ strings, vals })),
}));

// ─── Mock logger ─────────────────────────────────────────────────────
vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// ─── Import test utilities AFTER mocks ───────────────────────────────
import {
  createAdminCaller,
  createAnonymousCaller,
  createAuthenticatedCaller,
} from "../_test/trpc-test-utils";

// ─── Reset between tests ─────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  selectResultsQueue = [];
});

// ═════════════════════════════════════════════════════════════════════
// A. Registry sub-router
// ═════════════════════════════════════════════════════════════════════
describe("robotFleet.registry", () => {
  it("list returns paginated robots", async () => {
    selectResultsQueue = [
      [{ id: 1, robotCode: "KUKA-01", brand: "kuka" }],
      [{ count: 1 }],
    ];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.registry.list({});
    expect(result).toHaveProperty("rows");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page", 1);
  });

  it("list filters by brand", async () => {
    selectResultsQueue = [
      [{ id: 1, robotCode: "FANUC-01", brand: "fanuc" }],
      [{ count: 1 }],
    ];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.registry.list({ brand: "fanuc" });
    expect(result.rows).toHaveLength(1);
  });

  it("getById returns robot with protocol config", async () => {
    selectResultsQueue = [
      [{ id: 1, robotCode: "ABB-01", brand: "abb", model: "IRB 6700" }],
      [{ id: 10, robotId: 1, gatewayUrl: "http://gw", gatewayPort: 8080 }],
    ];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.registry.getById({ id: 1 });
    expect(result).toHaveProperty("robotCode", "ABB-01");
    expect(result).toHaveProperty("protocolConfig");
  });

  it("getById throws NOT_FOUND for missing robot", async () => {
    selectResultsQueue = [[]];
    const caller = createAdminCaller();
    await expect(caller.robotFleet.registry.getById({ id: 999 })).rejects.toThrow("Robot not found");
  });

  it("register creates a new robot via service", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.registry.register({
      robotCode: "KUKA-KR60-001",
      brand: "kuka",
      model: "KR 60-3",
      protocolType: "RSI",
    });
    expect(result).toHaveProperty("robotCode", "KUKA-KR60-001");
    expect(mockFleetService.registerRobot).toHaveBeenCalledOnce();
  });

  it("update modifies robot details", async () => {
    mockReturningResult = [{ id: 1, model: "KR 120 R2700", location: "Cell A1" }];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.registry.update({
      id: 1,
      model: "KR 120 R2700",
      location: "Cell A1",
    });
    expect(result).toHaveProperty("model", "KR 120 R2700");
  });

  it("decommission sets status to offline", async () => {
    mockReturningResult = [{ id: 1, status: "offline" }];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.registry.decommission({ id: 1 });
    expect(result).toHaveProperty("status", "offline");
  });

  it("getBrands returns brand specs", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.registry.getBrands();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("brand");
  });

  it("getByBrand returns robots filtered by brand", async () => {
    mockQueryResult = [{ id: 1, robotCode: "STAUBLI-01", brand: "staubli" }];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.registry.getByBrand({ brand: "staubli" });
    expect(result).toBeInstanceOf(Array);
  });
});

// ═════════════════════════════════════════════════════════════════════
// B. Connection sub-router
// ═════════════════════════════════════════════════════════════════════
describe("robotFleet.connection", () => {
  it("connect establishes connection via service", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.connection.connect({ robotId: 1 });
    expect(result).toHaveProperty("connected", true);
    expect(mockFleetService.connectRobot).toHaveBeenCalledWith(1);
  });

  it("disconnect gracefully disconnects", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.connection.disconnect({ robotId: 1 });
    expect(result).toHaveProperty("success", true);
    expect(mockFleetService.disconnectRobot).toHaveBeenCalledWith(1);
  });

  it("ping tests connectivity", async () => {
    selectResultsQueue = [[{ id: 1, brand: "kuka" }]];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.connection.ping({ robotId: 1 });
    expect(result).toHaveProperty("ok", true);
    expect(result).toHaveProperty("latencyMs");
  });

  it("getConnectionLogs returns filtered logs", async () => {
    mockQueryResult = [
      { id: 1, robotId: 1, eventType: "connect", success: true, latencyMs: 12 },
    ];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.connection.getConnectionLogs({
      robotId: 1,
      eventType: "connect",
    });
    expect(result).toBeInstanceOf(Array);
  });

  it("runProtocolTest returns test report", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.connection.runProtocolTest({ robotId: 1 });
    expect(result).toHaveProperty("overall", "pass");
    expect(result).toHaveProperty("ping");
    expect(result).toHaveProperty("telemetry");
    expect(result).toHaveProperty("command");
  });
});

// ═════════════════════════════════════════════════════════════════════
// C. Telemetry sub-router
// ═════════════════════════════════════════════════════════════════════
describe("robotFleet.telemetry", () => {
  it("getLatest returns most recent snapshot", async () => {
    selectResultsQueue = [[
      { id: 1, robotId: 1, j1Deg: "10.5", j2Deg: "-45.2", tcpX: "500.0" },
    ]];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.telemetry.getLatest({ robotId: 1 });
    expect(result).toHaveProperty("j1Deg");
  });

  it("getLatest returns null when no snapshots", async () => {
    selectResultsQueue = [[]];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.telemetry.getLatest({ robotId: 999 });
    expect(result).toBeNull();
  });

  it("getHistory returns paginated snapshots", async () => {
    mockQueryResult = [
      { id: 1, robotId: 1, snapshotAt: "2026-03-07T10:00:00Z" },
      { id: 2, robotId: 1, snapshotAt: "2026-03-07T10:01:00Z" },
    ];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.telemetry.getHistory({ robotId: 1 });
    expect(result).toHaveLength(2);
  });

  it("getJointTrend returns time-series for specific joint", async () => {
    mockQueryResult = [
      { snapshotAt: "2026-03-07T10:00:00Z", value: "10.5" },
      { snapshotAt: "2026-03-07T10:01:00Z", value: "12.3" },
    ];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.telemetry.getJointTrend({ robotId: 1, jointIndex: 2 });
    expect(result).toHaveLength(2);
  });

  it("syncDigitalTwin triggers DT sync", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.telemetry.syncDigitalTwin({ robotId: 1 });
    expect(result).toHaveProperty("synced", true);
  });

  it("startSimulation generates telemetry", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.telemetry.startSimulation({ robotId: 1 });
    expect(result).toHaveProperty("started", true);
    expect(result).toHaveProperty("telemetry");
  });
});

// ═════════════════════════════════════════════════════════════════════
// D. Condition sub-router
// ═════════════════════════════════════════════════════════════════════
describe("robotFleet.condition", () => {
  it("getAlerts returns filtered alerts", async () => {
    mockQueryResult = [
      { id: 1, robotId: 1, alertType: "overtemp", severity: "warning", message: "Motor 3 hot" },
    ];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.condition.getAlerts({ robotId: 1 });
    expect(result).toBeInstanceOf(Array);
  });

  it("acknowledge marks alert as acknowledged", async () => {
    mockReturningResult = [{ id: 1, acknowledgedAt: "2026-03-07T10:00:00Z", acknowledgedBy: "admin" }];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.condition.acknowledge({ id: 1, acknowledgedBy: "admin" });
    expect(result).toHaveProperty("acknowledgedBy", "admin");
  });

  it("getAlertStats returns counts by severity and type", async () => {
    selectResultsQueue = [
      [{ severity: "warning", count: 5 }, { severity: "critical", count: 2 }],
      [{ alertType: "overtemp", count: 4 }, { alertType: "comm_loss", count: 3 }],
    ];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.condition.getAlertStats({});
    expect(result).toHaveProperty("bySeverity");
    expect(result).toHaveProperty("byType");
  });

  it("getHealthScore returns composite score", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.condition.getHealthScore({ robotId: 1 });
    expect(result).toHaveProperty("healthScore");
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
  });
});

// ═════════════════════════════════════════════════════════════════════
// E. Protocol sub-router
// ═════════════════════════════════════════════════════════════════════
describe("robotFleet.protocol", () => {
  it("getConfig returns protocol configuration", async () => {
    selectResultsQueue = [[{ id: 1, robotId: 1, gatewayUrl: "http://gw", gatewayPort: 8080 }]];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.protocol.getConfig({ robotId: 1 });
    expect(result).toHaveProperty("gatewayUrl");
  });

  it("getConfig returns null when no config exists", async () => {
    selectResultsQueue = [[]];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.protocol.getConfig({ robotId: 999 });
    expect(result).toBeNull();
  });

  it("updateConfig modifies protocol settings", async () => {
    mockReturningResult = [{ id: 1, robotId: 1, gatewayUrl: "http://new-gw", gatewayPort: 9090 }];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.protocol.updateConfig({
      robotId: 1,
      gatewayUrl: "http://new-gw",
      gatewayPort: 9090,
    });
    expect(result).toHaveProperty("gatewayUrl", "http://new-gw");
  });

  it("getProtocolSpecs returns brand reference data", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.protocol.getProtocolSpecs();
    expect(result).toBeInstanceOf(Array);
    expect(result[0]).toHaveProperty("brand");
    expect(result[0]).toHaveProperty("protocolName");
  });

  it("validateConfig checks config validity", async () => {
    selectResultsQueue = [[{ id: 1, robotId: 1, gatewayUrl: "http://gw", gatewayPort: 8080, connectionTimeoutMs: 5000, commandTimeoutMs: 3000 }]];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.protocol.validateConfig({ robotId: 1 });
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("errors");
  });

  it("validateConfig fails with no config", async () => {
    selectResultsQueue = [[]];
    const caller = createAdminCaller();
    const result = await caller.robotFleet.protocol.validateConfig({ robotId: 999 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("No protocol configuration found");
  });
});

// ═════════════════════════════════════════════════════════════════════
// F. Stage Integration sub-router
// ═════════════════════════════════════════════════════════════════════
describe("robotFleet.stageIntegration", () => {
  it("getStageAssignments returns robots for project+stage", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.getStageAssignments({
      projectId: 1, stageCode: "M7",
    });
    expect(result).toBeInstanceOf(Array);
    expect(mockStageService.getStageAssignments).toHaveBeenCalledWith(1, "M7");
  });

  it("getProjectAssignments returns all assignments", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.getProjectAssignments({ projectId: 1 });
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(2);
  });

  it("assignRobotToStage creates assignment", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.assignRobotToStage({
      projectId: 1, robotId: 1, stageCode: "M7", role: "primary",
    });
    expect(result).toHaveProperty("stageCode", "M7");
    expect(result).toHaveProperty("role", "primary");
    expect(mockStageService.assignRobotToStage).toHaveBeenCalledOnce();
  });

  it("releaseRobotFromStage sets status to released", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.releaseRobotFromStage({ assignmentId: 1 });
    expect(result).toHaveProperty("status", "released");
  });

  it("getStageReadiness checks all conditions", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.getStageReadiness({
      projectId: 1, stageCode: "M7",
    });
    expect(result).toHaveProperty("ready", true);
    expect(result).toHaveProperty("issues");
  });

  it("createProgram creates V1.0", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.createProgram({
      projectId: 1, robotId: 1, stageCode: "M5",
      programName: "ASSEMBLY_MAIN", programType: "robot_motion",
    });
    expect(result).toHaveProperty("programName", "ASSEMBLY_MAIN");
    expect(result).toHaveProperty("versionString", "V1.0");
    expect(result).toHaveProperty("status", "draft");
  });

  it("updateProgram iterates to V1.1", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.updateProgram({
      programId: 1, action: "iterate",
      revisionReason: "Speed optimization for M8",
    });
    expect(result).toHaveProperty("versionString", "V1.1");
    expect(result).toHaveProperty("previousVersionId", 1);
    expect(mockStageService.iterateProgram).toHaveBeenCalledOnce();
  });

  it("updateProgram changes status to approved", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.updateProgram({
      programId: 1, action: "changeStatus", newStatus: "approved",
    });
    expect(result).toHaveProperty("status", "approved");
    expect(mockStageService.updateProgramStatus).toHaveBeenCalledWith(1, "approved", expect.any(String));
  });

  it("getProgramHistory returns version chain", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.getProgramHistory({ programId: 2 });
    expect(result).toHaveLength(2);
    expect(result[0].version).toBe(2);
    expect(result[1].version).toBe(1);
  });

  it("getStagePrograms lists programs for stage", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.getStagePrograms({
      projectId: 1, stageCode: "M7",
    });
    expect(result).toBeInstanceOf(Array);
    expect(result[0]).toHaveProperty("programName");
  });

  it("executeProgram runs and logs", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.executeProgram({
      programId: 1, robotId: 1, projectId: 1, stageCode: "M7",
    });
    expect(result).toHaveProperty("result", "success");
    expect(result).toHaveProperty("durationMs");
  });

  it("getExecutionLogs returns filtered logs", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.getExecutionLogs({
      projectId: 1, stageCode: "M7",
    });
    expect(result).toBeInstanceOf(Array);
    expect(result[0]).toHaveProperty("result", "success");
  });

  it("createCommissioningChecklist generates brand-specific items", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.createCommissioningChecklist({
      projectId: 1, assignmentId: 1, robotId: 1, brand: "kuka",
    });
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("checkItem");
    expect(result[0]).toHaveProperty("category");
  });

  it("getCommissioningChecklist returns items", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.getCommissioningChecklist({
      projectId: 1,
    });
    expect(result).toBeInstanceOf(Array);
  });

  it("updateCommissioningItem marks item as passed", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.updateCommissioningItem({
      itemId: 1, status: "passed", measuredValue: "3.5",
    });
    expect(result).toHaveProperty("status", "passed");
  });

  it("runStageProtocolTest tests all stage robots", async () => {
    const caller = createAdminCaller();
    const result = await caller.robotFleet.stageIntegration.runStageProtocolTest({
      projectId: 1, stageCode: "M7",
    });
    expect(result).toHaveProperty("allPass", true);
    expect(result).toHaveProperty("robots");
    expect(result.robots).toBeInstanceOf(Array);
  });
});
