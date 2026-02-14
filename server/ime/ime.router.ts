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

  // Trigger AI analysis for a meeting (includes engagement)
  analyzeMeeting: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      const contributions = await imeService.analyzeContributions(input.meetingId);
      const effectiveness = await imeService.scoreMeetingEffectiveness(input.meetingId);
      const traces = await imeService.linkToPerformanceTrace(input.meetingId);
      const engagement = await imeService.analyzeParticipantEngagement(input.meetingId);
      return { contributions, effectiveness, tracesCreated: traces.length, engagement };
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

  // ========================================================================
  // Participant Engagement Analysis
  // ========================================================================

  analyzeEngagement: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
      excludeSpeakers: z.array(z.string()).optional(),
      includeExternal: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.analyzeParticipantEngagement(input.meetingId, {
        excludeSpeakers: input.excludeSpeakers,
        includeExternal: input.includeExternal,
      });
    }),

  meetingEngagement: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT employee_name, ai_analysis FROM meeting_contributions
        WHERE meeting_id = ${input.meetingId}
        ORDER BY contribution_score DESC
      `);
      const participants: any[] = [];
      for (const row of result.rows as any[]) {
        try {
          const analysis = JSON.parse(row.ai_analysis || "{}");
          if (analysis.engagement) {
            participants.push({
              speaker: row.employee_name,
              ...analysis.engagement,
            });
          }
        } catch { /* skip */ }
      }
      return { meetingId: input.meetingId, participants };
    }),

  // ========================================================================
  // Phase 2: Department Rollup
  // ========================================================================

  departmentRollup: protectedProcedure
    .input(z.object({ department: z.string(), period: z.string() }))
    .query(async ({ input }) => {
      return imeService.computeDepartmentRollup(input.department, input.period);
    }),

  departmentComparison: protectedProcedure
    .input(z.object({ departments: z.array(z.string()).min(1).max(20), period: z.string() }))
    .query(async ({ input }) => {
      return imeService.getDepartmentComparison(input.departments, input.period);
    }),

  managementDashboard: protectedProcedure
    .input(z.object({
      scope: z.string(),
      scopeId: z.string().optional(),
      period: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return imeService.getManagementDashboard(input.scope, input.scopeId, input.period);
    }),

  refreshDepartmentRollup: protectedProcedure
    .input(z.object({ department: z.string(), period: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.computeDepartmentRollup(input.department, input.period);
    }),

  // ========================================================================
  // Phase 2: Meeting Patterns
  // ========================================================================

  detectPatterns: protectedProcedure
    .input(z.object({
      scope: z.string(),
      scopeId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.detectMeetingPatterns(input.scope, input.scopeId, input.dateFrom, input.dateTo);
    }),

  patternInsights: protectedProcedure
    .input(z.object({
      scope: z.string().optional(),
      scopeId: z.string().optional(),
      patternType: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getPatternInsights(input?.scope, input?.scopeId, input?.patternType);
    }),

  meetingCultureReport: protectedProcedure
    .input(z.object({ department: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return imeService.getMeetingCultureReport(input?.department);
    }),

  // ========================================================================
  // Phase 2: HR Signals
  // ========================================================================

  generateHrSignals: protectedProcedure
    .input(z.object({ employeeId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.generateHrSignals(input.employeeId);
    }),

  hrSignalsList: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      signalType: z.string().optional(),
      minConfidence: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: string[] = ["1=1"];
      if (input?.signalType) conditions.push(`hs.signal_type = '${input.signalType}'`);
      if (input?.minConfidence) conditions.push(`hs.confidence >= ${input.minConfidence}`);
      const deptJoin = input?.department
        ? `JOIN hrm_employees he ON hs.employee_id = he."employeeCode" AND he.department = '${input.department}'`
        : `LEFT JOIN hrm_employees he ON hs.employee_id = he."employeeCode"`;
      const where = conditions.join(" AND ");

      const result = await db.execute(sql.raw(`
        SELECT hs.*, he.department, he.position
        FROM ime_hr_signals hs
        ${deptJoin}
        WHERE ${where}
        ORDER BY hs.created_at DESC
        LIMIT 100
      `));
      return result.rows;
    }),

  promotionCandidates: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      minConfidence: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getPromotionCandidates(input?.department, input?.minConfidence);
    }),

  trainingRecommendation: protectedProcedure
    .input(z.object({ employeeId: z.string() }))
    .query(async ({ input }) => {
      return imeService.recommendTraining(input.employeeId);
    }),

  updateSignalStatus: protectedProcedure
    .input(z.object({
      signalId: z.number(),
      status: z.enum(["pending", "acknowledged", "acted_on", "dismissed"]),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql`
        UPDATE ime_hr_signals
        SET status = ${input.status}, updated_at = NOW()
        WHERE id = ${input.signalId}
      `);
      return { success: true };
    }),

  // ========================================================================
  // Phase 2: Real-time Assistant
  // ========================================================================

  startLiveSession: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as any).user?.openId || "unknown";
      return imeService.startLiveSession(input.meetingId, userId);
    }),

  endLiveSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input }) => {
      return imeService.endLiveSession(input.sessionId);
    }),

  getLiveSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT * FROM ime_live_sessions WHERE id = ${input.sessionId}
      `);
      const session = (result.rows as any[])[0];
      if (!session) return null;
      return {
        ...session,
        liveSuggestions: JSON.parse(session.live_suggestions || "[]"),
        liveContributionSnapshot: JSON.parse(session.live_contribution_snapshot || "{}"),
      };
    }),

  // ========================================================================
  // Phase 3: Meeting Cost Calculator
  // ========================================================================

  computeMeetingCost: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.computeMeetingCost(input.meetingId);
    }),

  costDashboard: protectedProcedure
    .input(z.object({
      channelId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getCostDashboard(input ?? {});
    }),

  batchComputeCosts: protectedProcedure
    .input(z.object({ meetingIds: z.array(z.string()).min(1).max(50) }))
    .mutation(async ({ input }) => {
      return imeService.batchComputeCosts(input.meetingIds);
    }),

  // ========================================================================
  // Phase 3: Action Item Tracker
  // ========================================================================

  extractActionItems: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.extractAndTrackActionItems(input.meetingId);
    }),

  actionItemDashboard: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      owner: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getActionItemDashboard(input ?? {});
    }),

  updateActionItemStatus: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      status: z.enum(["open", "in_progress", "completed", "stale", "cancelled"]),
    }))
    .mutation(async ({ input }) => {
      return imeService.updateActionItemStatus(input.itemId, input.status);
    }),

  // ========================================================================
  // Phase 3: Topic Continuity
  // ========================================================================

  extractTopics: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.extractAndTrackTopics(input.meetingId);
    }),

  topicContinuityDashboard: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getTopicContinuityDashboard(input ?? {});
    }),

  updateTopicStatus: protectedProcedure
    .input(z.object({
      topicId: z.number(),
      status: z.enum(["introduced", "debated", "decided", "closed", "stalled"]),
    }))
    .mutation(async ({ input }) => {
      return imeService.updateTopicStatus(input.topicId, input.status);
    }),

  // ========================================================================
  // Phase 4: Sentiment Analysis
  // ========================================================================

  analyzeSentiment: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.analyzeMeetingSentiment(input.meetingId);
    }),

  sentimentDashboard: protectedProcedure
    .input(z.object({
      channelId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getSentimentDashboard(input ?? {});
    }),

  batchAnalyzeSentiment: protectedProcedure
    .input(z.object({ meetingIds: z.array(z.string()).min(1).max(50) }))
    .mutation(async ({ input }) => {
      return imeService.batchAnalyzeSentiment(input.meetingIds);
    }),

  // ========================================================================
  // Phase 4: Meeting Health & Optimization
  // ========================================================================

  computeHealth: protectedProcedure
    .input(z.object({
      scope: z.string(),
      scopeId: z.string().optional(),
      period: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.computeMeetingHealth(input.scope, input.scopeId, input.period);
    }),

  healthDashboard: protectedProcedure
    .input(z.object({
      scope: z.string().optional(),
      period: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getHealthDashboard(input ?? {});
    }),

  optimizationRecommendations: protectedProcedure
    .input(z.object({
      scope: z.string(),
      scopeId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return imeService.getOptimizationRecommendations(input.scope, input.scopeId);
    }),

  // ========================================================================
  // Phase 4: Digest & Alerts
  // ========================================================================

  generateDigest: protectedProcedure
    .input(z.object({
      digestType: z.string(),
      scope: z.string(),
      scopeId: z.string().optional(),
      period: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.generateDigest(input.digestType, input.scope, input.scopeId, input.period);
    }),

  digestHistory: protectedProcedure
    .input(z.object({
      digestType: z.string().optional(),
      scope: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getDigestHistory(input ?? {});
    }),

  activeAlerts: protectedProcedure
    .input(z.object({
      scope: z.string().optional(),
      scopeId: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getActiveAlerts(input?.scope, input?.scopeId);
    }),

  // ========================================================================
  // Phase 5: Meeting ROI
  // ========================================================================

  computeRoi: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.computeMeetingRoi(input.meetingId);
    }),

  roiDashboard: protectedProcedure
    .input(z.object({
      channelId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getRoiDashboard(input ?? {});
    }),

  batchComputeRoi: protectedProcedure
    .input(z.object({ meetingIds: z.array(z.string()).min(1).max(50) }))
    .mutation(async ({ input }) => {
      return imeService.batchComputeRoi(input.meetingIds);
    }),

  // ========================================================================
  // Phase 5: Attendee Optimization
  // ========================================================================

  optimizeAttendees: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.optimizeAttendees(input.meetingId);
    }),

  optimizationDashboard: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getOptimizationDashboard(input ?? {});
    }),

  suggestParticipants: protectedProcedure
    .input(z.object({
      topic: z.string(),
      excludeIds: z.array(z.string()).optional(),
    }))
    .query(async ({ input }) => {
      return imeService.suggestParticipantsForTopic(input.topic, input.excludeIds);
    }),

  // ========================================================================
  // Phase 5: Predictive Analytics
  // ========================================================================

  predictEffectiveness: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.predictMeetingEffectiveness(input.meetingId);
    }),

  detectFatigue: protectedProcedure
    .input(z.object({
      scope: z.string(),
      scopeId: z.string().optional(),
      period: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.detectMeetingFatigue(input.scope, input.scopeId, input.period);
    }),

  predictionDashboard: protectedProcedure
    .input(z.object({
      scope: z.string().optional(),
      period: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getPredictionDashboard(input ?? {});
    }),

  // ========================================================================
  // Phase 6: Report Exports
  // ========================================================================

  generateMeetingReport: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.generateMeetingReport(input.meetingId);
    }),

  generateDashboardExcel: protectedProcedure
    .input(z.object({
      channelId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      return imeService.generateExecutiveDashboardExcel(input ?? {});
    }),

  generateBenchmarkReport: protectedProcedure
    .input(z.object({
      scope: z.string(),
      scopeId: z.string().optional(),
      period: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.generateBenchmarkReport(input.scope, input.scopeId, input.period);
    }),

  reportExportHistory: protectedProcedure
    .input(z.object({
      reportType: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const filters = input ?? {};
      const whereParts: string[] = [];
      if (filters.reportType) whereParts.push(`report_type = '${filters.reportType.replace(/'/g, "''")}'`);
      const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
      const limitVal = filters.limit || 50;
      const result = await db.execute(sql.raw(`
        SELECT * FROM ime_report_exports ${whereClause} ORDER BY generated_at DESC LIMIT ${limitVal}
      `));
      return result.rows;
    }),

  // ========================================================================
  // Phase 7: Knowledge Graph & Organizational Learning
  // ========================================================================

  extractEntities: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.extractKnowledgeEntities(input.meetingId);
    }),

  buildRelationships: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.buildEntityRelationships(input.meetingId);
    }),

  knowledgeGraph: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const safeId = input.meetingId.replace(/'/g, "''");
      const entities = await db.execute(sql.raw(
        `SELECT * FROM ime_knowledge_entities WHERE meeting_id = '${safeId}' ORDER BY confidence DESC`
      ));
      const entityIds = (entities.rows as any[]).map((e: any) => e.id);
      let relationships: any[] = [];
      if (entityIds.length > 0) {
        const relRes = await db.execute(sql.raw(
          `SELECT * FROM ime_entity_relationships WHERE entity_from_id IN (${entityIds.join(",")}) OR entity_to_id IN (${entityIds.join(",")})`
        ));
        relationships = relRes.rows as any[];
      }
      return { entities: entities.rows, relationships };
    }),

  searchKnowledge: protectedProcedure
    .input(z.object({
      query: z.string(),
      entityType: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const safeQuery = input.query.replace(/'/g, "''");
      const typeFilter = input.entityType ? `AND ke.entity_type = '${input.entityType.replace(/'/g, "''")}'` : "";
      const limitVal = input.limit || 20;
      const result = await db.execute(sql.raw(`
        SELECT ke.*, mr.title as meeting_title
        FROM ime_knowledge_entities ke
        JOIN meeting_records mr ON ke.meeting_id = mr.id
        WHERE (ke.entity_value LIKE '%${safeQuery}%' OR ke.context LIKE '%${safeQuery}%') ${typeFilter}
        ORDER BY ke.confidence DESC LIMIT ${limitVal}
      `));
      return result.rows;
    }),

  trackDecision: protectedProcedure
    .input(z.object({
      entityId: z.number(),
      outcomeStatus: z.enum(["pending", "implemented", "reversed", "modified", "abandoned"]),
      outcomeNotes: z.string().optional(),
      impactScore: z.number().optional(),
      lessonsLearned: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.trackDecisionOutcome(input.entityId, input.outcomeStatus, input.outcomeNotes, input.impactScore, input.lessonsLearned);
    }),

  decisionHistory: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const filters = input ?? {};
      const whereParts: string[] = [];
      if (filters.status) whereParts.push(`d.outcome_status = '${filters.status.replace(/'/g, "''")}'`);
      const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
      const limitVal = filters.limit || 50;
      const result = await db.execute(sql.raw(`
        SELECT d.*, mr.title as meeting_title
        FROM ime_decision_outcomes d
        JOIN meeting_records mr ON d.meeting_id = mr.id
        ${whereClause} ORDER BY d.created_at DESC LIMIT ${limitVal}
      `));
      return result.rows;
    }),

  generateRetrospective: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.generateRetrospective(input.meetingId);
    }),

  retrospectiveHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const limitVal = input?.limit || 20;
      const result = await db.execute(sql.raw(`
        SELECT r.*, mr.title as meeting_title
        FROM ime_meeting_retrospectives r
        JOIN meeting_records mr ON r.meeting_id = mr.id
        ORDER BY r.generated_at DESC LIMIT ${limitVal}
      `));
      return result.rows;
    }),

  computeExpertProfiles: protectedProcedure
    .input(z.object({ department: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      return imeService.computeExpertProfiles(input?.department);
    }),

  expertProfiles: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const filters = input ?? {};
      const whereParts: string[] = [];
      if (filters.department) whereParts.push(`department = '${filters.department.replace(/'/g, "''")}'`);
      const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
      const limitVal = filters.limit || 30;
      const result = await db.execute(sql.raw(`
        SELECT * FROM ime_expert_profiles ${whereClause} ORDER BY credibility_score DESC LIMIT ${limitVal}
      `));
      return result.rows;
    }),

  knowledgeDashboard: protectedProcedure
    .input(z.object({
      entityType: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getKnowledgeDashboard(input ?? {});
    }),

  // ========================================================================
  // Phase 8: Meeting AI Assistant
  // ========================================================================

  generateBrief: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.generateMeetingBrief(input.meetingId);
    }),

  getMeetingBrief: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const safeId = input.meetingId.replace(/'/g, "''");
      const result = await db.execute(sql.raw(
        `SELECT * FROM ime_meeting_briefs WHERE meeting_id = '${safeId}' ORDER BY generated_at DESC LIMIT 1`
      ));
      return (result.rows as any[])[0] || null;
    }),

  generateAgenda: protectedProcedure
    .input(z.object({
      topic: z.string(),
      participants: z.array(z.string()).optional(),
      durationMinutes: z.number().min(10).max(480).optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.generateAgendaSuggestion(input.topic, input.participants, input.durationMinutes);
    }),

  generateMinutes: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.generateMeetingMinutes(input.meetingId);
    }),

  getMeetingMinutes: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const safeId = input.meetingId.replace(/'/g, "''");
      const result = await db.execute(sql.raw(
        `SELECT * FROM ime_meeting_minutes WHERE meeting_id = '${safeId}' ORDER BY generated_at DESC LIMIT 1`
      ));
      return (result.rows as any[])[0] || null;
    }),

  generateFollowUp: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.generateFollowUpPlan(input.meetingId);
    }),

  askAssistant: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      question: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as any).user?.openId || "unknown";
      return imeService.askMeetingAssistant(input.sessionId, input.question, userId);
    }),

  chatHistory: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const safeSession = input.sessionId.replace(/'/g, "''");
      const result = await db.execute(sql.raw(
        `SELECT role, content, created_at FROM ime_ai_conversations WHERE session_id = '${safeSession}' ORDER BY created_at ASC LIMIT 100`
      ));
      return result.rows;
    }),
});
