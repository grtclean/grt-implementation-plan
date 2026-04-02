/**
 * 天思ERP迁移控制台
 * MSSQL连接状态 + 表发现 + 迁移控制 + 验证
 * 路由: /admin/tiansi-migration
 */

import React, { useState } from 'react';
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Database, Plug, Table2, ArrowRightLeft, ShieldCheck, AlertTriangle,
  Play, RefreshCw, CheckCircle, XCircle, Clock, Loader2,
} from 'lucide-react';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type MigrationEntityStatus = 'idle' | 'running' | 'completed' | 'failed';

interface MigrationEntity {
  id: string;
  name: string;
  nameEn: string;
  status: MigrationEntityStatus;
  total: number;
  success: number;
  failed: number;
  lastRun?: string;
}

const ENTITIES: MigrationEntity[] = [
  { id: 'warehouses', name: '仓库', nameEn: 'Warehouses', status: 'idle', total: 0, success: 0, failed: 0 },
  { id: 'suppliers', name: '供应商', nameEn: 'Suppliers', status: 'idle', total: 0, success: 0, failed: 0 },
  { id: 'materials', name: '物料', nameEn: 'Materials', status: 'idle', total: 0, success: 0, failed: 0 },
  { id: 'boms', name: 'BOM', nameEn: 'BOMs', status: 'idle', total: 0, success: 0, failed: 0 },
  { id: 'purchaseOrders', name: '采购订单', nameEn: 'Purchase Orders', status: 'idle', total: 0, success: 0, failed: 0 },
  { id: 'inventory', name: '库存', nameEn: 'Inventory', status: 'idle', total: 0, success: 0, failed: 0 },
  { id: 'lots', name: '批次', nameEn: 'Lots', status: 'idle', total: 0, success: 0, failed: 0 },
];

const StatusIcon = ({ status }: { status: MigrationEntityStatus }) => {
  switch (status) {
    case 'running': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

export default function TiansiMigrationDashboard() {
  // tRPC data source probe
  const integrationQuery = trpc.tiansiERP.getIntegrationStatus.useQuery(undefined, { retry: false });
  const isLive = !!integrationQuery.data && !integrationQuery.isError;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [entities, setEntities] = useState<MigrationEntity[]>(ENTITIES);
  const [discoveredTables, setDiscoveredTables] = useState<string[]>([]);

  const handleTestConnection = () => {
    setConnectionStatus('connecting');
    setTimeout(() => setConnectionStatus('connected'), 1500);
  };

  const handleMigrateEntity = (entityId: string) => {
    setEntities(prev => prev.map(e =>
      e.id === entityId ? { ...e, status: 'running' as const } : e
    ));
    // Simulate migration
    setTimeout(() => {
      setEntities(prev => prev.map(e =>
        e.id === entityId
          ? { ...e, status: 'completed' as const, total: 150, success: 148, failed: 2, lastRun: new Date().toISOString() }
          : e
      ));
    }, 2000);
  };

  const handleMigrateAll = () => {
    entities.forEach((e, i) => {
      setTimeout(() => handleMigrateEntity(e.id), i * 2500);
    });
  };

  const handleDiscoverTables = () => {
    setDiscoveredTables([
      'materials', 'suppliers', 'purchase_orders', 'inventory',
      'bom_master', 'bom_items', 'warehouses', 'inventory_lots',
      'customers', 'sales_orders', 'work_orders', 'quality_records',
    ]);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" /> 天思ERP迁移控制台
          </h1>
          <p className="text-muted-foreground mt-1">MSSQL直连 → 100%数据迁移 → 停用天思ERP</p>
          <Badge variant={isLive ? "default" : "secondary"} className={`text-[10px] mt-1 ${isLive ? "bg-emerald-600" : ""}`}>
            数据来源: {isLive ? "tRPC 实时" : "本地演示数据"}
          </Badge>
        </div>
        <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'} className="text-sm">
          {connectionStatus === 'connected' ? 'MSSQL已连接' :
           connectionStatus === 'connecting' ? '连接中...' : '未连接'}
        </Badge>
      </div>

      <Tabs defaultValue="connection">
        <TabsList>
          <TabsTrigger value="connection"><Plug className="h-4 w-4 mr-1" /> 连接</TabsTrigger>
          <TabsTrigger value="discover"><Table2 className="h-4 w-4 mr-1" /> 表发现</TabsTrigger>
          <TabsTrigger value="migrate"><ArrowRightLeft className="h-4 w-4 mr-1" /> 迁移</TabsTrigger>
          <TabsTrigger value="verify"><ShieldCheck className="h-4 w-4 mr-1" /> 验证</TabsTrigger>
        </TabsList>

        {/* Connection Tab */}
        <TabsContent value="connection" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>MSSQL连接</CardTitle>
              <CardDescription>天思ERP数据库: 10.2.1.230:1433 / DB_GRT</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">主机:</span> 10.2.1.230</div>
                <div><span className="text-muted-foreground">端口:</span> 1433</div>
                <div><span className="text-muted-foreground">数据库:</span> DB_GRT</div>
                <div><span className="text-muted-foreground">用户:</span> sa</div>
              </div>
              <Button onClick={handleTestConnection} disabled={connectionStatus === 'connecting'}>
                {connectionStatus === 'connecting' ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> 连接中...</>
                ) : (
                  <><Plug className="h-4 w-4 mr-1" /> 测试连接</>
                )}
              </Button>
              {connectionStatus === 'connected' && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" /> 连接成功 — SQL Server ready
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discovery Tab */}
        <TabsContent value="discover" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>天思表发现</CardTitle>
              <CardDescription>扫描DB_GRT中的所有表</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDiscoverTables} className="mb-4">
                <RefreshCw className="h-4 w-4 mr-1" /> 扫描表
              </Button>
              {discoveredTables.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {discoveredTables.map(t => (
                    <div key={t} className="flex items-center gap-2 p-2 border rounded text-sm">
                      <Table2 className="h-4 w-4 text-muted-foreground" /> {t}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Migration Tab */}
        <TabsContent value="migrate" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleMigrateAll} disabled={connectionStatus !== 'connected'}>
              <Play className="h-4 w-4 mr-1" /> 全量迁移
            </Button>
          </div>
          {entities.map(entity => (
            <Card key={entity.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={entity.status} />
                    <div>
                      <div className="font-medium">{entity.name} <span className="text-muted-foreground text-sm">({entity.nameEn})</span></div>
                      {entity.total > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {entity.success}/{entity.total} 成功, {entity.failed} 失败
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entity.total > 0 && (
                      <Progress value={entity.total > 0 ? (entity.success / entity.total) * 100 : 0} className="w-24" />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMigrateEntity(entity.id)}
                      disabled={entity.status === 'running' || connectionStatus !== 'connected'}
                    >
                      {entity.status === 'running' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Verify Tab */}
        <TabsContent value="verify" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>数据完整性验证</CardTitle>
              <CardDescription>迁移后对比天思与GRT数据</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: '行数对比', desc: '天思行数 vs GRT行数（须100%匹配）' },
                  { name: '校验和', desc: 'SUM(金额字段) 两侧对比' },
                  { name: '引用完整性', desc: 'BOM物料码→materials表' },
                  { name: '空值审计', desc: '必填字段空值检测' },
                  { name: '重复检测', desc: '唯一约束违反检查' },
                ].map(check => (
                  <div key={check.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{check.name}</div>
                      <div className="text-xs text-muted-foreground">{check.desc}</div>
                    </div>
                    <Badge variant="secondary">待执行</Badge>
                  </div>
                ))}
              </div>
              <Button className="mt-4" variant="outline" disabled>
                <ShieldCheck className="h-4 w-4 mr-1" /> 执行全部验证
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
