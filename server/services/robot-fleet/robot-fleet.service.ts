/**
 * Robot Fleet Service
 *
 * Orchestration layer for robot fleet management.
 * Handles registration, connection lifecycle, telemetry, digital twin sync,
 * and protocol testing.
 */

import { eq, desc, and, sql, count, gte, lte, type SQL } from "drizzle-orm";
import { requireDb } from "../../db";
import {
  robotFleetRegistry,
  robotProtocolConfigs,
  robotConnectionLogs,
  robotDtStateSnapshots,
  robotConditionAlerts,
} from "../../../drizzle/robot-fleet-schema";
import { getOrCreateAdapter, removeAdapter } from "./adapter-factory";
import { generateBrandTelemetry, checkConditionAlerts, getBrandSpecs, getBrandSpec } from "./robot-simulator";
import { createChildLogger } from "../../lib/logger";
import type { RobotBrand, ProtocolConfig, ProtocolTestReport, RobotCommand } from "./types";

const log = createChildLogger("robot-fleet-service");

// ── Registration ──

export async function registerRobot(data: {
  robotCode: string;
  brand: RobotBrand;
  model: string;
  serialNumber?: string;
  controllerType?: string;
  firmwareVersion?: string;
  protocolType: string;
  gatewayHost?: string;
  gatewayPort?: number;
  gatewayAuthToken?: string;
  maxPayloadKg?: string;
  reachMm?: string;
  repeatabilityMm?: string;
  axisCount?: number;
  location?: string;
  cellId?: string;
  assignedProcess?: string;
  dtAssetId?: number;
  iotEquipmentId?: number;
  createdBy?: string;
  // Protocol config
  protocolGatewayUrl?: string;
  protocolGatewayPort?: number;
  authMethod?: string;
  authCredential?: string;
  connectionTimeoutMs?: number;
  commandTimeoutMs?: number;
  maxRetries?: number;
  heartbeatIntervalMs?: number;
  telemetryIntervalMs?: number;
  customConfig?: Record<string, unknown>;
}) {
  const db = await requireDb();

  // Insert registry entry
  const [robot] = await db
    .insert(robotFleetRegistry)
    .values({
      robotCode: data.robotCode,
      brand: data.brand,
      model: data.model,
      serialNumber: data.serialNumber,
      controllerType: data.controllerType,
      firmwareVersion: data.firmwareVersion,
      protocolType: data.protocolType as "RSI" | "PCDK" | "EGM" | "uniVAL",
      gatewayHost: data.gatewayHost,
      gatewayPort: data.gatewayPort,
      gatewayAuthToken: data.gatewayAuthToken,
      maxPayloadKg: data.maxPayloadKg,
      reachMm: data.reachMm,
      repeatabilityMm: data.repeatabilityMm,
      axisCount: data.axisCount ?? 6,
      location: data.location,
      cellId: data.cellId,
      assignedProcess: data.assignedProcess as "cleaning" | "assembly" | "welding" | "painting" | "palletizing" | "inspection" | "other" | undefined,
      dtAssetId: data.dtAssetId,
      iotEquipmentId: data.iotEquipmentId,
      createdBy: data.createdBy,
    })
    .returning();

  // Create default protocol config if gateway info provided
  if (data.protocolGatewayUrl) {
    await db.insert(robotProtocolConfigs).values({
      robotId: robot.id,
      protocolName: data.protocolType,
      gatewayUrl: data.protocolGatewayUrl,
      gatewayPort: data.protocolGatewayPort ?? data.gatewayPort ?? 8080,
      authMethod: (data.authMethod ?? "none") as "none" | "token" | "certificate",
      authCredential: data.authCredential,
      connectionTimeoutMs: data.connectionTimeoutMs ?? 5000,
      commandTimeoutMs: data.commandTimeoutMs ?? 3000,
      maxRetries: data.maxRetries ?? 3,
      heartbeatIntervalMs: data.heartbeatIntervalMs ?? 1000,
      telemetryIntervalMs: data.telemetryIntervalMs ?? 100,
      customConfig: data.customConfig,
    });
  }

  log.info({ robotCode: data.robotCode, brand: data.brand }, "Robot registered");
  return robot;
}

// ── Connection Lifecycle ──

export async function connectRobot(robotId: number) {
  const db = await requireDb();
  const [robot] = await db
    .select()
    .from(robotFleetRegistry)
    .where(eq(robotFleetRegistry.id, robotId))
    .limit(1);

  if (!robot) throw new Error(`Robot ${robotId} not found`);

  // Get protocol config
  const [config] = await db
    .select()
    .from(robotProtocolConfigs)
    .where(eq(robotProtocolConfigs.robotId, robotId))
    .limit(1);

  const adapter = getOrCreateAdapter(robotId, robot.brand);
  const protocolConfig: ProtocolConfig = config
    ? {
        gatewayUrl: config.gatewayUrl,
        gatewayPort: config.gatewayPort,
        authMethod: config.authMethod,
        authCredential: config.authCredential ?? undefined,
        timeoutMs: config.connectionTimeoutMs ?? 5000,
        customConfig: config.customConfig as Record<string, unknown> | undefined,
      }
    : {
        gatewayUrl: robot.gatewayHost ?? "http://localhost",
        gatewayPort: robot.gatewayPort ?? 8080,
        authMethod: "none",
        timeoutMs: 5000,
      };

  const start = Date.now();
  const status = await adapter.connect(protocolConfig);

  // Log connection attempt
  await db.insert(robotConnectionLogs).values({
    robotId,
    eventType: "connect",
    success: status.connected,
    latencyMs: Date.now() - start,
  });

  // Update registry status
  if (status.connected) {
    await db
      .update(robotFleetRegistry)
      .set({ status: "online", lastHeartbeatAt: new Date().toISOString() })
      .where(eq(robotFleetRegistry.id, robotId));
  }

  return status;
}

export async function disconnectRobot(robotId: number) {
  const db = await requireDb();
  const [robot] = await db
    .select()
    .from(robotFleetRegistry)
    .where(eq(robotFleetRegistry.id, robotId))
    .limit(1);

  if (!robot) throw new Error(`Robot ${robotId} not found`);

  const adapter = getOrCreateAdapter(robotId, robot.brand);
  await adapter.disconnect();

  await db.insert(robotConnectionLogs).values({
    robotId,
    eventType: "disconnect",
    success: true,
  });

  await db
    .update(robotFleetRegistry)
    .set({ status: "offline" })
    .where(eq(robotFleetRegistry.id, robotId));

  return { success: true };
}

// ── Telemetry ──

export async function getRobotTelemetry(robotId: number) {
  const db = await requireDb();
  const [robot] = await db
    .select()
    .from(robotFleetRegistry)
    .where(eq(robotFleetRegistry.id, robotId))
    .limit(1);

  if (!robot) throw new Error(`Robot ${robotId} not found`);

  const adapter = getOrCreateAdapter(robotId, robot.brand);

  let telemetry;
  try {
    telemetry = await adapter.getTelemetry();
  } catch {
    // Fallback to simulator
    telemetry = generateBrandTelemetry(robot.brand, `robot-${robotId}`);
  }

  // Save snapshot
  await db.insert(robotDtStateSnapshots).values({
    robotId,
    j1Deg: String(telemetry.joints[0] ?? 0),
    j2Deg: String(telemetry.joints[1] ?? 0),
    j3Deg: String(telemetry.joints[2] ?? 0),
    j4Deg: String(telemetry.joints[3] ?? 0),
    j5Deg: String(telemetry.joints[4] ?? 0),
    j6Deg: String(telemetry.joints[5] ?? 0),
    tcpX: String(telemetry.tcp.x),
    tcpY: String(telemetry.tcp.y),
    tcpZ: String(telemetry.tcp.z),
    tcpRx: String(telemetry.tcp.rx),
    tcpRy: String(telemetry.tcp.ry),
    tcpRz: String(telemetry.tcp.rz),
    payloadKg: String(telemetry.payload),
    speedPct: String(telemetry.speed),
    motorTempsC: telemetry.motorTemps,
    operatingMode: telemetry.operatingMode,
    programName: telemetry.programName,
    programLine: telemetry.programLine,
  });

  // Check condition alerts
  const alerts = checkConditionAlerts(telemetry, robot.brand);
  for (const alert of alerts) {
    await db.insert(robotConditionAlerts).values({
      robotId,
      alertType: alert.alertType as "overtemp" | "collision" | "estop" | "servo_error" | "comm_loss" | "joint_limit" | "payload_exceeded",
      severity: alert.severity as "info" | "warning" | "critical" | "emergency",
      message: alert.message,
      jointIndex: alert.jointIndex,
      measuredValue: String(alert.measuredValue),
      thresholdValue: String(alert.thresholdValue),
      unit: alert.unit,
    });
  }

  return telemetry;
}

export async function sendRobotCommand(robotId: number, cmd: RobotCommand) {
  const db = await requireDb();
  const [robot] = await db
    .select()
    .from(robotFleetRegistry)
    .where(eq(robotFleetRegistry.id, robotId))
    .limit(1);

  if (!robot) throw new Error(`Robot ${robotId} not found`);

  const adapter = getOrCreateAdapter(robotId, robot.brand);
  const result = await adapter.sendCommand(cmd);

  await db.insert(robotConnectionLogs).values({
    robotId,
    eventType: "command",
    success: result.success,
    errorMessage: result.error,
    protocolDetails: { commandType: cmd.type, params: cmd.params },
  });

  return result;
}

// ── Fleet Dashboard ──

export async function getFleetDashboard() {
  const db = await requireDb();
  const robots = await db
    .select()
    .from(robotFleetRegistry)
    .orderBy(robotFleetRegistry.brand, robotFleetRegistry.robotCode)
    .limit(1000);

  const total = robots.length;
  const online = robots.filter((r) => r.status === "online").length;
  const byBrand = {
    kuka: robots.filter((r) => r.brand === "kuka").length,
    fanuc: robots.filter((r) => r.brand === "fanuc").length,
    abb: robots.filter((r) => r.brand === "abb").length,
    staubli: robots.filter((r) => r.brand === "staubli").length,
  };

  return { total, online, byBrand, robots };
}

// ── Protocol Testing ──

export async function runProtocolTest(robotId: number): Promise<ProtocolTestReport> {
  const db = await requireDb();
  const [robot] = await db
    .select()
    .from(robotFleetRegistry)
    .where(eq(robotFleetRegistry.id, robotId))
    .limit(1);

  if (!robot) throw new Error(`Robot ${robotId} not found`);

  const adapter = getOrCreateAdapter(robotId, robot.brand);
  const report: ProtocolTestReport = {
    robotId,
    robotCode: robot.robotCode,
    brand: robot.brand,
    timestamp: new Date().toISOString(),
    ping: { ok: false, latencyMs: 0 },
    telemetry: { ok: false },
    command: { ok: false },
    overall: "fail",
  };

  // Test 1: Ping
  try {
    report.ping = await adapter.ping();
  } catch (err) {
    report.ping = { ok: false, latencyMs: 0 };
  }

  // Test 2: Telemetry
  try {
    const data = await adapter.getTelemetry();
    report.telemetry = { ok: true, data };
  } catch (err) {
    report.telemetry = { ok: false, error: (err as Error).message };
  }

  // Test 3: Command (stop — safest command)
  try {
    const result = await adapter.sendCommand({ type: "stop", params: {} });
    report.command = { ok: result.success, response: result.response, error: result.error };
  } catch (err) {
    report.command = { ok: false, error: (err as Error).message };
  }

  // Overall verdict
  const passed = [report.ping.ok, report.telemetry.ok, report.command.ok].filter(Boolean).length;
  report.overall = passed === 3 ? "pass" : passed > 0 ? "partial" : "fail";

  log.info({ robotId, robotCode: robot.robotCode, overall: report.overall }, "Protocol test completed");
  return report;
}

// ── Digital Twin Sync ──

export async function syncDigitalTwin(robotId: number) {
  const telemetry = await getRobotTelemetry(robotId);
  log.info({ robotId, joints: telemetry.joints }, "Digital twin synced");
  return { synced: true, telemetry };
}

// ── Health Score ──

export async function getHealthScore(robotId: number) {
  const db = await requireDb();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Count recent alerts by severity
  const alertCounts = await db
    .select({
      severity: robotConditionAlerts.severity,
      count: count(),
    })
    .from(robotConditionAlerts)
    .where(
      and(
        eq(robotConditionAlerts.robotId, robotId),
        gte(robotConditionAlerts.createdAt, oneDayAgo),
      ),
    )
    .groupBy(robotConditionAlerts.severity)
    .limit(100);

  // Compute health score: start at 100, deduct per alert
  let score = 100;
  for (const row of alertCounts) {
    const n = Number(row.count);
    switch (row.severity) {
      case "emergency": score -= n * 25; break;
      case "critical": score -= n * 10; break;
      case "warning": score -= n * 3; break;
      case "info": score -= n * 1; break;
    }
  }

  return { robotId, healthScore: Math.max(0, Math.min(100, score)), alertCounts };
}

// ── Re-exports for convenience ──

export { getBrandSpecs, getBrandSpec };
