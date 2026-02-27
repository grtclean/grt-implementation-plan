/**
 * 并行调试指挥中心路由 — DB-backed
 * Track 1: Software Dev Sandboxes (ccc_sandboxes)
 * Track 2: Equipment Commissioning Rooms (ccc_rooms)
 * Activity audit log (ccc_activities)
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { broadcastToWorkspace } from "../services/websocket.service";
import { requireDb } from "../db";
import {
  cccSandboxes,
  cccRooms,
  cccActivities,
} from "../../drizzle/concurrent-debug-schema";
import { eq, desc, sql } from "drizzle-orm";

// Dedicated workspace ID for Concurrent Command Center
const CCC_WORKSPACE_ID = 9900;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function pushActivity(
  action: string,
  target: string,
  userName: string,
  extraData?: Record<string, any>,
) {
  const db = await requireDb();
  const [entry] = await db
    .insert(cccActivities)
    .values({ action, target, userName, extraData: extraData ?? null })
    .returning();
  return entry;
}

async function broadcast(
  action: string,
  target: string,
  userName: string,
  extra?: Record<string, any>,
) {
  const entry = await pushActivity(action, target, userName, extra);
  try {
    broadcastToWorkspace(CCC_WORKSPACE_ID, {
      type: "action" as any,
      workspaceId: CCC_WORKSPACE_ID,
      data: { ...entry, ...extra },
      timestamp: Date.now(),
    });
  } catch {
    // WebSocket may not be initialized in test environments
  }
  return entry;
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const concurrentCommandRouter = router({
  // ─── Track 1: Software Dev Sandboxes ──────────────────────────────────────

  listSandboxes: publicProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(cccSandboxes).orderBy(cccSandboxes.id);
  }),

  updateSandboxStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        branchStatus: z.enum(["ISOLATED", "TESTING", "READY_FOR_MERGE"]),
        userName: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();

      const [existing] = await db
        .select()
        .from(cccSandboxes)
        .where(eq(cccSandboxes.id, input.id));
      if (!existing) throw new Error("Sandbox not found");

      const [updated] = await db
        .update(cccSandboxes)
        .set({ branchStatus: input.branchStatus, updatedAt: now })
        .where(eq(cccSandboxes.id, input.id))
        .returning();

      await broadcast(
        "updateSandboxStatus",
        updated.moduleName,
        input.userName ?? "System",
        { branchStatus: input.branchStatus },
      );
      return updated;
    }),

  approveMerge: publicProcedure
    .input(
      z.object({
        id: z.number(),
        userName: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const [sandbox] = await db
        .select()
        .from(cccSandboxes)
        .where(eq(cccSandboxes.id, input.id));
      if (!sandbox) throw new Error("Sandbox not found");
      if (sandbox.branchStatus !== "READY_FOR_MERGE") {
        throw new Error("Branch must be READY_FOR_MERGE before approval");
      }

      const now = new Date().toISOString();
      const [updated] = await db
        .update(cccSandboxes)
        .set({ managerApproved: true, updatedAt: now })
        .where(eq(cccSandboxes.id, input.id))
        .returning();

      await broadcast("approveMerge", updated.moduleName, input.userName ?? "Manager");
      return updated;
    }),

  // ─── Track 2: Equipment Commissioning Rooms ───────────────────────────────

  listRooms: publicProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(cccRooms).orderBy(cccRooms.id);
  }),

  claimRoom: publicProcedure
    .input(
      z.object({
        id: z.number(),
        engineerName: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const [room] = await db
        .select()
        .from(cccRooms)
        .where(eq(cccRooms.id, input.id));
      if (!room) throw new Error("Room not found");
      if (room.testStatus === "PASSED")
        throw new Error("Cannot claim a sub-system that already passed");
      if (room.engineerAssigned && room.engineerAssigned !== input.engineerName) {
        throw new Error(`Already claimed by ${room.engineerAssigned}`);
      }

      const now = new Date().toISOString();
      const [updated] = await db
        .update(cccRooms)
        .set({
          engineerAssigned: input.engineerName,
          testStatus: "DEBUGGING",
          updatedAt: now,
        })
        .where(eq(cccRooms.id, input.id))
        .returning();

      await broadcast("claimRoom", updated.subSystem, input.engineerName);
      return updated;
    }),

  updateRoomStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        testStatus: z.enum(["IDLE", "DEBUGGING", "PASSED"]),
        userName: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const [room] = await db
        .select()
        .from(cccRooms)
        .where(eq(cccRooms.id, input.id));
      if (!room) throw new Error("Room not found");

      const now = new Date().toISOString();
      const [updated] = await db
        .update(cccRooms)
        .set({ testStatus: input.testStatus, updatedAt: now })
        .where(eq(cccRooms.id, input.id))
        .returning();

      await broadcast(
        "updateRoomStatus",
        updated.subSystem,
        input.userName ?? room.engineerAssigned ?? "System",
        { testStatus: input.testStatus },
      );
      return updated;
    }),

  generateCommissioningReport: publicProcedure.query(async () => {
    const db = await requireDb();
    const rooms = await db.select().from(cccRooms).orderBy(cccRooms.id);

    const totalCount = rooms.length;
    const passedCount = rooms.filter((r) => r.testStatus === "PASSED").length;
    const allPassed = totalCount > 0 && passedCount === totalCount;

    if (!allPassed) {
      return { ready: false as const, report: null, approved: false };
    }

    // Report approved when ALL rooms have reportApproved=true
    const allApproved = rooms.every((r) => r.reportApproved);

    return {
      ready: true as const,
      approved: allApproved,
      report: {
        projectName: rooms[0]?.projectName ?? "Unknown Project",
        totalSubSystems: totalCount,
        passedSubSystems: passedCount,
        generatedAt: new Date().toISOString(),
        subSystems: rooms.map((r) => ({
          name: r.subSystem,
          engineer: r.engineerAssigned,
          status: r.testStatus,
          notes: r.testNotes,
        })),
      },
    };
  }),

  approveCommissioningReport: publicProcedure
    .input(z.object({ userName: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();

      // Bulk-approve all rooms
      await db
        .update(cccRooms)
        .set({ reportApproved: true, updatedAt: now });

      await broadcast(
        "approveCommissioningReport",
        "Commissioning Report",
        input?.userName ?? "Chief Engineer",
      );
      return {
        success: true,
        approvedBy: input?.userName ?? "Chief Engineer",
        approvedAt: now,
      };
    }),

  // ─── Activity Log ─────────────────────────────────────────────────────────

  getActivityLog: publicProcedure.query(async () => {
    const db = await requireDb();
    return db
      .select()
      .from(cccActivities)
      .orderBy(desc(cccActivities.createdAt))
      .limit(50);
  }),

  // ─── Role Improvement Input ──────────────────────────────────────────────

  submitImprovement: publicProcedure
    .input(z.object({
      role: z.string().min(1),
      area: z.string().min(1),
      requirement: z.string().min(2),
      userName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Role-specific improvement analysis
      const ROLE_ANALYSIS: Record<string, { areas: string[]; prompt: string }> = {
        "HR Manager": {
          areas: ["招聘流程", "绩效考核", "培训体系", "薪酬福利", "员工关系", "组织发展"],
          prompt: "HR管理改进专家，擅长人力资源流程优化、绩效体系设计、组织效能提升",
        },
        Admin: {
          areas: ["系统权限", "数据安全", "流程审批", "IT基础设施", "合规管理", "系统集成"],
          prompt: "系统管理改进专家，擅长权限体系、安全策略、系统架构优化",
        },
        Sales: {
          areas: ["客户管理", "销售漏斗", "报价流程", "渠道管理", "售后服务", "市场分析"],
          prompt: "销售管理改进专家，擅长CRM优化、销售流程提效、客户体验提升",
        },
      };

      const roleConfig = ROLE_ANALYSIS[input.role] || {
        areas: ["通用流程"],
        prompt: "通用管理改进专家",
      };

      // Generate improvement plan (algorithmic — no LLM dependency)
      const priorityKeywords: Record<string, string[]> = {
        high: ["紧急", "严重", "立即", "关键", "阻塞", "urgent", "critical", "blocking"],
        medium: ["优化", "改善", "提升", "增强", "improve", "enhance", "optimize"],
        low: ["建议", "考虑", "未来", "长期", "suggest", "consider", "future"],
      };

      let priority: "high" | "medium" | "low" = "medium";
      const reqLower = input.requirement.toLowerCase();
      if (priorityKeywords.high.some(k => reqLower.includes(k))) priority = "high";
      else if (priorityKeywords.low.some(k => reqLower.includes(k))) priority = "low";

      // Generate actionable steps based on area + requirement
      const steps = [
        `1. 现状分析: 对"${input.area}"进行全面诊断，识别${input.requirement.slice(0, 20)}相关的关键痛点`,
        `2. 方案设计: 制定针对性改进方案，明确目标指标与验收标准`,
        `3. 资源评估: 评估所需人力、预算和时间投入`,
        `4. 试点执行: 选择1个部门/场景进行小范围试点验证`,
        `5. 效果评估: 对比改进前后数据，量化改进效果`,
        `6. 全面推广: 试点成功后制定推广计划并固化为标准流程`,
      ];

      const estimatedDays = priority === "high" ? "7-14天" : priority === "medium" ? "14-30天" : "30-60天";

      const result = {
        role: input.role,
        area: input.area,
        requirement: input.requirement,
        priority,
        steps,
        estimatedDays,
        assignedTo: `${input.role}团队`,
        status: "待执行",
        createdAt: new Date().toISOString(),
      };

      // Save to activity log
      const entry = await broadcast(
        "submitImprovement",
        `[${input.role}] ${input.area}: ${input.requirement.slice(0, 60)}`,
        input.userName ?? input.role,
        result,
      );

      return { id: entry.id, ...result };
    }),

  listImprovements: publicProcedure
    .input(z.object({ role: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(cccActivities)
        .where(eq(cccActivities.action, "submitImprovement"))
        .orderBy(desc(cccActivities.createdAt))
        .limit(30);

      const items = rows.map(r => ({
        id: r.id,
        userName: r.userName,
        target: r.target,
        data: r.extraData as Record<string, any> | null,
        createdAt: r.createdAt,
      }));

      if (input?.role) {
        return items.filter(i => i.data?.role === input.role);
      }
      return items;
    }),

  // ─── Seed Demo Data ───────────────────────────────────────────────────────

  seedDemoData: publicProcedure.mutation(async () => {
    const db = await requireDb();

    // Clear existing data
    await db.delete(cccActivities);
    await db.delete(cccRooms);
    await db.delete(cccSandboxes);

    // Track 1: Software Dev Sandboxes
    await db.insert(cccSandboxes).values([
      {
        moduleName: "Finance",
        assignedAiAgent: "Claude Agent 1",
        branchName: "feature/finance-v2",
        branchStatus: "TESTING",
        managerApproved: false,
      },
      {
        moduleName: "HR",
        assignedAiAgent: "Claude Agent 2",
        branchName: "feature/hr-onboarding",
        branchStatus: "ISOLATED",
        managerApproved: false,
      },
      {
        moduleName: "Quality",
        assignedAiAgent: "Gemini Planner",
        branchName: "feature/quality-spc-upgrade",
        branchStatus: "READY_FOR_MERGE",
        managerApproved: false,
      },
      {
        moduleName: "Supply Chain",
        assignedAiAgent: "Claude Agent 3",
        branchName: "feature/scm-traceability",
        branchStatus: "ISOLATED",
        managerApproved: false,
      },
    ]);

    // Track 2: Equipment Commissioning Rooms
    await db.insert(cccRooms).values([
      {
        projectName: "SAIC New Energy Cleaning Line",
        subSystem: "Conveyor Belt System",
        engineerAssigned: "张工",
        testStatus: "PASSED",
        testNotes: "Conveyor speed calibration complete. Passed FAT.",
        reportApproved: false,
      },
      {
        projectName: "SAIC New Energy Cleaning Line",
        subSystem: "Ultrasonic Generator",
        engineerAssigned: "李工",
        testStatus: "DEBUGGING",
        testNotes: "Frequency drift at 40kHz — investigating transducer.",
        reportApproved: false,
      },
      {
        projectName: "SAIC New Energy Cleaning Line",
        subSystem: "Drying System",
        engineerAssigned: null,
        testStatus: "IDLE",
        testNotes: null,
        reportApproved: false,
      },
      {
        projectName: "SAIC New Energy Cleaning Line",
        subSystem: "Filtration Unit",
        engineerAssigned: null,
        testStatus: "IDLE",
        testNotes: null,
        reportApproved: false,
      },
      {
        projectName: "SAIC New Energy Cleaning Line",
        subSystem: "PLC Control Panel",
        engineerAssigned: "王工",
        testStatus: "DEBUGGING",
        testNotes: "Ladder logic mismatch on drying cycle timer.",
        reportApproved: false,
      },
    ]);

    // Sample activity entries
    await db.insert(cccActivities).values([
      { action: "claimRoom", target: "Conveyor Belt System", userName: "张工" },
      { action: "updateRoomStatus", target: "Conveyor Belt System", userName: "张工" },
      { action: "claimRoom", target: "Ultrasonic Generator", userName: "李工" },
      { action: "updateSandboxStatus", target: "Finance", userName: "System" },
    ]);

    return { success: true, message: "Demo data seeded: 4 sandboxes, 5 rooms, 4 activities" };
  }),
});
