import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { useRef, useState } from "react";

type Mode = "login" | "register";

export default function LocalLogin() {
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    const form = formRef.current;
    if (!form) return;

    const formData = new FormData(form);
    const username = (formData.get("username") as string) || "";
    const password = (formData.get("password") as string) || "";

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { username, password };
      if (mode === "register") {
        body.name = (formData.get("name") as string) || username;
        body.email = (formData.get("email") as string) || "";
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "操作失败");
        setLoading(false);
        return;
      }

      // Login/Register successful - redirect to home
      if (data.message) {
        setSuccessMsg(data.message);
      }
      // Small delay to show success, then redirect with login success flag
      setTimeout(() => {
        window.location.href = "/?login=success";
      }, 500);
    } catch (err) {
      setError("网络错误，请检查服务器连接");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3">
            {mode === "login" ? (
              <LogIn className="w-7 h-7 text-primary" />
            ) : (
              <UserPlus className="w-7 h-7 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            GRT 管理系统
          </CardTitle>
          <CardDescription className="text-base">
            {mode === "login" ? "登录您的账户" : "创建新账户"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="请输入用户名"
                required
                minLength={3}
                autoComplete="username"
                autoFocus
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
              />
            </div>

            {mode === "register" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">显示名称</Label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="您的姓名（选填）"
                    autoComplete="name"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com（选填）"
                    autoComplete="email"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder={mode === "register" ? "至少6个字符" : "请输入密码"}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="text-sm text-green-600 bg-green-500/10 rounded-md px-3 py-2">
                {successMsg}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : mode === "login" ? (
                <LogIn className="w-4 h-4 mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {mode === "login" ? "登录" : "注册"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                setSuccessMsg("");
              }}
            >
              {mode === "login"
                ? "没有账户？点击注册"
                : "已有账户？点击登录"}
            </button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground text-center">
            首个注册的用户将自动成为管理员
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
