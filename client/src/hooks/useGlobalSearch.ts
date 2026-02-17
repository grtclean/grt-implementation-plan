/**
 * Shared global search hook — used by both TopBarSearch and GlobalMenuSearch
 */
import { useState, useMemo, useCallback } from "react";
import { menuConfig, type MenuItem, type MenuGroup } from "@/config/menuConfig";
import { useUserProfile, ROLE_HIERARCHY } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";

export interface SearchResult {
  item: MenuItem;
  group: MenuGroup;
  score: number;
}

export function useGlobalSearch(maxResults = 12) {
  const [query, setQuery] = useState("");
  const { language } = useLanguage();
  const { currentUserRole, permissions } = useUserProfile();
  const currentLevel = ROLE_HIERARCHY[currentUserRole] ?? 0;

  // Role-filtered menu items
  const allItems = useMemo(() => {
    const results: { item: MenuItem; group: MenuGroup }[] = [];
    menuConfig.forEach(group => {
      if (group.allowedRoles?.length && !group.allowedRoles.includes(currentUserRole)) return;
      if (group.minLevel != null && currentLevel < group.minLevel) return;
      if (group.permissionKey && permissions) {
        const key = group.permissionKey as keyof typeof permissions;
        if (key in permissions && !permissions[key]) return;
      }
      group.items.forEach(item => {
        if (item.allowedRoles?.length && !item.allowedRoles.includes(currentUserRole)) return;
        if (item.minLevel != null && currentLevel < item.minLevel) return;
        results.push({ item, group });
      });
    });
    return results;
  }, [currentUserRole, currentLevel, permissions]);

  // Fuzzy search scoring
  const searchResults = useMemo((): SearchResult[] => {
    if (!query.trim()) return allItems.slice(0, Math.min(10, maxResults)).map(r => ({ ...r, score: 0 }));

    const q = query.toLowerCase();
    const scored = allItems.map(({ item, group }) => {
      let score = 0;
      const name = item.name.toLowerCase();
      const nameEn = item.nameEn.toLowerCase();
      const path = item.path.toLowerCase();
      const groupName = group.name.toLowerCase();

      if (name === q || nameEn === q) score += 100;
      else if (name.startsWith(q) || nameEn.startsWith(q)) score += 80;
      else if (name.includes(q) || nameEn.includes(q)) score += 60;
      else if (path.includes(q)) score += 40;
      else if (groupName.includes(q)) score += 20;
      else {
        const initials = nameEn.split(/\s+/).map(w => w[0]).join("").toLowerCase();
        if (initials.includes(q)) score += 30;
      }

      return { item, group, score };
    });

    return scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }, [query, allItems, maxResults]);

  const getItemName = useCallback((item: MenuItem) => {
    switch (language) {
      case "zh": return item.name;
      case "de": return item.nameDe || item.nameEn;
      case "fr": return item.nameFr || item.nameEn;
      default: return item.nameEn;
    }
  }, [language]);

  const getGroupName = useCallback((group: MenuGroup) => {
    switch (language) {
      case "zh": return group.name;
      case "de": return group.nameDe || group.nameEn;
      case "fr": return group.nameFr || group.nameEn;
      default: return group.nameEn;
    }
  }, [language]);

  return { allItems, searchResults, query, setQuery, getItemName, getGroupName, language };
}
