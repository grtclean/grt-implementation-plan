/**
 * M3 Design Engine Router — Unit Tests
 *
 * Covers 13 procedures:
 *   getStationTypes, listStations, getStation, createStation,
 *   updateStation, deleteStation, reorderStations,
 *   decomposeProposal, getTaskStatus,
 *   exportToSolidWorks, exportToEplan,
 *   getExportHistory, getExportContent, getProjectSummary
 *
 * Run: npx vitest run server/routers/design-engine.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB ────────────────────────────────────────────────────────────

const selectResultsQueue: any[] = [];
const returningQueue: any[] = [];

function makeChain() {
  const chain: any = {};
  for (const m of [
    "from", "where", "orderBy", "limit", "offset", "values", "set",
    "onConflictDoUpdate", "onConflictDoNothing", "groupBy", "having",
    "innerJoin", "leftJoin", "rightJoin", "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => {
    if (returningQueue.length > 0) return Promise.resolve(returningQueue.shift()!);
    return Promise.resolve([{ id: 1 }]);
  });
  chain.then = (resolve: any, reject?: any) => {
    try {
      if (selectResultsQueue.length > 0) return resolve(selectResultsQueue.shift()!);
      return resolve([]);
    } catch (e) { if (reject) return reject(e); throw e; }
  };
  return chain;
}

const mockDb: any = {
  select: vi.fn(() => makeChain()),
  insert: vi.fn(() => makeChain()),
  update: vi.fn(() => makeChain()),
  delete: vi.fn(() => makeChain()),
  execute: vi.fn(() => Promise.resolve({ rows: [] })),
  transaction: vi.fn(async (fn: any) => fn(mockDb)),
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

// ── Mock task worker ───────────────────────────────────────────────────

vi.mock("../services/task-worker.service", () => ({
  registerTaskHandler: vi.fn(),
  submitTask: vi.fn(async () => ({ taskId: 42 })),
  getTaskStatus: vi.fn(async () => ({
    id: 42, status: "completed", taskType: "M3_STATION_DECOMPOSE",
    resultData: { stationCount: 12 }, errorMessage: null,
    createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
  })),
}));

// ── Mock LLM ───────────────────────────────────────────────────────────

vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [{ message: { role: "assistant", content: '{"stations":[]}' }, finish_reason: "stop" }],
  })),
}));

// ── Mock logger ────────────────────────────────────────────────────────

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  })),
}));

// ── Import callers AFTER mocks ─────────────────────────────────────────

import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Helpers ────────────────────────────────────────────────────────────

function resetQueues() {
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
  vi.clearAllMocks();
}

function queueSelect(...results: any[]) { selectResultsQueue.push(...results); }
function queueReturning(...results: any[]) { returningQueue.push(...results); }

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

describe("designEngine router", () => {
  beforeEach(resetQueues);

  // ─── Auth guards ───────────────────────────────────────────────

  describe("auth guards", () => {
    it("rejects anonymous on getStationTypes", async () => {
      const anon = createAnonymousCaller();
      await expect(anon.designEngine.getStationTypes()).rejects.toThrow(/UNAUTHORIZED|Authentication required/);
    });

    it("rejects anonymous on createStation", async () => {
      const anon = createAnonymousCaller();
      await expect(anon.designEngine.createStation({
        projectId: 1, stationCode: "ST01", stationIndex: 1,
        stationName: "Test", stationType: "LOADING",
      })).rejects.toThrow(/UNAUTHORIZED|Authentication required/);
    });
  });

  // ─── getStationTypes ───────────────────────────────────────────

  describe("getStationTypes", () => {
    it("returns all 17 station types", async () => {
      const caller = createAdminCaller();
      const result = await caller.designEngine.getStationTypes();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(17);
      const types = result.map(t => t.type);
      expect(types).toContain("ULTRASONIC");
      expect(types).toContain("LOADING");
      expect(types).toContain("VACUUM_DRY");
      expect(types).toContain("TRANSFER");
    });

    it("each type has nameZh, nameEn, category, defaults", async () => {
      const caller = createAdminCaller();
      const result = await caller.designEngine.getStationTypes();
      for (const t of result) {
        expect(t.nameZh).toBeTruthy();
        expect(t.nameEn).toBeTruthy();
        expect(["cleaning", "drying", "handling", "inspection"]).toContain(t.category);
        expect(t.defaultMechParams).toBeDefined();
        expect(t.defaultElecParams).toBeDefined();
      }
    });
  });

  // ─── listStations ──────────────────────────────────────────────

  describe("listStations", () => {
    it("returns stations for a project", async () => {
      const mockStations = [
        { id: 1, stationCode: "ST01", stationName: "上料", stationType: "LOADING", stationIndex: 1 },
        { id: 2, stationCode: "ST02", stationName: "超声波清洗", stationType: "ULTRASONIC", stationIndex: 2 },
      ];
      queueSelect(mockStations);
      const caller = createAdminCaller();
      const result = await caller.designEngine.listStations({ projectId: 1 });
      expect(result.stations).toEqual(mockStations);
    });

    it("returns empty array when no stations", async () => {
      queueSelect([]);
      const caller = createAdminCaller();
      const result = await caller.designEngine.listStations({ projectId: 999 });
      expect(result.stations).toEqual([]);
    });
  });

  // ─── getStation ────────────────────────────────────────────────

  describe("getStation", () => {
    it("returns single station by ID", async () => {
      const st = { id: 5, stationCode: "ST05", stationName: "高压喷淋", stationType: "SPRAY" };
      queueSelect([st]);
      const caller = createAdminCaller();
      const result = await caller.designEngine.getStation({ id: 5 });
      expect(result).toEqual(st);
    });

    it("returns null when not found", async () => {
      queueSelect([]);
      const caller = createAdminCaller();
      const result = await caller.designEngine.getStation({ id: 999 });
      expect(result).toBeNull();
    });
  });

  // ─── createStation ─────────────────────────────────────────────

  describe("createStation", () => {
    it("creates a station and returns it", async () => {
      const created = { id: 10, stationCode: "ST01", stationName: "上料工位" };
      queueReturning([created]);
      const caller = createAdminCaller();
      const result = await caller.designEngine.createStation({
        projectId: 1, stationCode: "ST01", stationIndex: 1,
        stationName: "上料工位", stationType: "LOADING",
      });
      expect(result).toEqual(created);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  // ─── updateStation ─────────────────────────────────────────────

  describe("updateStation", () => {
    it("updates station params", async () => {
      const caller = createAdminCaller();
      const result = await caller.designEngine.updateStation({
        id: 1, stationName: "超声波精洗",
        mechanicalParams: { ultrasonicPower: 5000 },
      });
      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ─── deleteStation ─────────────────────────────────────────────

  describe("deleteStation", () => {
    it("deletes a station", async () => {
      const caller = createAdminCaller();
      const result = await caller.designEngine.deleteStation({ id: 1 });
      expect(result.success).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  // ─── reorderStations ──────────────────────────────────────────

  describe("reorderStations", () => {
    it("reorders stations by ID array", async () => {
      const caller = createAdminCaller();
      const result = await caller.designEngine.reorderStations({
        projectId: 1, orderedIds: [3, 1, 2],
      });
      expect(result.success).toBe(true);
      // Should call update 3 times (one per station)
      expect(mockDb.update).toHaveBeenCalledTimes(3);
    });
  });

  // ─── decomposeProposal ────────────────────────────────────────

  describe("decomposeProposal", () => {
    it("submits an async decomposition task", async () => {
      const caller = createAdminCaller();
      const result = await caller.designEngine.decomposeProposal({
        projectId: 1,
        proposalSummary: "超声波清洗线",
        workpieceInfo: "铝合金壳体",
        cycleTimeTarget: 90,
      });
      expect(result.taskId).toBe(42);
      expect(result.status).toBe("processing");
    });
  });

  // ─── getTaskStatus ─────────────────────────────────────────────

  describe("getTaskStatus", () => {
    it("returns task status from worker", async () => {
      const caller = createAdminCaller();
      const result = await caller.designEngine.getTaskStatus({ taskId: 42 });
      expect(result).toBeTruthy();
      expect(result!.status).toBe("completed");
    });
  });

  // ─── exportToSolidWorks ────────────────────────────────────────

  describe("exportToSolidWorks", () => {
    it("generates VBA macro and logs export", async () => {
      const stations = [
        { id: 1, stationCode: "ST01", stationName: "上料", stationType: "LOADING",
          mechanicalParams: { conveyorType: "roller", conveyorSpeed: 3, weightCapacity: 200 },
          electricalParams: { plcDI: 8, plcDO: 6 } },
      ];
      queueSelect(stations);
      const exportLog = { id: 100, fileName: "GRT_Test_SolidWorks.bas" };
      queueReturning([exportLog]);

      const caller = createAdminCaller();
      const result = await caller.designEngine.exportToSolidWorks({
        projectId: 1, projectName: "Test",
      });
      expect(result.fileName).toContain("SolidWorks");
      expect(result.format).toBe("SOLIDWORKS_VBA");
      expect(result.content).toContain("GRT Design Engine");
      expect(result.content).toContain("Sub GRT_SetupCleaningLine");
      expect(result.stationCount).toBe(1);
    });

    it("throws when no stations found", async () => {
      queueSelect([]);
      const caller = createAdminCaller();
      await expect(caller.designEngine.exportToSolidWorks({
        projectId: 999,
      })).rejects.toThrow(/No stations found/);
    });
  });

  // ─── exportToEplan ─────────────────────────────────────────────

  describe("exportToEplan", () => {
    it("generates EPLAN XML and logs export", async () => {
      const stations = [
        { id: 1, stationCode: "ST01", stationName: "超声波清洗", stationType: "ULTRASONIC",
          stationNameEn: "Ultrasonic",
          mechanicalParams: { ultrasonicPower: 3000, transducerCount: 24 },
          electricalParams: { plcDI: 14, plcDO: 10, plcAI: 6, plcAO: 2, motorCount: 1, motorTotalPower: 2.2, sensorCount: 8 } },
      ];
      queueSelect(stations);
      const exportLog = { id: 101, fileName: "GRT_Test_EPLAN.xml" };
      queueReturning([exportLog]);

      const caller = createAdminCaller();
      const result = await caller.designEngine.exportToEplan({
        projectId: 1, projectName: "Test",
      });
      expect(result.fileName).toContain("EPLAN");
      expect(result.format).toBe("EPLAN_XML");
      expect(result.content).toContain("<EPLAN_PROJECT>");
      expect(result.content).toContain("ULTRASONIC");
      expect(result.stationCount).toBe(1);
    });
  });

  // ─── getExportHistory ──────────────────────────────────────────

  describe("getExportHistory", () => {
    it("returns export logs for project", async () => {
      const logs = [
        { id: 100, exportFormat: "SOLIDWORKS_VBA", exportStatus: "COMPLETED", fileName: "test.bas",
          fileSizeBytes: 5000, generationTimeMs: 100, exportedBy: "admin", downloadCount: 2,
          createdAt: "2026-03-05" },
      ];
      queueSelect(logs);
      const caller = createAdminCaller();
      const result = await caller.designEngine.getExportHistory({ projectId: 1 });
      expect(result.exports).toEqual(logs);
    });
  });

  // ─── getExportContent ──────────────────────────────────────────

  describe("getExportContent", () => {
    it("returns content and increments download count", async () => {
      const row = { id: 100, fileName: "test.bas", fileContent: "Sub Main()", exportFormat: "SOLIDWORKS_VBA", downloadCount: 0 };
      queueSelect([row]);
      const caller = createAdminCaller();
      const result = await caller.designEngine.getExportContent({ id: 100 });
      expect(result).toBeTruthy();
      expect(result!.content).toBe("Sub Main()");
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("returns null for missing export", async () => {
      queueSelect([]);
      const caller = createAdminCaller();
      const result = await caller.designEngine.getExportContent({ id: 999 });
      expect(result).toBeNull();
    });
  });

  // ─── getProjectSummary ─────────────────────────────────────────

  describe("getProjectSummary", () => {
    it("aggregates IO and power from stations", async () => {
      const stations = [
        { id: 1, stationType: "ULTRASONIC", cycleTime: 60,
          electricalParams: { plcDI: 14, plcDO: 10, plcAI: 6, plcAO: 2, motorCount: 1, motorTotalPower: 2.2, sensorCount: 8, heaterTotalPower: 18 } },
        { id: 2, stationType: "SPRAY", cycleTime: 45,
          electricalParams: { plcDI: 10, plcDO: 8, plcAI: 4, plcAO: 2, motorCount: 2, motorTotalPower: 7.5, sensorCount: 6, heaterTotalPower: 0 } },
      ];
      queueSelect(stations);
      const caller = createAdminCaller();
      const result = await caller.designEngine.getProjectSummary({ projectId: 1 });
      expect(result.stationCount).toBe(2);
      expect(result.io.DI).toBe(24);
      expect(result.io.DO).toBe(18);
      expect(result.io.AI).toBe(10);
      expect(result.io.AO).toBe(4);
      expect(result.io.total).toBe(56);
      expect(result.power.motorKW).toBeCloseTo(9.7);
      expect(result.power.heaterKW).toBe(18);
      expect(result.components.motors).toBe(3);
      expect(result.components.sensors).toBe(14);
      expect(result.bottleneckCycleTime).toBe(60);
      expect(result.recommendedPLC).toContain("S7-1500");
    });

    it("returns zeros for empty project", async () => {
      queueSelect([]);
      const caller = createAdminCaller();
      const result = await caller.designEngine.getProjectSummary({ projectId: 999 });
      expect(result.stationCount).toBe(0);
      expect(result.io.total).toBe(0);
      expect(result.power.totalKW).toBe(0);
    });
  });

  // ─── applyEngineeringSizing ─────────────────────────────────────

  describe("applyEngineeringSizing", () => {
    const sizingInput = {
      projectId: 1,
      workpiece: { length: 200, width: 100, height: 50, weight: 2, material: "aluminum_alloy" as const },
      cleanliness: { cleanlinessGrade: "fine" as const, maxParticleSize: 200 },
      process: { targetCycleTime: 90, cleaningChemistry: "alkaline" as const, temperatureTarget: 55 },
    };

    it("sizes all stations and updates DB", async () => {
      const stations = [
        { id: 1, stationCode: "ST01", stationType: "LOADING", mechanicalParams: {}, electricalParams: {} },
        { id: 2, stationCode: "ST02", stationType: "ULTRASONIC", mechanicalParams: {}, electricalParams: {} },
      ];
      queueSelect(stations);
      const caller = createAdminCaller();
      const result = await caller.designEngine.applyEngineeringSizing(sizingInput);
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(result.stations).toHaveLength(2);
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });

    it("throws when no stations found", async () => {
      queueSelect([]);
      const caller = createAdminCaller();
      await expect(caller.designEngine.applyEngineeringSizing(sizingInput)).rejects.toThrow(/No stations found/);
    });

    it("rejects anonymous", async () => {
      const anon = createAnonymousCaller();
      await expect(anon.designEngine.applyEngineeringSizing(sizingInput)).rejects.toThrow(/UNAUTHORIZED|Authentication required/);
    });
  });

  // ─── getBomPreview ──────────────────────────────────────────────

  describe("getBomPreview", () => {
    it("returns component summary without saving", async () => {
      const stations = [
        { id: 1, stationCode: "ST01", stationType: "LOADING",
          mechanicalParams: { conveyorType: "roller", conveyorSpeed: 5, weightCapacity: 50 },
          electricalParams: { plcDI: 8, plcDO: 6, plcAI: 0, plcAO: 0, motorCount: 1, sensorCount: 2, emergencyStopCount: 1 } },
      ];
      queueSelect(stations);
      const caller = createAdminCaller();
      const result = await caller.designEngine.getBomPreview({ projectId: 1 });
      expect(result.stations).toHaveLength(1);
      expect(result.totalComponents).toBeGreaterThan(0);
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.costByCategory).toBeDefined();
    });

    it("returns empty for no stations", async () => {
      queueSelect([]);
      const caller = createAdminCaller();
      const result = await caller.designEngine.getBomPreview({ projectId: 999 });
      expect(result.stations).toHaveLength(0);
      expect(result.totalCost).toBe(0);
    });
  });

  // ─── generateProjectBom ─────────────────────────────────────────

  describe("generateProjectBom", () => {
    it("creates BOM master + items in DB", async () => {
      const stations = [
        { id: 1, stationCode: "ST01", stationType: "LOADING",
          mechanicalParams: { conveyorType: "roller", conveyorSpeed: 5, weightCapacity: 50 },
          electricalParams: { plcDI: 8, plcDO: 6, motorCount: 1, sensorCount: 2, emergencyStopCount: 1 } },
      ];
      queueSelect(stations);
      // bomMasters insert returning
      queueReturning([{ id: 100 }]);
      // bomItems: 1 station-level item + N component items, each returns [{ id: ... }]
      // Just queue enough returnings for the chain
      for (let i = 0; i < 20; i++) {
        queueReturning([{ id: 200 + i }]);
      }

      const caller = createAdminCaller();
      const result = await caller.designEngine.generateProjectBom({
        projectId: 1, projectName: "Test Line",
      });
      expect(result.bomMasterId).toBe(100);
      expect(result.stationCount).toBe(1);
      expect(result.itemCount).toBeGreaterThan(0);
      expect(result.totalCost).toBeGreaterThan(0);
      // At least 2 insert calls: 1 for master + 1+ for items
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("throws when no stations found", async () => {
      queueSelect([]);
      const caller = createAdminCaller();
      await expect(caller.designEngine.generateProjectBom({
        projectId: 999,
      })).rejects.toThrow(/No stations found/);
    });

    it("rejects anonymous", async () => {
      const anon = createAnonymousCaller();
      await expect(anon.designEngine.generateProjectBom({
        projectId: 1,
      })).rejects.toThrow(/UNAUTHORIZED|Authentication required/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PLC Procedures (24 new endpoints)
  // ═══════════════════════════════════════════════════════════════════

  // ─── plcGetBrands ─────────────────────────────────────────────────

  describe("plcGetBrands", () => {
    it("returns all registered brand adapters", async () => {
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcGetBrands();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThanOrEqual(5);
      const keys = result.map((b: any) => b.key);
      expect(keys).toContain("SIEMENS_S7_1500");
      expect(keys).toContain("ABB_AC500");
    });

    it("each brand has key, name, nameZh, models", async () => {
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcGetBrands();
      for (const b of result) {
        expect(b.key).toBeTruthy();
        expect(b.name).toBeTruthy();
        expect(b.nameZh).toBeTruthy();
        expect(b.models).toBeInstanceOf(Array);
      }
    });
  });

  // ─── plcCreateProject ─────────────────────────────────────────────

  describe("plcCreateProject", () => {
    it("creates a PLC project and returns it", async () => {
      // First select = check existing project (none)
      queueSelect([]);
      // Stations query for I/O aggregation
      queueSelect([
        { id: 1, stationCode: "ST01", stationType: "ULTRASONIC",
          electricalParams: { plcDI: 14, plcDO: 10, plcAI: 6, plcAO: 2 } },
      ]);
      queueReturning([{
        id: 1, projectId: 1, projectName: "PLC-Test",
        plcBrand: "SIEMENS_S7_1500", plcModel: "CPU 1515-2 PN",
        ioTotalDI: 14, ioTotalDO: 10, ioTotalAI: 6, ioTotalAO: 2,
      }]);

      const caller = createAdminCaller();
      const result = await caller.designEngine.plcCreateProject({
        projectId: 1,
        projectName: "PLC-Test",
        plcBrand: "SIEMENS_S7_1500",
      });
      expect(result.id).toBe(1);
      expect(result.plcBrand).toBe("SIEMENS_S7_1500");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("rejects anonymous", async () => {
      const anon = createAnonymousCaller();
      await expect(anon.designEngine.plcCreateProject({
        projectId: 1, projectName: "PLC-Test", plcBrand: "SIEMENS_S7_1500",
      })).rejects.toThrow(/UNAUTHORIZED|Authentication required|FORBIDDEN/);
    });
  });

  // ─── plcGetProject ────────────────────────────────────────────────

  describe("plcGetProject", () => {
    it("returns PLC project by equipment project ID", async () => {
      const project = {
        id: 1, projectId: 1, projectName: "PLC-Test",
        plcBrand: "SIEMENS_S7_1500", plcModel: "CPU 1515-2 PN",
        currentVersion: "V1.0.0-dev", currentStatus: "dev",
      };
      queueSelect([project]);
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcGetProject({ projectId: 1 });
      expect(result).toEqual(project);
    });

    it("returns null when no PLC project exists", async () => {
      queueSelect([]);
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcGetProject({ projectId: 999 });
      expect(result).toBeNull();
    });
  });

  // ─── plcGenerateArchitecture ──────────────────────────────────────

  describe("plcGenerateArchitecture", () => {
    it("generates architecture and stores modules", async () => {
      // assertNotFrozen: no frozen version found
      queueSelect([]);
      // First select: PLC project (plcProjects)
      queueSelect([{
        id: 1, projectId: 1, plcBrand: "SIEMENS_S7_1500",
        ioTotalDI: 14, ioTotalDO: 10, ioTotalAI: 6, ioTotalAO: 2,
      }]);
      // assertNoBlockingConflicts → checkDesignConflicts: no stations = no conflicts
      queueSelect([]);
      // Second select: stations (main query)
      queueSelect([{
        id: 1, stationCode: "ST01", stationName: "超声波", stationNameEn: "Ultrasonic",
        stationType: "ULTRASONIC",
        electricalParams: {
          plcDI: 14, plcDO: 10, plcAI: 6, plcAO: 2,
          motorCount: 2, motorTotalPower: 5.5, sensorCount: 8,
          heaterTotalPower: 18, emergencyStopCount: 2,
          safetyInterlocks: ["tankLevel", "temperature"],
        },
      }]);
      // Queue enough returnings for all module/io/alarm inserts
      for (let i = 0; i < 100; i++) {
        queueReturning([{ id: i + 1 }]);
      }

      const caller = createAdminCaller();
      const result = await caller.designEngine.plcGenerateArchitecture({ plcProjectId: 1 });
      expect(result.moduleCount).toBeGreaterThan(10);
      expect(result.ioCount).toBeGreaterThan(0);
      expect(result.alarmCount).toBeGreaterThan(0);
    });

    it("rejects anonymous", async () => {
      const anon = createAnonymousCaller();
      await expect(anon.designEngine.plcGenerateArchitecture({
        plcProjectId: 1,
      })).rejects.toThrow(/UNAUTHORIZED|Authentication required|FORBIDDEN/);
    });
  });

  // ─── plcGetModules ────────────────────────────────────────────────

  describe("plcGetModules", () => {
    it("returns modules for a PLC project", async () => {
      const modules = [
        { id: 1, moduleName: "OB_Main", moduleType: "OB", moduleNumber: "OB1", category: "main" },
        { id: 2, moduleName: "FB_ModeManager", moduleType: "FB", moduleNumber: "FB100", category: "mode_mgmt" },
      ];
      queueSelect(modules);
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcGetModules({ plcProjectId: 1 });
      expect(result).toEqual(modules);
    });
  });

  // ─── plcGetModuleCode ─────────────────────────────────────────────

  describe("plcGetModuleCode", () => {
    it("returns module details with source code", async () => {
      const mod = {
        id: 1, moduleName: "FB_ModeManager", moduleType: "FB",
        moduleNumber: "FB100", sourceCode: "FUNCTION_BLOCK FB_ModeManager...",
        category: "mode_mgmt", language: "SCL", description: "模式管理",
      };
      queueSelect([mod]);
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcGetModuleCode({ moduleId: 1 });
      expect(result).toEqual(mod);
    });

    it("returns null when module not found", async () => {
      queueSelect([]);
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcGetModuleCode({ moduleId: 999 });
      expect(result).toBeNull();
    });
  });

  // ─── plcGetIoMapping ──────────────────────────────────────────────

  describe("plcGetIoMapping", () => {
    it("returns I/O mappings for a PLC project", async () => {
      const mappings = [
        { id: 1, signalName: "ST01_启动", address: "I0.0", ioType: "DI" },
        { id: 2, signalName: "ST01_电机运行", address: "Q0.0", ioType: "DO" },
      ];
      queueSelect(mappings);
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcGetIoMapping({ plcProjectId: 1 });
      expect(result).toEqual(mappings);
    });
  });

  // ─── plcUpdateIoMapping ───────────────────────────────────────────

  describe("plcUpdateIoMapping", () => {
    it("updates an I/O mapping address", async () => {
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcUpdateIoMapping({
        id: 1, address: "I2.0",
      });
      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("rejects anonymous", async () => {
      const anon = createAnonymousCaller();
      await expect(anon.designEngine.plcUpdateIoMapping({
        id: 1, address: "I2.0",
      })).rejects.toThrow(/UNAUTHORIZED|Authentication required|FORBIDDEN/);
    });
  });

  // ─── plcGetAlarms ─────────────────────────────────────────────────

  describe("plcGetAlarms", () => {
    it("returns alarm definitions for a PLC project", async () => {
      const alarms = [
        { id: 1, alarmCode: "ALM-001", alarmClass: "A", messageZh: "液位低" },
        { id: 2, alarmCode: "ALM-002", alarmClass: "B", messageZh: "温度偏高" },
      ];
      queueSelect(alarms);
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcGetAlarms({ plcProjectId: 1 });
      expect(result).toEqual(alarms);
    });
  });

  // ─── plcUpdateAlarm ───────────────────────────────────────────────

  describe("plcUpdateAlarm", () => {
    it("updates alarm definition", async () => {
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcUpdateAlarm({
        id: 1, messageZh: "液位过低", messageEn: "Tank level too low",
      });
      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ─── plcExportAlarmList ───────────────────────────────────────────

  describe("plcExportAlarmList", () => {
    it("returns CSV content of alarm list", async () => {
      const alarms = [
        { id: 1, alarmCode: "ALM-001", alarmClass: "A", messageZh: "液位低", messageEn: "Level low",
          triggerCondition: "level<200", interlockAction: "STOP", resetType: "manual", severity: "high", category: "process" },
      ];
      queueSelect(alarms);
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcExportAlarmList({ plcProjectId: 1 });
      expect(result.csv).toContain("ALM-001");
      expect(result.csv).toContain("液位低");
      expect(result.count).toBe(1);
    });
  });

  // ─── plcGetAccessLevels ───────────────────────────────────────────

  describe("plcGetAccessLevels", () => {
    it("returns access levels for a PLC project", async () => {
      const levels = [
        { id: 1, levelNumber: 1, levelName: "操作员", levelNameEn: "Operator" },
        { id: 2, levelNumber: 2, levelName: "维护员", levelNameEn: "Maintenance" },
      ];
      queueSelect(levels);
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcGetAccessLevels({ plcProjectId: 1 });
      expect(result).toEqual(levels);
    });
  });

  // ─── plcUpdateAccessLevel ─────────────────────────────────────────

  describe("plcUpdateAccessLevel", () => {
    it("updates access level permissions", async () => {
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcUpdateAccessLevel({
        id: 1, permissions: { viewProcess: true, manualMode: false },
      });
      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ─── plcGetSchematics ────────────────────────────────────────────

  describe("plcGetSchematics", () => {
    it("returns schematics for a PLC project", async () => {
      const schematics = [
        { id: 1, pageNumber: 1, pageTitle: "Main Power", pageCategory: "main_power" },
        { id: 2, pageNumber: 2, pageTitle: "Safety Circuit", pageCategory: "safety_circuit" },
      ];
      queueSelect(schematics);
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcGetSchematics({ plcProjectId: 1 });
      expect(result).toEqual(schematics);
    });
  });

  // ─── plcExportSchematic ───────────────────────────────────────────

  describe("plcExportSchematic", () => {
    it("returns XML content for a schematic page", async () => {
      const schematic = {
        id: 1, pageTitle: "Main Power", xmlContent: "<eplan-page>test</eplan-page>",
        pageCategory: "main_power", pageNumber: 1,
      };
      queueSelect([schematic]);
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcExportSchematic({ id: 1 });
      expect(result).toBeTruthy();
      expect(result.xmlContent).toContain("eplan-page");
    });

    it("throws when schematic not found", async () => {
      queueSelect([]);
      const caller = createAdminCaller();
      await expect(caller.designEngine.plcExportSchematic({ id: 999 })).rejects.toThrow(/not found/);
    });
  });

  // ─── plcCreateVersion ─────────────────────────────────────────────

  describe("plcCreateVersion", () => {
    it("creates a new version entry", async () => {
      queueReturning([{
        id: 1, versionString: "V1.0.0-dev", versionType: "dev", isActive: true,
      }]);

      const caller = createAdminCaller();
      const result = await caller.designEngine.plcCreateVersion({
        plcProjectId: 1, versionString: "V1.0.0-dev", changeLog: "Initial version",
      });
      expect(result.id).toBe(1);
      expect(result.versionString).toBe("V1.0.0-dev");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("rejects anonymous", async () => {
      const anon = createAnonymousCaller();
      await expect(anon.designEngine.plcCreateVersion({
        plcProjectId: 1, versionString: "V1.0.0-dev",
      })).rejects.toThrow(/UNAUTHORIZED|Authentication required|FORBIDDEN/);
    });
  });

  // ─── plcGetVersionHistory ─────────────────────────────────────────

  describe("plcGetVersionHistory", () => {
    it("returns version history ordered by creation", async () => {
      const versions = [
        { id: 2, versionString: "V1.0.1-dev", isActive: true, createdAt: "2026-03-07" },
        { id: 1, versionString: "V1.0.0-dev", isActive: false, createdAt: "2026-03-06" },
      ];
      queueSelect(versions);
      const caller = createAdminCaller();
      const result = await caller.designEngine.plcGetVersionHistory({ plcProjectId: 1 });
      expect(result).toEqual(versions);
    });
  });

  // ─── plcPromoteVersion ────────────────────────────────────────────

  describe("plcPromoteVersion", () => {
    it("promotes a version from dev to test", async () => {
      // Mock: active version lookup, modules check, deactivate old, insert new
      queueSelect([{
        id: 1, plcProjectId: 10, versionString: "V1.0.0-dev", versionType: "dev",
        isActive: true, isFrozen: false, versionNumber: "1.0.0", testResults: {},
      }]);
      // Modules query (non-empty source)
      queueSelect([{ id: 1, sourceCode: "PROGRAM Main; END_PROGRAM", moduleName: "Main", moduleNumber: "OB1" }]);
      // returning for insert
      returningQueue.push([{ id: 2 }]);

      const caller = createAdminCaller();
      const result = await caller.designEngine.plcPromoteVersion({
        plcProjectId: 10, from: "dev", to: "test", changeLog: "Ready for FAT",
      });
      expect(result.versionId).toBe(2);
      expect(result.versionString).toContain("test");
      expect(result.fingerprint).toBeTruthy();
    });

    it("rejects anonymous", async () => {
      const anon = createAnonymousCaller();
      await expect(anon.designEngine.plcPromoteVersion({
        plcProjectId: 10, from: "dev", to: "test", changeLog: "test",
      })).rejects.toThrow(/UNAUTHORIZED|Authentication required|FORBIDDEN/);
    });
  });

  // ─── plcRollbackVersion ───────────────────────────────────────────

  describe("plcRollbackVersion", () => {
    it("rolls back to a target version", async () => {
      // Select target version
      queueSelect([{
        id: 1, versionString: "V1.0.0-dev", isActive: false,
      }]);

      const caller = createAdminCaller();
      const result = await caller.designEngine.plcRollbackVersion({
        plcProjectId: 1, targetVersionId: 1,
      });
      expect(result.success).toBe(true);
      expect(result.rolledBackTo).toBe("V1.0.0-dev");
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ─── plcCompareVersions ───────────────────────────────────────────

  describe("plcCompareVersions", () => {
    it("compares two versions and lists differences", async () => {
      // Version A
      queueSelect([{
        id: 1, versionString: "V1.0.0-dev", versionType: "dev",
        changedModules: [1, 2, 3],
      }]);
      // Version B
      queueSelect([{
        id: 2, versionString: "V1.1.0-dev", versionType: "dev",
        changedModules: [2, 3, 4],
      }]);

      const caller = createAdminCaller();
      const result = await caller.designEngine.plcCompareVersions({
        versionIdA: 1, versionIdB: 2,
      });
      expect(result.versionA).toBeTruthy();
      expect(result.versionB).toBeTruthy();
      expect(result.onlyInA).toBeInstanceOf(Array);
      expect(result.onlyInB).toBeInstanceOf(Array);
      expect(result.common).toBeInstanceOf(Array);
      // Module 1 only in A, Module 4 only in B, Modules 2,3 common
      expect(result.onlyInA).toContain(1);
      expect(result.onlyInB).toContain(4);
      expect(result.common).toContain(2);
      expect(result.common).toContain(3);
    });
  });

  // ─── plcGenerateLogicDiagram ──────────────────────────────────────

  describe("plcGenerateLogicDiagram", () => {
    it("returns mermaid diagram data", async () => {
      // Select modules for diagram
      queueSelect([
        { id: 1, moduleName: "OB_Main", moduleType: "OB", moduleNumber: "OB1", sortOrder: 1, category: "main", description: "Main", descriptionEn: "Main" },
        { id: 2, moduleName: "FB_ModeManager", moduleType: "FB", moduleNumber: "FB100", sortOrder: 2, category: "mode_mgmt", description: "模式管理", descriptionEn: "Mode Manager" },
      ]);

      const caller = createAdminCaller();
      const result = await caller.designEngine.plcGenerateLogicDiagram({ plcProjectId: 1 });
      expect(result.programDiagram).toContain("graph TD");
      expect(result.modeDiagram).toContain("stateDiagram");
    });
  });
});
