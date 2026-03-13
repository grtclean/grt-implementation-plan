/**
 * 液态用工中心增强版 - 技能认证审核、竞标匹配、版税分成
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Briefcase, Award, Gavel, FileCheck, Search, Plus, TrendingUp,
  CheckCircle2, Clock, AlertCircle, BarChart3, Zap
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// 技能认证审核数据
const skillCertifications = [
  { id: "cert_001", skillName: "高压喷嘴流体仿真 Level 5", applicant: "user_001", status: "pending", submittedAt: "2026-01-30", evidence: "3个项目完成证明" },
  { id: "cert_002", skillName: "PLC编程 Level 4", applicant: "user_002", status: "approved", submittedAt: "2026-01-28", evidence: "5个项目完成证明" },
  { id: "cert_003", skillName: "3D建模 Level 3", applicant: "user_003", status: "rejected", submittedAt: "2026-01-25", evidence: "2个项目完成证明" },
];

// 竞标匹配数据
const bidMatches = [
  { id: "match_001", taskName: "清洗线PLC程序开发", requiredSkill: "PLC编程 Level 4", candidates: 5, topCandidate: "user_002", matchScore: 94 },
  { id: "match_002", taskName: "喷嘴组件3D建模", requiredSkill: "3D建模 Level 3", candidates: 3, topCandidate: "user_003", matchScore: 87 },
];

// 版税分成数据
const royaltyBreakdown = [
  { skillId: "sk_001", skillName: "高压喷嘴流体仿真 Level 5", usageCount: 234, royaltyRate: 15, totalEarnings: 45000, thisMonth: 8500 },
  { skillId: "sk_002", skillName: "PLC编程 Level 4", usageCount: 156, royaltyRate: 12, totalEarnings: 28000, thisMonth: 5200 },
];

export default function LiquidWorkforceHubEnhanced() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("certifications");
  const [selectedCert, setSelectedCert] = useState<typeof skillCertifications[0] | null>(null);
  const [certReviewDialog, setCertReviewDialog] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "rejected": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle2 className="w-4 h-4" />;
      case "pending": return <Clock className="w-4 h-4" />;
      case "rejected": return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Briefcase}
        title={t("hr.liquidWorkforceHubEnh.title")}
        description={t("hr.liquidWorkforceHubEnh.description")}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="certifications" className="flex items-center gap-2">
            <Award className="w-4 h-4" />{t("hr.liquidWorkforceHubEnh.tabCertifications")}
          </TabsTrigger>
          <TabsTrigger value="matching" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />{t("hr.liquidWorkforceHubEnh.tabMatching")}
          </TabsTrigger>
          <TabsTrigger value="royalty" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />{t("hr.liquidWorkforceHubEnh.tabRoyalty")}
          </TabsTrigger>
        </TabsList>

        {/* 技能认证审核 */}
        <TabsContent value="certifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("hr.liquidWorkforceHubEnh.certQueue")}</CardTitle>
              <CardDescription>{t("hr.liquidWorkforceHubEnh.certQueueDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {skillCertifications.map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                    <div className="flex items-center gap-4">
                      <Award className="w-8 h-8 text-primary/50" />
                      <div>
                        <p className="font-medium">{cert.skillName}</p>
                        <p className="text-sm text-muted-foreground">{t("hr.liquidWorkforceHubEnh.applicant")}: {cert.applicant} · {t("hr.liquidWorkforceHubEnh.submittedAt")}: {cert.submittedAt}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t("hr.liquidWorkforceHubEnh.evidence")}: {cert.evidence}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(cert.status)}>
                        <span className="mr-1">{getStatusIcon(cert.status)}</span>
                        {cert.status === "pending" ? t("hr.liquidWorkforceHubEnh.statusPending") : cert.status === "approved" ? t("hr.liquidWorkforceHubEnh.statusApproved") : t("hr.liquidWorkforceHubEnh.statusRejected")}
                      </Badge>
                      {cert.status === "pending" && (
                        <Dialog open={certReviewDialog && selectedCert?.id === cert.id} onOpenChange={(open) => {
                          setCertReviewDialog(open);
                          if (open) setSelectedCert(cert);
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">{t("hr.liquidWorkforceHubEnh.review")}</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t("hr.liquidWorkforceHubEnh.reviewSkillCert")}</DialogTitle>
                              <DialogDescription>{cert.skillName}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm font-medium mb-2">{t("hr.liquidWorkforceHubEnh.evidenceMaterials")}</p>
                                <p className="text-sm text-muted-foreground">{cert.evidence}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button className="flex-1" variant="outline">{t("hr.liquidWorkforceHubEnh.reject")}</Button>
                                <Button className="flex-1">{t("hr.liquidWorkforceHubEnh.approve")}</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 竞标智能匹配 */}
        <TabsContent value="matching" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("hr.liquidWorkforceHubEnh.autoMatch")}</CardTitle>
              <CardDescription>{t("hr.liquidWorkforceHubEnh.autoMatchDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bidMatches.map((match) => (
                  <div key={match.id} className="p-4 bg-muted rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{match.taskName}</p>
                        <p className="text-sm text-muted-foreground">{t("hr.liquidWorkforceHubEnh.requiredSkill")}: {match.requiredSkill}</p>
                      </div>
                      <Badge variant="outline" className="text-primary">{match.matchScore}% {t("hr.liquidWorkforceHubEnh.matchScore")}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("hr.liquidWorkforceHubEnh.candidates")}: {match.candidates} {t("hr.liquidWorkforceHubEnh.personSuffix")} | {t("hr.liquidWorkforceHubEnh.topCandidate")}: {match.topCandidate}</span>
                      <Button size="sm">{t("hr.liquidWorkforceHubEnh.viewDetails")}</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 版税分成 */}
        <TabsContent value="royalty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("hr.liquidWorkforceHubEnh.royaltyStats")}</CardTitle>
              <CardDescription>{t("hr.liquidWorkforceHubEnh.royaltyStatsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {royaltyBreakdown.map((item) => (
                  <div key={item.skillId} className="p-4 bg-muted rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{item.skillName}</p>
                        <p className="text-sm text-muted-foreground">{t("hr.liquidWorkforceHubEnh.royaltyRateLabel")}: {item.royaltyRate}% | {t("hr.liquidWorkforceHubEnh.usageCountLabel")}: {item.usageCount}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">¥{item.thisMonth}</p>
                        <p className="text-xs text-muted-foreground">{t("hr.liquidWorkforceHubEnh.monthlyEarnings")}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("hr.liquidWorkforceHubEnh.totalEarnings")}: ¥{item.totalEarnings}</span>
                      <Button size="sm" variant="outline">{t("hr.liquidWorkforceHubEnh.viewBreakdown")}</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
