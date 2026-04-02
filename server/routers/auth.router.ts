import { z } from "zod";
import {router, publicProcedure, protectedProcedure, requirePermission} from "../_core/trpc";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("auth");

const successResponse = { success: true, message: "操作成功" };

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => {
    return ctx.user || null;
  }),

  logout: requirePermission('system:users:edit').mutation(async () => {
    return successResponse;
  }),

  getPreferences: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      return { language: "zh", theme: "light", sidebarCollapsed: false, timezone: "Asia/Shanghai" };
    }
    try {
      const { getUserPreferences } = await import("../db");
      const prefs = await getUserPreferences(ctx.user.id);
      if (prefs) {
        return {
          language: prefs.language,
          theme: prefs.theme,
          sidebarCollapsed: prefs.sidebarCollapsed,
          timezone: prefs.timezone,
          dateFormat: prefs.dateFormat,
          dashboardLayout: prefs.dashboardLayout,
          notificationSettings: prefs.notificationSettings,
        };
      }
      return { language: "zh", theme: "dark", sidebarCollapsed: false, timezone: "Asia/Shanghai" };
    } catch (error) {
      log.error({ err: error }, "Failed to get user preferences");
      return { language: "zh", theme: "dark", sidebarCollapsed: false, timezone: "Asia/Shanghai" };
    }
  }),

  updatePreferences: requirePermission('system:users:edit')
    .input(z.object({
      language: z.enum(["zh", "en", "de", "fr"]).optional(),
      theme: z.enum(["dark", "light", "system"]).optional(),
      sidebarCollapsed: z.boolean().optional(),
      timezone: z.string().optional(),
      dateFormat: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) return { success: false, error: "User not authenticated" };
      try {
        const { upsertUserPreferences } = await import("../db");
        const updated = await upsertUserPreferences(ctx.user.id, input);
        return { success: true, preferences: updated };
      } catch (error) {
        log.error({ err: error }, "Failed to update user preferences");
        return { success: false, error: "Failed to update preferences" };
      }
    }),

  updateLanguagePreference: requirePermission('system:users:edit')
    .input(z.object({ language: z.enum(["zh", "en", "de", "fr"]) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) return { success: false, error: "User not authenticated" };
      try {
        const { upsertUserPreferences } = await import("../db");
        await upsertUserPreferences(ctx.user.id, { language: input.language });
        return { success: true, language: input.language };
      } catch (error) {
        log.error({ err: error }, "Failed to update language preference");
        return { success: false, error: "Failed to update language preference" };
      }
    }),

  updateThemePreference: requirePermission('system:users:edit')
    .input(z.object({ theme: z.enum(["dark", "light", "system"]) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) return { success: false, error: "User not authenticated" };
      try {
        const { upsertUserPreferences } = await import("../db");
        await upsertUserPreferences(ctx.user.id, { theme: input.theme });
        return { success: true, theme: input.theme };
      } catch (error) {
        log.error({ err: error }, "Failed to update theme preference");
        return { success: false, error: "Failed to update theme preference" };
      }
    }),

  getLanguagePreference: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) return { language: "zh" };
    try {
      const { getUserPreferences } = await import("../db");
      const prefs = await getUserPreferences(ctx.user.id);
      return { language: prefs?.language || "zh" };
    } catch (error) {
      log.error({ err: error }, "Failed to get language preference");
      return { language: "zh" };
    }
  }),

  getFavorites: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) return [];
    try {
      const { getUserFavorites } = await import("../db");
      return await getUserFavorites(ctx.user.id);
    } catch (error) {
      log.error({ err: error }, "Failed to get user favorites");
      return [];
    }
  }),

  addFavorite: requirePermission('system:users:edit')
    .input(z.object({
      menuPath: z.string(),
      menuName: z.string(),
      menuNameEn: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) return { success: false, error: "User not authenticated" };
      try {
        const { addUserFavorite } = await import("../db");
        const favorite = await addUserFavorite({
          userId: ctx.user.id,
          menuPath: input.menuPath,
          menuName: input.menuName,
          menuNameEn: input.menuNameEn,
        });
        return { success: true, data: favorite };
      } catch (error: any) {
        log.error({ err: error }, "Failed to add favorite");
        return { success: false, error: error.message || "Failed to add favorite" };
      }
    }),

  removeFavorite: requirePermission('system:users:edit')
    .input(z.object({ menuPath: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) return { success: false, error: "User not authenticated" };
      try {
        const { removeUserFavorite } = await import("../db");
        const result = await removeUserFavorite(ctx.user.id, input.menuPath);
        return { success: result };
      } catch (error) {
        log.error({ err: error }, "Failed to remove favorite");
        return { success: false, error: "Failed to remove favorite" };
      }
    }),

  isFavorite: protectedProcedure
    .input(z.object({ menuPath: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) return false;
      try {
        const { isFavorite } = await import("../db");
        return await isFavorite(ctx.user.id, input.menuPath);
      } catch (error) {
        log.error({ err: error }, "Failed to check favorite");
        return false;
      }
    }),

  updateFavoriteOrder: requirePermission('system:users:edit')
    .input(z.object({ menuPath: z.string(), newOrder: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) return { success: false, error: "User not authenticated" };
      try {
        const { updateFavoriteOrder } = await import("../db");
        const result = await updateFavoriteOrder(ctx.user.id, input.menuPath, input.newOrder);
        return { success: result };
      } catch (error) {
        log.error({ err: error }, "Failed to update favorite order");
        return { success: false, error: "Failed to update favorite order" };
      }
    }),

  reorderFavorites: requirePermission('system:users:edit')
    .input(z.object({
      orders: z.array(z.object({ menuPath: z.string(), newOrder: z.number() })),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) return { success: false, error: "User not authenticated" };
      try {
        const { updateFavoriteOrder } = await import("../db");
        for (const item of input.orders) {
          await updateFavoriteOrder(ctx.user.id, item.menuPath, item.newOrder);
        }
        return { success: true };
      } catch (error) {
        log.error({ err: error }, "Failed to reorder favorites");
        return { success: false, error: "Failed to reorder favorites" };
      }
    }),
});
