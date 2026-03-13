import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plug, Plus, RefreshCw, Trash2, Settings, Clock, CheckCircle, XCircle, Activity, Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

export function IntegrationSettingsTab() {
  const { t } = useLanguage();
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
            <div className="text-sm text-muted-foreground">{t("meeting.integration.configuredCount")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold">{integrations.filter((i: any) => i.status === "active").length}</div>
            <div className="text-sm text-muted-foreground">{t("meeting.integration.activeConnections")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold">{logs.length}</div>
            <div className="text-sm text-muted-foreground">{t("meeting.integration.syncRecords")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold">{settings.length}</div>
            <div className="text-sm text-muted-foreground">{t("meeting.integration.systemConfigItems")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            {t("meeting.integration.managementTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Input placeholder={t("meeting.integration.nameLabel")} value={intName} onChange={e => setIntName(e.target.value)} />
            <Select value={intType} onValueChange={setIntType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar">{t("meeting.integration.typeCalendar")}</SelectItem>
                <SelectItem value="task_manager">{t("meeting.integration.typeTaskManager")}</SelectItem>
                <SelectItem value="messaging">{t("meeting.integration.typeMessaging")}</SelectItem>
                <SelectItem value="webhook">{t("meeting.integration.typeWebhook")}</SelectItem>
                <SelectItem value="email">{t("meeting.integration.typeEmail")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={intProvider} onValueChange={setIntProvider}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="outlook">Outlook</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="feishu">{t("meeting.integration.providerFeishu")}</SelectItem>
                <SelectItem value="dingtalk">{t("meeting.integration.providerDingtalk")}</SelectItem>
                <SelectItem value="slack">Slack</SelectItem>
                <SelectItem value="teams">Teams</SelectItem>
                <SelectItem value="jira">Jira</SelectItem>
                <SelectItem value="custom">{t("meeting.integration.providerCustom")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={intFrequency} onValueChange={setIntFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">{t("meeting.integration.freqManual")}</SelectItem>
                <SelectItem value="hourly">{t("meeting.integration.freqHourly")}</SelectItem>
                <SelectItem value="daily">{t("meeting.integration.freqDaily")}</SelectItem>
                <SelectItem value="realtime">{t("meeting.integration.freqRealtime")}</SelectItem>
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
              {createIntMut.isPending ? t("meeting.integration.adding") : t("meeting.integration.addIntegration")}
            </Button>
          </div>

          {integrations.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.integration.thName")}</TableHead>
                  <TableHead>{t("meeting.integration.thType")}</TableHead>
                  <TableHead>{t("meeting.integration.thProvider")}</TableHead>
                  <TableHead>{t("meeting.integration.thSyncFreq")}</TableHead>
                  <TableHead>{t("meeting.integration.thStatus")}</TableHead>
                  <TableHead>{t("meeting.integration.thLastSync")}</TableHead>
                  <TableHead>{t("meeting.integration.thActions")}</TableHead>
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
                      {int.last_sync_at ? new Date(int.last_sync_at).toLocaleString() : t("meeting.integration.never")}
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
                <span>{t("meeting.integration.syncComplete")} {(syncMut.data as any).recordsProcessed} / {(syncMut.data as any).recordsSucceeded}, {(syncMut.data as any).durationMs}ms</span>
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
            {t("meeting.integration.syncLogsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.integration.thIntegration")}</TableHead>
                  <TableHead>{t("meeting.integration.thOperation")}</TableHead>
                  <TableHead>{t("meeting.integration.thRecordCount")}</TableHead>
                  <TableHead>{t("meeting.integration.thStatus")}</TableHead>
                  <TableHead>{t("meeting.integration.thDuration")}</TableHead>
                  <TableHead>{t("meeting.integration.thTime")}</TableHead>
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
                        {log.status === "success" ? t("meeting.integration.statusSuccess") : log.status === "partial" ? t("meeting.integration.statusPartial") : t("meeting.integration.statusFailed")}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.duration_ms}ms</TableCell>
                    <TableCell className="text-xs">{log.executed_at ? new Date(log.executed_at).toLocaleString() : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t("meeting.integration.noSyncLogs")}</p>
          )}
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t("meeting.integration.settingsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Input placeholder={t("meeting.integration.settingKey")} value={settingKey} onChange={e => setSettingKey(e.target.value)} />
            <Input placeholder={t("meeting.integration.settingValue")} value={settingValue} onChange={e => setSettingValue(e.target.value)} />
            <Input placeholder={t("meeting.integration.settingLabel")} value={settingLabel} onChange={e => setSettingLabel(e.target.value)} />
            <Select value={settingCategory} onValueChange={setSettingCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">{t("meeting.integration.catGeneral")}</SelectItem>
                <SelectItem value="analysis">{t("meeting.integration.catAnalysis")}</SelectItem>
                <SelectItem value="notification">{t("meeting.integration.catNotification")}</SelectItem>
                <SelectItem value="threshold">{t("meeting.integration.catThreshold")}</SelectItem>
                <SelectItem value="display">{t("meeting.integration.catDisplay")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => updateSettingMut.mutate({
                key: settingKey, value: settingValue, category: settingCategory, label: settingLabel || settingKey,
              })}
              disabled={!settingKey || !settingValue || updateSettingMut.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              {updateSettingMut.isPending ? t("meeting.integration.saving") : t("meeting.integration.saveSetting")}
            </Button>
          </div>

          {settings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meeting.integration.thKey")}</TableHead>
                  <TableHead>{t("meeting.integration.thDisplayName")}</TableHead>
                  <TableHead>{t("meeting.integration.thValue")}</TableHead>
                  <TableHead>{t("meeting.integration.thCategory")}</TableHead>
                  <TableHead>{t("meeting.integration.thUpdateTime")}</TableHead>
                  <TableHead>{t("meeting.integration.thActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.setting_key}</TableCell>
                    <TableCell>{s.label || s.setting_key}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{s.setting_value}</TableCell>
                    <TableCell><Badge variant="outline">{s.category}</Badge></TableCell>
                    <TableCell className="text-xs">{s.updated_at ? new Date(s.updated_at).toLocaleString() : ""}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => { setSettingKey(s.setting_key); setSettingValue(s.setting_value || ""); setSettingLabel(s.label || ""); setSettingCategory(s.category || "general"); }}>
                        {t("meeting.integration.edit")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t("meeting.integration.noSettings")}</p>
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
