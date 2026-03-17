import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

/**
 * Article shape expected from the help router.
 * Defined locally so the hook works even if the router/schema isn't registered yet.
 */
export interface HelpArticle {
  id: number | string;
  routePath: string | null;
  featureKey: string | null;
  category: "GETTING_STARTED" | "FEATURE_GUIDE" | "FAQ" | "TROUBLESHOOTING" | "BEST_PRACTICE" | "CHANGELOG" | "WALKTHROUGH";
  title: string;
  titleZh: string;
  content: string;
  contentZh: string;
  sortOrder: number;
  tags?: string[] | null;
  relatedRoutes?: string[] | null;
  videoUrl?: string | null;
  isActive?: boolean;
}

/**
 * useContextualHelp — provides route-aware help articles.
 *
 * Uses tRPC's `help.getContextualHelp` and `help.searchHelp` queries.
 * Gracefully returns empty data if the help router is unavailable.
 */
export function useContextualHelp() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  // ---------------------------------------------------------------------------
  // Contextual articles for the current route
  // ---------------------------------------------------------------------------
  // Call the tRPC hook at the top level (unconditionally) — this is required
  // by React's Rules of Hooks.
  const contextualQuery = trpc.help.getContextualHelp.useQuery(
    { routePath: location },
    {
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const articles: HelpArticle[] = (contextualQuery?.data?.articles ?? []) as any;
  const isLoading: boolean = contextualQuery?.isLoading ?? false;

  // ---------------------------------------------------------------------------
  // Search across all help articles
  // ---------------------------------------------------------------------------
  const searchQueryResult = trpc.help.searchHelp.useQuery(
    { query: searchQuery },
    {
      enabled: searchQuery.trim().length > 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const searchResults: HelpArticle[] = (searchQueryResult?.data ?? []) as any;
  const isSearching: boolean = searchQueryResult?.isLoading ?? false;

  /**
   * Trigger a help search.
   */
  const search = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /**
   * Clear the current search and return to contextual articles.
   */
  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  return {
    /** Articles relevant to the current route */
    articles,
    /** Whether contextual articles are loading */
    isLoading,
    /** Initiate a search */
    search,
    /** Clear the active search */
    clearSearch,
    /** Current search query string */
    searchQuery,
    /** Results of the latest search */
    searchResults,
    /** Whether search results are loading */
    isSearching,
    /** The current route path */
    currentRoute: location,
  };
}
