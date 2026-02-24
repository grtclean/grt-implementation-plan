/**
 * 报价管理页面
 * 报价单创建、版本管理、审批流、AI辅助定价
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/grt/PageHeader";
import { StatCard } from "@/components/grt/StatCard";
import { StatusBadge, createStatusColorMap } from "@/components/grt/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calculator, Plus, Search, Building2, DollarSign, Clock, CheckCircle2 } from "lucide-react";

// TODO: 接入 tRPC 后端接口替换
const MOCK_QUOTES = [
  { id: "QT-2026-001", customer: "上海大众", project: "缸体清洗线升级", bu: "BU3", amount: "¥2,850,000", status: "quoted", version: "V2", date: "2026-02-08" },
  { id: "QT-2026-002", customer: "宝马慕尼黑", project: "变速箱清洗新线", bu: "BU1", amount: "€1,200,000", status: "approving", version: "V1", date: "2026-02-10" },
  { id: "QT-2026-003", customer: "英飞凌", project: "晶圆清洗扩容", bu: "BU4", amount: "¥4,500,000", status: "won", version: "V3", date: "2026-01-25" },
  { id: "QT-2026-004", customer: "潍柴动力", project: "柴油机零部件清洗", bu: "BU2", amount: "¥1,680,000", status: "draft", version: "V1", date: "2026-02-11" },
];

export default function QuotationManagement() {
  const { t } = useLanguage();
  const { currentBU } = useUserProfile();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

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

  const filtered = MOCK_QUOTES.filter(q => (!currentBU || q.bu === currentBU) && (!search || q.customer.includes(search) || q.project.includes(search)));

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
        <StatCard icon={Calculator} label={t("crm.quote.totalQuotes")} value={36} />
        <StatCard icon={DollarSign} label={t("crm.quote.totalAmount")} value="¥28.5M" iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={CheckCircle2} label={t("crm.quote.winRate")} value="68%" iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Clock} label={t("crm.quote.pendingApproval")} value={5} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
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
            {filtered.map(q => (
              <div key={q.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">{q.id}</span>
                    <Badge variant="outline">{q.bu}</Badge>
                    <Badge variant="secondary">{q.version}</Badge>
                  </div>
                  <p className="font-medium mt-1">{q.project}</p>
                  <p className="text-sm text-muted-foreground">{t("crm.quote.customer")}: {q.customer}</p>
                </div>
                <div className="text-right">
                  <StatusBadge color={quoteStatusColorMap[STATUS_LABELS[q.status] ?? ""] ?? "gray"}>{STATUS_LABELS[q.status] ?? q.status}</StatusBadge>
                  <p className="text-lg font-bold mt-1">{q.amount}</p>
                  <p className="text-xs text-muted-foreground">{q.date}</p>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
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
