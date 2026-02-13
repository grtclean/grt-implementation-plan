/**
 * Cost Standards tRPC Router - 成本标准与产品配置路由
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as svc from "./cost-standards.service";

export const costStandardsRouter = router({
  // ==========================================
  // Cost Standards CRUD
  // ==========================================

  list: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        isActive: z.boolean().optional(),
        search: z.string().optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
      }).optional().default({})
    )
    .query(({ input }) => svc.listCostStandards(input)),

  create: adminProcedure
    .input(
      z.object({
        category: z.enum(["labor", "overhead", "material_markup"]),
        code: z.string().min(1),
        name: z.string().min(1),
        nameEn: z.string().optional(),
        hourlyRate: z.string().optional(),
        dailyRate: z.string().optional(),
        overtimeMultiplier: z.string().optional(),
        monthlyAmount: z.string().optional(),
        allocationBase: z.string().optional(),
        allocationRate: z.string().optional(),
        allocationUnit: z.string().optional(),
        markupPercent: z.string().optional(),
        minMarkup: z.string().optional(),
        applyTo: z.string().optional(),
        description: z.string().optional(),
        effectiveFrom: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(({ input }) => svc.createCostStandard(input)),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        nameEn: z.string().optional(),
        hourlyRate: z.string().optional(),
        dailyRate: z.string().optional(),
        overtimeMultiplier: z.string().optional(),
        monthlyAmount: z.string().optional(),
        allocationBase: z.string().optional(),
        allocationRate: z.string().optional(),
        allocationUnit: z.string().optional(),
        markupPercent: z.string().optional(),
        minMarkup: z.string().optional(),
        applyTo: z.string().optional(),
        description: z.string().optional(),
        effectiveFrom: z.string().optional(),
        effectiveTo: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(({ input }) => svc.updateCostStandard(input)),

  // ==========================================
  // Product Configurations
  // ==========================================

  listProductConfigs: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        equipmentType: z.string().optional(),
        isActive: z.boolean().optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
      }).optional().default({})
    )
    .query(({ input }) => svc.listProductConfigs(input)),

  createProductConfig: adminProcedure
    .input(
      z.object({
        modelCode: z.string().min(1),
        productName: z.string().min(1),
        productNameEn: z.string().optional(),
        bomCode: z.string().optional(),
        bomId: z.number().optional(),
        materialCost: z.string().optional(),
        laborCost: z.string().optional(),
        overheadCost: z.string().optional(),
        otherCost: z.string().optional(),
        basePrice: z.string().optional(),
        marginPercent: z.string().optional(),
        equipmentType: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(({ input }) => svc.createProductConfig(input)),

  updateProductConfig: adminProcedure
    .input(
      z.object({
        id: z.number(),
        modelCode: z.string().optional(),
        productName: z.string().optional(),
        productNameEn: z.string().optional(),
        bomCode: z.string().optional(),
        bomId: z.number().optional(),
        materialCost: z.string().optional(),
        laborCost: z.string().optional(),
        overheadCost: z.string().optional(),
        otherCost: z.string().optional(),
        basePrice: z.string().optional(),
        marginPercent: z.string().optional(),
        equipmentType: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(({ input }) => svc.updateProductConfig(input)),

  // ==========================================
  // Cost Calculation
  // ==========================================

  calculateProductCost: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .query(({ input }) => svc.calculateProductCost(input.configId)),
});
