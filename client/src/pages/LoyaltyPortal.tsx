/**
 * LoyaltyPortal — Customer Loyalty Points Portal (Public)
 *
 * Standalone dark sci-fi themed page. No login required.
 * Customers access via /loyalty/:customerCode to check points, redeem rewards, submit referrals.
 */
import { useState, type FormEvent } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Award,
  Gift,
  Star,
  TrendingUp,
  Users,
  Send,
  ShieldCheck,
  Gem,
  ArrowUpRight,
  MessageCircle,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowUp,
  ArrowLeft,
  LayoutDashboard,
  Home,
} from "lucide-react";

/* ─── Tier config ─── */
const TIER_THRESHOLDS = [
  { tier: "bronze", min: 0, color: "text-amber-600 bg-amber-950/60 border-amber-700/40" },
  { tier: "silver", min: 500, color: "text-slate-300 bg-slate-800/60 border-slate-600/40" },
  { tier: "gold", min: 2000, color: "text-yellow-400 bg-yellow-950/60 border-yellow-600/40" },
  { tier: "platinum", min: 5000, color: "text-blue-400 bg-blue-950/60 border-blue-600/40" },
  { tier: "diamond", min: 15000, color: "text-purple-400 bg-purple-950/60 border-purple-600/40" },
] as const;

type TierName = (typeof TIER_THRESHOLDS)[number]["tier"];

function getTierMeta(tier: TierName) {
  return TIER_THRESHOLDS.find((t) => t.tier === tier) ?? TIER_THRESHOLDS[0];
}

function getNextTier(tier: TierName) {
  const idx = TIER_THRESHOLDS.findIndex((t) => t.tier === tier);
  return idx < TIER_THRESHOLDS.length - 1 ? TIER_THRESHOLDS[idx + 1] : null;
}

const CATEGORY_COLORS: Record<string, string> = {
  community: "text-blue-400 bg-blue-950/50 border-blue-700/30",
  referral: "text-green-400 bg-green-950/50 border-green-700/30",
  tech: "text-purple-400 bg-purple-950/50 border-purple-700/30",
  engagement: "text-cyan-400 bg-cyan-950/50 border-cyan-700/30",
};

const INDUSTRIES = [
  { value: "automotive", label: "Automotive" },
  { value: "new-energy", label: "New Energy" },
  { value: "semiconductor", label: "Semiconductor" },
  { value: "die-casting", label: "Die Casting" },
  { value: "general", label: "General Manufacturing" },
];

/* ─── Glass panel wrapper ─── */
function GlassPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl p-6 ${className}`}
    >
      {children}
    </div>
  );
}

/* ─── Section heading ─── */
function SectionTitle({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <h2 className="flex items-center gap-2.5 text-xl font-semibold text-white/90 mb-5">
      <Icon className="h-5 w-5 text-cyan-400" />
      {title}
    </h2>
  );
}

/* ─── Main component ─── */
export default function LoyaltyPortal() {
  const [, params] = useRoute("/loyalty/:customerCode");
  const customerCode = params?.customerCode ?? "";

  /* ─ Queries ─ */
  const accountQ = trpc.targetedShowcase.loyalty.getAccount.useQuery(
    { customerCode },
    { enabled: !!customerCode },
  );
  const rulesQ = trpc.targetedShowcase.loyalty.getPointRules.useQuery();
  const rewardsQ = trpc.targetedShowcase.loyalty.listRewards.useQuery();
  const txQ = trpc.targetedShowcase.loyalty.getTransactions.useQuery(
    { customerCode },
    { enabled: !!customerCode },
  );
  const referralsQ = trpc.targetedShowcase.loyalty.listReferrals.useQuery(
    { referrerCode: customerCode },
    { enabled: !!customerCode },
  );

  /* ─ Referral form state ─ */
  const [refForm, setRefForm] = useState({
    referredCompany: "",
    referredContact: "",
    referredEmail: "",
    referredPhone: "",
    referredIndustry: "",
    notes: "",
  });
  const [refSuccess, setRefSuccess] = useState(false);

  const submitReferral = trpc.targetedShowcase.loyalty.submitReferral.useMutation();

  function handleRefSubmit(e: FormEvent) {
    e.preventDefault();
    if (!refForm.referredCompany) return;
    submitReferral
      .mutateAsync({ referrerCode: customerCode, ...refForm })
      .then(() => {
        setRefSuccess(true);
        setRefForm({
          referredCompany: "",
          referredContact: "",
          referredEmail: "",
          referredPhone: "",
          referredIndustry: "",
          notes: "",
        });
        accountQ.refetch();
        txQ.refetch();
        referralsQ.refetch();
        setTimeout(() => setRefSuccess(false), 4000);
      });
  }

  /* ─ Loading / error / not found ─ */
  if (!customerCode) {
    return <NotFoundScreen message="No customer code provided." />;
  }
  if (accountQ.isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }
  if (accountQ.error || !accountQ.data) {
    return <NotFoundScreen message="Customer account not found. Please check your link." />;
  }

  const acct = accountQ.data;
  const tierMeta = getTierMeta(acct.tier as TierName);
  const nextTier = getNextTier(acct.tier as TierName);
  const progressToNext = nextTier
    ? Math.min(100, ((acct.lifetimeEarned - getTierMeta(acct.tier as TierName).min) / (nextTier.min - getTierMeta(acct.tier as TierName).min)) * 100)
    : 100;
  const pointsToNext = nextTier ? nextTier.min - acct.lifetimeEarned : 0;

  /* Extract rules as array from { rules: Record, tiers } */
  const rulesData = rulesQ.data;
  const rulesArray = rulesData
    ? Object.entries(rulesData.rules).map(([sourceType, rule], idx) => ({
        id: idx,
        sourceType,
        points: rule.points,
        description: rule.description,
        category: sourceType.startsWith("referral") ? "referral"
          : sourceType.startsWith("community") ? "community"
          : sourceType === "tech_feedback" ? "tech"
          : "engagement",
      }))
    : [];
  const rules = rulesArray;
  const rewards = rewardsQ.data ?? [];
  const txData = txQ.data;
  const transactions = txData ? txData.items : [];
  const referrals = referralsQ.data?.items ?? [];

  /* Group rewards by category */
  const rewardsByCategory: Record<string, typeof rewards> = {};
  for (const r of rewards) {
    const cat = r.category ?? "other";
    if (!rewardsByCategory[cat]) rewardsByCategory[cat] = [];
    rewardsByCategory[cat].push(r);
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white/80">
      {/* header */}
      <header className="border-b border-white/[0.06] bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Gem className="h-7 w-7 text-cyan-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              GRT Partner Loyalty Program
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-lg text-white/70">{acct.customerName}</span>
            <Badge
              variant="outline"
              className={`uppercase text-xs font-bold px-3 py-1 border ${tierMeta.color}`}
            >
              {acct.tier}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* 1. Points Overview */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <GlassPanel>
            <p className="text-sm text-white/50 mb-1">Available Points</p>
            <p className="text-4xl font-bold text-cyan-400 tabular-nums">
              {acct.availablePoints.toLocaleString()}
            </p>
          </GlassPanel>
          <GlassPanel>
            <p className="text-sm text-white/50 mb-1">Lifetime Earned</p>
            <p className="text-4xl font-bold text-green-400 tabular-nums">
              {acct.lifetimeEarned.toLocaleString()}
            </p>
          </GlassPanel>
          <GlassPanel>
            <p className="text-sm text-white/50 mb-1">Current Tier</p>
            <Badge
              variant="outline"
              className={`uppercase text-sm font-bold px-3 py-1.5 border mb-3 ${tierMeta.color}`}
            >
              {acct.tier}
            </Badge>
            <div className="mt-2">
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-700"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
              {nextTier ? (
                <p className="text-xs text-white/40 mt-1.5">
                  {pointsToNext.toLocaleString()} more points to{" "}
                  <span className="capitalize text-white/60">{nextTier.tier}</span>
                </p>
              ) : (
                <p className="text-xs text-purple-400 mt-1.5">Maximum tier reached</p>
              )}
            </div>
          </GlassPanel>
        </section>

        {/* 2. How to Earn Points */}
        <section>
          <SectionTitle icon={Sparkles} title="How to Earn Points" />
          {rulesQ.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-white/30" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((rule) => {
                const catColor = CATEGORY_COLORS[rule.category ?? "engagement"] ?? CATEGORY_COLORS.engagement;
                return (
                  <GlassPanel key={rule.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white/80">{rule.sourceType}</span>
                      <Badge variant="outline" className={`text-xs border ${catColor}`}>
                        {rule.category}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold text-cyan-400">+{rule.points}</p>
                    <p className="text-xs text-white/40 leading-relaxed">{rule.description}</p>
                  </GlassPanel>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. Rewards Catalog */}
        <section>
          <SectionTitle icon={Gift} title="Rewards Catalog" />
          {rewardsQ.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-white/30" />
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(rewardsByCategory).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((reward) => {
                      const canRedeem =
                        acct.availablePoints >= reward.pointsCost &&
                        TIER_THRESHOLDS.findIndex((t) => t.tier === acct.tier) >=
                          TIER_THRESHOLDS.findIndex((t) => t.tier === reward.minTier);
                      const stockRemaining = reward.stockQuantity != null
                        ? reward.stockQuantity - reward.redeemedCount
                        : null;
                      return (
                        <GlassPanel key={reward.id} className="flex flex-col gap-3">
                          <div className="flex items-start justify-between">
                            <h4 className="text-sm font-semibold text-white/90">{reward.name}</h4>
                            <Badge
                              variant="outline"
                              className="text-[10px] border border-white/10 text-white/40"
                            >
                              {reward.category}
                            </Badge>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-yellow-400">
                              {reward.pointsCost.toLocaleString()}
                            </span>
                            <span className="text-xs text-white/40">pts</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-white/40">
                            <span>Min: <span className="capitalize">{reward.minTier}</span></span>
                            <span>Stock: {stockRemaining ?? "N/A"}</span>
                          </div>
                          <Button
                            size="sm"
                            disabled={!canRedeem}
                            className={
                              canRedeem
                                ? "bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white border-0"
                                : "bg-white/[0.04] text-white/30 border border-white/[0.06] cursor-not-allowed"
                            }
                          >
                            Redeem
                          </Button>
                        </GlassPanel>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. My Referrals */}
        <section>
          <SectionTitle icon={Users} title="My Referrals" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Referral form */}
            <GlassPanel>
              <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
                <Send className="h-4 w-4 text-cyan-400" /> Refer a Customer
              </h3>
              {refSuccess && (
                <div className="mb-4 rounded-xl border border-green-700/30 bg-green-950/40 px-4 py-3 flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  +100 points awarded!
                </div>
              )}
              <form onSubmit={handleRefSubmit} className="space-y-3">
                <div>
                  <Label className="text-xs text-white/50">Company *</Label>
                  <Input
                    required
                    value={refForm.referredCompany}
                    onChange={(e) => setRefForm((p) => ({ ...p, referredCompany: e.target.value }))}
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20"
                    placeholder="Company name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-white/50">Contact</Label>
                    <Input
                      value={refForm.referredContact}
                      onChange={(e) => setRefForm((p) => ({ ...p, referredContact: e.target.value }))}
                      className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20"
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white/50">Email</Label>
                    <Input
                      type="email"
                      value={refForm.referredEmail}
                      onChange={(e) => setRefForm((p) => ({ ...p, referredEmail: e.target.value }))}
                      className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-white/50">Phone</Label>
                    <Input
                      value={refForm.referredPhone}
                      onChange={(e) => setRefForm((p) => ({ ...p, referredPhone: e.target.value }))}
                      className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20"
                      placeholder="+86..."
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white/50">Industry</Label>
                    <Select
                      value={refForm.referredIndustry}
                      onValueChange={(v) => setRefForm((p) => ({ ...p, referredIndustry: v }))}
                    >
                      <SelectTrigger className="mt-1 bg-white/[0.04] border-white/[0.08] text-white">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind.value} value={ind.value}>
                            {ind.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-white/50">Notes</Label>
                  <Textarea
                    value={refForm.notes}
                    onChange={(e) => setRefForm((p) => ({ ...p, notes: e.target.value }))}
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 min-h-[60px]"
                    placeholder="Additional context..."
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitReferral.isPending || !refForm.referredCompany}
                  className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white border-0"
                >
                  {submitReferral.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Submit Referral
                </Button>
              </form>
            </GlassPanel>

            {/* Referral history */}
            <GlassPanel>
              <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-green-400" /> Referral History
              </h3>
              {referrals.length > 0 ? (
                <div className="space-y-2">
                  {referrals.map((ref) => (
                    <div
                      key={ref.id}
                      className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                    >
                      <span className="text-sm text-white/70">{ref.referredCompany}</span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] border ${
                            ref.status === "converted"
                              ? "text-green-400 border-green-700/40"
                              : ref.status === "contacted"
                                ? "text-yellow-400 border-yellow-700/40"
                                : "text-white/40 border-white/10"
                          }`}
                        >
                          {ref.status}
                        </Badge>
                        {(ref.signupPoints ?? 0) > 0 && (
                          <span className="text-xs text-green-400">+{ref.signupPoints}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/30 text-center py-8">
                  No referrals yet. Submit your first one!
                </p>
              )}
            </GlassPanel>
          </div>
        </section>

        {/* 5. Transaction History */}
        <section>
          <SectionTitle icon={TrendingUp} title="Transaction History" />
          <GlassPanel className="overflow-x-auto">
            {txQ.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-white/30" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-8">No transactions yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-white/40 text-xs uppercase tracking-wider">
                    <th className="text-left py-3 px-2">Date</th>
                    <th className="text-left py-3 px-2">Type</th>
                    <th className="text-right py-3 px-2">Points</th>
                    <th className="text-left py-3 px-2">Source</th>
                    <th className="text-left py-3 px-2">Description</th>
                    <th className="text-right py-3 px-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 20).map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 px-2 text-white/50 tabular-nums">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] border ${
                            tx.transactionType === "earn"
                              ? "text-green-400 border-green-700/30"
                              : "text-red-400 border-red-700/30"
                          }`}
                        >
                          {tx.transactionType}
                        </Badge>
                      </td>
                      <td
                        className={`py-2.5 px-2 text-right font-mono font-semibold tabular-nums ${
                          tx.points > 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {tx.points > 0 ? "+" : ""}
                        {tx.points.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-white/50">{tx.sourceType}</td>
                      <td className="py-2.5 px-2 text-white/40 max-w-[200px] truncate">
                        {tx.description}
                      </td>
                      <td className="py-2.5 px-2 text-right text-white/50 tabular-nums">
                        {tx.balanceAfter.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </GlassPanel>
        </section>

        {/* 6. Community Contribution */}
        <section>
          <SectionTitle icon={Star} title="Community Contribution" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <GlassPanel className="text-center">
              <Users className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white/90 tabular-nums">
                {acct.referralCount ?? 0}
              </p>
              <p className="text-xs text-white/40 mt-1">Referrals Made</p>
            </GlassPanel>
            <GlassPanel className="text-center">
              <ShieldCheck className="h-6 w-6 text-purple-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white/90 tabular-nums">
                {acct.techContributionCount ?? 0}
              </p>
              <p className="text-xs text-white/40 mt-1">Tech Contributions</p>
            </GlassPanel>
            <GlassPanel className="text-center">
              <MessageCircle className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white/90 tabular-nums">
                {acct.communityPostCount ?? 0}
              </p>
              <p className="text-xs text-white/40 mt-1">Community Posts</p>
            </GlassPanel>
          </div>
          <GlassPanel className="mt-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">
                Join our technical community
              </p>
              <p className="text-xs text-white/40 mt-1">
                Share knowledge, earn points, connect with GRT engineers
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-white/60 hover:text-white hover:bg-white/[0.06]"
              >
                WeChat
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-white/60 hover:text-white hover:bg-white/[0.06]"
              >
                WeCom
              </Button>
            </div>
          </GlassPanel>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/30">
            Points expire 24 months after earning. Terms and conditions apply.
          </p>
          <p className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} GRT (Shenzhen Ronghui Die-Casting Co., Ltd). All rights reserved.
          </p>
        </div>
      </footer>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-6 border-t border-white/[0.05] backdrop-blur-xl" style={{ background: "rgba(10,10,10,0.92)" }}>
        <span className="text-[10px] font-mono text-neutral-600">GRT Loyalty Portal</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { document.documentElement.scrollTo({ top: 0, behavior: "smooth" }); document.body.scrollTo({ top: 0, behavior: "smooth" }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 text-[11px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <ArrowUp className="w-3.5 h-3.5" /> Back to Top
          </button>
          <button type="button" onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.href = "/showcase-hub"; }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-600/30 text-neutral-400 bg-neutral-500/10 text-[11px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <button type="button" onClick={() => { window.location.href = "/showcase-hub"; }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-500/30 text-purple-400 bg-purple-500/10 text-[11px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <LayoutDashboard className="w-3.5 h-3.5" /> Showcase Hub
          </button>
          <button type="button" onClick={() => { window.location.href = "/me"; }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10 text-[11px] font-medium hover:scale-105 transition-transform cursor-pointer">
            <Home className="w-3.5 h-3.5" /> Home
          </button>
        </div>
      </div>
      <div className="h-12" />
    </div>
  );
}

/* ─── Not-found fallback ─── */
function NotFoundScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-6 text-center">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl p-10 max-w-md">
        <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-white/80 mb-2">Account Not Found</h1>
        <p className="text-sm text-white/40">{message}</p>
      </div>
    </div>
  );
}
