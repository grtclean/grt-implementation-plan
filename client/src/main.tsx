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
    },
    mutations: {
      retry: false,
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

  // Don't redirect if already on login page
  const currentPath = window.location.pathname;
  if (currentPath === "/login" || currentPath === "/login-success") return;

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
    // Only redirect on explicit auth errors, and add a delay to prevent rapid redirects
    if (!isRedirecting && error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) {
      // Check if we're on a public page - don't redirect from login
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/login-success" && currentPath !== "/auto-login.html") {
        console.warn("[Auth] Unauthorized query detected, redirecting to login");
        redirectToLoginIfUnauthorized(error);
      }
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    if (!isRedirecting && error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/login-success") {
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
        });
      },
    }),
  ],
});

// Wait for auth to resolve BEFORE rendering React.
// This eliminates all loading→content transitions and page jumping.
import { authReady } from "@/_core/hooks/useAuth";

// Dismiss the loading overlay and unlock CSS transitions
let loaderDismissed = false;
function dismissLoader() {
  if (loaderDismissed) return;
  loaderDismissed = true;
  const loader = document.getElementById("app-loader");
  // Remove the inline background-color override — CSS `html { background-color: var(--background) }`
  // now handles it, so the transition is seamless (same color).
  document.documentElement.style.backgroundColor = '';
  if (loader) {
    loader.classList.add("fade-out");
    // Remove overlay after fade-out, then enable transitions one frame later
    // so that any pending style differences don't trigger visible transitions
    setTimeout(() => {
      loader.remove();
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("no-transitions");
      });
    }, 350);
  } else {
    document.documentElement.classList.remove("no-transitions");
  }
}

// Safety: always dismiss overlay within 3s, even if auth/render fails
setTimeout(dismissLoader, 3000);

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

  // Wait for fonts to load so text doesn't reflow after overlay dismisses
  try { await document.fonts.ready; } catch {}

  // Wait for first paint to complete before removing overlay
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      dismissLoader();
    });
  });
}).catch(() => {
  // Auth failed — dismiss overlay anyway so user sees the login redirect
  dismissLoader();
});
