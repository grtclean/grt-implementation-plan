import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ExternalLink, Loader2, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

// Storage key for session token (must match server-side COOKIE_NAME)
const SESSION_STORAGE_KEY = "app_session_token";

export default function LoginSuccess() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(3);
  const [returnPath, setReturnPath] = useState("/");
  const [messageSent, setMessageSent] = useState(false);
  const [isPopup, setIsPopup] = useState(false);
  const [tokenStored, setTokenStored] = useState(false);

  useEffect(() => {
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
        console.log("[LoginSuccess] Token stored in localStorage");
      } catch (e) {
        console.error("[LoginSuccess] Failed to store token:", e);
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
        console.log("[LoginSuccess] Sent LOGIN_SUCCESS message to opener");
        
        // Also send after a short delay in case opener wasn't ready
        setTimeout(sendMessage, 300);
        setTimeout(sendMessage, 800);
        setTimeout(sendMessage, 1500);
      } catch (e) {
        console.log("Could not notify opener:", e);
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

    return () => clearInterval(timer);
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
          <CardTitle className="text-2xl text-green-600">登录成功！</CardTitle>
          <CardDescription className="text-base mt-2">
            您已成功登录系统
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              即将跳转到：
            </p>
            <code className="bg-muted px-3 py-1.5 rounded text-sm font-mono block">
              {returnPath}
            </code>
          </div>

          {tokenStored && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-700 dark:text-green-300 text-center flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                登录凭证已保存
              </p>
            </div>
          )}

          {isPopup && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                {messageSent ? (
                  <>
                    <CheckCircle className="w-4 h-4 inline mr-2 text-green-500" />
                    已通知原窗口，请返回预览窗口查看
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                    正在通知原窗口...
                  </>
                )}
              </p>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            {countdown > 0 ? (
              <p className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                窗口将在 <span className="font-bold text-primary">{countdown}</span> 秒后自动{isPopup ? "关闭" : "跳转"}
              </p>
            ) : (
              <p>正在{isPopup ? "关闭窗口" : "跳转"}...</p>
            )}
          </div>

          <div className="flex gap-3">
            {isPopup ? (
              <Button onClick={handleClose} className="flex-1" variant="default">
                <X className="w-4 h-4 mr-2" />
                关闭此窗口
              </Button>
            ) : (
              <Button onClick={handleGoToPage} className="flex-1" variant="default">
                <ExternalLink className="w-4 h-4 mr-2" />
                立即跳转
              </Button>
            )}
          </div>
          
          {isPopup && (
            <p className="text-xs text-center text-muted-foreground">
              关闭此窗口后，请返回原预览窗口。页面将自动刷新显示目标内容。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
