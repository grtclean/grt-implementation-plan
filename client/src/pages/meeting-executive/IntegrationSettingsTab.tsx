import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plug, Plus, RefreshCw, Trash2, Settings, Clock, CheckCircle, XCircle, Activity, Save } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function IntegrationSettingsTab() {
  // Integration form
  const [intName, setIntName] = useState("");
  const [intType, setIntType] = useState("calendar");
  const [intProvider, setIntProvider] = useState("outlook");
  const [intDirection, setIntDirection] = useState("bidirectional");
  const [intFrequency, setIntFrequency] = useState("manual");

  // Setting form
  const [settingKey, setSettingKey] = useState("");
  const [settingValue, setSettingValue] = useState("");
  const [settingCategory, setSettingCategory] = useState("general");
  const [settingLabel, setSettingLabel] = useState("");

  const integrationsQuery = trpc.ime.listIntegrations.useQuery();
  const logsQuery = trpc.ime.integrationLogs.useQuery({});
  const settingsQuery = trpc.ime.systemSettings.useQuery({});

  const createIntMut = trpc.ime.createIntegration.useMutation({
    onSuccess: () => { integrationsQuery.refetch(); setIntName(""); },
  });
  const deleteIntMut = trpc.ime.deleteIntegration.useMutation({
    onSuccess: () => integrationsQuery.refetch(),
  });
  const syncMut = trpc.ime.syncIntegration.useMutation({
    onSuccess: () => { integrationsQuery.refetch(); logsQuery.refetch(); },
  });
  const updateSettingMut = trpc.ime.updateSetting.useMutation({
    onSuccess: () => { settingsQuery.refetch(); setSettingKey(""); setSettingValue(""); setSettingLabel(""); },
  });

  const integrations = (integrationsQuery.data || []) as any[];
  const logs = (logsQuery.data || []) as any[];
  const settings = (settingsQuery.data || []) as any[];

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-green-100 text-green-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "error": case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Integration Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold">{integrations.length}</div>
            <div className="text-sm text-muted-foreground">已配置集成</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold">{integrations.filter((i: any) => i.status === "active").length}</div>
            <div className="text-sm text-muted-foreground">活跃连接</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold">{logs.length}</div>
            <div className="text-sm text-muted-foreground">同步记录</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold">{settings.length}</div>
            <div className="text-sm text-muted-foreground">系统配置项</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            外部集成管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Input placeholder="集成名称" value={intName} onChange={e => setIntName(e.target.value)} />
            <Select value={intType} onValueChange={setIntType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar">日历同步</SelectItem>
                <SelectItem value="task_manager">任务管理</SelectItem>
                <SelectItem value="messaging">消息推送</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="email">邮件通知</SelectItem>
              </SelectContent>
            </Select>
            <Select value={intProvider} onValueChange={setIntProvider}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="outlook">Outlook</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="feishu">飞书</SelectItem>
                <SelectItem value="dingtalk">钉钉</SelectItem>
                <SelectItem value="slack">Slack</SelectItem>
                <SelectItem value="teams">Teams</SelectItem>
                <SelectItem value="jira">Jira</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
            <Select value={intFrequency} onValueChange={setIntFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">手动</SelectItem>
                <SelectItem value="hourly">每小时</SelectItem>
                <SelectItem value="daily">每天</SelectItem>
                <SelectItem value="realtime">实时</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => createIntMut.mutate({
                name: intName, integrationType: intType, provider: intProvider,
                syncDirection: intDirection, syncFrequency: intFrequency,
              })}
              disabled={!intName || createIntMut.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              {createIntMut.isPending ? "添加中..." : "添加集成"}
            </Button>
          </div>

          {integrations.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>提供商</TableHead>
                  <TableHead>同步频率</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>上次同步</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrations.map((int: any) => (
                  <TableRow key={int.id}>
                    <TableCell className="font-medium">{int.name}</TableCell>
                    <TableCell><Badge variant="outline">{int.integration_type}</Badge></TableCell>
                    <TableCell>{int.provider}</TableCell>
                    <TableCell>{int.sync_frequency}</TableCell>
                    <TableCell><Badge className={statusColor(int.status)}>{int.status}</Badge></TableCell>
                    <TableCell className="text-xs">
                      {int.last_sync_at ? new Date(int.last_sync_at).toLocaleString("zh-CN") : "从未"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm" variant="outline"
                          onClick={() => syncMut.mutate({ integrationId: int.id })}
                          disabled={syncMut.isPending}
                        >
                          <RefreshCw className={`h-3 w-3 ${syncMut.isPending ? "animate-spin" : ""}`} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteIntMut.mutate({ id: int.id })}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {syncMut.data && (
            <div className="p-3 bg-muted rounded text-sm">
              <div className="flex items-center gap-2">
                {(syncMut.data as any).status === "success"
                  ? <CheckCircle className="h-4 w-4 text-green-500" />
                  : <XCircle className="h-4 w-4 text-red-500" />}
                <span>同步完成: 处理 {(syncMut.data as any).recordsProcessed} 条, 成功 {(syncMut.data as any).recordsSucceeded} 条, 耗时 {(syncMut.data as any).durationMs}ms</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            同步日志
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>集成</TableHead>
                  <TableHead>操作</TableHead>
                  <TableHead>记录数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>耗时</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.slice(0, 20).map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.integration_name}</TableCell>
                    <TableCell><Badge variant="outline">{log.operation}</Badge></TableCell>
                    <TableCell>{log.records_succeeded}/{log.records_processed}</TableCell>
                    <TableCell>
                      <Badge className={statusColor(log.status)}>
                        {log.status === "success" ? "成功" : log.status === "partial" ? "部分" : "失败"}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.duration_ms}ms</TableCell>
                    <TableCell className="text-xs">{log.executed_at ? new Date(log.executed_at).toLocaleString("zh-CN") : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">暂无同步记录</p>
          )}
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            系统设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Input placeholder="设置键名" value={settingKey} onChange={e => setSettingKey(e.target.value)} />
            <Input placeholder="设置值" value={settingValue} onChange={e => setSettingValue(e.target.value)} />
            <Input placeholder="显示名称" value={settingLabel} onChange={e => setSettingLabel(e.target.value)} />
            <Select value={settingCategory} onValueChange={setSettingCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">通用</SelectItem>
                <SelectItem value="analysis">分析</SelectItem>
                <SelectItem value="notification">通知</SelectItem>
                <SelectItem value="threshold">阈值</SelectItem>
                <SelectItem value="display">显示</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => updateSettingMut.mutate({
                key: settingKey, value: settingValue, category: settingCategory, label: settingLabel || settingKey,
              })}
              disabled={!settingKey || !settingValue || updateSettingMut.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              {updateSettingMut.isPending ? "保存中..." : "保存设置"}
            </Button>
          </div>

          {settings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>键名</TableHead>
                  <TableHead>显示名</TableHead>
                  <TableHead>值</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.setting_key}</TableCell>
                    <TableCell>{s.label || s.setting_key}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{s.setting_value}</TableCell>
                    <TableCell><Badge variant="outline">{s.category}</Badge></TableCell>
                    <TableCell className="text-xs">{s.updated_at ? new Date(s.updated_at).toLocaleString("zh-CN") : ""}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => { setSettingKey(s.setting_key); setSettingValue(s.setting_value || ""); setSettingLabel(s.label || ""); setSettingCategory(s.category || "general"); }}>
                        编辑
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>暂无配置。建议初始化以下设置：</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "health_threshold", label: "健康度警戒阈值", value: "60", cat: "threshold" },
                  { key: "roi_minimum", label: "最低ROI评分", value: "50", cat: "threshold" },
                  { key: "fatigue_max", label: "最大疲劳指数", value: "0.7", cat: "threshold" },
                  { key: "analysis_auto_run", label: "自动分析", value: "true", cat: "analysis" },
                  { key: "digest_frequency", label: "摘要频率", value: "daily", cat: "notification" },
                  { key: "max_meeting_duration", label: "建议最长会议时长(分钟)", value: "90", cat: "general" },
                ].map((preset) => (
                  <Button
                    key={preset.key} variant="outline" size="sm" className="justify-start text-xs"
                    onClick={() => updateSettingMut.mutate({ key: preset.key, value: preset.value, category: preset.cat, label: preset.label })}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {preset.label} = {preset.value}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
