/**
 * G-IME: Intelligent Meeting Executive - tRPC Router
 * 参会者贡献分析与会议效能评估 API
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import * as imeService from "./ime.service";

export const imeRouter = router({
  // Dashboard overview — aggregated stats + top contributors + effectiveness trend
  dashboard: protectedProcedure
    .input(
      z.object({
        channelId: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return imeService.getContributionDashboard(input ?? {});
    }),

  // Single meeting's contribution breakdown
  meetingContributions: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT * FROM meeting_contributions
        WHERE meeting_id = ${input.meetingId}
        ORDER BY contribution_score DESC
      `);
      return result.rows;
    }),

  // Trigger AI analysis for a meeting
  analyzeMeeting: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      const contributions = await imeService.analyzeContributions(input.meetingId);
      const effectiveness = await imeService.scoreMeetingEffectiveness(input.meetingId);
      const traces = await imeService.linkToPerformanceTrace(input.meetingId);
      return { contributions, effectiveness, tracesCreated: traces.length };
    }),

  // Employee trend over time
  employeeTrend: protectedProcedure
    .input(
      z.object({
        employeeId: z.string(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return imeService.getEmployeeTrend(input.employeeId, input.dateFrom, input.dateTo);
    }),

  // Meeting effectiveness scores list
  effectivenessList: protectedProcedure
    .input(
      z.object({
        channelId: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 20;

      const conditions: string[] = ["1=1"];
      if (input?.channelId) conditions.push(`mr.channel_id = '${input.channelId}'`);
      if (input?.dateFrom) conditions.push(`mr.meeting_date >= '${input.dateFrom}'`);
      if (input?.dateTo) conditions.push(`mr.meeting_date <= '${input.dateTo}'`);
      const where = conditions.join(" AND ");

      const result = await db.execute(sql.raw(`
        SELECT
          mes.*,
          mr.title as meeting_title,
          mr.meeting_date,
          mr.objective,
          (SELECT COUNT(*) FROM meeting_contributions WHERE meeting_id = mes.meeting_id) as participant_count
        FROM meeting_effectiveness_scores mes
        JOIN meeting_records mr ON mes.meeting_id = mr.id
        WHERE ${where}
        ORDER BY mr.meeting_date DESC
        LIMIT ${limit}
      `));
      return result.rows;
    }),

  // Batch analyze multiple meetings
  batchAnalyze: protectedProcedure
    .input(z.object({ meetingIds: z.array(z.string()).min(1).max(20) }))
    .mutation(async ({ input }) => {
      const results: { meetingId: string; success: boolean; error?: string }[] = [];
      for (const meetingId of input.meetingIds) {
        try {
          await imeService.analyzeContributions(meetingId);
          await imeService.scoreMeetingEffectiveness(meetingId);
          await imeService.linkToPerformanceTrace(meetingId);
          results.push({ meetingId, success: true });
        } catch (e: any) {
          results.push({ meetingId, success: false, error: e.message });
        }
      }
      return results;
    }),
});
