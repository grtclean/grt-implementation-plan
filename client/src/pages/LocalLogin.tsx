import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";

type Mode = "login" | "register";

export default function LocalLogin() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { username, password };
      if (mode === "register") {
        body.name = name || username;
        body.email = email;
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3">
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                minLength={3}
                autoComplete="username"
                autoFocus
              />
            </div>

            {mode === "register" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">显示名称</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="您的姓名（选填）"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com（选填）"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder={mode === "register" ? "至少6个字符" : "请输入密码"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
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
