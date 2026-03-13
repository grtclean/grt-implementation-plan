/**
 * 第三方连接器配置页面
 * 管理ERP、MES、IM等第三方系统连接
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
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
import { useLanguage } from "@/contexts/LanguageContext";

// 连接器类型图标映射
const connectorIcons: Record<string, React.ReactNode> = {
  ERP: <Database className="w-5 h-5" />,
  MES: <Server className="w-5 h-5" />,
  IM: <MessageSquare className="w-5 h-5" />,
  Email: <Mail className="w-5 h-5" />,
  Webhook: <Webhook className="w-5 h-5" />,
  API: <Link2 className="w-5 h-5" />,
};

// 连接器类型描述 (i18n key references)
const connectorDescriptionKeys: Record<string, string> = {
  ERP: "projects.pos.connector.descErp",
  MES: "projects.pos.connector.descMes",
  IM: "projects.pos.connector.descIm",
  Email: "projects.pos.connector.descEmail",
  Webhook: "projects.pos.connector.descWebhook",
  API: "projects.pos.connector.descApi",
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
  const { t } = useLanguage();
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
    toast.success(t("projects.pos.connector.testSuccess"));
  };

  // 切换启用状态
  const handleToggleEnabled = (id: number, enabled: boolean) => {
    setConnectors(prev => prev.map(c => 
      c.id === id ? { ...c, isEnabled: enabled } : c
    ));
    toast.success(enabled ? t("projects.pos.connector.connectorEnabled") : t("projects.pos.connector.connectorDisabled"));
  };

  // 删除连接器
  const handleDelete = (id: number) => {
    setConnectors(prev => prev.filter(c => c.id !== id));
    toast.success(t("projects.pos.connector.connectorDeleted"));
  };

  // 保存连接器
  const handleSave = () => {
    if (editingConnector) {
      setConnectors(prev => prev.map(c =>
        c.id === editingConnector.id
          ? { ...c, ...formData, connectorType: formData.connectorType as typeof c.connectorType }
          : c
      ) as any);
      toast.success(t("projects.pos.connector.connectorUpdated"));
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
      toast.success(t("projects.pos.connector.connectorCreated"));
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
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Settings}
          title={t("projects.pos.connector.title")}
          description={t("projects.pos.connector.description")}
          actions={
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingConnector(null);
                  setFormData({ connectorCode: "", connectorName: "", connectorType: "ERP", config: "{}" });
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("projects.pos.connector.addConnector")}
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingConnector ? t("projects.pos.connector.editConnector") : t("projects.pos.connector.addConnector")}</DialogTitle>
                <DialogDescription>
                  {t("projects.pos.connector.dialogDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="connectorCode">{t("projects.pos.connector.connectorCode")}</Label>
                    <Input
                      id="connectorCode"
                      placeholder="ERP_TIANSI"
                      value={formData.connectorCode}
                      onChange={e => setFormData(prev => ({ ...prev, connectorCode: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="connectorName">{t("projects.pos.connector.connectorName")}</Label>
                    <Input
                      id="connectorName"
                      placeholder="天思ERP"
                      value={formData.connectorName}
                      onChange={e => setFormData(prev => ({ ...prev, connectorName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connectorType">{t("projects.pos.connector.connectorType")}</Label>
                  <Select
                    value={formData.connectorType}
                    onValueChange={value => setFormData(prev => ({ ...prev, connectorType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("projects.pos.connector.selectType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ERP">{t("projects.pos.connector.typeErp")}</SelectItem>
                      <SelectItem value="MES">{t("projects.pos.connector.typeMes")}</SelectItem>
                      <SelectItem value="IM">{t("projects.pos.connector.typeIm")}</SelectItem>
                      <SelectItem value="Email">{t("projects.pos.connector.typeEmail")}</SelectItem>
                      <SelectItem value="Webhook">{t("projects.pos.connector.typeWebhook")}</SelectItem>
                      <SelectItem value="API">{t("projects.pos.connector.typeApi")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="config">{t("projects.pos.connector.configJson")}</Label>
                  <Textarea
                    id="config"
                    placeholder='{"baseUrl": "https://api.example.com", "timeout": 30000}'
                    className="font-mono text-sm h-32"
                    value={formData.config}
                    onChange={e => setFormData(prev => ({ ...prev, config: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    <Key className="w-3 h-3 inline mr-1" />
                    {t("projects.pos.connector.envVarHint")}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  {t("projects.pos.connector.cancel")}
                </Button>
                <Button onClick={handleSave}>
                  {editingConnector ? t("projects.pos.connector.saveChanges") : t("projects.pos.connector.createConnector")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          }
        />

        {/* 连接器类型说明 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(connectorDescriptionKeys).map(([type, descKey]) => (
            <Card key={type} className="bg-card/50">
              <CardContent className="p-4 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 text-primary">
                  {connectorIcons[type]}
                </div>
                <h3 className="font-medium text-sm">{type}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t(descKey)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 连接器列表 */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">{t("projects.pos.connector.all")}</TabsTrigger>
            <TabsTrigger value="enabled">{t("projects.pos.connector.enabled")}</TabsTrigger>
            <TabsTrigger value="disabled">{t("projects.pos.connector.disabled")}</TabsTrigger>
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
              {t("projects.pos.connector.sensitiveInfoTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              {t("projects.pos.connector.sensitiveInfoDesc")}
            </p>
            <p>{t("projects.pos.connector.envVarNaming")}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><code className="bg-muted px-1 rounded">ERP_API_KEY</code> - {t("projects.pos.connector.envErpKey")}</li>
              <li><code className="bg-muted px-1 rounded">MES_API_KEY</code> - {t("projects.pos.connector.envMesKey")}</li>
              <li><code className="bg-muted px-1 rounded">FEISHU_WEBHOOK_URL</code> - {t("projects.pos.connector.envFeishuUrl")}</li>
              <li><code className="bg-muted px-1 rounded">WECHAT_WORK_WEBHOOK_URL</code> - {t("projects.pos.connector.envWechatUrl")}</li>
              <li><code className="bg-muted px-1 rounded">TEAMS_WEBHOOK_URL</code> - {t("projects.pos.connector.envTeamsUrl")}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
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
  const { t } = useLanguage();
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
                    {t("projects.pos.connector.connected")}
                  </Badge>
                )}
                {(connector.lastTestResult as any) === "Failed" && (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    {t("projects.pos.connector.connectionFailed")}
                  </Badge>
                )}
                {connector.lastTestResult === "NotTested" && (
                  <Badge variant="secondary">{t("projects.pos.connector.notTested")}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t("projects.pos.connector.code")}: {connector.connectorCode}
                {connector.lastTestedAt && (
                  <span className="ml-4">
                    {t("projects.pos.connector.lastTest")}: {new Date(connector.lastTestedAt).toLocaleString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor={`enabled-${connector.id}`} className="text-sm">
                {t("projects.pos.connector.enable")}
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
              <span className="ml-2">{t("projects.pos.connector.test")}</span>
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
