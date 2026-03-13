/**
 * 军团管理路由 — 批量数字助手初始化与运营管理
 *
 * Provides:
 *   - batchProvision: 批量初始化全员数字助手军团 (admin only)
 *   - getOverview: 军团概览统计
 *   - getSkillMappings: 员工技能→角色→等级映射
 *   - initSingleEmployee: 单员工初始化
 *   - activateDefaultAgent: 激活员工默认等级Agent
 */

import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import {
  batchProvisionLegion,
  getLegionOverview,
  getEmployeeSkillMappings,
  computeSkillLevel,
} from "../services/legion-provisioning.service";
import { provisionSingleEmployee } from "../services/ai-assistant-provisioning.service";
import { provisionFleetForEmployee, activateAgent, deactivateAgent } from "../services/ai-agent-fleet.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("legion-router");

export const legionRouter = router({
  /**
   * 批量初始化全员数字助手军团
   * 读取员工技能清单 → 计算M级 → 创建Master + L1-L5 + G-Token播种
   */
  batchProvision: requirePermission("hr:employees:edit")
    .mutation(async () => {
      log.info("starting batch legion provisioning");
      const result = await batchProvisionLegion();
      log.info({
        masters: result.mastersCreated,
        fleets: result.fleetsCreated,
        activated: result.agentsActivated,
        gTokens: result.gTokensSeeded,
        errors: result.errors.length,
      }, "batch legion provisioning complete");
      return result;
    }),

  /**
   * 军团概览统计
   */
  getOverview: protectedProcedure.query(async () => {
    return getLegionOverview();
  }),

  /**
   * 员工技能→角色→等级映射列表
   */
  getSkillMappings: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const mappings = await getEmployeeSkillMappings();

      let filtered = mappings;
      if (input?.department) {
        filtered = filtered.filter((m) => m.department === input.department);
      }
      if (input?.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter((m) =>
          m.name.toLowerCase().includes(s) ||
          m.employeeCode.toLowerCase().includes(s) ||
          m.position.toLowerCase().includes(s)
        );
      }

      // Summary stats
      const totalWithSkills = filtered.filter((m) => m.tsdckl !== null).length;
      const levelDistribution: Record<number, number> = {};
      for (const m of filtered) {
        levelDistribution[m.computedLevel] = (levelDistribution[m.computedLevel] || 0) + 1;
      }

      const departments = [...new Set(mappings.map((m) => m.department))].sort();

      return {
        mappings: filtered,
        total: filtered.length,
        totalWithSkills,
        levelDistribution,
        departments,
      };
    }),

  /**
   * 单员工初始化
   */
  initSingleEmployee: requirePermission("hr:employees:edit")
    .input(z.object({ employeeId: z.number() }))
    .mutation(async ({ input }) => {
      // Step 1: Create master assistant
      const masterResult = await provisionSingleEmployee(input.employeeId);

      // Step 2: Create L1-L5 fleet
      const fleetResult = await provisionFleetForEmployee(input.employeeId);

      return {
        master: masterResult,
        fleet: fleetResult,
      };
    }),

  /**
   * 激活/停用员工Agent
   */
  toggleAgent: requirePermission("hr:employees:edit")
    .input(z.object({
      agentId: z.number(),
      activate: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      if (input.activate) {
        return { success: await activateAgent(input.agentId) };
      } else {
        return { success: await deactivateAgent(input.agentId) };
      }
    }),

  /**
   * 计算技能等级预览 (不写入DB)
   */
  previewSkillLevel: protectedProcedure
    .input(z.object({
      roleId: z.string(),
      t: z.number().min(0).max(100),
      s: z.number().min(0).max(100),
      d: z.number().min(0).max(100),
      c: z.number().min(0).max(100),
      k: z.number().min(0).max(100),
      l: z.number().min(0).max(100),
    }))
    .query(({ input }) => {
      const level = computeSkillLevel(
        { t: input.t, s: input.s, d: input.d, c: input.c, k: input.k, l: input.l },
        input.roleId,
      );
      return { level };
    }),
});
