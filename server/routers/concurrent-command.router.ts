/**
 * 并行调试指挥中心路由 — DB-backed
 * Track 1: Software Dev Sandboxes (ccc_sandboxes)
 * Track 2: Equipment Commissioning Rooms (ccc_rooms)
 * Activity audit log (ccc_activities)
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { broadcastToWorkspace } from "../services/websocket.service";
import { requireDb } from "../db";
import {
  cccSandboxes,
  cccRooms,
  cccActivities,
  cccImprovements,
  cccImprovementUpdates,
} from "../../drizzle/concurrent-debug-schema";
import { eq, desc, and } from "drizzle-orm";

// Dedicated workspace ID for Concurrent Command Center
const CCC_WORKSPACE_ID = 9900;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function pushActivity(
  action: string,
  target: string,
  userName: string,
  extraData?: Record<string, unknown>,
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
  extra?: Record<string, unknown>,
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

  listSandboxes: protectedProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(cccSandboxes).orderBy(cccSandboxes.id);
  }),

  updateSandboxStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        branchStatus: z.enum(["ISOLATED", "TESTING", "READY_FOR_MERGE"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
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
        ctx.user.name ?? `User#${ctx.user.id}`,
        { branchStatus: input.branchStatus },
      );
      return updated;
    }),

  approveMerge: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
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

      await broadcast("approveMerge", updated.moduleName, ctx.user.name ?? `User#${ctx.user.id}`);
      return updated;
    }),

  // ─── Track 2: Equipment Commissioning Rooms ───────────────────────────────

  listRooms: protectedProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(cccRooms).orderBy(cccRooms.id);
  }),

  claimRoom: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      const [room] = await db
        .select()
        .from(cccRooms)
        .where(eq(cccRooms.id, input.id));
      if (!room) throw new Error("Room not found");
      if (room.testStatus === "PASSED")
        throw new Error("Cannot claim a sub-system that already passed");
      const engineerName = ctx.user.name ?? `User#${ctx.user.id}`;
      if (room.engineerAssigned && room.engineerAssigned !== engineerName) {
        throw new Error(`Already claimed by ${room.engineerAssigned}`);
      }

      const now = new Date().toISOString();
      const [updated] = await db
        .update(cccRooms)
        .set({
          engineerAssigned: engineerName,
          testStatus: "DEBUGGING",
          updatedAt: now,
        })
        .where(eq(cccRooms.id, input.id))
        .returning();

      await broadcast("claimRoom", updated.subSystem, engineerName);
      return updated;
    }),

  updateRoomStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        testStatus: z.enum(["IDLE", "DEBUGGING", "PASSED"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
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
        ctx.user.name ?? `User#${ctx.user.id}`,
        { testStatus: input.testStatus },
      );
      return updated;
    }),

  generateCommissioningReport: protectedProcedure.query(async () => {
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

  approveCommissioningReport: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await requireDb();
      const now = new Date().toISOString();

      // Bulk-approve all rooms
      await db
        .update(cccRooms)
        .set({ reportApproved: true, updatedAt: now });

      await broadcast(
        "approveCommissioningReport",
        "Commissioning Report",
        ctx.user.name ?? `User#${ctx.user.id}`,
      );
      return {
        success: true,
        approvedBy: ctx.user.name ?? `User#${ctx.user.id}`,
        approvedAt: now,
      };
    }),

  // ─── Activity Log ─────────────────────────────────────────────────────────

  getActivityLog: protectedProcedure.query(async () => {
    const db = await requireDb();
    return db
      .select()
      .from(cccActivities)
      .orderBy(desc(cccActivities.createdAt))
      .limit(50);
  }),

  // ─── Role Improvement Input ──────────────────────────────────────────────

  submitImprovement: protectedProcedure
    .input(z.object({
      role: z.string().min(1),
      area: z.string().min(1),
      requirement: z.string().min(2),
    }))
    .mutation(async ({ input, ctx }) => {
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
        ctx.user.name ?? `User#${ctx.user.id}`,
        result,
      );

      return { id: entry.id, ...result };
    }),

  listImprovements: protectedProcedure
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
        data: r.extraData as Record<string, unknown> | null,
        createdAt: r.createdAt,
      }));

      if (input?.role) {
        return items.filter(i => i.data?.role === input.role);
      }
      return items;
    }),

  // ─── Improvement Lifecycle (V2 — 6-step closed-loop) ────────────────────

  createImprovement: protectedProcedure
    .input(z.object({
      role: z.string().min(1),
      area: z.string().min(1),
      requirement: z.string().min(2),
      assignedTo: z.string().optional(),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // Priority detection
      const priorityKeywords: Record<string, string[]> = {
        high: ["紧急", "严重", "立即", "关键", "阻塞", "urgent", "critical", "blocking"],
        medium: ["优化", "改善", "提升", "增强", "improve", "enhance", "optimize"],
        low: ["建议", "考虑", "未来", "长期", "suggest", "consider", "future"],
      };
      let priority: "high" | "medium" | "low" = "medium";
      const reqLower = input.requirement.toLowerCase();
      if (priorityKeywords.high.some(k => reqLower.includes(k))) priority = "high";
      else if (priorityKeywords.low.some(k => reqLower.includes(k))) priority = "low";

      // Generate 6 steps
      const steps = [
        { label: "现状分析", desc: `对"${input.area}"进行全面诊断，识别${input.requirement.slice(0, 20)}相关的关键痛点`, done: false },
        { label: "方案设计", desc: "制定针对性改进方案，明确目标指标与验收标准", done: false },
        { label: "资源评估", desc: "评估所需人力、预算和时间投入", done: false },
        { label: "试点执行", desc: "选择1个部门/场景进行小范围试点验证", done: false },
        { label: "效果评估", desc: "对比改进前后数据，量化改进效果", done: false },
        { label: "全面推广", desc: "试点成功后制定推广计划并固化为标准流程", done: false },
      ];

      const estimatedDays = priority === "high" ? "7-14天" : priority === "medium" ? "14-30天" : "30-60天";
      const assignedTo = input.assignedTo || `${input.role}团队`;

      // Auto due date based on priority
      let dueDate = input.dueDate;
      if (!dueDate) {
        const d = new Date();
        d.setDate(d.getDate() + (priority === "high" ? 14 : priority === "medium" ? 30 : 60));
        dueDate = d.toISOString().slice(0, 10);
      }

      const now = new Date().toISOString();
      const [row] = await db.insert(cccImprovements).values({
        role: input.role,
        area: input.area,
        requirement: input.requirement,
        priority,
        status: "submitted",
        steps,
        estimatedDays,
        assignedTo,
        dueDate,
        completionPct: 0,
        createdBy: ctx.user.name ?? `User#${ctx.user.id}`,
        createdAt: now,
        updatedAt: now,
      }).returning();

      // First update record
      await db.insert(cccImprovementUpdates).values({
        improvementId: row.id,
        stepNumber: 0,
        action: "create",
        content: `创建改进需求: ${input.area} — ${input.requirement.slice(0, 80)}`,
        userName: ctx.user.name ?? `User#${ctx.user.id}`,
      });

      // Activity log + broadcast for compatibility
      await broadcast(
        "createImprovement",
        `[${input.role}] ${input.area}: ${input.requirement.slice(0, 60)}`,
        ctx.user.name ?? `User#${ctx.user.id}`,
        { improvementId: row.id, priority, area: input.area },
      );

      return row;
    }),

  getImprovement: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [imp] = await db.select().from(cccImprovements).where(eq(cccImprovements.id, input.id));
      if (!imp) throw new Error("Improvement not found");

      const updates = await db.select().from(cccImprovementUpdates)
        .where(eq(cccImprovementUpdates.improvementId, input.id))
        .orderBy(cccImprovementUpdates.createdAt);

      return { ...imp, updates };
    }),

  listImprovementsV2: protectedProcedure
    .input(z.object({
      role: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input?.role) conditions.push(eq(cccImprovements.role, input.role));
      if (input?.status) conditions.push(eq(cccImprovements.status, input.status));

      const query = db.select().from(cccImprovements)
        .orderBy(desc(cccImprovements.createdAt))
        .limit(input?.limit ?? 50);

      if (conditions.length > 0) {
        return query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
      }
      return query;
    }),

  updateProgress: protectedProcedure
    .input(z.object({
      id: z.number(),
      stepNumber: z.number().min(1).max(6),
      content: z.string().min(1),
      completionPct: z.number().min(0).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      const [imp] = await db.select().from(cccImprovements).where(eq(cccImprovements.id, input.id));
      if (!imp) throw new Error("Improvement not found");
      if (!["submitted", "assigned", "in_progress"].includes(imp.status)) {
        throw new Error(`Cannot update progress: status is "${imp.status}"`);
      }

      // Mark step as done in JSON
      const steps = Array.isArray(imp.steps) ? [...(imp.steps as any[])] : [];
      if (steps[input.stepNumber - 1]) {
        steps[input.stepNumber - 1] = { ...steps[input.stepNumber - 1], done: true };
      }

      const now = new Date().toISOString();
      const [updated] = await db.update(cccImprovements).set({
        completionPct: input.completionPct,
        status: "in_progress",
        steps,
        updatedAt: now,
      }).where(eq(cccImprovements.id, input.id)).returning();

      await db.insert(cccImprovementUpdates).values({
        improvementId: input.id,
        stepNumber: input.stepNumber,
        action: "progress",
        content: input.content,
        userName: ctx.user.name ?? `User#${ctx.user.id}`,
      });

      await broadcast(
        "updateProgress",
        `[${imp.role}] ${imp.area} — 步骤${input.stepNumber}: ${input.content.slice(0, 40)}`,
        ctx.user.name ?? `User#${ctx.user.id}`,
        { improvementId: input.id, completionPct: input.completionPct },
      );

      return updated;
    }),

  submitResult: protectedProcedure
    .input(z.object({
      id: z.number(),
      resultSummary: z.string().min(1),
      resultEvidence: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      const [imp] = await db.select().from(cccImprovements).where(eq(cccImprovements.id, input.id));
      if (!imp) throw new Error("Improvement not found");

      const now = new Date().toISOString();
      const [updated] = await db.update(cccImprovements).set({
        status: "completed",
        resultSummary: input.resultSummary,
        resultEvidence: (input.resultEvidence as Record<string, unknown> | undefined) ?? null,
        completionPct: 100,
        updatedAt: now,
      }).where(eq(cccImprovements.id, input.id)).returning();

      await db.insert(cccImprovementUpdates).values({
        improvementId: input.id,
        stepNumber: 0,
        action: "submit_result",
        content: input.resultSummary,
        evidenceData: input.resultEvidence ?? null,
        userName: ctx.user.name ?? `User#${ctx.user.id}`,
      });

      await broadcast(
        "submitResult",
        `[${imp.role}] ${imp.area} — 已提交改进结果`,
        ctx.user.name ?? `User#${ctx.user.id}`,
        { improvementId: input.id },
      );

      return updated;
    }),

  verifyImprovement: protectedProcedure
    .input(z.object({
      id: z.number(),
      approved: z.boolean(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      const [imp] = await db.select().from(cccImprovements).where(eq(cccImprovements.id, input.id));
      if (!imp) throw new Error("Improvement not found");

      const now = new Date().toISOString();

      if (input.approved) {
        const [updated] = await db.update(cccImprovements).set({
          status: "verified",
          verifiedBy: ctx.user.name ?? `User#${ctx.user.id}`,
          verifiedAt: now,
          updatedAt: now,
        }).where(eq(cccImprovements.id, input.id)).returning();

        await db.insert(cccImprovementUpdates).values({
          improvementId: input.id,
          stepNumber: 0,
          action: "verify",
          content: input.comment || "验收通过",
          userName: ctx.user.name ?? `User#${ctx.user.id}`,
        });

        await broadcast("verifyImprovement", `[${imp.role}] ${imp.area} — 验收通过`, ctx.user.name ?? `User#${ctx.user.id}`, { improvementId: input.id });
        return updated;
      } else {
        // Reject — back to in_progress
        const [updated] = await db.update(cccImprovements).set({
          status: "in_progress",
          completionPct: Math.max((imp.completionPct ?? 0) - 20, 0),
          updatedAt: now,
        }).where(eq(cccImprovements.id, input.id)).returning();

        await db.insert(cccImprovementUpdates).values({
          improvementId: input.id,
          stepNumber: 0,
          action: "reject",
          content: input.comment || "打回修改",
          userName: ctx.user.name ?? `User#${ctx.user.id}`,
        });

        await broadcast("verifyImprovement", `[${imp.role}] ${imp.area} — 打回修改`, ctx.user.name ?? `User#${ctx.user.id}`, { improvementId: input.id });
        return updated;
      }
    }),

  improvementStats: protectedProcedure
    .input(z.object({ role: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();

      const conditions = input?.role ? eq(cccImprovements.role, input.role) : undefined;
      const rows = await db.select({ status: cccImprovements.status })
        .from(cccImprovements)
        .where(conditions);

      const counts = { submitted: 0, assigned: 0, in_progress: 0, completed: 0, verified: 0, closed: 0 };
      for (const r of rows) {
        if (r.status in counts) counts[r.status as keyof typeof counts]++;
      }
      return counts;
    }),

  // ─── Seed Demo Data ───────────────────────────────────────────────────────

  seedDemoData: protectedProcedure.mutation(async () => {
    const db = await requireDb();

    // Clear existing data (including improvement lifecycle tables)
    await db.delete(cccImprovementUpdates);
    await db.delete(cccImprovements);
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

    // Sample improvement lifecycle data
    const now = new Date().toISOString();
    const makeSteps = (area: string, req: string) => [
      { label: "现状分析", desc: `对"${area}"进行全面诊断，识别${req.slice(0, 20)}相关的关键痛点`, done: false },
      { label: "方案设计", desc: "制定针对性改进方案，明确目标指标与验收标准", done: false },
      { label: "资源评估", desc: "评估所需人力、预算和时间投入", done: false },
      { label: "试点执行", desc: "选择1个部门/场景进行小范围试点验证", done: false },
      { label: "效果评估", desc: "对比改进前后数据，量化改进效果", done: false },
      { label: "全面推广", desc: "试点成功后制定推广计划并固化为标准流程", done: false },
    ];

    const stepsInProgress = (area: string, req: string) => {
      const s = makeSteps(area, req);
      s[0].done = true;
      s[1].done = true;
      return s;
    };

    const stepsCompleted = (area: string, req: string) => {
      const s = makeSteps(area, req);
      s.forEach(st => st.done = true);
      return s;
    };

    const dueHigh = new Date(); dueHigh.setDate(dueHigh.getDate() + 14);
    const dueMed = new Date(); dueMed.setDate(dueMed.getDate() + 30);

    const [imp1] = await db.insert(cccImprovements).values({
      role: "HR Manager", area: "绩效考核", requirement: "紧急优化绩效考核流程，当前考核周期过长导致反馈滞后",
      priority: "high", status: "in_progress", steps: stepsInProgress("绩效考核", "紧急优化绩效考核流程"),
      estimatedDays: "7-14天", assignedTo: "HR Manager团队", dueDate: dueHigh.toISOString().slice(0, 10),
      completionPct: 35, createdBy: "王经理", createdAt: now, updatedAt: now,
    }).returning();

    const [imp2] = await db.insert(cccImprovements).values({
      role: "HR Manager", area: "培训体系", requirement: "优化新员工入职培训体系，提升培训完成率和满意度",
      priority: "medium", status: "completed", steps: stepsCompleted("培训体系", "优化新员工入职培训体系"),
      estimatedDays: "14-30天", assignedTo: "培训组", dueDate: dueMed.toISOString().slice(0, 10),
      completionPct: 100, resultSummary: "培训完成率从72%提升至95%，满意度从3.2提升至4.6",
      resultEvidence: { before: "完成率72%, 满意度3.2/5", after: "完成率95%, 满意度4.6/5" },
      createdBy: "李主管", createdAt: now, updatedAt: now,
    }).returning();

    await db.insert(cccImprovements).values({
      role: "Admin", area: "系统权限", requirement: "建议梳理并优化系统权限分配流程，减少权限申请审批时间",
      priority: "low", status: "submitted", steps: makeSteps("系统权限", "建议梳理并优化系统权限分配流程"),
      estimatedDays: "30-60天", assignedTo: "Admin团队", dueDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
      completionPct: 0, createdBy: "张管理员", createdAt: now, updatedAt: now,
    });

    // Sample update records
    await db.insert(cccImprovementUpdates).values([
      { improvementId: imp1.id, stepNumber: 0, action: "create", content: "创建改进需求: 绩效考核 — 紧急优化绩效考核流程", userName: "王经理" },
      { improvementId: imp1.id, stepNumber: 1, action: "progress", content: "已完成现状调研，梳理出3个核心痛点", userName: "王经理" },
      { improvementId: imp1.id, stepNumber: 2, action: "progress", content: "初步方案已设计完成，待内部评审", userName: "王经理" },
      { improvementId: imp2.id, stepNumber: 0, action: "create", content: "创建改进需求: 培训体系 — 优化新员工入职培训体系", userName: "李主管" },
      { improvementId: imp2.id, stepNumber: 0, action: "submit_result", content: "培训完成率从72%提升至95%，满意度从3.2提升至4.6", userName: "李主管" },
    ]);

    return { success: true, message: "Demo data seeded: 4 sandboxes, 5 rooms, 4 activities, 3 improvements" };
  }),
});
