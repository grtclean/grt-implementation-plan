import { getLoginUrl } from "@/const";
import { useCallback, useEffect, useRef, useState } from "react";

type UseAuthReturn = {
  user: any;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  refresh: () => void;
  logout: () => Promise<void>;
};

const isLocalAuth = import.meta.env.VITE_LOCAL_AUTH === "true";

export function useAuth(): UseAuthReturn {
  // Skip auth fetch on public pages (login, login-success) to avoid unnecessary requests
  const isPublicPage = typeof window !== 'undefined' &&
    (window.location.pathname === '/login' || window.location.pathname === '/login-success');

  // On public pages, start with loading=false to avoid any state transition
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(!isPublicPage);
  const [error, setError] = useState<Error | null>(null);
  const hasFetched = useRef(false);

  // Fetch user info - only runs ONCE on mount via useRef guard
  useEffect(() => {
    // Public pages: no fetch needed, loading already false
    if (isPublicPage) return;

    if (!isLocalAuth) {
      // Non-local auth: check localStorage cache
      try {
        const cached = localStorage.getItem("manus-runtime-user-info");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed) setUser(parsed);
        }
      } catch {
        // ignore
      }
      setLoading(false);
      return;
    }

    // Local auth: fetch /api/auth/me exactly once
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setError(null);
      })
      .catch((err) => {
        setUser(null);
        setError(err as Error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Refresh auth status when returning from login page
  useEffect(() => {
    if (!isLocalAuth) return;
    
    // Check if we're returning from login page
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'success') {
      // Clear the search parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      window.history.replaceState({}, '', url.toString());
      
      // Refresh auth status
      refresh();
    }
  }, []);

  const refresh = useCallback(() => {
    if (!isLocalAuth) return;
    
    // Set loading to true before fetching
    setLoading(true);
    
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setError(null);
      })
      .catch((err) => {
        setUser(null);
        setError(err as Error);
      })
      .finally(() => {
        setLoading(false);
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
    setUser(null);
    window.location.href = isLocalAuth ? "/login" : getLoginUrl();
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    refresh,
    logout,
  };
}
