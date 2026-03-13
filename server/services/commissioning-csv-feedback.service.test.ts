/**
 * Commissioning CSV Feedback Service — Unit Tests
 *
 * Tests parseCsvContent (pure) and compareWithBaseline (DB-backed).
 *
 * Run: npx vitest run server/services/commissioning-csv-feedback.service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────

const selectResults: unknown[] = [];
const mockLimit = vi.fn().mockImplementation(() => selectResults.shift() ?? []);
const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
const mockExecute = vi.fn().mockResolvedValue(undefined);

const mockDb = {
  select: mockSelect,
  execute: mockExecute,
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

vi.mock("../../drizzle/design-engine-schema", () => ({
  equipmentStations: {
    projectId: "project_id",
    stationCode: "station_code",
    stationName: "station_name",
    cycleTime: "cycle_time",
    mechanicalParams: "mechanical_params",
  },
  // MechanicalParams is a type-only export; no runtime mock needed
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ type: "eq", a, b })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

import { parseCsvContent, compareWithBaseline, type CsvRow } from "./commissioning-csv-feedback.service";

// ── Helpers ──────────────────────────────────────────────────────────────

const CSV_HEADER = "stationCode,pressure_bar,flowRate_lpm,temperature_C,cycleTime_s,cleanliness_mg,maxParticle_um,verdict";

function makeCsvLine(overrides: Partial<Record<string, string | number>> = {}): string {
  const defaults = {
    stationCode: "ST01",
    pressure_bar: 3.5,
    flowRate_lpm: 120,
    temperature_C: 55,
    cycleTime_s: 90,
    cleanliness_mg: 2.5,
    maxParticle_um: 400,
    verdict: "PASS",
  };
  const row = { ...defaults, ...overrides };
  return `${row.stationCode},${row.pressure_bar},${row.flowRate_lpm},${row.temperature_C},${row.cycleTime_s},${row.cleanliness_mg},${row.maxParticle_um},${row.verdict}`;
}

function makeStation(stationCode: string, overrides: Record<string, unknown> = {}) {
  return {
    stationCode,
    stationName: `Station ${stationCode}`,
    cycleTime: 90,
    mechanicalParams: {
      pumpPressureBar: 3.5,
      pumpFlowRate: 120,
      fluidTemperatureC: 55,
    },
    ...overrides,
  };
}

// ── parseCsvContent ──────────────────────────────────────────────────────

describe("parseCsvContent", () => {
  it("valid CSV with header + 3 rows → parses correctly", () => {
    const csv = [
      CSV_HEADER,
      makeCsvLine({ stationCode: "ST01", pressure_bar: 3.5, verdict: "PASS" }),
      makeCsvLine({ stationCode: "ST02", pressure_bar: 4.0, verdict: "FAIL" }),
      makeCsvLine({ stationCode: "ST03", pressure_bar: 3.2, verdict: "CONDITIONAL" }),
    ].join("\n");

    const rows = parseCsvContent(csv);

    expect(rows).toHaveLength(3);
    expect(rows[0].stationCode).toBe("ST01");
    expect(rows[0].pressure_bar).toBe(3.5);
    expect(rows[0].verdict).toBe("PASS");
    expect(rows[1].stationCode).toBe("ST02");
    expect(rows[1].verdict).toBe("FAIL");
    expect(rows[2].stationCode).toBe("ST03");
    expect(rows[2].verdict).toBe("CONDITIONAL");
  });

  it("empty CSV → returns empty array", () => {
    const rows = parseCsvContent("");
    expect(rows).toHaveLength(0);
  });

  it("header only (less than 2 lines) → returns empty array", () => {
    const rows = parseCsvContent(CSV_HEADER);
    expect(rows).toHaveLength(0);
  });

  it("rows with <8 columns → skipped", () => {
    const csv = [
      CSV_HEADER,
      "ST01,3.5,120",                      // only 3 columns
      makeCsvLine({ stationCode: "ST02" }), // valid row
      "ST03,1,2,3",                         // only 4 columns
    ].join("\n");

    const rows = parseCsvContent(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].stationCode).toBe("ST02");
  });

  it("verdict mapping: PASS → PASS", () => {
    const csv = [CSV_HEADER, makeCsvLine({ verdict: "PASS" })].join("\n");
    expect(parseCsvContent(csv)[0].verdict).toBe("PASS");
  });

  it("verdict mapping: pass (lowercase) → PASS", () => {
    const csv = [CSV_HEADER, makeCsvLine({ verdict: "pass" })].join("\n");
    expect(parseCsvContent(csv)[0].verdict).toBe("PASS");
  });

  it("verdict mapping: FAIL → FAIL", () => {
    const csv = [CSV_HEADER, makeCsvLine({ verdict: "FAIL" })].join("\n");
    expect(parseCsvContent(csv)[0].verdict).toBe("FAIL");
  });

  it("verdict mapping: CONDITIONAL → CONDITIONAL", () => {
    const csv = [CSV_HEADER, makeCsvLine({ verdict: "CONDITIONAL" })].join("\n");
    expect(parseCsvContent(csv)[0].verdict).toBe("CONDITIONAL");
  });

  it("verdict mapping: unknown value → FAIL", () => {
    const csv = [CSV_HEADER, makeCsvLine({ verdict: "MAYBE" })].join("\n");
    expect(parseCsvContent(csv)[0].verdict).toBe("FAIL");
  });

  it("verdict mapping: empty string → FAIL", () => {
    const csv = [CSV_HEADER, makeCsvLine({ verdict: "" })].join("\n");
    expect(parseCsvContent(csv)[0].verdict).toBe("FAIL");
  });

  it("numbers with whitespace are trimmed", () => {
    const csv = [
      CSV_HEADER,
      "  ST01 , 3.5 , 120.0 , 55 , 90 , 2.5 , 400 , PASS ",
    ].join("\n");

    const rows = parseCsvContent(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].stationCode).toBe("ST01");
    expect(rows[0].pressure_bar).toBe(3.5);
    expect(rows[0].flowRate_lpm).toBe(120.0);
  });

  it("caps at 500 rows (499 data rows after header)", () => {
    const lines = [CSV_HEADER];
    for (let i = 0; i < 600; i++) {
      lines.push(makeCsvLine({ stationCode: `ST${i}` }));
    }
    const csv = lines.join("\n");

    const rows = parseCsvContent(csv);
    // Loop runs from i=1 to i<500 (which gives 499 rows)
    expect(rows).toHaveLength(499);
  });

  it("non-numeric values default to 0", () => {
    const csv = [
      CSV_HEADER,
      "ST01,abc,def,ghi,jkl,mno,pqr,PASS",
    ].join("\n");

    const rows = parseCsvContent(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].pressure_bar).toBe(0);
    expect(rows[0].flowRate_lpm).toBe(0);
    expect(rows[0].temperature_C).toBe(0);
    expect(rows[0].cycleTime_s).toBe(0);
    expect(rows[0].cleanliness_mg).toBe(0);
    expect(rows[0].maxParticle_um).toBe(0);
  });
});

// ── compareWithBaseline ──────────────────────────────────────────────────

describe("compareWithBaseline", () => {
  beforeEach(() => {
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockWhere.mockClear();
    mockLimit.mockClear();
    mockExecute.mockClear();
    selectResults.length = 0;

    // Re-establish chain
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockExecute.mockResolvedValue(undefined);
  });

  it("station found, delta <5% → within_tolerance", async () => {
    // Baseline pressure = 3.5, actual = 3.6 → delta = (3.6-3.5)/3.5*100 = 2.86%
    selectResults.push([makeStation("ST01", {
      mechanicalParams: { pumpPressureBar: 3.5, pumpFlowRate: 120, fluidTemperatureC: 55 },
      cycleTime: 90,
    })]);

    const csvRows: CsvRow[] = [{
      stationCode: "ST01",
      pressure_bar: 3.6,
      flowRate_lpm: 121,
      temperature_C: 55.5,
      cycleTime_s: 91,
      cleanliness_mg: 2.5,
      maxParticle_um: 400,
      verdict: "PASS",
    }];

    const report = await compareWithBaseline(1, csvRows);

    expect(report.totalStations).toBe(1);
    expect(report.passCount).toBe(1);
    expect(report.failCount).toBe(0);

    const feedback = report.stationFeedback[0];
    expect(feedback.overallStatus).toBe("ok");
    for (const comp of feedback.comparisons) {
      expect(comp.classification).toBe("within_tolerance");
      expect(comp.suggestion).toBe("");
    }
  });

  it("station found, delta 10% → needs_adjustment", async () => {
    // Baseline pressure = 3.5, actual = 3.85 → delta = 10%
    selectResults.push([makeStation("ST01", {
      mechanicalParams: { pumpPressureBar: 3.5, pumpFlowRate: 120, fluidTemperatureC: 55 },
      cycleTime: 90,
    })]);

    const csvRows: CsvRow[] = [{
      stationCode: "ST01",
      pressure_bar: 3.85,
      flowRate_lpm: 120,
      temperature_C: 55,
      cycleTime_s: 90,
      cleanliness_mg: 2.5,
      maxParticle_um: 400,
      verdict: "PASS",
    }];

    const report = await compareWithBaseline(1, csvRows);
    const pressureComp = report.stationFeedback[0].comparisons.find(c => c.parameter === "pressure_bar")!;

    expect(pressureComp.classification).toBe("needs_adjustment");
    expect(pressureComp.deltaPercent).toBe(10);
    expect(pressureComp.suggestion).toContain("pressure");
    expect(report.stationFeedback[0].overallStatus).toBe("warning");
  });

  it("station found, delta 20% → out_of_spec with suggestion", async () => {
    // Baseline pressure = 3.5, actual = 4.2 → delta = 20%
    selectResults.push([makeStation("ST01", {
      mechanicalParams: { pumpPressureBar: 3.5, pumpFlowRate: 120, fluidTemperatureC: 55 },
      cycleTime: 90,
    })]);

    const csvRows: CsvRow[] = [{
      stationCode: "ST01",
      pressure_bar: 4.2,
      flowRate_lpm: 120,
      temperature_C: 55,
      cycleTime_s: 90,
      cleanliness_mg: 2.5,
      maxParticle_um: 400,
      verdict: "PASS",
    }];

    const report = await compareWithBaseline(1, csvRows);
    const pressureComp = report.stationFeedback[0].comparisons.find(c => c.parameter === "pressure_bar")!;

    expect(pressureComp.classification).toBe("out_of_spec");
    expect(pressureComp.suggestion).toContain("above baseline");
    expect(pressureComp.suggestion).toContain("pump relief valve");
    expect(report.stationFeedback[0].overallStatus).toBe("critical");
    // Global suggestions should contain this station
    expect(report.globalSuggestions.some(s => s.includes("ST01") && s.includes("out of spec"))).toBe(true);
  });

  it("station not in DB → all baselines null, all within_tolerance", async () => {
    selectResults.push([]); // Empty DB results

    const csvRows: CsvRow[] = [{
      stationCode: "ST99",
      pressure_bar: 5.0,
      flowRate_lpm: 200,
      temperature_C: 80,
      cycleTime_s: 120,
      cleanliness_mg: 5.0,
      maxParticle_um: 600,
      verdict: "PASS",
    }];

    const report = await compareWithBaseline(1, csvRows);
    const feedback = report.stationFeedback[0];

    expect(feedback.stationName).toBe("ST99"); // Falls back to stationCode
    expect(feedback.overallStatus).toBe("ok");
    for (const comp of feedback.comparisons) {
      expect(comp.baseline).toBeNull();
      expect(comp.classification).toBe("within_tolerance");
      expect(comp.deltaPercent).toBe(0);
    }
  });

  it("baseline=0 → deltaPercent=0 (no division by zero)", async () => {
    selectResults.push([makeStation("ST01", {
      mechanicalParams: { pumpPressureBar: 0, pumpFlowRate: 0, fluidTemperatureC: 0 },
      cycleTime: 0,
    })]);

    const csvRows: CsvRow[] = [{
      stationCode: "ST01",
      pressure_bar: 5.0,
      flowRate_lpm: 100,
      temperature_C: 55,
      cycleTime_s: 90,
      cleanliness_mg: 2.5,
      maxParticle_um: 400,
      verdict: "PASS",
    }];

    const report = await compareWithBaseline(1, csvRows);

    for (const comp of report.stationFeedback[0].comparisons) {
      expect(Number.isFinite(comp.deltaPercent)).toBe(true);
      expect(comp.deltaPercent).toBe(0);
      expect(comp.classification).toBe("within_tolerance");
    }
  });

  it(">30% failure rate → adds global recalibration suggestion", async () => {
    selectResults.push([]); // No baselines in DB

    // 2 out of 3 fail → 66.7% failure rate
    const csvRows: CsvRow[] = [
      { stationCode: "ST01", pressure_bar: 3.5, flowRate_lpm: 120, temperature_C: 55, cycleTime_s: 90, cleanliness_mg: 2.5, maxParticle_um: 400, verdict: "FAIL" },
      { stationCode: "ST02", pressure_bar: 3.5, flowRate_lpm: 120, temperature_C: 55, cycleTime_s: 90, cleanliness_mg: 2.5, maxParticle_um: 400, verdict: "FAIL" },
      { stationCode: "ST03", pressure_bar: 3.5, flowRate_lpm: 120, temperature_C: 55, cycleTime_s: 90, cleanliness_mg: 2.5, maxParticle_um: 400, verdict: "PASS" },
    ];

    const report = await compareWithBaseline(1, csvRows);

    expect(report.failCount).toBe(2);
    expect(report.passCount).toBe(1);
    expect(report.globalSuggestions.some(s => s.includes("recalibration"))).toBe(true);
  });

  it("exactly 30% failure rate → no recalibration suggestion (strictly >30%)", async () => {
    selectResults.push([]);

    // 3 out of 10 fail → exactly 30%
    const csvRows: CsvRow[] = [];
    for (let i = 0; i < 10; i++) {
      csvRows.push({
        stationCode: `ST${i}`,
        pressure_bar: 3.5, flowRate_lpm: 120, temperature_C: 55,
        cycleTime_s: 90, cleanliness_mg: 2.5, maxParticle_um: 400,
        verdict: i < 3 ? "FAIL" : "PASS",
      });
    }

    const report = await compareWithBaseline(1, csvRows);
    expect(report.failCount).toBe(3);
    expect(report.passCount).toBe(7);
    // 3/10 = 0.3, NOT > 0.3, so no recalibration
    expect(report.globalSuggestions.some(s => s.includes("recalibration"))).toBe(false);
  });

  it("pass/fail counts are correct for mixed verdicts", async () => {
    selectResults.push([]);

    const csvRows: CsvRow[] = [
      { stationCode: "ST01", pressure_bar: 3.5, flowRate_lpm: 120, temperature_C: 55, cycleTime_s: 90, cleanliness_mg: 2.5, maxParticle_um: 400, verdict: "PASS" },
      { stationCode: "ST02", pressure_bar: 3.5, flowRate_lpm: 120, temperature_C: 55, cycleTime_s: 90, cleanliness_mg: 2.5, maxParticle_um: 400, verdict: "FAIL" },
      { stationCode: "ST03", pressure_bar: 3.5, flowRate_lpm: 120, temperature_C: 55, cycleTime_s: 90, cleanliness_mg: 2.5, maxParticle_um: 400, verdict: "CONDITIONAL" },
      { stationCode: "ST04", pressure_bar: 3.5, flowRate_lpm: 120, temperature_C: 55, cycleTime_s: 90, cleanliness_mg: 2.5, maxParticle_um: 400, verdict: "PASS" },
    ];

    const report = await compareWithBaseline(1, csvRows);

    expect(report.totalStations).toBe(4);
    expect(report.passCount).toBe(2);
    expect(report.failCount).toBe(2); // FAIL + CONDITIONAL count as fail
  });

  it("suggestion text for pressure below baseline", async () => {
    // Baseline 3.5, actual 2.8 → delta = -20% → out_of_spec, "lower"
    selectResults.push([makeStation("ST01", {
      mechanicalParams: { pumpPressureBar: 3.5, pumpFlowRate: 120, fluidTemperatureC: 55 },
      cycleTime: 90,
    })]);

    const csvRows: CsvRow[] = [{
      stationCode: "ST01",
      pressure_bar: 2.8,
      flowRate_lpm: 120,
      temperature_C: 55,
      cycleTime_s: 90,
      cleanliness_mg: 2.5,
      maxParticle_um: 400,
      verdict: "FAIL",
    }];

    const report = await compareWithBaseline(1, csvRows);
    const pressureComp = report.stationFeedback[0].comparisons.find(c => c.parameter === "pressure_bar")!;

    expect(pressureComp.classification).toBe("out_of_spec");
    expect(pressureComp.suggestion).toContain("below baseline");
    expect(pressureComp.suggestion).toContain("leaks");
  });

  it("flow rate suggestion for high values", async () => {
    selectResults.push([makeStation("ST01", {
      mechanicalParams: { pumpPressureBar: 3.5, pumpFlowRate: 100, fluidTemperatureC: 55 },
      cycleTime: 90,
    })]);

    const csvRows: CsvRow[] = [{
      stationCode: "ST01",
      pressure_bar: 3.5,
      flowRate_lpm: 120,  // 20% above baseline of 100
      temperature_C: 55,
      cycleTime_s: 90,
      cleanliness_mg: 2.5,
      maxParticle_um: 400,
      verdict: "PASS",
    }];

    const report = await compareWithBaseline(1, csvRows);
    const flowComp = report.stationFeedback[0].comparisons.find(c => c.parameter === "flowRate_lpm")!;

    expect(flowComp.classification).toBe("out_of_spec");
    expect(flowComp.suggestion).toContain("nozzle diameter");
  });

  it("DB execute failure for traceability persist is non-blocking", async () => {
    selectResults.push([]);
    mockExecute.mockRejectedValue(new Error("DB write failed"));

    const csvRows: CsvRow[] = [{
      stationCode: "ST01",
      pressure_bar: 3.5, flowRate_lpm: 120, temperature_C: 55,
      cycleTime_s: 90, cleanliness_mg: 2.5, maxParticle_um: 400,
      verdict: "PASS",
    }];

    // Should not throw despite DB failure
    const report = await compareWithBaseline(1, csvRows);
    expect(report.totalStations).toBe(1);
    expect(report.passCount).toBe(1);
  });

  it("projectId is preserved in the report", async () => {
    selectResults.push([]);

    const report = await compareWithBaseline(42, [{
      stationCode: "ST01",
      pressure_bar: 3.5, flowRate_lpm: 120, temperature_C: 55,
      cycleTime_s: 90, cleanliness_mg: 2.5, maxParticle_um: 400,
      verdict: "PASS",
    }]);

    expect(report.projectId).toBe(42);
  });

  it("stationName falls back to stationCode when station not found", async () => {
    selectResults.push([]);

    const report = await compareWithBaseline(1, [{
      stationCode: "UNKNOWN_STATION",
      pressure_bar: 3.5, flowRate_lpm: 120, temperature_C: 55,
      cycleTime_s: 90, cleanliness_mg: 2.5, maxParticle_um: 400,
      verdict: "PASS",
    }]);

    expect(report.stationFeedback[0].stationName).toBe("UNKNOWN_STATION");
  });

  it("deltaPercent is rounded to 1 decimal place", async () => {
    // Baseline 3.5, actual 3.7 → delta = (0.2/3.5)*100 = 5.714...% → should be 5.7
    selectResults.push([makeStation("ST01", {
      mechanicalParams: { pumpPressureBar: 3.5 },
      cycleTime: null,
    })]);

    const csvRows: CsvRow[] = [{
      stationCode: "ST01",
      pressure_bar: 3.7,
      flowRate_lpm: 120,
      temperature_C: 55,
      cycleTime_s: 90,
      cleanliness_mg: 2.5,
      maxParticle_um: 400,
      verdict: "PASS",
    }];

    const report = await compareWithBaseline(1, csvRows);
    const pressureComp = report.stationFeedback[0].comparisons.find(c => c.parameter === "pressure_bar")!;

    expect(pressureComp.deltaPercent).toBe(5.7);
    // Verify it has at most 1 decimal place
    const str = String(pressureComp.deltaPercent);
    const decimalPart = str.split(".")[1] || "";
    expect(decimalPart.length).toBeLessThanOrEqual(1);
  });
});
