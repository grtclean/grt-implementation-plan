/**
 * 菜单导航Hook
 * 用于前端菜单管理
 */

import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
// Define MenuItemWithChildren locally to avoid cross-project import issues
interface MenuItemWithChildren {
  id: number;
  name: string;
  path: string;
  icon: string;
  parentId: number;
  order: number;
  level: number;
  menuType: string;
  isActive: boolean;
  code: string;
  metadata: unknown;
  children?: MenuItemWithChildren[];
  isAccessible?: boolean;
  isVisible?: boolean;
  [key: string]: any;
}

/**
 * 获取用户菜单树Hook
 */
export function useUserMenuTree() {
  const { data, isLoading, error } = trpc.menu.getUserMenuTree.useQuery();

  return {
    menuTree: (data?.menuTree || []) as MenuItemWithChildren[],
    isLoading,
    error,
  };
}

/**
 * 获取用户最常访问菜单Hook
 */
export function useFrequentMenus(limit: number = 5) {
  const { data, isLoading, error } = trpc.menu.getUserFrequentMenus.useQuery({
    limit,
  });

  return {
    menus: data?.menus || [],
    isLoading,
    error,
  };
}

/**
 * 搜索菜单Hook
 */
export function useSearchMenus(query: string) {
  const { data, isLoading, error } = trpc.menu.searchMenus.useQuery(
    { query },
    { enabled: query.length > 0 }
  );

  return {
    results: data?.results || [],
    isLoading,
    error,
  };
}

/**
 * 菜单访问日志Hook
 */
export function useLogMenuAccess() {
  const mutation = trpc.menu.logMenuAccess.useMutation();

  const logAccess = (menuItemId: number) => {
    mutation.mutate({ menuItemId });
  };

  return { logAccess, isLoading: mutation.isPending };
}

/**
 * 菜单自定义Hook
 */
export function useMenuCustomization() {
  const hideMenuMutation = trpc.menu.hideMenuItem.useMutation();
  const showMenuMutation = trpc.menu.showMenuItem.useMutation();
  const resetMenuMutation = trpc.menu.resetMenuCustomization.useMutation();

  return {
    hideMenu: (menuItemId: number) => hideMenuMutation.mutate({ menuItemId }),
    showMenu: (menuItemId: number) => showMenuMutation.mutate({ menuItemId }),
    resetMenu: () => resetMenuMutation.mutate(),
    isLoading:
      hideMenuMutation.isPending ||
      showMenuMutation.isPending ||
      resetMenuMutation.isPending,
  };
}

/**
 * 扁平化菜单树
 */
export function flattenMenuTree(tree: MenuItemWithChildren[]): MenuItemWithChildren[] {
  const result: MenuItemWithChildren[] = [];

  for (const item of tree) {
    result.push(item);
    if (item.children && item.children.length > 0) {
      result.push(...flattenMenuTree(item.children));
    }
  }

  return result;
}

/**
 * 查找菜单项
 */
export function findMenuItem(
  tree: MenuItemWithChildren[],
  predicate: (item: MenuItemWithChildren) => boolean
): MenuItemWithChildren | undefined {
  for (const item of tree) {
    if (predicate(item)) {
      return item;
    }
    if (item.children && item.children.length > 0) {
      const found = findMenuItem(item.children, predicate);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/**
 * 获取菜单路径（面包屑）
 */
export function getMenuPath(
  tree: MenuItemWithChildren[],
  targetId: number
): MenuItemWithChildren[] {
  const path: MenuItemWithChildren[] = [];

  function search(items: MenuItemWithChildren[], id: number): boolean {
    for (const item of items) {
      path.push(item);
      if (item.id === id) {
        return true;
      }
      if (item.children && search(item.children, id)) {
        return true;
      }
      path.pop();
    }
    return false;
  }

  search(tree, targetId);
  return path;
}
