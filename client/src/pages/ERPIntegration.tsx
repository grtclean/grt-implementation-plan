/**
 * ERP集成管理页面
 */
import { useState } from 'react';
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, AlertCircle, RefreshCw, Settings, Database, Clock } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/grt';

export default function ERPIntegration() {
  const { t, tpl } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('status');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [companyId, setCompanyId] = useState('');

  // 获取集成状态
  const { data: statusData, refetch: refetchStatus } = trpc.tiansiERP.getIntegrationStatus.useQuery();

  // 配置连接 — 天思ERP使用MSSQL直连，配置通过环境变量管理
  const configMutation = trpc.tiansiERP.testConnection.useMutation({
    onSuccess: () => {
      toast({ title: t("supply.erp.configSuccess"), description: t("supply.erp.configSaved") });
      refetchStatus();
    },
    onError: (error: { message: string }) => {
      toast({ title: t("supply.erp.configFailed"), description: error.message, variant: 'destructive' });
    },
  });

  const testMutation = trpc.tiansiERP.testConnection.useMutation({
    onSuccess: () => {
      toast({ title: t("supply.erp.connectSuccess"), description: t("supply.erp.connectTestPassed") });
      refetchStatus();
    },
    onError: (error: { message: string }) => {
      toast({ title: t("supply.erp.connectFailed"), description: error.message, variant: 'destructive' });
    },
  });

  const importMutation = trpc.tiansiERP.migrateMaterials.useMutation({
    onSuccess: (data) => {
      toast({ title: t("supply.erp.syncSuccess"), description: tpl("supply.erp.materialsSynced", { count: data?.success || 0 }) });
    },
    onError: (error: { message: string }) => {
      toast({ title: t("supply.erp.syncFailed"), description: error.message, variant: 'destructive' });
    },
  });

  const syncOrdersMutation = trpc.tiansiERP.migratePOs.useMutation({
    onSuccess: (data) => {
      toast({ title: t("supply.erp.syncSuccess"), description: tpl("supply.erp.ordersSynced", { count: data?.success || 0 }) });
    },
    onError: (error: { message: string }) => {
      toast({ title: t("supply.erp.syncFailed"), description: error.message, variant: 'destructive' });
    },
  });

  const syncInventoryMutation = trpc.tiansiERP.migrateInventory.useMutation({
    onSuccess: (data) => {
      toast({ title: t("supply.erp.syncSuccess"), description: tpl("supply.erp.inventorySynced", { count: data?.success || 0 }) });
    },
    onError: (error: { message: string }) => {
      toast({ title: t("supply.erp.syncFailed"), description: error.message, variant: 'destructive' });
    },
  });

  const handleConfigure = async () => {
    await configMutation.mutateAsync();
  };

  const handleTest = async () => {
    await testMutation.mutateAsync();
  };

  const handleImportMaterials = async () => {
    await importMutation.mutateAsync({ batchSize: 100, conflictStrategy: 'update', dryRun: false });
  };

  const handleSyncOrders = async () => {
    await syncOrdersMutation.mutateAsync({ batchSize: 200, conflictStrategy: 'update', dryRun: false });
  };

  const handleSyncInventory = async () => {
    await syncInventoryMutation.mutateAsync({ batchSize: 200, conflictStrategy: 'update', dryRun: false });
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={Database}
        title={t("supply.erp.pageTitle")}
        description={t("supply.erp.pageDesc")}
        actions={
          <Button variant="outline" className="gap-2">
            <Settings className="w-4 h-4" />
            {t("supply.erp.integrationSettings")}
          </Button>
        }
      />

      {/* 连接状态 */}
      {statusData && (
        <Alert className={statusData.connected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {statusData.connected ? (
              <span className="text-green-800">
                <CheckCircle className="inline w-4 h-4 mr-2" />
                {t("supply.erp.erpConnected")}
              </span>
            ) : (
              <span className="text-red-800">
                <AlertCircle className="inline w-4 h-4 mr-2" />
                {t("supply.erp.erpDisconnected")}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 连接状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("supply.erp.connectionStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-lg font-semibold">{statusData?.connected ? t("supply.erp.connected") : t("supply.erp.disconnected")}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tiansi ERP v3.2</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("supply.erp.lastSync")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-lg font-semibold">{(statusData as any)?.lastSyncTime || t("supply.erp.notSynced")}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("supply.erp.autoSyncHourly")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("supply.erp.syncRecords")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600" />
              <span className="text-lg font-semibold">{(statusData as any)?.totalRecords || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("supply.erp.monthlySyncCount")}</p>
          </CardContent>
        </Card>
      </div>

      {/* 选项卡 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="status">{t("supply.erp.tabConnectionStatus")}</TabsTrigger>
          <TabsTrigger value="config">{t("supply.erp.tabConfig")}</TabsTrigger>
          <TabsTrigger value="sync">{t("supply.erp.tabDataSync")}</TabsTrigger>
          <TabsTrigger value="mapping">{t("supply.erp.tabFieldMapping")}</TabsTrigger>
        </TabsList>

        {/* 连接状态标签页 */}
        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("supply.erp.integrationStatus")}</CardTitle>
              <CardDescription>{t("supply.erp.integrationStatusDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{t("supply.erp.connectionStatus")}</p>
                    <p className="text-sm text-muted-foreground">{t("supply.erp.connectionStatusDesc")}</p>
                  </div>
                  <Badge className={statusData?.connected ? 'bg-green-600' : 'bg-red-600'}>
                    {statusData?.connected ? t("supply.erp.connected") : t("supply.erp.disconnected")}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{t("supply.erp.configStatus")}</p>
                    <p className="text-sm text-muted-foreground">{t("supply.erp.configStatusDesc")}</p>
                  </div>
                  <Badge className={statusData?.configured ? 'bg-green-600' : 'bg-gray-600'}>
                    {statusData?.configured ? t("supply.erp.configured") : t("supply.erp.notConfigured")}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{t("supply.erp.autoSync")}</p>
                    <p className="text-sm text-muted-foreground">{t("supply.erp.autoSyncDesc")}</p>
                  </div>
                  <Badge className={statusData?.syncEnabled ? 'bg-green-600' : 'bg-gray-600'}>
                    {statusData?.syncEnabled ? t("supply.erp.enabled") : t("supply.erp.disabled")}
                  </Badge>
                </div>

                <Button onClick={handleTest} className="w-full" disabled={testMutation.isPending}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {testMutation.isPending ? t("supply.erp.testing") : t("supply.erp.testConnection")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 配置连接标签页 */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("supply.erp.configTitle")}</CardTitle>
              <CardDescription>{t("supply.erp.configDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="apiUrl">{t("supply.erp.apiUrl")}</Label>
                  <Input
                    id="apiUrl"
                    placeholder="https://erp.tiansi.com/api"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="companyId">{t("supply.erp.companyId")}</Label>
                  <Input
                    id="companyId"
                    placeholder={t("supply.erp.companyIdPlaceholder")}
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="apiKey">{t("supply.erp.apiKey")}</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder={t("supply.erp.apiKeyPlaceholder")}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="apiSecret">{t("supply.erp.apiSecret")}</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    placeholder={t("supply.erp.apiSecretPlaceholder")}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleConfigure} className="flex-1" disabled={configMutation.isPending}>
                    <Settings className="w-4 h-4 mr-2" />
                    {configMutation.isPending ? t("supply.erp.saving") : t("supply.erp.saveConfig")}
                  </Button>
                  <Button onClick={handleTest} variant="outline" className="flex-1" disabled={testMutation.isPending}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {testMutation.isPending ? t("supply.erp.testing") : t("supply.erp.testConnection")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据同步标签页 */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("supply.erp.tabDataSync")}</CardTitle>
              <CardDescription>{t("supply.erp.dataSyncDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{t("supply.erp.syncMaterials")}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("supply.erp.syncMaterialsDesc")}
                      </p>
                    </div>
                    <Database className="w-5 h-5 text-blue-600" />
                  </div>
                  <Button
                    onClick={handleImportMaterials}
                    className="w-full mt-4"
                    disabled={importMutation.isPending}
                  >
                    {importMutation.isPending ? t("supply.erp.syncing") : t("supply.erp.startSyncMaterials")}
                  </Button>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{t("supply.erp.syncOrders")}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("supply.erp.syncOrdersDesc")}
                      </p>
                    </div>
                    <Database className="w-5 h-5 text-green-600" />
                  </div>
                  <Button
                    onClick={handleSyncOrders}
                    className="w-full mt-4"
                    disabled={syncOrdersMutation.isPending}
                  >
                    {syncOrdersMutation.isPending ? t("supply.erp.syncing") : t("supply.erp.startSyncOrders")}
                  </Button>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{t("supply.erp.syncInventory")}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("supply.erp.syncInventoryDesc")}
                      </p>
                    </div>
                    <Database className="w-5 h-5 text-orange-600" />
                  </div>
                  <Button
                    onClick={handleSyncInventory}
                    className="w-full mt-4"
                    disabled={syncInventoryMutation.isPending}
                  >
                    {syncInventoryMutation.isPending ? t("supply.erp.syncing") : t("supply.erp.startSyncInventory")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 同步日志 */}
          <Card>
            <CardHeader>
              <CardTitle>{t("supply.erp.syncLog")}</CardTitle>
              <CardDescription>{t("supply.erp.syncLogDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("supply.erp.logTime")}</TableHead>
                    <TableHead>{t("supply.erp.logModule")}</TableHead>
                    <TableHead>{t("supply.erp.logType")}</TableHead>
                    <TableHead>{t("supply.erp.logRecordCount")}</TableHead>
                    <TableHead>{t("supply.erp.logStatus")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>2026-02-02 10:00</TableCell>
                    <TableCell>{t("supply.erp.moduleMaterials")}</TableCell>
                    <TableCell>{t("supply.erp.typeAutoSync")}</TableCell>
                    <TableCell>156</TableCell>
                    <TableCell><Badge className="bg-green-100 text-green-700">{t("supply.erp.statusSuccess")}</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>2026-02-02 09:00</TableCell>
                    <TableCell>{t("supply.erp.moduleOrders")}</TableCell>
                    <TableCell>{t("supply.erp.typeAutoSync")}</TableCell>
                    <TableCell>23</TableCell>
                    <TableCell><Badge className="bg-green-100 text-green-700">{t("supply.erp.statusSuccess")}</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 字段映射标签页 */}
        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("supply.erp.fieldMappingTitle")}</CardTitle>
              <CardDescription>{t("supply.erp.fieldMappingDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">{t("supply.erp.materialFieldMapping")}</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">material_code</span>
                      <span className="font-mono">-&gt;</span>
                      <span className="font-mono">materialCode</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">material_name</span>
                      <span className="font-mono">-&gt;</span>
                      <span className="font-mono">materialName</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">material_spec</span>
                      <span className="font-mono">-&gt;</span>
                      <span className="font-mono">specificationCode</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">unit_price</span>
                      <span className="font-mono">-&gt;</span>
                      <span className="font-mono">standardCost</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">{t("supply.erp.orderFieldMapping")}</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">po_number</span>
                      <span className="font-mono">-&gt;</span>
                      <span className="font-mono">poNumber</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">supplier_code</span>
                      <span className="font-mono">-&gt;</span>
                      <span className="font-mono">supplierCode</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">quantity</span>
                      <span className="font-mono">-&gt;</span>
                      <span className="font-mono">quantity</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
