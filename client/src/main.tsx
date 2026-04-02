import { trpc } from "@/lib/trpc";
import { isPublicPath } from "@/lib/public-paths";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { getLoginUrl } from "./const";
import { toast } from "sonner";
import "./index.css";

// ============================================================
// P0 DIAGNOSTIC: Global error capture for fatal mount failures
// Catches errors BEFORE React even mounts (module-level crashes)
// ============================================================
const _fatalErrors: Array<{ ts: string; msg: string; stack?: string; source?: string }> = [];

// Track whether React has successfully mounted.
// After mount, errors are handled by React ErrorBoundaries — do NOT destroy the tree.
let _reactMounted = false;

function renderFatalDiagnostic() {
  // If React is already mounted, let ErrorBoundaries handle errors gracefully.
  // Only nuke the root if React never mounted (true pre-mount crash).
  if (_reactMounted) return;

  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="font-family:monospace;padding:24px;max-width:900px;margin:0 auto">
      <h1 style="color:#dc2626;font-size:20px">FATAL: Frontend failed to mount</h1>
      <p style="color:#666;margin:8px 0">${_fatalErrors.length} error(s) captured at ${new Date().toISOString()}</p>
      ${_fatalErrors.map((e, i) => `
        <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:12px 0">
          <p style="font-weight:bold;color:#dc2626;margin:0 0 4px">Error #${i + 1} [${e.source || 'unknown'}]</p>
          <p style="color:#b91c1c;margin:0 0 8px;font-size:14px">${e.msg}</p>
          <pre style="background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:4px;overflow-x:auto;font-size:11px;max-height:300px;overflow-y:auto">${e.stack || 'No stack trace'}</pre>
        </div>
      `).join('')}
    </div>
  `;
}

window.onerror = (message, source, lineno, colno, error) => {
  const entry = {
    ts: new Date().toISOString(),
    msg: String(message),
    stack: error?.stack || `at ${source}:${lineno}:${colno}`,
    source: 'window.onerror',
  };
  _fatalErrors.push(entry);
  console.error("[GRT window.onerror]", entry);
  renderFatalDiagnostic();
};

window.onunhandledrejection = (event) => {
  const err = event.reason;
  const entry = {
    ts: new Date().toISOString(),
    msg: err?.message || String(err),
    stack: err?.stack || 'No stack trace (unhandled promise rejection)',
    source: 'unhandledrejection',
  };
  _fatalErrors.push(entry);
  console.error("[GRT unhandledrejection]", entry);
  renderFatalDiagnostic();
};
// ============================================================

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

  // Don't redirect on public/customer pages
  if (isPublicPath()) return;

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
    if (!isRedirecting && error instanceof TRPCClientError) {
      if (error.message === UNAUTHED_ERR_MSG) {
        if (!isPublicPath()) {
          console.warn("🔒 [Auth] Unauthorized query detected, redirecting to login...");
          redirectToLoginIfUnauthorized(error);
        }
      } else if ((error.data as any)?.code === "FORBIDDEN") {
        if (!isPublicPath()) {
          isRedirecting = true;
          window.location.href = "/403";
        }
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
    if (!isRedirecting && error instanceof TRPCClientError) {
      if (error.message === UNAUTHED_ERR_MSG) {
        if (!isPublicPath()) {
          console.warn("🔒 [Auth] Unauthorized mutation detected, redirecting to login...");
          redirectToLoginIfUnauthorized(error);
        }
      } else if ((error.data as any)?.code === "FORBIDDEN") {
        toast.error("权限不足: " + (error.message || "无权执行此操作"));
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
  // Keep the inline background-color on <html> — clearing it causes a white flash
  // on standalone pages (customer portal) where no Layout component provides bg.
  // CSS will override it once fully loaded; the inline value acts as a seamless bridge.
  document.documentElement.classList.remove("no-transitions");
}

// Safety: dismiss overlay after 6s regardless (fallback for unexpected hangs)
setTimeout(dismissLoader, 6000);

// ── Standard path: full provider chain for employee/admin pages ──
// Customer pages are handled by customer-entry.tsx (selected in index.html).
authReady.then(async () => {
    // Dynamic import — only loads the full app bundle for non-customer pages.
    // Customer fast path above skips this entirely, saving ~800KB on mobile.
    const [
      { default: App },
      { default: ErrorBoundary },
      { BehaviorProbeProvider },
    ] = await Promise.all([
      import("./App"),
      import("./components/ErrorBoundary"),
      import("./components/BehaviorProbeProvider"),
    ]);
    try {
      createRoot(document.getElementById("root")!).render(
        <ErrorBoundary level="page" onError={(error, errorInfo) => {
          _fatalErrors.push({
            ts: new Date().toISOString(),
            msg: error.message,
            stack: error.stack + '\n\n--- Component Stack ---\n' + errorInfo.componentStack,
            source: 'React ErrorBoundary (root)',
          });
          console.error("[GRT React ErrorBoundary]", { error, errorInfo });
        }}>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <BehaviorProbeProvider enabled={true}>
                <App />
              </BehaviorProbeProvider>
            </QueryClientProvider>
          </trpc.Provider>
        </ErrorBoundary>
      );
      _reactMounted = true;
    } catch (mountError: any) {
      _fatalErrors.push({
        ts: new Date().toISOString(),
        msg: mountError?.message || String(mountError),
        stack: mountError?.stack || 'No stack (createRoot crash)',
        source: 'createRoot try-catch',
      });
      console.error("[GRT FATAL createRoot]", mountError);
      renderFatalDiagnostic();
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => dismissLoader());
    });
  }).catch(() => {
    dismissLoader();
  });
