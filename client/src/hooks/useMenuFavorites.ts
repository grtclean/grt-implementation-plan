/**
 * 用户菜单收藏与自定义 Hook
 * 基于localStorage的收藏/隐藏/排序管理
 */
import { useState, useCallback, useMemo } from "react";
import { menuConfig, type MenuItem, type MenuGroup } from "@/config/menuConfig";

const FAVORITES_KEY = "grt_menu_favorites";
const HIDDEN_KEY = "grt_menu_hidden";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  return fallback;
}

function saveToStorage(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export interface FavoriteItem {
  path: string;
  name: string;
  nameEn: string;
}

export function useMenuFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() =>
    loadFromStorage<string[]>(FAVORITES_KEY, [])
  );
  const [hiddenItems, setHiddenItems] = useState<string[]>(() =>
    loadFromStorage<string[]>(HIDDEN_KEY, [])
  );

  // 收藏操作
  const addFavorite = useCallback((path: string) => {
    setFavorites(prev => {
      const next = prev.includes(path) ? prev : [...prev, path];
      saveToStorage(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((path: string) => {
    setFavorites(prev => {
      const next = prev.filter(p => p !== path);
      saveToStorage(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((path: string) => {
    setFavorites(prev => {
      const next = prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path];
      saveToStorage(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((path: string) => favorites.includes(path), [favorites]);

  // 隐藏操作
  const hideItem = useCallback((path: string) => {
    setHiddenItems(prev => {
      const next = prev.includes(path) ? prev : [...prev, path];
      saveToStorage(HIDDEN_KEY, next);
      return next;
    });
  }, []);

  const showItem = useCallback((path: string) => {
    setHiddenItems(prev => {
      const next = prev.filter(p => p !== path);
      saveToStorage(HIDDEN_KEY, next);
      return next;
    });
  }, []);

  const isHidden = useCallback((path: string) => hiddenItems.includes(path), [hiddenItems]);

  // 重置
  const resetAll = useCallback(() => {
    setFavorites([]);
    setHiddenItems([]);
    saveToStorage(FAVORITES_KEY, []);
    saveToStorage(HIDDEN_KEY, []);
  }, []);

  // 获取收藏的菜单项详情
  const favoriteItems = useMemo(() => {
    const allItems: MenuItem[] = [];
    menuConfig.forEach(g => g.items.forEach(i => allItems.push(i)));
    return favorites.map(path => allItems.find(i => i.path === path)).filter(Boolean) as MenuItem[];
  }, [favorites]);

  return {
    favorites,
    hiddenItems,
    favoriteItems,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    hideItem,
    showItem,
    isHidden,
    resetAll,
    favoritesCount: favorites.length,
    hiddenCount: hiddenItems.length,
  };
}
