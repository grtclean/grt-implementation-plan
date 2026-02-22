import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Languages, Send, CheckCircle2, XCircle, Clock, FileText, Globe, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function TranslationContribute() {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("submit");
  const [translationKey, setTranslationKey] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<"zh" | "en" | "de" | "fr">("en");
  const [originalText, setOriginalText] = useState("");
  const [suggestedText, setSuggestedText] = useState("");

  // Note: translation router not yet registered — using safe optional chaining

  const trpcAny = trpc as any;
  const statsQuery = trpcAny.translation?.getStats?.useQuery?.() ?? { data: null };
  const listQuery = trpcAny.translation?.list?.useQuery?.({ status: "pending" }) ?? { data: null };
  const mySubmissionsQuery = trpcAny.translation?.getMySubmissions?.useQuery?.({}) ?? { data: null };
  const submitMutation = trpcAny.translation?.submit?.useMutation?.({
    onSuccess: () => {
      toast.success("翻译建议提交成功");
      setTranslationKey("");
      setOriginalText("");
      setSuggestedText("");
    },
    onError: () => {
      toast.error("提交失败，请重试");
    }
  }) ?? { mutate: () => {}, isPending: false };
  const reviewMutation = trpcAny.translation?.review?.useMutation?.({
    onSuccess: () => {
      toast.success("审核完成");
    }
  }) ?? { mutate: () => {}, isPending: false };

  const handleSubmit = () => {
    if (!translationKey || !suggestedText) {
      toast.error("请填写必填字段");
      return;
    }
    submitMutation.mutate({ translationKey, language: targetLanguage, originalText, suggestedText });
  };

  const handleReview = (id: string, status: "approved" | "rejected") => {
    reviewMutation.mutate({ id, status });
  };

  const stats = statsQuery.data || { total: 0, pending: 0, approved: 0, rejected: 0 };
  const languageNames: Record<string, string> = { zh: "中文", en: "English", de: "Deutsch", fr: "Français" };
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400"
  };

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Languages}
          title={t("translation.title") || "翻译贡献"}
          description={t("translation.subtitle") || "帮助完善多语言翻译，让系统更好地服务全球用户"}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="总提交" value={stats.total} />
          <StatCard icon={Clock} label="待审核" value={stats.pending} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
          <StatCard icon={CheckCircle2} label="已采纳" value={stats.approved} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={Globe} label="支持语言" value={4} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="submit"><Send className="w-4 h-4 mr-2" />提交翻译</TabsTrigger>
            <TabsTrigger value="my"><Users className="w-4 h-4 mr-2" />我的提交</TabsTrigger>
            {user?.role === "admin" && <TabsTrigger value="review"><TrendingUp className="w-4 h-4 mr-2" />审核管理</TabsTrigger>}
          </TabsList>

          <TabsContent value="submit">
            <Card><CardHeader><CardTitle>提交翻译建议</CardTitle><CardDescription>填写翻译键和建议的翻译内容</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>翻译键 *</Label><Input placeholder="例如: home.hero.title" value={translationKey} onChange={(e) => setTranslationKey(e.target.value)} /></div>
                  <div className="space-y-2"><Label>目标语言 *</Label>
                    <Select value={targetLanguage} onValueChange={(v) => setTargetLanguage(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zh">🇨🇳 中文</SelectItem>
                        <SelectItem value="en">🇺🇸 English</SelectItem>
                        <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                        <SelectItem value="fr">🇫🇷 Français</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>原文（可选）</Label><Textarea placeholder="当前显示的文本" value={originalText} onChange={(e) => setOriginalText(e.target.value)} rows={2} /></div>
                <div className="space-y-2"><Label>建议翻译 *</Label><Textarea placeholder="您建议的翻译" value={suggestedText} onChange={(e) => setSuggestedText(e.target.value)} rows={3} /></div>
                <Button onClick={handleSubmit} disabled={submitMutation.isPending || !isAuthenticated}><Send className="w-4 h-4 mr-2" />{submitMutation.isPending ? "提交中..." : "提交建议"}</Button>
                {!isAuthenticated && <p className="text-sm text-muted-foreground">请先登录后再提交</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my">
            <Card><CardHeader><CardTitle>我的提交记录</CardTitle></CardHeader>
              <CardContent>
                {mySubmissionsQuery.data?.items?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground"><Languages className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>暂无提交记录</p></div>
                ) : (
                  <div className="space-y-4">{mySubmissionsQuery.data?.items?.map((item: any) => (
                    <div key={item.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{item.translationKey}</code>
                        <Badge className={statusColors[item.status]}>{item.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{languageNames[item.language]} → {item.suggestedText}</p>
                    </div>
                  ))}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {user?.role === "admin" && (
            <TabsContent value="review">
              <Card><CardHeader><CardTitle>待审核列表</CardTitle></CardHeader>
                <CardContent>
                  {listQuery.data?.items?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground"><CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>暂无待审核</p></div>
                  ) : (
                    <div className="space-y-4">{listQuery.data?.items?.map((item: any) => (
                      <div key={item.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded">{item.translationKey}</code>
                          <span className="text-sm">{languageNames[item.language]}</span>
                        </div>
                        <p className="text-sm mb-2">建议: {item.suggestedText}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-green-500" onClick={() => handleReview(item.id, "approved")}><CheckCircle2 className="w-4 h-4 mr-1" />采纳</Button>
                          <Button size="sm" variant="outline" className="text-red-500" onClick={() => handleReview(item.id, "rejected")}><XCircle className="w-4 h-4 mr-1" />拒绝</Button>
                        </div>
                      </div>
                    ))}</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
  );
}
