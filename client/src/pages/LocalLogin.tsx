import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, Eye, EyeOff, Loader2, LogIn, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type Mode = "login" | "register"; // register disabled in UI — accounts provisioned by IT

export default function LocalLogin() {
  const { t, tpl } = useLanguage();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, loading: authLoading, refresh } = useAuth();
  const [, navigate] = useLocation();

  // 首次登录改密
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [changePwdUser, setChangePwdUser] = useState("");
  const [changePwdOld, setChangePwdOld] = useState("");
  const [changePwdNew, setChangePwdNew] = useState("");
  const [changePwdConfirm, setChangePwdConfirm] = useState("");
  const [changePwdError, setChangePwdError] = useState("");
  const [changePwdLoading, setChangePwdLoading] = useState(false);

  // If already authenticated, redirect to home (unless ?switch=1 for account switching)
  const isSwitchMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("switch") === "1";
  useEffect(() => {
    if (!authLoading && isAuthenticated && !isSwitchMode) {
      navigate("/", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, isSwitchMode]);

  // In switch mode, logout first so the new login cookie takes effect
  useEffect(() => {
    if (isSwitchMode && isAuthenticated && !authLoading) {
      fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => {
        // Clear URL param and reload to get clean state
        const url = new URL(window.location.href);
        url.searchParams.delete("switch");
        window.location.href = url.pathname;
      });
    }
  }, [isSwitchMode, isAuthenticated, authLoading]);

  // Focus username input on mode change
  useEffect(() => {
    usernameRef.current?.focus();
  }, [mode]);

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError("");
    setSuccessMsg("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    // Reset form
    formRef.current?.reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const form = formRef.current;
    if (!form) return;

    const formData = new FormData(form);
    const username = (formData.get("username") as string)?.trim() || "";
    const password = (formData.get("password") as string) || "";

    // Client-side validation
    if (username.length < 3) {
      setError(t("auth.usernameMinLength"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.passwordMinLength"));
      return;
    }

    if (mode === "register") {
      const confirmPassword = (formData.get("confirmPassword") as string) || "";
      if (password !== confirmPassword) {
        setError(t("auth.passwordMismatch"));
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { username, password };
      if (mode === "register") {
        body.name = (formData.get("name") as string)?.trim() || username;
        body.email = (formData.get("email") as string)?.trim() || "";
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("auth.actionFailed"));
        setLoading(false);
        return;
      }

      // 首次登录需修改密码
      if (data.mustChangePassword && mode === "login") {
        setChangePwdOpen(true);
        setChangePwdUser(username);
        setChangePwdOld(password);
        setLoading(false);
        return;
      }

      // Show success message briefly, then full page reload
      setSuccessMsg(mode === "login" ? t("auth.loginRedirect") : (data.message || t("auth.registerRedirect")));
      setLoading(false);

      // Full page reload to re-initialize auth singleton with fresh state.
      // Small delay to show the success message to the user
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (err: any) {
      // Show the actual error for diagnostics instead of a generic "network error"
      const detail = err?.message || String(err);
      setError(tpl("auth.networkErrorWithDetail", { detail }));
      setLoading(false);
    }
  };

  // Don't show login page if already authenticated (unless switching accounts)
  if (!authLoading && isAuthenticated && !isSwitchMode) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-[420px] space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-20 h-20 flex items-center justify-center">
            <img src="/GRTlogo.gif" alt="GRT" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t("auth.welcomeTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            Global Robot Technology
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 ${
              mode === "login"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LogIn className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            {t("auth.login")}
          </button>
          <span className="flex-1 py-2 px-4 text-xs text-muted-foreground text-center">
            员工号登录 · 初始密码由IT分配
          </span>
        </div>

        {/* Form Card */}
        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? t("auth.enterCredentials")
                : t("auth.fillForm")}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">{t("auth.username")} <span className="text-destructive">*</span></Label>
                <Input
                  ref={usernameRef}
                  id="username"
                  name="username"
                  type="text"
                  placeholder={t("auth.usernamePlaceholder")}
                  required
                  minLength={3}
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                />
              </div>

              {/* Register-only fields */}
              {mode === "register" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("auth.displayName")}</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder={t("auth.namePlaceholder")}
                      autoComplete="name"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("auth.email")}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder={t("auth.emailPlaceholder")}
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")} <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "register" ? t("auth.passwordMinLengthPlaceholder") : t("auth.passwordPlaceholder")}
                    required
                    minLength={6}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (register only) */}
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("auth.confirmPassword")} <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t("auth.confirmPasswordPlaceholder")}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5 border border-destructive/20">
                  <span className="shrink-0 mt-0.5">!</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Success Message */}
              {successMsg && (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-500/10 rounded-lg px-3 py-2.5 border border-green-500/20">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : mode === "login" ? (
                  <LogIn className="w-4 h-4 mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                {loading
                  ? (mode === "login" ? t("auth.loggingIn") : t("auth.registering"))
                  : (mode === "login" ? t("auth.login") : t("auth.register"))}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <p className="text-xs text-muted-foreground text-center">
          GRT System v2.0
        </p>
      </div>

      {/* 首次登录强制改密对话框 */}
      {changePwdOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg">首次登录 — 请修改密码</CardTitle>
              <CardDescription>
                为了账户安全，首次登录必须修改初始密码。新密码要求：
                <ul className="mt-2 text-xs space-y-0.5 list-disc pl-4">
                  <li>至少8位</li>
                  <li>包含大写字母、小写字母、数字、特殊字符</li>
                  <li>不能包含用户名</li>
                  <li>不能与初始密码相同</li>
                </ul>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setChangePwdError("");
                if (changePwdNew !== changePwdConfirm) { setChangePwdError("两次输入的新密码不一致"); return; }
                setChangePwdLoading(true);
                try {
                  const res = await fetch("/api/auth/change-password", {
                    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                    body: JSON.stringify({ username: changePwdUser, oldPassword: changePwdOld, newPassword: changePwdNew }),
                  });
                  const data = await res.json();
                  if (!res.ok) { setChangePwdError(data.error || "修改失败"); setChangePwdLoading(false); return; }
                  setChangePwdOpen(false);
                  setSuccessMsg("密码修改成功，请用新密码重新登录");
                  setChangePwdLoading(false);
                } catch { setChangePwdError("网络错误"); setChangePwdLoading(false); }
              }} className="space-y-3">
                <div>
                  <Label>用户名</Label>
                  <Input value={changePwdUser} disabled className="bg-muted" />
                </div>
                <div>
                  <Label>新密码</Label>
                  <Input type="password" value={changePwdNew} onChange={e => setChangePwdNew(e.target.value)}
                    placeholder="至少8位，含大小写+数字+特殊字符" required minLength={8} />
                </div>
                <div>
                  <Label>确认新密码</Label>
                  <Input type="password" value={changePwdConfirm} onChange={e => setChangePwdConfirm(e.target.value)}
                    placeholder="再次输入新密码" required />
                </div>
                {changePwdError && <p className="text-sm text-destructive">{changePwdError}</p>}
                <Button type="submit" className="w-full" disabled={changePwdLoading}>
                  {changePwdLoading ? "修改中..." : "修改密码并重新登录"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
