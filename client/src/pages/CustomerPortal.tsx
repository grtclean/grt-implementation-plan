/**
 * GRT智能系统 V3.0 - 客户门户
 *
 * 为客户提供安全的项目状态查询入口
 * 支持ZKP验证和受控访问
 *
 * @version 3.0.0
 * @author GRT System
 * @see RFC-036 AI-AI销售系统架构
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Package,
  Truck,
  Settings,
  Lock,
  Unlock,
  ExternalLink,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";

// 模拟项目数据类型
interface ProjectStatus {
  projectCode: string;
  projectName: string;
  customerName: string;
  currentPhase: string;
  phaseProgress: number;
  overallProgress: number;
  status: 'on_track' | 'at_risk' | 'delayed' | 'completed';
  nextMilestone: string;
  nextMilestoneDate: string;
  lastUpdate: string;
  deliverables: {
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'delivered';
    dueDate: string;
  }[];
}

// 模拟ZKP验证结果
interface ZKPVerificationResult {
  verified: boolean;
  proofHash: string;
  capability: string;
  timestamp: string;
  expiresAt: string;
}

export default function CustomerPortal() {
  const { t } = useLanguage();
  const { user, loading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("status");
  const [projectCode, setProjectCode] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<ZKPVerificationResult | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 模拟项目状态查询
  const handleProjectQuery = async () => {
    if (!projectCode || !accessCode) {
      setError(t("crm.portal.enterProjectAndCode"));
      return;
    }

    setIsVerifying(true);
    setError(null);

    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 模拟验证结果
    if (accessCode === "GRT2026" || accessCode.length >= 6) {
      setProjectStatus({
        projectCode: projectCode,
        projectName: `${projectCode} - ${t("crm.portal.sampleProjectName")}`,
        customerName: t("crm.portal.sampleCustomer"),
        currentPhase: t("crm.portal.samplePhase"),
        phaseProgress: 75,
        overallProgress: 35,
        status: 'on_track',
        nextMilestone: t("crm.portal.sampleNextMilestone"),
        nextMilestoneDate: "2026-02-15",
        lastUpdate: new Date().toISOString().split('T')[0],
        deliverables: [
          { name: t("crm.portal.delivTechSpec"), status: 'completed', dueDate: "2026-01-10" },
          { name: t("crm.portal.deliv3DDesign"), status: 'in_progress', dueDate: "2026-02-01" },
          { name: t("crm.portal.delivBOM"), status: 'pending', dueDate: "2026-02-10" },
          { name: t("crm.portal.delivElectrical"), status: 'pending', dueDate: "2026-02-15" },
        ]
      });
      setError(null);
    } else {
      setError(t("crm.portal.accessCodeFailed"));
      setProjectStatus(null);
    }

    setIsVerifying(false);
  };

  // 模拟ZKP验证
  const handleZKPVerification = async (capability: string) => {
    setIsVerifying(true);

    // 模拟ZKP验证延迟
    await new Promise(resolve => setTimeout(resolve, 2000));

    setVerificationResult({
      verified: true,
      proofHash: `0x${Math.random().toString(16).slice(2, 18)}...`,
      capability: capability,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    setIsVerifying(false);
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-green-500';
      case 'at_risk': return 'bg-yellow-500';
      case 'delayed': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'on_track': return t("crm.portal.statusOnTrack");
      case 'at_risk': return t("crm.portal.statusAtRisk");
      case 'delayed': return t("crm.portal.statusDelayed");
      case 'completed': return t("crm.portal.statusCompleted");
      default: return t("crm.portal.statusUnknown");
    }
  };

  // 获取交付物状态文本
  const getDeliverableStatusText = (status: string) => {
    switch (status) {
      case 'completed': return t("crm.portal.delivStatusCompleted");
      case 'in_progress': return t("crm.portal.delivStatusInProgress");
      case 'delivered': return t("crm.portal.delivStatusDelivered");
      default: return t("crm.portal.delivStatusPending");
    }
  };

  // 获取交付物状态图标
  const getDeliverableIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'delivered': return <Truck className="w-4 h-4 text-blue-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Package className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* 头部导航 */}
      <header className="border-b border-border/50 bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{t("crm.portal.headerTitle")}</h1>
              <p className="text-xs text-muted-foreground">Customer Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/public">
              <Button variant="ghost" size="sm">
                {t("crm.portal.backToHome")}
              </Button>
            </Link>
            {isAuthenticated ? (
              <Badge variant="outline" className="gap-1">
                <Unlock className="w-3 h-3" />
                {t("crm.portal.loggedIn")}
              </Badge>
            ) : (
              <a href={getLoginUrl()}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Lock className="w-3 h-3" />
                  {t("crm.portal.login")}
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* 欢迎卡片 */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                {t("crm.portal.secureAccess")}
              </CardTitle>
              <CardDescription>
                {t("crm.portal.secureAccessDesc")}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* 功能标签页 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status" className="gap-2">
                <Search className="w-4 h-4" />
                {t("crm.portal.tabProjectStatus")}
              </TabsTrigger>
              <TabsTrigger value="verify" className="gap-2">
                <Shield className="w-4 h-4" />
                {t("crm.portal.tabCapabilityVerify")}
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="w-4 h-4" />
                {t("crm.portal.tabDocCenter")}
              </TabsTrigger>
            </TabsList>

            {/* 项目状态查询 */}
            <TabsContent value="status" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("crm.portal.projectStatusQuery")}</CardTitle>
                  <CardDescription>
                    {t("crm.portal.projectStatusDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectCode">{t("crm.portal.projectCode")}</Label>
                      <Input
                        id="projectCode"
                        placeholder={t("crm.portal.projectCodePlaceholder")}
                        value={projectCode}
                        onChange={(e) => setProjectCode(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accessCode">{t("crm.portal.accessCode")}</Label>
                      <Input
                        id="accessCode"
                        type="password"
                        placeholder={t("crm.portal.accessCodePlaceholder")}
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <Button
                    onClick={handleProjectQuery}
                    disabled={isVerifying}
                    className="w-full md:w-auto"
                  >
                    {isVerifying ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        {t("crm.portal.verifying")}
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        {t("crm.portal.queryProject")}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* 项目状态结果 */}
              {projectStatus && (
                <Card className="border-green-500/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{projectStatus.projectName}</CardTitle>
                        <CardDescription>
                          {t("crm.portal.customer")}: {projectStatus.customerName} | {t("crm.portal.updateTime")}: {projectStatus.lastUpdate}
                        </CardDescription>
                      </div>
                      <Badge className={`${getStatusColor(projectStatus.status)} text-white`}>
                        {getStatusText(projectStatus.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 进度概览 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{t("crm.portal.currentPhase")}: {projectStatus.currentPhase}</span>
                          <span>{projectStatus.phaseProgress}%</span>
                        </div>
                        <Progress value={projectStatus.phaseProgress} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{t("crm.portal.overallProgress")}</span>
                          <span>{projectStatus.overallProgress}%</span>
                        </div>
                        <Progress value={projectStatus.overallProgress} className="h-2" />
                      </div>
                    </div>

                    {/* 下一里程碑 */}
                    <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <ArrowRight className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{t("crm.portal.nextMilestone")}</p>
                          <p className="text-sm text-muted-foreground">{projectStatus.nextMilestone}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{projectStatus.nextMilestoneDate}</Badge>
                    </div>

                    {/* 交付物清单 */}
                    <div className="space-y-3">
                      <h4 className="font-medium">{t("crm.portal.deliverableList")}</h4>
                      <div className="space-y-2">
                        {projectStatus.deliverables.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {getDeliverableIcon(item.status)}
                              <span>{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">{item.dueDate}</span>
                              <Badge variant="outline" className="capitalize">
                                {getDeliverableStatusText(item.status)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ZKP能力验证 */}
            <TabsContent value="verify" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    {t("crm.portal.zkpTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("crm.portal.zkpDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: 'vda19', name: t("crm.portal.capVDA19"), desc: t("crm.portal.capVDA19Desc") },
                      { id: 'iso14644', name: t("crm.portal.capISO14644"), desc: t("crm.portal.capISO14644Desc") },
                      { id: 'process', name: t("crm.portal.capProcess"), desc: t("crm.portal.capProcessDesc") },
                      { id: 'quality', name: t("crm.portal.capQuality"), desc: t("crm.portal.capQualityDesc") },
                    ].map((capability) => (
                      <Card key={capability.id} className="border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{capability.name}</p>
                              <p className="text-sm text-muted-foreground">{capability.desc}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleZKPVerification(capability.id)}
                              disabled={isVerifying}
                            >
                              {t("crm.portal.verify")}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* 验证结果 */}
                  {verificationResult && (
                    <Card className="border-green-500/30 bg-green-500/5">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                          <div className="space-y-2 flex-1">
                            <p className="font-medium text-green-600">{t("crm.portal.verificationPassed")}</p>
                            <div className="text-sm space-y-1">
                              <p><span className="text-muted-foreground">{t("crm.portal.proofHash")}:</span> {verificationResult.proofHash}</p>
                              <p><span className="text-muted-foreground">{t("crm.portal.verifiedCapability")}:</span> {verificationResult.capability}</p>
                              <p><span className="text-muted-foreground">{t("crm.portal.validUntil")}:</span> {new Date(verificationResult.expiresAt).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 文档中心 */}
            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("crm.portal.docCenterTitle")}</CardTitle>
                  <CardDescription>
                    {t("crm.portal.docCenterDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: t("crm.portal.docProductManual"), type: 'PDF', size: '2.5 MB', public: true },
                      { name: t("crm.portal.docTechSpec"), type: 'PDF', size: '1.8 MB', public: true },
                      { name: t("crm.portal.docOperationGuide"), type: 'PDF', size: '3.2 MB', public: true },
                      { name: t("crm.portal.docMaintenanceManual"), type: 'PDF', size: '1.5 MB', public: false },
                    ].map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-primary/60" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-sm text-muted-foreground">{doc.type} · {doc.size}</p>
                          </div>
                        </div>
                        {doc.public ? (
                          <Button size="sm" variant="ghost">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Lock className="w-3 h-3" />
                            {t("crm.portal.loginRequired")}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* 底部帮助信息 */}
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t("crm.portal.needHelp")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("crm.portal.needHelpDesc")}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  {t("crm.portal.contactUs")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-border/50 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{t("crm.portal.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
