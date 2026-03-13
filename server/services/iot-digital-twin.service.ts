/**
 * IoT Digital Twin Service (Task #78)
 * Equipment digital twin data management.
 */

import { requireDb } from "../db";
import { eq, desc, and } from "drizzle-orm";
import * as schema from "../../drizzle/schema";

const THRESHOLDS: Record<string, { warn: number; critical: number; unit: string }> = {
  temperature: { warn: 80, critical: 95, unit: "C" },
  pressure: { warn: 15, critical: 20, unit: "MPa" },
  vibration: { warn: 5, critical: 8, unit: "mm/s" },
  cycle_count: { warn: 50000, critical: 80000, unit: "cycles" },
};

export async function registerEquipment(data: { equipmentId: number; equipmentCode?: string; equipmentName?: string; location?: string; metadata?: string }) {
  const db = await requireDb();
  const result = await db.insert(schema.iotEquipmentTwins).values({
    equipmentId: data.equipmentId, equipmentCode: data.equipmentCode,
    equipmentName: data.equipmentName, location: data.location,
    status: "online", metadata: data.metadata,
  }).returning();
  return result[0];
}

export async function updateTelemetry(equipmentId: number, data: { metricType: string; value: number; unit?: string }) {
  const db = await requireDb();
  const threshold = THRESHOLDS[data.metricType];
  const isAlert = threshold ? data.value >= threshold.warn : false;
  const result = await db.insert(schema.iotTelemetryData).values({
    equipmentId, metricType: data.metricType, value: data.value,
    unit: data.unit ?? threshold?.unit, isAlert,
  }).returning();
  await db.update(schema.iotEquipmentTwins).set({
    lastTelemetryAt: new Date(), status: isAlert ? "warning" : "online",
  }).where(eq(schema.iotEquipmentTwins.equipmentId, equipmentId));
  return result[0];
}

export async function getEquipmentTwin(equipmentId: number) {
  const db = await requireDb();
  const twins = await db.select().from(schema.iotEquipmentTwins).where(eq(schema.iotEquipmentTwins.equipmentId, equipmentId)).limit(1000);
  const telemetry = await db.select().from(schema.iotTelemetryData).where(eq(schema.iotTelemetryData.equipmentId, equipmentId)).orderBy(desc(schema.iotTelemetryData.recordedAt)).limit(100);
  const predictions = await db.select().from(schema.iotMaintenancePredictions).where(eq(schema.iotMaintenancePredictions.equipmentId, equipmentId)).orderBy(desc(schema.iotMaintenancePredictions.createdAt)).limit(10);
  return { equipment: twins[0] ?? null, telemetry, predictions };
}

export async function getAlerts(equipmentId?: number) {
  const db = await requireDb();
  const query = equipmentId
    ? db.select().from(schema.iotTelemetryData).where(and(eq(schema.iotTelemetryData.equipmentId, equipmentId), eq(schema.iotTelemetryData.isAlert, true)))
    : db.select().from(schema.iotTelemetryData).where(eq(schema.iotTelemetryData.isAlert, true));
  const alerts = await query.orderBy(desc(schema.iotTelemetryData.recordedAt)).limit(50);
  return alerts;
}

export async function predictMaintenance(equipmentId: number) {
  const db = await requireDb();
  const telemetry = await db.select().from(schema.iotTelemetryData).where(eq(schema.iotTelemetryData.equipmentId, equipmentId)).orderBy(desc(schema.iotTelemetryData.recordedAt)).limit(50);
  const predictions: Array<{ issue: string; confidence: number; action: string; date: Date }> = [];
  for (const [metric, thresh] of Object.entries(THRESHOLDS)) {
    const readings = telemetry.filter(t => t.metricType === metric);
    if (readings.length > 3) {
      const avg = readings.reduce((a, b) => a + b.value, 0) / readings.length;
      if (avg > thresh.warn * 0.8) {
        const confidence = Math.min(0.95, (avg / thresh.critical) * 0.9);
        const daysUntil = Math.max(1, Math.floor((thresh.critical - avg) / ((avg - thresh.warn * 0.7) || 1) * 7));
        const predictedDate = new Date(); predictedDate.setDate(predictedDate.getDate() + daysUntil);
        predictions.push({ issue: metric + " approaching threshold", confidence,
          action: "Schedule maintenance for " + metric, date: predictedDate });
      }
    }
  }
  for (const pred of predictions) {
    await db.insert(schema.iotMaintenancePredictions).values({
      equipmentId, predictedIssue: pred.issue, confidence: pred.confidence,
      recommendedAction: pred.action, predictedDate: pred.date,
    });
  }
  return { equipmentId, predictions };
}