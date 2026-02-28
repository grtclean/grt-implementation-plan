/**
 * AI Training Closed-Loop — Intervention Engine + tRPC Router
 * Phase 3.1 — AI-Driven Performance → Training → Unlock Pipeline
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                   THE AI CLOSED LOOP                                │
 * │                                                                     │
 * │   ① DETECT                    ② INTERVENE                          │
 * │   ┌──────────────────┐       ┌───────────────────┐                 │
 * │   │ Defect Logs (2.4)│──┐    │ AI Intervention   │                 │
 * │   │ >3 defects/week  │  ├──▶│ Auto-assign module │                 │
 * │   └──────────────────┘  │    └───────┬───────────┘                 │
 * │   ┌──────────────────┐  │            │                              │
 * │   │ Meeting Score(2.3)│──┘            ▼                              │
 * │   │ score < 60       │     ┌───────────────────┐                   │
 * │   └──────────────────┘     │ ③ BLOCK (Interlock)│                   │
 * │                            │ PENDING_TRAINING   │                   │
 * │                            │ → Machine BLOCKED  │                   │
 * │                            │ → Tasks BLOCKED    │                   │
 * │                            └───────┬───────────┘                   │
 * │                                    │                                │
 * │                                    ▼                                │
 * │                          ┌───────────────────┐                     │
 * │                          │ ④ COMPLETE & UNLOCK│                     │
 * │                          │ Training done      │                     │
 * │                          │ → Access RESTORED  │                     │
 * │                          └───────────────────┘                     │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Triggers:
 *   QUALITY_DEFECT:    User caused >3 defects on a machine this week
 *   COLLABORATION_LOW: User's meeting score < 60
 *
 * Interlock (extends Phase 1.2):
 *   verifyOperatorAccess(userId, machineId):
 *     IF any ai_intervention with status IN ('PENDING_TRAINING','IN_PROGRESS')
 *     AND (blockedMachineId = machineId OR blockedMachineId IS NULL)
 *     → BLOCKED: "AI Training Required: {module_title}"
 *
 * Architecture: Pure calculation functions exported for Vitest.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

// ─── Types ───────────────────────────────────────────────────────────

export type InterventionStatus = "PENDING_TRAINING" | "IN_PROGRESS" | "COMPLETED" | "OVERRIDDEN" | "EXPIRED";
export type InterventionTrigger = "QUALITY_DEFECT" | "COLLABORATION_LOW" | "SAFETY_INCIDENT" | "CERT_EXPIRING" | "MANUAL";

export interface TrainingModule {
  id: number;
  moduleCode: string;
  title: string;
  titleZh: string;
  category: string;
  durationMinutes: number;
  passingScore: number;
  relatedMachineTypes: string[];  // machine codes
}

export interface DefectRecord {
  userId: number;
  userName: string;
  machineId: number;
  machineCode: string;
  defectCount: number;
  defectDates: string[];
  failureMode: string;
}

export interface MeetingScoreRecord {
  userId: number;
  userName: string;
  meetingScore: number;
  month: string;
}

export interface ActiveIntervention {
  id: number;
  userId: number;
  userName: string;
  triggerType: InterventionTrigger;
  triggerReason: string;
  assignedModuleId: number;
  assignedModuleTitle: string;
  blockedMachineId: number | null;
  blockedMachineCode: string | null;
  blockedTaskLevel: string | null;
  status: InterventionStatus;
  progressPercent: number;
  dueDate: string | null;
  createdAt: string;
}

export interface ScanResult {
  newInterventions: ActiveIntervention[];
  qualityTriggers: number;
  collaborationTriggers: number;
  totalScanned: number;
  scanTimestamp: string;
}

export interface OperatorAccessCheck {
  userId: number;
  machineId: number;
  machineCode: string;
  accessGranted: boolean;
  blockedByIntervention: ActiveIntervention | null;
  reason: string;
}

// ─── Pure Calculation Engine (fully unit-testable) ───────────────────

const QUALITY_DEFECT_THRESHOLD = 3;    // >3 defects per week triggers intervention
const COLLABORATION_SCORE_THRESHOLD = 60;  // <60 meeting score triggers intervention

/**
 * Evaluate whether a user's weekly defect count warrants an intervention.
 */
export function shouldTriggerQualityIntervention(
  defectRecord: DefectRecord
): boolean {
  return defectRecord.defectCount > QUALITY_DEFECT_THRESHOLD;
}

/**
 * Evaluate whether a user's collaboration score warrants an intervention.
 */
export function shouldTriggerCollaborationIntervention(
  meetingScore: number
): boolean {
  return meetingScore < COLLABORATION_SCORE_THRESHOLD;
}

/**
 * Find the best training module for a quality defect intervention.
 * Matches machine type to module's relatedMachineTypes.
 */
export function findQualityModule(
  machineCode: string,
  modules: TrainingModule[]
): TrainingModule | null {
  // First try exact machine match
  const exact = modules.find(m =>
    m.category === "PROCESS_QUALITY" &&
    m.relatedMachineTypes.includes(machineCode)
  );
  if (exact) return exact;

  // Fallback: any process quality module
  return modules.find(m => m.category === "PROCESS_QUALITY") ?? null;
}

/**
 * Find the collaboration training module.
 */
export function findCollaborationModule(
  modules: TrainingModule[]
): TrainingModule | null {
  return modules.find(m => m.category === "EFFECTIVE_COMMUNICATION") ?? null;
}

/**
 * Run the nightly intervention scan.
 * Processes defect records + meeting scores → generates interventions.
 */
export function runNightlyInterventionScan(
  defectRecords: DefectRecord[],
  meetingScores: MeetingScoreRecord[],
  modules: TrainingModule[],
  existingInterventions: ActiveIntervention[],
  now: Date = new Date()
): ScanResult {
  const newInterventions: ActiveIntervention[] = [];
  let qualityTriggers = 0;
  let collaborationTriggers = 0;
  let nextId = 1000; // mock ID counter

  // Skip users who already have an active (blocking) intervention
  const blockedUserIds = new Set(
    existingInterventions
      .filter(i => i.status === "PENDING_TRAINING" || i.status === "IN_PROGRESS")
      .map(i => i.userId)
  );

  // ── Trigger 1: Quality Defects ──
  for (const record of defectRecords) {
    if (blockedUserIds.has(record.userId)) continue;
    if (!shouldTriggerQualityIntervention(record)) continue;

    const module = findQualityModule(record.machineCode, modules);
    if (!module) continue;

    qualityTriggers++;
    const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days to complete

    const intervention: ActiveIntervention = {
      id: nextId++,
      userId: record.userId,
      userName: record.userName,
      triggerType: "QUALITY_DEFECT",
      triggerReason: `${record.defectCount} defects on ${record.machineCode} this week (threshold: >${QUALITY_DEFECT_THRESHOLD}). Failure mode: ${record.failureMode}`,
      assignedModuleId: module.id,
      assignedModuleTitle: module.title,
      blockedMachineId: record.machineId,
      blockedMachineCode: record.machineCode,
      blockedTaskLevel: "high",
      status: "PENDING_TRAINING",
      progressPercent: 0,
      dueDate: dueDate.toISOString(),
      createdAt: now.toISOString(),
    };

    newInterventions.push(intervention);
    blockedUserIds.add(record.userId); // prevent duplicate triggers
  }

  // ── Trigger 2: Collaboration Score ──
  for (const score of meetingScores) {
    if (blockedUserIds.has(score.userId)) continue;
    if (!shouldTriggerCollaborationIntervention(score.meetingScore)) continue;

    const module = findCollaborationModule(modules);
    if (!module) continue;

    collaborationTriggers++;
    const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

    const intervention: ActiveIntervention = {
      id: nextId++,
      userId: score.userId,
      userName: score.userName,
      triggerType: "COLLABORATION_LOW",
      triggerReason: `Meeting score ${score.meetingScore} is below threshold (${COLLABORATION_SCORE_THRESHOLD}) for ${score.month}`,
      assignedModuleId: module.id,
      assignedModuleTitle: module.title,
      blockedMachineId: null,  // not machine-specific
      blockedMachineCode: null,
      blockedTaskLevel: "high", // blocks high-level task assignments
      status: "PENDING_TRAINING",
      progressPercent: 0,
      dueDate: dueDate.toISOString(),
      createdAt: now.toISOString(),
    };

    newInterventions.push(intervention);
    blockedUserIds.add(score.userId);
  }

  return {
    newInterventions,
    qualityTriggers,
    collaborationTriggers,
    totalScanned: defectRecords.length + meetingScores.length,
    scanTimestamp: now.toISOString(),
  };
}

/**
 * THE INTERLOCK: Verify if an operator can access a machine.
 * Extends Phase 1.2 SOP interlock with AI training check.
 *
 * If user has PENDING_TRAINING or IN_PROGRESS intervention
 * that blocks this machine → ACCESS DENIED.
 */
export function verifyOperatorAccess(
  userId: number,
  machineId: number,
  machineCode: string,
  activeInterventions: ActiveIntervention[]
): OperatorAccessCheck {
  const blockingStatuses: InterventionStatus[] = ["PENDING_TRAINING", "IN_PROGRESS"];

  const blocking = activeInterventions.find(i =>
    i.userId === userId &&
    blockingStatuses.includes(i.status) &&
    (i.blockedMachineId === null || i.blockedMachineId === machineId)
  );

  if (blocking) {
    return {
      userId,
      machineId,
      machineCode,
      accessGranted: false,
      blockedByIntervention: blocking,
      reason: `AI Training Required: "${blocking.assignedModuleTitle}". Reason: ${blocking.triggerReason}. Complete training to restore access.`,
    };
  }

  return {
    userId,
    machineId,
    machineCode,
    accessGranted: true,
    blockedByIntervention: null,
    reason: "No active AI interventions — access permitted",
  };
}

/**
 * Complete an intervention (training finished).
 * Returns the updated intervention with COMPLETED status.
 */
export function completeIntervention(
  intervention: ActiveIntervention,
  trainingScore: number,
  passingScore: number
): { completed: boolean; updatedIntervention: ActiveIntervention; reason: string } {
  if (trainingScore < passingScore) {
    return {
      completed: false,
      updatedIntervention: {
        ...intervention,
        status: "IN_PROGRESS",
        progressPercent: Math.min(95, intervention.progressPercent + 10),
      },
      reason: `Score ${trainingScore} below passing threshold ${passingScore}. Retry required.`,
    };
  }

  return {
    completed: true,
    updatedIntervention: {
      ...intervention,
      status: "COMPLETED",
      progressPercent: 100,
    },
    reason: `Training completed with score ${trainingScore}/${passingScore}. Access restored.`,
  };
}

// ─── Mock Data (GRT Employees & Training) ────────────────────────────

const MOCK_MODULES: TrainingModule[] = [
  {
    id: 1, moduleCode: "TM-CNC-001", title: "CNC Precision Tuning & Defect Prevention",
    titleZh: "CNC精密调整与缺陷预防", category: "PROCESS_QUALITY", durationMinutes: 45,
    passingScore: 80, relatedMachineTypes: ["CNC-001", "CNC-002", "CNC-003"],
  },
  {
    id: 2, moduleCode: "TM-HYD-001", title: "Hydraulic Assembly Safety & Quality",
    titleZh: "液压装配安全与质量", category: "PROCESS_QUALITY", durationMinutes: 60,
    passingScore: 85, relatedMachineTypes: ["HYD-BENCH-001", "HYD-BENCH-002"],
  },
  {
    id: 3, moduleCode: "TM-WLD-001", title: "Advanced Welding Technique (SS316)",
    titleZh: "高级焊接技术(SS316)", category: "TECHNICAL_SKILLS", durationMinutes: 90,
    passingScore: 75, relatedMachineTypes: ["WLD-TIG-001", "WLD-MIG-001"],
  },
  {
    id: 4, moduleCode: "TM-COMM-001", title: "Effective Communication & Meeting Skills",
    titleZh: "高效沟通与会议技巧", category: "EFFECTIVE_COMMUNICATION", durationMinutes: 30,
    passingScore: 70, relatedMachineTypes: [],
  },
  {
    id: 5, moduleCode: "TM-SAFE-001", title: "Industrial Safety & Lockout/Tagout",
    titleZh: "工业安全与上锁/挂牌", category: "MACHINE_SAFETY", durationMinutes: 40,
    passingScore: 90, relatedMachineTypes: ["CNC-001", "CNC-002", "HYD-BENCH-001", "WLD-TIG-001"],
  },
  {
    id: 6, moduleCode: "TM-NZL-001", title: "Nozzle Calibration & Spray Quality",
    titleZh: "喷嘴校准与喷洒质量", category: "PROCESS_QUALITY", durationMinutes: 35,
    passingScore: 80, relatedMachineTypes: ["NZL-CAL-001", "NZL-CAL-002"],
  },
];

const NOW = new Date();

const MOCK_INTERVENTIONS: ActiveIntervention[] = [
  // Li Ming — blocked from CNC-001 due to 4 defects
  {
    id: 1, userId: 1002, userName: "李明 (Li Ming)",
    triggerType: "QUALITY_DEFECT",
    triggerReason: "4 defects on CNC-001 this week (threshold: >3). Failure mode: Dimensional tolerance exceeded ±0.05mm",
    assignedModuleId: 1, assignedModuleTitle: "CNC Precision Tuning & Defect Prevention",
    blockedMachineId: 101, blockedMachineCode: "CNC-001", blockedTaskLevel: "high",
    status: "IN_PROGRESS", progressPercent: 50,
    dueDate: new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(NOW.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // New operator — blocked from HYD-BENCH due to hydraulic defects
  {
    id: 2, userId: 1005, userName: "赵鑫 (Zhao Xin)",
    triggerType: "QUALITY_DEFECT",
    triggerReason: "5 defects on HYD-BENCH-001 this week (threshold: >3). Failure mode: Oil Leakage at Manifold Joint",
    assignedModuleId: 2, assignedModuleTitle: "Hydraulic Assembly Safety & Quality",
    blockedMachineId: 201, blockedMachineCode: "HYD-BENCH-001", blockedTaskLevel: "high",
    status: "PENDING_TRAINING", progressPercent: 0,
    dueDate: new Date(NOW.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Low collaboration score — assigned communication training
  {
    id: 3, userId: 1006, userName: "周伟 (Zhou Wei)",
    triggerType: "COLLABORATION_LOW",
    triggerReason: "Meeting score 45 is below threshold (60) for 2026-02",
    assignedModuleId: 4, assignedModuleTitle: "Effective Communication & Meeting Skills",
    blockedMachineId: null, blockedMachineCode: null, blockedTaskLevel: "high",
    status: "PENDING_TRAINING", progressPercent: 0,
    dueDate: new Date(NOW.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Recently completed — access restored
  {
    id: 4, userId: 1003, userName: "王芳 (Wang Fang)",
    triggerType: "QUALITY_DEFECT",
    triggerReason: "4 defects on NZL-CAL-001 last week. Failure mode: Spray Pattern Deviation",
    assignedModuleId: 6, assignedModuleTitle: "Nozzle Calibration & Spray Quality",
    blockedMachineId: 301, blockedMachineCode: "NZL-CAL-001", blockedTaskLevel: "high",
    status: "COMPLETED", progressPercent: 100,
    dueDate: new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Manager override
  {
    id: 5, userId: 1007, userName: "陈杰 (Chen Jie)",
    triggerType: "QUALITY_DEFECT",
    triggerReason: "6 defects on WLD-TIG-001 this week. Failure mode: Weld Porosity",
    assignedModuleId: 3, assignedModuleTitle: "Advanced Welding Technique (SS316)",
    blockedMachineId: 401, blockedMachineCode: "WLD-TIG-001", blockedTaskLevel: "high",
    status: "OVERRIDDEN", progressPercent: 30,
    dueDate: new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── tRPC Router ─────────────────────────────────────────────────────

export const aiInterventionRouter = router({
  /**
   * dashboard — returns all active interventions + summary stats.
   * The AI HR Command Center data feed.
   */
  dashboard: protectedProcedure.query(async () => {
    const active = MOCK_INTERVENTIONS.filter(i =>
      i.status === "PENDING_TRAINING" || i.status === "IN_PROGRESS"
    );
    const completed = MOCK_INTERVENTIONS.filter(i => i.status === "COMPLETED");
    const overridden = MOCK_INTERVENTIONS.filter(i => i.status === "OVERRIDDEN");

    return {
      interventions: MOCK_INTERVENTIONS,
      summary: {
        total: MOCK_INTERVENTIONS.length,
        activeBlocking: active.length,
        completed: completed.length,
        overridden: overridden.length,
        qualityTriggers: MOCK_INTERVENTIONS.filter(i => i.triggerType === "QUALITY_DEFECT").length,
        collaborationTriggers: MOCK_INTERVENTIONS.filter(i => i.triggerType === "COLLABORATION_LOW").length,
      },
      modules: MOCK_MODULES,
      generatedAt: new Date().toISOString(),
      dataSource: "mock" as const,
    };
  }),

  /**
   * checkAccess — verify if user can access a machine (AI interlock layer).
   * This EXTENDS Phase 1.2 SOP interlock with training-gate check.
   */
  checkAccess: protectedProcedure
    .input(z.object({ userId: z.number(), machineId: z.number(), machineCode: z.string() }))
    .query(async ({ input }) => {
      const result = verifyOperatorAccess(
        input.userId, input.machineId, input.machineCode, MOCK_INTERVENTIONS
      );
      return { ...result, dataSource: "mock" as const };
    }),

  /**
   * runScan — execute the nightly intervention scan (manual trigger).
   */
  runScan: protectedProcedure.mutation(async () => {
    // Mock defect records for this week
    const defectRecords: DefectRecord[] = [
      { userId: 1002, userName: "李明 (Li Ming)", machineId: 101, machineCode: "CNC-001", defectCount: 4, defectDates: ["2026-02-24", "2026-02-23", "2026-02-22", "2026-02-21"], failureMode: "Dimensional tolerance exceeded" },
      { userId: 1005, userName: "赵鑫 (Zhao Xin)", machineId: 201, machineCode: "HYD-BENCH-001", defectCount: 5, defectDates: ["2026-02-25", "2026-02-24", "2026-02-23", "2026-02-22", "2026-02-21"], failureMode: "Oil Leakage at Manifold Joint" },
    ];

    const meetingScores: MeetingScoreRecord[] = [
      { userId: 1006, userName: "周伟 (Zhou Wei)", meetingScore: 45, month: "2026-02" },
    ];

    const result = runNightlyInterventionScan(
      defectRecords, meetingScores, MOCK_MODULES, MOCK_INTERVENTIONS
    );

    return { ...result, dataSource: "mock" as const };
  }),

  /**
   * override — manager override to unblock a user.
   */
  override: protectedProcedure
    .input(z.object({
      interventionId: z.number(),
      managerId: z.number(),
      managerName: z.string(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const intervention = MOCK_INTERVENTIONS.find(i => i.id === input.interventionId);
      if (!intervention) {
        return { success: false, error: `Intervention ${input.interventionId} not found` };
      }
      return {
        success: true,
        interventionId: input.interventionId,
        previousStatus: intervention.status,
        newStatus: "OVERRIDDEN" as const,
        overriddenBy: input.managerName,
        reason: input.reason,
        timestamp: new Date().toISOString(),
      };
    }),
});
