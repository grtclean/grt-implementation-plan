/**
 * 第三方连接器配置页面
 * 管理ERP、MES、IM等第三方系统连接
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Settings, 
  Link2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit, 
  TestTube,
  Server,
  Database,
  MessageSquare,
  Mail,
  Webhook,
  Key
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// 连接器类型图标映射
const connectorIcons: Record<string, React.ReactNode> = {
  ERP: <Database className="w-5 h-5" />,
  MES: <Server className="w-5 h-5" />,
  IM: <MessageSquare className="w-5 h-5" />,
  Email: <Mail className="w-5 h-5" />,
  Webhook: <Webhook className="w-5 h-5" />,
  API: <Link2 className="w-5 h-5" />,
};

// 连接器类型描述
const connectorDescriptions: Record<string, string> = {
  ERP: "企业资源计划系统，用于采购订单提交和库存同步",
  MES: "制造执行系统，用于工单创建和生产进度回写",
  IM: "即时通讯系统，用于消息通知（飞书/企业微信/Teams）",
  Email: "邮件服务，用于发送通知和报告",
  Webhook: "Webhook回调，用于事件触发和外部系统集成",
  API: "通用API接口，用于自定义集成",
};

// 模拟连接器数据
const mockConnectors = [
  {
    id: 1,
    connectorCode: "ERP_TIANSI",
    connectorName: "天思ERP",
    connectorType: "ERP" as const,
    isEnabled: true,
    lastTestedAt: "2024-01-15T10:30:00Z",
    lastTestResult: "Success" as const,
    config: JSON.stringify({
      baseUrl: "https://erp.example.com/api",
      version: "v2",
      timeout: 30000,
    }),
  },
  {
    id: 2,
    connectorCode: "MES_INTERNAL",
    connectorName: "内部MES系统",
    connectorType: "MES" as const,
    isEnabled: true,
    lastTestedAt: "2024-01-15T09:00:00Z",
    lastTestResult: "Success" as const,
    config: JSON.stringify({
      baseUrl: "https://mes.example.com/api",
      syncInterval: 300,
    }),
  },
  {
    id: 3,
    connectorCode: "IM_FEISHU",
    connectorName: "飞书通知",
    connectorType: "IM" as const,
    isEnabled: false,
    lastTestedAt: null,
    lastTestResult: "NotTested" as const,
    config: JSON.stringify({
      webhookUrl: "",
    }),
  },
];

interface ConnectorFormData {
  connectorCode: string;
  connectorName: string;
  connectorType: string;
  config: string;
}

export default function ConnectorConfig() {
  const { user } = useAuth();
  const [connectors, setConnectors] = useState(mockConnectors);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingConnector, setEditingConnector] = useState<typeof mockConnectors[0] | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ConnectorFormData>({
    connectorCode: "",
    connectorName: "",
    connectorType: "ERP",
    config: "{}",
  });

  // 测试连接
  const handleTestConnection = async (id: number) => {
    setTestingId(id);
    // 模拟测试延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setConnectors(prev => prev.map(c =>
      c.id === id
        ? { ...c, lastTestedAt: new Date().toISOString(), lastTestResult: "Success" as const }
        : c
    ) as any);
    setTestingId(null);
    toast.success("连接测试成功");
  };

  // 切换启用状态
  const handleToggleEnabled = (id: number, enabled: boolean) => {
    setConnectors(prev => prev.map(c => 
      c.id === id ? { ...c, isEnabled: enabled } : c
    ));
    toast.success(enabled ? "连接器已启用" : "连接器已禁用");
  };

  // 删除连接器
  const handleDelete = (id: number) => {
    setConnectors(prev => prev.filter(c => c.id !== id));
    toast.success("连接器已删除");
  };

  // 保存连接器
  const handleSave = () => {
    if (editingConnector) {
      setConnectors(prev => prev.map(c =>
        c.id === editingConnector.id
          ? { ...c, ...formData, connectorType: formData.connectorType as typeof c.connectorType }
          : c
      ) as any);
      toast.success("连接器已更新");
    } else {
      const newConnector = {
        id: Math.max(...connectors.map(c => c.id)) + 1,
        ...formData,
        connectorType: formData.connectorType as typeof mockConnectors[0]["connectorType"],
        isEnabled: false,
        lastTestedAt: null,
        lastTestResult: "NotTested" as const,
      };
      setConnectors(prev => [...prev, newConnector] as any);
      toast.success("连接器已创建");
    }
    setIsAddDialogOpen(false);
    setEditingConnector(null);
    setFormData({ connectorCode: "", connectorName: "", connectorType: "ERP", config: "{}" });
  };

  // 打开编辑对话框
  const openEditDialog = (connector: typeof mockConnectors[0]) => {
    setEditingConnector(connector);
    setFormData({
      connectorCode: connector.connectorCode,
      connectorName: connector.connectorName,
      connectorType: connector.connectorType,
      config: connector.config,
    });
    setIsAddDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Settings}
          title="第三方连接器配置"
          description="管理ERP、MES、IM等第三方系统连接，所有敏感信息通过环境变量管理"
          actions={
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingConnector(null);
                  setFormData({ connectorCode: "", connectorName: "", connectorType: "ERP", config: "{}" });
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加连接器
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingConnector ? "编辑连接器" : "添加连接器"}</DialogTitle>
                <DialogDescription>
                  配置第三方系统连接信息。敏感信息（如API密钥）请通过环境变量配置。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="connectorCode">连接器代码</Label>
                    <Input
                      id="connectorCode"
                      placeholder="ERP_TIANSI"
                      value={formData.connectorCode}
                      onChange={e => setFormData(prev => ({ ...prev, connectorCode: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="connectorName">连接器名称</Label>
                    <Input
                      id="connectorName"
                      placeholder="天思ERP"
                      value={formData.connectorName}
                      onChange={e => setFormData(prev => ({ ...prev, connectorName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connectorType">连接器类型</Label>
                  <Select
                    value={formData.connectorType}
                    onValueChange={value => setFormData(prev => ({ ...prev, connectorType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ERP">ERP - 企业资源计划</SelectItem>
                      <SelectItem value="MES">MES - 制造执行系统</SelectItem>
                      <SelectItem value="IM">IM - 即时通讯</SelectItem>
                      <SelectItem value="Email">Email - 邮件服务</SelectItem>
                      <SelectItem value="Webhook">Webhook - 回调接口</SelectItem>
                      <SelectItem value="API">API - 通用接口</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="config">配置信息 (JSON)</Label>
                  <Textarea
                    id="config"
                    placeholder='{"baseUrl": "https://api.example.com", "timeout": 30000}'
                    className="font-mono text-sm h-32"
                    value={formData.config}
                    onChange={e => setFormData(prev => ({ ...prev, config: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    <Key className="w-3 h-3 inline mr-1" />
                    敏感信息请使用环境变量引用，如 {"${ERP_API_KEY}"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSave}>
                  {editingConnector ? "保存更改" : "创建连接器"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          }
        />

        {/* 连接器类型说明 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(connectorDescriptions).map(([type, desc]) => (
            <Card key={type} className="bg-card/50">
              <CardContent className="p-4 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 text-primary">
                  {connectorIcons[type]}
                </div>
                <h3 className="font-medium text-sm">{type}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 连接器列表 */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="enabled">已启用</TabsTrigger>
            <TabsTrigger value="disabled">已禁用</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {connectors.map(connector => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                onTest={() => handleTestConnection(connector.id)}
                onToggle={(enabled) => handleToggleEnabled(connector.id, enabled)}
                onEdit={() => openEditDialog(connector)}
                onDelete={() => handleDelete(connector.id)}
                isTesting={testingId === connector.id}
              />
            ))}
          </TabsContent>

          <TabsContent value="enabled" className="space-y-4">
            {connectors.filter(c => c.isEnabled).map(connector => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                onTest={() => handleTestConnection(connector.id)}
                onToggle={(enabled) => handleToggleEnabled(connector.id, enabled)}
                onEdit={() => openEditDialog(connector)}
                onDelete={() => handleDelete(connector.id)}
                isTesting={testingId === connector.id}
              />
            ))}
          </TabsContent>

          <TabsContent value="disabled" className="space-y-4">
            {connectors.filter(c => !c.isEnabled).map(connector => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                onTest={() => handleTestConnection(connector.id)}
                onToggle={(enabled) => handleToggleEnabled(connector.id, enabled)}
                onEdit={() => openEditDialog(connector)}
                onDelete={() => handleDelete(connector.id)}
                isTesting={testingId === connector.id}
              />
            ))}
          </TabsContent>
        </Tabs>

        {/* 环境变量提示 */}
        <Card className="mt-8 border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-amber-600 flex items-center gap-2">
              <Key className="w-5 h-5" />
              敏感信息管理
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              所有API密钥、Token等敏感信息应通过环境变量管理，不要在配置JSON中直接填写。
            </p>
            <p>推荐的环境变量命名规范：</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><code className="bg-muted px-1 rounded">ERP_API_KEY</code> - ERP系统API密钥</li>
              <li><code className="bg-muted px-1 rounded">MES_API_KEY</code> - MES系统API密钥</li>
              <li><code className="bg-muted px-1 rounded">FEISHU_WEBHOOK_URL</code> - 飞书Webhook地址</li>
              <li><code className="bg-muted px-1 rounded">WECHAT_WORK_WEBHOOK_URL</code> - 企业微信Webhook地址</li>
              <li><code className="bg-muted px-1 rounded">TEAMS_WEBHOOK_URL</code> - Teams Webhook地址</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

// 连接器卡片组件
function ConnectorCard({
  connector,
  onTest,
  onToggle,
  onEdit,
  onDelete,
  isTesting,
}: {
  connector: typeof mockConnectors[0];
  onTest: () => void;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  isTesting: boolean;
}) {
  return (
    <Card className={connector.isEnabled ? "" : "opacity-60"}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              connector.isEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {connectorIcons[connector.connectorType]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{connector.connectorName}</h3>
                <Badge variant="outline">{connector.connectorType}</Badge>
                {connector.lastTestResult === "Success" && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    已连接
                  </Badge>
                )}
                {(connector.lastTestResult as any) === "Failed" && (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    连接失败
                  </Badge>
                )}
                {connector.lastTestResult === "NotTested" && (
                  <Badge variant="secondary">未测试</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                代码: {connector.connectorCode}
                {connector.lastTestedAt && (
                  <span className="ml-4">
                    最后测试: {new Date(connector.lastTestedAt).toLocaleString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor={`enabled-${connector.id}`} className="text-sm">
                启用
              </Label>
              <Switch
                id={`enabled-${connector.id}`}
                checked={connector.isEnabled}
                onCheckedChange={onToggle}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onTest}
              disabled={isTesting}
            >
              {isTesting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4" />
              )}
              <span className="ml-2">测试</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
