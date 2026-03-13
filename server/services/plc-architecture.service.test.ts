/**
 * PLC Architecture Service — Unit Tests
 *
 * Tests pure functions that generate PLC program architecture from station data.
 *
 * Run: npx vitest run server/services/plc-architecture.service.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import type { PlcBrandAdapter } from "./plc-brands/types";
import type { StationInfo } from "./plc-architecture.service";
import {
  generateProgramArchitecture,
  generateIoMappings,
  generateAlarmDefinitions,
  generateDefaultAccessLevels,
  generateLogicDiagram,
  generateModeStateDiagram,
  generateTroubleshootingGuide,
} from "./plc-architecture.service";

// ── Load Siemens adapter (real adapter for integration-style tests) ──

let siemensAdapter: PlcBrandAdapter;

beforeAll(async () => {
  // Side-effect import registers the adapter
  await import("./plc-brands/siemens-s7.adapter");
  const { getAdapter } = await import("./plc-brands/types");
  siemensAdapter = getAdapter("SIEMENS_S7_1500");
});

// ── Test Fixtures ─────────────────────────────────────────────────────

function makeStation(overrides: Partial<StationInfo> = {}): StationInfo {
  return {
    id: 1,
    stationCode: "ST01",
    stationName: "超声波清洗",
    stationNameEn: "Ultrasonic Cleaning",
    stationType: "ULTRASONIC",
    electricalParams: {
      plcDI: 14,
      plcDO: 10,
      plcAI: 6,
      plcAO: 2,
      motorCount: 2,
      motorTotalPower: 5.5,
      sensorCount: 8,
      heaterTotalPower: 18,
      emergencyStopCount: 2,
      safetyInterlocks: ["tankLevel", "temperature", "overflow"],
    },
    ...overrides,
  };
}

function makeStations(count: number): StationInfo[] {
  const types = ["LOADING", "ULTRASONIC", "SPRAY", "RINSE", "VACUUM_DRY", "UNLOADING"];
  const names = ["上料", "超声波清洗", "高压喷淋", "纯水漂洗", "真空干燥", "下料"];
  const namesEn = ["Loading", "Ultrasonic", "Spray", "Rinse", "Vacuum Dry", "Unloading"];
  return Array.from({ length: count }, (_, i) => makeStation({
    id: i + 1,
    stationCode: `ST${String(i + 1).padStart(2, "0")}`,
    stationName: names[i % names.length],
    stationNameEn: namesEn[i % namesEn.length],
    stationType: types[i % types.length],
    electricalParams: {
      plcDI: 10 + i * 2,
      plcDO: 8 + i,
      plcAI: 4 + i,
      plcAO: 2,
      motorCount: 1 + (i % 3),
      motorTotalPower: 2.2 * (i + 1),
      sensorCount: 4 + i * 2,
      heaterTotalPower: i % 2 === 0 ? 12 : 0,
      emergencyStopCount: 2,
      safetyInterlocks: ["tankLevel", "temperature"],
    },
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

describe("plc-architecture.service", () => {

  // ─── generateProgramArchitecture ──────────────────────────────────

  describe("generateProgramArchitecture", () => {
    it("generates modules for a single station", () => {
      const stations = [makeStation()];
      const result = generateProgramArchitecture(siemensAdapter, stations);

      expect(result.modules.length).toBeGreaterThan(10);
      expect(result.ioMappings.length).toBeGreaterThan(0);
      expect(result.alarmDefinitions.length).toBeGreaterThan(0);
      expect(result.accessLevels).toHaveLength(4);
    });

    it("includes all required OB blocks", () => {
      const result = generateProgramArchitecture(siemensAdapter, [makeStation()]);
      const obModules = result.modules.filter(m => m.moduleType === "OB");
      const obNumbers = obModules.map(m => m.moduleNumber);
      expect(obNumbers).toContain("OB1");
      expect(obNumbers).toContain("OB100");
    });

    it("includes system FB blocks (ModeManager, SafetyManager, UserAuth)", () => {
      const result = generateProgramArchitecture(siemensAdapter, [makeStation()]);
      const fbNames = result.modules.filter(m => m.moduleType === "FB").map(m => m.moduleName);
      expect(fbNames).toContain("FB_ModeManager");
      expect(fbNames).toContain("FB_SafetyManager");
      expect(fbNames).toContain("FB_UserAuth");
    });

    it("creates per-station FB blocks", () => {
      const stations = makeStations(5);
      const result = generateProgramArchitecture(siemensAdapter, stations);
      const stationFBs = result.modules.filter(m => m.category === "station_ctrl" && m.moduleType === "FB");
      expect(stationFBs.length).toBe(5);
    });

    it("includes utility FC blocks", () => {
      const result = generateProgramArchitecture(siemensAdapter, [makeStation()]);
      const fcNames = result.modules.filter(m => m.moduleType === "FC").map(m => m.moduleName);
      expect(fcNames).toContain("FC_MotorControl");
      expect(fcNames).toContain("FC_ValveControl");
      expect(fcNames).toContain("FC_SensorRead");
    });

    it("generates IO mappings proportional to station count", () => {
      const s3 = generateProgramArchitecture(siemensAdapter, makeStations(3));
      const s6 = generateProgramArchitecture(siemensAdapter, makeStations(6));
      expect(s6.ioMappings.length).toBeGreaterThan(s3.ioMappings.length);
    });

    it("generates 4 default access levels", () => {
      const result = generateProgramArchitecture(siemensAdapter, [makeStation()]);
      expect(result.accessLevels).toHaveLength(4);
      const levels = result.accessLevels.map(l => l.levelNumber);
      expect(levels).toContain(1);
      expect(levels).toContain(2);
      expect(levels).toContain(3);
      expect(levels).toContain(4);
    });
  });

  // ─── generateIoMappings ───────────────────────────────────────────

  describe("generateIoMappings", () => {
    it("generates DI/DO/AI/AO entries", () => {
      const mappings = generateIoMappings(siemensAdapter, [makeStation()]);
      const types = new Set(mappings.map(m => m.ioType));
      expect(types.has("DI")).toBe(true);
      expect(types.has("DO")).toBe(true);
    });

    it("assigns unique addresses", () => {
      const mappings = generateIoMappings(siemensAdapter, makeStations(3));
      const addresses = mappings.map(m => m.address);
      const unique = new Set(addresses);
      expect(unique.size).toBe(addresses.length);
    });

    it("links entries to station IDs", () => {
      const stations = makeStations(2);
      const mappings = generateIoMappings(siemensAdapter, stations);
      const stationIds = new Set(mappings.filter(m => m.stationId !== null).map(m => m.stationId));
      expect(stationIds.has(1)).toBe(true);
      expect(stationIds.has(2)).toBe(true);
    });

    it("marks safety-relevant signals", () => {
      const mappings = generateIoMappings(siemensAdapter, [makeStation()]);
      const safetySignals = mappings.filter(m => m.safetyRelevant);
      expect(safetySignals.length).toBeGreaterThan(0);
    });

    it("uses Siemens I/Q addressing format", () => {
      const mappings = generateIoMappings(siemensAdapter, [makeStation()]);
      const diEntry = mappings.find(m => m.ioType === "DI");
      expect(diEntry?.address).toMatch(/^I\d+\.\d+$/);
    });
  });

  // ─── generateAlarmDefinitions ─────────────────────────────────────

  describe("generateAlarmDefinitions", () => {
    it("generates alarms from station interlocks", () => {
      const alarms = generateAlarmDefinitions([makeStation()]);
      expect(alarms.length).toBeGreaterThan(0);
    });

    it("each alarm has required fields", () => {
      const alarms = generateAlarmDefinitions([makeStation()]);
      for (const a of alarms) {
        expect(a.code).toBeTruthy();
        expect(a.message).toBeTruthy();
        expect(a.severity).toBeTruthy();
        expect(["auto", "manual", "acknowledge"]).toContain(a.resetType);
        expect(["critical", "high", "medium", "low"]).toContain(a.severity);
      }
    });

    it("includes e-stop alarm codes", () => {
      const alarms = generateAlarmDefinitions([makeStation()], 4);
      const eStopAlarms = alarms.filter(a => a.code.includes("ESTOP") || a.interlockAction.includes("STOP"));
      expect(eStopAlarms.length).toBeGreaterThan(0);
    });

    it("scales with station count", () => {
      const a1 = generateAlarmDefinitions(makeStations(2));
      const a4 = generateAlarmDefinitions(makeStations(4));
      expect(a4.length).toBeGreaterThan(a1.length);
    });
  });

  // ─── generateDefaultAccessLevels ──────────────────────────────────

  describe("generateDefaultAccessLevels", () => {
    it("returns 4 levels", () => {
      const levels = generateDefaultAccessLevels();
      expect(levels).toHaveLength(4);
    });

    it("has ascending level numbers 1-4", () => {
      const levels = generateDefaultAccessLevels();
      expect(levels.map(l => l.levelNumber)).toEqual([1, 2, 3, 4]);
    });

    it("operator level has limited permissions", () => {
      const levels = generateDefaultAccessLevels();
      const operator = levels.find(l => l.levelNumber === 1)!;
      expect(operator.permissions.viewProcess).toBe(true);
      expect(operator.permissions.systemConfig).toBeFalsy();
      expect(operator.permissions.userAdmin).toBeFalsy();
    });

    it("admin level has full permissions", () => {
      const levels = generateDefaultAccessLevels();
      const admin = levels.find(l => l.levelNumber === 4)!;
      expect(admin.permissions.viewProcess).toBe(true);
      expect(admin.permissions.systemConfig).toBe(true);
      expect(admin.permissions.userAdmin).toBe(true);
    });

    it("each level has a timeout", () => {
      const levels = generateDefaultAccessLevels();
      for (const l of levels) {
        expect(l.timeout).toBeGreaterThan(0);
      }
    });
  });

  // ─── generateLogicDiagram ─────────────────────────────────────────

  describe("generateLogicDiagram", () => {
    it("returns mermaid graph syntax", () => {
      const result = generateProgramArchitecture(siemensAdapter, [makeStation()]);
      const diagram = generateLogicDiagram(result.modules);
      expect(diagram).toContain("graph TD");
      expect(diagram).toContain("OB1");
    });

    it("references station FB blocks", () => {
      const stations = makeStations(2);
      const result = generateProgramArchitecture(siemensAdapter, stations);
      const diagram = generateLogicDiagram(result.modules);
      expect(diagram).toContain("FB_Station");
    });
  });

  // ─── generateModeStateDiagram ─────────────────────────────────────

  describe("generateModeStateDiagram", () => {
    it("returns mermaid stateDiagram-v2 syntax", () => {
      const diagram = generateModeStateDiagram();
      expect(diagram).toContain("stateDiagram-v2");
    });

    it("includes all 7 program modes", () => {
      const diagram = generateModeStateDiagram();
      for (const mode of ["INITIALIZING", "AUTO", "MANUAL", "SERVICE", "CHANGEOVER", "DEBUG", "E_STOP"]) {
        expect(diagram).toContain(mode);
      }
    });
  });

  // ─── generateTroubleshootingGuide ─────────────────────────────────

  describe("generateTroubleshootingGuide", () => {
    it("returns mermaid flowchart for an alarm", () => {
      const alarm = {
        code: "ALM-001",
        message: "液位低",
        messageEn: "Tank level low",
        triggerCondition: "DB_Station01.TankLevel < 200",
        interlockAction: "STOP_PUMP_01",
        resetType: "manual" as const,
        severity: "high" as const,
        stationCode: "ST01",
      };
      const guide = generateTroubleshootingGuide(alarm);
      expect(guide).toContain("graph TD");
      expect(guide).toContain("ALM-001");
    });
  });
});
