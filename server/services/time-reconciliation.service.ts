/**
 * 三套工时对账服务 (Time Reconciliation Service)
 *
 * Compares three time-tracking sources:
 * 1. UWB work hours (uwb_work_hours) - zone-based automatic tracking
 * 2. BOM step time logs (process_step_time_logs) - manual clock-in/out per step
 * 3. Production execution time records (production_time_records) - stage-level time records
 *
 * Flags discrepancies > 30 minutes and generates reconciliation reports.
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";

// ============================================================
// Type Definitions
// ============================================================

export interface WorkerTimeRecord {
  userId: number;
  userName: string;
  uwbHours: number | null;
  bomStepHours: number | null;
  productionHours: number | null;
}

export interface Discrepancy {
  id: string;
  userId: number;
  userName: string;
  date: string;
  projectId: number;
  uwbHours: number | null;
  bomStepHours: number | null;
  productionHours: number | null;
  maxDifferenceMinutes: number;
  status: 'unresolved' | 'resolved' | 'acknowledged';
  resolution: string | null;
  adjustedHours: number | null;
  resolvedBy: number | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface ReconciliationReport {
  projectId: number;
  date: string;
  generatedAt: string;
  summary: {
    totalWorkers: number;
    matchedCount: number;
    discrepancyCount: number;
    totalUwbHours: number;
    totalBomStepHours: number;
    totalProductionHours: number;
  };
  matchedRecords: WorkerTimeRecord[];
  discrepancies: Discrepancy[];
  recommendations: string[];
}

// ============================================================
// Discrepancy threshold: 30 minutes
// ============================================================

const DISCREPANCY_THRESHOLD_MINUTES = 30;

// ============================================================
// Core Reconciliation Function
// ============================================================

/**
 * Reconcile time records from three sources for a given project and date.
 */
export async function reconcileTimeRecords(params: {
  projectId: number;
  date: string; // YYYY-MM-DD
  userId?: number;
}): Promise<ReconciliationReport> {
  const db = await requireDb();
  const { projectId, date, userId } = params;

  // 1. Query UWB work hours
  const uwbRecords = await getUwbWorkHours(db, date, userId);

  // 2. Query BOM step time logs
  const bomStepRecords = await getBomStepTimeLogs(db, projectId, date, userId);

  // 3. Query production execution time records
  const productionRecords = await getProductionTimeRecords(db, projectId, date, userId);

  // 4. Merge all worker IDs
  const allWorkerIdSet = new Set<number>();
  for (const record of uwbRecords) allWorkerIdSet.add(record.userId);
  for (const record of bomStepRecords) allWorkerIdSet.add(record.userId);
  for (const record of productionRecords) allWorkerIdSet.add(record.userId);
  const allWorkerIds = Array.from(allWorkerIdSet);

  // Build lookup maps
  const uwbMap = new Map<number, { hours: number; name: string }>();
  for (const r of uwbRecords) {
    uwbMap.set(r.userId, { hours: r.totalHours, name: r.userName });
  }

  const bomMap = new Map<number, { hours: number; name: string }>();
  for (const r of bomStepRecords) {
    bomMap.set(r.userId, { hours: r.totalHours, name: r.userName });
  }

  const prodMap = new Map<number, { hours: number; name: string }>();
  for (const r of productionRecords) {
    prodMap.set(r.userId, { hours: r.totalHours, name: r.userName });
  }

  // 5. Compare and classify
  const matchedRecords: WorkerTimeRecord[] = [];
  const discrepancies: Discrepancy[] = [];

  let totalUwbHours = 0;
  let totalBomStepHours = 0;
  let totalProductionHours = 0;

  for (const workerId of allWorkerIds) {
    const uwb = uwbMap.get(workerId);
    const bom = bomMap.get(workerId);
    const prod = prodMap.get(workerId);

    const uwbHours = uwb?.hours ?? null;
    const bomStepHours = bom?.hours ?? null;
    const productionHours = prod?.hours ?? null;

    const workerName = uwb?.name || bom?.name || prod?.name || `Worker #${workerId}`;

    if (uwbHours !== null) totalUwbHours += uwbHours;
    if (bomStepHours !== null) totalBomStepHours += bomStepHours;
    if (productionHours !== null) totalProductionHours += productionHours;

    const record: WorkerTimeRecord = {
      userId: workerId,
      userName: workerName,
      uwbHours,
      bomStepHours,
      productionHours,
    };

    // Calculate max difference between any two available sources
    const availableHours = [uwbHours, bomStepHours, productionHours].filter(
      (h): h is number => h !== null
    );

    if (availableHours.length < 2) {
      // Only one source or none -- flag as discrepancy if at least one source has data
      if (availableHours.length === 1) {
        const discrepancyId = `disc-${projectId}-${date}-${workerId}`;
        discrepancies.push({
          id: discrepancyId,
          userId: workerId,
          userName: workerName,
          date,
          projectId,
          uwbHours,
          bomStepHours,
          productionHours,
          maxDifferenceMinutes: 0,
          status: 'unresolved',
          resolution: null,
          adjustedHours: null,
          resolvedBy: null,
          resolvedAt: null,
          createdAt: new Date().toISOString(),
        });
      }
      continue;
    }

    const maxHours = Math.max(...availableHours);
    const minHours = Math.min(...availableHours);
    const differenceMinutes = (maxHours - minHours) * 60;

    if (differenceMinutes > DISCREPANCY_THRESHOLD_MINUTES) {
      const discrepancyId = `disc-${projectId}-${date}-${workerId}`;
      discrepancies.push({
        id: discrepancyId,
        userId: workerId,
        userName: workerName,
        date,
        projectId,
        uwbHours,
        bomStepHours,
        productionHours,
        maxDifferenceMinutes: Math.round(differenceMinutes),
        status: 'unresolved',
        resolution: null,
        adjustedHours: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
      });
    } else {
      matchedRecords.push(record);
    }
  }

  // 6. Generate recommendations
  const recommendations = generateRecommendations(
    matchedRecords,
    discrepancies,
    totalUwbHours,
    totalBomStepHours,
    totalProductionHours
  );

  // 7. Persist discrepancies to database for later resolution
  await persistDiscrepancies(db, discrepancies);

  return {
    projectId,
    date,
    generatedAt: new Date().toISOString(),
    summary: {
      totalWorkers: allWorkerIds.length,
      matchedCount: matchedRecords.length,
      discrepancyCount: discrepancies.length,
      totalUwbHours: Math.round(totalUwbHours * 100) / 100,
      totalBomStepHours: Math.round(totalBomStepHours * 100) / 100,
      totalProductionHours: Math.round(totalProductionHours * 100) / 100,
    },
    matchedRecords,
    discrepancies,
    recommendations,
  };
}

// ============================================================
// Data Source Queries
// ============================================================

interface WorkerHoursRow {
  userId: number;
  userName: string;
  totalHours: number;
}

/**
 * Query UWB work hours for a given date, optionally filtered by userId.
 */
async function getUwbWorkHours(
  db: NonNullable<Awaited<ReturnType<typeof requireDb>>>,
  date: string,
  userId?: number
): Promise<WorkerHoursRow[]> {
  try {
    if (userId) {
      const result = await db.execute(sql`
        SELECT
          CAST(w.employee_id AS INTEGER) as user_id,
          COALESCE(u.name, CONCAT('Worker#', w.employee_id)) as user_name,
          COALESCE(SUM(w.effective_minutes), 0) / 60.0 as total_hours
        FROM uwb_work_hours w
        LEFT JOIN users u ON CAST(w.employee_id AS VARCHAR) = CAST(u.id AS VARCHAR)
        WHERE w.work_date = ${date}
          AND w.employee_id = CAST(${userId} AS VARCHAR)
        GROUP BY w.employee_id, u.name
      `);
      return mapWorkerRows(result);
    }

    const result = await db.execute(sql`
      SELECT
        CAST(w.employee_id AS INTEGER) as user_id,
        COALESCE(u.name, CONCAT('Worker#', w.employee_id)) as user_name,
        COALESCE(SUM(w.effective_minutes), 0) / 60.0 as total_hours
      FROM uwb_work_hours w
      LEFT JOIN users u ON CAST(w.employee_id AS VARCHAR) = CAST(u.id AS VARCHAR)
      WHERE w.work_date = ${date}
      GROUP BY w.employee_id, u.name
    `);
    return mapWorkerRows(result);
  } catch {
    // Table may not exist; return empty
    return [];
  }
}

/**
 * Query BOM step time logs for a given project and date, optionally filtered by userId.
 */
async function getBomStepTimeLogs(
  db: NonNullable<Awaited<ReturnType<typeof requireDb>>>,
  projectId: number,
  date: string,
  userId?: number
): Promise<WorkerHoursRow[]> {
  try {
    // process_step_time_logs uses millisecond timestamps for start_time
    // We need to find logs whose start_time falls on the given date
    const dateStart = new Date(`${date}T00:00:00Z`).getTime();
    const dateEnd = new Date(`${date}T23:59:59.999Z`).getTime();

    if (userId) {
      const result = await db.execute(sql`
        SELECT
          t.worker_id as user_id,
          t.worker_name as user_name,
          COALESCE(SUM(t.actual_hours), 0) as total_hours
        FROM process_step_time_logs t
        JOIN process_bom_steps b ON t.bom_step_id = b.id
        WHERE b.project_id = ${projectId}
          AND t.start_time >= ${dateStart}
          AND t.start_time <= ${dateEnd}
          AND t.worker_id = ${userId}
          AND t.status = 'completed'
        GROUP BY t.worker_id, t.worker_name
      `);
      return mapWorkerRows(result);
    }

    const result = await db.execute(sql`
      SELECT
        t.worker_id as user_id,
        t.worker_name as user_name,
        COALESCE(SUM(t.actual_hours), 0) as total_hours
      FROM process_step_time_logs t
      JOIN process_bom_steps b ON t.bom_step_id = b.id
      WHERE b.project_id = ${projectId}
        AND t.start_time >= ${dateStart}
        AND t.start_time <= ${dateEnd}
        AND t.status = 'completed'
      GROUP BY t.worker_id, t.worker_name
    `);
    return mapWorkerRows(result);
  } catch {
    return [];
  }
}

/**
 * Query production execution time records for a given project and date.
 */
async function getProductionTimeRecords(
  db: NonNullable<Awaited<ReturnType<typeof requireDb>>>,
  projectId: number,
  date: string,
  userId?: number
): Promise<WorkerHoursRow[]> {
  try {
    if (userId) {
      const result = await db.execute(sql`
        SELECT
          ptr.user_id as user_id,
          COALESCE(ptr.user_name, CONCAT('Worker#', ptr.user_id)) as user_name,
          COALESCE(SUM(ptr.duration), 0) as total_hours
        FROM production_time_records ptr
        WHERE ptr.project_id = ${projectId}
          AND ptr.record_date = ${date}
          AND ptr.user_id = ${userId}
        GROUP BY ptr.user_id, ptr.user_name
      `);
      return mapWorkerRows(result);
    }

    const result = await db.execute(sql`
      SELECT
        ptr.user_id as user_id,
        COALESCE(ptr.user_name, CONCAT('Worker#', ptr.user_id)) as user_name,
        COALESCE(SUM(ptr.duration), 0) as total_hours
      FROM production_time_records ptr
      WHERE ptr.project_id = ${projectId}
        AND ptr.record_date = ${date}
      GROUP BY ptr.user_id, ptr.user_name
    `);
    return mapWorkerRows(result);
  } catch {
    return [];
  }
}

/**
 * Map raw query result to WorkerHoursRow array.
 */
function mapWorkerRows(result: any): WorkerHoursRow[] {
  const rows = result?.rows ?? (Array.isArray(result) ? result[0] ?? [] : []);
  if (!Array.isArray(rows)) return [];

  return rows.map((row: any) => ({
    userId: Number(row.user_id),
    userName: String(row.user_name || `Worker#${row.user_id}`),
    totalHours: Number(row.total_hours || 0),
  }));
}

// ============================================================
// Recommendations Generator
// ============================================================

function generateRecommendations(
  matched: WorkerTimeRecord[],
  discrepancies: Discrepancy[],
  totalUwb: number,
  totalBom: number,
  totalProd: number
): string[] {
  const recommendations: string[] = [];

  if (discrepancies.length === 0) {
    recommendations.push("All time records are consistent across the three sources. No action required.");
    return recommendations;
  }

  const discrepancyRate = discrepancies.length / (matched.length + discrepancies.length);

  if (discrepancyRate > 0.5) {
    recommendations.push(
      "More than 50% of workers have discrepancies. Consider reviewing the time tracking processes across all three systems."
    );
  }

  // Check for missing sources
  const missingUwb = discrepancies.filter(d => d.uwbHours === null);
  const missingBom = discrepancies.filter(d => d.bomStepHours === null);
  const missingProd = discrepancies.filter(d => d.productionHours === null);

  if (missingUwb.length > 0) {
    recommendations.push(
      `${missingUwb.length} worker(s) have no UWB tracking data. Verify that UWB tags are properly assigned and active.`
    );
  }

  if (missingBom.length > 0) {
    recommendations.push(
      `${missingBom.length} worker(s) have no BOM step time logs. Ensure workers are using the clock-in/out system for their assigned steps.`
    );
  }

  if (missingProd.length > 0) {
    recommendations.push(
      `${missingProd.length} worker(s) have no production execution time records. Check if production time records are being submitted.`
    );
  }

  // Check systematic bias
  if (totalUwb > 0 && totalBom > 0) {
    const uwbBomDiff = ((totalUwb - totalBom) / totalBom) * 100;
    if (Math.abs(uwbBomDiff) > 20) {
      const direction = uwbBomDiff > 0 ? "higher" : "lower";
      recommendations.push(
        `UWB total hours are ${Math.abs(Math.round(uwbBomDiff))}% ${direction} than BOM step hours. This may indicate a systematic tracking difference.`
      );
    }
  }

  // Large individual discrepancies
  const largeDiscrepancies = discrepancies.filter(d => d.maxDifferenceMinutes > 120);
  if (largeDiscrepancies.length > 0) {
    recommendations.push(
      `${largeDiscrepancies.length} worker(s) have discrepancies exceeding 2 hours. These should be prioritized for review.`
    );
  }

  return recommendations;
}

// ============================================================
// Persistence
// ============================================================

/**
 * Persist discrepancies to database for tracking and resolution.
 */
async function persistDiscrepancies(
  db: NonNullable<Awaited<ReturnType<typeof requireDb>>>,
  discrepancies: Discrepancy[]
): Promise<void> {
  for (const disc of discrepancies) {
    try {
      // Upsert: if a discrepancy for this worker/date/project already exists, skip
      await db.execute(sql`
        INSERT INTO time_reconciliation_discrepancies
        (id, user_id, user_name, record_date, project_id,
         uwb_hours, bom_step_hours, production_hours,
         max_difference_minutes, status, created_at)
        VALUES (
          ${disc.id}, ${disc.userId}, ${disc.userName}, ${disc.date}, ${disc.projectId},
          ${disc.uwbHours}, ${disc.bomStepHours}, ${disc.productionHours},
          ${disc.maxDifferenceMinutes}, ${disc.status}, NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `);
    } catch {
      // Table may not exist yet; continue silently
    }
  }
}

// ============================================================
// Discrepancy Query and Resolution
// ============================================================

/**
 * Get unresolved discrepancies for a project within a date range.
 */
export async function getDiscrepancies(params: {
  projectId: number;
  dateRange: { start: string; end: string };
}): Promise<Discrepancy[]> {
  const db = await requireDb();
  const { projectId, dateRange } = params;

  try {
    const result = await db.execute(sql`
      SELECT * FROM time_reconciliation_discrepancies
      WHERE project_id = ${projectId}
        AND record_date >= ${dateRange.start}
        AND record_date <= ${dateRange.end}
        AND status = 'unresolved'
      ORDER BY record_date DESC, max_difference_minutes DESC
    `);

    const rows = result?.rows ?? (Array.isArray(result) ? result[0] ?? [] : []);
    if (!Array.isArray(rows)) return [];

    return rows.map((row: any) => ({
      id: row.id,
      userId: Number(row.user_id),
      userName: String(row.user_name),
      date: String(row.record_date),
      projectId: Number(row.project_id),
      uwbHours: row.uwb_hours !== null ? Number(row.uwb_hours) : null,
      bomStepHours: row.bom_step_hours !== null ? Number(row.bom_step_hours) : null,
      productionHours: row.production_hours !== null ? Number(row.production_hours) : null,
      maxDifferenceMinutes: Number(row.max_difference_minutes),
      status: row.status as Discrepancy['status'],
      resolution: row.resolution || null,
      adjustedHours: row.adjusted_hours !== null ? Number(row.adjusted_hours) : null,
      resolvedBy: row.resolved_by !== null ? Number(row.resolved_by) : null,
      resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
      createdAt: String(row.created_at),
    }));
  } catch {
    return [];
  }
}

/**
 * Resolve a discrepancy by marking it with a resolution note and adjusted hours.
 */
export async function resolveDiscrepancy(params: {
  discrepancyId: string;
  resolution: string;
  adjustedHours: number;
  resolvedBy: number;
}): Promise<{ success: boolean; message: string }> {
  const db = await requireDb();
  const { discrepancyId, resolution, adjustedHours, resolvedBy } = params;

  try {
    await db.execute(sql`
      UPDATE time_reconciliation_discrepancies
      SET status = 'resolved',
          resolution = ${resolution},
          adjusted_hours = ${adjustedHours},
          resolved_by = ${resolvedBy},
          resolved_at = NOW()
      WHERE id = ${discrepancyId}
    `);

    return { success: true, message: 'Discrepancy resolved successfully' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Failed to resolve discrepancy: ${message}` };
  }
}
