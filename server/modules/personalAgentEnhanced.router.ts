/**
 * 个人智能体增强功能 - tRPC路由
 * 功能：行为探针数据采集、技能推断引擎
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { TRPCError } from "@trpc/server";
import {
  BehaviorProbeCollector,
  SkillInferenceEngine,
} from "../services/personal-agent-enhanced.service";
import { randomUUID } from "crypto";

export const personalAgentEnhancedRouter = router({
  // ==================== 行为探针 ====================

  // 记录单个行为事件
  recordBehavior: protectedProcedure
    .input(
      z.object({
        probeType: z.enum([
          "page_view",
          "click",
          "scroll",
          "input",
          "api_call",
          "task_start",
          "task_complete",
          "error",
          "search",
          "file_operation",
          "collaboration",
          "learning",
          "custom",
        ]),
        eventData: z.record(z.string(), z.any()),
        sessionId: z.string().optional(),
        deviceInfo: z
          .object({
            userAgent: z.string().optional(),
            screenSize: z.string().optional(),
            timezone: z.string().optional(),
            language: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { probeType, eventData, sessionId, deviceInfo } = input;

      const result = await BehaviorProbeCollector.recordEvent({
        probeId: `PROBE-${randomUUID()}`,
        userId: ctx.user!.id,
        probeType,
        eventData,
        timestamp: new Date().toISOString(),
        sessionId,
        deviceInfo,
      });

      return result;
    }),

  // 批量记录行为事件
  recordBehaviorBatch: protectedProcedure
    .input(
      z.object({
        events: z.array(
          z.object({
            probeType: z.string(),
            eventData: z.record(z.string(), z.any()),
            timestamp: z.string(),
            sessionId: z.string().optional(),
          })
        ),
        deviceInfo: z
          .object({
            userAgent: z.string().optional(),
            screenSize: z.string().optional(),
            timezone: z.string().optional(),
            language: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { events, deviceInfo } = input;

      const probes = events.map((event) => ({
        probeId: `PROBE-${randomUUID()}`,
        userId: ctx.user!.id,
        probeType: event.probeType as any,
        eventData: event.eventData,
        timestamp: event.timestamp,
        sessionId: event.sessionId,
        deviceInfo,
      }));

      const result = await BehaviorProbeCollector.recordBatch(probes);
      return result;
    }),

  // 获取用户行为统计
  getBehaviorStats: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId, dateFrom, dateTo } = input;
      const targetUserId = userId || ctx.user!.id;

      return BehaviorProbeCollector.getUserBehaviorStats(
        targetUserId,
        dateFrom,
        dateTo
      );
    }),

  // 分析行为模式
  analyzeBehaviorPatterns: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId } = input;
      const targetUserId = userId || ctx.user!.id;

      return BehaviorProbeCollector.analyzeBehaviorPatterns(targetUserId);
    }),

  // 获取行为历史
  getBehaviorHistory: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        probeType: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { userId, probeType, dateFrom, dateTo, page, pageSize } = input;
      const targetUserId = userId || ctx.user!.id;

      let query = `SELECT * FROM behavior_probes WHERE user_id = ?`;
      const params: any[] = [targetUserId];

      if (probeType) {
        query += ` AND probe_type = ?`;
        params.push(probeType);
      }
      if (dateFrom) {
        query += ` AND event_time >= ?`;
        params.push(dateFrom);
      }
      if (dateTo) {
        query += ` AND event_time <= ?`;
        params.push(dateTo);
      }

      query += ` ORDER BY event_time DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);

      const queryResult = await (db as any).execute(query, params);
      const rows = (queryResult.rows || queryResult[0] || []) as any[];

      return {
        items: rows.map((row: any) => ({
          ...row,
          event_data: JSON.parse(row.event_data || "{}"),
          device_info: row.device_info ? JSON.parse(row.device_info) : null,
        })),
        page,
        pageSize,
      };
    }),

  // ==================== 技能推断 ====================

  // 执行技能推断
  inferSkills: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;
      const targetUserId = userId || ctx.user!.id;

      const skills = await SkillInferenceEngine.inferSkills(targetUserId);
      return {
        userId: targetUserId,
        inferredSkills: skills,
        inferredAt: new Date().toISOString(),
      };
    }),

  // 获取技能画像
  getSkillProfile: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId } = input;
      const targetUserId = userId || ctx.user!.id;

      return SkillInferenceEngine.getSkillProfile(targetUserId);
    }),

  // 获取推断的技能列表
  getInferredSkills: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        domain: z.string().optional(),
        minLevel: z.number().optional(),
        minConfidence: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { userId, domain, minLevel, minConfidence } = input;
      const targetUserId = userId || ctx.user!.id;

      let query = `SELECT * FROM inferred_skills WHERE user_id = ?`;
      const params: any[] = [targetUserId];

      if (domain) {
        query += ` AND skill_domain = ?`;
        params.push(domain);
      }
      if (minLevel) {
        query += ` AND inferred_level >= ?`;
        params.push(minLevel);
      }
      if (minConfidence) {
        query += ` AND confidence >= ?`;
        params.push(minConfidence);
      }

      query += ` ORDER BY inferred_level DESC, confidence DESC`;

      const queryResult = await (db as any).execute(query, params);
      const rows = (queryResult.rows || queryResult[0] || []) as any[];

      return rows.map((row: any) => ({
        ...row,
        evidence: JSON.parse(row.evidence || "[]"),
      }));
    }),

  // 比较技能画像
  compareSkillProfiles: protectedProcedure
    .input(
      z.object({
        userIds: z.array(z.number()).min(2).max(5),
      })
    )
    .query(async ({ input }) => {
      const { userIds } = input;

      const profiles = await Promise.all(
        userIds.map((id) => SkillInferenceEngine.getSkillProfile(id))
      );

      // 找出共同技能和差异
      const allSkillNames = new Set<string>();
      for (const profile of profiles) {
        for (const skill of profile.topSkills) {
          allSkillNames.add(skill.name);
        }
      }

      const comparison: any[] = [];
      for (const skillName of Array.from(allSkillNames)) {
        const skillData: any = { skillName };
        for (let i = 0; i < profiles.length; i++) {
          const skill = profiles[i].topSkills.find((s) => s.name === skillName);
          skillData[`user${userIds[i]}`] = skill
            ? { level: skill.level, confidence: skill.confidence }
            : null;
        }
        comparison.push(skillData);
      }

      return {
        profiles,
        comparison,
        summary: {
          avgLevels: profiles.map((p) => p.averageLevel),
          totalSkills: profiles.map((p) => p.totalSkills),
        },
      };
    }),

  // ==================== 成长追踪 ====================

  // 获取技能成长曲线
  getSkillGrowthCurve: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        skillName: z.string().optional(),
        months: z.number().default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { userId, skillName, months } = input;
      const targetUserId = userId || ctx.user!.id;

      // 获取技能推断历史（通过updated_at追踪）
      let query = `SELECT skill_name, inferred_level, confidence, updated_at
                   FROM inferred_skills_history
                   WHERE user_id = ? AND updated_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)`;
      const params: any[] = [targetUserId, months];

      if (skillName) {
        query += ` AND skill_name = ?`;
        params.push(skillName);
      }

      query += ` ORDER BY updated_at ASC`;

      const queryResult = await (db as any).execute(query, params);
      const history = (queryResult.rows || queryResult[0] || []) as any[];

      // 按技能分组
      const bySkill: Record<string, any[]> = {};
      for (const record of history) {
        if (!bySkill[record.skill_name]) {
          bySkill[record.skill_name] = [];
        }
        bySkill[record.skill_name].push({
          level: record.inferred_level,
          confidence: record.confidence,
          date: record.updated_at,
        });
      }

      // 计算成长率
      const growthRates: Record<string, number> = {};
      for (const [skill, records] of Object.entries(bySkill)) {
        if (records.length >= 2) {
          const first = records[0].level;
          const last = records[records.length - 1].level;
          growthRates[skill] = Math.round(((last - first) / first) * 100);
        } else {
          growthRates[skill] = 0;
        }
      }

      return {
        userId: targetUserId,
        period: `${months} months`,
        skillCurves: bySkill,
        growthRates,
        fastestGrowing: Object.entries(growthRates)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([skill, rate]) => ({ skill, rate })),
      };
    }),

  // 设置技能目标
  setSkillGoal: protectedProcedure
    .input(
      z.object({
        skillName: z.string(),
        targetLevel: z.number().min(1).max(5),
        targetDate: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { skillName, targetLevel, targetDate, notes } = input;

      const result = await (db as any).execute(
        `INSERT INTO skill_goals
         (user_id, skill_name, target_level, target_date, notes)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (user_id, skill_name) DO UPDATE SET
         target_level = EXCLUDED.target_level,
         target_date = EXCLUDED.target_date,
         notes = EXCLUDED.notes`,
        [ctx.user!.id, skillName, targetLevel, targetDate, notes || null]
      );

      return { success: true, id: (result as any).insertId || (result as any).rows?.[0]?.id };
    }),

  // 获取技能目标
  getSkillGoals: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        status: z.enum(["active", "achieved", "expired"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { userId, status } = input;
      const targetUserId = userId || ctx.user!.id;

      let query = `SELECT sg.*, ins.inferred_level as current_level
                   FROM skill_goals sg
                   LEFT JOIN inferred_skills ins 
                     ON sg.user_id = ins.user_id AND sg.skill_name = ins.skill_name
                   WHERE sg.user_id = ?`;
      const params: any[] = [targetUserId];

      if (status === "achieved") {
        query += ` AND ins.inferred_level >= sg.target_level`;
      } else if (status === "expired") {
        query += ` AND sg.target_date < NOW() AND (ins.inferred_level IS NULL OR ins.inferred_level < sg.target_level)`;
      } else if (status === "active") {
        query += ` AND sg.target_date >= NOW() AND (ins.inferred_level IS NULL OR ins.inferred_level < sg.target_level)`;
      }

      query += ` ORDER BY sg.target_date ASC`;

      const queryResult = await (db as any).execute(query, params);
      const rows = (queryResult.rows || queryResult[0] || []) as any[];

      return rows.map((row: any) => ({
        ...row,
        progress: row.current_level
          ? Math.round((row.current_level / row.target_level) * 100)
          : 0,
      }));
    }),
});
