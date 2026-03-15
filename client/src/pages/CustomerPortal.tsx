/**
 * GRT 客户门户 — Customer Portal
 *
 * 客户使用 portalUserId + password 登录
 * 登录后根据授权等级显示可查阅的文档通道
 *
 * 发给客户的链接: https://{domain}/customer-portal
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Shield,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
  Unlock,
  Eye,
  Download,
  Clock,
  User,
  Mail,
  Building2,
  BookOpen,
  KeyRound,
  Loader2,
} from "lucide-react";

// ── Types ──

interface PortalSession {
  id: number;
  portalUserId: string;
  name: string;
  email: string;
  accountId: string;
  role: string;
}

interface ReadingChannel {
  id: number;
  docCategory: string;
  docCategoryLabel: string | null;
  accessLevel: string;
  accessTier: number;
  isViewable: boolean;
  isDownloadable: boolean;
  recommendedReason: string | null;
}

// ── Tier label map ──

const TIER_LABELS: Record<string, string> = {
  V0_Strategic_Partner: "V0 战略合作伙伴",
  V1_Key_Account: "V1 大客户",
  V2_Standard: "V2 标准客户",
  V3_Prospect: "V3 潜在客户",
  V4_Dormant: "V4 休眠客户",
};

const ACCESS_LEVEL_CONFIG: Record<string, { label: string; color: string; bgClass: string }> = {
  full: { label: "完全开放", color: "text-green-600", bgClass: "bg-green-50 border-green-200 text-green-700" },
  view_only: { label: "仅查看", color: "text-yellow-600", bgClass: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  restricted: { label: "受限", color: "text-orange-600", bgClass: "bg-orange-50 border-orange-200 text-orange-700" },
  blocked: { label: "封锁", color: "text-red-600", bgClass: "bg-red-50 border-red-200 text-red-700" },
};

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function CustomerPortal() {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // tRPC queries — public procedures, fire after login
  const profileQuery = trpc.customerConfigSandbox.portalUser.portalGetProfile.useQuery(
    session?.accountId ?? "",
    { enabled: !!session?.accountId },
  );
  const readingQuery = trpc.customerConfigSandbox.portalUser.portalGetReadingChannels.useQuery(
    profileQuery.data?.id ?? 0,
    { enabled: !!profileQuery.data?.id },
  );

  const verifyMutation = trpc.customerConfigSandbox.portalUser.verifyCredentials.useMutation();

  const customerProfile = profileQuery.data;
  const readingChannels: ReadingChannel[] = (readingQuery.data ?? []) as ReadingChannel[];

  const handleLogin = useCallback(async () => {
    if (!username.trim() || !password.trim()) {
      setLoginError("请输入用户名和密码");
      return;
    }
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const result = await verifyMutation.mutateAsync({
        portalUserId: username.trim(),
        password: password,
      });
      if (result.valid && result.user) {
        setSession(result.user as PortalSession);
        setPassword(""); // clear password from state
      } else {
        setLoginError(result.reason ?? "登录失败");
      }
    } catch {
      setLoginError("系统错误，请稍后重试");
    }
    setIsLoggingIn(false);
  }, [username, password, verifyMutation]);

  const handleLogout = useCallback(() => {
    setSession(null);
    setUsername("");
    setPassword("");
    setLoginError("");
  }, []);

  // ── Login screen ──
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">GRT 客户门户</h1>
            <p className="text-sm text-gray-500 mt-1">Customer Portal — 安全访问您的项目文档</p>
          </div>

          {/* Login card */}
          <Card className="shadow-xl border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <LogIn className="w-5 h-5 text-blue-600" />
                客户登录
              </CardTitle>
              <CardDescription>使用您的门户账户登录</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="portal-username" className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  用户名
                </Label>
                <Input
                  id="portal-username"
                  placeholder="请输入用户名 (如 millison_admin)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portal-password" className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                  密码
                </Label>
                <Input
                  id="portal-password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  autoComplete="current-password"
                />
              </div>

              {loginError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2.5 rounded-lg border border-red-200">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {loginError}
                </div>
              )}

              <Button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    验证中...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    登录
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-400 mt-3">
                登录凭证由 GRT 项目经理分配 — 如需帮助请联系您的对接人
              </p>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-xs text-center text-gray-400">
            GRT 智能制造系统 &copy; 2026 — 安全加密传输
          </p>
        </div>
      </div>
    );
  }

  // ── Logged-in portal ──
  const tierLabel = customerProfile?.cooperationTier
    ? TIER_LABELS[customerProfile.cooperationTier] ?? customerProfile.cooperationTier
    : "—";

  const viewableCount = readingChannels.filter((c) => c.isViewable).length;
  const downloadableCount = readingChannels.filter((c) => c.isDownloadable).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">GRT 客户门户</h1>
              <p className="text-[10px] text-gray-400">Customer Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <p className="text-sm font-medium text-gray-700">{session.name}</p>
              <p className="text-[10px] text-gray-400">{session.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5">
              <LogOut className="w-3.5 h-3.5" />
              退出
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome + profile card */}
        <Card className="border-blue-100 bg-gradient-to-r from-blue-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                  {(customerProfile?.companyName ?? session.accountId).charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {customerProfile?.companyName ?? session.accountId}
                  </h2>
                  <p className="text-sm text-gray-500">{customerProfile?.companyNameEn ?? ""}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
                      {tierLabel}
                    </Badge>
                    {customerProfile?.industry && (
                      <span className="text-xs text-gray-400">{customerProfile.industry}</span>
                    )}
                    {customerProfile?.city && (
                      <span className="text-xs text-gray-400">{customerProfile.city}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">登录身份</p>
                <p className="text-sm font-mono text-gray-600">{session.portalUserId}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {session.role === "admin" ? "管理员" : session.role === "engineer" ? "工程师" : "查看者"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{readingChannels.length}</p>
                <p className="text-xs text-gray-500">文档类别</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{viewableCount}</p>
                <p className="text-xs text-gray-500">可查看</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Download className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{downloadableCount}</p>
                <p className="text-xs text-gray-500">可下载</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document access channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-blue-600" />
              您的授权文档通道
            </CardTitle>
            <CardDescription>
              根据您的合作等级，以下为您可访问的文档列表
            </CardDescription>
          </CardHeader>
          <CardContent>
            {readingChannels.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂未配置文档通道 — 请联系 GRT 项目经理</p>
              </div>
            ) : (
              <div className="space-y-2">
                {readingChannels.map((ch) => {
                  const config = ACCESS_LEVEL_CONFIG[ch.accessLevel] ?? ACCESS_LEVEL_CONFIG.blocked;
                  const isAccessible = ch.isViewable;
                  return (
                    <div
                      key={ch.id}
                      className={`flex items-center justify-between p-3.5 rounded-lg border transition-colors ${
                        isAccessible ? "border-gray-200 hover:bg-gray-50 cursor-pointer" : "border-gray-100 bg-gray-50/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          isAccessible ? "bg-blue-50" : "bg-gray-100"
                        }`}>
                          {isAccessible ? (
                            <FileText className="w-4.5 h-4.5 text-blue-600" />
                          ) : (
                            <Lock className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${isAccessible ? "text-gray-900" : "text-gray-400"}`}>
                            {ch.docCategoryLabel ?? ch.docCategory}
                          </p>
                          {ch.recommendedReason && (
                            <p className="text-[11px] text-gray-400 mt-0.5">{ch.recommendedReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 mr-2">
                          <Eye className={`w-3.5 h-3.5 ${ch.isViewable ? "text-green-500" : "text-gray-300"}`} />
                          <Download className={`w-3.5 h-3.5 ${ch.isDownloadable ? "text-green-500" : "text-gray-300"}`} />
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${config.bgClass}`}>
                          {isAccessible ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help */}
        <Card className="border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">需要帮助?</p>
                  <p className="text-xs text-gray-400">如需更高权限或有问题，请联系您的 GRT 项目对接人</p>
                </div>
              </div>
              <Button variant="outline" size="sm">联系项目经理</Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 mt-8">
        <p className="text-xs text-center text-gray-400">
          GRT 智能制造系统 &copy; 2026 — 所有文档受知识产权保护，未经授权不得传播
        </p>
      </footer>
    </div>
  );
}
