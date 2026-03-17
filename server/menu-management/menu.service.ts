/**
 * 菜单导航服务
 * 处理所有菜单相关的业务逻辑
 */

import { TRPCError } from '@trpc/server';
import { requireDb } from '../utils/db-helpers';
import {
  menuItems,
  menuRoles,
  userMenuCustomization,
  menuAccessLogs,
} from '../../drizzle/schema';
import { MenuItemWithChildren, MenuItem } from '../../drizzle/menu-schema';
import { eq, and, or, isNull, inArray, like } from 'drizzle-orm';
import { permissionService } from '../permission-management/permission.service';

/**
 * 菜单服务类
 */
export class MenuService {
  /**
   * 获取用户可访问的菜单树
   */
  async getUserMenuTree(userId: string): Promise<MenuItemWithChildren[]> {
    const db = await requireDb() as any;

    // 获取所有菜单项
    const allMenus = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.isActive, true))
      .limit(1000);

    // 过滤用户可访问的菜单
    const accessibleMenus: MenuItem[] = [];

    for (const menu of allMenus) {
      const isAccessible = await this.canUserAccessMenu(userId, menu);
      if (isAccessible) {
        accessibleMenus.push(menu);
      }
    }

    // 构建菜单树
    return this.buildMenuTree(accessibleMenus, userId);
  }

  /**
   * 检查用户是否可以访问菜单项
   */
  async canUserAccessMenu(userId: string, menu: MenuItem): Promise<boolean> {
    const db = await requireDb() as any;

    // 检查菜单是否可见
    if (!menu.isVisible || !menu.isActive) {
      return false;
    }

    // 检查权限要求
    if (menu.requiredPermission) {
      const hasPermission = await permissionService.checkPermission(
        userId,
        menu.requiredPermission
      );
      if (!hasPermission) {
        return false;
      }
    }

    // 检查角色要求
    if (menu.requiredRole) {
      const hasRole = await permissionService.checkRole(userId, menu.requiredRole);
      if (!hasRole) {
        return false;
      }
    }

    // 检查认证要求
    if (menu.requiredCertificate) {
      const hasCert = await permissionService.checkCertification(
        userId,
        menu.requiredCertificate
      );
      if (!hasCert) {
        return false;
      }
    }

    // 检查角色可见性
    if (menu.visibleRoles && Array.isArray(menu.visibleRoles)) {
      let isInVisibleRoles = false;
      for (const roleName of menu.visibleRoles as string[]) {
        const hasRole = await permissionService.checkRole(userId, roleName);
        if (hasRole) {
          isInVisibleRoles = true;
          break;
        }
      }
      if (!isInVisibleRoles) {
        return false;
      }
    }

    // 检查隐藏角色
    if (menu.hiddenRoles && Array.isArray(menu.hiddenRoles)) {
      for (const roleName of menu.hiddenRoles as string[]) {
        const hasRole = await permissionService.checkRole(userId, roleName);
        if (hasRole) {
          return false;
        }
      }
    }

    // 检查用户自定义隐藏
    const customization = await db
      .select()
      .from(userMenuCustomization)
      .where(
        and(
          eq(userMenuCustomization.userId, userId),
          eq(userMenuCustomization.menuItemId, menu.id),
          eq(userMenuCustomization.isHidden, true)
        )
      )
      .limit(1);

    if (customization.length > 0) {
      return false;
    }

    return true;
  }

  /**
   * 构建菜单树
   */
  private buildMenuTree(
    menus: MenuItem[],
    userId: string,
    parentId: number | null = null
  ): MenuItemWithChildren[] {
    const tree: MenuItemWithChildren[] = [];

    // 获取当前级别的菜单
    const currentLevelMenus = menus.filter((m) => m.parentId === parentId);

    // 按顺序排序
    currentLevelMenus.sort((a, b) => (a.order || 0) - (b.order || 0));

    for (const menu of currentLevelMenus) {
      const children = this.buildMenuTree(menus, userId, menu.id);
      const item: MenuItemWithChildren = {
        ...menu,
        children: children.length > 0 ? children : undefined,
      };
      tree.push(item);
    }

    return tree;
  }

  /**
   * 记录菜单访问
   */
  async logMenuAccess(userId: string, menuItemId: number): Promise<void> {
    const db = await requireDb() as any;

    // 检查是否已有记录
    const existing = await db
      .select()
      .from(menuAccessLogs)
      .where(
        and(
          eq(menuAccessLogs.userId, userId),
          eq(menuAccessLogs.menuItemId, menuItemId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // 更新访问计数
      await db
        .update(menuAccessLogs)
        .set({
          accessCount: (existing[0].accessCount || 0) + 1,
          lastAccessAt: new Date(),
        })
        .where(
          and(
            eq(menuAccessLogs.userId, userId),
            eq(menuAccessLogs.menuItemId, menuItemId)
          )
        );
    } else {
      // 创建新记录
      await db.insert(menuAccessLogs).values({
        userId,
        menuItemId,
        accessCount: 1,
      });
    }
  }

  /**
   * 获取用户最常访问的菜单
   */
  async getUserFrequentMenus(userId: string, limit: number = 5): Promise<MenuItem[]> {
    const db = await requireDb() as any;

    const logs = await db
      .select()
      .from(menuAccessLogs)
      .where(eq(menuAccessLogs.userId, userId))
      .orderBy(menuAccessLogs.accessCount)
      .limit(limit);

    const menuIds = logs.map((l: any) => l.menuItemId);

    if (menuIds.length === 0) {
      return [];
    }

    return await db
      .select()
      .from(menuItems)
      .where(inArray(menuItems.id, menuIds))
      .limit(1000);
  }

  /**
   * 搜索菜单
   */
  async searchMenus(userId: string, query: string): Promise<MenuItem[]> {
    const db = await requireDb() as any;

    // 获取用户可访问的所有菜单
    const userMenuTree = await this.getUserMenuTree(userId);
    const accessibleMenuIds = this.flattenMenuTree(userMenuTree).map((m) => m.id);

    if (accessibleMenuIds.length === 0) {
      return [];
    }

    // 搜索菜单
    const searchResults = await db
      .select()
      .from(menuItems)
      .where(
        and(
          inArray(menuItems.id, accessibleMenuIds),
          or(
            like(menuItems.name, `%${query}%`),
            like(menuItems.code, `%${query}%`)
          )
        )
      )
      .limit(10);

    return searchResults;
  }

  /**
   * 扁平化菜单树
   */
  private flattenMenuTree(tree: MenuItemWithChildren[]): MenuItem[] {
    const result: MenuItem[] = [];

    for (const item of tree) {
      result.push(item as any);
      if (item.children && item.children.length > 0) {
        result.push(...this.flattenMenuTree(item.children));
      }
    }

    return result;
  }

  /**
   * 隐藏菜单项
   */
  async hideMenuItem(userId: string, menuItemId: number): Promise<void> {
    const db = await requireDb() as any;

    await db.insert(userMenuCustomization).values({
      userId,
      menuItemId,
      isHidden: true,
    });
  }

  /**
   * 显示菜单项
   */
  async showMenuItem(userId: string, menuItemId: number): Promise<void> {
    const db = await requireDb() as any;

    await db
      .delete(userMenuCustomization)
      .where(
        and(
          eq(userMenuCustomization.userId, userId),
          eq(userMenuCustomization.menuItemId, menuItemId)
        )
      );
  }

  /**
   * 重置菜单自定义
   */
  async resetMenuCustomization(userId: string): Promise<void> {
    const db = await requireDb() as any;

    await db
      .delete(userMenuCustomization)
      .where(eq(userMenuCustomization.userId, userId));
  }

  /**
   * 获取菜单项详情
   */
  async getMenuItemDetails(menuItemId: number): Promise<MenuItem | null> {
    const db = await requireDb() as any;

    const menu = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, menuItemId))
      .limit(1);

    return menu.length > 0 ? menu[0] : null;
  }

  /**
   * 创建菜单项
   */
  async createMenuItem(data: {
    code: string;
    name: string;
    icon?: string;
    path?: string;
    parentId?: number;
    level?: number;
    order?: number;
    menuType?: string;
    requiredPermission?: string;
    requiredRole?: string;
    i18nKey?: string;
  }): Promise<number> {
    const db = await requireDb() as any;

    const result = await db.insert(menuItems).values({
      code: data.code,
      name: data.name,
      icon: data.icon,
      path: data.path,
      parentId: data.parentId,
      level: data.level || 1,
      order: data.order || 0,
      menuType: data.menuType || 'link',
      requiredPermission: data.requiredPermission,
      requiredRole: data.requiredRole,
      i18nKey: data.i18nKey,
      isActive: true,
      isVisible: true,
    });

    return result.insertId;
  }

  /**
   * 更新菜单项
   */
  async updateMenuItem(
    menuItemId: number,
    data: Partial<MenuItem>
  ): Promise<void> {
    const db = await requireDb() as any;

    await db.update(menuItems).set(data).where(eq(menuItems.id, menuItemId));
  }

  /**
   * 删除菜单项
   */
  async deleteMenuItem(menuItemId: number): Promise<void> {
    const db = await requireDb() as any;

    // 检查是否有子菜单
    const children = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.parentId, menuItemId))
      .limit(1000);

    if (children.length > 0) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Cannot delete menu with children',
      });
    }

    // 删除菜单项
    await db.delete(menuItems).where(eq(menuItems.id, menuItemId));

    // 删除相关的自定义设置
    await db
      .delete(userMenuCustomization)
      .where(eq(userMenuCustomization.menuItemId, menuItemId));

    // 删除相关的访问日志
    await db
      .delete(menuAccessLogs)
      .where(eq(menuAccessLogs.menuItemId, menuItemId));
  }
}

/**
 * 导出单例
 */
export const menuService = new MenuService();

