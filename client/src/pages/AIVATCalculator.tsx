/**
 * AI增值税/税费计算 (AI Multi-Region VAT/Tax Calculator)
 * 多区域税率 · 税费明细 · 发票要求 · 合规建议
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Receipt, Loader2, Sparkles, FileText, ListChecks, Lightbulb, TableProperties,
} from "lucide-react";

const CURRENCIES = ["CNY", "EUR", "USD", "GBP", "JPY", "CHF"];
const REGIONS = [
  { value: "CN", label: "CN-中国" },
  { value: "DE", label: "DE-德国" },
  { value: "FR", label: "FR-法国" },
  { value: "US", label: "US-美国" },
  { value: "Other", label: "Other-其他" },
];
const PRODUCT_TYPES = ["清洗设备", "零配件", "技术服务"];

interface VATResult {
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxRate: number;
  taxType: string;
  breakdown: Array<{ item: string; rate: string; amount: number; notes: string }>;
  invoiceRequirements: string;
  notes: string[];
  recommendations: string[];
}

export default function AIVATCalculator() {
  const { t } = useLanguage();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CNY");
  const [fromRegion, setFromRegion] = useState("CN");
  const [toRegion, setToRegion] = useState("DE");
  const [productType, setProductType] = useState("清洗设备");
  const [isB2B, setIsB2B] = useState(true);
  const [result, setResult] = useState<VATResult | null>(null);

  const mutation = trpc.regionalCompliance.calculateVAT.useMutation({
    onSuccess: (data) => setResult(data as VATResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!amount || mutation.isPending) return;
    mutation.mutate({
      amount: Number(amount),
      currency,
      fromRegion,
      toRegion,
      productType,
      isB2B,
    });
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Receipt}
          title={t("ai.vat.title")}
          description={t("ai.vat.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("ai.vat.aiCalculate")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5 text-primary" />
              {t("ai.vat.transactionInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.vat.amount")}</label>
                <Input type="number" placeholder={t("ai.vat.amountPlaceholder")} value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.vat.currency")}</label>
                <Select value={currency} onValueChange={(v) => setCurrency(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ai.vat.selectCurrency")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.vat.fromRegion")}</label>
                <Select value={fromRegion} onValueChange={(v) => setFromRegion(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ai.vat.selectFromRegion")} />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.vat.toRegion")}</label>
                <Select value={toRegion} onValueChange={(v) => setToRegion(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ai.vat.selectToRegion")} />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.vat.productType")}</label>
                <Select value={productType} onValueChange={(v) => setProductType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ai.vat.selectProductType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("ai.vat.transactionType")}</label>
                <div className="flex items-center gap-2 h-[38px]">
                  <input
                    type="checkbox"
                    id="isB2B"
                    checked={isB2B}
                    onChange={(e) => setIsB2B(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="isB2B" className="text-sm">{t("ai.vat.b2bTransaction")}</label>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!amount || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("ai.vat.aiCalculate")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Net / Tax / Total Amount Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">{t("ai.vat.netAmount")}</p>
                  <p className="text-4xl font-bold text-blue-400">
                    {result.netAmount.toLocaleString()}
                    <span className="text-lg text-muted-foreground ml-1">{currency}</span>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">{t("ai.vat.taxAmount")}</p>
                  <p className="text-4xl font-bold text-yellow-400">
                    {result.taxAmount.toLocaleString()}
                    <span className="text-lg text-muted-foreground ml-1">{currency}</span>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">{t("ai.vat.totalAmount")}</p>
                  <p className="text-4xl font-bold text-green-400">
                    {result.totalAmount.toLocaleString()}
                    <span className="text-lg text-muted-foreground ml-1">{currency}</span>
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tax Rate & Tax Type */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-lg px-4 py-2 bg-primary/10 text-primary border-primary/30">
                    {t("ai.vat.taxRate")}: {(result.taxRate * 100).toFixed(1)}%
                  </Badge>
                  <Badge variant="outline" className="text-lg px-4 py-2 bg-blue-500/10 text-blue-400 border-blue-500/30">
                    {result.taxType}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Tax Breakdown Table */}
            {result.breakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TableProperties className="h-5 w-5 text-yellow-400" />
                    {t("ai.vat.taxBreakdown")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("ai.vat.itemCol")}</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">{t("ai.vat.rateCol")}</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">{t("ai.vat.amountCol")}</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">{t("ai.vat.notesCol")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.breakdown.map((row, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 font-medium">{row.item}</td>
                            <td className="py-2 text-right">{row.rate}</td>
                            <td className="py-2 text-right">{row.amount.toLocaleString()}</td>
                            <td className="py-2 text-muted-foreground">{row.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Invoice Requirements */}
            {result.invoiceRequirements && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5 text-primary" />
                    {t("ai.vat.invoiceRequirements")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{result.invoiceRequirements}</p>
                </CardContent>
              </Card>
            )}

            {/* Special Notes */}
            {result.notes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ListChecks className="h-5 w-5 text-yellow-400" />
                    {t("ai.vat.specialNotes")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.notes.map((note, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-yellow-400 font-medium flex-shrink-0">*</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    {t("ai.vat.aiSuggestions")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium flex-shrink-0">{idx + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
  );
}
