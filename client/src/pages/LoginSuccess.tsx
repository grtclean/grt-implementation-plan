import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle, ExternalLink, Loader2, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

// Storage key for session token (must match server-side COOKIE_NAME)
const SESSION_STORAGE_KEY = "app_session_token";

export default function LoginSuccess() {
  const { t, tpl } = useLanguage();
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(3);
  const [returnPath, setReturnPath] = useState("/");
  const [messageSent, setMessageSent] = useState(false);
  const [isPopup, setIsPopup] = useState(false);
  const [tokenStored, setTokenStored] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Get the return path and token from URL params
    const params = new URLSearchParams(window.location.search);
    const path = params.get("returnPath") || "/";
    const token = params.get("token");
    setReturnPath(path);

    // Store token in localStorage if provided (fallback for when cookies don't work)
    if (token) {
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, token);
        setTokenStored(true);
      } catch (e) {
        // Token storage failed - login flow will still proceed via cookies
      }
    }

    // Check if this is a popup window opened from iframe
    const hasOpener = window.opener !== null;
    setIsPopup(hasOpener);
    
    if (hasOpener) {
      // Try to notify the opener (parent iframe) to refresh
      try {
        // Post message to opener to trigger refresh - try multiple times for reliability
        const sendMessage = () => {
          window.opener?.postMessage({ 
            type: "LOGIN_SUCCESS", 
            returnPath: path,
            token: token, // Also send token to opener
            timestamp: Date.now()
          }, "*");
        };
        
        // Send immediately
        sendMessage();
        setMessageSent(true);

        // Also send after a short delay in case opener wasn't ready
        const t1 = setTimeout(sendMessage, 300);
        const t2 = setTimeout(sendMessage, 800);
        const t3 = setTimeout(sendMessage, 1500);
        timers.push(t1, t2, t3);
      } catch {
        // Opener notification failed - countdown redirect will handle navigation
      }
    }

    // Countdown timer - shorter for better UX
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // If popup, close the window; otherwise redirect
          if (hasOpener) {
            window.close();
          } else {
            // Clean URL before redirecting (remove token from URL for security)
            window.history.replaceState({}, "", "/login-success");
            setLocation(path);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      timers.forEach(t => clearTimeout(t));
    };
  }, [setLocation]);

  const handleClose = () => {
    // Try to close if popup, otherwise redirect
    if (window.opener) {
      window.close();
    } else {
      setLocation(returnPath);
    }
  };

  const handleGoToPage = () => {
    // Clean URL before redirecting
    window.history.replaceState({}, "", "/login-success");
    setLocation(returnPath);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-600">{t("auth.loginSuccessTitle")}</CardTitle>
          <CardDescription className="text-base mt-2">
            {t("auth.loginSuccessDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("auth.redirectingTo")}
            </p>
            <code className="bg-muted px-3 py-1.5 rounded text-sm font-mono block">
              {returnPath}
            </code>
          </div>

          {tokenStored && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-700 dark:text-green-300 text-center flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {t("auth.credentialsSaved")}
              </p>
            </div>
          )}

          {isPopup && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                {messageSent ? (
                  <>
                    <CheckCircle className="w-4 h-4 inline mr-2 text-green-500" />
                    {t("auth.notifiedOpener")}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                    {t("auth.notifyingOpener")}
                  </>
                )}
              </p>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            {countdown > 0 ? (
              <p className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isPopup
                  ? tpl("auth.autoCloseIn", { countdown })
                  : tpl("auth.autoRedirectIn", { countdown })}
              </p>
            ) : (
              <p>{isPopup ? t("auth.closingWindow") : t("auth.redirectingNow")}</p>
            )}
          </div>

          <div className="flex gap-3">
            {isPopup ? (
              <Button onClick={handleClose} className="flex-1" variant="default">
                <X className="w-4 h-4 mr-2" />
                {t("auth.closeWindow")}
              </Button>
            ) : (
              <Button onClick={handleGoToPage} className="flex-1" variant="default">
                <ExternalLink className="w-4 h-4 mr-2" />
                {t("auth.redirectNow")}
              </Button>
            )}
          </div>
          
          {isPopup && (
            <p className="text-xs text-center text-muted-foreground">
              {t("auth.popupCloseHint")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
