import { getLoginUrl } from "@/const";
import { isPublicPath } from "@/lib/public-paths";
import { useCallback, useSyncExternalStore } from "react";

type UseAuthReturn = {
  user: any;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
};

const isLocalAuth = import.meta.env.VITE_LOCAL_AUTH === "true";

// ========== Module-level singleton auth store ==========
// Shared across ALL useAuth() instances to avoid duplicate fetches and
// independent loading states that cause flickering.
type AuthState = { user: any; loading: boolean; error: Error | null };
let authState: AuthState = { user: null, loading: true, error: null };
let listeners: Set<() => void> = new Set();
let fetchStarted = false;

const isPublicPageGlobal = isPublicPath();

// On public pages, start with loading=false
if (isPublicPageGlobal) {
  authState = { user: null, loading: false, error: null };
}

function notifyListeners() {
  listeners.forEach((l) => l());
}

function setAuthState(partial: Partial<AuthState>) {
  authState = { ...authState, ...partial };
  notifyListeners();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot(): AuthState {
  return authState;
}

// Clean up ?login=success URL parameter immediately (before any React render)
if (isLocalAuth && typeof window !== 'undefined' && !isPublicPageGlobal) {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('login') === 'success') {
    const url = new URL(window.location.href);
    url.searchParams.delete('login');
    window.history.replaceState({}, '', url.toString());
  }
}

// Non-blocking background auth fetch for public pages that still need user data
// (e.g., /customer-workspace shows user name if logged in)
function startBackgroundAuthFetch() {
  if (fetchStarted || !isLocalAuth) return;
  fetchStarted = true;
  fetch("/api/auth/me", { credentials: "include" })
    .then((res) => res.ok ? res.json() : null)
    .then((data) => {
      if (data && (data.openId || data.name || data.email)) {
        setAuthState({ user: data, error: null, loading: false });
      }
    })
    .catch(() => { /* silent — page already rendered */ });
}

// Start the singleton auth fetch immediately (module load time)
function startAuthFetch() {
  if (fetchStarted || isPublicPageGlobal || (window as any).__GRT_SKIP_AUTH_FETCH) return;
  fetchStarted = true;

  if (!isLocalAuth) {
    // Non-local auth: check localStorage cache synchronously
    try {
      const cached = localStorage.getItem("manus-runtime-user-info");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) {
          setAuthState({ user: parsed, loading: false });
          return;
        }
      }
    } catch {
      // ignore
    }
    setAuthState({ loading: false });
    return;
  }

  // Local auth: single fetch
  fetch("/api/auth/me", { credentials: "include" })
    .then((res) => {
      if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (data && (data.openId || data.name || data.email)) {
        setAuthState({ user: data, error: null, loading: false });
      } else {
        setAuthState({ user: null, error: null, loading: false });
      }
    })
    .catch((err) => {
      setAuthState({ user: null, error: err as Error, loading: false });
    });
}

// Start fetch at module load
startAuthFetch();

// For public customer pages: render immediately, then silently fetch user data in background
if (isPublicPageGlobal && isLocalAuth && typeof window !== 'undefined') {
  const p = window.location.pathname;
  const needsUserData = p === '/customer-workspace' || p === '/customer/forum';
  if (needsUserData) {
    startBackgroundAuthFetch();
  }
}

// Promise that resolves when auth state is determined (loading=false).
// Used by main.tsx to delay React render until auth is ready.
export const authReady: Promise<void> = new Promise((resolve) => {
  if (!authState.loading) {
    resolve();
    return;
  }
  const unsub = subscribe(() => {
    if (!authState.loading) {
      unsub();
      resolve();
    }
  });
});

/**
 * Inject user data directly into auth state (no network fetch).
 * Used after customer registration — the server returns user data in the
 * registration response, so we can set it immediately for instant SPA navigation.
 */
export function setUserDirect(user: { openId: string; name: string; [k: string]: any }) {
  setAuthState({ user, error: null, loading: false });
}

export function useAuth(): UseAuthReturn {
  const state = useSyncExternalStore(subscribe, getSnapshot);

  const refresh = useCallback((): Promise<boolean> => {
    if (!isLocalAuth) return Promise.resolve(false);

    // Don't set loading=true during refresh to avoid flickering.
    // The UI stays showing current content while we re-validate.
    return fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && (data.openId || data.name || data.email)) {
          setAuthState({ user: data, error: null, loading: false });
          return true;
        } else {
          setAuthState({ user: null, error: null, loading: false });
          return false;
        }
      })
      .catch((err) => {
        setAuthState({ user: null, error: err as Error, loading: false });
        return false;
      });
  }, []);

  const logout = useCallback(async () => {
    if (isLocalAuth) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // ignore
      }
    }
    localStorage.removeItem("app_session_token");
    localStorage.removeItem("manus-runtime-user-info");
    setAuthState({ user: null, loading: false, error: null });
    window.location.href = isLocalAuth ? "/login" : getLoginUrl();
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: Boolean(state.user),
    refresh,
    logout,
  };
}
