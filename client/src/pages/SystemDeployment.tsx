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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // tRPC查询
  const envComparisonQuery = trpc.changeManagement.getEnvironmentComparison.useQuery();
  const testConfigsQuery = trpc.changeManagement.getEnvironmentConfigs.useQuery({ environment: 'test' });
  const prodConfigsQuery = trpc.changeManagement.getEnvironmentConfigs.useQuery({ environment: 'production' });
  const syncMutation = trpc.changeManagement.syncTestToProduction.useMutation({
    onSuccess: () => {
      toast.success('同步完成！');
      envComparisonQuery.refetch();
      testConfigsQuery.refetch();
      prodConfigsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`同步失败: ${error.message}`);
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
    { id: 1, name: '环境检测', description: '检测系统环境和依赖', status: 'pending', progress: 0 },
    { id: 2, name: '依赖安装', description: '安装必要的软件依赖', status: 'pending', progress: 0 },
    { id: 3, name: '数据库配置', description: '配置数据库连接和初始化', status: 'pending', progress: 0 },
    { id: 4, name: '应用部署', description: '部署应用程序文件', status: 'pending', progress: 0 },
    { id: 5, name: '安全配置', description: '配置安全选项和证书', status: 'pending', progress: 0 },
    { id: 6, name: '服务启动', description: '启动应用服务', status: 'pending', progress: 0 },
    { id: 7, name: '健康检查', description: '验证安装结果', status: 'pending', progress: 0 },
  ]);
  
  // 环境状态 - 使用API数据
  const envComparison = envComparisonQuery.data?.data;
  const environments = [
    {
      name: '测试环境',
      type: 'test' as const,
      status: envComparison?.test?.status || 'offline',
      version: envComparison?.test?.version || 'unknown',
      lastDeployed: envComparison?.test?.lastSyncAt ? new Date(envComparison.test.lastSyncAt).toLocaleString() : '-',
      url: 'https://test.grt-system.local',
      health: envComparison?.test?.status === 'online' ? 'healthy' : 'unknown',
      configCount: envComparison?.test?.configCount || 0,
    },
    {
      name: '正式环境',
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
      duration: '5分钟',
      changeRequestNo: 'CR-2026-0001',
    },
    {
      id: 2,
      version: 'v4.4.5',
      environment: 'production',
      status: 'success',
      deployedBy: '李四',
      deployedAt: '2026-01-28 10:00:00',
      duration: '8分钟',
      changeRequestNo: 'CR-2026-0002',
    },
    {
      id: 3,
      version: 'v4.4.4',
      environment: 'test',
      status: 'failed',
      deployedBy: '王五',
      deployedAt: '2026-01-27 16:00:00',
      duration: '3分钟',
      changeRequestNo: 'CR-2026-0003',
      error: '一致性检查失败',
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
    toast.success('安装完成！');
  };
  
  const handleSyncToProduction = () => {
    toast.info('正在同步测试环境到正式环境...');
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
          title="系统部署管理"
          description="管理测试/正式双环境部署和系统安装"
          actions={
            <>
              <Button variant="outline" onClick={() => setActiveTab('installer')}>
                <Download className="w-4 h-4 mr-2" />
                下载安装包
              </Button>
              <Button onClick={() => setIsInstallDialogOpen(true)}>
                <Play className="w-4 h-4 mr-2" />
                新建部署
              </Button>
            </>
          }
        />
              <Dialog open={isInstallDialogOpen} onOpenChange={setIsInstallDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>系统部署向导</DialogTitle>
                  <DialogDescription>
                    按照向导配置部署选项，系统将自动完成安装
                  </DialogDescription>
                </DialogHeader>
                
                {/* 步骤指示器 */}
                <div className="flex items-center justify-between mb-6">
                  {['部署方式', '数据库', '安全配置', '功能模块', '确认'].map((step, i) => (
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
                    <h3 className="font-medium">选择部署方式</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { type: 'windows' as const, name: 'Windows 服务器', desc: '适用于Windows 11 Server', icon: Monitor },
                        { type: 'docker' as const, name: 'Docker 容器', desc: '适用于Docker环境', icon: HardDrive },
                        { type: 'kubernetes' as const, name: 'Kubernetes', desc: '适用于K8s集群', icon: Cloud },
                        { type: 'manus_cloud' as const, name: 'Manus 云端', desc: '托管在Manus平台', icon: Zap },
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
                      <Label>目标环境</Label>
                      <Select
                        value={config.environment}
                        onValueChange={(v) => setConfig({ ...config, environment: v as EnvironmentType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="test">测试环境</SelectItem>
                          <SelectItem value="production">正式环境</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                {/* 步骤2: 数据库配置 */}
                {installStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">数据库配置</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>数据库类型</Label>
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
                        <Label>主机地址</Label>
                        <Input
                          value={config.database.host}
                          onChange={(e) => setConfig({
                            ...config,
                            database: { ...config.database, host: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>端口</Label>
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
                        <Label>数据库名</Label>
                        <Input
                          value={config.database.name}
                          onChange={(e) => setConfig({
                            ...config,
                            database: { ...config.database, name: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>用户名</Label>
                        <Input
                          value={config.database.user}
                          onChange={(e) => setConfig({
                            ...config,
                            database: { ...config.database, user: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>密码</Label>
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
                      <Label>启用SSL连接</Label>
                    </div>
                  </div>
                )}
                
                {/* 步骤3: 安全配置 */}
                {installStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">安全配置</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'enableHttps', label: '启用HTTPS', desc: '使用SSL/TLS加密通信' },
                        { key: 'enableTwoFactor', label: '双因素认证', desc: '登录时需要额外验证' },
                        { key: 'enableIpWhitelist', label: 'IP白名单', desc: '限制允许访问的IP地址' },
                        { key: 'enableAuditLog', label: '审计日志', desc: '记录所有操作日志' },
                        { key: 'enableIntrusionDetection', label: '入侵检测', desc: '检测SQL注入、XSS等攻击' },
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
                    <h3 className="font-medium">功能模块</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'crm', label: 'CRM客户管理', desc: '客户信息、商机、联系人管理' },
                        { key: 'project', label: '项目管理', desc: '项目全生命周期管理' },
                        { key: 'cost', label: '成本管理', desc: '成本核算、预算管理' },
                        { key: 'training', label: '培训管理', desc: '培训计划、记录、评估' },
                        { key: 'ai', label: 'AI智能助手', desc: 'Gemini AI集成' },
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
                    <h3 className="font-medium">确认配置</h3>
                    <div className="space-y-4 text-sm">
                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">部署方式</span>
                          <span className="font-medium">{
                            config.deploymentType === 'windows' ? 'Windows服务器' :
                            config.deploymentType === 'docker' ? 'Docker容器' :
                            config.deploymentType === 'kubernetes' ? 'Kubernetes' : 'Manus云端'
                          }</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">目标环境</span>
                          <span className="font-medium">{config.environment === 'test' ? '测试环境' : '正式环境'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">数据库</span>
                          <span className="font-medium">{config.database.type.toUpperCase()} @ {config.database.host}:{config.database.port}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">安全选项</span>
                          <span className="font-medium">
                            {Object.entries(config.security).filter(([_, v]) => v).length} 项已启用
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">功能模块</span>
                          <span className="font-medium">
                            {Object.entries(config.features).filter(([_, v]) => v).length} 个模块
                          </span>
                        </div>
                      </div>
                      
                      {isInstalling && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span>安装进度</span>
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
                      上一步
                    </Button>
                  )}
                  {installStep < 5 && (
                    <Button onClick={() => setInstallStep(installStep + 1)}>
                      下一步
                    </Button>
                  )}
                  {installStep === 5 && !isInstalling && installProgress < 100 && (
                    <Button onClick={handleStartInstall}>
                      <Play className="w-4 h-4 mr-2" />
                      开始安装
                    </Button>
                  )}
                  {installProgress === 100 && (
                    <Button onClick={() => {
                      setIsInstallDialogOpen(false);
                      setInstallStep(1);
                      setInstallProgress(0);
                      setInstallSteps(prev => prev.map(s => ({ ...s, status: 'pending', progress: 0 })));
                    }}>
                      完成
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
        
        {/* 主内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">环境概览</TabsTrigger>
            <TabsTrigger value="history">部署历史</TabsTrigger>
            <TabsTrigger value="installer">安装包下载</TabsTrigger>
            <TabsTrigger value="sync">环境同步</TabsTrigger>
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
                        {(env.status as any) === 'running' ? '运行中' : '已停止'}
                      </Badge>
                    </div>
                    <CardDescription>{env.url}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">当前版本</span>
                        <p className="font-medium">{env.version}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">最后部署</span>
                        <p className="font-medium">{env.lastDeployed}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${env.health === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm">{env.health === 'healthy' ? '健康' : '异常'}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        重启
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings className="w-4 h-4 mr-1" />
                        配置
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* 版本对比 */}
            <Card>
              <CardHeader>
                <CardTitle>版本对比</CardTitle>
                <CardDescription>测试环境与正式环境的版本差异</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">测试环境</p>
                    <p className="text-2xl font-bold text-yellow-500">v4.5.0</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">+1 版本</Badge>
                    <Button variant="outline" size="sm" onClick={handleSyncToProduction}>
                      <Upload className="w-4 h-4 mr-1" />
                      同步到正式
                    </Button>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">正式环境</p>
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
                <CardTitle>部署历史记录</CardTitle>
                <CardDescription>查看所有部署操作的历史记录</CardDescription>
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
                              {record.environment === 'production' ? '正式' : '测试'}
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
                        耗时 {record.duration}
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
                  <CardDescription>适用于Windows 11 Server</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• 自动安装Node.js环境</li>
                    <li>• 配置MySQL数据库</li>
                    <li>• 注册Windows服务</li>
                    <li>• 配置开机自启</li>
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
                  <CardDescription>适用于Docker环境</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Docker Compose配置</li>
                    <li>• 包含MySQL容器</li>
                    <li>• 自动网络配置</li>
                    <li>• 数据持久化</li>
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
                  <CardDescription>适用于K8s集群</CardDescription>
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
                <CardTitle>环境同步流程</CardTitle>
                <CardDescription>从测试环境同步到正式环境的标准流程</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">1</div>
                    <div>
                      <h4 className="font-medium">测试环境验证</h4>
                      <p className="text-sm text-muted-foreground">确保测试环境的所有功能正常运行，通过所有测试用例</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">2</div>
                    <div>
                      <h4 className="font-medium">提交变更申请</h4>
                      <p className="text-sm text-muted-foreground">在变更管理中提交部署申请，填写变更内容和影响分析</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">3</div>
                    <div>
                      <h4 className="font-medium">管理员审批</h4>
                      <p className="text-sm text-muted-foreground">等待管理员审批变更申请，获取执行令牌</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">4</div>
                    <div>
                      <h4 className="font-medium">执行部署</h4>
                      <p className="text-sm text-muted-foreground">使用执行令牌执行部署，系统自动进行一致性检查</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">5</div>
                    <div>
                      <h4 className="font-medium">验证确认</h4>
                      <p className="text-sm text-muted-foreground">部署完成后进行健康检查，确认系统正常运行</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <Shield className="w-5 h-5" />
                  一致性检查机制
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>系统会自动检测申请内容与实际执行内容的一致性：</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>文件变更必须与申请中声明的文件列表一致</li>
                  <li>SQL执行必须与申请中声明的SQL语句一致</li>
                  <li>命令执行必须与申请中声明的命令一致</li>
                  <li>如发现未声明的变更，系统将自动阻断并通知管理员</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
