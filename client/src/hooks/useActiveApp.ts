import { useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { menuConfig, WAFFLE_APPS, type WaffleApp, type MenuGroup } from "@/config/menuConfig";

const STORAGE_KEY = "grt_active_app";
const DEFAULT_APP_ID = "workspace";

/**
 * Derives the active "app" from the current URL path.
 * Falls back to localStorage manual selection, then "workspace".
 */
export function useActiveApp() {
  const [location] = useLocation();
  const [manualAppId, setManualAppId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );

  // Build a lookup: path → app id (runs once, menuConfig is static)
  const pathToAppId = useMemo(() => {
    const map = new Map<string, string>();
    for (const app of WAFFLE_APPS) {
      const groups = menuConfig.filter((g: MenuGroup) =>
        app.menuGroupNames.includes(g.name)
      );
      for (const group of groups) {
        for (const item of group.items) {
          map.set(item.path, app.id);
        }
      }
    }
    return map;
  }, []);

  // Resolve active app: URL match → manual → default
  const activeAppId = useMemo(() => {
    const fromUrl = pathToAppId.get(location);
    if (fromUrl) return fromUrl;
    if (manualAppId && WAFFLE_APPS.some((a) => a.id === manualAppId))
      return manualAppId;
    return DEFAULT_APP_ID;
  }, [location, manualAppId, pathToAppId]);

  const activeApp = useMemo(
    () => WAFFLE_APPS.find((a) => a.id === activeAppId) ?? WAFFLE_APPS[0],
    [activeAppId]
  );

  const setActiveApp = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setManualAppId(id);
  }, []);

  return { activeApp, activeAppId, setActiveApp } as const;
}
