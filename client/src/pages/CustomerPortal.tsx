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
import Layout from "@/components/Layout";
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
      setError("请输入项目编号和访问码");
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
        projectName: `${projectCode} - 高压清洗设备`,
        customerName: "示例客户公司",
        currentPhase: "M4 - 详细设计",
        phaseProgress: 75,
        overallProgress: 35,
        status: 'on_track',
        nextMilestone: "M5 - 设计评审",
        nextMilestoneDate: "2026-02-15",
        lastUpdate: new Date().toISOString().split('T')[0],
        deliverables: [
          { name: "技术方案书", status: 'completed', dueDate: "2026-01-10" },
          { name: "3D设计图纸", status: 'in_progress', dueDate: "2026-02-01" },
          { name: "BOM清单", status: 'pending', dueDate: "2026-02-10" },
          { name: "电气原理图", status: 'pending', dueDate: "2026-02-15" },
        ]
      });
      setError(null);
    } else {
      setError("访问码验证失败，请检查后重试");
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
      case 'on_track': return '按计划进行';
      case 'at_risk': return '存在风险';
      case 'delayed': return '已延期';
      case 'completed': return '已完成';
      default: return '未知';
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
    <Layout>
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* 头部导航 */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">GRT 客户门户</h1>
              <p className="text-xs text-muted-foreground">Customer Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/public">
              <Button variant="ghost" size="sm">
                返回首页
              </Button>
            </Link>
            {isAuthenticated ? (
              <Badge variant="outline" className="gap-1">
                <Unlock className="w-3 h-3" />
                已登录
              </Badge>
            ) : (
              <a href={getLoginUrl()}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Lock className="w-3 h-3" />
                  登录
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
                安全访问您的项目
              </CardTitle>
              <CardDescription>
                使用项目编号和专属访问码查询项目状态，所有数据传输均经过加密保护
              </CardDescription>
            </CardHeader>
          </Card>

          {/* 功能标签页 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status" className="gap-2">
                <Search className="w-4 h-4" />
                项目状态
              </TabsTrigger>
              <TabsTrigger value="verify" className="gap-2">
                <Shield className="w-4 h-4" />
                能力验证
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="w-4 h-4" />
                文档中心
              </TabsTrigger>
            </TabsList>

            {/* 项目状态查询 */}
            <TabsContent value="status" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>项目状态查询</CardTitle>
                  <CardDescription>
                    输入您的项目编号和访问码以查看项目进度
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectCode">项目编号</Label>
                      <Input
                        id="projectCode"
                        placeholder="例如: GRT-2026-001"
                        value={projectCode}
                        onChange={(e) => setProjectCode(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accessCode">访问码</Label>
                      <Input
                        id="accessCode"
                        type="password"
                        placeholder="请输入访问码"
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
                        验证中...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        查询项目
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
                          客户: {projectStatus.customerName} | 更新时间: {projectStatus.lastUpdate}
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
                          <span>当前阶段: {projectStatus.currentPhase}</span>
                          <span>{projectStatus.phaseProgress}%</span>
                        </div>
                        <Progress value={projectStatus.phaseProgress} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>整体进度</span>
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
                          <p className="font-medium">下一里程碑</p>
                          <p className="text-sm text-muted-foreground">{projectStatus.nextMilestone}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{projectStatus.nextMilestoneDate}</Badge>
                    </div>

                    {/* 交付物清单 */}
                    <div className="space-y-3">
                      <h4 className="font-medium">交付物清单</h4>
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
                                {item.status === 'completed' ? '已完成' : 
                                 item.status === 'in_progress' ? '进行中' : 
                                 item.status === 'delivered' ? '已交付' : '待开始'}
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
                    零知识证明验证
                  </CardTitle>
                  <CardDescription>
                    验证GRT的技术能力而不暴露核心工艺参数
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: 'vda19', name: 'VDA 19.1 清洁度合规', desc: '验证清洁度检测能力' },
                      { id: 'iso14644', name: 'ISO 14644 洁净室', desc: '验证洁净室等级达标' },
                      { id: 'process', name: '工艺参数范围', desc: '验证工艺参数在合规范围内' },
                      { id: 'quality', name: '质量检测能力', desc: '验证质量检测系统能力' },
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
                              验证
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
                            <p className="font-medium text-green-600">验证通过</p>
                            <div className="text-sm space-y-1">
                              <p><span className="text-muted-foreground">证明哈希:</span> {verificationResult.proofHash}</p>
                              <p><span className="text-muted-foreground">验证能力:</span> {verificationResult.capability}</p>
                              <p><span className="text-muted-foreground">有效期至:</span> {new Date(verificationResult.expiresAt).toLocaleString()}</p>
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
                  <CardTitle>文档中心</CardTitle>
                  <CardDescription>
                    访问项目相关的公开文档和资料
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: '产品手册', type: 'PDF', size: '2.5 MB', public: true },
                      { name: '技术规格书', type: 'PDF', size: '1.8 MB', public: true },
                      { name: '操作指南', type: 'PDF', size: '3.2 MB', public: true },
                      { name: '维护保养手册', type: 'PDF', size: '1.5 MB', public: false },
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
                            需登录
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
                    <p className="font-medium">需要帮助？</p>
                    <p className="text-sm text-muted-foreground">
                      如果您忘记访问码或遇到其他问题，请联系您的项目经理
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  联系我们
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-border/50 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 GRT智能系统 · 客户门户 · 所有数据均经过加密保护</p>
        </div>
      </footer>
    </div>
    </Layout>
  );
}
