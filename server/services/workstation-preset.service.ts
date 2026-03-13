/**
 * Workstation Preset Service — 员工工作台预设
 *
 * CEO指令: 依据提交的员工实际名单与工资表中的入职日期、绩效表现、
 * 岗位职责等预设所有员工的工作台设置
 *
 * Manages per-employee dashboard layout, pinned menus, widgets,
 * AI assistant level, work schedule, feature flags, etc.
 */

import { requireDb } from "../db";
import { eq, sql, desc } from "drizzle-orm";
import { workstationPresets } from "../../drizzle/employee-points-schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("workstation-preset");

// ── Get preset for current employee ──────────────────────

export async function getMyPreset(employeeId: number) {
  const db = requireDb();
  const rows = await db
    .select()
    .from(workstationPresets)
    .where(eq(workstationPresets.employeeId, employeeId))
    .limit(1);
  return rows[0] ?? null;
}

// ── Get preset by employee code ──────────────────────────

export async function getPresetByCode(code: string) {
  const db = requireDb();
  const rows = await db
    .select()
    .from(workstationPresets)
    .where(eq(workstationPresets.employeeCode, code))
    .limit(1);
  return rows[0] ?? null;
}

// ── List all presets (admin) ─────────────────────────────

export async function listPresets(opts?: { role?: string; buCode?: string; limit?: number }) {
  const db = requireDb();
  const limit = Math.min(opts?.limit ?? 200, 500);
  const conditions: ReturnType<typeof eq>[] = [];
  if (opts?.role) conditions.push(eq(workstationPresets.systemRole, opts.role));
  if (opts?.buCode) conditions.push(eq(workstationPresets.buCode, opts.buCode));

  let query = db.select().from(workstationPresets);
  for (const cond of conditions) {
    query = query.where(cond) as typeof query;
  }
  return query.orderBy(workstationPresets.employeeId).limit(limit);
}

// ── Upsert a single preset ──────────────────────────────

export async function upsertPreset(preset: {
  employeeId: number;
  employeeCode?: string;
  systemRole: string;
  buCode?: string;
  dashboardLayout: string;
  pinnedMenuPaths: string[];
  defaultLandingPage: string;
  widgetConfig: Array<{ id: string; title: string; size: string; position: number }>;
  aiAssistantLevel: number;
  briefingModules: string[];
  kpiWidgets: string[];
  workSchedule: string;
  attendanceGroup?: string;
  canAccessSalary: boolean;
  canAccessFinance: boolean;
  canApproveOrders: boolean;
  canManageTeam: boolean;
  canViewAllBU: boolean;
  performanceTier: string;
  kpiScore?: string | null;
  salaryGrade?: string | null;
  isCustomized?: boolean;
}) {
  const db = requireDb();

  // Check if preset already exists
  const existing = await db
    .select({ id: workstationPresets.id })
    .from(workstationPresets)
    .where(eq(workstationPresets.employeeId, preset.employeeId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(workstationPresets)
      .set({
        ...preset,
        updatedAt: new Date(),
      })
      .where(eq(workstationPresets.employeeId, preset.employeeId));
    log.info({ employeeId: preset.employeeId }, "updated workstation preset");
  } else {
    await db.insert(workstationPresets).values(preset);
    log.info({ employeeId: preset.employeeId }, "created workstation preset");
  }

  return { success: true, employeeId: preset.employeeId };
}

// ── Bulk seed all presets ────────────────────────────────

export async function seedAllPresets(presets: Array<{
  employeeId: number;
  employeeCode?: string;
  systemRole: string;
  buCode?: string;
  dashboardLayout: string;
  pinnedMenuPaths: string[];
  defaultLandingPage: string;
  widgetConfig: Array<{ id: string; title: string; size: string; position: number }>;
  aiAssistantLevel: number;
  briefingModules: string[];
  kpiWidgets: string[];
  workSchedule: string;
  attendanceGroup?: string;
  canAccessSalary: boolean;
  canAccessFinance: boolean;
  canApproveOrders: boolean;
  canManageTeam: boolean;
  canViewAllBU: boolean;
  performanceTier: string;
  kpiScore?: string | null;
  salaryGrade?: string | null;
}>) {
  const db = requireDb();
  let created = 0;
  let updated = 0;

  for (const preset of presets) {
    const existing = await db
      .select({ id: workstationPresets.id, isCustomized: workstationPresets.isCustomized })
      .from(workstationPresets)
      .where(eq(workstationPresets.employeeId, preset.employeeId))
      .limit(1);

    if (existing.length > 0) {
      // Skip user-customized presets
      if (existing[0].isCustomized) continue;
      await db
        .update(workstationPresets)
        .set({ ...preset, updatedAt: new Date() })
        .where(eq(workstationPresets.employeeId, preset.employeeId));
      updated++;
    } else {
      await db.insert(workstationPresets).values(preset);
      created++;
    }
  }

  log.info({ created, updated, total: presets.length }, "seed workstation presets complete");
  return { created, updated, skippedCustomized: presets.length - created - updated };
}

// ── Update user's own preset (partial) ──────────────────

export async function updateMyPreset(employeeId: number, updates: {
  pinnedMenuPaths?: string[];
  defaultLandingPage?: string;
  widgetConfig?: Array<{ id: string; title: string; size: string; position: number }>;
}) {
  const db = requireDb();
  await db
    .update(workstationPresets)
    .set({
      ...updates,
      isCustomized: true,
      updatedAt: new Date(),
    })
    .where(eq(workstationPresets.employeeId, employeeId));
  log.info({ employeeId }, "user customized workstation preset");
  return { success: true };
}

// ── Get summary stats (admin) ────────────────────────────

export async function getPresetStats() {
  const db = requireDb();
  const rows = await db
    .select({
      systemRole: workstationPresets.systemRole,
      count: sql<number>`count(*)::int`,
    })
    .from(workstationPresets)
    .groupBy(workstationPresets.systemRole)
    .orderBy(desc(sql`count(*)`))
    .limit(50);

  const totalRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workstationPresets)
    .limit(1);

  return {
    total: totalRows[0]?.count ?? 0,
    byRole: rows,
  };
}
