/**
 * IoT Digital Twin Router
 *
 * Provides:
 *   - Equipment twin management (register, telemetry, predictive maintenance)
 *   - Fleet dashboard (machine list, alerts, KPIs)
 *   - seedFleet: insert demo fleet data
 */
import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import * as iotSvc from "./iot-digital-twin.service";
import { requireDb } from "../db";
import { eq, desc, count, sql } from "drizzle-orm";
import { iotFleetMachines, iotPredictiveAlerts } from "../../drizzle/schema";

export const iotDigitalTwinRouter = router({
  register: requirePermission('rnd:digital-twin:view')
    .input(z.object({ equipmentId: z.number(), equipmentCode: z.string().optional(), equipmentName: z.string().optional(), location: z.string().optional(), metadata: z.string().optional() }))
    .mutation(async ({ input }) => { return iotSvc.registerEquipment(input); }),

  updateTelemetry: requirePermission('rnd:digital-twin:view')
    .input(z.object({ equipmentId: z.number(), metricType: z.string(), value: z.number(), unit: z.string().optional() }))
    .mutation(async ({ input }) => { return iotSvc.updateTelemetry(input.equipmentId, input); }),

  getTwin: protectedProcedure
    .input(z.object({ equipmentId: z.number() }))
    .query(async ({ input }) => { return iotSvc.getEquipmentTwin(input.equipmentId); }),

  alerts: protectedProcedure
    .input(z.object({ equipmentId: z.number().optional() }).optional())
    .query(async ({ input }) => { return iotSvc.getAlerts(input?.equipmentId); }),

  predictMaintenance: requirePermission('rnd:digital-twin:view')
    .input(z.object({ equipmentId: z.number() }))
    .mutation(async ({ input }) => { return iotSvc.predictMaintenance(input.equipmentId); }),

  /** Fleet dashboard — all machines with status summary */
  fleetDashboard: protectedProcedure.query(async () => {
    try {
      const db = await requireDb();
      const machines = await db.select().from(iotFleetMachines)
        .orderBy(iotFleetMachines.machineId)
      .limit(1000);
      const alerts = await db.select().from(iotPredictiveAlerts)
        .where(eq(iotPredictiveAlerts.status, "active"))
        .orderBy(desc(iotPredictiveAlerts.createdAt))
        .limit(20);

      const online = machines.filter(m => m.status === "online").length;
      const warning = machines.filter(m => m.status === "warning").length;
      const offline = machines.filter(m => m.status === "offline").length;
      const avgUtilization = 0; // Would come from telemetry

      return {
        machines,
        alerts,
        kpi: {
          total: machines.length,
          online,
          warning,
          offline,
          avgUtilization,
          activeAlerts: alerts.length,
        },
      };
    } catch {
      return { machines: [], alerts: [], kpi: { total: 0, online: 0, warning: 0, offline: 0, avgUtilization: 0, activeAlerts: 0 } };
    }
  }),

  /** Seed fleet demo data */
  seedFleet: requirePermission('rnd:digital-twin:view').mutation(async () => {
    try {
      const db = await requireDb();
      const [existing] = await db.select({ value: count() }).from(iotFleetMachines);
      if (Number(existing?.value ?? 0) > 0) {
        return { ok: true, message: "Fleet data already exists" };
      }

      const machines = [
        { machineId: "MC-001", plantName: "GRT苏州工厂", lineName: "Line-A", country: "CN", machineType: "超声清洗机", status: "online", customerName: "比亚迪" },
        { machineId: "MC-002", plantName: "GRT苏州工厂", lineName: "Line-A", country: "CN", machineType: "喷淋清洗机", status: "online", customerName: "比亚迪" },
        { machineId: "MC-003", plantName: "GRT苏州工厂", lineName: "Line-B", country: "CN", machineType: "浸泡清洗线", status: "warning", customerName: "宁德时代" },
        { machineId: "MC-004", plantName: "GRT德国工厂", lineName: "Line-C", country: "DE", machineType: "组合清洗线", status: "online", customerName: "BMW" },
        { machineId: "MC-005", plantName: "GRT德国工厂", lineName: "Line-C", country: "DE", machineType: "超声清洗机", status: "offline", customerName: "BMW" },
        { machineId: "MC-006", plantName: "GRT苏州工厂", lineName: "Line-A", country: "CN", machineType: "喷淋清洗机", status: "online", customerName: "长城汽车" },
        { machineId: "MC-007", plantName: "GRT苏州工厂", lineName: "Line-B", country: "CN", machineType: "真空干燥机", status: "online", customerName: "宁德时代" },
        { machineId: "MC-008", plantName: "GRT美国工厂", lineName: "Line-D", country: "US", machineType: "超声清洗机", status: "warning", customerName: "Tesla" },
      ];

      for (const m of machines) {
        await db.insert(iotFleetMachines).values(m);
      }

      const alertData = [
        { machineId: "MC-003", alertType: "温度异常", severity: "warning", currentValue: 62, thresholdValue: 60, predictedFailureDays: 14, recommendedPartName: "温控传感器" },
        { machineId: "MC-008", alertType: "振子衰减", severity: "warning", currentValue: 85, thresholdValue: 90, predictedFailureDays: 30, recommendedPartName: "超声振子模组" },
        { machineId: "MC-005", alertType: "设备离线", severity: "error", currentValue: 0, thresholdValue: 1, predictedFailureDays: 0, recommendedPartName: "PLC通信模块" },
        { machineId: "MC-001", alertType: "预测性维护", severity: "info", currentValue: 142, thresholdValue: 200, predictedFailureDays: 3, recommendedPartName: "过滤器" },
      ];

      for (const a of alertData) {
        await db.insert(iotPredictiveAlerts).values(a);
      }

      return { ok: true, machines: machines.length, alerts: alertData.length };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  }),
});
