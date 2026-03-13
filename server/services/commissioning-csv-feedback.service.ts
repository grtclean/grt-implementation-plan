/**
 * Commissioning CSV Feedback Service
 * Parses field data from 05_Commissioning cleanliness reports and compares with R&D parameters
 */
import { requireDb } from "../db";
import { createChildLogger } from "../lib/logger";
import { equipmentStations, type MechanicalParams } from "../../drizzle/design-engine-schema";
import { eq, and, sql } from "drizzle-orm";

const log = createChildLogger("commissioning-csv-feedback");

export interface CsvRow {
  stationCode: string;
  pressure_bar: number;
  flowRate_lpm: number;
  temperature_C: number;
  cycleTime_s: number;
  cleanliness_mg: number;
  maxParticle_um: number;
  verdict: "PASS" | "FAIL" | "CONDITIONAL";
}

export interface ParameterComparison {
  parameter: string;
  baseline: number | null;
  actual: number;
  deltaPercent: number;
  classification: "within_tolerance" | "needs_adjustment" | "out_of_spec";
  suggestion: string;
}

export interface StationFeedback {
  stationCode: string;
  stationName: string;
  verdict: string;
  comparisons: ParameterComparison[];
  overallStatus: "ok" | "warning" | "critical";
}

export interface FeedbackReport {
  projectId: number;
  totalStations: number;
  passCount: number;
  failCount: number;
  stationFeedback: StationFeedback[];
  globalSuggestions: string[];
}

function classifyDelta(deltaPercent: number): "within_tolerance" | "needs_adjustment" | "out_of_spec" {
  const abs = Math.abs(deltaPercent);
  if (abs < 5) return "within_tolerance";
  if (abs < 15) return "needs_adjustment";
  return "out_of_spec";
}

function suggestCorrection(param: string, deltaPercent: number): string {
  const direction = deltaPercent > 0 ? "higher" : "lower";
  const abs = Math.abs(deltaPercent).toFixed(1);

  const suggestions: Record<string, Record<string, string>> = {
    pressure_bar: {
      higher: `Actual pressure ${abs}% above baseline. Check pump relief valve setting or reduce pump speed.`,
      lower: `Actual pressure ${abs}% below baseline. Check for leaks in manifold or nozzle blockage.`,
    },
    flowRate_lpm: {
      higher: `Flow rate ${abs}% above baseline. Verify nozzle diameter; may need restriction.`,
      lower: `Flow rate ${abs}% below baseline. Check filter blockage or pump wear.`,
    },
    temperature_C: {
      higher: `Temperature ${abs}% above baseline. Check heater thermostat or coolant flow.`,
      lower: `Temperature ${abs}% below baseline. Increase heater setpoint or check heat exchanger fouling.`,
    },
    cycleTime_s: {
      higher: `Cycle time ${abs}% above baseline. Check conveyor speed or dwell time settings.`,
      lower: `Cycle time ${abs}% below baseline. Verify adequate exposure time for cleanliness.`,
    },
  };

  return suggestions[param]?.[direction] || `${param} is ${abs}% ${direction} than baseline.`;
}

export function parseCsvContent(csv: string): CsvRow[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  // Skip header row
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length && i < 500; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    if (cols.length < 8) continue;

    rows.push({
      stationCode: cols[0],
      pressure_bar: parseFloat(cols[1]) || 0,
      flowRate_lpm: parseFloat(cols[2]) || 0,
      temperature_C: parseFloat(cols[3]) || 0,
      cycleTime_s: parseFloat(cols[4]) || 0,
      cleanliness_mg: parseFloat(cols[5]) || 0,
      maxParticle_um: parseFloat(cols[6]) || 0,
      verdict: (cols[7]?.toUpperCase() === "PASS" ? "PASS" : cols[7]?.toUpperCase() === "CONDITIONAL" ? "CONDITIONAL" : "FAIL") as CsvRow["verdict"],
    });
  }
  return rows;
}

export async function compareWithBaseline(projectId: number, csvRows: CsvRow[]): Promise<FeedbackReport> {
  const db = await requireDb();

  // Load baseline stations for project
  const stations = await db.select().from(equipmentStations)
    .where(eq(equipmentStations.projectId, projectId))
    .limit(100);

  const stationMap = new Map(stations.map(s => [s.stationCode, s]));

  let passCount = 0;
  let failCount = 0;
  const stationFeedback: StationFeedback[] = [];
  const globalIssues = new Set<string>();

  for (const row of csvRows) {
    const station = stationMap.get(row.stationCode);
    const mech = (station?.mechanicalParams || {}) as Partial<MechanicalParams>;

    if (row.verdict === "PASS") passCount++;
    else failCount++;

    const comparisons: ParameterComparison[] = [];

    // Compare each parameter against mechanical baseline
    const paramPairs: Array<{
      param: string;
      baseline: number | undefined;
      actual: number;
    }> = [
      { param: "pressure_bar", baseline: (mech as Record<string, unknown>).pumpPressureBar as number | undefined, actual: row.pressure_bar },
      { param: "flowRate_lpm", baseline: (mech as Record<string, unknown>).pumpFlowRate as number | undefined, actual: row.flowRate_lpm },
      { param: "temperature_C", baseline: (mech as Record<string, unknown>).fluidTemperatureC as number | undefined, actual: row.temperature_C },
      { param: "cycleTime_s", baseline: station?.cycleTime ?? undefined, actual: row.cycleTime_s },
    ];

    for (const { param, baseline, actual } of paramPairs) {
      const baselineVal = baseline ?? null;
      const deltaPercent = baselineVal != null && baselineVal !== 0
        ? ((actual - baselineVal) / baselineVal) * 100
        : 0;

      const classification = baselineVal != null ? classifyDelta(deltaPercent) : "within_tolerance";

      comparisons.push({
        parameter: param,
        baseline: baselineVal,
        actual,
        deltaPercent: Math.round(deltaPercent * 10) / 10,
        classification,
        suggestion: classification !== "within_tolerance" ? suggestCorrection(param, deltaPercent) : "",
      });

      if (classification === "out_of_spec") {
        globalIssues.add(`${row.stationCode}: ${param} out of spec (${deltaPercent.toFixed(1)}%)`);
      }
    }

    const hasOutOfSpec = comparisons.some(c => c.classification === "out_of_spec");
    const hasAdjustment = comparisons.some(c => c.classification === "needs_adjustment");
    const overallStatus: StationFeedback["overallStatus"] =
      hasOutOfSpec ? "critical" : hasAdjustment ? "warning" : "ok";

    stationFeedback.push({
      stationCode: row.stationCode,
      stationName: station?.stationName || row.stationCode,
      verdict: row.verdict,
      comparisons,
      overallStatus,
    });
  }

  // Persist actuals for traceability (best-effort)
  try {
    for (const row of csvRows) {
      await db.execute(
        sql`
          INSERT INTO robot_cleaning_actions (station_code, pass_rate, cycle_time_seconds, created_at)
          VALUES (${row.stationCode}, ${row.verdict === "PASS" ? 100 : 0}, ${row.cycleTime_s}, NOW())
          ON CONFLICT DO NOTHING
        `,
      );
    }
  } catch (err) {
    log.warn({ err }, "Failed to persist commissioning actuals (non-blocking)");
  }

  const globalSuggestions = Array.from(globalIssues);
  if (failCount > csvRows.length * 0.3) {
    globalSuggestions.push("High failure rate (>30%). Consider full system recalibration.");
  }

  log.info({
    projectId,
    totalStations: csvRows.length,
    passCount,
    failCount,
    criticalCount: stationFeedback.filter(s => s.overallStatus === "critical").length,
  }, "Commissioning CSV comparison completed");

  return {
    projectId,
    totalStations: csvRows.length,
    passCount,
    failCount,
    stationFeedback,
    globalSuggestions,
  };
}
