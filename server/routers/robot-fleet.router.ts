/**
 * Robot Fleet Router
 *
 * Universal robot fleet management for KUKA, FANUC, ABB, and Stäubli industrial robots.
 * Gateway-based architecture with brand-selectable adapters and digital twin integration.
 *
 * 5 sub-routers (~25 procedures):
 *  A. registry    — CRUD for robot fleet registry
 *  B. connection  — connect/disconnect/ping/test lifecycle
 *  C. telemetry   — real-time state + history + digital twin sync
 *  D. condition   — alerts, acknowledgement, health scoring
 *  E. protocol    — protocol config management + validation
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  robotFleetRegistry,
  robotProtocolConfigs,
  robotConnectionLogs,
  robotDtStateSnapshots,
  robotConditionAlerts,
} from "../../drizzle/robot-fleet-schema";
import { eq, desc, and, count, gte, lte, type SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import * as fleetService from "../services/robot-fleet/robot-fleet.service";
import * as stageService from "../services/robot-fleet/robot-stage-integration.service";

const log = createChildLogger("robot-fleet-router");

const brandEnum = z.enum(["kuka", "fanuc", "abb", "staubli"]);
const statusEnum = z.enum(["online", "offline", "error", "maintenance"]);
const processEnum = z.enum(["cleaning", "assembly", "welding", "painting", "palletizing", "inspection", "other"]);
const alertTypeEnum = z.enum(["overtemp", "collision", "estop", "servo_error", "comm_loss", "joint_limit", "payload_exceeded"]);
const severityEnum = z.enum(["info", "warning", "critical", "emergency"]);
const commandTypeEnum = z.enum([
  "movej", "movel", "movec", "stop", "pause", "resume", "home", "set_speed", "set_override",
  "load_program", "run_program", "upload_program", "debug_mode", "auto_mode",
]);

// ──── Sub-router A: Registry ────

const registryRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        brand: brandEnum.optional(),
        status: statusEnum.optional(),
        assignedProcess: processEnum.optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { brand, status, assignedProcess, page = 1, pageSize = 20 } = input ?? {};

      const conditions: SQL[] = [];
      if (brand) conditions.push(eq(robotFleetRegistry.brand, brand));
      if (status) conditions.push(eq(robotFleetRegistry.status, status));
      if (assignedProcess) conditions.push(eq(robotFleetRegistry.assignedProcess, assignedProcess));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(robotFleetRegistry)
        .where(where)
        .orderBy(desc(robotFleetRegistry.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const [totalRow] = await db
        .select({ count: count() })
        .from(robotFleetRegistry)
        .where(where)
        .limit(1);

      return { rows, total: Number(totalRow?.count ?? 0), page, pageSize };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [robot] = await db
        .select()
        .from(robotFleetRegistry)
        .where(eq(robotFleetRegistry.id, input.id))
        .limit(1);

      if (!robot) throw new TRPCError({ code: "NOT_FOUND", message: "Robot not found" });

      // Also get protocol config
      const [config] = await db
        .select()
        .from(robotProtocolConfigs)
        .where(eq(robotProtocolConfigs.robotId, input.id))
        .limit(1);

      return { ...robot, protocolConfig: config ?? null };
    }),

  register: requirePermission("mfg:robot-fleet:manage")
    .input(
      z.object({
        robotCode: z.string().min(1).max(50),
        brand: brandEnum,
        model: z.string().min(1).max(100),
        serialNumber: z.string().max(100).optional(),
        controllerType: z.string().max(50).optional(),
        firmwareVersion: z.string().max(50).optional(),
        protocolType: z.enum(["RSI", "PCDK", "EGM", "uniVAL"]),
        gatewayHost: z.string().max(255).optional(),
        gatewayPort: z.number().optional(),
        gatewayAuthToken: z.string().max(500).optional(),
        maxPayloadKg: z.string().optional(),
        reachMm: z.string().optional(),
        repeatabilityMm: z.string().optional(),
        axisCount: z.number().min(4).max(7).optional(),
        location: z.string().max(200).optional(),
        cellId: z.string().max(50).optional(),
        assignedProcess: processEnum.optional(),
        dtAssetId: z.number().optional(),
        iotEquipmentId: z.number().optional(),
        // Protocol config
        protocolGatewayUrl: z.string().max(500).optional(),
        protocolGatewayPort: z.number().optional(),
        authMethod: z.enum(["none", "token", "certificate"]).optional(),
        authCredential: z.string().max(500).optional(),
        connectionTimeoutMs: z.number().optional(),
        commandTimeoutMs: z.number().optional(),
        maxRetries: z.number().optional(),
        heartbeatIntervalMs: z.number().optional(),
        telemetryIntervalMs: z.number().optional(),
        customConfig: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const robot = await fleetService.registerRobot({
        ...input,
        createdBy: ctx.user?.name ?? ctx.user?.openId ?? "system",
      });
      return robot;
    }),

  update: requirePermission("mfg:robot-fleet:manage")
    .input(
      z.object({
        id: z.number(),
        model: z.string().max(100).optional(),
        serialNumber: z.string().max(100).optional(),
        controllerType: z.string().max(50).optional(),
        firmwareVersion: z.string().max(50).optional(),
        gatewayHost: z.string().max(255).optional(),
        gatewayPort: z.number().optional(),
        location: z.string().max(200).optional(),
        cellId: z.string().max(50).optional(),
        assignedProcess: processEnum.optional(),
        dtAssetId: z.number().nullable().optional(),
        iotEquipmentId: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      const [result] = await db
        .update(robotFleetRegistry)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(robotFleetRegistry.id, id))
        .returning();
      return result;
    }),

  decommission: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db
        .update(robotFleetRegistry)
        .set({ status: "offline", updatedAt: new Date().toISOString() })
        .where(eq(robotFleetRegistry.id, input.id))
        .returning();
      log.info({ robotId: input.id }, "Robot decommissioned");
      return result;
    }),

  getBrands: protectedProcedure.query(async () => {
    return fleetService.getBrandSpecs();
  }),

  getByBrand: protectedProcedure
    .input(z.object({ brand: brandEnum }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(robotFleetRegistry)
        .where(eq(robotFleetRegistry.brand, input.brand))
        .orderBy(robotFleetRegistry.robotCode)
        .limit(200);
      return rows;
    }),
});

// ──── Sub-router B: Connection ────

const connectionRouter = router({
  connect: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({ robotId: z.number() }))
    .mutation(async ({ input }) => {
      return fleetService.connectRobot(input.robotId);
    }),

  disconnect: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({ robotId: z.number() }))
    .mutation(async ({ input }) => {
      return fleetService.disconnectRobot(input.robotId);
    }),

  ping: protectedProcedure
    .input(z.object({ robotId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [robot] = await db
        .select()
        .from(robotFleetRegistry)
        .where(eq(robotFleetRegistry.id, input.robotId))
        .limit(1);
      if (!robot) throw new TRPCError({ code: "NOT_FOUND", message: "Robot not found" });

      const { getOrCreateAdapter } = await import("../services/robot-fleet/adapter-factory");
      const adapter = getOrCreateAdapter(input.robotId, robot.brand);
      return adapter.ping();
    }),

  getConnectionLogs: protectedProcedure
    .input(
      z.object({
        robotId: z.number(),
        eventType: z.enum(["connect", "disconnect", "error", "heartbeat", "command"]).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [eq(robotConnectionLogs.robotId, input.robotId)];
      if (input.eventType) conditions.push(eq(robotConnectionLogs.eventType, input.eventType));
      if (input.from) conditions.push(gte(robotConnectionLogs.createdAt, input.from));
      if (input.to) conditions.push(lte(robotConnectionLogs.createdAt, input.to));

      const rows = await db
        .select()
        .from(robotConnectionLogs)
        .where(and(...conditions))
        .orderBy(desc(robotConnectionLogs.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return rows;
    }),

  runProtocolTest: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({ robotId: z.number() }))
    .mutation(async ({ input }) => {
      return fleetService.runProtocolTest(input.robotId);
    }),
});

// ──── Sub-router C: Telemetry ────

const telemetryRouter = router({
  getLatest: protectedProcedure
    .input(z.object({ robotId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [snapshot] = await db
        .select()
        .from(robotDtStateSnapshots)
        .where(eq(robotDtStateSnapshots.robotId, input.robotId))
        .orderBy(desc(robotDtStateSnapshots.snapshotAt))
        .limit(1);
      return snapshot ?? null;
    }),

  getHistory: protectedProcedure
    .input(
      z.object({
        robotId: z.number(),
        from: z.string().optional(),
        to: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [eq(robotDtStateSnapshots.robotId, input.robotId)];
      if (input.from) conditions.push(gte(robotDtStateSnapshots.snapshotAt, input.from));
      if (input.to) conditions.push(lte(robotDtStateSnapshots.snapshotAt, input.to));

      const rows = await db
        .select()
        .from(robotDtStateSnapshots)
        .where(and(...conditions))
        .orderBy(desc(robotDtStateSnapshots.snapshotAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return rows;
    }),

  getJointTrend: protectedProcedure
    .input(
      z.object({
        robotId: z.number(),
        jointIndex: z.number().min(1).max(6),
        limit: z.number().min(1).max(500).default(100),
      }),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const jointCol = [
        robotDtStateSnapshots.j1Deg,
        robotDtStateSnapshots.j2Deg,
        robotDtStateSnapshots.j3Deg,
        robotDtStateSnapshots.j4Deg,
        robotDtStateSnapshots.j5Deg,
        robotDtStateSnapshots.j6Deg,
      ][input.jointIndex - 1];

      const rows = await db
        .select({
          snapshotAt: robotDtStateSnapshots.snapshotAt,
          value: jointCol,
        })
        .from(robotDtStateSnapshots)
        .where(eq(robotDtStateSnapshots.robotId, input.robotId))
        .orderBy(desc(robotDtStateSnapshots.snapshotAt))
        .limit(input.limit);

      return rows;
    }),

  syncDigitalTwin: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({ robotId: z.number() }))
    .mutation(async ({ input }) => {
      return fleetService.syncDigitalTwin(input.robotId);
    }),

  startSimulation: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({ robotId: z.number() }))
    .mutation(async ({ input }) => {
      // Get telemetry via simulator (will use built-in simulation)
      const telemetry = await fleetService.getRobotTelemetry(input.robotId);
      return { started: true, telemetry };
    }),
});

// ──── Sub-router D: Condition ────

const conditionRouter = router({
  getAlerts: protectedProcedure
    .input(
      z.object({
        robotId: z.number().optional(),
        severity: severityEnum.optional(),
        alertType: alertTypeEnum.optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const { robotId, severity, alertType, page = 1, pageSize = 20 } = input ?? {};

      const conditions: SQL[] = [];
      if (robotId) conditions.push(eq(robotConditionAlerts.robotId, robotId));
      if (severity) conditions.push(eq(robotConditionAlerts.severity, severity));
      if (alertType) conditions.push(eq(robotConditionAlerts.alertType, alertType));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(robotConditionAlerts)
        .where(where)
        .orderBy(desc(robotConditionAlerts.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      return rows;
    }),

  acknowledge: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({ id: z.number(), acknowledgedBy: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [result] = await db
        .update(robotConditionAlerts)
        .set({
          acknowledgedAt: new Date().toISOString(),
          acknowledgedBy: input.acknowledgedBy,
        })
        .where(eq(robotConditionAlerts.id, input.id))
        .returning();
      return result;
    }),

  getAlertStats: protectedProcedure
    .input(z.object({ robotId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input?.robotId) conditions.push(eq(robotConditionAlerts.robotId, input.robotId));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const bySeverity = await db
        .select({ severity: robotConditionAlerts.severity, count: count() })
        .from(robotConditionAlerts)
        .where(where)
        .groupBy(robotConditionAlerts.severity)
        .limit(100);

      const byType = await db
        .select({ alertType: robotConditionAlerts.alertType, count: count() })
        .from(robotConditionAlerts)
        .where(where)
        .groupBy(robotConditionAlerts.alertType)
        .limit(100);

      return { bySeverity, byType };
    }),

  getHealthScore: protectedProcedure
    .input(z.object({ robotId: z.number() }))
    .query(async ({ input }) => {
      return fleetService.getHealthScore(input.robotId);
    }),
});

// ──── Sub-router E: Protocol ────

const protocolRouter = router({
  getConfig: protectedProcedure
    .input(z.object({ robotId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [config] = await db
        .select()
        .from(robotProtocolConfigs)
        .where(eq(robotProtocolConfigs.robotId, input.robotId))
        .limit(1);
      return config ?? null;
    }),

  updateConfig: requirePermission("mfg:robot-fleet:manage")
    .input(
      z.object({
        robotId: z.number(),
        gatewayUrl: z.string().max(500).optional(),
        gatewayPort: z.number().optional(),
        authMethod: z.enum(["none", "token", "certificate"]).optional(),
        authCredential: z.string().max(500).optional(),
        connectionTimeoutMs: z.number().optional(),
        commandTimeoutMs: z.number().optional(),
        maxRetries: z.number().optional(),
        heartbeatIntervalMs: z.number().optional(),
        telemetryIntervalMs: z.number().optional(),
        customConfig: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { robotId, ...updates } = input;
      const [result] = await db
        .update(robotProtocolConfigs)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(robotProtocolConfigs.robotId, robotId))
        .returning();
      return result;
    }),

  getProtocolSpecs: protectedProcedure.query(async () => {
    const specs = fleetService.getBrandSpecs();
    return specs.map((s) => ({
      brand: s.brand,
      protocolName: s.protocolName,
      models: s.models,
      controllerTypes: s.controllerTypes,
      maxPayloadKg: s.maxPayloadKg,
      reachMm: s.reachMm,
      repeatabilityMm: s.repeatabilityMm,
      description: s.description,
    }));
  }),

  validateConfig: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({ robotId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [config] = await db
        .select()
        .from(robotProtocolConfigs)
        .where(eq(robotProtocolConfigs.robotId, input.robotId))
        .limit(1);

      if (!config) {
        return { valid: false, errors: ["No protocol configuration found"] };
      }

      const errors: string[] = [];
      if (!config.gatewayUrl) errors.push("Gateway URL is required");
      if (!config.gatewayPort) errors.push("Gateway port is required");
      if (config.connectionTimeoutMs && config.connectionTimeoutMs < 100) errors.push("Connection timeout too low (min 100ms)");
      if (config.commandTimeoutMs && config.commandTimeoutMs < 100) errors.push("Command timeout too low (min 100ms)");

      // Test gateway reachability
      try {
        const resp = await fetch(`${config.gatewayUrl}:${config.gatewayPort}/health`, {
          method: "GET",
          signal: AbortSignal.timeout(3000),
        });
        if (!resp.ok) errors.push(`Gateway returned HTTP ${resp.status}`);
      } catch {
        // Gateway unreachable is expected in dev/test — just note it
        errors.push("Gateway unreachable (may be expected in dev/test)");
      }

      return { valid: errors.length === 0, errors };
    }),
});

// ──── Sub-router F: Stage Integration ────

const stageCodeEnum = z.enum(["M3", "M5", "M7", "M8", "M9", "M11"]);
const assignmentRoleEnum = z.enum(["primary", "backup", "support"]);
const programTypeEnum = z.enum(["robot_motion", "plc_ladder", "plc_st", "hmi_screen", "vision", "conveyor"]);
const programStatusEnum = z.enum(["draft", "review", "approved", "deployed", "deprecated"]);

const stageIntegrationRouter = router({
  getStageAssignments: protectedProcedure
    .input(z.object({ projectId: z.number(), stageCode: stageCodeEnum }))
    .query(async ({ input }) => {
      return stageService.getStageAssignments(input.projectId, input.stageCode);
    }),

  getProjectAssignments: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return stageService.getProjectAssignments(input.projectId);
    }),

  assignRobotToStage: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({
      projectId: z.number(),
      robotId: z.number(),
      stageCode: stageCodeEnum,
      role: assignmentRoleEnum.optional(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return stageService.assignRobotToStage({
        ...input,
        assignedBy: ctx.user?.name ?? ctx.user?.openId ?? "system",
      });
    }),

  releaseRobotFromStage: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({ assignmentId: z.number() }))
    .mutation(async ({ input }) => {
      return stageService.releaseRobotFromStage(input.assignmentId);
    }),

  getStageReadiness: protectedProcedure
    .input(z.object({ projectId: z.number(), stageCode: stageCodeEnum }))
    .query(async ({ input }) => {
      return stageService.getStageReadiness(input.projectId, input.stageCode);
    }),

  createProgram: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({
      projectId: z.number(),
      robotId: z.number(),
      stageCode: stageCodeEnum,
      programName: z.string().min(1).max(200),
      programType: programTypeEnum.optional(),
      programContent: z.string().optional(),
      storageUrl: z.string().max(500).optional(),
      parameters: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return stageService.createProgram({
        ...input,
        createdBy: ctx.user?.name ?? ctx.user?.openId ?? "system",
      });
    }),

  updateProgram: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({
      programId: z.number(),
      action: z.enum(["iterate", "changeStatus"]),
      // For iterate
      revisionReason: z.string().max(500).optional(),
      programContent: z.string().optional(),
      storageUrl: z.string().max(500).optional(),
      parameters: z.record(z.string(), z.unknown()).optional(),
      // For changeStatus
      newStatus: programStatusEnum.optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userName = ctx.user?.name ?? ctx.user?.openId ?? "system";
      if (input.action === "iterate") {
        if (!input.revisionReason) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "revisionReason required for iterate" });
        }
        return stageService.iterateProgram({
          previousProgramId: input.programId,
          revisionReason: input.revisionReason,
          programContent: input.programContent,
          storageUrl: input.storageUrl,
          parameters: input.parameters,
          createdBy: userName,
        });
      } else {
        if (!input.newStatus) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "newStatus required for changeStatus" });
        }
        return stageService.updateProgramStatus(input.programId, input.newStatus, userName);
      }
    }),

  getProgramHistory: protectedProcedure
    .input(z.object({ programId: z.number() }))
    .query(async ({ input }) => {
      return stageService.getProgramHistory(input.programId);
    }),

  getStagePrograms: protectedProcedure
    .input(z.object({ projectId: z.number(), stageCode: stageCodeEnum }))
    .query(async ({ input }) => {
      return stageService.getStagePrograms(input.projectId, input.stageCode);
    }),

  executeProgram: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({
      programId: z.number(),
      robotId: z.number(),
      projectId: z.number(),
      stageCode: stageCodeEnum,
      triggerType: z.enum(["stage_auto", "manual", "commissioning", "protocol_test"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return stageService.executeProgram({
        ...input,
        executedBy: ctx.user?.name ?? ctx.user?.openId ?? "system",
      });
    }),

  getExecutionLogs: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      robotId: z.number().optional(),
      stageCode: stageCodeEnum.optional(),
      programId: z.number().optional(),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      return stageService.getExecutionLogs(input ?? {});
    }),

  createCommissioningChecklist: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({
      projectId: z.number(),
      assignmentId: z.number(),
      robotId: z.number(),
      brand: brandEnum.optional(),
    }))
    .mutation(async ({ input }) => {
      return stageService.createCommissioningChecklist(
        input.projectId,
        input.assignmentId,
        input.robotId,
        input.brand,
      );
    }),

  getCommissioningChecklist: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      robotId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return stageService.getCommissioningChecklist(input.projectId, input.robotId);
    }),

  updateCommissioningItem: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({
      itemId: z.number(),
      status: z.enum(["pending", "passed", "failed", "skipped"]),
      measuredValue: z.string().max(100).optional(),
      executionLogId: z.number().optional(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return stageService.updateCommissioningItem(input.itemId, {
        status: input.status,
        measuredValue: input.measuredValue,
        executionLogId: input.executionLogId,
        completedBy: ctx.user?.name ?? ctx.user?.openId ?? "system",
        notes: input.notes,
      });
    }),

  runStageProtocolTest: requirePermission("mfg:robot-fleet:manage")
    .input(z.object({
      projectId: z.number(),
      stageCode: stageCodeEnum,
    }))
    .mutation(async ({ input }) => {
      return stageService.runStageProtocolTest(input.projectId, input.stageCode);
    }),
});

// ──── Main Router ────

export const robotFleetRouter = router({
  registry: registryRouter,
  connection: connectionRouter,
  telemetry: telemetryRouter,
  condition: conditionRouter,
  protocol: protocolRouter,
  stageIntegration: stageIntegrationRouter,
});
