import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, Eye, EyeOff, Loader2, LogIn, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type Mode = "login" | "register";

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

  // If already authenticated, redirect to home
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

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

      // Show success
      setSuccessMsg(mode === "login" ? t("auth.loginRedirect") : (data.message || t("auth.registerRedirect")));

      // Refresh auth state (fetches /api/auth/me with the new cookie),
      // then navigate via client-side routing (no full page reload).
      const ok = await refresh();
      if (ok) {
        navigate("/", { replace: true });
      } else {
        // Fallback: full page reload if refresh somehow fails
        window.location.href = "/";
      }
    } catch (err: any) {
      // Show the actual error for diagnostics instead of a generic "network error"
      const detail = err?.message || String(err);
      setError(tpl("auth.networkErrorWithDetail", { detail }));
      setLoading(false);
    }
  };

  // Don't show login page if already authenticated
  if (!authLoading && isAuthenticated) {
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
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 ${
              mode === "register"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            {t("auth.register")}
          </button>
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
    </div>
  );
}
