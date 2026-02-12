import { getLoginUrl } from "@/const";
import { useCallback, useSyncExternalStore } from "react";

type UseAuthReturn = {
  user: any;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  refresh: () => void;
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

const isPublicPageGlobal = typeof window !== 'undefined' &&
  (window.location.pathname === '/login' || window.location.pathname === '/login-success');

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

// Start the singleton auth fetch immediately (module load time)
function startAuthFetch() {
  if (fetchStarted || isPublicPageGlobal) return;
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

export function useAuth(): UseAuthReturn {
  const state = useSyncExternalStore(subscribe, getSnapshot);

  const refresh = useCallback(() => {
    if (!isLocalAuth) return;

    // Don't set loading=true during refresh to avoid flickering.
    // The UI stays showing current content while we re-validate.
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
