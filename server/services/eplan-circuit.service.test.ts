/**
 * EPLAN Circuit Service — Unit Tests
 *
 * Tests pure functions that generate EPLAN circuit schematics.
 *
 * Run: npx vitest run server/services/eplan-circuit.service.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import type { PlcBrandAdapter } from "./plc-brands/types";
import type { StationInfo } from "./plc-architecture.service";
import { generateIoMappings } from "./plc-architecture.service";
import { generateAllSchematics, generateCableSchedule } from "./eplan-circuit.service";
import type { EplanProjectSpec } from "./eplan-circuit.service";

// ── Load Siemens adapter ──────────────────────────────────────────────

let siemensAdapter: PlcBrandAdapter;

beforeAll(async () => {
  await import("./plc-brands/siemens-s7.adapter");
  const { getAdapter } = await import("./plc-brands/types");
  siemensAdapter = getAdapter("SIEMENS_S7_1500");
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
      safetyInterlocks: ["tankLevel", "temperature"],
    },
    ...overrides,
  };
}

function makeSpec(stationCount = 1): EplanProjectSpec {
  const stations = Array.from({ length: stationCount }, (_, i) => makeStation({
    id: i + 1,
    stationCode: `ST${String(i + 1).padStart(2, "0")}`,
  }));
  const ioMappings = generateIoMappings(siemensAdapter, stations);
  return {
    projectName: "Test Cleaning Line",
    voltageSystem: "380V/3P/50Hz",
    totalPower: stations.reduce((sum, s) => sum + (s.electricalParams.motorTotalPower || 0) + (s.electricalParams.heaterTotalPower || 0), 0),
    stations,
    ioMappings,
    eStopCount: 4,
    plcModel: "CPU 1515-2 PN",
    hmiModel: "TP1500 Comfort",
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

describe("eplan-circuit.service", () => {

  // ─── generateAllSchematics ────────────────────────────────────────

  describe("generateAllSchematics", () => {
    it("generates schematic pages for a single station", () => {
      const pages = generateAllSchematics(makeSpec(1));
      expect(pages.length).toBeGreaterThan(3);
    });

    it("includes main_power page", () => {
      const pages = generateAllSchematics(makeSpec(1));
      const mainPower = pages.find(p => p.pageCategory === "main_power");
      expect(mainPower).toBeTruthy();
      expect(mainPower!.xmlContent).toContain("eplan-page");
      expect(mainPower!.svgPreview).toContain("svg");
    });

    it("includes safety_circuit page", () => {
      const pages = generateAllSchematics(makeSpec(1));
      const safety = pages.find(p => p.pageCategory === "safety_circuit");
      expect(safety).toBeTruthy();
      expect(safety!.xmlContent.length).toBeGreaterThan(50);
    });

    it("includes plc_rack page", () => {
      const pages = generateAllSchematics(makeSpec(1));
      const rack = pages.find(p => p.pageCategory === "plc_rack");
      expect(rack).toBeTruthy();
    });

    it("includes control_24v page", () => {
      const pages = generateAllSchematics(makeSpec(1));
      const ctrl = pages.find(p => p.pageCategory === "control_24v");
      expect(ctrl).toBeTruthy();
    });

    it("includes hmi_network page", () => {
      const pages = generateAllSchematics(makeSpec(1));
      const hmi = pages.find(p => p.pageCategory === "hmi_network");
      expect(hmi).toBeTruthy();
    });

    it("includes terminal_layout page", () => {
      const pages = generateAllSchematics(makeSpec(1));
      const terminal = pages.find(p => p.pageCategory === "terminal_layout");
      expect(terminal).toBeTruthy();
    });

    it("generates motor_control pages per station", () => {
      const pages = generateAllSchematics(makeSpec(3));
      const motorPages = pages.filter(p => p.pageCategory === "motor_control");
      expect(motorPages.length).toBeGreaterThanOrEqual(3);
    });

    it("each page has pageNumber, title, XML, and SVG", () => {
      const pages = generateAllSchematics(makeSpec(2));
      for (const p of pages) {
        expect(p.pageNumber).toBeGreaterThan(0);
        expect(p.pageTitle).toBeTruthy();
        expect(p.xmlContent.length).toBeGreaterThan(10);
        expect(p.svgPreview.length).toBeGreaterThan(10);
        expect(p.pageCategory).toBeTruthy();
      }
    });

    it("page numbers are sequential", () => {
      const pages = generateAllSchematics(makeSpec(2));
      for (let i = 0; i < pages.length; i++) {
        expect(pages[i].pageNumber).toBe(i + 1);
      }
    });

    it("scales page count with stations", () => {
      const p1 = generateAllSchematics(makeSpec(1));
      const p4 = generateAllSchematics(makeSpec(4));
      expect(p4.length).toBeGreaterThan(p1.length);
    });

    it("XML contains eplan-page structure", () => {
      const pages = generateAllSchematics(makeSpec(1));
      const mainPower = pages.find(p => p.pageCategory === "main_power")!;
      expect(mainPower.xmlContent).toContain("<eplan-page");
    });
  });

  // ─── generateCableSchedule ────────────────────────────────────────

  describe("generateCableSchedule", () => {
    function makeMotorStation(overrides: Partial<StationInfo> = {}): StationInfo {
      return makeStation({
        electricalParams: {
          plcDI: 14, plcDO: 10, plcAI: 6, plcAO: 2,
          motorCount: 2, motorTotalPower: 5.5, sensorCount: 8,
          heaterTotalPower: 18, emergencyStopCount: 2,
          motorDetails: [
            { name: "M1", power: 2.2, voltage: 380, type: "DOL" },
            { name: "M2", power: 3.3, voltage: 380, type: "VFD" },
          ],
        } as any,
        ...overrides,
      });
    }

    it("generates cable entries for stations with motorDetails", () => {
      const cables = generateCableSchedule([makeMotorStation()], "380V/3P/50Hz");
      expect(cables.length).toBeGreaterThan(0);
    });

    it("each cable has required fields", () => {
      const cables = generateCableSchedule([makeMotorStation()], "380V/3P/50Hz");
      for (const c of cables) {
        expect(c.cableId).toBeTruthy();
        expect(c.from).toBeTruthy();
        expect(c.to).toBeTruthy();
        expect(c.type).toBeTruthy();
        expect(c.size).toBeTruthy();
        expect(c.cores).toBeGreaterThan(0);
        expect(c.length).toBeGreaterThan(0);
      }
    });

    it("returns empty when no motorDetails present", () => {
      const cables = generateCableSchedule([makeStation()], "380V/3P/50Hz");
      expect(cables).toHaveLength(0);
    });

    it("scales with station count", () => {
      const c1 = generateCableSchedule([makeMotorStation()], "380V/3P/50Hz");
      const c3 = generateCableSchedule([
        makeMotorStation({ id: 1, stationCode: "ST01" }),
        makeMotorStation({ id: 2, stationCode: "ST02" }),
        makeMotorStation({ id: 3, stationCode: "ST03" }),
      ], "380V/3P/50Hz");
      expect(c3.length).toBeGreaterThan(c1.length);
    });
  });
});
