/**
 * 菜单管理tRPC路由
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { menuService } from './menu.service';
import { createRoleMiddleware } from '../permission-management/permission.middleware';

/**
 * 菜单管理路由
 */
export const menuRouter = router({
  /**
   * 获取用户菜单树
   */
  getUserMenuTree: protectedProcedure.query(async ({ ctx }) => {
    const menuTree = await menuService.getUserMenuTree(String(ctx.user.id));
    return { menuTree };
  }),

  /**
   * 获取用户最常访问的菜单
   */
  getUserFrequentMenus: protectedProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ ctx, input }) => {
      const menus = await menuService.getUserFrequentMenus(
        String(ctx.user.id),
        input.limit
      );
      return { menus };
    }),

  /**
   * 搜索菜单
   */
  searchMenus: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const results = await menuService.searchMenus(String(ctx.user.id), input.query);
      return { results };
    }),

  /**
   * 记录菜单访问
   */
  logMenuAccess: protectedProcedure
    .input(z.object({ menuItemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await menuService.logMenuAccess(String(ctx.user.id), input.menuItemId);
      return { success: true };
    }),

  /**
   * 隐藏菜单项
   */
  hideMenuItem: protectedProcedure
    .input(z.object({ menuItemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await menuService.hideMenuItem(String(ctx.user.id), input.menuItemId);
      return { success: true };
    }),

  /**
   * 显示菜单项
   */
  showMenuItem: protectedProcedure
    .input(z.object({ menuItemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await menuService.showMenuItem(String(ctx.user.id), input.menuItemId);
      return { success: true };
    }),

  /**
   * 重置菜单自定义
   */
  resetMenuCustomization: protectedProcedure.mutation(async ({ ctx }) => {
    await menuService.resetMenuCustomization(String(ctx.user.id));
    return { success: true };
  }),

  /**
   * 管理员：获取菜单项详情
   */
  getMenuItemDetails: protectedProcedure
    .use(createRoleMiddleware(['admin']))
    .input(z.object({ menuItemId: z.number() }))
    .query(async ({ input }) => {
      const menu = await menuService.getMenuItemDetails(input.menuItemId);
      return { menu };
    }),

  /**
   * 管理员：创建菜单项
   */
  createMenuItem: protectedProcedure
    .use(createRoleMiddleware(['admin']))
    .input(
      z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        icon: z.string().optional(),
        path: z.string().optional(),
        parentId: z.number().optional(),
        level: z.number().optional(),
        order: z.number().optional(),
        menuType: z.string().optional(),
        requiredPermission: z.string().optional(),
        requiredRole: z.string().optional(),
        i18nKey: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const menuItemId = await menuService.createMenuItem(input);
      return { menuItemId };
    }),

  /**
   * 管理员：更新菜单项
   */
  updateMenuItem: protectedProcedure
    .use(createRoleMiddleware(['admin']))
    .input(
      z.object({
        menuItemId: z.number(),
        name: z.string().optional(),
        icon: z.string().optional(),
        path: z.string().optional(),
        order: z.number().optional(),
        requiredPermission: z.string().optional(),
        requiredRole: z.string().optional(),
        isActive: z.boolean().optional(),
        isVisible: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { menuItemId, ...updateData } = input;
      await menuService.updateMenuItem(menuItemId, updateData);
      return { success: true };
    }),

  /**
   * 管理员：删除菜单项
   */
  deleteMenuItem: protectedProcedure
    .use(createRoleMiddleware(['admin']))
    .input(z.object({ menuItemId: z.number() }))
    .mutation(async ({ input }) => {
      await menuService.deleteMenuItem(input.menuItemId);
      return { success: true };
    }),
});
