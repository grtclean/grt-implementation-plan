import { translations, onTranslationsUpdated, type Language, languageNames, languageFlags } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useReducer } from "react";

// Static constant — never changes, safe to hoist outside component
const AVAILABLE_LANGUAGES: Language[] = ['zh', 'en', 'de', 'fr'];

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tpl: (key: string, vars: Record<string, string | number>) => string;
  languageNames: typeof languageNames;
  languageFlags: typeof languageFlags;
  availableLanguages: Language[];
  isChanging: boolean; // Animation state for language transition
  isSynced: boolean; // Whether preferences are synced with server
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Get saved language from localStorage or default to browser language
const getInitialLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('grt-language');
    if (saved && ['zh', 'en', 'de', 'fr'].includes(saved)) {
      return saved as Language;
    }
    // Try to detect browser language
    const browserLang = navigator.language.split('-')[0];
    if (['zh', 'en', 'de', 'fr'].includes(browserLang)) {
      return browserLang as Language;
    }
  }
  return 'zh';
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  const [isChanging, setIsChanging] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  // Re-render when lazy i18n modules finish loading and merge new translations
  const [, forceUpdate] = useReducer(c => c + 1, 0);
  useEffect(() => onTranslationsUpdated(forceUpdate), []);

  // Skip server sync on public pages where user is not authenticated
  const isPublicPage = typeof window !== 'undefined' &&
    (window.location.pathname === '/login' || window.location.pathname === '/login-success');

  // Start initialized if: public page OR localStorage already has a cached language.
  // This prevents the tRPC query from firing on initial load (avoids state transitions / flickering).
  const [isInitialized, setIsInitialized] = useState(() => {
    if (isPublicPage) return true;
    if (typeof window !== 'undefined' && localStorage.getItem('grt-language')) return true;
    return false;
  });

  // tRPC mutations and queries for user preferences
  const updatePreferencesMutation = trpc.auth.updatePreferences.useMutation();
  const { data: userPreferences, isSuccess: isPreferencesLoaded, isError } = trpc.auth.getPreferences.useQuery(
    undefined,
    {
      retry: false,
      refetchOnWindowFocus: false,
      enabled: !isInitialized && !isPublicPage
    }
  );

  // Sync language from user preferences on initial load
  useEffect(() => {
    if (isPreferencesLoaded && userPreferences?.language && !isInitialized) {
      const userLang = userPreferences.language as Language;
      if (['zh', 'en', 'de', 'fr'].includes(userLang)) {
        setLanguageState(userLang);
        localStorage.setItem('grt-language', userLang);
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

  // Fallback: if query hasn't resolved and isn't loading, initialize immediately
  useEffect(() => {
    if (isInitialized) return;
    // Initialize immediately — no 300ms delay that causes visible re-render
    setIsInitialized(true);
  }, [isInitialized]);

  const setLanguage = useCallback((lang: Language) => {
    // Start animation
    setIsChanging(true);
    
    // Short delay for fade-out effect
    setTimeout(() => {
      setLanguageState(lang);
      if (typeof window !== 'undefined') {
        localStorage.setItem('grt-language', lang);
      }
      
      // Sync to user preferences in background
      updatePreferencesMutation.mutate(
        { language: lang },
        {
          onSuccess: () => {
            setIsSynced(true);
          },
          onError: () => {
            setIsSynced(false);
          }
        }
      );
      
      // End animation after content updates
      setTimeout(() => {
        setIsChanging(false);
      }, 150);
    }, 100);
  }, [updatePreferencesMutation]);

  const t = useCallback((key: string): string => {
    return translations[language]?.[key]
      || translations['en']?.[key]
      || translations['zh']?.[key]
      || key;
  }, [language]);

  const tpl = useCallback((key: string, vars: Record<string, string | number>): string => {
    let result = translations[language]?.[key]
      || translations['en']?.[key]
      || translations['zh']?.[key]
      || key;
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(`{${k}}`, String(v));
    }
    return result;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    tpl,
    languageNames,
    languageFlags,
    availableLanguages: AVAILABLE_LANGUAGES,
    isChanging,
    isSynced,
  }), [language, setLanguage, t, tpl, isChanging, isSynced]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
