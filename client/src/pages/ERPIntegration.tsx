/**
 * ERP集成管理页面
 */
import { useState } from 'react';
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
import Layout from '@/components/Layout';
import { PageHeader } from '@/components/grt';

export default function ERPIntegration() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('status');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [companyId, setCompanyId] = useState('');

  // 获取集成状态
  const { data: statusData, refetch: refetchStatus } = trpc.tiansiERP.getIntegrationStatus.useQuery();

  // 配置连接
  const configMutation = trpc.tiansiERP.configureConnection.useMutation({
    onSuccess: () => {
      toast({ title: '配置成功', description: 'ERP连接配置已保存' });
      refetchStatus();
    },
    onError: (error) => {
      toast({ title: '配置失败', description: error.message, variant: 'destructive' });
    },
  });

  const testMutation = trpc.tiansiERP.testConnection.useMutation({
    onSuccess: () => {
      toast({ title: '连接成功', description: 'ERP连接测试通过' });
      refetchStatus();
    },
    onError: (error) => {
      toast({ title: '连接失败', description: error.message, variant: 'destructive' });
    },
  });

  const importMutation = trpc.tiansiERP.importMaterials.useMutation({
    onSuccess: (data) => {
      toast({ title: '同步成功', description: `成功同步 ${(data as any)?.syncedCount || 0} 条物料数据` });
    },
    onError: (error) => {
      toast({ title: '同步失败', description: error.message, variant: 'destructive' });
    },
  });

  const syncOrdersMutation = trpc.tiansiERP.syncPurchaseOrders.useMutation({
    onSuccess: (data) => {
      toast({ title: '同步成功', description: `成功同步 ${(data as any)?.syncedCount || 0} 条订单数据` });
    },
    onError: (error) => {
      toast({ title: '同步失败', description: error.message, variant: 'destructive' });
    },
  });

  const syncInventoryMutation = trpc.tiansiERP.syncInventory.useMutation({
    onSuccess: (data) => {
      toast({ title: '同步成功', description: `成功同步 ${(data as any)?.syncedCount || 0} 条库存数据` });
    },
    onError: (error) => {
      toast({ title: '同步失败', description: error.message, variant: 'destructive' });
    },
  });

  const handleConfigure = async () => {
    await configMutation.mutateAsync({
      apiUrl,
      apiKey,
      apiSecret,
      companyId,
      syncInterval: 30,
      isEnabled: true,
    });
  };

  const handleTest = async () => {
    await testMutation.mutateAsync();
  };

  const handleImportMaterials = async () => {
    await importMutation.mutateAsync({ limit: 100 });
  };

  const handleSyncOrders = async () => {
    await syncOrdersMutation.mutateAsync();
  };

  const handleSyncInventory = async () => {
    await syncInventoryMutation.mutateAsync();
  };

  return (
    <Layout>
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        icon={Database}
        title="ERP集成管理"
        description="配置和管理天思ERP系统集成"
        actions={
          <Button variant="outline" className="gap-2">
            <Settings className="w-4 h-4" />
            集成设置
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
                天思ERP连接正常
              </span>
            ) : (
              <span className="text-red-800">
                <AlertCircle className="inline w-4 h-4 mr-2" />
                天思ERP连接断开
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 连接状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">连接状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-lg font-semibold">{statusData?.connected ? '已连接' : '未连接'}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">天思ERP v3.2</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">上次同步</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-lg font-semibold">{(statusData as any)?.lastSyncTime || '未同步'}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">自动同步：每小时</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">同步记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600" />
              <span className="text-lg font-semibold">{(statusData as any)?.totalRecords || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">本月同步记录数</p>
          </CardContent>
        </Card>
      </div>

      {/* 选项卡 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="status">连接状态</TabsTrigger>
          <TabsTrigger value="config">配置连接</TabsTrigger>
          <TabsTrigger value="sync">数据同步</TabsTrigger>
          <TabsTrigger value="mapping">字段映射</TabsTrigger>
        </TabsList>

        {/* 连接状态标签页 */}
        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>集成状态</CardTitle>
              <CardDescription>查看天思ERP集成的当前状态</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">连接状态</p>
                    <p className="text-sm text-muted-foreground">系统与天思ERP的连接状态</p>
                  </div>
                  <Badge className={statusData?.connected ? 'bg-green-600' : 'bg-red-600'}>
                    {statusData?.connected ? '已连接' : '未连接'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">配置状态</p>
                    <p className="text-sm text-muted-foreground">集成配置是否已完成</p>
                  </div>
                  <Badge className={statusData?.configured ? 'bg-green-600' : 'bg-gray-600'}>
                    {statusData?.configured ? '已配置' : '未配置'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">自动同步</p>
                    <p className="text-sm text-muted-foreground">定时同步是否启用</p>
                  </div>
                  <Badge className={statusData?.syncEnabled ? 'bg-green-600' : 'bg-gray-600'}>
                    {statusData?.syncEnabled ? '已启用' : '已禁用'}
                  </Badge>
                </div>

                <Button onClick={handleTest} className="w-full" disabled={testMutation.isPending}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {testMutation.isPending ? '测试中...' : '测试连接'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 配置连接标签页 */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>配置天思ERP连接</CardTitle>
              <CardDescription>输入天思ERP系统的API配置信息</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="apiUrl">API地址</Label>
                  <Input
                    id="apiUrl"
                    placeholder="https://erp.tiansi.com/api"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="companyId">公司ID</Label>
                  <Input
                    id="companyId"
                    placeholder="输入天思ERP中的公司ID"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="apiKey">API密钥</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="输入API密钥"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="apiSecret">API密钥（Secret）</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    placeholder="输入API密钥（Secret）"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleConfigure} className="flex-1" disabled={configMutation.isPending}>
                    <Settings className="w-4 h-4 mr-2" />
                    {configMutation.isPending ? '保存中...' : '保存配置'}
                  </Button>
                  <Button onClick={handleTest} variant="outline" className="flex-1" disabled={testMutation.isPending}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {testMutation.isPending ? '测试中...' : '测试连接'}
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
              <CardTitle>数据同步</CardTitle>
              <CardDescription>从天思ERP同步数据到GRT系统</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">物料数据同步</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        从天思ERP导入物料主数据
                      </p>
                    </div>
                    <Database className="w-5 h-5 text-blue-600" />
                  </div>
                  <Button 
                    onClick={handleImportMaterials} 
                    className="w-full mt-4"
                    disabled={importMutation.isPending}
                  >
                    {importMutation.isPending ? '同步中...' : '开始同步物料'}
                  </Button>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">采购订单同步</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        同步天思ERP中的采购订单
                      </p>
                    </div>
                    <Database className="w-5 h-5 text-green-600" />
                  </div>
                  <Button 
                    onClick={handleSyncOrders} 
                    className="w-full mt-4"
                    disabled={syncOrdersMutation.isPending}
                  >
                    {syncOrdersMutation.isPending ? '同步中...' : '开始同步订单'}
                  </Button>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">库存数据同步</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        实时同步天思ERP中的库存数据
                      </p>
                    </div>
                    <Database className="w-5 h-5 text-orange-600" />
                  </div>
                  <Button 
                    onClick={handleSyncInventory} 
                    className="w-full mt-4"
                    disabled={syncInventoryMutation.isPending}
                  >
                    {syncInventoryMutation.isPending ? '同步中...' : '开始同步库存'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 同步日志 */}
          <Card>
            <CardHeader>
              <CardTitle>同步日志</CardTitle>
              <CardDescription>查看最近的数据同步记录</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>模块</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>记录数</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>2026-02-02 10:00</TableCell>
                    <TableCell>物料主数据</TableCell>
                    <TableCell>自动同步</TableCell>
                    <TableCell>156</TableCell>
                    <TableCell><Badge className="bg-green-100 text-green-700">成功</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>2026-02-02 09:00</TableCell>
                    <TableCell>采购订单</TableCell>
                    <TableCell>自动同步</TableCell>
                    <TableCell>23</TableCell>
                    <TableCell><Badge className="bg-green-100 text-green-700">成功</Badge></TableCell>
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
              <CardTitle>字段映射配置</CardTitle>
              <CardDescription>查看天思ERP字段与GRT系统字段的映射关系</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">物料字段映射</h3>
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
                  <h3 className="font-semibold mb-3">采购订单字段映射</h3>
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
    </Layout>
  );
}
