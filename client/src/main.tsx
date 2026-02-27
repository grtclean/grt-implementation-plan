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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      // Never throw query errors to ErrorBoundary — handle inline per-page
      throwOnError: false,
      // Keep data fresh for 30s — on page navigation, cached data shows
      // instantly (no loading spinner) while a background refetch updates it.
      // This eliminates the loading→content layout shift on every navigation.
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
      // Never throw mutation errors to ErrorBoundary — handle via onError callbacks
      throwOnError: false,
    },
  },
});

// Track if redirect is already in progress to prevent redirect loop / flickering
let isRedirecting = false;

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (isRedirecting) return;
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;

  // Don't redirect if already on login page or public showcase pages
  const currentPath = window.location.pathname;
  if (currentPath === "/login" || currentPath === "/login-success" || currentPath.startsWith("/showcase/")) return;

  isRedirecting = true;

  if (isLocalAuth) {
    window.location.href = "/login";
  } else {
    window.location.href = getLoginUrl();
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    // Debug: log all query errors for diagnosis
    console.error("🚨 [GRT tRPC Query Error]", {
      queryKey: event.query.queryKey,
      message: error instanceof TRPCClientError ? error.message : String(error),
      path: window.location.pathname,
    });
    // Only redirect on explicit auth errors, and add a delay to prevent rapid redirects
    if (!isRedirecting && error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) {
      // Check if we're on a public page - don't redirect from login
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/login-success" && currentPath !== "/auto-login.html" && !currentPath.startsWith("/showcase/")) {
        console.warn("🔒 [Auth] Unauthorized query detected, redirecting to login...");
        redirectToLoginIfUnauthorized(error);
      }
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    // Debug: log all mutation errors for diagnosis
    console.error("🚨 [GRT tRPC Mutation Error]", {
      mutationKey: event.mutation.options.mutationKey,
      message: error instanceof TRPCClientError ? error.message : String(error),
      path: window.location.pathname,
    });
    if (!isRedirecting && error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/login-success") {
        console.warn("🔒 [Auth] Unauthorized mutation detected, redirecting to login...");
        redirectToLoginIfUnauthorized(error);
      }
    }
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
        }).then((res) => {
          if (!res.ok) {
            console.error("🚨 [GRT API Response]", {
              url: typeof input === "string" ? input : (input as Request).url,
              status: res.status,
              statusText: res.statusText,
            });
          }
          return res;
        });
      },
    }),
  ],
});

// Wait for auth to resolve BEFORE rendering React.
// This eliminates all loading→content transitions and page jumping.
import { authReady } from "@/_core/hooks/useAuth";

// Dismiss the loading overlay and unlock CSS transitions.
// Uses INSTANT removal (no fade) — on remote desktop, a gradual opacity
// fade produces many intermediate frames that each look like a "jump."
// An instant switch is one clean frame update.
let loaderDismissed = false;
function dismissLoader() {
  if (loaderDismissed) return;
  loaderDismissed = true;
  const loader = document.getElementById("app-loader");
  if (loader) loader.remove();
  document.documentElement.style.backgroundColor = '';
  document.documentElement.classList.remove("no-transitions");
}

// Safety: always dismiss overlay within 4s, even if auth/render fails
setTimeout(dismissLoader, 4000);

authReady.then(async () => {
  createRoot(document.getElementById("root")!).render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <BehaviorProbeProvider enabled={true}>
          <App />
        </BehaviorProbeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );

  // Wait for fonts (max 2s) — display=optional means this resolves fast in practice
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise(r => setTimeout(r, 2000)),
    ]);
  } catch {}

  // Wait for first paint + initial data queries to settle.
  // The overlay stays visible until the page content is FULLY ready,
  // then is removed in one shot (no fade) for a clean single-frame switch.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Let React effects fire (80ms) then poll for query completion
      setTimeout(() => {
        const waitForQueries = (remaining: number) => {
          if (remaining <= 0 || queryClient.isFetching() === 0) {
            // One more rAF to ensure React has flushed all pending state updates
            requestAnimationFrame(() => dismissLoader());
          } else {
            setTimeout(() => waitForQueries(remaining - 50), 50);
          }
        };
        waitForQueries(1500); // max 1.5s for queries to settle
      }, 80);
    });
  });
}).catch(() => {
  // Auth failed — dismiss overlay anyway so user sees the login redirect
  dismissLoader();
});
