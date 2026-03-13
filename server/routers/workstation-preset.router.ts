/**
 * Workstation Preset Router — 员工工作台预设
 *
 * 7 procedures:
 *   getMyPreset   — get current user's workstation config
 *   getByCode     — get preset by employee code (admin)
 *   list          — list all presets with filters (admin)
 *   upsert        — create/update single preset (admin)
 *   seedAll       — bulk seed all presets from generated data (admin)
 *   updateMine    — user customizes their own preset
 *   stats         — summary statistics (admin)
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import * as svc from "../services/workstation-preset.service";

const adminPerm = requirePermission("system:config:manage");

const widgetSchema = z.object({
  id: z.string(),
  title: z.string(),
  size: z.string(),
  position: z.number(),
});

const presetInputSchema = z.object({
  employeeId: z.number().int().positive(),
  employeeCode: z.string().optional(),
  systemRole: z.string(),
  buCode: z.string().optional(),
  dashboardLayout: z.string(),
  pinnedMenuPaths: z.array(z.string()),
  defaultLandingPage: z.string(),
  widgetConfig: z.array(widgetSchema),
  aiAssistantLevel: z.number().int().min(1).max(5),
  briefingModules: z.array(z.string()),
  kpiWidgets: z.array(z.string()),
  workSchedule: z.string(),
  attendanceGroup: z.string().optional(),
  canAccessSalary: z.boolean(),
  canAccessFinance: z.boolean(),
  canApproveOrders: z.boolean(),
  canManageTeam: z.boolean(),
  canViewAllBU: z.boolean(),
  performanceTier: z.string(),
  kpiScore: z.string().nullish(),
  salaryGrade: z.string().nullish(),
  isCustomized: z.boolean().optional(),
});

export const workstationPresetRouter = router({
  /** Get my workstation preset */
  getMyPreset: protectedProcedure
    .query(async ({ ctx }) => {
      return svc.getMyPreset(ctx.user.id);
    }),

  /** Get preset by employee code (admin) */
  getByCode: protectedProcedure
    .use(adminPerm)
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      return svc.getPresetByCode(input.code);
    }),

  /** List presets with optional filters (admin) */
  list: protectedProcedure
    .use(adminPerm)
    .input(z.object({
      role: z.string().optional(),
      buCode: z.string().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    }).optional())
    .query(async ({ input }) => {
      return svc.listPresets(input ?? undefined);
    }),

  /** Upsert a single preset (admin) */
  upsert: protectedProcedure
    .use(adminPerm)
    .input(presetInputSchema)
    .mutation(async ({ input }) => {
      return svc.upsertPreset(input);
    }),

  /** Bulk seed all presets from generated data (admin) */
  seedAll: protectedProcedure
    .use(adminPerm)
    .input(z.object({ presets: z.array(presetInputSchema) }))
    .mutation(async ({ input }) => {
      return svc.seedAllPresets(input.presets);
    }),

  /** User customizes their own preset (pinned menus, widgets, landing) */
  updateMine: protectedProcedure
    .input(z.object({
      pinnedMenuPaths: z.array(z.string()).optional(),
      defaultLandingPage: z.string().optional(),
      widgetConfig: z.array(widgetSchema).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return svc.updateMyPreset(ctx.user.id, input);
    }),

  /** Preset summary statistics (admin) */
  stats: protectedProcedure
    .use(adminPerm)
    .query(async () => {
      return svc.getPresetStats();
    }),
});
