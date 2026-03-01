/**
 * 项目阶段门禁管理路由
 * M0-M12 阶段门禁管控 — Real DB implementation
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  projects, projectGates, projectMilestones,
  projectsV2, projectStagesV2,
} from "../../drizzle/schema";
import { gateChecklists } from "../../drizzle/schema";
import { redBlueConfigs, redBlueExecutions } from "../../drizzle/approval-engine-schema";
import { violationEvents } from "../../drizzle/performance-schema";
import { eq, desc, and, count, sql, lt, gte, ne, inArray } from "drizzle-orm";

// Ordered M-stage codes for index-based navigation
const M_STAGE_CODES = [
  "M0", "M1", "M2", "M3", "M4", "M5", "M6",
  "M7", "M8", "M9", "M10", "M11", "M12",
] as const;

// M阶段定义（静态参考数据）
const M_STAGE_DEFINITIONS = [
  { code: "M0", nameZh: "项目启动", nameEn: "Project Initiation", category: "INITIATION", description: "项目立项、团队组建", requiredDeliverables: ["项目章程", "团队组建表", "初步预算"] },
  { code: "M1", nameZh: "启动会", nameEn: "Kickoff Meeting", category: "INITIATION", description: "项目启动会、需求确认", requiredDeliverables: ["启动会纪要", "需求确认书", "项目计划"] },
  { code: "M2", nameZh: "需求评审", nameEn: "Requirement Review", category: "PLANNING", description: "客户需求评审、技术方案", requiredDeliverables: ["需求规格书", "技术方案", "风险评估"] },
  { code: "M3", nameZh: "方案设计", nameEn: "Solution Design", category: "PLANNING", description: "详细设计、BOM确认", requiredDeliverables: ["详细设计图", "BOM清单", "成本估算"] },
  { code: "M4", nameZh: "设计评审", nameEn: "Design Review", category: "PLANNING", description: "设计评审、采购启动", requiredDeliverables: ["设计评审报告", "采购申请", "生产计划"] },
  { code: "M5", nameZh: "生产启动", nameEn: "Production Start", category: "EXECUTION", description: "生产启动、物料齐套", requiredDeliverables: ["生产工单", "物料齐套确认", "工艺文件"] },
  { code: "M6", nameZh: "生产完成", nameEn: "Production Complete", category: "EXECUTION", description: "生产完成、厂内调试", requiredDeliverables: ["生产完工报告", "调试记录", "质检报告"] },
  { code: "M7", nameZh: "FAT验收", nameEn: "Factory Acceptance Test", category: "VERIFICATION", description: "工厂验收测试", requiredDeliverables: ["FAT测试报告", "问题清单", "整改记录"] },
  { code: "M8", nameZh: "发货准备", nameEn: "Shipping Preparation", category: "DELIVERY", description: "包装发货准备", requiredDeliverables: ["包装清单", "发货通知", "运输方案"] },
  { code: "M9", nameZh: "现场到货", nameEn: "Site Arrival", category: "DELIVERY", description: "设备到达现场", requiredDeliverables: ["到货确认单", "开箱检验报告", "就位计划"] },
  { code: "M10", nameZh: "现场安装", nameEn: "Site Installation", category: "DELIVERY", description: "现场安装调试", requiredDeliverables: ["安装记录", "调试记录", "培训记录"] },
  { code: "M11", nameZh: "SAT验收", nameEn: "Site Acceptance Test", category: "VERIFICATION", description: "现场验收测试", requiredDeliverables: ["SAT测试报告", "验收签字", "遗留问题清单"] },
  { code: "M12", nameZh: "项目关闭", nameEn: "Project Closure", category: "CLOSURE", description: "项目关闭、经验总结", requiredDeliverables: ["项目总结报告", "经验教训", "客户满意度"] },
];

export const projectGateRouter = router({
  // 获取阶段定义列表
  getStageDefinitions: protectedProcedure.query(() => {
    return M_STAGE_DEFINITIONS;
  }),

  // 获取项目阶段列表 (from projects v1 table with gates)
  getProjectStages: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      currentStage: z.string().optional(),
      customerTier: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();

      // Get all projects with their current phase
      let projectList = await db.select().from(projects).orderBy(desc(projects.createdAt));

      if (input?.projectId) {
        projectList = projectList.filter(p => p.id === input.projectId);
      }
      if (input?.currentStage) {
        projectList = projectList.filter(p => p.currentPhase === input.currentStage);
      }

      // Get gates for all projects to build stage data
      const allGates = await db.select().from(projectGates);

      return projectList.map(p => {
        const projectGateList = allGates.filter(g => g.projectId === p.id);
        const stages = M_STAGE_DEFINITIONS.map(def => {
          const gate = projectGateList.find(g => g.phaseCode === def.code);
          let status = "NOT_STARTED";
          if (gate) {
            if (gate.status === "approved") status = "COMPLETED";
            else if (gate.status === "in_review") status = "IN_PROGRESS";
            else if (gate.status === "rejected") status = "FAILED";
            else status = "NOT_STARTED";
          }
          if (p.currentPhase === def.code && status === "NOT_STARTED") {
            status = "IN_PROGRESS";
          }
          return {
            code: def.code,
            status,
            completedDate: gate?.actualDate || null,
            score: gate?.checklistCompleted && gate?.checklistTotal
              ? Math.round((gate.checklistCompleted / gate.checklistTotal) * 100)
              : null,
          };
        });

        const currentIdx = M_STAGE_DEFINITIONS.findIndex(d => d.code === p.currentPhase);
        const stageProgress = currentIdx >= 0 ? Math.round((currentIdx / 12) * 100) : 0;

        return {
          id: p.id,
          projectId: p.id,
          projectName: p.name,
          projectNo: p.projectCode || `PRJ-${p.id}`,
          currentStage: p.currentPhase || "M0",
          stageStatus: "IN_PROGRESS",
          stageProgress,
          plannedStartDate: p.plannedStartDate,
          plannedEndDate: p.plannedEndDate,
          actualStartDate: p.actualStartDate,
          actualEndDate: p.actualEndDate,
          projectManager: p.managerId ? `用户${p.managerId}` : null,
          stages,
        };
      });
    }),

  // 获取项目阶段详情
  getProjectStageDetail: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
      if (!project) throw new Error("项目不存在");

      const gates = await db.select().from(projectGates).where(eq(projectGates.projectId, input.projectId));

      const stagesWithDefinition = M_STAGE_DEFINITIONS.map(def => {
        const gate = gates.find(g => g.phaseCode === def.code);
        let status = "NOT_STARTED";
        if (gate) {
          if (gate.status === "approved") status = "COMPLETED";
          else if (gate.status === "in_review") status = "IN_PROGRESS";
          else if (gate.status === "rejected") status = "FAILED";
        }
        if (project.currentPhase === def.code && status === "NOT_STARTED") {
          status = "IN_PROGRESS";
        }
        return {
          code: def.code,
          status,
          completedDate: gate?.actualDate || null,
          score: gate?.checklistCompleted && gate?.checklistTotal
            ? Math.round((gate.checklistCompleted / gate.checklistTotal) * 100)
            : null,
          nameZh: def.nameZh,
          nameEn: def.nameEn,
          category: def.category,
          description: def.description,
          requiredDeliverables: def.requiredDeliverables,
        };
      });

      const currentIdx = M_STAGE_DEFINITIONS.findIndex(d => d.code === project.currentPhase);
      return {
        id: project.id,
        projectId: project.id,
        projectName: project.name,
        projectNo: project.projectCode || `PRJ-${project.id}`,
        currentStage: project.currentPhase || "M0",
        stageStatus: "IN_PROGRESS",
        stageProgress: currentIdx >= 0 ? Math.round((currentIdx / 12) * 100) : 0,
        plannedStartDate: project.plannedStartDate,
        plannedEndDate: project.plannedEndDate,
        actualStartDate: project.actualStartDate,
        actualEndDate: project.actualEndDate,
        stages: stagesWithDefinition,
      };
    }),

  // 获取门禁检查项 (from gateChecklists table)
  getGateChecklist: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      stageCode: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(gateChecklists)
        .where(and(
          eq(gateChecklists.projectId, input.projectId),
          eq(gateChecklists.gateStage, input.stageCode),
        ))
        .orderBy(gateChecklists.sortOrder);
      return items.map(item => ({
        id: item.id,
        projectId: Number(item.projectId),
        stageCode: item.gateStage,
        checkItem: item.checkItem,
        category: item.category || "GENERAL",
        isRequired: item.isMandatory,
        status: item.status === "verified" ? "PASSED" : item.status === "not_started" ? "NOT_STARTED" : "IN_PROGRESS",
        checkedBy: item.verifiedBy ? `用户${item.verifiedBy}` : null,
        checkedAt: item.verifiedAt ? new Date(item.verifiedAt as unknown as string).toISOString().split("T")[0] : null,
        evidence: item.notes,
      }));
    }),

  // 更新门禁检查项状态
  updateChecklistItem: protectedProcedure
    .input(z.object({
      checklistId: z.number(),
      status: z.enum(["NOT_STARTED", "IN_PROGRESS", "PASSED", "FAILED", "WAIVED"]),
      evidence: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const dbStatus = input.status === "PASSED" ? "verified"
        : input.status === "NOT_STARTED" ? "not_started"
        : input.status === "WAIVED" ? "waived"
        : "in_progress";
      await db.update(gateChecklists)
        .set({
          status: dbStatus,
          notes: input.notes || input.evidence,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(gateChecklists.id, input.checklistId));
      return { success: true, message: "检查项状态已更新" };
    }),

  // 申请阶段通过
  requestGatePass: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      stageCode: z.string(),
      summary: z.string(),
      attachments: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      // Check if gate record exists for this project+stage
      const existing = await db.select().from(projectGates)
        .where(and(
          eq(projectGates.projectId, input.projectId),
          eq(projectGates.phaseCode, input.stageCode),
        ));

      // Embed requestor ID in remark for self-approval prevention
      const remarkWithRequestor = `[REQ:${ctx.user.id}] ${input.summary}`;

      if (existing.length > 0) {
        // Update existing gate to in_review
        await db.update(projectGates)
          .set({
            status: "in_review",
            remark: remarkWithRequestor,
            attachments: input.attachments ? JSON.stringify(input.attachments) : undefined,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(projectGates.id, existing[0].id));
        return { success: true, requestId: existing[0].id, message: "门禁通过申请已提交" };
      } else {
        // Create new gate record
        const stageDef = M_STAGE_DEFINITIONS.find(d => d.code === input.stageCode);
        const [gate] = await db.insert(projectGates).values({
          projectId: input.projectId,
          phaseCode: input.stageCode,
          name: stageDef?.nameZh || input.stageCode,
          status: "in_review",
          remark: remarkWithRequestor,
          attachments: input.attachments ? JSON.stringify(input.attachments) : undefined,
        }).returning();
        return { success: true, requestId: gate.id, message: "门禁通过申请已提交" };
      }
    }),

  // 审批阶段通过
  approveGatePass: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      expectedVersion: z.number().optional(),
      approved: z.boolean(),
      score: z.number().min(0).max(100).optional(),
      comments: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // Optimistic lock check on gate record
      if (input.expectedVersion !== undefined) {
        const [current] = await db.select({ version: projectGates.version }).from(projectGates).where(eq(projectGates.id, input.requestId));
        if (current && current.version !== input.expectedVersion) {
          throw new TRPCError({ code: "CONFLICT", message: "版本冲突：门禁记录已被他人修改，请刷新后重试" });
        }
      }

      // Fetch gate to validate
      const [gate] = await db.select().from(projectGates).where(eq(projectGates.id, input.requestId));
      if (!gate) throw new TRPCError({ code: "NOT_FOUND", message: "Gate record not found" });

      // Status guard: only in_review gates can be approved/rejected
      if (gate.status !== "in_review" && gate.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `门禁状态为 ${gate.status}，无法审批` });
      }

      // Self-approval prevention: extract requestor ID from remark [REQ:N]
      const reqMatch = gate.remark?.match(/\[REQ:(\d+)\]/);
      if (reqMatch && Number(reqMatch[1]) === ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "不能审批自己提交的门禁申请" });
      }

      // ── Checklist enforcement (W2-02 hardening) ──
      if (input.approved) {
        const checklistItems = await db.select().from(gateChecklists)
          .where(and(
            eq(gateChecklists.projectId, gate.projectId),
            eq(gateChecklists.gateStage, gate.phaseCode),
          ));

        const mandatoryItems = checklistItems.filter(i => i.isMandatory);
        const failed = mandatoryItems.filter(i => i.status === "failed");
        const notReady = mandatoryItems.filter(i => i.status !== "verified" && i.status !== "waived" && i.status !== "failed");

        if (failed.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `无法批准：${failed.length} 个必填检查项未通过 (${failed.map(i => i.checkItem).join(", ")})`,
          });
        }
        if (notReady.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `无法批准：${notReady.length} 个必填检查项尚未完成验证 (${notReady.map(i => i.checkItem).join(", ")})`,
          });
        }
      }

      // Atomic status guard: WHERE status IN ('in_review','pending') prevents race
      const [updatedGate] = await db.update(projectGates)
        .set({
          status: input.approved ? "approved" : "rejected",
          actualDate: input.approved ? new Date().toISOString() : undefined,
          approverId: ctx.user.id,
          approvalComment: input.comments,
          updatedAt: new Date().toISOString(),
          version: sql`${projectGates.version} + 1`,
        })
        .where(and(
          eq(projectGates.id, input.requestId),
          inArray(projectGates.status, ["in_review", "pending"]),
        ))
        .returning();

      if (!updatedGate) {
        throw new TRPCError({ code: "CONFLICT", message: "门禁状态已变更，请刷新后重试" });
      }

      // If approved, advance project to next phase (reuse `gate` fetched above)
      if (input.approved) {
        const currentIdx = M_STAGE_DEFINITIONS.findIndex(d => d.code === gate.phaseCode);
        if (currentIdx >= 0 && currentIdx < M_STAGE_DEFINITIONS.length - 1) {
          const nextPhase = M_STAGE_DEFINITIONS[currentIdx + 1].code;
          await db.update(projects)
            .set({ currentPhase: nextPhase, updatedAt: new Date().toISOString() })
            .where(eq(projects.id, gate.projectId));

          // M12 auto-trigger: create after-sales equipment + warranty record
          if (nextPhase === "M12") {
            try {
              const { afterSalesClients, afterSalesEquipments } = await import("../../drizzle/schema");
              const projectInfo = await db.select().from(projects)
                .where(eq(projects.id, gate.projectId)).limit(1);
              const proj = projectInfo[0];

              if (proj) {
                const existingClients = await db.select().from(afterSalesClients)
                  .where(eq(afterSalesClients.name, proj.name ?? ""));

                let clientId: number;
                if (existingClients.length > 0) {
                  clientId = existingClients[0].id;
                } else {
                  const [newClient] = await db.insert(afterSalesClients).values({
                    name: proj.name || `Project #${proj.id}`,
                    tier: "standard",
                    contactPerson: "",
                    slaLevel: "standard",
                    responseTimeHours: 48,
                    status: "active",
                  }).returning();
                  clientId = newClient.id;
                }

                const warrantyEnd = new Date();
                warrantyEnd.setFullYear(warrantyEnd.getFullYear() + 1);

                await db.insert(afterSalesEquipments).values({
                  serialNumber: `EQ-${proj.projectCode || proj.id}-001`,
                  modelName: proj.name || "清洗设备",
                  clientId,
                  equipmentType: "cleaning_line",
                  installationDate: new Date().toISOString(),
                  warrantyEndDate: warrantyEnd.toISOString(),
                  maintenanceCycleMonths: 3,
                  operationalStatus: "running",
                  status: "active",
                }).returning();

                console.log(`[ProjectGate:V1] M12 reached for project ${gate.projectId} — after-sales equipment + warranty created`);
              }
            } catch (e: any) {
              console.warn(`[ProjectGate:V1] M12 after-sales auto-trigger failed:`, e.message);
            }
          }
        }
      }

      // FAT/SAT failure → red-line violation event (reuse `gate` fetched above)
      if (!input.approved) {
        try {
          if (gate.phaseCode === "M7" || gate.phaseCode === "M11") {
            const severity = gate.phaseCode === "M11" ? "CRITICAL" : "MAJOR";
            const label = gate.phaseCode === "M7" ? "FAT" : "SAT";
            await db.insert(violationEvents).values({
              projectId: gate.projectId,
              eventType: "quality_defect",
              severity,
              sourceModule: "projectGate",
              title: `${label}测试未通过 — ${gate.phaseCode}阶段被退回`,
              description: `项目门禁${gate.phaseCode}(${label})审批被拒绝。${input.comments || ""}`,
              status: "open",
            });
            console.log(`[ProjectGate] ${label} rejection → violation event (${severity}) for project ${gate.projectId}`);
          }
        } catch (violationErr) {
          console.error("[ProjectGate] Failed to create violation event:", violationErr);
        }
      }

      return { success: true, message: input.approved ? "门禁已批准通过" : "门禁申请已退回" };
    }),

  // 获取红蓝对抗记录
  getRedBlueRecords: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      stageCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const configs = await db.select().from(redBlueConfigs)
        .where(eq(redBlueConfigs.projectId, input.projectId));

      return configs.map(cfg => ({
        id: cfg.id,
        projectId: cfg.projectId,
        stageCode: (cfg.results as any)?.stageCode || "M4",
        redTeamLeader: cfg.redTeamLeaderName || `用户${cfg.redTeamLeaderId}`,
        blueTeamLeader: cfg.blueTeamLeaderName || `用户${cfg.blueTeamLeaderId}`,
        scheduledDate: cfg.createdAt ? new Date(cfg.createdAt).toISOString().split("T")[0] : null,
        status: (cfg.status || "draft").toUpperCase(),
        redTeamFindings: (cfg.results as any)?.redTeamFindings || [],
        blueTeamResponses: (cfg.results as any)?.blueTeamResponses || [],
        overallScore: (cfg.results as any)?.overallScore || 0,
        recommendation: cfg.lessonsLearned || "",
      }));
    }),

  // 创建红蓝对抗
  createRedBlueSession: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      stageCode: z.string(),
      redTeamLeader: z.string(),
      blueTeamLeader: z.string(),
      scheduledDate: z.string(),
      objectives: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const configCode = `RB-${input.projectId}-${input.stageCode}-${Date.now().toString(36)}`;
      const [config] = await db.insert(redBlueConfigs).values({
        configCode,
        configName: `${input.stageCode} 红蓝对抗`,
        projectId: input.projectId,
        redTeamLeaderName: input.redTeamLeader,
        blueTeamLeaderName: input.blueTeamLeader,
        redTeamObjectives: input.objectives?.join("\n"),
        status: "scheduled",
        createdBy: ctx.user.id,
      }).returning();
      return { success: true, sessionId: config.id, message: "红蓝对抗会议已创建" };
    }),

  // 记录红蓝对抗结果
  recordRedBlueResult: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      redTeamFindings: z.array(z.string()),
      blueTeamResponses: z.array(z.string()),
      overallScore: z.number().min(0).max(100),
      recommendation: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(redBlueConfigs)
        .set({
          results: {
            redTeamFindings: input.redTeamFindings,
            blueTeamResponses: input.blueTeamResponses,
            overallScore: input.overallScore,
          },
          lessonsLearned: input.recommendation,
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(redBlueConfigs.id, input.sessionId));
      return { success: true, message: "红蓝对抗结果已记录" };
    }),

  // ─── W2-02: Rock-Solid Stage-Gate Transitions (V2) ──────────────────────

  /**
   * Pre-flight check: can this stage advance?
   * Validates all mandatory checklist items are verified/waived with zero failed.
   */
  validateGateReadiness: protectedProcedure
    .input(z.object({ projectId: z.number(), stageCode: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const items = await db.select().from(gateChecklists)
        .where(and(
          eq(gateChecklists.projectId, input.projectId),
          eq(gateChecklists.gateStage, input.stageCode),
        ));

      const mandatory = items.filter(i => i.isMandatory);
      const optional = items.filter(i => !i.isMandatory);
      const mandatoryPassed = mandatory.filter(i => i.status === "verified" || i.status === "waived");
      const mandatoryFailed = mandatory.filter(i => i.status === "failed");
      const mandatoryPending = mandatory.filter(i =>
        i.status !== "verified" && i.status !== "waived" && i.status !== "failed"
      );

      const reasons: string[] = [];
      if (mandatoryFailed.length > 0) {
        reasons.push(`${mandatoryFailed.length} 个必填项未通过: ${mandatoryFailed.map(i => i.checkItem).join(", ")}`);
      }
      if (mandatoryPending.length > 0) {
        reasons.push(`${mandatoryPending.length} 个必填项待验证: ${mandatoryPending.map(i => i.checkItem).join(", ")}`);
      }

      const canAdvance = mandatory.length === 0 || (mandatoryFailed.length === 0 && mandatoryPending.length === 0);
      const completionPercent = mandatory.length > 0
        ? Math.round((mandatoryPassed.length / mandatory.length) * 100)
        : 100;

      return {
        canAdvance,
        mandatoryTotal: mandatory.length,
        mandatoryPassed: mandatoryPassed.length,
        mandatoryFailed: mandatoryFailed.length,
        mandatoryPending: mandatoryPending.length,
        optionalTotal: optional.length,
        completionPercent,
        reasons,
      };
    }),

  /**
   * Enforced phase advance with full checklist validation + audit trail.
   * Works on projects_v2 / project_stages_v2 tables.
   */
  advancePhaseV2: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      currentStageCode: z.string(),
      score: z.number().min(0).max(100).optional(),
      comments: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // 1. Verify project exists and current stage matches (stale-race guard)
      const [project] = await db.select().from(projectsV2)
        .where(eq(projectsV2.id, input.projectId));
      if (!project) throw new Error("项目不存在");
      if (project.currentStage !== input.currentStageCode) {
        throw new Error(
          `阶段不匹配: 项目当前阶段为 ${project.currentStage}，请求阶段为 ${input.currentStageCode}`
        );
      }

      // 2. Cannot advance past M12
      const currentIdx = M_STAGE_CODES.indexOf(input.currentStageCode as any);
      if (currentIdx < 0) throw new Error(`无效阶段: ${input.currentStageCode}`);
      if (currentIdx >= M_STAGE_CODES.length - 1) {
        throw new Error("M12 为终结阶段，无法继续推进");
      }

      // 3. Checklist enforcement: all mandatory items must be verified/waived, zero failed
      const checklistItems = await db.select().from(gateChecklists)
        .where(and(
          eq(gateChecklists.projectId, input.projectId),
          eq(gateChecklists.gateStage, input.currentStageCode),
        ));

      const mandatory = checklistItems.filter(i => i.isMandatory);
      const failed = mandatory.filter(i => i.status === "failed");
      const notReady = mandatory.filter(i =>
        i.status !== "verified" && i.status !== "waived" && i.status !== "failed"
      );

      if (failed.length > 0) {
        throw new Error(
          `阶段推进被阻止：${failed.length} 个必填检查项未通过 (${failed.map(i => i.checkItem).join(", ")})`
        );
      }
      if (notReady.length > 0) {
        throw new Error(
          `阶段推进被阻止：${notReady.length} 个必填检查项尚未完成 (${notReady.map(i => i.checkItem).join(", ")})`
        );
      }

      const nextStageCode = M_STAGE_CODES[currentIdx + 1];
      const now = new Date().toISOString();

      // 4a. Mark current stage as Completed
      const approverName = ctx.user.name ?? `User#${ctx.user.id}`;
      const auditEntry = {
        type: "ADVANCE",
        from: input.currentStageCode,
        to: nextStageCode,
        approvedBy: approverName,
        score: input.score ?? null,
        comments: input.comments ?? null,
        timestamp: now,
      };

      // Get current stage record to append audit
      const [currentStageRow] = await db.select().from(projectStagesV2)
        .where(and(
          eq(projectStagesV2.projectId, input.projectId),
          eq(projectStagesV2.stageCode, input.currentStageCode as any),
        ));

      let existingAuditLog: any[] = [];
      if (currentStageRow?.auditLog) {
        try { existingAuditLog = JSON.parse(currentStageRow.auditLog); } catch { /* ignore */ }
      }
      existingAuditLog.push(auditEntry);

      await db.update(projectStagesV2)
        .set({
          status: "Completed" as any,
          completionPercent: 100,
          actualEndDate: now.split("T")[0],
          auditLog: JSON.stringify(existingAuditLog),
          updatedAt: now,
        })
        .where(and(
          eq(projectStagesV2.projectId, input.projectId),
          eq(projectStagesV2.stageCode, input.currentStageCode as any),
        ));

      // 4b. Mark next stage as InProgress
      await db.update(projectStagesV2)
        .set({
          status: "InProgress" as any,
          actualStartDate: now.split("T")[0],
          updatedAt: now,
        })
        .where(and(
          eq(projectStagesV2.projectId, input.projectId),
          eq(projectStagesV2.stageCode, nextStageCode as any),
        ));

      // 4c. Advance project current stage
      await db.update(projectsV2)
        .set({
          currentStage: nextStageCode as any,
          updatedAt: now,
        })
        .where(eq(projectsV2.id, input.projectId));

      // 4d. M12 auto-trigger: create after-sales warranty record + equipment entry
      let afterSalesCreated = false;
      if (nextStageCode === "M12") {
        try {
          const { afterSalesClients, afterSalesEquipments } = await import("../../drizzle/schema");

          // Look up customer info from the project
          const projectInfo = await db.select().from(projects)
            .where(eq(projects.id, input.projectId)).limit(1);
          const proj = projectInfo[0];

          if (proj) {
            // Create or look up after-sales client
            const existingClients = await db.select().from(afterSalesClients)
              .where(eq(afterSalesClients.name, proj.name ?? ""));

            let clientId: number;
            if (existingClients.length > 0) {
              clientId = existingClients[0].id;
            } else {
              const [newClient] = await db.insert(afterSalesClients).values({
                name: proj.name || `Project #${proj.id}`,
                tier: "standard",
                contactPerson: "",
                slaLevel: "standard",
                responseTimeHours: 48,
                status: "active",
              }).returning();
              clientId = newClient.id;
            }

            // Create equipment entry with 12-month warranty
            const warrantyEnd = new Date();
            warrantyEnd.setFullYear(warrantyEnd.getFullYear() + 1);

            await db.insert(afterSalesEquipments).values({
              serialNumber: `EQ-${proj.projectCode || proj.id}-001`,
              modelName: proj.name || "清洗设备",
              clientId,
              equipmentType: "cleaning_line",
              installationDate: now,
              warrantyEndDate: warrantyEnd.toISOString(),
              maintenanceCycleMonths: 3,
              operationalStatus: "running",
              status: "active",
            }).returning();

            afterSalesCreated = true;
            console.log(`[ProjectGate] M12 reached for project ${input.projectId} — after-sales equipment + warranty created`);
          }
        } catch (e: any) {
          console.warn(`[ProjectGate] M12 after-sales auto-trigger failed:`, e.message);
          // Non-blocking — gate advance still succeeds
        }
      }

      return {
        success: true,
        previousStage: input.currentStageCode,
        newStage: nextStageCode,
        audit: auditEntry,
        afterSalesCreated,
      };
    }),

  /**
   * Phase rollback with reason + audit trail.
   * Marks intermediate stages as Blocked.
   */
  regressPhaseV2: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      targetStageCode: z.string(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();

      // 1. Verify project
      const [project] = await db.select().from(projectsV2)
        .where(eq(projectsV2.id, input.projectId));
      if (!project) throw new Error("项目不存在");

      const currentIdx = M_STAGE_CODES.indexOf(project.currentStage as any);
      const targetIdx = M_STAGE_CODES.indexOf(input.targetStageCode as any);

      if (targetIdx < 0) throw new Error(`无效目标阶段: ${input.targetStageCode}`);
      if (targetIdx >= currentIdx) {
        throw new Error(
          `目标阶段 ${input.targetStageCode} 必须在当前阶段 ${project.currentStage} 之前`
        );
      }

      const now = new Date().toISOString();
      const regressorName = ctx.user.name ?? `User#${ctx.user.id}`;
      const regressAudit = {
        type: "REGRESS",
        from: project.currentStage,
        to: input.targetStageCode,
        reason: input.reason,
        regressedBy: regressorName,
        timestamp: now,
      };

      // 2. Mark all intermediate stages (target+1 through current) as Blocked
      for (let i = targetIdx + 1; i <= currentIdx; i++) {
        const stageCode = M_STAGE_CODES[i];

        const [stageRow] = await db.select().from(projectStagesV2)
          .where(and(
            eq(projectStagesV2.projectId, input.projectId),
            eq(projectStagesV2.stageCode, stageCode as any),
          ));

        let auditLog: any[] = [];
        if (stageRow?.auditLog) {
          try { auditLog = JSON.parse(stageRow.auditLog); } catch { /* ignore */ }
        }
        auditLog.push(regressAudit);

        await db.update(projectStagesV2)
          .set({
            status: "Blocked" as any,
            auditLog: JSON.stringify(auditLog),
            updatedAt: now,
          })
          .where(and(
            eq(projectStagesV2.projectId, input.projectId),
            eq(projectStagesV2.stageCode, stageCode as any),
          ));
      }

      // 3. Set target stage to InProgress with audit
      const [targetRow] = await db.select().from(projectStagesV2)
        .where(and(
          eq(projectStagesV2.projectId, input.projectId),
          eq(projectStagesV2.stageCode, input.targetStageCode as any),
        ));

      let targetAuditLog: any[] = [];
      if (targetRow?.auditLog) {
        try { targetAuditLog = JSON.parse(targetRow.auditLog); } catch { /* ignore */ }
      }
      targetAuditLog.push(regressAudit);

      await db.update(projectStagesV2)
        .set({
          status: "InProgress" as any,
          completionPercent: 0,
          auditLog: JSON.stringify(targetAuditLog),
          updatedAt: now,
        })
        .where(and(
          eq(projectStagesV2.projectId, input.projectId),
          eq(projectStagesV2.stageCode, input.targetStageCode as any),
        ));

      // 4. Update project current stage
      await db.update(projectsV2)
        .set({
          currentStage: input.targetStageCode as any,
          updatedAt: now,
        })
        .where(eq(projectsV2.id, input.projectId));

      return {
        success: true,
        previousStage: project.currentStage,
        newStage: input.targetStageCode,
        reason: input.reason,
      };
    }),

  /**
   * Full audit log of all phase transitions for a project.
   * Returns all 13 stage records with parsed auditLog events.
   */
  getPhaseTransitionHistory: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const stages = await db.select().from(projectStagesV2)
        .where(eq(projectStagesV2.projectId, input.projectId))
        .orderBy(projectStagesV2.stageCode);

      return stages.map(stage => {
        let auditEvents: any[] = [];
        if (stage.auditLog) {
          try { auditEvents = JSON.parse(stage.auditLog); } catch { /* ignore */ }
        }
        const def = M_STAGE_DEFINITIONS.find(d => d.code === stage.stageCode);
        return {
          stageCode: stage.stageCode,
          stageName: stage.stageName || def?.nameZh || stage.stageCode,
          status: stage.status,
          completionPercent: stage.completionPercent,
          plannedStartDate: stage.plannedStartDate,
          plannedEndDate: stage.plannedEndDate,
          actualStartDate: stage.actualStartDate,
          actualEndDate: stage.actualEndDate,
          auditEvents,
        };
      });
    }),

  // 获取项目阶段统计
  getStageStats: protectedProcedure.query(async () => {
    const db = await requireDb();
    const allProjects = await db.select().from(projects);

    const byStage = M_STAGE_DEFINITIONS.map(def => ({
      code: def.code,
      nameZh: def.nameZh,
      count: allProjects.filter(p => p.currentPhase === def.code).length,
    }));

    const completed = allProjects.filter(p => p.status === "completed").length;
    const active = allProjects.filter(p => p.status === "active");
    const avgProgress = active.length
      ? Math.round(active.reduce((sum, p) => sum + (p.completionPercent ?? 0), 0) / active.length)
      : 0;

    return {
      totalProjects: allProjects.length,
      byStage,
      byStatus: {
        onTrack: active.filter(p => (p.completionPercent ?? 0) >= 50).length,
        atRisk: active.filter(p => (p.completionPercent ?? 0) < 50 && (p.completionPercent ?? 0) > 0).length,
        delayed: allProjects.filter(p => p.status === "on_hold").length,
        completed,
      },
      avgProgress,
    };
  }),

  // 获取即将到期的门禁
  getUpcomingGates: protectedProcedure
    .input(z.object({ days: z.number().default(7) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const pendingGates = await db.select().from(projectGates)
        .where(eq(projectGates.status, "pending"));

      // Get associated project info
      const projectIds = [...new Set(pendingGates.map(g => g.projectId))];
      const projectList = projectIds.length > 0
        ? await db.select().from(projects)
        : [];

      return pendingGates
        .filter(g => {
          if (!g.plannedDate) return false;
          const planned = new Date(g.plannedDate);
          const diff = Math.ceil((planned.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return diff <= input.days && diff >= 0;
        })
        .map(g => {
          const project = projectList.find(p => p.id === g.projectId);
          const planned = new Date(g.plannedDate!);
          const daysRemaining = Math.ceil((planned.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const currentIdx = M_STAGE_DEFINITIONS.findIndex(d => d.code === g.phaseCode);
          const nextStage = currentIdx < M_STAGE_DEFINITIONS.length - 1
            ? M_STAGE_DEFINITIONS[currentIdx + 1].code
            : g.phaseCode;
          return {
            projectId: g.projectId,
            projectName: project?.name || `项目${g.projectId}`,
            currentStage: g.phaseCode,
            nextStage,
            dueDate: g.plannedDate,
            daysRemaining,
            completionRate: g.checklistTotal
              ? Math.round(((g.checklistCompleted ?? 0) / g.checklistTotal) * 100)
              : 0,
            blockers: [],
          };
        });
    }),
});

export type ProjectGateRouter = typeof projectGateRouter;
