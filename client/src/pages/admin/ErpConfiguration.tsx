/**
 * ERP配置管理页面
 * 支持SAP/Oracle/金蝶等ERP系统的连接配置和数据同步
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { PageHeader } from "@/components/grt";
import { Database, RefreshCw, Settings, Plus, TestTube, History, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

export default function ErpConfiguration() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<number | null>(null);
  const [newConnection, setNewConnection] = useState({
    name: "",
    erpType: "Custom" as "SAP" | "Oracle" | "Kingdee" | "TianSi" | "Custom",
    connectionUrl: "",
    host: "",
    port: "1433",
    username: "",
    password: "",
    database: ""
  });

  // 获取ERP连接列表
  const { data: connections, isLoading, refetch } = trpc.gemini.erpConnection.connections.list.useQuery();
  
  // 获取同步日志
  const { data: syncLogs } = trpc.gemini.erpConnection.syncLogs.list.useQuery(
    { connectionId: selectedConnection || undefined },
    { enabled: !!selectedConnection }
  );

  // 创建连接
  const createMutation = trpc.gemini.erpConnection.connections.create.useMutation({
    onSuccess: () => {
      toast.success("ERP连接创建成功");
      setIsAddDialogOpen(false);
      refetch();
      setNewConnection({ name: "", erpType: "Custom", connectionUrl: "", host: "", port: "1433", username: "", password: "", database: "" });
    },
    onError: (error) => toast.error(`创建失败: ${error.message}`)
  });

  // 测试连接
  const testMutation = trpc.gemini.erpConnection.connections.testConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    }
  });

  // 同步数据
  const syncMutation = trpc.gemini.erpConnection.connections.sync.useMutation({
    onSuccess: (result) => {
      toast.success(`同步完成，共同步 ${result.recordsSynced} 条记录`);
      refetch();
    },
    onError: (error) => toast.error(`同步失败: ${error.message}`)
  });

  // 更新连接状态
  const updateMutation = trpc.gemini.erpConnection.connections.update.useMutation({
    onSuccess: () => {
      toast.success("连接状态已更新");
      refetch();
    }
  });

  const handleCreateConnection = () => {
    // Build connectionUrl from host/port for MSSQL-based ERPs (TianSi, Custom)
    const connUrl = newConnection.host
      ? `mssql://${newConnection.host}:${newConnection.port || "1433"}`
      : newConnection.connectionUrl;

    createMutation.mutate({
      name: newConnection.name,
      erpType: newConnection.erpType,
      connectionUrl: connUrl,
      authConfig: {
        host: newConnection.host || undefined,
        port: parseInt(newConnection.port || "1433"),
        username: newConnection.username,
        password: newConnection.password,
        database: newConnection.database,
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />成功</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />失败</Badge>;
      case "running":
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />运行中</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />未知</Badge>;
    }
  };

  const getErpTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      SAP: "bg-blue-500",
      Oracle: "bg-red-500",
      Kingdee: "bg-orange-500",
      Custom: "bg-gray-500"
    };
    return <Badge className={colors[type] || "bg-gray-500"}>{type}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <PageHeader
        icon={Database}
        title="ERP连接配置"
        description="配置和管理SAP、Oracle、金蝶等ERP系统的数据同步连接"
        actions={
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            添加连接
          </Button>
        }
      />
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>添加ERP连接</DialogTitle>
              <DialogDescription>配置新的ERP系统连接参数</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>连接名称</Label>
                <Input
                  placeholder="例如：SAP生产系统"
                  value={newConnection.name}
                  onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>ERP类型</Label>
                <Select
                  value={newConnection.erpType}
                  onValueChange={(value: any) => setNewConnection({ ...newConnection, erpType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TianSi">天思 ERP (MSSQL)</SelectItem>
                    <SelectItem value="SAP">SAP</SelectItem>
                    <SelectItem value="Oracle">Oracle</SelectItem>
                    <SelectItem value="Kingdee">金蝶</SelectItem>
                    <SelectItem value="Custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* MSSQL host/port fields for TianSi and Custom */}
              {(newConnection.erpType === "TianSi" || newConnection.erpType === "Custom") ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label>服务器IP地址</Label>
                    <Input
                      placeholder="例如：10.2.1.230"
                      value={newConnection.host}
                      onChange={(e) => setNewConnection({ ...newConnection, host: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>端口</Label>
                    <Input
                      placeholder="1433"
                      value={newConnection.port}
                      onChange={(e) => setNewConnection({ ...newConnection, port: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>连接地址</Label>
                  <Input
                    placeholder="例如：https://sap.company.com:8443"
                    value={newConnection.connectionUrl}
                    onChange={(e) => setNewConnection({ ...newConnection, connectionUrl: e.target.value })}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>用户名</Label>
                  <Input
                    placeholder={newConnection.erpType === "TianSi" ? "sa" : ""}
                    value={newConnection.username}
                    onChange={(e) => setNewConnection({ ...newConnection, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>密码</Label>
                  <Input
                    type="password"
                    value={newConnection.password}
                    onChange={(e) => setNewConnection({ ...newConnection, password: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>数据库名称</Label>
                <Input
                  placeholder={newConnection.erpType === "TianSi" ? "DB_GRT" : "可选"}
                  value={newConnection.database}
                  onChange={(e) => setNewConnection({ ...newConnection, database: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>取消</Button>
              <Button onClick={handleCreateConnection} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                创建连接
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* 连接列表 */}
      <div className="grid gap-4">
        {connections?.map((conn: any) => (
          <Card key={conn.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{conn.name}</CardTitle>
                  {getErpTypeBadge(conn.erp_type)}
                  {conn.is_active ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">已启用</Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-400">已禁用</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={conn.is_active}
                    onCheckedChange={(checked) => updateMutation.mutate({ id: conn.id, isActive: checked })}
                  />
                </div>
              </div>
              <CardDescription>{conn.connection_url}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {conn.last_sync_at ? (
                    <span>上次同步: {new Date(conn.last_sync_at).toLocaleString()} {getStatusBadge(conn.last_sync_status)}</span>
                  ) : (
                    <span>尚未同步</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testMutation.mutate({ id: conn.id })}
                    disabled={testMutation.isPending}
                  >
                    <TestTube className="w-4 h-4 mr-1" />
                    测试连接
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncMutation.mutate({ connectionId: conn.id, syncType: "incremental" })}
                    disabled={syncMutation.isPending}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                    增量同步
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedConnection(conn.id)}
                  >
                    <History className="w-4 h-4 mr-1" />
                    同步历史
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!connections || connections.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暂无ERP连接配置</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                添加第一个连接
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 同步历史对话框 */}
      {selectedConnection && (
        <Dialog open={!!selectedConnection} onOpenChange={() => setSelectedConnection(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>同步历史记录</DialogTitle>
              <DialogDescription>查看该ERP连接的数据同步历史</DialogDescription>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>同步类型</TableHead>
                  <TableHead>实体类型</TableHead>
                  <TableHead>同步记录</TableHead>
                  <TableHead>新增/更新</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>开始时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="outline">{log.sync_type}</Badge>
                    </TableCell>
                    <TableCell>{log.entity_type || "-"}</TableCell>
                    <TableCell>{log.records_synced}</TableCell>
                    <TableCell>{log.records_created}/{log.records_updated}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>{new Date(log.started_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {(!syncLogs || syncLogs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      暂无同步记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
