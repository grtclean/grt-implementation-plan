/**
 * PLC Code Generator Service — Unit Tests
 *
 * Tests pure functions that generate PLC program source code.
 *
 * Run: npx vitest run server/services/plc-code-generator.service.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import type { PlcBrandAdapter, AlarmDef, AccessLevel } from "./plc-brands/types";
import type { ProgramModule, StationInfo, IoMappingEntry } from "./plc-architecture.service";
import {
  generateProgramArchitecture,
  generateIoMappings,
  generateAlarmDefinitions,
  generateDefaultAccessLevels,
} from "./plc-architecture.service";
import { generateModuleCode, generateAllModuleCode } from "./plc-code-generator.service";

// ── Load adapters ─────────────────────────────────────────────────────

let siemensAdapter: PlcBrandAdapter;
let abbAdapter: PlcBrandAdapter;

beforeAll(async () => {
  await import("./plc-brands/siemens-s7.adapter");
  await import("./plc-brands/abb-ac500.adapter");
  const { getAdapter } = await import("./plc-brands/types");
  siemensAdapter = getAdapter("SIEMENS_S7_1500");
  abbAdapter = getAdapter("ABB_AC500");
});

// ── Fixtures ──────────────────────────────────────────────────────────

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

function getFullContext(stations: StationInfo[]) {
  const arch = generateProgramArchitecture(siemensAdapter, stations);
  return {
    modules: arch.modules,
    context: {
      stations,
      ioMappings: arch.ioMappings,
      alarms: arch.alarmDefinitions,
      accessLevels: arch.accessLevels,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

describe("plc-code-generator.service", () => {

  // ─── generateModuleCode ───────────────────────────────────────────

  describe("generateModuleCode", () => {
    it("generates SCL for FB_ModeManager", () => {
      const stations = [makeStation()];
      const { modules, context } = getFullContext(stations);
      const modeManager = modules.find(m => m.moduleName === "FB_ModeManager")!;
      const code = generateModuleCode(siemensAdapter, modeManager, context);
      expect(code).toContain("FUNCTION_BLOCK");
      expect(code).toContain("ModeManager");
      expect(code.length).toBeGreaterThan(100);
    });

    it("generates SCL for FB_SafetyManager", () => {
      const { modules, context } = getFullContext([makeStation()]);
      const safety = modules.find(m => m.moduleName === "FB_SafetyManager")!;
      const code = generateModuleCode(siemensAdapter, safety, context);
      expect(code).toContain("Safety");
      expect(code.length).toBeGreaterThan(100);
    });

    it("generates SCL for FB_UserAuth", () => {
      const { modules, context } = getFullContext([makeStation()]);
      const userAuth = modules.find(m => m.moduleName === "FB_UserAuth")!;
      const code = generateModuleCode(siemensAdapter, userAuth, context);
      expect(code).toContain("UserAuth");
      expect(code.length).toBeGreaterThan(100);
    });

    it("generates SCL for FC_MotorControl", () => {
      const { modules, context } = getFullContext([makeStation()]);
      const motor = modules.find(m => m.moduleName === "FC_MotorControl")!;
      const code = generateModuleCode(siemensAdapter, motor, context);
      expect(code).toContain("Motor");
      expect(code.length).toBeGreaterThan(50);
    });

    it("generates SCL for FC_ValveControl", () => {
      const { modules, context } = getFullContext([makeStation()]);
      const valve = modules.find(m => m.moduleName === "FC_ValveControl")!;
      const code = generateModuleCode(siemensAdapter, valve, context);
      expect(code).toContain("Valve");
      expect(code.length).toBeGreaterThan(50);
    });

    it("generates SCL for station FB", () => {
      const { modules, context } = getFullContext([makeStation()]);
      const stationFB = modules.find(m => m.category === "station_ctrl" && m.moduleType === "FB")!;
      const code = generateModuleCode(siemensAdapter, stationFB, context);
      expect(code.length).toBeGreaterThan(50);
    });

    it("generates SCL for FB_RecipeManager", () => {
      const { modules, context } = getFullContext([makeStation()]);
      const recipe = modules.find(m => m.moduleName === "FB_RecipeManager")!;
      const code = generateModuleCode(siemensAdapter, recipe, context);
      expect(code).toContain("Recipe");
      expect(code.length).toBeGreaterThan(50);
    });

    it("generates SCL for FB_AlarmManager", () => {
      const { modules, context } = getFullContext([makeStation()]);
      const alarm = modules.find(m => m.moduleName === "FB_AlarmManager")!;
      const code = generateModuleCode(siemensAdapter, alarm, context);
      expect(code).toContain("Alarm");
      expect(code.length).toBeGreaterThan(50);
    });

    it("generates code for OB1 (Main)", () => {
      const { modules, context } = getFullContext([makeStation()]);
      const ob1 = modules.find(m => m.moduleNumber === "OB1")!;
      const code = generateModuleCode(siemensAdapter, ob1, context);
      expect(code.length).toBeGreaterThan(50);
    });

    it("generates code for OB100 (Startup)", () => {
      const { modules, context } = getFullContext([makeStation()]);
      const ob100 = modules.find(m => m.moduleNumber === "OB100")!;
      const code = generateModuleCode(siemensAdapter, ob100, context);
      expect(code.length).toBeGreaterThan(50);
    });

    it("generates code using ABB adapter (different syntax)", () => {
      const stations = [makeStation()];
      const arch = generateProgramArchitecture(abbAdapter, stations);
      const modeManager = arch.modules.find(m => m.moduleName === "FB_ModeManager")!;
      const code = generateModuleCode(abbAdapter, modeManager, {
        stations,
        ioMappings: arch.ioMappings,
        alarms: arch.alarmDefinitions,
        accessLevels: arch.accessLevels,
      });
      expect(code).toContain("FUNCTION_BLOCK");
      expect(code.length).toBeGreaterThan(100);
    });
  });

  // ─── generateAllModuleCode ────────────────────────────────────────

  describe("generateAllModuleCode", () => {
    it("generates files for all modules", () => {
      const { modules, context } = getFullContext([makeStation()]);
      const files = generateAllModuleCode(siemensAdapter, modules, context);
      expect(files.length).toBe(modules.length);
    });

    it("each file has fileName, content, and moduleNumber", () => {
      const { modules, context } = getFullContext([makeStation()]);
      const files = generateAllModuleCode(siemensAdapter, modules, context);
      for (const f of files) {
        expect(f.fileName).toBeTruthy();
        expect(f.content).toBeTruthy();
        expect(f.moduleNumber).toBeTruthy();
      }
    });

    it("uses .scl extension for Siemens", () => {
      const { modules, context } = getFullContext([makeStation()]);
      const files = generateAllModuleCode(siemensAdapter, modules, context);
      for (const f of files) {
        expect(f.fileName).toMatch(/\.scl$/);
      }
    });

    it("uses .st extension for ABB", () => {
      const stations = [makeStation()];
      const arch = generateProgramArchitecture(abbAdapter, stations);
      const files = generateAllModuleCode(abbAdapter, arch.modules, {
        stations,
        ioMappings: arch.ioMappings,
        alarms: arch.alarmDefinitions,
        accessLevels: arch.accessLevels,
      });
      for (const f of files) {
        expect(f.fileName).toMatch(/\.st$/);
      }
    });

    it("scales with station count", () => {
      const s1 = getFullContext([makeStation()]);
      const s3 = getFullContext([
        makeStation({ id: 1, stationCode: "ST01" }),
        makeStation({ id: 2, stationCode: "ST02", stationType: "SPRAY" }),
        makeStation({ id: 3, stationCode: "ST03", stationType: "VACUUM_DRY" }),
      ]);
      const files1 = generateAllModuleCode(siemensAdapter, s1.modules, s1.context);
      const files3 = generateAllModuleCode(siemensAdapter, s3.modules, s3.context);
      // 3 stations = 2 more station FBs than 1 station
      expect(files3.length).toBeGreaterThan(files1.length);
    });
  });
});
