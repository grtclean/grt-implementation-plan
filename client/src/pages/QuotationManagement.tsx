/**
 * 报价管理页面
 * 报价单创建、版本管理、审批流、AI辅助定价
 *
 * Data source: trpc.rndPipeline.quotation.* (DB-backed)
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calculator, Plus, Search, Building2, DollarSign, Clock, CheckCircle2 } from "lucide-react";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

export default function QuotationManagement() {
  const { t } = useLanguage();
  const { currentBU } = useUserProfile();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  // ─── tRPC query ───
  const quotesQuery = trpc.rndPipeline.quotation.list.useQuery(
    { search: search || undefined, bu: currentBU || undefined },
    QUERY_OPTS,
  );

  const items = (quotesQuery.data?.items ?? []) as any[];
  const stats = quotesQuery.data?.stats;
  const isLoading = quotesQuery.isLoading;

  const STATUS_LABELS: Record<string, string> = {
    quoted: t("crm.quote.statusQuoted"),
    approving: t("crm.quote.statusApproving"),
    won: t("crm.quote.statusWon"),
    draft: t("crm.quote.statusDraft"),
    expired: t("crm.quote.statusExpired"),
  };

  const quoteStatusColorMap = createStatusColorMap({
    [t("crm.quote.statusQuoted")]: "blue",
    [t("crm.quote.statusApproving")]: "orange",
    [t("crm.quote.statusWon")]: "green",
    [t("crm.quote.statusDraft")]: "slate",
    [t("crm.quote.statusExpired")]: "gray",
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Calculator} title={t("crm.quote.title")} description="..." />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Calculator}
        title={t("crm.quote.title")}
        description={t("crm.quote.description")}
        actions={
          <>
            {currentBU && <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{currentBU}</Badge>}
            <Button onClick={() => navigate("/quotation-create")}><Plus className="h-4 w-4 mr-2" />{t("crm.quote.newQuote")}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Calculator} label={t("crm.quote.totalQuotes")} value={stats?.total ?? 0} />
        <StatCard icon={DollarSign} label={t("crm.quote.totalAmount")} value={stats?.totalAmount ?? "¥0"} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={CheckCircle2} label={t("crm.quote.winRate")} value={stats?.winRate ?? "0%"} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Clock} label={t("crm.quote.pendingApproval")} value={stats?.pendingApproval ?? 0} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("crm.quote.quoteList")}</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("crm.quote.searchPlaceholder")} className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map((q: any) => (
              <div key={q.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{q.quoteNumber}</span>
                    <Badge variant="outline">{q.bu}</Badge>
                    <Badge variant="secondary">{q.version}</Badge>
                  </div>
                  <p className="font-medium mt-1">{q.project}</p>
                  <p className="text-sm text-muted-foreground">{t("crm.quote.customer")}: {q.customer}</p>
                </div>
                <div className="text-right">
                  <StatusBadge color={quoteStatusColorMap[STATUS_LABELS[q.status] ?? ""] ?? "gray"}>{STATUS_LABELS[q.status] ?? q.status}</StatusBadge>
                  <p className="text-lg font-bold mt-1">{q.formattedAmount}</p>
                  <p className="text-xs text-muted-foreground">{q.date}</p>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calculator className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">{t("crm.quote.noQuotes")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
