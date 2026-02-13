/**
 * IoT Digital Twin Router (Task #78)
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import * as iotSvc from "./iot-digital-twin.service";

export const iotDigitalTwinRouter = router({
  register: publicProcedure
    .input(z.object({ equipmentId: z.number(), equipmentCode: z.string().optional(), equipmentName: z.string().optional(), location: z.string().optional(), metadata: z.string().optional() }))
    .mutation(async ({ input }) => { return iotSvc.registerEquipment(input); }),

  updateTelemetry: publicProcedure
    .input(z.object({ equipmentId: z.number(), metricType: z.string(), value: z.number(), unit: z.string().optional() }))
    .mutation(async ({ input }) => { return iotSvc.updateTelemetry(input.equipmentId, input); }),

  getTwin: publicProcedure
    .input(z.object({ equipmentId: z.number() }))
    .query(async ({ input }) => { return iotSvc.getEquipmentTwin(input.equipmentId); }),

  alerts: publicProcedure
    .input(z.object({ equipmentId: z.number().optional() }).optional())
    .query(async ({ input }) => { return iotSvc.getAlerts(input?.equipmentId); }),

  predictMaintenance: publicProcedure
    .input(z.object({ equipmentId: z.number() }))
    .mutation(async ({ input }) => { return iotSvc.predictMaintenance(input.equipmentId); }),
});