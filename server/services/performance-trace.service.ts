/**
 * Performance Traceability Service (Task #76)
 * Link performance metrics to source actions.
 */

import { requireDb } from "../db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import * as schema from "../../drizzle/schema";

export async function tracePerformance(userId: number, metric: string, value: number, source?: { type?: string; id?: number; description?: string; unit?: string; period?: string }) {
  const db = await requireDb();
  const result = await db.insert(schema.performanceTraces).values({
    userId, metricCode: metric, metricName: metric.replace(/_/g, " "),
    value, unit: source?.unit, sourceType: source?.type,
    sourceId: source?.id, sourceDescription: source?.description,
    period: source?.period,
  }).returning();
  return result[0];
}

export async function getPerformanceChain(userId: number) {
  const db = await requireDb();
  const traces = await db.select().from(schema.performanceTraces).where(eq(schema.performanceTraces.userId, userId)).orderBy(desc(schema.performanceTraces.recordedAt)).limit(100);
  const metrics = Array.from(new Set(traces.map(t => t.metricCode)));
  const chain = metrics.map(m => ({
    metric: m,
    dataPoints: traces.filter(t => t.metricCode === m),
    trend: traces.filter(t => t.metricCode === m).length > 1 ? "improving" : "stable",
  }));
  return { userId, metrics: chain, totalTraces: traces.length };
}

export async function generatePerformanceReport(userId: number, period: string) {
  const db = await requireDb();
  const traces = await db.select().from(schema.performanceTraces).where(and(eq(schema.performanceTraces.userId, userId), eq(schema.performanceTraces.period, period)));
  const metrics = Array.from(new Set(traces.map(t => t.metricCode)));
  const summary = metrics.map(m => {
    const pts = traces.filter(t => t.metricCode === m);
    const vals = pts.map(p => p.value);
    return { metric: m, count: pts.length, avg: vals.reduce((a,b) => a+b, 0) / vals.length,
      min: Math.min(...vals), max: Math.max(...vals) };
  });
  return { userId, period, metrics: summary, generatedAt: new Date() };
}

export async function compareTeamPerformance(teamId: number) {
  const db = await requireDb();
  const traces = await db.select().from(schema.performanceTraces).orderBy(desc(schema.performanceTraces.recordedAt)).limit(500);
  const byUser = new Map<number, typeof traces>();
  for (const t of traces) {
    if (!byUser.has(t.userId)) byUser.set(t.userId, []);
    byUser.get(t.userId)!.push(t);
  }
  const members = Array.from(byUser.entries()).map(([userId, data]) => ({
    userId, traceCount: data.length,
    avgValue: data.reduce((a, b) => a + b.value, 0) / data.length,
  }));
  return { teamId, members, teamAvg: members.reduce((a, b) => a + b.avgValue, 0) / Math.max(1, members.length) };
}