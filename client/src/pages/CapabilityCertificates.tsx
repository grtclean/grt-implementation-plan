import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Award,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Search,
  Share2,
  Shield,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

// 能力域配置
const DOMAINS = [
  { code: "T", name: "技术能力", fullName: "Technology", color: "#f97316" },
  { code: "S", name: "系统理解", fullName: "System Understanding", color: "#3b82f6" },
  { code: "D", name: "交付能力", fullName: "Delivery", color: "#22c55e" },
  { code: "C", name: "客户价值", fullName: "Customer Value", color: "#a855f7" },
  { code: "K", name: "知识沉淀", fullName: "Knowledge Precipitation", color: "#eab308" },
  { code: "L", name: "领导力", fullName: "Leadership/Influence", color: "#ec4899" },
];

// 模拟证书数据
const MOCK_CERTIFICATES = [
  {
    id: "cert1",
    certificateNumber: "GRT-T-2026-001234",
    domainCode: "T",
    domainName: "技术能力",
    level: 3,
    userName: "张工程师",
    issueDate: "2026-01-15",
    expiryDate: "2027-01-15",
    status: "valid",
    pdfUrl: "#",
  },
  {
    id: "cert2",
    certificateNumber: "GRT-D-2025-005678",
    domainCode: "D",
    domainName: "交付能力",
    level: 4,
    userName: "张工程师",
    issueDate: "2025-08-20",
    expiryDate: "2026-08-20",
    status: "valid",
    pdfUrl: "#",
  },
];

export default function CapabilityCertificates() {
  const { t } = useLanguage();
  const [verifyNumber, setVerifyNumber] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 获取证书资格
  const eligibilityQuery = trpc.capabilityOs.checkCertificateEligibility.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // 获取我的证书
  const certificatesQuery = trpc.capabilityOs.getMyCertificates.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // 生成证书
  const generateMutation = trpc.capabilityOs.generateCertificate.useMutation({
    onSuccess: (data) => {
      toast.success(`${t("quality.capCert.generateSuccess")}: ${(data as any).certificateNumber}`);
      certificatesQuery.refetch();
      setSelectedDomain(null);
    },
    onError: (error) => {
      toast.error(`${t("quality.capCert.generateFailed")}: ${error.message}`);
    },
  });

  // 验证证书
  const handleVerify = async () => {
    if (!verifyNumber.trim()) {
      toast.error(t("quality.capCert.enterCertNumber"));
      return;
    }

    setIsVerifying(true);
    try {
      // 模拟验证
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (verifyNumber.startsWith("GRT-")) {
        setVerifyResult({
          valid: true,
          certificateNumber: verifyNumber,
          userName: "张工程师",
          domainName: "技术能力",
          level: 3,
          issueDate: "2026-01-15",
          expiryDate: "2027-01-15",
        });
      } else {
        setVerifyResult({ valid: false });
      }
    } catch (error) {
      setVerifyResult({ valid: false });
    } finally {
      setIsVerifying(false);
    }
  };

  // 复制分享链接
  const copyShareLink = (certificateNumber: string) => {
    const shareUrl = `${window.location.origin}/verify-certificate?number=${certificateNumber}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success(t("quality.capCert.shareLinkCopied"));
  };

  // 下载证书
  const downloadCertificate = (cert: any) => {
    toast.info(`${t("quality.capCert.downloading")} ${cert.certificateNumber}`);
    // 实际实现中会调用后端生成PDF并下载
  };

  // 生成新证书
  const handleGenerateCertificate = (domainCode: string) => {
    setIsGenerating(true);
    generateMutation.mutate(
      { domainCode },
      {
        onSettled: () => setIsGenerating(false),
      }
    );
  };

  // 使用模拟数据或真实数据
  const certificates = certificatesQuery.data || MOCK_CERTIFICATES;
  const eligibleDomains = (eligibilityQuery.data as any)?.eligibleDomains || [
    { code: "T", name: "技术能力", level: 3 },
    { code: "D", name: "交付能力", level: 4 },
  ];

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Award}
          title={t("quality.capCert.title")}
          description={t("quality.capCert.description")}
        />

        <Tabs defaultValue="my-certificates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="my-certificates" className="gap-2">
              <Award className="h-4 w-4" />
              {t("quality.capCert.tabMyCerts")}
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-2">
              <Shield className="h-4 w-4" />
              {t("quality.capCert.tabApply")}
            </TabsTrigger>
            <TabsTrigger value="verify" className="gap-2">
              <Search className="h-4 w-4" />
              {t("quality.capCert.tabVerify")}
            </TabsTrigger>
          </TabsList>

          {/* 我的证书 */}
          <TabsContent value="my-certificates">
            <div className="grid gap-4 md:grid-cols-2">
              {certificates.length === 0 ? (
                <Card className="col-span-2">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Award className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t("quality.capCert.noCerts")}</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {t("quality.capCert.noCertsHint")}
                    </p>
                    <Button variant="outline" asChild>
                      <Link href="#generate">{t("quality.capCert.goApply")}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                certificates.map((cert: any) => {
                  const domain = DOMAINS.find((d) => d.code === cert.domainCode);
                  return (
                    <Card
                      key={cert.id}
                      className="relative overflow-hidden border-2"
                      style={{ borderColor: domain?.color }}
                    >
                      {/* 证书装饰 */}
                      <div
                        className="absolute top-0 right-0 w-24 h-24 opacity-10"
                        style={{ backgroundColor: domain?.color }}
                      />
                      <div
                        className="absolute top-2 right-2 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: domain?.color }}
                      >
                        L{cert.level}
                      </div>

                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <Award className="h-8 w-8" style={{ color: domain?.color }} />
                          <div>
                            <CardTitle>{cert.domainName} {t("quality.capCert.certSuffix")}</CardTitle>
                            <CardDescription>{cert.certificateNumber}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">{t("quality.capCert.holder")}</p>
                            <p className="font-medium">{cert.userName}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t("quality.capCert.capabilityLevel")}</p>
                            <p className="font-medium">Level {cert.level}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t("quality.capCert.issueDate")}</p>
                            <p className="font-medium">{cert.issueDate}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t("quality.capCert.validUntil")}</p>
                            <p className="font-medium">{cert.expiryDate}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          {cert.status === "valid" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs">
                              <CheckCircle2 className="h-3 w-3" />
                              {t("quality.capCert.statusValid")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs">
                              <XCircle className="h-3 w-3" />
                              {t("quality.capCert.statusExpired")}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => downloadCertificate(cert)}
                          >
                            <Download className="h-4 w-4" />
                            {t("quality.capCert.downloadPdf")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => copyShareLink(cert.certificateNumber)}
                          >
                            <Share2 className="h-4 w-4" />
                            {t("quality.capCert.share")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* 申请证书 */}
          <TabsContent value="generate">
            <Card>
              <CardHeader>
                <CardTitle>{t("quality.capCert.applyTitle")}</CardTitle>
                <CardDescription>{t("quality.capCert.applyDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {eligibleDomains.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t("quality.capCert.noEligible")}</h3>
                    <p className="text-muted-foreground">
                      {t("quality.capCert.noEligibleHint")}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {eligibleDomains.map((domain: any) => {
                      const domainConfig = DOMAINS.find((d) => d.code === domain.code);
                      return (
                        <Card
                          key={domain.code}
                          className="cursor-pointer hover:shadow-lg transition-shadow"
                          style={{ borderColor: domainConfig?.color }}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                                style={{ backgroundColor: domainConfig?.color }}
                              >
                                {domain.code}
                              </div>
                              <span
                                className="px-3 py-1 rounded-full text-white text-sm font-bold"
                                style={{ backgroundColor: domainConfig?.color }}
                              >
                                L{domain.level}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <h4 className="font-semibold mb-1">{domain.name}</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                              {domainConfig?.fullName}
                            </p>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  className="w-full gap-2"
                                  style={{ backgroundColor: domainConfig?.color }}
                                  onClick={() => setSelectedDomain(domain.code)}
                                >
                                  <Award className="h-4 w-4" />
                                  {t("quality.capCert.tabApply")}
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>{t("quality.capCert.confirmApply")}</DialogTitle>
                                  <DialogDescription>
                                    {t("quality.capCert.confirmApplyDesc")} {domain.name} L{domain.level}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="p-4 rounded-lg bg-muted">
                                    <div className="flex items-center gap-3 mb-3">
                                      <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                                        style={{ backgroundColor: domainConfig?.color }}
                                      >
                                        {domain.code}
                                      </div>
                                      <div>
                                        <p className="font-semibold">{domain.name} {t("quality.capCert.certSuffix")}</p>
                                        <p className="text-sm text-muted-foreground">Level {domain.level}</p>
                                      </div>
                                    </div>
                                    <ul className="text-sm text-muted-foreground space-y-1">
                                      <li>• {t("quality.capCert.validityNote")}</li>
                                      <li>• {t("quality.capCert.usageNote")}</li>
                                      <li>• {t("quality.capCert.verifyNote")}</li>
                                    </ul>
                                  </div>
                                  <Button
                                    className="w-full gap-2"
                                    onClick={() => handleGenerateCertificate(domain.code)}
                                    disabled={isGenerating}
                                  >
                                    {isGenerating ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t("quality.capCert.generating")}
                                      </>
                                    ) : (
                                      <>
                                        <Award className="h-4 w-4" />
                                        {t("quality.capCert.confirmBtn")}
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 验证证书 */}
          <TabsContent value="verify">
            <Card>
              <CardHeader>
                <CardTitle>{t("quality.capCert.verifyTitle")}</CardTitle>
                <CardDescription>{t("quality.capCert.verifyDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder={t("quality.capCert.verifyPlaceholder")}
                    value={verifyNumber}
                    onChange={(e) => setVerifyNumber(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleVerify} disabled={isVerifying} className="gap-2">
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("quality.capCert.verifying")}
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        {t("quality.capCert.verifyBtn")}
                      </>
                    )}
                  </Button>
                </div>

                {verifyResult && (
                  <div
                    className={`p-4 rounded-lg border ${
                      verifyResult.valid
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-red-500/10 border-red-500/30"
                    }`}
                  >
                    {verifyResult.valid ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-green-500">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-semibold">{t("quality.capCert.certValid")}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">{t("quality.capCert.certNumber")}</p>
                            <p className="font-medium">{verifyResult.certificateNumber}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t("quality.capCert.holder")}</p>
                            <p className="font-medium">{verifyResult.userName}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t("quality.capCert.domain")}</p>
                            <p className="font-medium">{verifyResult.domainName}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t("quality.capCert.capabilityLevel")}</p>
                            <p className="font-medium">Level {verifyResult.level}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t("quality.capCert.issueDate")}</p>
                            <p className="font-medium">{verifyResult.issueDate}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t("quality.capCert.validUntil")}</p>
                            <p className="font-medium">{verifyResult.expiryDate}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-500">
                        <XCircle className="h-5 w-5" />
                        <span className="font-semibold">{t("quality.capCert.certInvalid")}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
