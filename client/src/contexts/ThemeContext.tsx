import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark"; // The actual theme being applied
  setTheme: (theme: Theme) => void;
  toggleTheme?: () => void;
  switchable: boolean;
  isSynced: boolean; // Whether preferences are synced with server
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

// Resolve system theme preference
const getSystemTheme = (): "light" | "dark" => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (switchable && typeof window !== 'undefined') {
      const stored = localStorage.getItem("grt-theme");
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as Theme;
      }
    }
    return defaultTheme;
  });
  
  // Skip server sync on public pages where user is not authenticated
  const isPublicPage = typeof window !== 'undefined' &&
    (window.location.pathname === '/login' || window.location.pathname === '/login-success');

  // Start initialized if: public page OR localStorage already has a cached theme.
  // This prevents the tRPC query from firing on initial load (avoids state transitions / flickering).
  const [isInitialized, setIsInitialized] = useState(() => {
    if (isPublicPage) return true;
    if (switchable && typeof window !== 'undefined' && localStorage.getItem('grt-theme')) return true;
    return false;
  });
  const [isSynced, setIsSynced] = useState(false);

  // Calculate resolved theme
  const resolvedTheme: "light" | "dark" = theme === 'system' ? getSystemTheme() : theme;

  // tRPC mutations and queries for user preferences
  const updatePreferencesMutation = trpc.auth.updatePreferences.useMutation();
  const { data: userPreferences, isSuccess: isPreferencesLoaded, isError } = trpc.auth.getPreferences.useQuery(
    undefined,
    {
      retry: false,
      refetchOnWindowFocus: false,
      enabled: switchable && !isInitialized && !isPublicPage
    }
  );

  // Sync theme from user preferences on initial load
  useEffect(() => {
    if (isPreferencesLoaded && userPreferences?.theme && !isInitialized) {
      const userTheme = userPreferences.theme as Theme;
      if (['light', 'dark', 'system'].includes(userTheme)) {
        setThemeState(userTheme);
        localStorage.setItem('grt-theme', userTheme);
        setIsSynced(true);
      }
      setIsInitialized(true);
    }
  }, [isPreferencesLoaded, userPreferences, isInitialized]);

  // Handle error case - user not logged in
  useEffect(() => {
    if ((isError || isPublicPage) && !isInitialized) {
      setIsInitialized(true);
      setIsSynced(false);
    }
  }, [isError, isPublicPage, isInitialized]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (switchable) {
      localStorage.setItem("grt-theme", theme);
    }
  }, [resolvedTheme, theme, switchable]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Force re-render when system theme changes
      setThemeState(prev => prev);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Fallback initialization (short timeout - only needed for first-ever login with no localStorage)
  useEffect(() => {
    if (isInitialized) return;
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [isInitialized]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    
    if (switchable && typeof window !== 'undefined') {
      localStorage.setItem('grt-theme', newTheme);
    }
    
    // Sync to user preferences in background
    if (switchable) {
      updatePreferencesMutation.mutate(
        { theme: newTheme },
        {
          onSuccess: () => {
            setIsSynced(true);
            console.log('Theme preference synced to server:', newTheme);
          },
          onError: (error) => {
            setIsSynced(false);
            console.log('Theme preference sync skipped (user may not be logged in):', error.message);
          }
        }
      );
    }
  }, [switchable, updatePreferencesMutation]);

  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === "light" ? "dark" : "light";
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      resolvedTheme,
      setTheme, 
      toggleTheme, 
      switchable,
      isSynced
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
