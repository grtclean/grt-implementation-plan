import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { BehaviorProbeProvider } from "./components/BehaviorProbeProvider";
import { getLoginUrl } from "./const";
import "./index.css";

// Storage key for session token (must match server-side)
const SESSION_STORAGE_KEY = "app_session_token";

// ========== LOCAL AUTH MODE ==========
const isLocalAuth = import.meta.env.VITE_LOCAL_AUTH === "true";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;

  if (isLocalAuth) {
    // Local auth: redirect to local login page
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  } else {
    // Manus OAuth: redirect to OAuth login URL
    window.location.href = getLoginUrl();
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// Get session token from localStorage (fallback when cookies don't work in iframe)
const getSessionToken = (): string | null => {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
};

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson as any,
      fetch(input, init) {
        // Add Authorization header with token from localStorage if available
        const token = getSessionToken();
        const headers: HeadersInit = {
          ...(init?.headers || {}),
        };
        
        if (token) {
          (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
        }
        
        return globalThis.fetch(input, {
          ...(init ?? {}),
          headers,
          credentials: "include", // Still try cookies first
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <BehaviorProbeProvider enabled={true}>
        <App />
      </BehaviorProbeProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
