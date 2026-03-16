import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { CheckCircle, ExternalLink, Loader2, LogIn, RefreshCw } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

// Storage key for session token (must match server-side)
const SESSION_STORAGE_KEY = "app_session_token";

interface RequireAuthProps {
  children: React.ReactNode;
}

// ========== LOCAL AUTH MODE ==========
const isLocalAuth = import.meta.env.VITE_LOCAL_AUTH === "true";

// Check if running inside an iframe
const isInIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

// Login prompt component for iframe mode (Manus OAuth only)
function IframeLoginPrompt({ onRefresh, loginSuccessReceived }: { onRefresh: () => void; loginSuccessReceived: boolean }) {
  const loginUrl = getLoginUrl();
  const currentPath = window.location.pathname;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loginWindowOpened, setLoginWindowOpened] = useState(false);

  const handleOpenInNewWindow = () => {
    const newWindow = window.open(loginUrl, '_blank');
    if (newWindow) {
      setLoginWindowOpened(true);
    }
  };

  const handleLoginInParent = () => {
    try {
      if (window.top) {
        window.top.location.href = loginUrl;
      }
    } catch (e) {
      window.open(loginUrl, '_blank');
      setLoginWindowOpened(true);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  const handleCheckAuth = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  useEffect(() => {
    if (loginSuccessReceived) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loginSuccessReceived]);

  if (loginSuccessReceived) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <CardTitle className="text-xl text-green-600">Login Successful!</CardTitle>
            <CardDescription>Refreshing page...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <LogIn className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Login Required</CardTitle>
          <CardDescription>
            Access to <code className="bg-muted px-1 py-0.5 rounded text-sm">{currentPath}</code> requires authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Due to security restrictions, login cannot be performed in a preview window. Please choose an option below:
          </p>
          <div className="space-y-3">
            <Button onClick={handleOpenInNewWindow} className="w-full" variant="default">
              <ExternalLink className="w-4 h-4 mr-2" />
              Login in new window
            </Button>
            <Button onClick={handleLoginInParent} className="w-full" variant="outline">
              <LogIn className="w-4 h-4 mr-2" />
              Login in main window
            </Button>
          </div>
          {loginWindowOpened && (
            <div className="pt-4 border-t border-border space-y-3">
              <p className="text-sm text-center text-primary font-medium">
                Login window opened. After login, click refresh below.
              </p>
              <Button onClick={handleRefresh} className="w-full" variant="secondary" disabled={isRefreshing}>
                {isRefreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Refresh page
              </Button>
            </div>
          )}
          {!loginWindowOpened && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              After login, click refresh or manually refresh the page.
            </p>
          )}
          <Button onClick={handleCheckAuth} className="w-full mt-2" variant="ghost" size="sm" disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Check login status
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RequireAuth({ children }: RequireAuthProps) {
  // === KEY FIX: Skip auth entirely for /login and /login-success pages ===
  const currentPath = window.location.pathname;
  const isPublicPage = currentPath === "/login" || currentPath === "/login-success" || currentPath.startsWith("/kiosk");

  const { isAuthenticated, loading, refresh } = useAuth();
  const [inIframe] = useState(() => isInIframe());

  const [checkCount, setCheckCount] = useState(0);
  const [loginSuccessReceived, setLoginSuccessReceived] = useState(false);

  const handleRefresh = useCallback(() => {
    if (refresh) {
      refresh();
    }
    setCheckCount(c => c + 1);
  }, [refresh]);

  // Listen for login success message from popup window (Manus OAuth mode only)
  useEffect(() => {
    if (isLocalAuth || isPublicPage) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "LOGIN_SUCCESS") {
        console.info("[RequireAuth] Received LOGIN_SUCCESS message", event.data);
        if (event.data.token) {
          try {
            localStorage.setItem(SESSION_STORAGE_KEY, event.data.token);
          } catch (e) {
            console.error("[RequireAuth] Failed to store token:", e);
          }
        }
        setLoginSuccessReceived(true);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isPublicPage]);

  // Auto-check for Manus iframe mode
  useEffect(() => {
    if (isLocalAuth || isPublicPage) return;
    if (inIframe && !isAuthenticated && !loading) {
      const interval = setInterval(() => {
        if (refresh) refresh();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [inIframe, isAuthenticated, loading, refresh, isPublicPage]);

  // Redirect to login page (only for non-public pages)
  useEffect(() => {
    if (isPublicPage) return; // Never redirect when already on login page
    if (!loading && !isAuthenticated) {
      console.error("🚫 [GRT Route Guard Redirect]", {
        reason: "Not authenticated",
        path: currentPath,
        mode: isLocalAuth ? "local-auth" : "oauth",
        inIframe,
      });
      if (isLocalAuth) {
        window.location.href = "/login";
      } else if (!inIframe) {
        window.location.href = getLoginUrl();
      }
    }
  }, [loading, isAuthenticated, inIframe, isPublicPage]);

  // Refresh auth status when returning from login page via back/forward navigation
  useEffect(() => {
    if (isPublicPage) return;

    const handlePopstate = () => {
      if (!loading && !isAuthenticated) {
        handleRefresh();
      }
    };

    window.addEventListener('popstate', handlePopstate);
    return () => {
      window.removeEventListener('popstate', handlePopstate);
    };
  }, [loading, isAuthenticated, handleRefresh, isPublicPage]);

  // === Public pages: always render children (login page, etc.) ===
  if (isPublicPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (!isLocalAuth && inIframe) {
      return <IframeLoginPrompt onRefresh={handleRefresh} loginSuccessReceived={loginSuccessReceived} />;
    }
    // Redirect is handled by the useEffect above; render nothing while waiting
    return null;
  }

  return <>{children}</>;
}
