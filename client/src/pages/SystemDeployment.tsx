/**
 * GRT智能系统 - 系统部署管理页面
 * 
 * 提供测试/正式双环境部署、安装器配置和一致性检查功能
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Cloud, 
  Database, 
  Download, 
  HardDrive, 
  Loader2, 
  Monitor, 
  Play, 
  RefreshCw, 
  Server, 
  Settings, 
  Shield, 
  Terminal,
  Upload,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/grt";
import { useLanguage } from "@/contexts/LanguageContext";

// ===== 类型定义 =====

type DeploymentType = 'windows' | 'docker' | 'kubernetes' | 'manus_cloud';
type EnvironmentType = 'test' | 'production';

interface InstallationConfig {
  deploymentType: DeploymentType;
  environment: EnvironmentType;
  appName: string;
  appPort: number;
  database: {
    type: 'mysql' | 'tidb' | 'postgresql';
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  security: {
    enableHttps: boolean;
    enableTwoFactor: boolean;
    enableIpWhitelist: boolean;
    enableAuditLog: boolean;
    enableIntrusionDetection: boolean;
  };
  features: {
    crm: boolean;
    project: boolean;
    cost: boolean;
    training: boolean;
    ai: boolean;
  };
  backup: {
    enabled: boolean;
    schedule: string;
    retention: number;
  };
  monitoring: {
    enabled: boolean;
    alertEmail: string;
  };
}

interface InstallationStep {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
}

// ===== 主组件 =====

export default function SystemDeployment() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // tRPC查询
  const envComparisonQuery = trpc.changeManagement.getEnvironmentComparison.useQuery();
  const testConfigsQuery = trpc.changeManagement.getEnvironmentConfigs.useQuery({ environment: 'test' });
  const prodConfigsQuery = trpc.changeManagement.getEnvironmentConfigs.useQuery({ environment: 'production' });
  const syncMutation = trpc.changeManagement.syncTestToProduction.useMutation({
    onSuccess: () => {
      toast.success(t("admin.sysDeploy.syncComplete"));
      envComparisonQuery.refetch();
      testConfigsQuery.refetch();
      prodConfigsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`${t("admin.sysDeploy.syncFailed")}: ${error.message}`);
    },
  });
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
  const [installStep, setInstallStep] = useState(1);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  
  // 安装配置
  const [config, setConfig] = useState<InstallationConfig>({
    deploymentType: 'windows',
    environment: 'test',
    appName: 'GRT智能系统',
    appPort: 3000,
    database: {
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      name: 'grt_system',
      user: 'root',
      password: '',
      ssl: false,
    },
    security: {
      enableHttps: true,
      enableTwoFactor: false,
      enableIpWhitelist: false,
      enableAuditLog: true,
      enableIntrusionDetection: true,
    },
    features: {
      crm: true,
      project: true,
      cost: true,
      training: true,
      ai: true,
    },
    backup: {
      enabled: true,
      schedule: '0 2 * * *',
      retention: 30,
    },
    monitoring: {
      enabled: true,
      alertEmail: '',
    },
  });
  
  // 安装步骤
  const [installSteps, setInstallSteps] = useState<InstallationStep[]>([
    { id: 1, name: t("admin.sysDeploy.stepEnvDetect"), description: t("admin.sysDeploy.stepEnvDetectDesc"), status: 'pending', progress: 0 },
    { id: 2, name: t("admin.sysDeploy.stepDepInstall"), description: t("admin.sysDeploy.stepDepInstallDesc"), status: 'pending', progress: 0 },
    { id: 3, name: t("admin.sysDeploy.stepDbConfig"), description: t("admin.sysDeploy.stepDbConfigDesc"), status: 'pending', progress: 0 },
    { id: 4, name: t("admin.sysDeploy.stepAppDeploy"), description: t("admin.sysDeploy.stepAppDeployDesc"), status: 'pending', progress: 0 },
    { id: 5, name: t("admin.sysDeploy.stepSecConfig"), description: t("admin.sysDeploy.stepSecConfigDesc"), status: 'pending', progress: 0 },
    { id: 6, name: t("admin.sysDeploy.stepServiceStart"), description: t("admin.sysDeploy.stepServiceStartDesc"), status: 'pending', progress: 0 },
    { id: 7, name: t("admin.sysDeploy.stepHealthCheck"), description: t("admin.sysDeploy.stepHealthCheckDesc"), status: 'pending', progress: 0 },
  ]);
  
  // 环境状态 - 使用API数据
  const envComparison = envComparisonQuery.data?.data;
  const environments = [
    {
      name: t("admin.sysDeploy.testEnv"),
      type: 'test' as const,
      status: envComparison?.test?.status || 'offline',
      version: envComparison?.test?.version || 'unknown',
      lastDeployed: envComparison?.test?.lastSyncAt ? new Date(envComparison.test.lastSyncAt).toLocaleString() : '-',
      url: 'https://test.grt-system.local',
      health: envComparison?.test?.status === 'online' ? 'healthy' : 'unknown',
      configCount: envComparison?.test?.configCount || 0,
    },
    {
      name: t("admin.sysDeploy.prodEnv"),
      type: 'production' as const,
      status: envComparison?.production?.status || 'offline',
      version: envComparison?.production?.version || 'unknown',
      lastDeployed: envComparison?.production?.lastSyncAt ? new Date(envComparison.production.lastSyncAt).toLocaleString() : '-',
      url: 'https://grt-system.local',
      health: envComparison?.production?.status === 'online' ? 'healthy' : 'unknown',
      configCount: envComparison?.production?.configCount || 0,
    },
  ];
  
  // 最近部署记录
  const deploymentHistory = [
    {
      id: 1,
      version: 'v4.5.0',
      environment: 'test',
      status: 'success',
      deployedBy: '张三',
      deployedAt: '2026-01-30 14:30:00',
      duration: '5 min',
      changeRequestNo: 'CR-2026-0001',
    },
    {
      id: 2,
      version: 'v4.4.5',
      environment: 'production',
      status: 'success',
      deployedBy: '李四',
      deployedAt: '2026-01-28 10:00:00',
      duration: '8 min',
      changeRequestNo: 'CR-2026-0002',
    },
    {
      id: 3,
      version: 'v4.4.4',
      environment: 'test',
      status: 'failed',
      deployedBy: '王五',
      deployedAt: '2026-01-27 16:00:00',
      duration: '3 min',
      changeRequestNo: 'CR-2026-0003',
      error: t("admin.sysDeploy.consistencyCheckFailed"),
    },
  ];
  
  const handleStartInstall = async () => {
    setIsInstalling(true);
    setInstallProgress(0);
    
    // 模拟安装过程
    for (let i = 0; i < installSteps.length; i++) {
      const step = installSteps[i];
      
      // 更新当前步骤状态
      setInstallSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'running' } : s
      ));
      
      // 模拟步骤进度
      for (let p = 0; p <= 100; p += 20) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setInstallSteps(prev => prev.map((s, idx) => 
          idx === i ? { ...s, progress: p } : s
        ));
        setInstallProgress(Math.round((i * 100 + p) / installSteps.length));
      }
      
      // 完成当前步骤
      setInstallSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'completed', progress: 100 } : s
      ));
    }
    
    setIsInstalling(false);
    setInstallProgress(100);
    toast.success(t("admin.sysDeploy.installComplete"));
  };
  
  const handleSyncToProduction = () => {
    toast.info(t("admin.sysDeploy.syncingToProduction"));
    syncMutation.mutate({});
  };
  
  const handleDownloadInstaller = (type: 'windows' | 'docker' | 'k8s') => {
    const filenames = {
      windows: 'grt-installer-windows.bat',
      docker: 'docker-compose.yml',
      k8s: 'k8s-deployment.yaml',
    };
    toast.success(`正在下载 ${filenames[type]}`);
  };
  
  const getDeploymentTypeIcon = (type: DeploymentType) => {
    switch (type) {
      case 'windows': return <Monitor className="w-5 h-5" />;
      case 'docker': return <HardDrive className="w-5 h-5" />;
      case 'kubernetes': return <Cloud className="w-5 h-5" />;
      case 'manus_cloud': return <Zap className="w-5 h-5" />;
    }
  };
  
  return (
      <div className="space-y-6">
        <PageHeader
          icon={Server}
          title={t("admin.sysDeploy.title")}
          description={t("admin.sysDeploy.description")}
          actions={
            <>
              <Button variant="outline" onClick={() => setActiveTab('installer')}>
                <Download className="w-4 h-4 mr-2" />
                {t("admin.sysDeploy.downloadInstaller")}
              </Button>
              <Button onClick={() => setIsInstallDialogOpen(true)}>
                <Play className="w-4 h-4 mr-2" />
                {t("admin.sysDeploy.newDeployment")}
              </Button>
            </>
          }
        />
              <Dialog open={isInstallDialogOpen} onOpenChange={setIsInstallDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("admin.sysDeploy.deployWizard")}</DialogTitle>
                  <DialogDescription>
                    {t("admin.sysDeploy.deployWizardDesc")}
                  </DialogDescription>
                </DialogHeader>
                
                {/* 步骤指示器 */}
                <div className="flex items-center justify-between mb-6">
                  {[t("admin.sysDeploy.wizStep1"), t("admin.sysDeploy.wizStep2"), t("admin.sysDeploy.wizStep3"), t("admin.sysDeploy.wizStep4"), t("admin.sysDeploy.wizStep5")].map((step, i) => (
                    <div key={i} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        installStep > i + 1 ? 'bg-primary text-primary-foreground' :
                        installStep === i + 1 ? 'bg-primary text-primary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {installStep > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      {i < 4 && <div className={`w-12 h-0.5 ${installStep > i + 1 ? 'bg-primary' : 'bg-muted'}`} />}
                    </div>
                  ))}
                </div>
                
                {/* 步骤1: 部署方式 */}
                {installStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">{t("admin.sysDeploy.selectDeployMethod")}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { type: 'windows' as const, name: t("admin.sysDeploy.windowsServer"), desc: t("admin.sysDeploy.windowsServerDesc"), icon: Monitor },
                        { type: 'docker' as const, name: t("admin.sysDeploy.dockerContainer"), desc: t("admin.sysDeploy.dockerContainerDesc"), icon: HardDrive },
                        { type: 'kubernetes' as const, name: 'Kubernetes', desc: t("admin.sysDeploy.k8sDesc"), icon: Cloud },
                        { type: 'manus_cloud' as const, name: t("admin.sysDeploy.manusCloud"), desc: t("admin.sysDeploy.manusCloudDesc"), icon: Zap },
                      ].map((option) => (
                        <Card 
                          key={option.type}
                          className={`cursor-pointer transition-all ${
                            config.deploymentType === option.type 
                              ? 'border-primary ring-2 ring-primary/20' 
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => setConfig({ ...config, deploymentType: option.type })}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                              <option.icon className="w-8 h-8 text-primary" />
                              <div>
                                <p className="font-medium">{option.name}</p>
                                <p className="text-sm text-muted-foreground">{option.desc}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>{t("admin.sysDeploy.targetEnv")}</Label>
                      <Select
                        value={config.environment}
                        onValueChange={(v) => setConfig({ ...config, environment: v as EnvironmentType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="test">{t("admin.sysDeploy.testEnv")}</SelectItem>
                          <SelectItem value="production">{t("admin.sysDeploy.prodEnv")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                {/* 步骤2: 数据库配置 */}
                {installStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">{t("admin.sysDeploy.dbConfig")}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("admin.sysDeploy.dbType")}</Label>
                        <Select
                          value={config.database.type}
                          onValueChange={(v) => setConfig({ 
                            ...config, 
                            database: { ...config.database, type: v as any } 
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mysql">MySQL</SelectItem>
                            <SelectItem value="tidb">TiDB</SelectItem>
                            <SelectItem value="postgresql">PostgreSQL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.sysDeploy.hostAddress")}</Label>
                        <Input
                          value={config.database.host}
                          onChange={(e) => setConfig({
                            ...config,
                            database: { ...config.database, host: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.sysDeploy.port")}</Label>
                        <Input
                          type="number"
                          value={config.database.port}
                          onChange={(e) => setConfig({
                            ...config,
                            database: { ...config.database, port: parseInt(e.target.value) }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.sysDeploy.dbName")}</Label>
                        <Input
                          value={config.database.name}
                          onChange={(e) => setConfig({
                            ...config,
                            database: { ...config.database, name: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.sysDeploy.username")}</Label>
                        <Input
                          value={config.database.user}
                          onChange={(e) => setConfig({
                            ...config,
                            database: { ...config.database, user: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.sysDeploy.password")}</Label>
                        <Input
                          type="password"
                          value={config.database.password}
                          onChange={(e) => setConfig({
                            ...config,
                            database: { ...config.database, password: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={config.database.ssl}
                        onCheckedChange={(checked) => setConfig({
                          ...config,
                          database: { ...config.database, ssl: !!checked }
                        })}
                      />
                      <Label>{t("admin.sysDeploy.enableSSL")}</Label>
                    </div>
                  </div>
                )}
                
                {/* 步骤3: 安全配置 */}
                {installStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">{t("admin.sysDeploy.securityConfig")}</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'enableHttps', label: t("admin.sysDeploy.enableHttps"), desc: t("admin.sysDeploy.enableHttpsDesc") },
                        { key: 'enableTwoFactor', label: t("admin.sysDeploy.twoFactor"), desc: t("admin.sysDeploy.twoFactorDesc") },
                        { key: 'enableIpWhitelist', label: t("admin.sysDeploy.ipWhitelist"), desc: t("admin.sysDeploy.ipWhitelistDesc") },
                        { key: 'enableAuditLog', label: t("admin.sysDeploy.auditLog"), desc: t("admin.sysDeploy.auditLogDesc") },
                        { key: 'enableIntrusionDetection', label: t("admin.sysDeploy.intrusionDetection"), desc: t("admin.sysDeploy.intrusionDetectionDesc") },
                      ].map((option) => (
                        <div key={option.key} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{option.label}</p>
                            <p className="text-sm text-muted-foreground">{option.desc}</p>
                          </div>
                          <Checkbox
                            checked={config.security[option.key as keyof typeof config.security]}
                            onCheckedChange={(checked) => setConfig({
                              ...config,
                              security: { ...config.security, [option.key]: !!checked }
                            })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 步骤4: 功能模块 */}
                {installStep === 4 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">{t("admin.sysDeploy.featureModules")}</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'crm', label: t("admin.sysDeploy.crmModule"), desc: t("admin.sysDeploy.crmModuleDesc") },
                        { key: 'project', label: t("admin.sysDeploy.projectModule"), desc: t("admin.sysDeploy.projectModuleDesc") },
                        { key: 'cost', label: t("admin.sysDeploy.costModule"), desc: t("admin.sysDeploy.costModuleDesc") },
                        { key: 'training', label: t("admin.sysDeploy.trainingModule"), desc: t("admin.sysDeploy.trainingModuleDesc") },
                        { key: 'ai', label: t("admin.sysDeploy.aiModule"), desc: t("admin.sysDeploy.aiModuleDesc") },
                      ].map((option) => (
                        <div key={option.key} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{option.label}</p>
                            <p className="text-sm text-muted-foreground">{option.desc}</p>
                          </div>
                          <Checkbox
                            checked={config.features[option.key as keyof typeof config.features]}
                            onCheckedChange={(checked) => setConfig({
                              ...config,
                              features: { ...config.features, [option.key]: !!checked }
                            })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 步骤5: 确认 */}
                {installStep === 5 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">{t("admin.sysDeploy.confirmConfig")}</h3>
                    <div className="space-y-4 text-sm">
                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("admin.sysDeploy.wizStep1")}</span>
                          <span className="font-medium">{
                            config.deploymentType === 'windows' ? t("admin.sysDeploy.windowsServer") :
                            config.deploymentType === 'docker' ? t("admin.sysDeploy.dockerContainer") :
                            config.deploymentType === 'kubernetes' ? 'Kubernetes' : t("admin.sysDeploy.manusCloud")
                          }</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("admin.sysDeploy.targetEnv")}</span>
                          <span className="font-medium">{config.environment === 'test' ? t("admin.sysDeploy.testEnv") : t("admin.sysDeploy.prodEnv")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("admin.sysDeploy.wizStep2")}</span>
                          <span className="font-medium">{config.database.type.toUpperCase()} @ {config.database.host}:{config.database.port}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("admin.sysDeploy.securityOptions")}</span>
                          <span className="font-medium">
                            {Object.entries(config.security).filter(([_, v]) => v).length} {t("admin.sysDeploy.itemsEnabled")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("admin.sysDeploy.featureModules")}</span>
                          <span className="font-medium">
                            {Object.entries(config.features).filter(([_, v]) => v).length} {t("admin.sysDeploy.modules")}
                          </span>
                        </div>
                      </div>
                      
                      {isInstalling && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span>{t("admin.sysDeploy.installProgress")}</span>
                            <span>{installProgress}%</span>
                          </div>
                          <Progress value={installProgress} />
                          <div className="space-y-2">
                            {installSteps.map((step) => (
                              <div key={step.id} className="flex items-center gap-2 text-sm">
                                {step.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                {step.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                                {step.status === 'pending' && <div className="w-4 h-4 rounded-full border-2" />}
                                {step.status === 'failed' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                <span className={step.status === 'running' ? 'font-medium' : ''}>{step.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <DialogFooter>
                  {installStep > 1 && !isInstalling && (
                    <Button variant="outline" onClick={() => setInstallStep(installStep - 1)}>
                      {t("admin.sysDeploy.prevStep")}
                    </Button>
                  )}
                  {installStep < 5 && (
                    <Button onClick={() => setInstallStep(installStep + 1)}>
                      {t("admin.sysDeploy.nextStep")}
                    </Button>
                  )}
                  {installStep === 5 && !isInstalling && installProgress < 100 && (
                    <Button onClick={handleStartInstall}>
                      <Play className="w-4 h-4 mr-2" />
                      {t("admin.sysDeploy.startInstall")}
                    </Button>
                  )}
                  {installProgress === 100 && (
                    <Button onClick={() => {
                      setIsInstallDialogOpen(false);
                      setInstallStep(1);
                      setInstallProgress(0);
                      setInstallSteps(prev => prev.map(s => ({ ...s, status: 'pending', progress: 0 })));
                    }}>
                      {t("admin.sysDeploy.finish")}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
        
        {/* 主内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">{t("admin.sysDeploy.envOverview")}</TabsTrigger>
            <TabsTrigger value="history">{t("admin.sysDeploy.deployHistory")}</TabsTrigger>
            <TabsTrigger value="installer">{t("admin.sysDeploy.installerDownload")}</TabsTrigger>
            <TabsTrigger value="sync">{t("admin.sysDeploy.envSync")}</TabsTrigger>
          </TabsList>
          
          {/* 环境概览 */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {environments.map((env) => (
                <Card key={env.type} className={env.type === 'production' ? 'border-primary' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {env.type === 'test' ? (
                          <Terminal className="w-5 h-5 text-yellow-500" />
                        ) : (
                          <Server className="w-5 h-5 text-primary" />
                        )}
                        <CardTitle>{env.name}</CardTitle>
                      </div>
                      <Badge variant={(env.status as any) === 'running' ? 'default' : 'secondary'}>
                        {(env.status as any) === 'running' ? t("admin.sysDeploy.running") : t("admin.sysDeploy.stopped")}
                      </Badge>
                    </div>
                    <CardDescription>{env.url}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t("admin.sysDeploy.currentVersion")}</span>
                        <p className="font-medium">{env.version}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("admin.sysDeploy.lastDeploy")}</span>
                        <p className="font-medium">{env.lastDeployed}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${env.health === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm">{env.health === 'healthy' ? t("admin.sysDeploy.healthy") : t("admin.sysDeploy.abnormal")}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        {t("admin.sysDeploy.restart")}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings className="w-4 h-4 mr-1" />
                        {t("admin.sysDeploy.config")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* 版本对比 */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.sysDeploy.versionCompare")}</CardTitle>
                <CardDescription>{t("admin.sysDeploy.versionCompareDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t("admin.sysDeploy.testEnv")}</p>
                    <p className="text-2xl font-bold text-yellow-500">v4.5.0</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">+1 版本</Badge>
                    <Button variant="outline" size="sm" onClick={handleSyncToProduction}>
                      <Upload className="w-4 h-4 mr-1" />
                      {t("admin.sysDeploy.syncToProduction")}
                    </Button>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t("admin.sysDeploy.prodEnv")}</p>
                    <p className="text-2xl font-bold text-primary">v4.4.5</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 部署历史 */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.sysDeploy.deployHistoryTitle")}</CardTitle>
                <CardDescription>{t("admin.sysDeploy.deployHistoryDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deploymentHistory.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {record.status === 'success' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{record.version}</span>
                            <Badge variant={record.environment === 'production' ? 'default' : 'secondary'}>
                              {record.environment === 'production' ? t("admin.sysDeploy.production") : t("admin.sysDeploy.test")}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {record.changeRequestNo} · {record.deployedBy} · {record.deployedAt}
                          </p>
                          {record.error && (
                            <p className="text-sm text-red-500">{record.error}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("admin.sysDeploy.duration")} {record.duration}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 安装包下载 */}
          <TabsContent value="installer" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="w-5 h-5" />
                    Windows 安装包
                  </CardTitle>
                  <CardDescription>{t("admin.sysDeploy.windowsServerDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• {t("admin.sysDeploy.winFeature1")}</li>
                    <li>• {t("admin.sysDeploy.winFeature2")}</li>
                    <li>• {t("admin.sysDeploy.winFeature3")}</li>
                    <li>• {t("admin.sysDeploy.winFeature4")}</li>
                  </ul>
                  <Button className="w-full" onClick={() => handleDownloadInstaller('windows')}>
                    <Download className="w-4 h-4 mr-2" />
                    下载 .bat 安装脚本
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    Docker 部署包
                  </CardTitle>
                  <CardDescription>{t("admin.sysDeploy.dockerContainerDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• {t("admin.sysDeploy.dockerFeature1")}</li>
                    <li>• {t("admin.sysDeploy.dockerFeature2")}</li>
                    <li>• {t("admin.sysDeploy.dockerFeature3")}</li>
                    <li>• {t("admin.sysDeploy.dockerFeature4")}</li>
                  </ul>
                  <Button className="w-full" onClick={() => handleDownloadInstaller('docker')}>
                    <Download className="w-4 h-4 mr-2" />
                    下载 docker-compose.yml
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="w-5 h-5" />
                    Kubernetes 配置
                  </CardTitle>
                  <CardDescription>{t("admin.sysDeploy.k8sDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Deployment配置</li>
                    <li>• Service配置</li>
                    <li>• ConfigMap/Secret</li>
                    <li>• HPA自动伸缩</li>
                  </ul>
                  <Button className="w-full" onClick={() => handleDownloadInstaller('k8s')}>
                    <Download className="w-4 h-4 mr-2" />
                    下载 k8s-deployment.yaml
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* 环境同步 */}
          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.sysDeploy.syncProcess")}</CardTitle>
                <CardDescription>{t("admin.sysDeploy.syncProcessDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">1</div>
                    <div>
                      <h4 className="font-medium">{t("admin.sysDeploy.syncStep1")}</h4>
                      <p className="text-sm text-muted-foreground">{t("admin.sysDeploy.syncStep1Desc")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">2</div>
                    <div>
                      <h4 className="font-medium">{t("admin.sysDeploy.syncStep2")}</h4>
                      <p className="text-sm text-muted-foreground">{t("admin.sysDeploy.syncStep2Desc")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">3</div>
                    <div>
                      <h4 className="font-medium">{t("admin.sysDeploy.syncStep3")}</h4>
                      <p className="text-sm text-muted-foreground">{t("admin.sysDeploy.syncStep3Desc")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">4</div>
                    <div>
                      <h4 className="font-medium">{t("admin.sysDeploy.syncStep4")}</h4>
                      <p className="text-sm text-muted-foreground">{t("admin.sysDeploy.syncStep4Desc")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">5</div>
                    <div>
                      <h4 className="font-medium">{t("admin.sysDeploy.syncStep5")}</h4>
                      <p className="text-sm text-muted-foreground">{t("admin.sysDeploy.syncStep5Desc")}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <Shield className="w-5 h-5" />
                  {t("admin.sysDeploy.consistencyCheck")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>{t("admin.sysDeploy.consistencyCheckDesc")}</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>{t("admin.sysDeploy.consistencyRule1")}</li>
                  <li>{t("admin.sysDeploy.consistencyRule2")}</li>
                  <li>{t("admin.sysDeploy.consistencyRule3")}</li>
                  <li>{t("admin.sysDeploy.consistencyRule4")}</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
