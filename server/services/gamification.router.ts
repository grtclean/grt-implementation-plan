/**
 * Gamification Router (Task #75)
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import * as gamSvc from "./gamification.service";

export const gamificationRouter = router({
  grantXP: publicProcedure
    .input(z.object({ userId: z.number(), action: z.string(), points: z.number().optional(), sourceType: z.string().optional(), sourceId: z.number().optional() }))
    .mutation(async ({ input }) => {
      return gamSvc.grantXP(input.userId, input.action, input.points, input.sourceType, input.sourceId);
    }),

  profile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return gamSvc.getEmployeeProfile(input.userId);
    }),

  checkAchievements: publicProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      return gamSvc.checkAchievements(input.userId);
    }),

  leaderboard: publicProcedure
    .input(z.object({ period: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return gamSvc.getLeaderboard(input?.period);
    }),

  calculateLevel: publicProcedure
    .input(z.object({ xp: z.number() }))
    .query(({ input }) => {
      return gamSvc.calculateLevel(input.xp);
    }),
});