/**
 * 智慧排程工作台 — Service Layer
 *
 * Groups:
 *   A — BOM工时计算 (R1)
 *   B — 前置任务与物料联动 (R5)
 *   C — 历史基准 (R3)
 *   D — 排程集成 (R2, R4)
 */
import { requireDb } from "../db";
import { eq, desc, and, sql, count, inArray, isNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import {
  schedulingBomWorkHours,
  schedulingHistoricalBenchmarks,
  schedulingMilestoneCheckpoints,
} from "../../drizzle/smart-scheduling-schema";
import {
  processDefinitions,
  projectProcessInstances,
  sopTemplates,
} from "../../drizzle/schema";
import { bomItems } from "../../drizzle/bom-schema";
import { stepMaterials } from "../../drizzle/schema";
import { purchaseOrders } from "../../drizzle/procurement-schema";
import {
  T_TO_M_MAPPING,
  M_TO_T_MAPPING,
} from "../production-steps/processSteps.service";
import { SchedulingEngine } from "./scheduling.service";
import type {
  SchedulingInput,
  SchedulingTask,
  SchedulingResource,
  SchedulingConstraint,
  SchedulingResult,
} from "./scheduling.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("smart-production-scheduling");

// ============================================================
// Type Definitions
// ============================================================

export interface WorkHourGenerateInput {
  projectId: number;
  processCode?: string; // optional: specific T step, or all
}

export interface WorkHourAdjustInput {
  id: number;
  adjustedMinutes: number;
  adjustReason: string;
  adjustedBy: number;
}

export interface PredecessorStatus {
  id: number;
  stepName: string;
  status: string;
  completionPct: number;
  blocking: boolean;
}

export interface MaterialReadiness {
  materialCode: string;
  materialName: string;
  requiredQty: number;
  inStockQty: number;
  poNumber: string | null;
  poDate: string | null;
  expectedDelivery: string | null;
  actualDelivery: string | null;
  poStatus: string | null;
  shortage: number;
  earliestAvailable: string | null;
}

export interface FeasibilityResult {
  feasible: boolean;
  blockers: Array<{ type: string; description: string }>;
}

export interface MilestoneRisk {
  milestoneCode: string;
  milestoneName: string;
  status: string;
  targetDate: string | null;
  actualDate: string | null;
  historicalAvgDays: number | null;
  historicalP80Days: number | null;
  currentDays: number | null;
  riskLevel: "on_track" | "at_risk" | "delayed";
  riskReason: string | null;
}

// ============================================================
// Group A — BOM工时计算 (R1)
// ============================================================

/**
 * 从BOM自动生成工时分解
 */
export async function generateWorkHoursFromBom(input: WorkHourGenerateInput) {
  const db = await requireDb();
  const { projectId, processCode } = input;

  // Get process codes to generate for
  const processCodes = processCode
    ? [processCode]
    : Array.from({ length: 15 }, (_, i) => `T${i + 1}`);

  const generated: Array<{ processCode: string; count: number }> = [];

  for (const pc of processCodes) {
    // Find BOM items for this process code
    const items = await db
      .select()
      .from(bomItems)
      .where(eq(bomItems.processCode, pc))
      .limit(500);

    if (items.length === 0) continue;

    // Get SOP template for this process
    const [sopTemplate] = await db
      .select()
      .from(sopTemplates)
      .where(eq(sopTemplates.processCode, pc))
      .limit(1);

    const sopMinutes = sopTemplate?.estimatedDurationMinutes ?? 60;

    // Get process definition for standard duration
    const [procDef] = await db
      .select()
      .from(processDefinitions)
      .where(eq(processDefinitions.code, pc))
      .limit(1);

    // Check for existing records to avoid duplicates
    const existing = await db
      .select({ count: count() })
      .from(schedulingBomWorkHours)
      .where(
        and(
          eq(schedulingBomWorkHours.projectId, projectId),
          eq(schedulingBomWorkHours.processCode, pc),
        ),
      );

    if (Number(existing[0]?.count ?? 0) > 0) continue;

    // Generate work hour entries for each BOM item
    let sortIdx = 0;
    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const baseMinutes = Math.round(sopMinutes * qty);

      await db.insert(schedulingBomWorkHours).values({
        projectId,
        processCode: pc,
        assemblyDescription: `${item.materialName} (${item.materialCode})`,
        bomItemIds: [item.id],
        baseTheoryMinutes: baseMinutes,
        difficultyFactor: "1.0",
        adjustedMinutes: baseMinutes,
        skillLevelRequired: procDef?.requiredCapabilityLevel ?? "L2",
        workerCount: 1,
        sortOrder: sortIdx++,
        status: "pending",
      });
    }

    generated.push({ processCode: pc, count: items.length });
  }

  log.info({ projectId, generated }, "Generated BOM work hours");
  return { projectId, generated };
}

/**
 * 从SOP模板自动计算基准工时
 */
export async function autoCalculateFromSOP(projectId: number, processCode: string) {
  const db = await requireDb();

  const [sopTemplate] = await db
    .select()
    .from(sopTemplates)
    .where(eq(sopTemplates.processCode, processCode))
    .limit(1);

  if (!sopTemplate) {
    return { updated: 0, message: `No SOP template found for ${processCode}` };
  }

  const sopMinutes = sopTemplate.estimatedDurationMinutes ?? 60;

  const rows = await db
    .select()
    .from(schedulingBomWorkHours)
    .where(
      and(
        eq(schedulingBomWorkHours.projectId, projectId),
        eq(schedulingBomWorkHours.processCode, processCode),
      ),
    )
    .limit(500);

  let updated = 0;
  for (const row of rows) {
    const factor = Number(row.difficultyFactor) || 1.0;
    const base = Math.round(sopMinutes * factor);
    await db
      .update(schedulingBomWorkHours)
      .set({
        baseTheoryMinutes: base,
        adjustedMinutes: base,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schedulingBomWorkHours.id, row.id));
    updated++;
  }

  return { updated, sopMinutes };
}

/**
 * 从历史项目导入工时
 */
export async function importHistoricalWorkHours(
  targetProjectId: number,
  sourceProjectId: number,
) {
  const db = await requireDb();

  const sourceRows = await db
    .select()
    .from(schedulingBomWorkHours)
    .where(
      and(
        eq(schedulingBomWorkHours.projectId, sourceProjectId),
        eq(schedulingBomWorkHours.status, "confirmed"),
      ),
    )
    .limit(500);

  if (sourceRows.length === 0) {
    return { imported: 0, message: "No confirmed records in source project" };
  }

  let imported = 0;
  for (const row of sourceRows) {
    await db.insert(schedulingBomWorkHours).values({
      projectId: targetProjectId,
      processCode: row.processCode,
      bomStepId: row.bomStepId,
      assemblyDescription: row.assemblyDescription,
      bomItemIds: row.bomItemIds,
      baseTheoryMinutes: row.baseTheoryMinutes,
      difficultyFactor: row.difficultyFactor,
      adjustedMinutes: row.adjustedMinutes,
      adjustReason: `Imported from project #${sourceProjectId}`,
      predecessorStepIds: row.predecessorStepIds,
      toolsRequired: row.toolsRequired,
      equipmentRequired: row.equipmentRequired,
      skillLevelRequired: row.skillLevelRequired,
      workerCount: row.workerCount,
      sortOrder: row.sortOrder,
      status: "pending",
    });
    imported++;
  }

  log.info({ targetProjectId, sourceProjectId, imported }, "Imported historical work hours");
  return { imported };
}

// ============================================================
// Group B — 前置任务与物料联动 (R5)
// ============================================================

/**
 * 解析前置任务完成状态
 */
export async function resolveTaskPredecessors(
  workHourId: number,
): Promise<PredecessorStatus[]> {
  const db = await requireDb();

  const [row] = await db
    .select()
    .from(schedulingBomWorkHours)
    .where(eq(schedulingBomWorkHours.id, workHourId))
    .limit(1);

  if (!row || !row.predecessorStepIds || !Array.isArray(row.predecessorStepIds)) {
    return [];
  }

  const predIds = row.predecessorStepIds as number[];
  if (predIds.length === 0) return [];

  const predecessors = await db
    .select()
    .from(schedulingBomWorkHours)
    .where(inArray(schedulingBomWorkHours.id, predIds))
    .limit(100);

  return predecessors.map((p) => ({
    id: p.id,
    stepName: p.assemblyDescription ?? `Step #${p.id}`,
    status: p.status,
    completionPct:
      p.status === "completed" ? 100 : p.status === "in_progress" ? 50 : 0,
    blocking: p.status !== "completed",
  }));
}

/**
 * 物料齐套 + PO到货联查
 */
export async function resolveMaterialReadinessWithPO(
  bomStepId: number,
): Promise<MaterialReadiness[]> {
  const db = await requireDb();

  const materials = await db
    .select({
      materialCode: stepMaterials.materialCode,
      materialName: stepMaterials.materialName,
      requiredQty: stepMaterials.requiredQty,
      availableQty: stepMaterials.availableQty,
    })
    .from(stepMaterials)
    .where(eq(stepMaterials.bomStepId, bomStepId))
    .limit(200);

  const results: MaterialReadiness[] = [];

  for (const mat of materials) {
    // Find matching PO
    const [po] = await db
      .select({
        poNumber: purchaseOrders.poNumber,
        poDate: purchaseOrders.poDate,
        expectedDelivery: purchaseOrders.expectedDeliveryDate,
        actualDelivery: purchaseOrders.actualDeliveryDate,
        poStatus: purchaseOrders.status,
      })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.materialCode, mat.materialCode),
          sql`${purchaseOrders.status} NOT IN ('cancelled')`,
        ),
      )
      .orderBy(desc(purchaseOrders.expectedDeliveryDate))
      .limit(1);

    const required = Number(mat.requiredQty) || 0;
    const inStock = Number(mat.availableQty) || 0;
    const shortage = Math.max(0, required - inStock);

    results.push({
      materialCode: mat.materialCode,
      materialName: mat.materialName,
      requiredQty: required,
      inStockQty: inStock,
      poNumber: po?.poNumber ?? null,
      poDate: po?.poDate ?? null,
      expectedDelivery: po?.expectedDelivery ?? null,
      actualDelivery: po?.actualDelivery ?? null,
      poStatus: po?.poStatus ?? null,
      shortage,
      earliestAvailable: shortage === 0
        ? null
        : (po?.expectedDelivery ?? null),
    });
  }

  return results;
}

/**
 * 综合可行性验证
 */
export async function validateScheduleFeasibility(
  projectId: number,
  processCode: string,
): Promise<FeasibilityResult> {
  const db = await requireDb();
  const blockers: Array<{ type: string; description: string }> = [];

  // Check work hours are confirmed
  const workHours = await db
    .select()
    .from(schedulingBomWorkHours)
    .where(
      and(
        eq(schedulingBomWorkHours.projectId, projectId),
        eq(schedulingBomWorkHours.processCode, processCode),
      ),
    )
    .limit(500);

  const unconfirmed = workHours.filter((w) => w.status === "pending");
  if (unconfirmed.length > 0) {
    blockers.push({
      type: "unconfirmed_hours",
      description: `${unconfirmed.length} work hour entries not yet confirmed for ${processCode}`,
    });
  }

  // Check predecessors
  for (const wh of workHours) {
    if (wh.predecessorStepIds && Array.isArray(wh.predecessorStepIds)) {
      const preds = await resolveTaskPredecessors(wh.id);
      const blocking = preds.filter((p) => p.blocking);
      if (blocking.length > 0) {
        blockers.push({
          type: "predecessor_incomplete",
          description: `${blocking.length} predecessor tasks not completed for "${wh.assemblyDescription}"`,
        });
      }
    }
  }

  // Check material readiness
  const notReady = workHours.filter((w) => !w.materialReady);
  if (notReady.length > 0) {
    blockers.push({
      type: "material_not_ready",
      description: `${notReady.length} work items have materials not ready for ${processCode}`,
    });
  }

  return { feasible: blockers.length === 0, blockers };
}

// ============================================================
// Group C — 历史基准 (R3)
// ============================================================

/**
 * 计算历史基准统计
 */
export async function computeHistoricalBenchmarks(
  processCode?: string,
  productCategory?: string,
) {
  const db = await requireDb();

  // Get completed process instances
  const conditions: SQL[] = [
    sql`${projectProcessInstances.actualEndDate} IS NOT NULL`,
  ];
  if (processCode) {
    conditions.push(eq(projectProcessInstances.processCode, processCode));
  }

  const instances = await db
    .select({
      processCode: projectProcessInstances.processCode,
      actualDurationHours: projectProcessInstances.actualDurationHours,
      projectId: projectProcessInstances.projectId,
    })
    .from(projectProcessInstances)
    .where(and(...conditions))
    .limit(1000);

  // Group by processCode
  const grouped: Record<
    string,
    Array<{ hours: number; projectId: number }>
  > = {};
  for (const inst of instances) {
    const hours = Number(inst.actualDurationHours) || 0;
    if (hours <= 0) continue;
    const key = inst.processCode;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ hours, projectId: inst.projectId });
  }

  const category = productCategory ?? "通用";
  const results: Array<{
    processCode: string;
    avgHours: number;
    sampleCount: number;
  }> = [];

  for (const [pc, entries] of Object.entries(grouped)) {
    const hours = entries.map((e) => e.hours).sort((a, b) => a - b);
    const n = hours.length;
    const avg = hours.reduce((s, h) => s + h, 0) / n;
    const min = hours[0];
    const max = hours[n - 1];
    const p50 = hours[Math.floor(n * 0.5)];
    const p80 = hours[Math.floor(n * 0.8)];

    // Build source projects list
    const sourceProjects = entries.slice(0, 10).map((e) => ({
      projectCode: `GRT${e.projectId}`,
      projectName: `Project #${e.projectId}`,
      actualHours: e.hours,
      completedDate: new Date().toISOString().split("T")[0],
    }));

    // Upsert benchmark
    const [existing] = await db
      .select()
      .from(schedulingHistoricalBenchmarks)
      .where(
        and(
          eq(schedulingHistoricalBenchmarks.processCode, pc),
          eq(schedulingHistoricalBenchmarks.productCategory, category),
        ),
      )
      .limit(1);

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(schedulingHistoricalBenchmarks)
        .set({
          avgHours: avg.toFixed(2),
          minHours: min.toFixed(2),
          maxHours: max.toFixed(2),
          p50Hours: p50.toFixed(2),
          p80Hours: p80.toFixed(2),
          sampleCount: n,
          sourceProjects,
          lastComputedAt: now,
        })
        .where(eq(schedulingHistoricalBenchmarks.id, existing.id));
    } else {
      await db.insert(schedulingHistoricalBenchmarks).values({
        processCode: pc,
        productCategory: category,
        avgHours: avg.toFixed(2),
        minHours: min.toFixed(2),
        maxHours: max.toFixed(2),
        p50Hours: p50.toFixed(2),
        p80Hours: p80.toFixed(2),
        sampleCount: n,
        sourceProjects,
        lastComputedAt: now,
      });
    }

    results.push({ processCode: pc, avgHours: avg, sampleCount: n });
  }

  log.info({ results: results.length }, "Computed historical benchmarks");
  return { computed: results.length, results };
}

/**
 * 生成里程碑目标
 */
export async function generateMilestoneTargets(projectId: number) {
  const db = await requireDb();

  // Get project start date from first process instance
  const [firstInstance] = await db
    .select({ plannedStartDate: projectProcessInstances.plannedStartDate })
    .from(projectProcessInstances)
    .where(eq(projectProcessInstances.projectId, projectId))
    .orderBy(projectProcessInstances.plannedStartDate)
    .limit(1);

  const projectStart =
    firstInstance?.plannedStartDate ?? new Date().toISOString();
  let cumulativeDays = 0;

  const milestones = [
    "M0", "M1", "M2", "M3", "M4", "M5", "M6",
    "M7", "M8", "M9", "M10", "M11", "M12",
  ];
  const milestoneNames: Record<string, string> = {
    M0: "立项", M1: "需求确认", M2: "方案评审",
    M3: "设计确认", M4: "采购阶段", M5: "生产准备",
    M6: "生产阶段", M7: "调试阶段", M8: "FAT验收",
    M9: "发货", M10: "安装阶段", M11: "SAT验收",
    M12: "终验收",
  };

  const generated: string[] = [];

  for (const mc of milestones) {
    const tCodes = M_TO_T_MAPPING[mc] ?? [];
    const sourceDescParts: string[] = [];
    let totalAvgDays = 0;
    let minDays = 0;
    let maxDays = 0;

    for (const tc of tCodes) {
      const [bench] = await db
        .select()
        .from(schedulingHistoricalBenchmarks)
        .where(eq(schedulingHistoricalBenchmarks.processCode, tc))
        .limit(1);

      if (bench) {
        const avgH = Number(bench.avgHours) || 0;
        const days = avgH / 8; // 8-hour workday
        totalAvgDays += days;
        minDays += (Number(bench.minHours) || 0) / 8;
        maxDays += (Number(bench.maxHours) || 0) / 8;

        const projectRefs = (bench.sourceProjects as Array<{ projectCode: string }> | null)
          ?.map((sp) => sp.projectCode)
          .slice(0, 3)
          .join("/") ?? "N/A";
        sourceDescParts.push(
          `${tc}平均${days.toFixed(1)}天(来源: ${projectRefs})`,
        );
      }
    }

    cumulativeDays += totalAvgDays;
    const targetDate = new Date(projectStart);
    targetDate.setDate(targetDate.getDate() + Math.round(cumulativeDays));

    const baselineSource =
      sourceDescParts.length > 0
        ? `基于历史均值: ${sourceDescParts.join("; ")}`
        : "无历史数据，使用默认估算";

    // Check existing
    const [existing] = await db
      .select()
      .from(schedulingMilestoneCheckpoints)
      .where(
        and(
          eq(schedulingMilestoneCheckpoints.projectId, projectId),
          eq(schedulingMilestoneCheckpoints.milestoneCode, mc),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(schedulingMilestoneCheckpoints)
        .set({
          targetDate: targetDate.toISOString().split("T")[0],
          baselineDate: targetDate.toISOString().split("T")[0],
          baselineSource,
          historicalAvgDays: totalAvgDays.toFixed(2),
          historicalMinDays: minDays.toFixed(2),
          historicalMaxDays: maxDays.toFixed(2),
          relatedProcessCodes: tCodes,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schedulingMilestoneCheckpoints.id, existing.id));
    } else {
      await db.insert(schedulingMilestoneCheckpoints).values({
        projectId,
        milestoneCode: mc,
        milestoneName: milestoneNames[mc] ?? mc,
        targetDate: targetDate.toISOString().split("T")[0],
        baselineDate: targetDate.toISOString().split("T")[0],
        baselineSource,
        historicalAvgDays: totalAvgDays.toFixed(2),
        historicalMinDays: minDays.toFixed(2),
        historicalMaxDays: maxDays.toFixed(2),
        status: "pending",
        criticalPath: tCodes.length > 0,
        relatedProcessCodes: tCodes,
      });
    }

    generated.push(mc);
  }

  log.info({ projectId, milestones: generated.length }, "Generated milestone targets");
  return { projectId, generated };
}

/**
 * 里程碑风险评估
 */
export async function assessMilestoneRisk(projectId: number): Promise<MilestoneRisk[]> {
  const db = await requireDb();

  const checkpoints = await db
    .select()
    .from(schedulingMilestoneCheckpoints)
    .where(eq(schedulingMilestoneCheckpoints.projectId, projectId))
    .orderBy(schedulingMilestoneCheckpoints.milestoneCode)
    .limit(20);

  const risks: MilestoneRisk[] = [];

  for (const cp of checkpoints) {
    // Get p80 benchmark for related process codes
    const relatedCodes = (cp.relatedProcessCodes as string[] | null) ?? [];
    let totalP80Days = 0;

    for (const tc of relatedCodes) {
      const [bench] = await db
        .select()
        .from(schedulingHistoricalBenchmarks)
        .where(eq(schedulingHistoricalBenchmarks.processCode, tc))
        .limit(1);
      if (bench) {
        totalP80Days += (Number(bench.p80Hours) || 0) / 8;
      }
    }

    // Calculate current days elapsed
    let currentDays: number | null = null;
    let riskLevel: "on_track" | "at_risk" | "delayed" = "on_track";
    let riskReason: string | null = null;

    const avgDays = Number(cp.historicalAvgDays) || 0;
    const maxDays = Number(cp.historicalMaxDays) || 0;

    if (cp.actualDate) {
      riskLevel = "on_track"; // completed
    } else if (cp.targetDate) {
      const now = new Date();
      const target = new Date(cp.targetDate);
      const diff = Math.ceil(
        (now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diff > 0) {
        riskLevel = "delayed";
        riskReason = `已超过目标日期${diff}天`;
        currentDays = avgDays + diff;
      } else if (totalP80Days > 0 && avgDays > totalP80Days) {
        riskLevel = "at_risk";
        riskReason = `当前进度超过历史P80阈值(${totalP80Days.toFixed(1)}天)`;
        currentDays = avgDays;
      }
    }

    risks.push({
      milestoneCode: cp.milestoneCode,
      milestoneName: cp.milestoneName ?? cp.milestoneCode,
      status: cp.status,
      targetDate: cp.targetDate,
      actualDate: cp.actualDate,
      historicalAvgDays: avgDays || null,
      historicalP80Days: totalP80Days || null,
      currentDays,
      riskLevel,
      riskReason,
    });

    // Update status if needed
    if (cp.status !== "completed" && riskLevel !== "on_track") {
      await db
        .update(schedulingMilestoneCheckpoints)
        .set({ status: riskLevel, updatedAt: new Date().toISOString() })
        .where(eq(schedulingMilestoneCheckpoints.id, cp.id));
    }
  }

  return risks;
}

// ============================================================
// Group D — 排程集成 (R2, R4)
// ============================================================

/**
 * 构建排程输入
 */
export async function buildProjectScheduleInput(
  projectId: number,
  config?: {
    delayWeight?: number;
    changeoverWeight?: number;
    optimizationLevel?: "fast" | "balanced" | "optimal";
    maxTimeSeconds?: number;
  },
): Promise<{ input: SchedulingInput; result: SchedulingResult }> {
  const db = await requireDb();

  // Collect confirmed work hours as tasks
  const workHours = await db
    .select()
    .from(schedulingBomWorkHours)
    .where(
      and(
        eq(schedulingBomWorkHours.projectId, projectId),
        sql`${schedulingBomWorkHours.status} IN ('confirmed', 'scheduled')`,
      ),
    )
    .orderBy(schedulingBomWorkHours.processCode, schedulingBomWorkHours.sortOrder)
    .limit(500);

  const tasks: SchedulingTask[] = workHours.map((wh) => ({
    id: String(wh.id),
    projectId: String(projectId),
    buCode: "BU5", // default BU
    taskName: wh.assemblyDescription ?? `${wh.processCode} Step`,
    taskType: "assembly" as const,
    estimatedHours: (wh.adjustedMinutes ?? wh.baseTheoryMinutes ?? 60) / 60,
    priority: 5,
    earliestStart: wh.materialEarliestAvailable
      ? new Date(wh.materialEarliestAvailable)
      : undefined,
    predecessorTasks: ((wh.predecessorStepIds as number[] | null) ?? []).map(String),
    requiredSkills: wh.skillLevelRequired ? [wh.skillLevelRequired] : [],
    requiredResources: wh.equipmentRequired ? [wh.equipmentRequired] : [],
    status: "pending" as const,
  }));

  if (tasks.length === 0) {
    return {
      input: {
        tasks: [],
        resources: [],
        constraints: [],
        objectiveWeights: { delayWeight: 1, changeoverWeight: 0.5 },
        solverConfig: { maxTimeSeconds: 30, optimizationLevel: "fast" },
        planningHorizon: { startDate: new Date(), endDate: new Date() },
      },
      result: {
        jobId: "",
        scheduledTasks: [],
        totalDelay: 0,
        totalChangeoverCost: 0,
        objectiveValue: 0,
        solveTimeSeconds: 0,
        feasible: false,
        message: "No confirmed work hours to schedule",
      },
    };
  }

  // Build scheduling input
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 180); // 6-month horizon

  const schedulingInput: SchedulingInput = {
    tasks,
    resources: [], // Will be populated from scheduling_resources if available
    constraints: [],
    objectiveWeights: {
      delayWeight: config?.delayWeight ?? 1,
      changeoverWeight: config?.changeoverWeight ?? 0.5,
    },
    solverConfig: {
      maxTimeSeconds: config?.maxTimeSeconds ?? 60,
      optimizationLevel: config?.optimizationLevel ?? "balanced",
    },
    planningHorizon: { startDate: now, endDate: horizon },
  };

  // Run solver
  const engine = new SchedulingEngine(schedulingInput);
  const result = engine.solve();

  log.info(
    { projectId, taskCount: tasks.length, feasible: result.feasible },
    "Built and solved project schedule",
  );

  return { input: schedulingInput, result };
}

/**
 * 排程结果写回项目
 */
export async function applyScheduleToProject(
  projectId: number,
  scheduledTasks: Array<{ taskId: string; scheduledStart: Date; scheduledEnd: Date }>,
) {
  const db = await requireDb();
  let applied = 0;

  for (const task of scheduledTasks) {
    const workHourId = Number(task.taskId);
    if (isNaN(workHourId)) continue;

    // Get the work hour record to find process code
    const [wh] = await db
      .select()
      .from(schedulingBomWorkHours)
      .where(eq(schedulingBomWorkHours.id, workHourId))
      .limit(1);

    if (!wh) continue;

    // Update status
    await db
      .update(schedulingBomWorkHours)
      .set({
        status: "scheduled",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schedulingBomWorkHours.id, workHourId));

    // Update project process instance if exists
    const [instance] = await db
      .select()
      .from(projectProcessInstances)
      .where(
        and(
          eq(projectProcessInstances.projectId, projectId),
          eq(projectProcessInstances.processCode, wh.processCode),
        ),
      )
      .limit(1);

    if (instance) {
      await db
        .update(projectProcessInstances)
        .set({
          plannedStartDate: task.scheduledStart,
          plannedEndDate: task.scheduledEnd,
          updatedAt: new Date(),
        })
        .where(eq(projectProcessInstances.id, instance.id));
      applied++;
    }
  }

  log.info({ projectId, applied }, "Applied schedule to project");
  return { applied };
}
