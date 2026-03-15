/**
 * CustomerConfigSandbox — 客户配置与档案库沙盘 (Sandbox ⑨)
 *
 * 6-zone layout:
 *   Zone 1: Customer Profile Card (档案卡片 + 合作等级)
 *   Zone 2: Brand Aesthetics (品牌视觉基因)
 *   Zone 3: Standards Mapping (技术商务标准映射)
 *   Zone 4: Product Interlock Matrix (核心产品线咬合矩阵)
 *   Zone 5: Customer List (客户列表 + 搜索)
 *   Zone 6: Dashboard Stats (概览统计)
 *
 * All data sourced from tRPC: customerConfigSandbox sub-routers
 */
import React, { useState, useMemo } from "react";
import { useSandboxPageEnhancements } from "@/components/Sandbox/useSandboxPageEnhancements";
import ShortcutOverlay from "@/components/Sandbox/ShortcutOverlay";
import SandboxEventFlowPanel from "@/components/Sandbox/SandboxEventFlowPanel";
import SandboxFileImport from "@/components/Sandbox/SandboxFileImport";
import {
  Building2,
  Palette,
  Shield,
  Link2,
  ChevronRight,
  Plus,
  Search,
  Users,
  TrendingUp,
  Star,
  ExternalLink,
  CheckCircle2,
  Clock,
  Zap,
  Eye,
  BookOpen,
  Lock,
  Unlock,
  Download,
  FileText,
  UserCog,
  KeyRound,
  Mail,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

// ── Tier Config ───────────────────────────────────────────

const TIER_CONFIG: Record<string, { label: string; color: string; bgClass: string }> = {
  V0_Strategic_Partner: { label: "V0 战略伙伴", color: "#FFB900", bgClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  V1_Key_Account: { label: "V1 大客户", color: "#0078D4", bgClass: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  V2_Standard: { label: "V2 标准", color: "#107C10", bgClass: "bg-green-500/10 text-green-400 border-green-500/30" },
  V3_Prospect: { label: "V3 潜在", color: "#A19F9D", bgClass: "bg-gray-500/10 text-gray-400 border-gray-500/30" },
  V4_Dormant: { label: "V4 休眠", color: "#605E5C", bgClass: "bg-gray-600/10 text-gray-500 border-gray-600/30" },
};

const TIMELINE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  past: { label: "历史", icon: Clock, color: "text-gray-400" },
  present: { label: "当下", icon: Zap, color: "text-cyan-400" },
  future: { label: "前瞻", icon: TrendingUp, color: "text-purple-400" },
};

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function CustomerConfigSandbox() {
  const { toast } = useToast();
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "brand" | "standards" | "interlock" | "reading" | "portal">("profile");
  const { shortcutOverlayOpen, setShortcutOverlayOpen, shortcuts, lastSaved, isSaving } = useSandboxPageEnhancements({
    sandboxShortcuts: [
      { key: "ctrl+p", label: "新建档案", action: () => { /* handled by profile form */ } },
    ],
    autoSave: {
      data: { selectedProfileId, activeTab },
      onSave: async (d) => { localStorage.setItem("grt-sb-customer", JSON.stringify(d)); },
    },
  });

  const utils = trpc.useUtils();

  // ── Queries ──────────────────────────────────────────────

  // Customer list
  const profileListQuery = (trpc.customerConfigSandbox as any).profile.list.useQuery(
    { search: searchTerm || undefined, limit: 200 },
    { keepPreviousData: true }
  );
  const customerList = profileListQuery.data?.rows ?? [];

  // Auto-select first customer when list loads
  React.useEffect(() => {
    if (selectedProfileId === null && customerList.length > 0) {
      setSelectedProfileId(customerList[0].id);
    }
  }, [customerList, selectedProfileId]);

  // Full profile (profile + brand + standards + interlocks)
  const fullProfileQuery = (trpc.customerConfigSandbox as any).profile.getFull.useQuery(
    selectedProfileId!,
    { enabled: selectedProfileId !== null }
  );
  const fullProfile = fullProfileQuery.data;
  const selectedProfile = fullProfile?.profile ?? null;
  const brandData = fullProfile?.brand ?? null;
  const standardsData = fullProfile?.standards ?? [];
  const interlocksData = fullProfile?.interlocks ?? [];

  // Reading channels for selected profile
  const readingQuery = (trpc.customerConfigSandbox as any).reading.list.useQuery(
    selectedProfileId!,
    { enabled: selectedProfileId !== null }
  );
  const readingChannels = readingQuery.data ?? [];

  // Portal users for selected profile's customerId
  const portalUsersQuery = (trpc.customerConfigSandbox as any).portalUser.list.useQuery(
    { accountId: selectedProfile?.customerId, limit: 50 },
    { enabled: !!selectedProfile?.customerId }
  );
  const portalUsers = portalUsersQuery.data ?? [];

  // Dashboard stats
  const dashboardStatsQuery = (trpc.customerConfigSandbox as any).dashboard.stats.useQuery();
  const dashboardStats = dashboardStatsQuery.data;

  // ── Mutations ────────────────────────────────────────────

  // Create profile
  const createProfileMutation = (trpc.customerConfigSandbox as any).profile.create.useMutation({
    onSuccess: (data: any) => {
      toast({ title: "成功", description: `客户档案「${data.companyName}」创建成功` });
      (utils.customerConfigSandbox as any).profile.list.invalidate();
      (utils.customerConfigSandbox as any).dashboard.stats.invalidate();
      setSelectedProfileId(data.id);
    },
    onError: (err: any) => {
      toast({ title: "创建失败", description: err.message, variant: "destructive" });
    },
  });

  // Create portal user
  const createPortalUserMutation = (trpc.customerConfigSandbox as any).portalUser.create.useMutation({
    onSuccess: (data: any) => {
      toast({ title: "成功", description: `门户账户「${data.portalUserId}」创建成功` });
      (utils.customerConfigSandbox as any).portalUser.list.invalidate();
    },
    onError: (err: any) => {
      toast({ title: "创建账户失败", description: err.message, variant: "destructive" });
    },
  });

  // Reset password
  const resetPasswordMutation = (trpc.customerConfigSandbox as any).portalUser.resetPassword.useMutation({
    onSuccess: () => {
      toast({ title: "成功", description: "密码已重置" });
    },
    onError: (err: any) => {
      toast({ title: "重置密码失败", description: err.message, variant: "destructive" });
    },
  });

  // Update portal user status
  const updateStatusMutation = (trpc.customerConfigSandbox as any).portalUser.updateStatus.useMutation({
    onSuccess: (data: any) => {
      toast({ title: "成功", description: `账户状态已更新为「${data.status === "active" ? "活跃" : data.status === "suspended" ? "暂停" : "停用"}」` });
      (utils.customerConfigSandbox as any).portalUser.list.invalidate();
    },
    onError: (err: any) => {
      toast({ title: "更新状态失败", description: err.message, variant: "destructive" });
    },
  });

  // Verify standard mapping
  const verifyStandardMutation = (trpc.customerConfigSandbox as any).standards.verify.useMutation({
    onSuccess: () => {
      toast({ title: "成功", description: "标准映射验证状态已更新" });
      (utils.customerConfigSandbox as any).profile.getFull.invalidate(selectedProfileId);
    },
    onError: (err: any) => {
      toast({ title: "验证失败", description: err.message, variant: "destructive" });
    },
  });

  // ── Handlers ─────────────────────────────────────────────

  const handleCreateProfile = () => {
    const name = window.prompt("请输入公司名称:");
    if (!name) return;
    const customerId = window.prompt("请输入客户ID (英文/数字，如 ACME_001):");
    if (!customerId) return;
    createProfileMutation.mutate({
      customerId,
      companyName: name,
      cooperationTier: "V2_Standard" as const,
      status: "draft" as const,
    });
  };

  const handleCreatePortalUser = () => {
    if (!selectedProfile) return;
    const userId = window.prompt("请输入门户用户名:");
    if (!userId) return;
    const email = window.prompt("请输入邮箱:");
    if (!email) return;
    const name = window.prompt("请输入姓名:");
    const password = window.prompt("请输入初始密码 (至少6位):");
    if (!password || password.length < 6) {
      toast({ title: "错误", description: "密码至少6位", variant: "destructive" });
      return;
    }
    createPortalUserMutation.mutate({
      portalUserId: userId,
      accountId: selectedProfile.customerId,
      email,
      name: name || undefined,
      password,
      role: "viewer",
    });
  };

  const handleResetPassword = (userId: number) => {
    const newPassword = window.prompt("请输入新密码 (至少6位):");
    if (!newPassword || newPassword.length < 6) {
      if (newPassword !== null) toast({ title: "错误", description: "密码至少6位", variant: "destructive" });
      return;
    }
    resetPasswordMutation.mutate({ id: userId, newPassword });
  };

  const handleToggleStatus = (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    updateStatusMutation.mutate({ id: userId, status: newStatus });
  };

  // ── Derived ──────────────────────────────────────────────

  const tier = TIER_CONFIG[selectedProfile?.cooperationTier ?? "V2_Standard"] ?? TIER_CONFIG.V2_Standard;
  const isLoading = profileListQuery.isLoading;

  const tabs = [
    { key: "profile" as const, label: "客户档案", icon: Building2 },
    { key: "brand" as const, label: "品牌基因", icon: Palette },
    { key: "standards" as const, label: "标准映射", icon: Shield },
    { key: "interlock" as const, label: "产品咬合", icon: Link2 },
    { key: "reading" as const, label: "授权阅读", icon: BookOpen },
    { key: "portal" as const, label: "客户账户", icon: UserCog },
  ];

  return (
    <div className="min-h-full bg-[#080c14] text-gray-200 p-4 space-y-4">
      <ShortcutOverlay open={shortcutOverlayOpen} onClose={() => setShortcutOverlayOpen(false)} commonShortcuts={shortcuts.commonShortcuts} sandboxShortcuts={shortcuts.sandboxShortcuts} sandboxTitle="客户配置" />
      <SandboxEventFlowPanel sandboxId="vip-strategic" className="mb-2" />
      {/* Zone 6: Top stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <StatCard label="客户总数" value={dashboardStats?.total ?? 0} icon={Users} color="#0078D4" loading={dashboardStatsQuery.isLoading} />
        <StatCard label="战略伙伴" value={dashboardStats?.strategic ?? 0} icon={Star} color="#FFB900" loading={dashboardStatsQuery.isLoading} />
        <StatCard label="标准映射" value={dashboardStats?.totalMappings ?? 0} icon={Shield} color="#E3008C" loading={dashboardStatsQuery.isLoading} />
        <StatCard label="产品咬合" value={dashboardStats?.totalInterlocks ?? 0} icon={Link2} color="#107C10" loading={dashboardStatsQuery.isLoading} />
        <StatCard label="阅读通道" value={readingChannels.length} icon={BookOpen} color="#9C27B0" loading={readingQuery.isLoading} />
        <StatCard label="验证通过" value={standardsData.filter((s: any) => s.isVerified).length} icon={CheckCircle2} color="#00B294" loading={fullProfileQuery.isLoading} />
      </div>

      {/* File import toolbar */}
      <div className="flex items-center gap-2">
        <SandboxFileImport
          accept=".csv"
          label="批量导入客户档案"
          onImport={(rows, fileName) => { toast({ title: "客户档案导入完成", description: `${rows.length} 行 · ${fileName}` }); }}
        />
      </div>

      <div className="flex gap-4 min-h-0">
        {/* Zone 5: Customer list (left sidebar within center) */}
        <div className="w-64 shrink-0 rounded-xl border border-gray-800 bg-[#0d1321] overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索客户..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-[#080c14] border border-gray-700 rounded-lg text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              </div>
            ) : customerList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-600">
                <Users className="h-6 w-6 mb-2 opacity-30" />
                <p className="text-xs">暂无客户数据</p>
              </div>
            ) : (
              customerList.map((c: any) => {
                const t = TIER_CONFIG[c.cooperationTier] ?? TIER_CONFIG.V2_Standard;
                const isActive = c.id === selectedProfileId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedProfileId(c.id)}
                    className={cn(
                      "w-full text-left px-3 py-3 border-b border-gray-800/50 transition-colors",
                      isActive ? "bg-cyan-500/10 border-l-2 border-l-cyan-400" : "hover:bg-gray-800/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="text-sm font-medium truncate">{c.companyName}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-[10px] text-gray-500">{c.customerId}</span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", t.bgClass)}>
                        {t.label}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="p-2 border-t border-gray-800">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs bg-transparent border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              onClick={handleCreateProfile}
              disabled={createProfileMutation.isPending}
            >
              {createProfileMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1" />
              )}
              新建客户档案
            </Button>
          </div>
        </div>

        {/* Right: Main content area */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Loading state for full profile */}
          {fullProfileQuery.isLoading && selectedProfileId !== null && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
          )}

          {/* No profile selected */}
          {selectedProfileId === null && !isLoading && (
            <EmptyState icon={Building2} message="请选择或创建一个客户档案" />
          )}

          {/* Zone 1: Profile header */}
          {selectedProfile && !fullProfileQuery.isLoading && (
            <>
              <div className="rounded-xl border border-gray-800 bg-[#0d1321] p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: brandData?.primaryColorHex ?? "#333" }}
                    >
                      {selectedProfile.companyName.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-100">{selectedProfile.companyName}</h2>
                      <p className="text-sm text-gray-500">{selectedProfile.companyNameEn}</p>
                    </div>
                  </div>
                  <span className={cn("px-3 py-1 rounded-full border text-xs font-medium", tier.bgClass)}>
                    {tier.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {selectedProfile.industry && (
                    <InfoCell label="行业" value={selectedProfile.industry} />
                  )}
                  {selectedProfile.city && (
                    <InfoCell label="城市" value={selectedProfile.city} />
                  )}
                  {selectedProfile.stockCode && (
                    <InfoCell label="股票代码" value={selectedProfile.stockCode} />
                  )}
                  {selectedProfile.annualRevenue && (
                    <InfoCell label="年收入" value={selectedProfile.annualRevenue} />
                  )}
                  {selectedProfile.employeeCount && (
                    <InfoCell label="员工数" value={`${selectedProfile.employeeCount.toLocaleString()}人`} />
                  )}
                  {selectedProfile.foundedYear && (
                    <InfoCell label="成立年份" value={String(selectedProfile.foundedYear)} />
                  )}
                  {selectedProfile.websiteUrl && (
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">官网</span>
                      <a
                        href={`https://${selectedProfile.websiteUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        {selectedProfile.websiteUrl}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                {selectedProfile.tags && selectedProfile.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {selectedProfile.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 text-[10px] rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 bg-[#0d1321] rounded-lg p-1 border border-gray-800">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                        activeTab === tab.key
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              {activeTab === "profile" && (
                <div className="rounded-xl border border-gray-800 bg-[#0d1321] p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-cyan-400" />
                    客户备注
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                    {selectedProfile.notes || "暂无备注信息"}
                  </p>
                </div>
              )}

              {/* Zone 2: Brand Aesthetics */}
              {activeTab === "brand" && brandData && (
                <div className="rounded-xl border border-gray-800 bg-[#0d1321] p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Palette className="h-4 w-4 text-cyan-400" />
                    品牌视觉基因 Brand DNA
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">主色调</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-8 h-8 rounded-lg border border-gray-600"
                          style={{ backgroundColor: brandData.primaryColorHex }}
                        />
                        <span className="text-sm font-mono text-gray-300">
                          {brandData.primaryColorHex}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">视觉风格</span>
                      <p className="text-sm text-gray-300 mt-1">{(brandData.visualStyle ?? "").replace(/_/g, " ")}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">来源</span>
                      <p className="text-sm text-cyan-400 mt-1">{brandData.sourceUrl}</p>
                    </div>
                  </div>

                  {brandData.coreVision && brandData.coreVision.length > 0 && (
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">核心愿景</span>
                      <div className="mt-1 space-y-1">
                        {brandData.coreVision.map((v: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                            <ChevronRight className="h-3 w-3 text-cyan-500" />
                            {v}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {brandData.brandKeywords && brandData.brandKeywords.length > 0 && (
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">品牌关键词</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {brandData.brandKeywords.map((kw: string) => (
                          <span
                            key={kw}
                            className="px-2 py-0.5 text-xs rounded-full border"
                            style={{
                              borderColor: (brandData.primaryColorHex ?? "#333") + "50",
                              color: brandData.primaryColorHex ?? "#333",
                              backgroundColor: (brandData.primaryColorHex ?? "#333") + "15",
                            }}
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color preview bar */}
                  <div className="mt-3 rounded-lg overflow-hidden h-2 flex">
                    <div className="flex-1" style={{ backgroundColor: brandData.primaryColorHex }} />
                    <div className="flex-1 bg-gray-800" />
                    <div className="flex-1 bg-white" />
                  </div>
                </div>
              )}
              {activeTab === "brand" && !brandData && !fullProfileQuery.isLoading && (
                <EmptyState icon={Palette} message="暂无品牌视觉基因数据" />
              )}

              {/* Zone 3: Standards Mapping */}
              {activeTab === "standards" && (
                <div className="rounded-xl border border-gray-800 bg-[#0d1321] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-cyan-400" />
                      技术商务标准映射
                    </h3>
                    <span className="text-[10px] text-gray-500">{standardsData.length} 条映射</span>
                  </div>

                  {standardsData.length === 0 ? (
                    <EmptyState icon={Shield} message="暂无标准映射数据" />
                  ) : (
                    <div className="space-y-3">
                      {standardsData.map((s: any) => (
                        <div key={s.id} className="rounded-lg border border-gray-700/50 bg-[#080c14] p-3">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                              {s.category}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500">置信度</span>
                              <ConfidenceBar score={s.confidenceScore ?? 0} />
                              {s.isVerified ? (
                                <button
                                  onClick={() => verifyStandardMutation.mutate({ id: s.id, verified: false })}
                                  title="点击取消验证"
                                >
                                  <CheckCircle2 className="h-4 w-4 text-green-400 hover:text-green-300 cursor-pointer" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => verifyStandardMutation.mutate({ id: s.id, verified: true })}
                                  title="点击验证通过"
                                  className="text-gray-600 hover:text-green-400 cursor-pointer"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <span className="text-[10px] text-gray-500 uppercase tracking-wider">客户标准/需求</span>
                              <p className="text-sm text-gray-300 mt-0.5">{s.customerStandard}</p>
                            </div>
                            <div>
                              <span className="text-[10px] text-cyan-500/70 uppercase tracking-wider flex items-center gap-1">
                                <ChevronRight className="h-3 w-3" /> GRT 对标价值
                              </span>
                              <p className="text-sm text-cyan-300 mt-0.5">{s.grtMatchedValue}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Zone 4: Product Interlock Matrix */}
              {activeTab === "interlock" && (
                <div className="rounded-xl border border-gray-800 bg-[#0d1321] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-cyan-400" />
                      核心产品线咬合矩阵
                    </h3>
                    <span className="text-[10px] text-gray-500">{interlocksData.length} 条咬合</span>
                  </div>

                  {interlocksData.length === 0 ? (
                    <EmptyState icon={Link2} message="暂无产品咬合数据" />
                  ) : (
                    <div className="space-y-3">
                      {interlocksData.map((il: any) => {
                        const tc = TIMELINE_CONFIG[il.timeline] ?? TIMELINE_CONFIG.present;
                        const TimeIcon = tc.icon;
                        return (
                          <div key={il.id} className="rounded-lg border border-gray-700/50 bg-[#080c14] p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <TimeIcon className={cn("h-4 w-4", tc.color)} />
                              <span className={cn("text-xs font-medium", tc.color)}>{tc.label}</span>
                              {il.timeline === "present" && <span className="text-[10px] text-gray-600">Present</span>}
                              {il.timeline === "future" && <span className="text-[10px] text-gray-600">Future</span>}
                              {il.projectRef && (
                                <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                                  {il.projectRef}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider">客户产品/场景</span>
                                <p className="text-sm text-gray-300 mt-0.5">{il.customerProduct}</p>
                              </div>
                              <div>
                                <span className="text-[10px] text-cyan-500/70 uppercase tracking-wider flex items-center gap-1">
                                  <ChevronRight className="h-3 w-3" /> GRT 解决方案
                                </span>
                                <p className="text-sm text-cyan-300 mt-0.5">{il.grtMatchedSolution}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Zone 5: Reading Channels (授权阅读推荐通道) */}
              {activeTab === "reading" && (
                <div className="rounded-xl border border-gray-800 bg-[#0d1321] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-purple-400" />
                      授权阅读推荐通道
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">
                        授权等级: Tier {readingChannels[0]?.accessTier ?? "---"}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {readingChannels.length} 个文档类别
                      </span>
                    </div>
                  </div>

                  {readingQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                    </div>
                  ) : (
                    <>
                      {/* Tier legend */}
                      <div className="flex gap-3 text-[10px]">
                        <span className="flex items-center gap-1 text-gray-500">
                          <span className="w-2 h-2 rounded-full bg-green-500" /> 完全开放 (Full)
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <span className="w-2 h-2 rounded-full bg-yellow-500" /> 仅查看 (View Only)
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <span className="w-2 h-2 rounded-full bg-orange-500" /> 受限 (Restricted)
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <span className="w-2 h-2 rounded-full bg-red-500" /> 封锁 (Blocked)
                        </span>
                      </div>

                      {readingChannels.length === 0 ? (
                        <EmptyState icon={BookOpen} message="暂未配置授权阅读通道 --- 点击同步按钮根据合作等级自动生成" />
                      ) : (
                        <div className="space-y-2">
                          {readingChannels.map((ch: any, idx: number) => {
                            const accessColor = ch.accessLevel === "full" ? "text-green-400" :
                              ch.accessLevel === "view_only" ? "text-yellow-400" :
                              ch.accessLevel === "restricted" ? "text-orange-400" : "text-red-400";
                            const accessBg = ch.accessLevel === "full" ? "bg-green-500/10 border-green-500/30" :
                              ch.accessLevel === "view_only" ? "bg-yellow-500/10 border-yellow-500/30" :
                              ch.accessLevel === "restricted" ? "bg-orange-500/10 border-orange-500/30" : "bg-red-500/10 border-red-500/30";
                            const AccessIcon = ch.accessLevel === "blocked" ? Lock : Unlock;
                            return (
                              <div key={idx} className="rounded-lg border border-gray-700/50 bg-[#080c14] p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", accessBg)}>
                                      <FileText className={cn("h-4 w-4", accessColor)} />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-200">{ch.docCategoryLabel}</span>
                                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", accessBg, accessColor)}>
                                          {ch.accessLevel === "full" ? "完全开放" :
                                           ch.accessLevel === "view_only" ? "仅查看" :
                                           ch.accessLevel === "restricted" ? "受限" : "封锁"}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-gray-500 mt-0.5">{ch.recommendedReason}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                      <Eye className={cn("h-3.5 w-3.5", ch.isViewable ? "text-green-400" : "text-gray-600")} />
                                      <span className="text-[10px] text-gray-500">查看</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Download className={cn("h-3.5 w-3.5", ch.isDownloadable ? "text-green-400" : "text-gray-600")} />
                                      <span className="text-[10px] text-gray-500">下载</span>
                                    </div>
                                    <AccessIcon className={cn("h-4 w-4", accessColor)} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {/* Tier mapping info */}
                  <div className="rounded-lg border border-gray-700/30 bg-[#060a12] p-3">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">合作等级 → 授权映射</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="text-gray-400"><span className="text-yellow-400">V0 战略合作</span> → Tier 4 全开放</div>
                      <div className="text-gray-400"><span className="text-blue-400">V1 大客户</span> → Tier 2 技术级</div>
                      <div className="text-gray-400"><span className="text-green-400">V2 标准</span> → Tier 1 基础级</div>
                      <div className="text-gray-400"><span className="text-gray-500">V3/V4</span> → Tier 1 最小权限</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Zone 7: Portal User Management (客户账户管理) */}
              {activeTab === "portal" && (
                <div className="rounded-xl border border-gray-800 bg-[#0d1321] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <UserCog className="h-4 w-4 text-orange-400" />
                      客户门户账户管理
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">
                        {portalUsers.length} 个账户
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs bg-transparent border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                        onClick={handleCreatePortalUser}
                        disabled={createPortalUserMutation.isPending}
                      >
                        {createPortalUserMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 mr-1" />
                        )}
                        新建账户
                      </Button>
                    </div>
                  </div>

                  {portalUsersQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                    </div>
                  ) : portalUsers.length === 0 ? (
                    <EmptyState icon={UserCog} message="暂未配置门户账户 --- 点击新建账户为客户分配登录凭证" />
                  ) : (
                    <div className="space-y-3">
                      {portalUsers.map((user: any) => {
                        const statusColor = user.status === "active" ? "text-green-400 bg-green-500/10 border-green-500/30" :
                          user.status === "suspended" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" :
                          "text-gray-500 bg-gray-500/10 border-gray-600/30";
                        const roleLabel = user.role === "admin" ? "管理员" : user.role === "engineer" ? "工程师" : "查看者";
                        return (
                          <div key={user.id} className="rounded-lg border border-gray-700/50 bg-[#080c14] p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                                  <UserCog className="h-5 w-5 text-orange-400" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-gray-200">{user.name || user.portalUserId}</span>
                                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", statusColor)}>
                                      {user.status === "active" ? "活跃" : user.status === "suspended" ? "暂停" : "停用"}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                                      {roleLabel}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-2">
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <KeyRound className="h-3.5 w-3.5 text-gray-500" />
                                      <span className="text-gray-500">用户名:</span>
                                      <span className="text-cyan-300 font-mono">{user.portalUserId}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <Mail className="h-3.5 w-3.5 text-gray-500" />
                                      <span className="text-gray-500">邮箱:</span>
                                      <span className="text-gray-300">{user.email}</span>
                                    </div>
                                    {user.lastLogin && (
                                      <div className="flex items-center gap-2 text-[11px]">
                                        <Clock className="h-3.5 w-3.5 text-gray-500" />
                                        <span className="text-gray-500">上次登录:</span>
                                        <span className="text-gray-300">{user.lastLogin}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[10px] h-7 px-2 bg-transparent border-gray-700 text-gray-400 hover:bg-gray-800"
                                  onClick={() => handleResetPassword(user.id)}
                                  disabled={resetPasswordMutation.isPending}
                                >
                                  {resetPasswordMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "重置密码"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[10px] h-7 px-2 bg-transparent border-gray-700 text-gray-400 hover:bg-gray-800"
                                  onClick={() => handleToggleStatus(user.id, user.status)}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  {updateStatusMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : (user.status === "active" ? "暂停" : "激活")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Portal login info */}
                  <div className="rounded-lg border border-gray-700/30 bg-[#060a12] p-3">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">客户门户登录说明</p>
                    <div className="space-y-1 text-[11px] text-gray-400">
                      <p>1. 客户使用「用户名」+「初始密码」登录 GRT 客户门户</p>
                      <p>2. 首次登录后系统强制修改密码</p>
                      <p>3. 登录后可查看授权阅读通道中允许的文档</p>
                      <p>4. 管理员可随时重置密码或暂停/激活账户</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, loading }: { label: string; value: number; icon: React.ElementType; color: string; loading?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-[#0d1321] p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        ) : (
          <p className="text-lg font-bold text-gray-100">{value}</p>
        )}
        <p className="text-[10px] text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</span>
      <span className="text-sm text-gray-300">{value}</span>
    </div>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 85 ? "#00B294" : score >= 70 ? "#FFB900" : "#D13438";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 rounded-full bg-gray-700 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono" style={{ color }}>{score}%</span>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-600">
      <Icon className="h-8 w-8 mb-2 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
