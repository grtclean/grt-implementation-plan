import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";

const successResponse = { success: true, message: "操作成功" };

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => {
    return ctx.user || null;
  }),

  logout: protectedProcedure.mutation(async () => {
    return successResponse;
  }),

  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      return { language: "zh", theme: "dark", sidebarCollapsed: false, timezone: "Asia/Shanghai" };
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
      console.error("Failed to get user preferences:", error);
      return { language: "zh", theme: "dark", sidebarCollapsed: false, timezone: "Asia/Shanghai" };
    }
  }),

  updatePreferences: protectedProcedure
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
        console.error("Failed to update user preferences:", error);
        return { success: false, error: "Failed to update preferences" };
      }
    }),

  updateLanguagePreference: protectedProcedure
    .input(z.object({ language: z.enum(["zh", "en", "de", "fr"]) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) return { success: false, error: "User not authenticated" };
      try {
        const { upsertUserPreferences } = await import("../db");
        await upsertUserPreferences(ctx.user.id, { language: input.language });
        return { success: true, language: input.language };
      } catch (error) {
        console.error("Failed to update language preference:", error);
        return { success: false, error: "Failed to update language preference" };
      }
    }),

  updateThemePreference: protectedProcedure
    .input(z.object({ theme: z.enum(["dark", "light", "system"]) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) return { success: false, error: "User not authenticated" };
      try {
        const { upsertUserPreferences } = await import("../db");
        await upsertUserPreferences(ctx.user.id, { theme: input.theme });
        return { success: true, theme: input.theme };
      } catch (error) {
        console.error("Failed to update theme preference:", error);
        return { success: false, error: "Failed to update theme preference" };
      }
    }),

  getLanguagePreference: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) return { language: "zh" };
    try {
      const { getUserPreferences } = await import("../db");
      const prefs = await getUserPreferences(ctx.user.id);
      return { language: prefs?.language || "zh" };
    } catch (error) {
      console.error("Failed to get language preference:", error);
      return { language: "zh" };
    }
  }),

  getFavorites: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) return [];
    try {
      const { getUserFavorites } = await import("../db");
      return await getUserFavorites(ctx.user.id);
    } catch (error) {
      console.error("Failed to get user favorites:", error);
      return [];
    }
  }),

  addFavorite: protectedProcedure
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
        console.error("Failed to add favorite:", error);
        return { success: false, error: error.message || "Failed to add favorite" };
      }
    }),

  removeFavorite: protectedProcedure
    .input(z.object({ menuPath: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) return { success: false, error: "User not authenticated" };
      try {
        const { removeUserFavorite } = await import("../db");
        const result = await removeUserFavorite(ctx.user.id, input.menuPath);
        return { success: result };
      } catch (error) {
        console.error("Failed to remove favorite:", error);
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
        console.error("Failed to check favorite:", error);
        return false;
      }
    }),

  updateFavoriteOrder: protectedProcedure
    .input(z.object({ menuPath: z.string(), newOrder: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) return { success: false, error: "User not authenticated" };
      try {
        const { updateFavoriteOrder } = await import("../db");
        const result = await updateFavoriteOrder(ctx.user.id, input.menuPath, input.newOrder);
        return { success: result };
      } catch (error) {
        console.error("Failed to update favorite order:", error);
        return { success: false, error: "Failed to update favorite order" };
      }
    }),

  reorderFavorites: protectedProcedure
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
        console.error("Failed to reorder favorites:", error);
        return { success: false, error: "Failed to reorder favorites" };
      }
    }),
});
