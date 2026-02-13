/**
 * AI Early Warning Router - Combines all 3 layers (Task #73)
 * Layer 1: Health Scanner
 * Layer 2: Risk Scorer + Notifications
 * Layer 3: LLM Narrative Engine
 */

import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import * as healthScanner from "./project-health-scanner.service";
import * as riskScorer from "./risk-scorer.service";
import * as narrative from "./llm-narrative.service";

// Layer 1: Health Scanner Router
const healthScannerRouter = router({
  scanAll: publicProcedure.query(async () => {
    return healthScanner.scanAllProjects();
  }),

  scanProject: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return healthScanner.scanSingleProject(input.projectId);
    }),

  getHistory: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return healthScanner.getHealthHistory(input.projectId);
    }),
});

// Layer 2: Risk Scorer Router
const riskScorerRouter = router({
  getDashboard: publicProcedure.query(async () => {
    return riskScorer.getRiskDashboard();
  }),

  calculateRisk: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return riskScorer.calculateRiskScore(input.projectId);
    }),
});

// Notifications Router
const notificationsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        unreadOnly: z.boolean().optional(),
      }).optional().default({})
    )
    .query(async ({ input }) => {
      return riskScorer.getNotifications(input);
    }),

  markRead: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return riskScorer.markNotificationRead(input.id);
    }),
});

// Layer 3: Narrative Router
const narrativeRouter = router({
  generateNarrative: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return narrative.generateProjectNarrative(input.projectId);
    }),

  matchHistorical: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return narrative.matchHistoricalCases(input.projectId);
    }),

  weeklyDigest: publicProcedure.query(async () => {
    return narrative.generateWeeklyDigest();
  }),
});

// Combined AI Early Warning Router
export const aiEarlyWarningRouter = router({
  healthScanner: healthScannerRouter,
  riskScorer: riskScorerRouter,
  notifications: notificationsRouter,
  narrative: narrativeRouter,
});
