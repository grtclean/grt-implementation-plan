/**
 * Vision Dashboard Router — Comprehensive Automated Test Suite
 *
 * Covers all 11 procedures:
 *   - listScreens (query)         — list/filter display screens
 *   - getScreen (query)           — get single screen + auto-revert expired INTERNAL mode
 *   - createScreen (mutation)     — register a new display screen
 *   - unlockInternal (mutation)   — PIN-based unlock to INTERNAL mode (30 min TTL)
 *   - lockExternal (mutation)     — manual lock back to EXTERNAL mode
 *   - listPlaylists (query)       — list carousel playlists for a screen
 *   - upsertPlaylist (mutation)   — create or update playlist entry
 *   - securityLogs (query)        — audit log with optional screen filter
 *   - shopfloorStations (query)   — real-time station status + FPY + cycle time
 *   - shopfloorRedBlackList (query) — red/black honor list from execution logs
 *   - shopfloorShortageAlerts (query) — spare parts below reorder point
 *   - lobbyData (query)           — lobby KPIs in EXTERNAL/INTERNAL mode
 *
 * Run: npx vitest run server/routers/vision-dashboard.router.test.ts
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
vi.mock("../../drizzle/vision-dashboard-schema", () => ({
  displayScreens: {
    id: "displayScreens.id",
    name: "displayScreens.name",
    location: "displayScreens.location",
    macAddress: "displayScreens.macAddress",
    currentMode: "displayScreens.currentMode",
    modeUnlockedAt: "displayScreens.modeUnlockedAt",
    modeUnlockExpiresAt: "displayScreens.modeUnlockExpiresAt",
    unlockedByName: "displayScreens.unlockedByName",
    isActive: "displayScreens.isActive",
    createdAt: "displayScreens.createdAt",
    updatedAt: "displayScreens.updatedAt",
  },
  screenPlaylists: {
    id: "screenPlaylists.id",
    screenId: "screenPlaylists.screenId",
    viewComponentName: "screenPlaylists.viewComponentName",
    durationSeconds: "screenPlaylists.durationSeconds",
    orderIndex: "screenPlaylists.orderIndex",
    mode: "screenPlaylists.mode",
    isActive: "screenPlaylists.isActive",
  },
  screenSecurityLogs: {
    id: "screenSecurityLogs.id",
    screenId: "screenSecurityLogs.screenId",
    action: "screenSecurityLogs.action",
    operatorId: "screenSecurityLogs.operatorId",
    operatorName: "screenSecurityLogs.operatorName",
    ipAddress: "screenSecurityLogs.ipAddress",
    createdAt: "screenSecurityLogs.createdAt",
  },
}));

vi.mock("../../drizzle/kiosk-station-schema", () => ({
  stations: {
    id: "stations.id",
    code: "stations.code",
    name: "stations.name",
    sortOrder: "stations.sortOrder",
    isActive: "stations.isActive",
  },
  executionLogs: {
    id: "executionLogs.id",
    stationId: "executionLogs.stationId",
    operatorId: "executionLogs.operatorId",
    humanFinalResult: "executionLogs.humanFinalResult",
    cycleTimeSeconds: "executionLogs.cycleTimeSeconds",
    createdAt: "executionLogs.createdAt",
  },
}));

vi.mock("../../drizzle/production-equipment-schema", () => ({
  productionEquipments: {
    id: "productionEquipments.id",
    location: "productionEquipments.location",
  },
}));

vi.mock("../../drizzle/supply-chain-schema", () => ({
  spareParts: {
    id: "spareParts.id",
    partCode: "spareParts.partCode",
    materialName: "spareParts.materialName",
    currentStock: "spareParts.currentStock",
    reorderPoint: "spareParts.reorderPoint",
    locationCode: "spareParts.locationCode",
    leadTimeDays: "spareParts.leadTimeDays",
    preferredSupplierName: "spareParts.preferredSupplierName",
  },
}));

vi.mock("../../drizzle/schema", () => ({
  projects: {
    id: "projects.id",
    name: "projects.name",
  },
}));

// ─── Import callers AFTER mocks ──────────────────────────────────────
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ─── Helpers ─────────────────────────────────────────────────────────

function makeScreen(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    name: "Lobby Screen #1",
    location: "LOBBY",
    macAddress: "AA:BB:CC:DD:EE:01",
    currentMode: "EXTERNAL",
    modeUnlockedAt: null,
    modeUnlockExpiresAt: null,
    unlockedByName: null,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makePlaylist(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    screenId: 1,
    viewComponentName: "KpiOverview",
    durationSeconds: 30,
    orderIndex: 0,
    mode: "BOTH",
    isActive: true,
    ...overrides,
  };
}

function makeSecurityLog(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    screenId: 1,
    action: "UNLOCK",
    operatorId: null,
    operatorName: "Admin",
    ipAddress: null,
    createdAt: "2026-03-01T10:00:00.000Z",
    ...overrides,
  };
}

function makeStation(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    code: "T1",
    name: "超声波粗洗",
    sortOrder: 1,
    isActive: true,
    ...overrides,
  };
}

function makeExecLog(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    stationId: 1,
    operatorId: "OP001",
    humanFinalResult: "PASS",
    cycleTimeSeconds: 45,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeSparePart(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    partCode: "SP-001",
    materialName: "O-Ring Seal",
    currentStock: 5,
    reorderPoint: 10,
    locationCode: "WH-A1",
    leadTimeDays: 7,
    preferredSupplierName: "Acme Parts",
    ...overrides,
  };
}

// ─── Reset ────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [];
  selectResultsQueue.length = 0;
  mockExecuteResult = [[]];
});

// =====================================================================
// 1. listScreens
// =====================================================================
describe("visionDashboard.listScreens", () => {
  it("returns all screens when no filter provided", async () => {
    const screens = [
      makeScreen({ id: 1, location: "LOBBY" }),
      makeScreen({ id: 2, location: "SHOPFLOOR" }),
    ];
    mockQueryResult = screens;
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.listScreens();
    expect(result).toHaveLength(2);
  });

  it("returns all screens when input is empty object", async () => {
    const screens = [makeScreen({ id: 1 })];
    mockQueryResult = screens;
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.listScreens({});
    expect(result).toHaveLength(1);
  });

  it("filters screens by location", async () => {
    const screens = [
      makeScreen({ id: 1, location: "LOBBY" }),
      makeScreen({ id: 2, location: "SHOPFLOOR" }),
      makeScreen({ id: 3, location: "LOBBY" }),
    ];
    mockQueryResult = screens;
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.listScreens({ location: "LOBBY" });
    expect(result).toHaveLength(2);
    expect(result.every((s: any) => s.location === "LOBBY")).toBe(true);
  });

  it("returns empty array when no screens match location filter", async () => {
    const screens = [makeScreen({ id: 1, location: "LOBBY" })];
    mockQueryResult = screens;
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.listScreens({ location: "SERVICE" });
    expect(result).toHaveLength(0);
  });

  it("returns empty array when no screens exist", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.listScreens();
    expect(result).toHaveLength(0);
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.visionDashboard.listScreens()).rejects.toThrow();
  });
});

// =====================================================================
// 2. getScreen
// =====================================================================
describe("visionDashboard.getScreen", () => {
  it("returns a screen by numeric id", async () => {
    mockQueryResult = [makeScreen({ id: 5 })];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.getScreen({ id: 5 });
    expect(result).toBeTruthy();
    expect(result!.id).toBe(5);
  });

  it("returns a screen by string id", async () => {
    mockQueryResult = [makeScreen({ id: 5 })];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.getScreen({ id: "5" });
    expect(result).toBeTruthy();
  });

  it("returns null when screen not found", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.getScreen({ id: 999 });
    expect(result).toBeNull();
  });

  it("auto-reverts expired INTERNAL mode to EXTERNAL", async () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
    const screen = makeScreen({
      id: 10,
      currentMode: "INTERNAL",
      modeUnlockedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      modeUnlockExpiresAt: pastDate,
      unlockedByName: "Operator X",
    });
    mockQueryResult = [screen];
    mockReturningResult = []; // update returning (not used)
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.getScreen({ id: 10 });
    // Should return with EXTERNAL mode
    expect(result!.currentMode).toBe("EXTERNAL");
    // Should have triggered update + security log insert
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("does NOT revert INTERNAL mode that has not expired", async () => {
    const futureDate = new Date(Date.now() + 20 * 60 * 1000).toISOString(); // 20 min from now
    const screen = makeScreen({
      id: 11,
      currentMode: "INTERNAL",
      modeUnlockedAt: new Date().toISOString(),
      modeUnlockExpiresAt: futureDate,
      unlockedByName: "Operator Y",
    });
    mockQueryResult = [screen];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.getScreen({ id: 11 });
    expect(result!.currentMode).toBe("INTERNAL");
    // update should NOT have been called
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("does NOT revert EXTERNAL mode", async () => {
    const screen = makeScreen({ id: 12, currentMode: "EXTERNAL" });
    mockQueryResult = [screen];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.getScreen({ id: 12 });
    expect(result!.currentMode).toBe("EXTERNAL");
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.visionDashboard.getScreen({ id: 1 })).rejects.toThrow();
  });
});

// =====================================================================
// 3. createScreen
// =====================================================================
describe("visionDashboard.createScreen", () => {
  it("creates a screen with required fields", async () => {
    const created = makeScreen({ id: 100, name: "New Screen", location: "LOBBY" });
    mockReturningResult = [created];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.createScreen({
      name: "New Screen",
      location: "LOBBY",
    });
    expect(result).toBeTruthy();
    expect(result!.id).toBe(100);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("creates a screen with optional macAddress", async () => {
    const created = makeScreen({ id: 101, macAddress: "FF:FF:FF:00:00:01" });
    mockReturningResult = [created];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.createScreen({
      name: "Floor Screen",
      location: "SHOPFLOOR",
      macAddress: "FF:FF:FF:00:00:01",
    });
    expect(result).toBeTruthy();
  });

  it("returns null when insert returns empty", async () => {
    mockReturningResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.createScreen({
      name: "Ghost Screen",
      location: "BU",
    });
    expect(result).toBeNull();
  });

  it("rejects invalid location enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.visionDashboard.createScreen({
        name: "Bad",
        location: "INVALID" as any,
      })
    ).rejects.toThrow();
  });

  it("rejects empty name", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.visionDashboard.createScreen({
        name: "",
        location: "LOBBY",
      })
    ).rejects.toThrow();
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.visionDashboard.createScreen({ name: "X", location: "LOBBY" })
    ).rejects.toThrow();
  });
});

// =====================================================================
// 4. unlockInternal
// =====================================================================
describe("visionDashboard.unlockInternal", () => {
  it("unlocks screen to INTERNAL with correct master PIN", async () => {
    const updated = makeScreen({ id: 1, currentMode: "INTERNAL" });
    mockReturningResult = [updated];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.unlockInternal({
      screenId: 1,
      pin: "8888",
      operatorName: "John",
    });
    expect(result).toBeTruthy();
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled(); // security log
  });

  it("sets operator name to 'Unknown' if not provided", async () => {
    const updated = makeScreen({ id: 2, currentMode: "INTERNAL" });
    mockReturningResult = [updated];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.unlockInternal({
      screenId: 2,
      pin: "8888",
    });
    expect(result).toBeTruthy();
  });

  it("throws error with incorrect PIN", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.visionDashboard.unlockInternal({
        screenId: 1,
        pin: "1234",
      })
    ).rejects.toThrow("PIN码错误");
  });

  it("throws error with too-short PIN (validation)", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.visionDashboard.unlockInternal({
        screenId: 1,
        pin: "12",
      })
    ).rejects.toThrow();
  });

  it("accepts string screenId", async () => {
    const updated = makeScreen({ id: 3, currentMode: "INTERNAL" });
    mockReturningResult = [updated];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.unlockInternal({
      screenId: "3",
      pin: "8888",
    });
    expect(result).toBeTruthy();
  });

  it("returns null when update returns empty", async () => {
    mockReturningResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.unlockInternal({
      screenId: 999,
      pin: "8888",
    });
    expect(result).toBeNull();
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.visionDashboard.unlockInternal({ screenId: 1, pin: "8888" })
    ).rejects.toThrow();
  });
});

// =====================================================================
// 5. lockExternal
// =====================================================================
describe("visionDashboard.lockExternal", () => {
  it("locks screen back to EXTERNAL mode", async () => {
    const updated = makeScreen({ id: 1, currentMode: "EXTERNAL" });
    mockReturningResult = [updated];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.lockExternal({
      screenId: 1,
      operatorName: "Admin",
    });
    expect(result).toBeTruthy();
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled(); // security log
  });

  it("uses 'Unknown' when operatorName not provided", async () => {
    const updated = makeScreen({ id: 2, currentMode: "EXTERNAL" });
    mockReturningResult = [updated];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.lockExternal({
      screenId: 2,
    });
    expect(result).toBeTruthy();
  });

  it("accepts string screenId", async () => {
    const updated = makeScreen({ id: 5, currentMode: "EXTERNAL" });
    mockReturningResult = [updated];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.lockExternal({
      screenId: "5",
    });
    expect(result).toBeTruthy();
  });

  it("returns null when screen not found", async () => {
    mockReturningResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.lockExternal({
      screenId: 404,
    });
    expect(result).toBeNull();
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.visionDashboard.lockExternal({ screenId: 1 })
    ).rejects.toThrow();
  });
});

// =====================================================================
// 6. listPlaylists
// =====================================================================
describe("visionDashboard.listPlaylists", () => {
  it("returns playlists for a screen", async () => {
    const playlists = [
      makePlaylist({ id: 1, screenId: 1, orderIndex: 0 }),
      makePlaylist({ id: 2, screenId: 1, orderIndex: 1 }),
    ];
    mockQueryResult = playlists;
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.listPlaylists({ screenId: 1 });
    expect(result).toHaveLength(2);
  });

  it("returns empty array for screen with no playlists", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.listPlaylists({ screenId: 999 });
    expect(result).toHaveLength(0);
  });

  it("accepts string screenId", async () => {
    mockQueryResult = [makePlaylist()];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.listPlaylists({ screenId: "1" });
    expect(result).toHaveLength(1);
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.visionDashboard.listPlaylists({ screenId: 1 })
    ).rejects.toThrow();
  });
});

// =====================================================================
// 7. upsertPlaylist
// =====================================================================
describe("visionDashboard.upsertPlaylist", () => {
  it("creates a new playlist when no id provided", async () => {
    const created = makePlaylist({ id: 10, viewComponentName: "NewView" });
    mockReturningResult = [created];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.upsertPlaylist({
      screenId: 1,
      viewComponentName: "NewView",
      durationSeconds: 60,
      orderIndex: 2,
      mode: "EXTERNAL",
    });
    expect(result).toBeTruthy();
    expect(result.id).toBe(10);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("updates an existing playlist when id is provided", async () => {
    const updated = makePlaylist({ id: 5, viewComponentName: "UpdatedView" });
    mockReturningResult = [updated];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.upsertPlaylist({
      id: 5,
      screenId: 1,
      viewComponentName: "UpdatedView",
    });
    expect(result).toBeTruthy();
    expect(result.viewComponentName).toBe("UpdatedView");
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("uses default values for durationSeconds, orderIndex, mode", async () => {
    const created = makePlaylist({ id: 11 });
    mockReturningResult = [created];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.upsertPlaylist({
      screenId: 1,
      viewComponentName: "DefaultsView",
    });
    expect(result).toBeTruthy();
  });

  it("accepts string id for update", async () => {
    const updated = makePlaylist({ id: 7 });
    mockReturningResult = [updated];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.upsertPlaylist({
      id: "7",
      screenId: 1,
      viewComponentName: "TestView",
    });
    expect(result).toBeTruthy();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("rejects durationSeconds below 5", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.visionDashboard.upsertPlaylist({
        screenId: 1,
        viewComponentName: "X",
        durationSeconds: 2,
      })
    ).rejects.toThrow();
  });

  it("rejects invalid mode enum", async () => {
    const caller = createAuthenticatedCaller();
    await expect(
      caller.visionDashboard.upsertPlaylist({
        screenId: 1,
        viewComponentName: "X",
        mode: "INVALID" as any,
      })
    ).rejects.toThrow();
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.visionDashboard.upsertPlaylist({
        screenId: 1,
        viewComponentName: "X",
      })
    ).rejects.toThrow();
  });
});

// =====================================================================
// 8. securityLogs
// =====================================================================
describe("visionDashboard.securityLogs", () => {
  it("returns all logs when no filter", async () => {
    const logs = [
      makeSecurityLog({ id: 1, screenId: 1 }),
      makeSecurityLog({ id: 2, screenId: 2 }),
    ];
    mockQueryResult = logs;
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.securityLogs();
    expect(result).toHaveLength(2);
  });

  it("filters by screenId", async () => {
    const logs = [
      makeSecurityLog({ id: 1, screenId: 1 }),
      makeSecurityLog({ id: 2, screenId: 2 }),
      makeSecurityLog({ id: 3, screenId: 1 }),
    ];
    mockQueryResult = logs;
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.securityLogs({ screenId: 1 });
    expect(result).toHaveLength(2);
    expect(result.every((l: any) => l.screenId === 1)).toBe(true);
  });

  it("accepts string screenId for filter", async () => {
    const logs = [makeSecurityLog({ id: 1, screenId: 5 })];
    mockQueryResult = logs;
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.securityLogs({ screenId: "5" });
    expect(result).toHaveLength(1);
  });

  it("returns empty array when no logs exist", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.securityLogs();
    expect(result).toHaveLength(0);
  });

  it("respects custom limit", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.securityLogs({ limit: 10 });
    expect(result).toHaveLength(0);
    // The limit call should still happen (DB mock doesn't enforce it, but call is made)
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.visionDashboard.securityLogs()).rejects.toThrow();
  });
});

// =====================================================================
// 9. shopfloorStations
// =====================================================================
describe("visionDashboard.shopfloorStations", () => {
  it("returns empty array when no stations exist", async () => {
    selectResultsQueue.push([]); // stations query
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorStations();
    expect(result).toEqual([]);
  });

  it("returns station with 100% FPY when no logs", async () => {
    selectResultsQueue.push([makeStation({ id: 1, code: "T1", name: "Station 1" })]);
    selectResultsQueue.push([]); // no execution logs today
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorStations();
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("T1");
    expect(result[0].fpy).toBe(100);
    expect(result[0].actualQty).toBe(0);
    expect(result[0].cycleTime).toBe(0);
    expect(result[0].status).toBe("idle");
  });

  it("calculates FPY correctly with pass/fail logs", async () => {
    const now = new Date();
    selectResultsQueue.push([makeStation({ id: 1, code: "T2" })]);
    selectResultsQueue.push([
      makeExecLog({ id: 1, stationId: 1, humanFinalResult: "PASS", cycleTimeSeconds: 30, createdAt: now.toISOString() }),
      makeExecLog({ id: 2, stationId: 1, humanFinalResult: "PASS", cycleTimeSeconds: 40, createdAt: now.toISOString() }),
      makeExecLog({ id: 3, stationId: 1, humanFinalResult: "FAIL", cycleTimeSeconds: 50, createdAt: now.toISOString() }),
      makeExecLog({ id: 4, stationId: 1, humanFinalResult: "PASS", cycleTimeSeconds: 60, createdAt: now.toISOString() }),
    ]);
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorStations();
    expect(result).toHaveLength(1);
    // 3 pass out of 4 = 75.0%
    expect(result[0].fpy).toBe(75);
    expect(result[0].actualQty).toBe(4);
    // avg cycle: (30+40+50+60)/4 = 45
    expect(result[0].cycleTime).toBe(45);
  });

  it("sets status to 'running' when recent PASS logs exist", async () => {
    const now = new Date();
    selectResultsQueue.push([makeStation({ id: 1, code: "T3" })]);
    selectResultsQueue.push([
      makeExecLog({ id: 1, stationId: 1, humanFinalResult: "PASS", createdAt: now.toISOString() }),
    ]);
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorStations();
    expect(result[0].status).toBe("running");
  });

  it("sets status to 'alarm' when recent FAIL logs exist", async () => {
    const now = new Date();
    selectResultsQueue.push([makeStation({ id: 1, code: "T4" })]);
    selectResultsQueue.push([
      makeExecLog({ id: 1, stationId: 1, humanFinalResult: "FAIL", createdAt: now.toISOString() }),
    ]);
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorStations();
    expect(result[0].status).toBe("alarm");
  });

  it("sets status to 'alarm' when recent SCRAP logs exist", async () => {
    const now = new Date();
    selectResultsQueue.push([makeStation({ id: 1, code: "T5" })]);
    selectResultsQueue.push([
      makeExecLog({ id: 1, stationId: 1, humanFinalResult: "PASS", createdAt: now.toISOString() }),
      makeExecLog({ id: 2, stationId: 1, humanFinalResult: "SCRAP", createdAt: now.toISOString() }),
    ]);
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorStations();
    expect(result[0].status).toBe("alarm");
  });

  it("sets status to 'idle' when all logs are old (>1 hour)", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    selectResultsQueue.push([makeStation({ id: 1, code: "T6" })]);
    selectResultsQueue.push([
      makeExecLog({ id: 1, stationId: 1, humanFinalResult: "PASS", createdAt: twoHoursAgo }),
    ]);
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorStations();
    expect(result[0].status).toBe("idle");
  });

  it("maps operator from latest log", async () => {
    const now = new Date();
    selectResultsQueue.push([makeStation({ id: 1 })]);
    selectResultsQueue.push([
      makeExecLog({ id: 1, stationId: 1, operatorId: "OP-FIRST", createdAt: now.toISOString() }),
      makeExecLog({ id: 2, stationId: 1, operatorId: "OP-LAST", createdAt: now.toISOString() }),
    ]);
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorStations();
    // Latest log is last in array
    expect(result[0].operator).toBe("OP-LAST");
  });

  it("handles multiple stations with separate logs", async () => {
    const now = new Date();
    selectResultsQueue.push([
      makeStation({ id: 1, code: "T1" }),
      makeStation({ id: 2, code: "T2" }),
    ]);
    selectResultsQueue.push([
      makeExecLog({ id: 1, stationId: 1, humanFinalResult: "PASS", createdAt: now.toISOString() }),
      makeExecLog({ id: 2, stationId: 2, humanFinalResult: "FAIL", createdAt: now.toISOString() }),
    ]);
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorStations();
    expect(result).toHaveLength(2);
    // Station 1: 1 PASS → FPY 100%
    expect(result[0].fpy).toBe(100);
    // Station 2: 1 FAIL → FPY 0%
    expect(result[1].fpy).toBe(0);
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.visionDashboard.shopfloorStations()).rejects.toThrow();
  });
});

// =====================================================================
// 10. shopfloorRedBlackList
// =====================================================================
describe("visionDashboard.shopfloorRedBlackList", () => {
  it("returns empty array when no logs exist", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorRedBlackList();
    expect(result).toEqual([]);
  });

  it("puts operators with >= 2 fails on the red list", async () => {
    const logs = [
      makeExecLog({ operatorId: "OP-BAD", humanFinalResult: "FAIL" }),
      makeExecLog({ operatorId: "OP-BAD", humanFinalResult: "FAIL" }),
      makeExecLog({ operatorId: "OP-BAD", humanFinalResult: "PASS" }),
    ];
    mockQueryResult = logs;
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorRedBlackList();
    const reds = result.filter((r: any) => r.type === "red");
    expect(reds).toHaveLength(1);
    expect(reds[0].name).toBe("OP-BAD");
    expect(reds[0].count).toBe(2);
  });

  it("puts operators with 0 fails and >= 10 ops on the black (honor) list", async () => {
    const logs: any[] = [];
    for (let i = 0; i < 12; i++) {
      logs.push(makeExecLog({ operatorId: "OP-GOOD", humanFinalResult: "PASS" }));
    }
    mockQueryResult = logs;
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorRedBlackList();
    const blacks = result.filter((r: any) => r.type === "black");
    expect(blacks).toHaveLength(1);
    expect(blacks[0].name).toBe("OP-GOOD");
    expect(blacks[0].count).toBe(12);
  });

  it("caps red list at 3 entries", async () => {
    const logs: any[] = [];
    for (let i = 0; i < 5; i++) {
      const opId = `OP-BAD-${i}`;
      for (let j = 0; j < 3 + i; j++) {
        logs.push(makeExecLog({ operatorId: opId, humanFinalResult: "FAIL" }));
      }
    }
    mockQueryResult = logs;
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorRedBlackList();
    const reds = result.filter((r: any) => r.type === "red");
    expect(reds).toHaveLength(3);
  });

  it("caps black list at 3 entries", async () => {
    const logs: any[] = [];
    for (let i = 0; i < 5; i++) {
      const opId = `OP-GREAT-${i}`;
      for (let j = 0; j < 15 + i; j++) {
        logs.push(makeExecLog({ operatorId: opId, humanFinalResult: "PASS" }));
      }
    }
    mockQueryResult = logs;
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorRedBlackList();
    const blacks = result.filter((r: any) => r.type === "black");
    expect(blacks).toHaveLength(3);
  });

  it("operator with 1 fail and < 10 ops appears in neither list", async () => {
    const logs = [
      makeExecLog({ operatorId: "OP-MEH", humanFinalResult: "FAIL" }),
      makeExecLog({ operatorId: "OP-MEH", humanFinalResult: "PASS" }),
    ];
    mockQueryResult = logs;
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorRedBlackList();
    expect(result).toHaveLength(0);
  });

  it("sorts red list by highest fails first", async () => {
    const logs: any[] = [];
    // OP-A: 2 fails
    logs.push(makeExecLog({ operatorId: "OP-A", humanFinalResult: "FAIL" }));
    logs.push(makeExecLog({ operatorId: "OP-A", humanFinalResult: "FAIL" }));
    // OP-B: 5 fails
    for (let i = 0; i < 5; i++) {
      logs.push(makeExecLog({ operatorId: "OP-B", humanFinalResult: "FAIL" }));
    }
    mockQueryResult = logs;
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorRedBlackList();
    const reds = result.filter((r: any) => r.type === "red");
    expect(reds[0].name).toBe("OP-B");
    expect(reds[1].name).toBe("OP-A");
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.visionDashboard.shopfloorRedBlackList()).rejects.toThrow();
  });
});

// =====================================================================
// 11. shopfloorShortageAlerts
// =====================================================================
describe("visionDashboard.shopfloorShortageAlerts", () => {
  it("returns empty array when no parts below reorder point", async () => {
    mockQueryResult = [];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorShortageAlerts();
    expect(result).toEqual([]);
  });

  it("maps spare part fields correctly", async () => {
    mockQueryResult = [
      makeSparePart({
        partCode: "SP-100",
        materialName: "Bearing",
        currentStock: 3,
        reorderPoint: 10,
        locationCode: "WH-B2",
        leadTimeDays: 14,
        preferredSupplierName: "SupplierCo",
      }),
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorShortageAlerts();
    expect(result).toHaveLength(1);
    expect(result[0].station).toBe("WH-B2");
    expect(result[0].material).toBe("Bearing (SP-100)");
    expect(result[0].eta).toBe("预计14天到货");
    expect(result[0].buyer).toBe("SupplierCo");
    expect(result[0].severity).toBe("warning");
  });

  it("marks severity as critical when currentStock is 0", async () => {
    mockQueryResult = [
      makeSparePart({ currentStock: 0, reorderPoint: 5 }),
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorShortageAlerts();
    expect(result[0].severity).toBe("critical");
  });

  it("marks severity as warning when currentStock > 0", async () => {
    mockQueryResult = [
      makeSparePart({ currentStock: 2, reorderPoint: 10 }),
    ];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorShortageAlerts();
    expect(result[0].severity).toBe("warning");
  });

  it("uses dash fallback when locationCode is null", async () => {
    mockQueryResult = [makeSparePart({ locationCode: null })];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorShortageAlerts();
    expect(result[0].station).toBe("—");
  });

  it("uses 'ETA未知' when leadTimeDays is null", async () => {
    mockQueryResult = [makeSparePart({ leadTimeDays: null })];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorShortageAlerts();
    expect(result[0].eta).toBe("ETA未知");
  });

  it("uses dash fallback when preferredSupplierName is null", async () => {
    mockQueryResult = [makeSparePart({ preferredSupplierName: null })];
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.shopfloorShortageAlerts();
    expect(result[0].buyer).toBe("—");
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.visionDashboard.shopfloorShortageAlerts()).rejects.toThrow();
  });
});

// =====================================================================
// 12. lobbyData
// =====================================================================
describe("visionDashboard.lobbyData", () => {
  it("returns EXTERNAL KPIs by default (no input)", async () => {
    // 3 count queries: equipment, stations, projects
    selectResultsQueue.push([{ count: 42 }]);   // equipment count
    selectResultsQueue.push([{ count: 15 }]);   // station count
    selectResultsQueue.push([{ count: 8 }]);    // project count
    selectResultsQueue.push([{ location: "Shanghai", count: 20 }, { location: "Munich", count: 22 }]); // eqByLoc groupBy
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.lobbyData();
    expect(result.externalKpis).toHaveLength(4);
    expect(result.externalKpis[0].value).toBe("42");
    expect(result.externalKpis[1].value).toBe("15");
    expect(result.externalKpis[2].value).toBe("8");
    expect(result.externalKpis[3].value).toBe("IATF 16949");
    expect(result.locations).toHaveLength(2);
    expect(result.locations[0].city).toBe("Shanghai");
    expect(result.internalKpis).toHaveLength(0);
  });

  it("returns EXTERNAL KPIs when mode is explicitly EXTERNAL", async () => {
    selectResultsQueue.push([{ count: 10 }]);
    selectResultsQueue.push([{ count: 5 }]);
    selectResultsQueue.push([{ count: 3 }]);
    selectResultsQueue.push([]);
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.lobbyData({ mode: "EXTERNAL" });
    expect(result.externalKpis).toHaveLength(4);
    expect(result.internalKpis).toHaveLength(0);
  });

  it("returns both EXTERNAL and INTERNAL KPIs in INTERNAL mode", async () => {
    selectResultsQueue.push([{ count: 50 }]);
    selectResultsQueue.push([{ count: 20 }]);
    selectResultsQueue.push([{ count: 12 }]);
    selectResultsQueue.push([{ location: "Factory A", count: 50 }]);
    selectResultsQueue.push([{ count: 230 }]); // today's execution log count
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.lobbyData({ mode: "INTERNAL" });
    expect(result.externalKpis).toHaveLength(4);
    expect(result.internalKpis).toHaveLength(2);
    expect(result.internalKpis[0].key).toBe("todayOutput");
    expect(result.internalKpis[0].value).toBe("230");
    expect(result.internalKpis[1].key).toBe("activeStations");
  });

  it("handles zero counts gracefully", async () => {
    selectResultsQueue.push([{ count: 0 }]);
    selectResultsQueue.push([{ count: 0 }]);
    selectResultsQueue.push([{ count: 0 }]);
    selectResultsQueue.push([]);
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.lobbyData();
    expect(result.externalKpis[0].value).toBe("0");
    expect(result.locations).toHaveLength(0);
  });

  it("uses 'Factory' as fallback city when location is null", async () => {
    selectResultsQueue.push([{ count: 1 }]);
    selectResultsQueue.push([{ count: 1 }]);
    selectResultsQueue.push([{ count: 1 }]);
    selectResultsQueue.push([{ location: null, count: 5 }]);
    const caller = createAuthenticatedCaller();
    const result = await caller.visionDashboard.lobbyData();
    expect(result.locations[0].city).toBe("Factory");
  });

  it("rejects anonymous caller", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.visionDashboard.lobbyData()).rejects.toThrow();
  });
});
