/**
 * Workstation Preset Router Tests — 员工工作台预设
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock service ──
const mockSvc = vi.hoisted(() => ({
  getMyPreset: vi.fn().mockResolvedValue({
    id: 1, employeeId: 1, employeeCode: "GRT001", systemRole: "ceo",
    dashboardLayout: "executive-cockpit", pinnedMenuPaths: ["/ceo-cockpit"],
    defaultLandingPage: "/ceo-cockpit", widgetConfig: [{ id: "revenue_overview", title: "营收总览", size: "xl", position: 1 }],
    aiAssistantLevel: 5, briefingModules: ["finance_summary"], kpiWidgets: ["company_revenue"],
    workSchedule: "six_day", attendanceGroup: "管理层",
    canAccessSalary: true, canAccessFinance: true, canApproveOrders: true, canManageTeam: true, canViewAllBU: true,
    performanceTier: "elite", kpiScore: "92.0", salaryGrade: "CEO",
  }),
  getPresetByCode: vi.fn().mockResolvedValue({ id: 1, employeeCode: "GRT001", systemRole: "ceo" }),
  listPresets: vi.fn().mockResolvedValue([
    { id: 1, employeeId: 1, systemRole: "ceo" },
    { id: 2, employeeId: 2, systemRole: "director" },
  ]),
  upsertPreset: vi.fn().mockResolvedValue({ success: true, employeeId: 1 }),
  seedAllPresets: vi.fn().mockResolvedValue({ created: 90, updated: 6, skippedCustomized: 0 }),
  updateMyPreset: vi.fn().mockResolvedValue({ success: true }),
  getPresetStats: vi.fn().mockResolvedValue({ total: 96, byRole: [{ systemRole: "production_worker", count: 30 }] }),
}));

vi.mock("../services/workstation-preset.service", () => mockSvc);

vi.mock("../../drizzle/employee-points-schema", () => ({
  workstationPresets: { employeeId: "employee_id", systemRole: "system_role", employeeCode: "employee_code" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  sql: Object.assign(vi.fn((...a: any[]) => a), { raw: vi.fn((s: string) => s) }),
  desc: vi.fn((col: any) => col),
}));

vi.mock("../_core/trpc", () => {
  const passthrough = { use: vi.fn(() => passthrough), input: vi.fn(() => passthrough), query: vi.fn((fn: any) => fn), mutation: vi.fn((fn: any) => fn) };
  return {
    router: vi.fn((routes: any) => routes),
    protectedProcedure: { ...passthrough },
    publicProcedure: { ...passthrough },
    requirePermission: vi.fn(() => passthrough),
  };
});

vi.mock("../lib/logger", () => ({
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { workstationPresetRouter } from "./workstation-preset.router";

describe("workstation-preset.router", () => {
  beforeEach(() => vi.clearAllMocks());

  const ctx = { user: { id: 1, role: "admin" } } as any;

  // ── getMyPreset ──
  it("getMyPreset returns current user preset", async () => {
    const result = await workstationPresetRouter.getMyPreset({ ctx, input: undefined as any, rawInput: undefined, path: "", type: "query" as const });
    expect(mockSvc.getMyPreset).toHaveBeenCalledWith(1);
    expect(result).toHaveProperty("dashboardLayout", "executive-cockpit");
  });

  // ── getByCode ──
  it("getByCode returns preset by employee code", async () => {
    const result = await workstationPresetRouter.getByCode({ ctx, input: { code: "GRT001" }, rawInput: undefined, path: "", type: "query" as const });
    expect(mockSvc.getPresetByCode).toHaveBeenCalledWith("GRT001");
    expect(result).toHaveProperty("systemRole", "ceo");
  });

  // ── list ──
  it("list returns all presets", async () => {
    const result = await workstationPresetRouter.list({ ctx, input: {}, rawInput: undefined, path: "", type: "query" as const });
    expect(mockSvc.listPresets).toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it("list with role filter", async () => {
    await workstationPresetRouter.list({ ctx, input: { role: "production_worker" }, rawInput: undefined, path: "", type: "query" as const });
    expect(mockSvc.listPresets).toHaveBeenCalledWith({ role: "production_worker" });
  });

  // ── upsert ──
  it("upsert creates or updates a preset", async () => {
    const input = {
      employeeId: 5, systemRole: "employee", dashboardLayout: "standard-workspace",
      pinnedMenuPaths: ["/my-tasks"], defaultLandingPage: "/personal-dashboard",
      widgetConfig: [{ id: "my_tasks", title: "我的任务", size: "lg", position: 1 }],
      aiAssistantLevel: 2, briefingModules: ["daily_tasks"], kpiWidgets: ["task_completion"],
      workSchedule: "six_day", canAccessSalary: false, canAccessFinance: false,
      canApproveOrders: false, canManageTeam: false, canViewAllBU: false, performanceTier: "standard",
    };
    const result = await workstationPresetRouter.upsert({ ctx, input, rawInput: undefined, path: "", type: "mutation" as const });
    expect(mockSvc.upsertPreset).toHaveBeenCalledWith(input);
    expect(result).toHaveProperty("success", true);
  });

  // ── seedAll ──
  it("seedAll bulk seeds presets", async () => {
    const preset = {
      employeeId: 1, systemRole: "ceo", dashboardLayout: "executive-cockpit",
      pinnedMenuPaths: ["/ceo-cockpit"], defaultLandingPage: "/ceo-cockpit",
      widgetConfig: [{ id: "rev", title: "Revenue", size: "xl", position: 1 }],
      aiAssistantLevel: 5, briefingModules: ["finance_summary"], kpiWidgets: ["company_revenue"],
      workSchedule: "six_day", canAccessSalary: true, canAccessFinance: true,
      canApproveOrders: true, canManageTeam: true, canViewAllBU: true, performanceTier: "elite",
    };
    const result = await workstationPresetRouter.seedAll({ ctx, input: { presets: [preset] }, rawInput: undefined, path: "", type: "mutation" as const });
    expect(mockSvc.seedAllPresets).toHaveBeenCalledWith([preset]);
    expect(result).toHaveProperty("created", 90);
  });

  // ── updateMine ──
  it("updateMine lets user customize their own preset", async () => {
    const input = { pinnedMenuPaths: ["/my-tasks", "/attendance-clock"] };
    const result = await workstationPresetRouter.updateMine({ ctx, input, rawInput: undefined, path: "", type: "mutation" as const });
    expect(mockSvc.updateMyPreset).toHaveBeenCalledWith(1, input);
    expect(result).toHaveProperty("success", true);
  });

  it("updateMine with landing page change", async () => {
    const input = { defaultLandingPage: "/role-workstation" };
    await workstationPresetRouter.updateMine({ ctx, input, rawInput: undefined, path: "", type: "mutation" as const });
    expect(mockSvc.updateMyPreset).toHaveBeenCalledWith(1, { defaultLandingPage: "/role-workstation" });
  });

  // ── stats ──
  it("stats returns summary statistics", async () => {
    const result = await workstationPresetRouter.stats({ ctx, input: undefined as any, rawInput: undefined, path: "", type: "query" as const });
    expect(mockSvc.getPresetStats).toHaveBeenCalled();
    expect(result).toHaveProperty("total", 96);
    expect(result.byRole).toHaveLength(1);
  });
});
