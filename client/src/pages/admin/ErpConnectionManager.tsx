/**
 * ERP连接管理器 - SAP/Oracle/金蝶API配置和测试
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Database, CheckCircle, XCircle, RefreshCw, Settings,
  Server, Key, Globe, Clock, AlertTriangle
} from "lucide-react";

// ERP系统配置
const erpSystems = [
  { 
    id: "sap", 
    name: "SAP S/4HANA", 
    icon: "🔷",
    status: "connected",
    lastSync: "2026-01-30 15:30",
    syncCount: 1234,
    config: {
      apiUrl: "https://sap.example.com/api/v1",
      clientId: "GRT_CLIENT_001",
      apiSecret: "••••••••••••••••",
      syncInterval: 15,
      retryCount: 3,
      timeout: 30
    },
    testResult: {
      status: "success",
      timestamp: "2026-01-30 15:30:45",
      responseTime: 245,
      message: "连接成功"
    }
  },
  { 
    id: "oracle", 
    name: "Oracle ERP Cloud", 
    icon: "🔴",
    status: "disconnected",
    lastSync: "-",
    syncCount: 0,
    config: {
      apiUrl: "",
      clientId: "",
      apiSecret: "",
      syncInterval: 30,
      retryCount: 3,
      timeout: 30
    },
    testResult: null
  },
  { 
    id: "kingdee", 
    name: "金蝶云星空", 
    icon: "🟡",
    status: "error",
    lastSync: "2026-01-29 10:00",
    testResult: {
      status: "error",
      timestamp: "2026-01-30 14:15:30",
      responseTime: 0,
      message: "连接超时：无法连接到服务器"
    },
    syncCount: 567,
    config: {
      apiUrl: "https://kingdee.example.com/k3cloud",
      clientId: "GRT_KD_001",
      syncInterval: 60,
    }
  },
];

// 同步数据类型
const syncDataTypes = [
  { id: "po", name: "采购订单", enabled: true, lastSync: "15分钟前" },
  { id: "inventory", name: "库存数据", enabled: true, lastSync: "30分钟前" },
  { id: "bom", name: "BOM清单", enabled: true, lastSync: "1小时前" },
  { id: "cost", name: "成本数据", enabled: false, lastSync: "-" },
  { id: "supplier", name: "供应商信息", enabled: true, lastSync: "2小时前" },
];

export default function ErpConnectionManager() {
  const [selectedSystem, setSelectedSystem] = useState("sap");
  const [testingSystem, setTestingSystem] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);
  const [errorLogs, setErrorLogs] = useState([
    {
      id: 1,
      system: "kingdee",
      timestamp: "2026-01-30 14:15:30",
      error: "连接超时",
      details: "无法连接到服务器：https://kingdee.example.com/api/v1",
      severity: "error"
    },
    {
      id: 2,
      system: "sap",
      timestamp: "2026-01-30 12:00:00",
      error: "数据同步失败",
      details: "部分记录同步失败，已重试3次",
      severity: "warning"
    }
  ]);
  const [activeTab, setActiveTab] = useState("sap");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    // 模拟API测试
    await new Promise(resolve => setTimeout(resolve, 2000));
    setTestResult(Math.random() > 0.3 ? "success" : "error");
    setTesting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" />已连接</Badge>;
      case "disconnected":
        return <Badge className="bg-gray-500/20 text-gray-400"><XCircle className="w-3 h-3 mr-1" />未连接</Badge>;
      case "error":
        return <Badge className="bg-red-500/20 text-red-400"><AlertTriangle className="w-3 h-3 mr-1" />连接错误</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            ERP连接管理
          </h1>
          <p className="text-muted-foreground mt-1">配置和管理SAP、Oracle、金蝶等ERP系统的API连接</p>
        </div>
      </div>

      {/* ERP系统状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {erpSystems.map((erp) => (
          <Card key={erp.id} className={`cursor-pointer transition-all ${activeTab === erp.id ? "ring-2 ring-primary" : ""}`} onClick={() => setActiveTab(erp.id)}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{erp.icon}</span>
                  <span className="font-medium">{erp.name}</span>
                </div>
                {getStatusBadge(erp.status)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">最后同步</p>
                  <p className="font-medium">{erp.lastSync}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">同步次数</p>
                  <p className="font-medium">{erp.syncCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 详细配置 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="sap">SAP S/4HANA</TabsTrigger>
          <TabsTrigger value="oracle">Oracle ERP</TabsTrigger>
          <TabsTrigger value="kingdee">金蝶云星空</TabsTrigger>
        </TabsList>

        {erpSystems.map((erp) => (
          <TabsContent key={erp.id} value={erp.id} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 连接配置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    连接配置
                  </CardTitle>
                  <CardDescription>配置{erp.name}的API连接参数</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />API地址
                    </Label>
                    <Input 
                      placeholder="https://api.example.com/v1"
                      defaultValue={erp.config.apiUrl}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Key className="w-4 h-4" />客户端ID
                    </Label>
                    <Input 
                      placeholder="CLIENT_ID"
                      defaultValue={erp.config.clientId}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Key className="w-4 h-4" />API密钥
                    </Label>
                    <Input 
                      type="password"
                      placeholder="••••••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />同步间隔（分钟）
                    </Label>
                    <Input 
                      type="number"
                      defaultValue={erp.config.syncInterval}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleTestConnection} disabled={testing} className="flex-1">
                      {testing ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />测试中...</>
                      ) : (
                        <><Server className="w-4 h-4 mr-2" />测试连接</>
                      )}
                    </Button>
                    <Button variant="outline" className="flex-1">保存配置</Button>
                  </div>
                  {testResult && (
                    <div className={`p-3 rounded-lg ${testResult === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {testResult === "success" ? (
                        <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4" />连接测试成功！</p>
                      ) : (
                        <p className="flex items-center gap-2"><XCircle className="w-4 h-4" />连接测试失败，请检查配置</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 数据同步配置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    数据同步
                  </CardTitle>
                  <CardDescription>选择需要同步的数据类型</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {syncDataTypes.map((dataType) => (
                      <div key={dataType.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Switch defaultChecked={dataType.enabled} />
                          <div>
                            <p className="font-medium">{dataType.name}</p>
                            <p className="text-xs text-muted-foreground">最后同步: {dataType.lastSync}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-4">
                    <RefreshCw className="w-4 h-4 mr-2" />立即同步所有数据
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
