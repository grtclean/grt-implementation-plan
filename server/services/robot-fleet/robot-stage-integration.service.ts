/**
 * Robot ↔ Stage-Gate Integration Service
 *
 * Orchestrates robot assignments, versioned programs, execution logging,
 * and brand-specific M8 commissioning checklists for the M0-M12 lifecycle.
 */

import { eq, and, desc } from "drizzle-orm";
import { requireDb } from "../../db";
import {
  robotStageAssignments,
  equipmentPrograms,
  programExecutionLogs,
  stageCommissioningChecklists,
} from "../../../drizzle/robot-stage-integration-schema";
import { robotFleetRegistry } from "../../../drizzle/robot-fleet-schema";
import { createChildLogger } from "../../lib/logger";
import type { RobotBrand } from "./types";

const log = createChildLogger("robot-stage-integration");

// ──────────────────────────────────────────────────────────────
// Brand-specific M8 commissioning checklist templates
// ──────────────────────────────────────────────────────────────

const COMMISSIONING_TEMPLATES: Record<string, Array<{
  checkItem: string;
  category: string;
  isMandatory: boolean;
  targetValue?: string;
  unit?: string;
}>> = {
  kuka: [
    { checkItem: "KRC4 controller firmware version check", category: "controller", isMandatory: true },
    { checkItem: "SafeOperation module configuration", category: "safety", isMandatory: true },
    { checkItem: "RSI real-time interface latency test", category: "comms", isMandatory: true, targetValue: "<4", unit: "ms" },
    { checkItem: "Mastering (zero-point calibration) verification", category: "calibration", isMandatory: true, targetValue: "±0.05", unit: "mm" },
    { checkItem: "Brake test all axes", category: "safety", isMandatory: true },
    { checkItem: "External axis configuration (if applicable)", category: "controller", isMandatory: false },
    { checkItem: "KUKA.WorkVisual project backup", category: "controller", isMandatory: true },
  ],
  fanuc: [
    { checkItem: "R-30iB controller boot diagnostics", category: "controller", isMandatory: true },
    { checkItem: "DCS (Dual Check Safety) zone setup", category: "safety", isMandatory: true },
    { checkItem: "PCDK socket communication test", category: "comms", isMandatory: true, targetValue: "<5", unit: "ms" },
    { checkItem: "Zero-position calibration (mastering)", category: "calibration", isMandatory: true, targetValue: "±0.04", unit: "mm" },
    { checkItem: "iRVision calibration (if applicable)", category: "calibration", isMandatory: false },
    { checkItem: "Collision detection sensitivity tuning", category: "safety", isMandatory: true },
  ],
  abb: [
    { checkItem: "OmniCore/IRC5 controller initialization", category: "controller", isMandatory: true },
    { checkItem: "SafeMove Pro zone configuration", category: "safety", isMandatory: true },
    { checkItem: "EGM (Externally Guided Motion) test", category: "comms", isMandatory: true, targetValue: "<4", unit: "ms" },
    { checkItem: "Absolute accuracy calibration", category: "calibration", isMandatory: true, targetValue: "±0.05", unit: "mm" },
    { checkItem: "RobotStudio online backup", category: "controller", isMandatory: true },
  ],
  staubli: [
    { checkItem: "CS9 controller startup validation", category: "controller", isMandatory: true },
    { checkItem: "Safe torque off (STO) circuit test", category: "safety", isMandatory: true },
    { checkItem: "uniVAL PLC communication test", category: "comms", isMandatory: true, targetValue: "<3", unit: "ms" },
    { checkItem: "Tool center point (TCP) calibration", category: "calibration", isMandatory: true, targetValue: "±0.03", unit: "mm" },
  ],
  generic: [
    { checkItem: "Emergency stop chain verification", category: "safety", isMandatory: true },
    { checkItem: "Network connectivity test (ping gateway)", category: "comms", isMandatory: true },
    { checkItem: "Repeatability validation at home position", category: "calibration", isMandatory: true },
  ],
};

// ──────────────────────────────────────────────────────────────
// Assignment functions
// ──────────────────────────────────────────────────────────────

export async function assignRobotToStage(data: {
  projectId: number;
  robotId: number;
  stageCode: string;
  role?: "primary" | "backup" | "support";
  assignedBy?: string;
  notes?: string;
}) {
  const db = await requireDb();
  const [result] = await db
    .insert(robotStageAssignments)
    .values({
      projectId: data.projectId,
      robotId: data.robotId,
      stageCode: data.stageCode,
      role: data.role ?? "primary",
      assignedBy: data.assignedBy,
      notes: data.notes,
    })
    .returning();
  log.info({ projectId: data.projectId, robotId: data.robotId, stage: data.stageCode }, "Robot assigned to stage");
  return result;
}

export async function getStageAssignments(projectId: number, stageCode: string) {
  const db = await requireDb();
  return db
    .select()
    .from(robotStageAssignments)
    .where(and(
      eq(robotStageAssignments.projectId, projectId),
      eq(robotStageAssignments.stageCode, stageCode),
    ))
    .orderBy(robotStageAssignments.role)
    .limit(100);
}

export async function getProjectAssignments(projectId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(robotStageAssignments)
    .where(eq(robotStageAssignments.projectId, projectId))
    .orderBy(robotStageAssignments.stageCode)
    .limit(500);
}

export async function releaseRobotFromStage(assignmentId: number) {
  const db = await requireDb();
  const [result] = await db
    .update(robotStageAssignments)
    .set({ status: "released", updatedAt: new Date().toISOString() })
    .where(eq(robotStageAssignments.id, assignmentId))
    .returning();
  return result;
}

export async function updateAssignmentStatus(assignmentId: number, status: string) {
  const db = await requireDb();
  const [result] = await db
    .update(robotStageAssignments)
    .set({ status: status as any, updatedAt: new Date().toISOString() })
    .where(eq(robotStageAssignments.id, assignmentId))
    .returning();
  return result;
}

// ──────────────────────────────────────────────────────────────
// Readiness check
// ──────────────────────────────────────────────────────────────

export async function getStageReadiness(projectId: number, stageCode: string) {
  const db = await requireDb();

  // Get assignments for this stage
  const assignments = await db
    .select()
    .from(robotStageAssignments)
    .where(and(
      eq(robotStageAssignments.projectId, projectId),
      eq(robotStageAssignments.stageCode, stageCode),
    ))
    .limit(100);

  if (assignments.length === 0) {
    return { ready: false, reason: "No robots assigned to this stage", assignments: [], issues: ["No robots assigned"] };
  }

  const issues: string[] = [];
  const primaryAssignments = assignments.filter(a => a.role === "primary");

  if (primaryAssignments.length === 0) {
    issues.push("No primary robot assigned");
  }

  // Check each primary robot's status
  for (const assignment of primaryAssignments) {
    const [robot] = await db
      .select()
      .from(robotFleetRegistry)
      .where(eq(robotFleetRegistry.id, assignment.robotId))
      .limit(1);

    if (!robot) {
      issues.push(`Robot ID ${assignment.robotId} not found in registry`);
      continue;
    }

    if (robot.status !== "online") {
      issues.push(`Robot ${robot.robotCode} is ${robot.status} (need online)`);
    }

    if (assignment.status === "planned") {
      issues.push(`Robot ${robot.robotCode} is still in "planned" status (need programmed or active)`);
    }

    // Check for approved programs
    const programs = await db
      .select()
      .from(equipmentPrograms)
      .where(and(
        eq(equipmentPrograms.projectId, projectId),
        eq(equipmentPrograms.robotId, assignment.robotId),
        eq(equipmentPrograms.stageCode, stageCode),
        eq(equipmentPrograms.status, "approved"),
      ))
      .limit(100);

    if (programs.length === 0) {
      issues.push(`Robot ${robot.robotCode} has no approved programs for stage ${stageCode}`);
    }
  }

  return {
    ready: issues.length === 0,
    reason: issues.length === 0 ? "All primary robots online with approved programs" : issues.join("; "),
    assignments,
    issues,
  };
}

// ──────────────────────────────────────────────────────────────
// Program CRUD
// ──────────────────────────────────────────────────────────────

export async function createProgram(data: {
  projectId: number;
  robotId: number;
  stageCode: string;
  programName: string;
  programType?: string;
  programContent?: string;
  storageUrl?: string;
  parameters?: Record<string, unknown>;
  createdBy?: string;
}) {
  const db = await requireDb();
  const [result] = await db
    .insert(equipmentPrograms)
    .values({
      projectId: data.projectId,
      robotId: data.robotId,
      stageCode: data.stageCode,
      programName: data.programName,
      programType: (data.programType as any) ?? "robot_motion",
      version: 1,
      versionString: "V1.0",
      programContent: data.programContent,
      storageUrl: data.storageUrl,
      parameters: data.parameters,
      createdBy: data.createdBy,
    })
    .returning();
  log.info({ programId: result.id, programName: data.programName }, "Program created V1.0");
  return result;
}

export async function iterateProgram(data: {
  previousProgramId: number;
  revisionReason: string;
  programContent?: string;
  storageUrl?: string;
  parameters?: Record<string, unknown>;
  createdBy?: string;
}) {
  const db = await requireDb();

  // Load previous version
  const [prev] = await db
    .select()
    .from(equipmentPrograms)
    .where(eq(equipmentPrograms.id, data.previousProgramId))
    .limit(1);

  if (!prev) {
    throw new Error(`Previous program ${data.previousProgramId} not found`);
  }

  const newVersion = prev.version + 1;
  const major = Math.floor(newVersion / 10) || 1;
  const minor = newVersion % 10;
  const versionString = `V${major}.${minor}`;

  const [result] = await db
    .insert(equipmentPrograms)
    .values({
      projectId: prev.projectId,
      robotId: prev.robotId,
      stageCode: prev.stageCode,
      programName: prev.programName,
      programType: prev.programType,
      version: newVersion,
      versionString,
      previousVersionId: prev.id,
      programContent: data.programContent ?? prev.programContent,
      storageUrl: data.storageUrl ?? prev.storageUrl,
      parameters: data.parameters ?? prev.parameters,
      revisionReason: data.revisionReason,
      createdBy: data.createdBy,
    })
    .returning();

  // Deprecate old version
  await db
    .update(equipmentPrograms)
    .set({ status: "deprecated", updatedAt: new Date().toISOString() })
    .where(eq(equipmentPrograms.id, prev.id));

  log.info({ programId: result.id, previousId: prev.id, version: versionString }, "Program iterated");
  return result;
}

export async function updateProgramStatus(programId: number, status: string, approvedBy?: string) {
  const db = await requireDb();
  const updates: Record<string, any> = {
    status: status as any,
    updatedAt: new Date().toISOString(),
  };
  if (status === "approved" && approvedBy) {
    updates.approvedBy = approvedBy;
    updates.approvedAt = new Date().toISOString();
  }
  const [result] = await db
    .update(equipmentPrograms)
    .set(updates)
    .where(eq(equipmentPrograms.id, programId))
    .returning();
  return result;
}

export async function getStagePrograms(projectId: number, stageCode: string) {
  const db = await requireDb();
  return db
    .select()
    .from(equipmentPrograms)
    .where(and(
      eq(equipmentPrograms.projectId, projectId),
      eq(equipmentPrograms.stageCode, stageCode),
    ))
    .orderBy(desc(equipmentPrograms.version))
    .limit(200);
}

export async function getProgramHistory(programId: number) {
  const db = await requireDb();
  const history: any[] = [];

  let currentId: number | null = programId;
  let guard = 0;
  while (currentId && guard < 50) {
    const [prog] = await db
      .select()
      .from(equipmentPrograms)
      .where(eq(equipmentPrograms.id, currentId))
      .limit(1);
    if (!prog) break;
    history.push(prog);
    currentId = prog.previousVersionId;
    guard++;
  }

  return history;
}

// ──────────────────────────────────────────────────────────────
// Program execution
// ──────────────────────────────────────────────────────────────

export async function executeProgram(data: {
  programId: number;
  robotId: number;
  projectId: number;
  stageCode: string;
  triggerType?: string;
  executedBy?: string;
}) {
  const db = await requireDb();

  // Verify program exists and is approved/deployed
  const [program] = await db
    .select()
    .from(equipmentPrograms)
    .where(eq(equipmentPrograms.id, data.programId))
    .limit(1);

  if (!program) {
    throw new Error(`Program ${data.programId} not found`);
  }

  if (program.status !== "approved" && program.status !== "deployed") {
    throw new Error(`Program ${program.programName} ${program.versionString} is ${program.status}, must be approved or deployed`);
  }

  const startTime = Date.now();

  // Log execution start
  const [execLog] = await db
    .insert(programExecutionLogs)
    .values({
      programId: data.programId,
      robotId: data.robotId,
      projectId: data.projectId,
      stageCode: data.stageCode,
      triggerType: (data.triggerType as any) ?? "manual",
      result: "running",
      executedBy: data.executedBy,
    })
    .returning();

  // Simulate execution (in production, this would call the robot adapter)
  try {
    // Mark program as deployed
    await db
      .update(equipmentPrograms)
      .set({ status: "deployed", updatedAt: new Date().toISOString() })
      .where(eq(equipmentPrograms.id, data.programId));

    const durationMs = Date.now() - startTime;

    // Update log with success
    const [updated] = await db
      .update(programExecutionLogs)
      .set({
        result: "success",
        durationMs,
        metrics: { cycleCount: 1, passCount: 1, failCount: 0 },
      })
      .where(eq(programExecutionLogs.id, execLog.id))
      .returning();

    log.info({ execLogId: execLog.id, programId: data.programId, durationMs }, "Program executed successfully");
    return updated;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await db
      .update(programExecutionLogs)
      .set({
        result: "failed",
        durationMs,
        errorMessage,
      })
      .where(eq(programExecutionLogs.id, execLog.id));

    log.error({ execLogId: execLog.id, programId: data.programId, err: error }, "Program execution failed");
    throw error;
  }
}

export async function getExecutionLogs(data: {
  projectId?: number;
  robotId?: number;
  stageCode?: string;
  programId?: number;
  page?: number;
  pageSize?: number;
}) {
  const db = await requireDb();
  const conditions = [];
  if (data.projectId) conditions.push(eq(programExecutionLogs.projectId, data.projectId));
  if (data.robotId) conditions.push(eq(programExecutionLogs.robotId, data.robotId));
  if (data.stageCode) conditions.push(eq(programExecutionLogs.stageCode, data.stageCode));
  if (data.programId) conditions.push(eq(programExecutionLogs.programId, data.programId));

  const page = data.page ?? 1;
  const pageSize = data.pageSize ?? 20;

  return db
    .select()
    .from(programExecutionLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(programExecutionLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

// ──────────────────────────────────────────────────────────────
// Commissioning checklists
// ──────────────────────────────────────────────────────────────

export async function createCommissioningChecklist(
  projectId: number,
  assignmentId: number,
  robotId: number,
  brand?: string,
) {
  const db = await requireDb();

  // Determine brand from robot registry if not provided
  let robotBrand = brand;
  if (!robotBrand) {
    const [robot] = await db
      .select()
      .from(robotFleetRegistry)
      .where(eq(robotFleetRegistry.id, robotId))
      .limit(1);
    robotBrand = robot?.brand ?? "generic";
  }

  // Get brand-specific template + generic items
  const brandItems = COMMISSIONING_TEMPLATES[robotBrand] ?? [];
  const genericItems = robotBrand !== "generic" ? COMMISSIONING_TEMPLATES.generic ?? [] : [];
  const allItems = [...brandItems, ...genericItems];

  const results = [];
  for (const item of allItems) {
    const [row] = await db
      .insert(stageCommissioningChecklists)
      .values({
        assignmentId,
        robotId,
        projectId,
        checkItem: item.checkItem,
        category: item.category,
        isMandatory: item.isMandatory,
        targetValue: item.targetValue,
        unit: item.unit,
      })
      .returning();
    results.push(row);
  }

  log.info({ projectId, robotId, brand: robotBrand, items: results.length }, "Commissioning checklist created");
  return results;
}

export async function getCommissioningChecklist(projectId: number, robotId?: number) {
  const db = await requireDb();
  const conditions = [eq(stageCommissioningChecklists.projectId, projectId)];
  if (robotId) conditions.push(eq(stageCommissioningChecklists.robotId, robotId));

  return db
    .select()
    .from(stageCommissioningChecklists)
    .where(and(...conditions))
    .orderBy(stageCommissioningChecklists.category, stageCommissioningChecklists.id)
    .limit(500);
}

export async function updateCommissioningItem(
  itemId: number,
  data: {
    status: string;
    measuredValue?: string;
    executionLogId?: number;
    completedBy?: string;
    notes?: string;
  },
) {
  const db = await requireDb();
  const [result] = await db
    .update(stageCommissioningChecklists)
    .set({
      status: data.status,
      measuredValue: data.measuredValue,
      executionLogId: data.executionLogId,
      completedBy: data.completedBy,
      completedAt: data.status === "passed" || data.status === "failed" ? new Date().toISOString() : undefined,
      notes: data.notes,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(stageCommissioningChecklists.id, itemId))
    .returning();
  return result;
}

// ──────────────────────────────────────────────────────────────
// Stage protocol test (test all assigned robots)
// ──────────────────────────────────────────────────────────────

export async function runStageProtocolTest(projectId: number, stageCode: string) {
  const db = await requireDb();
  const assignments = await getStageAssignments(projectId, stageCode);

  const results = [];
  for (const assignment of assignments) {
    const [robot] = await db
      .select()
      .from(robotFleetRegistry)
      .where(eq(robotFleetRegistry.id, assignment.robotId))
      .limit(1);

    if (!robot) {
      results.push({
        robotId: assignment.robotId,
        robotCode: "UNKNOWN",
        result: "failed" as const,
        error: "Robot not found in registry",
      });
      continue;
    }

    // Log the protocol test execution
    const [execLog] = await db
      .insert(programExecutionLogs)
      .values({
        programId: 0, // protocol test, not a specific program
        robotId: assignment.robotId,
        projectId,
        stageCode,
        triggerType: "protocol_test",
        result: robot.status === "online" ? "success" : "failed",
        durationMs: 0,
        metrics: { testType: "stage_protocol", robotStatus: robot.status },
      })
      .returning();

    results.push({
      robotId: assignment.robotId,
      robotCode: robot.robotCode,
      brand: robot.brand,
      status: robot.status,
      result: robot.status === "online" ? ("pass" as const) : ("fail" as const),
      executionLogId: execLog.id,
    });
  }

  const allPass = results.every(r => r.result === "pass");
  log.info({ projectId, stageCode, total: results.length, allPass }, "Stage protocol test completed");

  return { projectId, stageCode, allPass, robots: results };
}

// ──────────────────────────────────────────────────────────────
// Auto-trigger functions (called from stage-gate-auto-advance)
// ──────────────────────────────────────────────────────────────

export async function triggerAssemblyPrograms(projectId: number) {
  const db = await requireDb();
  log.info({ projectId }, "M7→M8 auto-trigger: loading assembly programs");

  // Find approved programs for M7 stage
  const programs = await db
    .select()
    .from(equipmentPrograms)
    .where(and(
      eq(equipmentPrograms.projectId, projectId),
      eq(equipmentPrograms.stageCode, "M7"),
      eq(equipmentPrograms.status, "approved"),
    ))
    .limit(100);

  const results = [];
  for (const program of programs) {
    try {
      const execResult = await executeProgram({
        programId: program.id,
        robotId: program.robotId,
        projectId,
        stageCode: "M7",
        triggerType: "stage_auto",
      });
      results.push({ programId: program.id, programName: program.programName, result: "success", logId: execResult.id });
    } catch (error) {
      results.push({
        programId: program.id,
        programName: program.programName,
        result: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  log.info({ projectId, executed: results.length }, "Assembly programs trigger completed");
  return { projectId, trigger: "assembly_programs", programs: results };
}

export async function triggerCommissioningMode(projectId: number) {
  const db = await requireDb();
  log.info({ projectId }, "M8→M9 auto-trigger: entering commissioning mode");

  // Find all M8 stage assignments
  const assignments = await db
    .select()
    .from(robotStageAssignments)
    .where(and(
      eq(robotStageAssignments.projectId, projectId),
      eq(robotStageAssignments.stageCode, "M8"),
    ))
    .limit(100);

  const results = [];
  for (const assignment of assignments) {
    // Create commissioning checklist for each robot
    try {
      const checklist = await createCommissioningChecklist(
        projectId,
        assignment.id,
        assignment.robotId,
      );
      results.push({
        robotId: assignment.robotId,
        assignmentId: assignment.id,
        checklistItems: checklist.length,
        result: "created",
      });

      // Update assignment status to active
      await updateAssignmentStatus(assignment.id, "active");
    } catch (error) {
      results.push({
        robotId: assignment.robotId,
        assignmentId: assignment.id,
        result: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  log.info({ projectId, robots: results.length }, "Commissioning mode trigger completed");
  return { projectId, trigger: "commissioning_mode", robots: results };
}

export async function triggerFieldPrograms(projectId: number) {
  const db = await requireDb();
  log.info({ projectId }, "M10→M11 auto-trigger: loading field programs");

  // Find approved programs for M10 stage (field/installation programs)
  const programs = await db
    .select()
    .from(equipmentPrograms)
    .where(and(
      eq(equipmentPrograms.projectId, projectId),
      eq(equipmentPrograms.stageCode, "M10"),
      eq(equipmentPrograms.status, "approved"),
    ))
    .limit(100);

  const results = [];
  for (const program of programs) {
    try {
      const execResult = await executeProgram({
        programId: program.id,
        robotId: program.robotId,
        projectId,
        stageCode: "M10",
        triggerType: "stage_auto",
      });
      results.push({ programId: program.id, programName: program.programName, result: "success", logId: execResult.id });
    } catch (error) {
      results.push({
        programId: program.id,
        programName: program.programName,
        result: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  log.info({ projectId, executed: results.length }, "Field programs trigger completed");
  return { projectId, trigger: "field_programs", programs: results };
}
