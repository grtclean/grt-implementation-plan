/**
 * useCopilot — 3-tier search hook for CopilotBar
 *
 * Tier 1 (instant): Fuzzy match against menuConfig items
 * Tier 2 (300ms debounce): tRPC help.searchHelp for articles
 * Tier 3 (on Enter): tRPC help.askCopilot — LLM-powered Q&A
 */
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { menuConfig } from "@/config/menuConfig";

// ── Types ──

export interface MenuMatch {
  name: string;
  nameEn: string;
  path: string;
  groupName: string;
}

export interface HelpMatch {
  id: number;
  title: string;
  titleZh: string;
  category: string;
  routePath: string | null;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { type: "help" | "kb"; title: string; id: number }[];
  suggestedActions?: { title: string; route: string | null }[];
}

export interface CopilotState {
  query: string;
  menuMatches: MenuMatch[];
  helpMatches: HelpMatch[];
  aiAnswer: string | null;
  aiSources: { type: "help" | "kb"; title: string; id: number }[];
  conversation: ConversationMessage[];
  isSearching: boolean;
  isAskingAI: boolean;
}

// ── Flatten menu for fuzzy search (stable, computed once) ──

function flattenMenu(): MenuMatch[] {
  const items: MenuMatch[] = [];
  for (const group of menuConfig) {
    if (group.items) {
      for (const item of group.items) {
        items.push({
          name: item.name,
          nameEn: item.nameEn,
          path: item.path,
          groupName: group.name,
        });
      }
    }
  }
  return items;
}

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  return lower.includes(q);
}

// ── Hook ──

export function useCopilot() {
  const [location] = useLocation();
  const [state, setState] = useState<CopilotState>({
    query: "",
    menuMatches: [],
    helpMatches: [],
    aiAnswer: null,
    aiSources: [],
    conversation: [],
    isSearching: false,
    isAskingAI: false,
  });

  // menuConfig is a static import — flatMenu never changes
  const flatMenu = useMemo(() => flattenMenu(), []);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to capture latest query + conversation without stale closures
  const queryRef = useRef(state.query);
  queryRef.current = state.query;
  const conversationRef = useRef(state.conversation);
  conversationRef.current = state.conversation;

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // tRPC
  const searchHelpQuery = trpc.help.searchHelp.useQuery(
    { query: state.query, limit: 5 },
    {
      enabled: state.query.length >= 2 && state.isSearching,
      refetchOnWindowFocus: false,
    }
  );

  const askCopilotMutation = trpc.help.askCopilot.useMutation();
  const feedbackMutation = trpc.help.recordCopilotFeedback.useMutation();

  // Sync help results — use data reference to avoid loop
  const searchData = searchHelpQuery.data;
  useEffect(() => {
    if (searchData) {
      setState((prev) => {
        if (!prev.isSearching) return prev;
        return {
          ...prev,
          helpMatches: searchData.map((a) => ({
            id: a.id as number,
            title: a.title,
            titleZh: a.titleZh,
            category: a.category,
            routePath: a.routePath,
          })),
          isSearching: false,
        };
      });
    }
  }, [searchData]);

  // Tier 1: Instant menu match
  const setQuery = useCallback(
    (query: string) => {
      const menuMatches = query.length >= 1
        ? flatMenu
            .filter(
              (item) =>
                fuzzyMatch(item.name, query) ||
                fuzzyMatch(item.nameEn, query) ||
                fuzzyMatch(item.path, query)
            )
            .slice(0, 6)
        : [];

      setState((prev) => ({
        ...prev,
        query,
        menuMatches,
        helpMatches: query.length < 2 ? [] : prev.helpMatches,
        aiAnswer: null,
        aiSources: [],
      }));

      // Tier 2: debounced help search
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (query.length >= 2) {
        debounceTimer.current = setTimeout(() => {
          setState((prev) => ({ ...prev, isSearching: true }));
        }, 300);
      }
    },
    [flatMenu]
  );

  // Tier 3: LLM Q&A (on Enter)
  const askAI = useCallback(
    async (explicitQuery?: string) => {
      const q = explicitQuery || queryRef.current;
      if (!q.trim()) return;

      const userMsg: ConversationMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: q,
      };

      setState((prev) => ({
        ...prev,
        conversation: [...prev.conversation, userMsg],
        isAskingAI: true,
        aiAnswer: null,
        query: "", // Clear query immediately to prevent double-submit
      }));

      try {
        // Use ref for latest conversation to avoid stale closure
        const history = conversationRef.current.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const result = await askCopilotMutation.mutateAsync({
          query: q,
          routePath: location,
          conversationHistory: history,
        });

        const assistantMsg: ConversationMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: result.answer ?? "",
          sources: result.sources,
          suggestedActions: result.suggestedActions,
        };

        setState((prev) => ({
          ...prev,
          aiAnswer: result.answer,
          aiSources: result.sources,
          conversation: [...prev.conversation, assistantMsg],
          isAskingAI: false,
        }));
      } catch {
        const errorMsg: ConversationMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "AI服务暂时不可用，请稍后重试。",
        };
        setState((prev) => ({
          ...prev,
          conversation: [...prev.conversation, errorMsg],
          isAskingAI: false,
        }));
      }
    },
    [location, askCopilotMutation]
  );

  // Feedback
  const sendFeedback = useCallback(
    (messageId: string, isPositive: boolean, comment?: string) => {
      const conv = conversationRef.current;
      const msgIdx = conv.findIndex((m) => m.id === messageId);
      if (msgIdx < 0 || conv[msgIdx].role !== "assistant") return;

      // Find the preceding user message
      const userMsg = conv
        .slice(0, msgIdx)
        .reverse()
        .find((m) => m.role === "user");

      if (!userMsg) return;

      feedbackMutation.mutate({
        query: userMsg.content,
        answer: conv[msgIdx].content,
        routePath: location,
        isPositive,
        comment,
      });
    },
    [location, feedbackMutation]
  );

  // Reset conversation
  const clearConversation = useCallback(() => {
    setState({
      query: "",
      menuMatches: [],
      helpMatches: [],
      aiAnswer: null,
      aiSources: [],
      conversation: [],
      isSearching: false,
      isAskingAI: false,
    });
  }, []);

  return {
    ...state,
    setQuery,
    askAI,
    sendFeedback,
    clearConversation,
    currentRoute: location,
  };
}
