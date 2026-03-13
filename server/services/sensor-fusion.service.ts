/**
 * Sensor Fusion Service — Cross-table telemetry correlation & anomaly detection
 *
 * Joins: robot_cleaning_actions + oee_snapshots + iot_telemetry_data
 * Produces: fused_equipment_readings with anomaly scores
 */

import { createChildLogger } from "../lib/logger";
import { requireDb } from "../db";
import { fusedEquipmentReadings, anomalyPatterns } from "../../drizzle/sensor-fusion-schema";
import type { FusedMetrics, AnomalyCondition } from "../../drizzle/sensor-fusion-schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

const log = createChildLogger("sensor-fusion");

/**
 * Fuse readings from multiple telemetry sources for a given equipment and time window.
 */
export async function fuseReadings(
  equipmentId: number,
  timeWindowHours: number = 24,
): Promise<Array<{ timestamp: string; metrics: FusedMetrics; anomalyScore: number }>> {
  const db = await requireDb();
  const cutoff = new Date(Date.now() - timeWindowHours * 3600_000).toISOString();

  // Query IoT telemetry data
  const telemetryRows = await db.execute(sql`
    SELECT id, metric_type, metric_value, recorded_at
    FROM iot_telemetry_data
    WHERE equipment_id = ${equipmentId}
      AND recorded_at >= ${cutoff}
    ORDER BY recorded_at DESC
    LIMIT 500
  `);

  // Query robot cleaning actions (if equipment has associated robot)
  const cleaningRows = await db.execute(sql`
    SELECT id, cleanliness_after_mg, max_particle_um, pressure_bar,
           flow_rate_lpm, temperature_c, cycle_time_seconds, recorded_at
    FROM robot_cleaning_actions
    WHERE equipment_id = ${equipmentId}
      AND created_at >= ${cutoff}
    ORDER BY created_at DESC
    LIMIT 100
  `);

  // Query OEE snapshots
  const oeeRows = await db.execute(sql`
    SELECT id, oee, availability, performance, quality, snapshot_date
    FROM oee_snapshots
    WHERE equipment_id = ${equipmentId}
      AND snapshot_date >= ${cutoff}
    ORDER BY snapshot_date DESC
    LIMIT 30
  `);

  // Build time-bucketed fusion (1-hour buckets)
  const buckets = new Map<string, FusedMetrics>();
  const telemetry = (telemetryRows as any).rows || [];
  const cleaning = (cleaningRows as any).rows || [];
  const oee = (oeeRows as any).rows || [];

  for (const row of telemetry) {
    const bucket = new Date(row.recorded_at).toISOString().slice(0, 13); // hour bucket
    const existing = buckets.get(bucket) || {};
    if (row.metric_type === "temperature") existing.temperature = Number(row.metric_value);
    if (row.metric_type === "pressure") existing.pressure = Number(row.metric_value);
    if (row.metric_type === "vibration") existing.vibration = Number(row.metric_value);
    buckets.set(bucket, existing);
  }

  for (const row of cleaning) {
    const bucket = new Date(row.recorded_at || row.created_at).toISOString().slice(0, 13);
    const existing = buckets.get(bucket) || {};
    existing.flowRate = Number(row.flow_rate_lpm) || existing.flowRate;
    existing.cleanlinessScore = Number(row.cleanliness_after_mg) || existing.cleanlinessScore;
    existing.cycleTime = Number(row.cycle_time_seconds) || existing.cycleTime;
    buckets.set(bucket, existing);
  }

  for (const row of oee) {
    const bucket = new Date(row.snapshot_date).toISOString().slice(0, 13);
    const existing = buckets.get(bucket) || {};
    existing.oee = Number(row.oee) || existing.oee;
    buckets.set(bucket, existing);
  }

  // Calculate anomaly scores per bucket
  const results: Array<{ timestamp: string; metrics: FusedMetrics; anomalyScore: number }> = [];
  for (const [bucket, metrics] of buckets) {
    const score = calculateAnomalyScore(metrics);
    results.push({ timestamp: bucket + ":00:00.000Z", metrics, anomalyScore: score });
  }

  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  log.info({ equipmentId, buckets: results.length }, "Fused readings computed");
  return results;
}

/**
 * Simple rule-based anomaly scoring (0-100).
 * Higher = more anomalous.
 */
function calculateAnomalyScore(metrics: FusedMetrics): number {
  let score = 0;
  if (metrics.temperature && metrics.temperature > 80) score += 20;
  if (metrics.temperature && metrics.temperature > 95) score += 30;
  if (metrics.vibration && metrics.vibration > 5) score += 15;
  if (metrics.vibration && metrics.vibration > 8) score += 25;
  if (metrics.pressure && metrics.pressure > 15) score += 10;
  if (metrics.pressure && metrics.pressure > 20) score += 20;
  if (metrics.oee !== undefined && metrics.oee < 0.6) score += 15;
  if (metrics.cleanlinessScore && metrics.cleanlinessScore > 50) score += 10; // mg — higher is dirtier
  return Math.min(score, 100);
}

/**
 * Detect anomaly patterns against configurable rules.
 */
export async function detectAnomalyPatterns(
  equipmentId: number,
  timeWindowHours: number = 24,
): Promise<Array<{ patternName: string; severity: string; triggered: boolean; details: string }>> {
  const db = await requireDb();

  // Get active patterns
  const patterns = await db.select()
    .from(anomalyPatterns)
    .where(eq(anomalyPatterns.isActive, true))
    .limit(50);

  // Get fused readings for evaluation
  const readings = await fuseReadings(equipmentId, timeWindowHours);
  if (readings.length === 0) return [];

  const latestMetrics = readings[0].metrics;
  const results: Array<{ patternName: string; severity: string; triggered: boolean; details: string }> = [];

  for (const pattern of patterns) {
    const conditions = pattern.conditions || [];
    let allMatch = conditions.length > 0;
    const details: string[] = [];

    for (const cond of conditions) {
      const value = (latestMetrics as any)[cond.metric];
      if (value === undefined) { allMatch = false; continue; }

      let match = false;
      switch (cond.operator) {
        case "gt": match = value > cond.threshold; break;
        case "lt": match = value < cond.threshold; break;
        case "gte": match = value >= cond.threshold; break;
        case "lte": match = value <= cond.threshold; break;
        case "eq": match = value === cond.threshold; break;
        case "between": match = value >= cond.threshold && value <= (cond.thresholdHigh ?? Infinity); break;
      }

      if (match) {
        details.push(`${cond.metric}=${value} ${cond.operator} ${cond.threshold}`);
      } else {
        allMatch = false;
      }
    }

    results.push({
      patternName: pattern.patternName,
      severity: pattern.severity,
      triggered: allMatch,
      details: allMatch ? details.join(", ") : "No match",
    });

    // Update trigger count if matched
    if (allMatch) {
      await db.update(anomalyPatterns)
        .set({ triggerCount: (pattern.triggerCount || 0) + 1, lastTriggeredAt: new Date().toISOString() })
        .where(eq(anomalyPatterns.id, pattern.id));
    }
  }

  log.info({ equipmentId, triggered: results.filter(r => r.triggered).length }, "Anomaly pattern check complete");
  return results;
}

/**
 * Compute correlation matrix between metrics.
 * Returns Pearson correlation coefficients for all metric pairs.
 */
export async function getCorrelationMatrix(
  equipmentId: number,
  timeWindowHours: number = 168, // 7 days
): Promise<Record<string, Record<string, number>>> {
  const readings = await fuseReadings(equipmentId, timeWindowHours);
  const metricKeys: (keyof FusedMetrics)[] = [
    "temperature", "pressure", "vibration", "flowRate", "oee", "cleanlinessScore",
  ];

  const vectors: Record<string, number[]> = {};
  for (const key of metricKeys) {
    vectors[key] = readings.map(r => (r.metrics[key] as number) ?? NaN).filter(v => !isNaN(v));
  }

  const matrix: Record<string, Record<string, number>> = {};
  for (const a of metricKeys) {
    matrix[a] = {};
    for (const b of metricKeys) {
      matrix[a][b] = pearsonCorrelation(vectors[a] || [], vectors[b] || []);
    }
  }

  return matrix;
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const xs = x.slice(0, n);
  const ys = y.slice(0, n);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : Math.round((num / den) * 100) / 100;
}
