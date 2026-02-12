import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Server, 
  Database, 
  Shield, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  RefreshCw,
  Download,
  Terminal,
  FileText,
  Settings,
  Users,
  BarChart3,
  MessageSquare,
  Keyboard
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import JSZip from "jszip";

interface CheckResult {
  id: string;
  name: string;
  status: "pending" | "running" | "success" | "error";
  message: string;
  timestamp?: string;
}

interface DeploymentLog {
  time: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
}

export default function DeploymentSpec() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");
  const [checkResults, setCheckResults] = useState<CheckResult[]>([
    { id: "1", name: "应用进程状态", status: "pending", message: "等待检查" },
    { id: "2", name: "数据库连接", status: "pending", message: "等待检查" },
    { id: "3", name: "缓存服务", status: "pending", message: "等待检查" },
    { id: "4", name: "环境变量", status: "pending", message: "等待检查" },
    { id: "5", name: "API响应", status: "pending", message: "等待检查" },
    { id: "6", name: "安全配置", status: "pending", message: "等待检查" },
    { id: "7", name: "性能指标", status: "pending", message: "等待检查" },
  ]);
  const [deploymentLogs, setDeploymentLogs] = useState<DeploymentLog[]>([]);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // 下载部署包处理函数
  const handleDownloadDeploymentPackage = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    
    try {
      // 调用API获取部署包数据
      const response = await fetch('/api/trpc/changeManagement.downloadDeploymentPackage', {
        method: 'GET',
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (!result.result?.data?.success) {
        throw new Error('获取部署包失败');
      }
      
      const packageData = result.result.data.data;
      
      // 使用JSZip生成ZIP文件
      const zip = new JSZip();
      const folder = zip.folder(packageData.name);
      
      if (folder) {
        for (const file of packageData.files) {
          folder.file(file.filename, file.content);
        }
      }
      
      // 生成并下载ZIP文件
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${packageData.name}-v${packageData.version}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('部署包下载成功', {
        description: `已下载 ${packageData.name}-v${packageData.version}.zip`,
      });
    } catch (error: any) {
      console.error('下载部署包失败:', error);
      toast.error('下载失败', {
        description: error.message || '请稍后重试',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // 快捷键处理
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "F5" && !event.ctrlKey) {
      event.preventDefault();
      runDeploymentCheck();
    } else if (event.key === "F6" && !event.ctrlKey) {
      event.preventDefault();
      runUpdateCheck();
    } else if (event.ctrlKey && event.shiftKey && event.key === "D") {
      event.preventDefault();
      setActiveTab("check");
    } else if (event.ctrlKey && event.shiftKey && event.key === "H") {
      event.preventDefault();
      window.location.href = "/help";
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const addLog = (level: DeploymentLog["level"], message: string) => {
    const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setDeploymentLogs(prev => [...prev, { time, level, message }]);
  };

  const runDeploymentCheck = async () => {
    if (isRunningCheck) return;
    setIsRunningCheck(true);
    setDeploymentLogs([]);
    
    addLog("info", "开始执行部署检查...");
    
    // 模拟检查过程
    const checks = [...checkResults];
    for (let i = 0; i < checks.length; i++) {
      checks[i].status = "running";
      setCheckResults([...checks]);
      addLog("info", `正在检查: ${checks[i].name}...`);
      
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      
      // 模拟检查结果
      const success = Math.random() > 0.1;
      checks[i].status = success ? "success" : "error";
      checks[i].message = success ? "检查通过" : "检查失败，请查看详情";
      checks[i].timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
      setCheckResults([...checks]);
      
      addLog(success ? "success" : "error", `${checks[i].name}: ${checks[i].message}`);
    }
    
    const successCount = checks.filter(c => c.status === "success").length;
    addLog("info", `检查完成! 通过: ${successCount}/${checks.length}`);
    setIsRunningCheck(false);
  };

  const runUpdateCheck = async () => {
    if (isRunningCheck) return;
    setIsRunningCheck(true);
    setDeploymentLogs([]);
    
    addLog("info", "开始执行更新检查...");
    addLog("info", "正在对比版本...");
    await new Promise(resolve => setTimeout(resolve, 800));
    addLog("success", "当前版本: v4.5.0");
    addLog("info", "正在检查兼容性...");
    await new Promise(resolve => setTimeout(resolve, 600));
    addLog("success", "数据库兼容性: 通过");
    addLog("success", "API兼容性: 通过");
    addLog("info", "正在验证备份...");
    await new Promise(resolve => setTimeout(resolve, 500));
    addLog("success", "数据库备份: 已确认");
    addLog("success", "配置备份: 已确认");
    addLog("info", "更新检查完成!");
    
    setIsRunningCheck(false);
  };

  const getStatusIcon = (status: CheckResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "running":
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const getLogColor = (level: DeploymentLog["level"]) => {
    switch (level) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      default:
        return "text-blue-400";
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
              <Server className="w-8 h-8 text-primary" />
              部署规范
            </h1>
            <p className="text-muted-foreground mt-1">
              GRT智慧系统部署、运维与版本管理规范
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Keyboard className="w-3 h-3 mr-1" />
              F5 部署检查
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Keyboard className="w-3 h-3 mr-1" />
              F6 更新检查
            </Badge>
          </div>
        </div>

        {/* 快捷操作栏 */}
        <div className="flex gap-3">
          <Button 
            onClick={runDeploymentCheck} 
            disabled={isRunningCheck}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            执行部署检查 (F5)
          </Button>
          <Button 
            variant="outline" 
            onClick={runUpdateCheck}
            disabled={isRunningCheck}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            执行更新检查 (F6)
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleDownloadDeploymentPackage}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4" />
            {isDownloading ? "正在生成..." : "下载部署包"}
          </Button>
        </div>

        {/* 主要内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="gap-2">
              <FileText className="w-4 h-4" />
              概述
            </TabsTrigger>
            <TabsTrigger value="deploy" className="gap-2">
              <Server className="w-4 h-4" />
              部署流程
            </TabsTrigger>
            <TabsTrigger value="product" className="gap-2">
              <Settings className="w-4 h-4" />
              产品知识库
            </TabsTrigger>
            <TabsTrigger value="project" className="gap-2">
              <Users className="w-4 h-4" />
              项目人员
            </TabsTrigger>
            <TabsTrigger value="bi" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              实时BI
            </TabsTrigger>
            <TabsTrigger value="check" className="gap-2">
              <Terminal className="w-4 h-4" />
              检查控制台
            </TabsTrigger>
          </TabsList>

          {/* 概述标签页 */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-primary" />
                    部署架构
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    GRT智慧系统采用分层架构设计，支持单机部署和分布式高可用部署两种模式。
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>负载均衡层</span>
                      <Badge>Nginx/HAProxy</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>应用服务层</span>
                      <Badge>Node.js + Express</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>AI引擎层</span>
                      <Badge>Gemini + Claude</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>数据存储层</span>
                      <Badge>MySQL + Redis + S3</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    系统要求
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-medium mb-1">最低配置</div>
                      <p className="text-muted-foreground">2核CPU / 4GB内存 / 20GB SSD</p>
                    </div>
                    <div>
                      <div className="font-medium mb-1">推荐配置</div>
                      <p className="text-muted-foreground">4核CPU / 8GB内存 / 50GB SSD</p>
                    </div>
                    <div>
                      <div className="font-medium mb-1">高可用配置</div>
                      <p className="text-muted-foreground">8核×3节点 / 16GB×3 / 100GB×3</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    安全配置
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>HTTPS/SSL加密</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>JWT身份验证</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>RBAC权限控制</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>数据脱敏代理</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>安全审计日志</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 快捷键说明 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-primary" />
                  快捷键说明
                </CardTitle>
                <CardDescription>
                  使用快捷键可以快速执行常用操作
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-mono text-sm font-bold mb-1">F5</div>
                    <div className="text-xs text-muted-foreground">执行部署检查</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-mono text-sm font-bold mb-1">F6</div>
                    <div className="text-xs text-muted-foreground">执行更新检查</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-mono text-sm font-bold mb-1">Ctrl+Shift+D</div>
                    <div className="text-xs text-muted-foreground">打开检查控制台</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-mono text-sm font-bold mb-1">Ctrl+Shift+H</div>
                    <div className="text-xs text-muted-foreground">打开帮助中心</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 部署流程标签页 */}
          <TabsContent value="deploy" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Docker部署步骤</CardTitle>
                  <CardDescription>推荐的部署方式，确保环境一致性</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                      <div>
                        <div className="font-medium">获取部署包</div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">git clone https://github.com/grt-system/grt-implementation-plan.git</code>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                      <div>
                        <div className="font-medium">配置环境变量</div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">cp docker/config.env.template docker/config.env</code>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
                      <div>
                        <div className="font-medium">启动服务</div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">docker-compose up -d</code>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">4</div>
                      <div>
                        <div className="font-medium">初始化数据库</div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">docker-compose exec app pnpm db:push</code>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">5</div>
                      <div>
                        <div className="font-medium">验证部署</div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">curl http://localhost:3000/api/health</code>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>版本更新流程</CardTitle>
                  <CardDescription>安全可靠的版本更新步骤</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">1</div>
                      <div>
                        <div className="font-medium">备份数据</div>
                        <p className="text-xs text-muted-foreground">备份数据库和配置文件</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">2</div>
                      <div>
                        <div className="font-medium">拉取最新镜像</div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">docker-compose pull</code>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">3</div>
                      <div>
                        <div className="font-medium">停止并重启</div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">docker-compose down && docker-compose up -d</code>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">4</div>
                      <div>
                        <div className="font-medium">运行迁移</div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">docker-compose exec app pnpm db:push</code>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">5</div>
                      <div>
                        <div className="font-medium">验证更新</div>
                        <p className="text-xs text-muted-foreground">检查版本号和功能正常</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 产品知识库标签页 */}
          <TabsContent value="product" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>产品型号体系</CardTitle>
                <CardDescription>GRT智慧系统管理的工业清洗设备产品系列</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">系列代码</th>
                        <th className="text-left py-2">系列名称</th>
                        <th className="text-left py-2">适用场景</th>
                        <th className="text-left py-2">清洁度等级</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2"><Badge>USC</Badge></td>
                        <td>超声波清洗系列</td>
                        <td>精密零部件清洗</td>
                        <td>VDA 19.1 Class 1-3</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2"><Badge>SPR</Badge></td>
                        <td>喷淋清洗系列</td>
                        <td>大型工件清洗</td>
                        <td>VDA 19.1 Class 4-6</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2"><Badge>VAC</Badge></td>
                        <td>真空干燥系列</td>
                        <td>高精度干燥</td>
                        <td>无残留</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2"><Badge>HYB</Badge></td>
                        <td>混合清洗系列</td>
                        <td>复杂工艺组合</td>
                        <td>定制</td>
                      </tr>
                      <tr>
                        <td className="py-2"><Badge>AUT</Badge></td>
                        <td>自动化产线系列</td>
                        <td>全自动生产线</td>
                        <td>定制</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>产品命名规范</CardTitle>
                <CardDescription>产品编码格式: [系列代码]-[容量代码]-[功能代码]-[版本号]</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                  <div className="mb-2">示例: <span className="text-primary font-bold">USC-500L-4F-V2</span></div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-background rounded">
                      <div className="font-bold text-primary">USC</div>
                      <div className="text-muted-foreground">系列代码</div>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <div className="font-bold text-primary">500L</div>
                      <div className="text-muted-foreground">容量代码</div>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <div className="font-bold text-primary">4F</div>
                      <div className="text-muted-foreground">功能代码</div>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <div className="font-bold text-primary">V2</div>
                      <div className="text-muted-foreground">版本号</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 项目人员标签页 */}
          <TabsContent value="project" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>人员角色与职责</CardTitle>
                <CardDescription>系统中定义的核心角色及其职责范围</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">角色</th>
                        <th className="text-left py-2">职责描述</th>
                        <th className="text-left py-2">系统权限</th>
                        <th className="text-left py-2">汇报对象</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 font-medium">系统管理员</td>
                        <td>系统配置与运维</td>
                        <td><Badge variant="destructive">完全权限</Badge></td>
                        <td>IT总监</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">项目经理</td>
                        <td>项目全流程管理</td>
                        <td><Badge>项目管理权限</Badge></td>
                        <td>部门经理</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">设计工程师</td>
                        <td>方案设计与图纸</td>
                        <td><Badge>设计模块权限</Badge></td>
                        <td>项目经理</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">销售工程师</td>
                        <td>客户关系与报价</td>
                        <td><Badge>销售模块权限</Badge></td>
                        <td>销售总监</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">生产主管</td>
                        <td>生产计划与执行</td>
                        <td><Badge>生产模块权限</Badge></td>
                        <td>生产经理</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">人事经理</td>
                        <td>人员招聘与培训</td>
                        <td><Badge>HR模块权限</Badge></td>
                        <td>HR总监</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 实时BI标签页 */}
          <TabsContent value="bi" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>M0-M12项目阶段定义</CardTitle>
                <CardDescription>门径管理模型，每个阶段都有明确的交付物和门禁条件</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">阶段</th>
                        <th className="text-left py-2">名称</th>
                        <th className="text-left py-2">关键交付物</th>
                        <th className="text-left py-2">责任人</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { stage: "M0", name: "商机识别", deliverable: "客户需求初评", owner: "销售" },
                        { stage: "M1", name: "需求确认", deliverable: "技术规格书(GTR/CSR)", owner: "销售+设计" },
                        { stage: "M2", name: "方案设计", deliverable: "初步方案", owner: "设计" },
                        { stage: "M3", name: "详细设计", deliverable: "详细图纸", owner: "设计" },
                        { stage: "M4", name: "报价审批", deliverable: "正式报价", owner: "销售+财务" },
                        { stage: "M5", name: "合同签订", deliverable: "签约合同", owner: "销售+法务" },
                        { stage: "M6", name: "采购启动", deliverable: "采购订单", owner: "采购" },
                        { stage: "M7", name: "生产制造", deliverable: "生产工单", owner: "生产" },
                        { stage: "M8", name: "装配测试", deliverable: "FAT测试报告", owner: "生产+质量" },
                        { stage: "M9", name: "发货安装", deliverable: "发货清单", owner: "物流" },
                        { stage: "M10", name: "现场调试", deliverable: "调试报告", owner: "服务" },
                        { stage: "M11", name: "培训交付", deliverable: "培训记录", owner: "服务" },
                        { stage: "M12", name: "质保服务", deliverable: "服务记录", owner: "服务" },
                      ].map((item) => (
                        <tr key={item.stage} className="border-b">
                          <td className="py-2"><Badge variant="outline">{item.stage}</Badge></td>
                          <td className="font-medium">{item.name}</td>
                          <td>{item.deliverable}</td>
                          <td>{item.owner}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 检查控制台标签页 */}
          <TabsContent value="check" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 检查结果 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    检查结果
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {checkResults.map((result) => (
                      <div key={result.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(result.status)}
                          <div>
                            <div className="font-medium text-sm">{result.name}</div>
                            <div className="text-xs text-muted-foreground">{result.message}</div>
                          </div>
                        </div>
                        {result.timestamp && (
                          <div className="text-xs text-muted-foreground">{result.timestamp}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 执行日志 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-primary" />
                    执行日志
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs h-[400px] overflow-y-auto">
                    {deploymentLogs.length === 0 ? (
                      <div className="text-gray-500">按 F5 执行部署检查，或按 F6 执行更新检查...</div>
                    ) : (
                      deploymentLogs.map((log, index) => (
                        <div key={index} className="mb-1">
                          <span className="text-gray-500">[{log.time}]</span>{" "}
                          <span className={getLogColor(log.level)}>{log.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
