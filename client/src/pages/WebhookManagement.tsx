import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, StatCard } from "@/components/grt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Bell, CheckCircle2, Clock, Edit2, ExternalLink, FileText, Plus, RefreshCw, Send, Settings2, Trash2, Webhook, XCircle, Eye, Copy, Filter, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

type WebhookType = "wecom" | "dingtalk" | "feishu" | "custom";
type EventType = "meeting_reminder" | "cost_alert" | "training_notification" | "system_notification";

interface WebhookConfig {
  id: number;
  name: string;
  type: WebhookType;
  webhookUrl: string;
  description: string | null;
  triggerEvents: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
}

interface WebhookLog {
  id: number;
  webhookId: number;
  eventType: string;
  payload: string | null;
  response: string | null;
  statusCode: number | null;
  success: number;
  errorMessage: string | null;
  sentAt: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
  retryStatus: string;
}

const webhookTypeLabelKeys: Record<WebhookType, string> = {
  wecom: "admin.webhook.wecom",
  dingtalk: "admin.webhook.dingtalk",
  feishu: "admin.webhook.feishu",
  custom: "admin.webhook.custom",
};

const webhookTypeColors: Record<WebhookType, string> = {
  wecom: "bg-green-500/10 text-green-500 border-green-500/20",
  dingtalk: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  feishu: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  custom: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

const eventTypeLabelKeys: Record<EventType, string> = {
  meeting_reminder: "admin.webhook.meetingReminder",
  cost_alert: "admin.webhook.costAlert",
  training_notification: "admin.webhook.trainingNotification",
  system_notification: "admin.webhook.systemNotification",
};

// Trigger condition types
type ConditionOperator = "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "contains" | "not_contains" | "starts_with" | "ends_with" | "in";
type ConditionLogic = "AND" | "OR";

interface TriggerCondition {
  field: string;
  operator: ConditionOperator;
  value: string;
}

interface TriggerConditionGroup {
  logic: ConditionLogic;
  conditions: TriggerCondition[];
}

const conditionOperatorLabelKeys: Record<ConditionOperator, string> = {
  eq: "admin.webhook.opEq",
  ne: "admin.webhook.opNe",
  gt: "admin.webhook.opGt",
  lt: "admin.webhook.opLt",
  gte: "admin.webhook.opGte",
  lte: "admin.webhook.opLte",
  contains: "admin.webhook.opContains",
  not_contains: "admin.webhook.opNotContains",
  starts_with: "admin.webhook.opStartsWith",
  ends_with: "admin.webhook.opEndsWith",
  in: "admin.webhook.opIn",
};

const conditionFieldOptionDefs = [
  { value: "alert_level", labelKey: "admin.webhook.fieldAlertLevel", type: "select", options: ["low", "medium", "high", "critical"] },
  { value: "project_type", labelKey: "admin.webhook.fieldProjectType", type: "text" },
  { value: "cost_category", labelKey: "admin.webhook.fieldCostCategory", type: "text" },
  { value: "deviation_percent", labelKey: "admin.webhook.fieldDeviationPercent", type: "number" },
  { value: "project_name", labelKey: "admin.webhook.fieldProjectName", type: "text" },
  { value: "event_type", labelKey: "admin.webhook.fieldEventType", type: "select", options: ["meeting_reminder", "cost_alert", "training_notification", "system_notification"] },
];

export default function WebhookManagement() {
  const { t, tpl } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("configs");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [testMessage, setTestMessage] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "wecom" as WebhookType,
    webhookUrl: "",
    description: "",
    triggerEvents: [] as EventType[],
    enabled: true,
    triggerConditions: {
      logic: "AND" as ConditionLogic,
      conditions: [] as TriggerCondition[],
    },
    // Retry configuration
    maxRetries: 3,
    retryIntervalSeconds: 60,
    useExponentialBackoff: true,
  });

  // Queries
  const { data: webhooksData, isLoading: webhooksLoading, refetch: refetchWebhooks } = trpc.webhook.getAll.useQuery();
  const webhooks = (webhooksData as any)?.webhooks || webhooksData || [];
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = trpc.webhook.getLogs.useQuery(
    { webhookId: selectedWebhook?.id, limit: 50 },
    { enabled: activeTab === "logs" }
  );

  // Mutations
  const createMutation = trpc.webhook.create.useMutation({
    onSuccess: () => {
      toast.success(t("admin.webhook.createSuccess"));
      setShowNewDialog(false);
      resetForm();
      refetchWebhooks();
    },
    onError: (error) => {
      toast.error(`${t("admin.webhook.createFailed")}: ${error.message}`);
    },
  });

  const updateMutation = trpc.webhook.update.useMutation({
    onSuccess: () => {
      toast.success(t("admin.webhook.updateSuccess"));
      setShowEditDialog(false);
      setSelectedWebhook(null);
      refetchWebhooks();
    },
    onError: (error) => {
      toast.error(`${t("admin.webhook.updateFailed")}: ${error.message}`);
    },
  });

  const deleteMutation = trpc.webhook.delete.useMutation({
    onSuccess: () => {
      toast.success(t("admin.webhook.deleteSuccess"));
      refetchWebhooks();
    },
    onError: (error) => {
      toast.error(`${t("admin.webhook.deleteFailed")}: ${error.message}`);
    },
  });

  const testMutation = trpc.webhook.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t("admin.webhook.testSuccess"));
      } else {
        toast.error(`${t("admin.webhook.testFailed")}: ${(result as any).message || result.response?.message}`);
      }
      setShowTestDialog(false);
      refetchLogs();
    },
    onError: (error) => {
      toast.error(`${t("admin.webhook.testFailed")}: ${error.message}`);
    },
  });

  const toggleActiveMutation = trpc.webhook.update.useMutation({
    onSuccess: () => {
      toast.success(t("admin.webhook.statusUpdated"));
      refetchWebhooks();
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "wecom" as WebhookType,
      webhookUrl: "",
      description: "",
      triggerEvents: [],
      enabled: true,
      triggerConditions: {
        logic: "AND" as ConditionLogic,
        conditions: [],
      },
      maxRetries: 3,
      retryIntervalSeconds: 60,
      useExponentialBackoff: true,
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      name: formData.name,
      type: formData.type,
      url: formData.webhookUrl,
      description: formData.description || undefined,
      triggerEvents: formData.triggerEvents,
      enabled: formData.enabled,
      maxRetries: formData.maxRetries,
      retryIntervalSeconds: formData.retryIntervalSeconds,
      useExponentialBackoff: formData.useExponentialBackoff,
    } as any);
  };

  const handleUpdate = () => {
    if (!selectedWebhook) return;
    updateMutation.mutate({
      id: String(selectedWebhook.id),
      name: formData.name,
      type: formData.type,
      url: formData.webhookUrl,
      description: formData.description || undefined,
      triggerEvents: formData.triggerEvents,
      enabled: formData.enabled,
      maxRetries: formData.maxRetries,
      retryIntervalSeconds: formData.retryIntervalSeconds,
      useExponentialBackoff: formData.useExponentialBackoff,
    } as any);
  };

  const handleEdit = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    // Parse triggerConditions from webhook if available (stored as JSON in description or separate field)
    let parsedConditions: TriggerConditionGroup = { logic: "AND", conditions: [] };
    try {
      // Try to parse from description if it contains JSON conditions
      if (webhook.description && webhook.description.startsWith('{"logic":')) {
        parsedConditions = JSON.parse(webhook.description);
      }
    } catch (e) {
      // Keep default empty conditions
    }
    setFormData({
      name: webhook.name,
      type: webhook.type as WebhookType,
      webhookUrl: webhook.webhookUrl,
      description: webhook.description || "",
      triggerEvents: (webhook.triggerEvents || "").split(",").filter(Boolean) as EventType[],
      enabled: webhook.enabled,
      triggerConditions: parsedConditions,
      maxRetries: (webhook as any).maxRetries ?? 3,
      retryIntervalSeconds: (webhook as any).retryIntervalSeconds ?? 60,
      useExponentialBackoff: (webhook as any).useExponentialBackoff ?? true,
    });
    setShowEditDialog(true);
  };

  const handleTest = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    setShowTestDialog(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(t("admin.webhook.confirmDelete"))) {
      deleteMutation.mutate({ id: String(id) } as any);
    }
  };

  const toggleEvent = (event: EventType) => {
    setFormData(prev => ({
      ...prev,
      triggerEvents: prev.triggerEvents.includes(event)
        ? prev.triggerEvents.filter(e => e !== event)
        : [...prev.triggerEvents, event],
    }));
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("zh-CN");
  };

  return (
      <div className="space-y-6">
        <PageHeader
          icon={Webhook}
          title={t("admin.webhook.title")}
          description={t("admin.webhook.description")}
          actions={
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90" onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("admin.webhook.newWebhook")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t("admin.webhook.newWebhook")}</DialogTitle>
                  <DialogDescription>{t("admin.webhook.newWebhookDesc")}</DialogDescription>
                </DialogHeader>
                <WebhookForm
                  formData={formData}
                  setFormData={setFormData}
                  toggleEvent={toggleEvent}
                  onSubmit={handleCreate}
                  isLoading={createMutation.isPending}
                  submitLabel={t("admin.webhook.create")}
                />
              </DialogContent>
            </Dialog>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Webhook} label={t("admin.webhook.totalWebhooks")} value={webhooks?.length || 0} iconColor="text-primary" iconBg="bg-primary/10" />
          <StatCard icon={CheckCircle2} label={t("admin.webhook.enabled")} value={webhooks?.filter(w => w.enabled).length || 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={Send} label={t("admin.webhook.sentToday")} value="-" iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={AlertCircle} label={t("admin.webhook.failureCount")} value="-" iconColor="text-red-500" iconBg="bg-red-500/10" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="configs">
              <Settings2 className="w-4 h-4 mr-2" />
              {t("admin.webhook.configList")}
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="w-4 h-4 mr-2" />
              {t("admin.webhook.messageTemplates")}
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Clock className="w-4 h-4 mr-2" />
              {t("admin.webhook.sendLogs")}
            </TabsTrigger>
          </TabsList>

          {/* Configs Tab */}
          <TabsContent value="configs" className="mt-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  {t("admin.webhook.configListTitle")}
                </CardTitle>
                <CardDescription>{t("admin.webhook.configListDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {webhooksLoading ? (
                  <div className="text-center py-8 text-muted-foreground">{t("admin.webhook.loading")}</div>
                ) : webhooks && webhooks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("admin.webhook.formNameLabel")}</TableHead>
                        <TableHead>{t("admin.webhook.formTypeLabel")}</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>{t("admin.webhook.subscribeEvents")}</TableHead>
                        <TableHead>{t("admin.webhook.enabledLabel")}</TableHead>
                        <TableHead>{t("admin.webhook.actionsCol")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {webhooks.map((webhook) => (
                        <TableRow key={webhook.id}>
                          <TableCell className="font-medium">{webhook.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={webhookTypeColors[webhook.type as WebhookType]}>
                              {t(webhookTypeLabelKeys[webhook.type as WebhookType])}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            <span className="text-muted-foreground text-sm">{webhook.webhookUrl}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(webhook.triggerEvents || "").split(",").filter(Boolean).map((event) => (
                                <Badge key={event} variant="secondary" className="text-xs">
                                  {t(eventTypeLabelKeys[event as EventType]) || event}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={webhook.enabled}
                              onCheckedChange={(checked) => {
                                toggleActiveMutation.mutate({
                                  id: webhook.id,
                                  enabled: checked,
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleTest(webhook)}
                                title={t("admin.webhook.test")}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(webhook)}
                                title={t("admin.webhook.edit")}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(webhook.id)}
                                title={t("admin.webhook.deleteAction")}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("admin.webhook.noConfigs")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="mt-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      {t("admin.webhook.logsTitle")}
                    </CardTitle>
                    <CardDescription>{t("admin.webhook.logsDesc")}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedWebhook?.id?.toString() || "all"}
                      onValueChange={(value) => {
                        if (value === "all") {
                          setSelectedWebhook(null);
                        } else {
                          const webhook = webhooks?.find(w => w.id === parseInt(value));
                          setSelectedWebhook(webhook || null);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={t("admin.webhook.selectWebhookPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("admin.webhook.allWebhooksOption")}</SelectItem>
                        {webhooks?.map((webhook) => (
                          <SelectItem key={webhook.id} value={webhook.id.toString()}>
                            {webhook.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => refetchLogs()}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">{t("admin.webhook.loading")}</div>
                ) : logs && logs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("admin.webhook.timeCol")}</TableHead>
                        <TableHead>{t("admin.webhook.eventTypeCol")}</TableHead>
                        <TableHead>{t("admin.webhook.statusCodeCol")}</TableHead>
                        <TableHead>{t("admin.webhook.resultCol")}</TableHead>
                        <TableHead>{t("admin.webhook.errorMsgCol")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(log.sentAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {t(eventTypeLabelKeys[log.eventType as EventType]) || log.eventType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.statusCode && log.statusCode < 400 ? "default" : "destructive"}>
                              {log.statusCode || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.success ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                            {log.errorMessage || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("admin.webhook.noLogs")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-4">
            <TemplatesTab />
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("admin.webhook.editTitle")}</DialogTitle>
              <DialogDescription>{t("admin.webhook.editDesc")}</DialogDescription>
            </DialogHeader>
            <WebhookForm
              formData={formData}
              setFormData={setFormData}
              toggleEvent={toggleEvent}
              onSubmit={handleUpdate}
              isLoading={updateMutation.isPending}
              submitLabel={t("admin.webhook.save")}
            />
          </DialogContent>
        </Dialog>

        {/* Test Dialog */}
        <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("admin.webhook.testTitle")}</DialogTitle>
              <DialogDescription>
                {tpl("admin.webhook.testDesc", { name: selectedWebhook?.name || "" })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("admin.webhook.testMessageLabel")}</Label>
                <Textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder={t("admin.webhook.testMessagePlaceholder")}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                  {t("admin.webhook.cancel")}
                </Button>
                <Button
                  onClick={() => {
                    if (selectedWebhook) {
                      testMutation.mutate({
                        id: String(selectedWebhook.id),
                        message: testMessage,
                      } as any);
                    }
                  }}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? t("admin.webhook.sending") : t("admin.webhook.sendTest")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
}

// Webhook Form Component
function WebhookForm({
  formData,
  setFormData,
  toggleEvent,
  onSubmit,
  isLoading,
  submitLabel,
}: {
  formData: {
    name: string;
    type: WebhookType;
    webhookUrl: string;
    description: string;
    triggerEvents: EventType[];
    enabled: boolean;
    triggerConditions: TriggerConditionGroup;
    maxRetries: number;
    retryIntervalSeconds: number;
    useExponentialBackoff: boolean;
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  toggleEvent: (event: EventType) => void;
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel: string;
}) {
  const { t } = useLanguage();
  // Condition management functions
  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      triggerConditions: {
        ...prev.triggerConditions,
        conditions: [
          ...prev.triggerConditions.conditions,
          { field: "alert_level", operator: "eq" as ConditionOperator, value: "" },
        ],
      },
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      triggerConditions: {
        ...prev.triggerConditions,
        conditions: prev.triggerConditions.conditions.filter((_, i) => i !== index),
      },
    }));
  };

  const updateCondition = (index: number, field: keyof TriggerCondition, value: string) => {
    setFormData(prev => ({
      ...prev,
      triggerConditions: {
        ...prev.triggerConditions,
        conditions: prev.triggerConditions.conditions.map((c, i) =>
          i === index ? { ...c, [field]: value } : c
        ),
      },
    }));
  };

  const toggleLogic = () => {
    setFormData(prev => ({
      ...prev,
      triggerConditions: {
        ...prev.triggerConditions,
        logic: prev.triggerConditions.logic === "AND" ? "OR" : "AND",
      },
    }));
  };
  
  // Condition testing state
  const [showTestConditionDialog, setShowTestConditionDialog] = useState(false);
  const [testData, setTestData] = useState<Record<string, string>>({
    alert_level: "high",
    project_type: "development",
    cost_amount: "10000",
    event_type: "cost_alert",
  });
  const [testResult, setTestResult] = useState<{ matches: boolean; details: string[] } | null>(null);
  
  // Evaluate condition against test data
  const evaluateCondition = (condition: TriggerCondition, data: Record<string, string>): { matches: boolean; reason: string } => {
    const fieldValue = data[condition.field] || "";
    const targetValue = condition.value;
    
    let matches = false;
    let reason = "";
    
    switch (condition.operator) {
      case "eq":
        matches = fieldValue === targetValue;
        reason = `${condition.field} ("${fieldValue}") ${matches ? "=" : "≠"} "${targetValue}"`;
        break;
      case "ne":
        matches = fieldValue !== targetValue;
        reason = `${condition.field} ("${fieldValue}") ${matches ? "≠" : "="} "${targetValue}"`;
        break;
      case "gt":
        matches = parseFloat(fieldValue) > parseFloat(targetValue);
        reason = `${condition.field} (${fieldValue}) ${matches ? ">" : "≤"} ${targetValue}`;
        break;
      case "lt":
        matches = parseFloat(fieldValue) < parseFloat(targetValue);
        reason = `${condition.field} (${fieldValue}) ${matches ? "<" : "≥"} ${targetValue}`;
        break;
      case "gte":
        matches = parseFloat(fieldValue) >= parseFloat(targetValue);
        reason = `${condition.field} (${fieldValue}) ${matches ? "≥" : "<"} ${targetValue}`;
        break;
      case "lte":
        matches = parseFloat(fieldValue) <= parseFloat(targetValue);
        reason = `${condition.field} (${fieldValue}) ${matches ? "≤" : ">"} ${targetValue}`;
        break;
      case "contains":
        matches = fieldValue.includes(targetValue);
        reason = `${condition.field} ("${fieldValue}") ${matches ? t("admin.webhook.opContainsResult") : t("admin.webhook.opNotContainsResult")} "${targetValue}"`;
        break;
      case "not_contains":
        matches = !fieldValue.includes(targetValue);
        reason = `${condition.field} ("${fieldValue}") ${matches ? t("admin.webhook.opNotContainsResult") : t("admin.webhook.opContainsResult")} "${targetValue}"`;
        break;
      case "starts_with":
        matches = fieldValue.startsWith(targetValue);
        reason = `${condition.field} ("${fieldValue}") ${matches ? t("admin.webhook.opStartsWithResult") : t("admin.webhook.opNotStartsWithResult")} "${targetValue}"`;
        break;
      case "ends_with":
        matches = fieldValue.endsWith(targetValue);
        reason = `${condition.field} ("${fieldValue}") ${matches ? t("admin.webhook.opEndsWithResult") : t("admin.webhook.opNotEndsWithResult")} "${targetValue}"`;
        break;
      case "in":
        const values = targetValue.split(",").map(v => v.trim());
        matches = values.includes(fieldValue);
        reason = `${condition.field} ("${fieldValue}") ${matches ? t("admin.webhook.opInResult") : t("admin.webhook.opNotInResult")} [${values.join(", ")}] ${t("admin.webhook.inSuffix")}`;
        break;
      default:
        reason = `${t("admin.webhook.unknownOperator")}: ${condition.operator}`;
    }
    
    return { matches, reason };
  };
  
  // Run condition test
  const runConditionTest = () => {
    const conditions = formData.triggerConditions.conditions;
    const logic = formData.triggerConditions.logic;
    
    if (conditions.length === 0) {
      setTestResult({ matches: true, details: [t("admin.webhook.noConditionsTriggerAll")] });
      return;
    }
    
    const results = conditions.map(c => evaluateCondition(c, testData));
    const details = results.map((r, i) => `${i + 1}. ${r.reason} → ${r.matches ? `✅ ${t("admin.webhook.matchSymbol")}` : `❌ ${t("admin.webhook.noMatchSymbol")}`}`);

    let finalMatch = false;
    if (logic === "AND") {
      finalMatch = results.every(r => r.matches);
      details.push(`\n${t("admin.webhook.andResult")} ${finalMatch ? `${t("admin.webhook.allMatch")} ✅` : `${t("admin.webhook.notAllMatch")} ❌`}`);
    } else {
      finalMatch = results.some(r => r.matches);
      details.push(`\n${t("admin.webhook.orResult")} ${finalMatch ? `${t("admin.webhook.anyMatch")} ✅` : `${t("admin.webhook.noneMatch")} ❌`}`);
    }
    
    setTestResult({ matches: finalMatch, details });
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("admin.webhook.formNameLabel")}</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder={t("admin.webhook.formNamePlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("admin.webhook.formTypeLabel")}</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as WebhookType }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="wecom">{t("admin.webhook.wecom")}</SelectItem>
            <SelectItem value="dingtalk">{t("admin.webhook.dingtalk")}</SelectItem>
            <SelectItem value="feishu">{t("admin.webhook.feishu")}</SelectItem>
            <SelectItem value="custom">{t("admin.webhook.custom")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Webhook URL</Label>
        <Input
          value={formData.webhookUrl}
          onChange={(e) => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
          placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
        />
      </div>

      <div className="space-y-2">
        <Label>{t("admin.webhook.formDescLabel")}</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder={t("admin.webhook.formDescPlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("admin.webhook.subscribeEvents")}</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(eventTypeLabelKeys) as EventType[]).map((event) => (
            <label
              key={event}
              className={`flex items-center gap-2 p-2 rounded-sm border cursor-pointer transition-colors ${
                formData.triggerEvents.includes(event)
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <input
                type="checkbox"
                checked={formData.triggerEvents.includes(event)}
                onChange={() => toggleEvent(event)}
                className="sr-only"
              />
              <span className="text-sm">{t(eventTypeLabelKeys[event])}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label>{t("admin.webhook.enabledLabel")}</Label>
        <Switch
          checked={formData.enabled}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
        />
      </div>

      {/* Retry Configuration Section */}
      <div className="space-y-3 border-t border-border pt-4">
        <Label className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          {t("admin.webhook.retryConfigLabel")}
        </Label>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("admin.webhook.maxRetriesLabel")}</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={formData.maxRetries}
              onChange={(e) => setFormData(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 0 }))}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("admin.webhook.retryIntervalLabel")}</Label>
            <Input
              type="number"
              min={10}
              max={3600}
              value={formData.retryIntervalSeconds}
              onChange={(e) => setFormData(prev => ({ ...prev, retryIntervalSeconds: parseInt(e.target.value) || 60 }))}
              className="h-8"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <Label className="text-sm">{t("admin.webhook.exponentialBackoffLabel")}</Label>
          <Switch
            checked={formData.useExponentialBackoff}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, useExponentialBackoff: checked }))}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t("admin.webhook.exponentialBackoffDesc")}
        </p>
      </div>

      {/* Trigger Conditions Section */}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {t("admin.webhook.triggerConditionsLabel")}
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCondition}
          >
            <Plus className="w-3 h-3 mr-1" />
            {t("admin.webhook.addConditionBtn")}
          </Button>
        </div>
        
        {formData.triggerConditions.conditions.length > 0 && (
          <div className="space-y-2">
            {/* Logic Toggle */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t("admin.webhook.conditionRelation")}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleLogic}
                className="h-7 px-2"
              >
                {formData.triggerConditions.logic === "AND" ? t("admin.webhook.andLogic") : t("admin.webhook.orLogic")}
              </Button>
            </div>
            
            {/* Conditions List */}
            {formData.triggerConditions.conditions.map((condition, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-sm border border-border">
                {/* Field Select */}
                <Select
                  value={condition.field}
                  onValueChange={(value) => updateCondition(index, "field", value)}
                >
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionFieldOptionDefs.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Operator Select */}
                <Select
                  value={condition.operator}
                  onValueChange={(value) => updateCondition(index, "operator", value)}
                >
                  <SelectTrigger className="w-[100px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(conditionOperatorLabelKeys) as ConditionOperator[]).map((op) => (
                      <SelectItem key={op} value={op}>
                        {t(conditionOperatorLabelKeys[op])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Value Input */}
                <Input
                  value={condition.value}
                  onChange={(e) => updateCondition(index, "value", e.target.value)}
                  placeholder={t("admin.webhook.valuePlaceholder")}
                  className="flex-1 h-8"
                />
                
                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCondition(index)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {formData.triggerConditions.conditions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {t("admin.webhook.noConditionsHint")}
          </p>
        )}
        
        {/* Test Condition Button */}
        {formData.triggerConditions.conditions.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setTestResult(null);
              setShowTestConditionDialog(true);
            }}
            className="mt-2"
          >
            <Eye className="w-3 h-3 mr-1" />
            {t("admin.webhook.testConditionBtn")}
          </Button>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button onClick={onSubmit} disabled={isLoading || !formData.name || !formData.webhookUrl}>
          {isLoading ? t("admin.webhook.processing") : submitLabel}
        </Button>
      </div>
      
      {/* Test Condition Dialog */}
      <Dialog open={showTestConditionDialog} onOpenChange={setShowTestConditionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("admin.webhook.testCondTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.webhook.testCondDesc")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Test Data Input */}
            <div className="space-y-3">
              <Label>{t("admin.webhook.simData")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("admin.webhook.alertLevelTest")}</Label>
                  <Select
                    value={testData.alert_level}
                    onValueChange={(value) => setTestData(prev => ({ ...prev, alert_level: value }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t("admin.webhook.lowLevel")}</SelectItem>
                      <SelectItem value="medium">{t("admin.webhook.mediumLevel")}</SelectItem>
                      <SelectItem value="high">{t("admin.webhook.highLevel")}</SelectItem>
                      <SelectItem value="critical">{t("admin.webhook.criticalLevel")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("admin.webhook.projectTypeTest")}</Label>
                  <Select
                    value={testData.project_type}
                    onValueChange={(value) => setTestData(prev => ({ ...prev, project_type: value }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">{t("admin.webhook.development")}</SelectItem>
                      <SelectItem value="production">{t("admin.webhook.production")}</SelectItem>
                      <SelectItem value="maintenance">{t("admin.webhook.maintenance")}</SelectItem>
                      <SelectItem value="consulting">{t("admin.webhook.consulting")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("admin.webhook.costAmountTest")}</Label>
                  <Input
                    type="number"
                    value={testData.cost_amount}
                    onChange={(e) => setTestData(prev => ({ ...prev, cost_amount: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("admin.webhook.eventTypeTest")}</Label>
                  <Select
                    value={testData.event_type}
                    onValueChange={(value) => setTestData(prev => ({ ...prev, event_type: value }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cost_alert">{t("admin.webhook.costAlert")}</SelectItem>
                      <SelectItem value="meeting_reminder">{t("admin.webhook.meetingReminder")}</SelectItem>
                      <SelectItem value="training_notification">{t("admin.webhook.trainingNotification")}</SelectItem>
                      <SelectItem value="system_notification">{t("admin.webhook.systemNotification")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Current Conditions Display */}
            <div className="space-y-2">
              <Label>{t("admin.webhook.currentConditions")} ({formData.triggerConditions.logic})</Label>
              <div className="text-xs space-y-1 p-2 bg-muted/30 rounded-sm">
                {formData.triggerConditions.conditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-muted-foreground">{i + 1}.</span>
                    <span>{c.field}</span>
                    <span className="text-primary">{t(conditionOperatorLabelKeys[c.operator])}</span>
                    <span>"{c.value}"</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Run Test Button */}
            <Button onClick={runConditionTest} className="w-full">
              {t("admin.webhook.runTest")}
            </Button>
            
            {/* Test Result */}
            {testResult && (
              <div className={`p-3 rounded-sm border ${testResult.matches ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                <div className={`font-medium mb-2 ${testResult.matches ? "text-green-500" : "text-red-500"}`}>
                  {testResult.matches ? `✅ ${t("admin.webhook.conditionMatch")}` : `❌ ${t("admin.webhook.conditionNoMatch")}`}
                </div>
                <div className="text-xs space-y-1">
                  {testResult.details.map((detail, i) => (
                    <div key={i} className="text-muted-foreground whitespace-pre-wrap">{detail}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ============================================
// Templates Tab Component
// ============================================

interface WebhookTemplate {
  id: number;
  name: string;
  eventType: string;
  webhookType: WebhookType;
  titleTemplate: string;
  contentTemplate: string;
  availableVariables: string | null;
  isDefault: number;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
}

function TemplatesTab() {
  const { t, tpl } = useLanguage();
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [showEditTemplateDialog, setShowEditTemplateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WebhookTemplate | null>(null);
  const [previewResult, setPreviewResult] = useState<{ title: string; content: string } | null>(null);
  
  const [templateForm, setTemplateForm] = useState({
    name: "",
    eventType: "meeting_reminder",
    webhookType: "wecom" as WebhookType,
    titleTemplate: "",
    contentTemplate: "",
    availableVariables: "",
    isDefault: false,
  });
  
  // Sample variables for preview
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  
  // Queries
  const { data: templates, isLoading, refetch } = trpc.webhook.getTemplates.useQuery();
  
  // Mutations
  const createMutation = trpc.webhook.createTemplate.useMutation({
    onSuccess: () => {
      toast.success(t("admin.webhook.templateCreateSuccess"));
      setShowNewTemplateDialog(false);
      refetch();
      resetTemplateForm();
    },
    onError: (error) => {
      toast.error(`${t("admin.webhook.createFailed")}: ${error.message}`);
    },
  });
  
  const updateMutation = trpc.webhook.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success(t("admin.webhook.templateUpdateSuccess"));
      setShowEditTemplateDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`${t("admin.webhook.updateFailed")}: ${error.message}`);
    },
  });
  
  const deleteMutation = trpc.webhook.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success(t("admin.webhook.templateDeleteSuccess"));
      refetch();
    },
    onError: (error) => {
      toast.error(`${t("admin.webhook.deleteFailed")}: ${error.message}`);
    },
  });
  
  const initMutation = trpc.webhook.initTemplates.useMutation({
    onSuccess: (result) => {
      toast.success(tpl("admin.webhook.initSuccess", { count: String((result as any).created) }));
      refetch();
    },
    onError: (error) => {
      toast.error(`${t("admin.webhook.initFailed")}: ${error.message}`);
    },
  });
  
  const previewMutation = (trpc.webhook.previewTemplate as any).useMutation({
    onSuccess: (result) => {
      setPreviewResult(result);
    },
    onError: (error) => {
      toast.error(`${t("admin.webhook.previewFailed")}: ${error.message}`);
    },
  });
  
  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      eventType: "meeting_reminder",
      webhookType: "wecom",
      titleTemplate: "",
      contentTemplate: "",
      availableVariables: "",
      isDefault: false,
    });
  };
  
  const handleCreateTemplate = () => {
    createMutation.mutate({
      ...templateForm,
      availableVariables: templateForm.availableVariables || undefined,
    });
  };
  
  const handleUpdateTemplate = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate({
      id: selectedTemplate.id,
      ...templateForm,
    });
  };
  
  const handleDeleteTemplate = (id: number) => {
    if (confirm(t("admin.webhook.confirmDeleteTemplate"))) {
      deleteMutation.mutate({ id });
    }
  };
  
  const handleEditTemplate = (template: WebhookTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      eventType: template.eventType,
      webhookType: template.webhookType,
      titleTemplate: template.titleTemplate,
      contentTemplate: template.contentTemplate,
      availableVariables: template.availableVariables || "",
      isDefault: !!template.isDefault,
    });
    setShowEditTemplateDialog(true);
  };
  
  const handlePreviewTemplate = (template: WebhookTemplate) => {
    setSelectedTemplate(template);
    // Parse available variables and set default values
    try {
      const vars = template.availableVariables ? JSON.parse(template.availableVariables) : [];
      const defaultVars: Record<string, string> = {};
      vars.forEach((v: string) => {
        defaultVars[v] = `[${v}]`;
      });
      setPreviewVariables(defaultVars);
    } catch {
      setPreviewVariables({});
    }
    setPreviewResult(null);
    setShowPreviewDialog(true);
  };
  
  const handleGeneratePreview = () => {
    if (!selectedTemplate) return;
    previewMutation.mutate({
      templateId: selectedTemplate.id,
      variables: previewVariables,
    });
  };
  
  const eventTypeOptions = [
    { value: "meeting_reminder", labelKey: "admin.webhook.eventMeetingReminder" },
    { value: "cost_alert", labelKey: "admin.webhook.eventCostAlert" },
    { value: "training_complete", labelKey: "admin.webhook.eventTrainingComplete" },
    { value: "system_notification", labelKey: "admin.webhook.eventSystemNotification" },
  ];
  
  return (
    <Card className="bg-card/50 border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {t("admin.webhook.templateMgmtTitle")}
            </CardTitle>
            <CardDescription>{t("admin.webhook.templateMgmtDesc")}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
              {initMutation.isPending ? t("admin.webhook.initializing") : t("admin.webhook.initDefault")}
            </Button>
            <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetTemplateForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("admin.webhook.newTemplate")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("admin.webhook.newTemplateTitle")}</DialogTitle>
                  <DialogDescription>{t("admin.webhook.newTemplateDesc")}</DialogDescription>
                </DialogHeader>
                <TemplateForm
                  formData={templateForm}
                  setFormData={setTemplateForm}
                  eventTypeOptions={eventTypeOptions}
                  onSubmit={handleCreateTemplate}
                  isLoading={createMutation.isPending}
                  submitLabel={t("admin.webhook.create")}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">{t("admin.webhook.loading")}</div>
        ) : templates && templates.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.webhook.templateNameCol")}</TableHead>
                <TableHead>{t("admin.webhook.eventTypeColTpl")}</TableHead>
                <TableHead>{t("admin.webhook.webhookTypeCol")}</TableHead>
                <TableHead>{t("admin.webhook.defaultCol")}</TableHead>
                <TableHead>{t("admin.webhook.updateTimeCol")}</TableHead>
                <TableHead className="text-right">{t("admin.webhook.actionsCol")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {(() => { const opt = eventTypeOptions.find(e => e.value === template.eventType); return opt ? t(opt.labelKey) : template.eventType; })()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={webhookTypeColors[template.webhookType as WebhookType]}>
                      {t(webhookTypeLabelKeys[template.webhookType as WebhookType])}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {template.isDefault ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(template.updatedAt).toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreviewTemplate(template)}
                        title={t("admin.webhook.preview")}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTemplate(template)}
                        title={t("admin.webhook.edit")}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTemplate(template.id)}
                        title={t("admin.webhook.deleteAction")}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("admin.webhook.noTemplates")}</p>
            <p className="text-sm mt-2">{t("admin.webhook.noTemplatesHint")}</p>
          </div>
        )}
      </CardContent>
      
      {/* Edit Template Dialog */}
      <Dialog open={showEditTemplateDialog} onOpenChange={setShowEditTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.webhook.editTemplateTitle")}</DialogTitle>
            <DialogDescription>{t("admin.webhook.editTemplateDesc")}</DialogDescription>
          </DialogHeader>
          <TemplateForm
            formData={templateForm}
            setFormData={setTemplateForm}
            eventTypeOptions={eventTypeOptions}
            onSubmit={handleUpdateTemplate}
            isLoading={updateMutation.isPending}
            submitLabel={t("admin.webhook.save")}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("admin.webhook.previewTemplateTitle")}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name} - {t("admin.webhook.previewTemplateDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Variable Inputs */}
            <div className="space-y-2">
              <Label>{t("admin.webhook.varValues")}</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {Object.keys(previewVariables).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <Label className="w-24 text-sm text-muted-foreground">{`{{${key}}}`}</Label>
                    <Input
                      value={previewVariables[key]}
                      onChange={(e) => setPreviewVariables(prev => ({ ...prev, [key]: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <Button onClick={handleGeneratePreview} disabled={previewMutation.isPending}>
              {previewMutation.isPending ? t("admin.webhook.generating") : t("admin.webhook.generatePreview")}
            </Button>
            
            {/* Preview Result */}
            {previewResult && (
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("admin.webhook.previewTitleLabel")}</Label>
                  <div className="font-medium">{previewResult.title}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("admin.webhook.previewContentLabel")}</Label>
                  <div className="whitespace-pre-wrap text-sm">{previewResult.content}</div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================
// Template Form Component
// ============================================

function TemplateForm({
  formData,
  setFormData,
  eventTypeOptions,
  onSubmit,
  isLoading,
  submitLabel,
}: {
  formData: {
    name: string;
    eventType: string;
    webhookType: WebhookType;
    titleTemplate: string;
    contentTemplate: string;
    availableVariables: string;
    isDefault: boolean;
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  eventTypeOptions: { value: string; labelKey: string }[];
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel: string;
}) {
  const { t } = useLanguage();
  // Extended variable hints with categories
  const variableHints: Record<string, { categoryKey: string; vars: { key: string; nameKey: string; example: string }[] }[]> = {
    meeting_reminder: [
      { categoryKey: "admin.webhook.catMeetingInfo", vars: [
        { key: 'meeting_title', nameKey: "admin.webhook.varMeetingTitle", example: 'Weekly Meeting' },
        { key: 'meeting_time', nameKey: "admin.webhook.varMeetingTime", example: '2026-01-16 14:00' },
        { key: 'meeting_location', nameKey: "admin.webhook.varMeetingLocation", example: 'Room A301' },
        { key: 'meeting_description', nameKey: "admin.webhook.varMeetingDesc", example: 'Project progress' },
        { key: 'meeting_participants', nameKey: "admin.webhook.varMeetingParticipants", example: 'Alice, Bob' },
      ]},
      { categoryKey: "admin.webhook.catUserInfo", vars: [
        { key: 'user_name', nameKey: "admin.webhook.varUserName", example: 'Alice' },
        { key: 'user_list', nameKey: "admin.webhook.varUserList", example: 'Alice, Bob, Carol' },
        { key: 'user_count', nameKey: "admin.webhook.varUserCount", example: '5' },
      ]},
      { categoryKey: "admin.webhook.catLinks", vars: [
        { key: 'detail_url', nameKey: "admin.webhook.varDetailUrl", example: 'https://...' },
      ]},
    ],
    cost_alert: [
      { categoryKey: "admin.webhook.catProjectInfo", vars: [
        { key: 'project_name', nameKey: "admin.webhook.varProjectName", example: 'Smart Mfg Phase 1' },
        { key: 'project_code', nameKey: "admin.webhook.varProjectCode", example: 'GRT-2026-001' },
        { key: 'project_status', nameKey: "admin.webhook.varProjectStatus", example: 'In Progress' },
      ]},
      { categoryKey: "admin.webhook.catAlertInfo", vars: [
        { key: 'alert_level', nameKey: "admin.webhook.varAlertLevel", example: 'Critical' },
        { key: 'alert_type', nameKey: "admin.webhook.varAlertType", example: 'Over Budget' },
        { key: 'alert_rule', nameKey: "admin.webhook.varAlertRule", example: 'Budget 95%' },
        { key: 'current_value', nameKey: "admin.webhook.varCurrentValue", example: '95,000' },
        { key: 'threshold_value', nameKey: "admin.webhook.varThresholdValue", example: '100,000' },
      ]},
      { categoryKey: "admin.webhook.catBudgetInfo", vars: [
        { key: 'budget_used', nameKey: "admin.webhook.varBudgetUsed", example: '95,000' },
        { key: 'budget_total', nameKey: "admin.webhook.varBudgetTotal", example: '100,000' },
        { key: 'budget_percent', nameKey: "admin.webhook.varBudgetPercent", example: '95%' },
      ]},
      { categoryKey: "admin.webhook.catLinks", vars: [
        { key: 'detail_url', nameKey: "admin.webhook.varDetailUrl", example: 'https://...' },
        { key: 'action_url', nameKey: "admin.webhook.varActionUrl", example: 'https://...' },
      ]},
    ],
    training_complete: [
      { categoryKey: "admin.webhook.catTrainingInfo", vars: [
        { key: 'training_name', nameKey: "admin.webhook.varTrainingName", example: 'Safety Training' },
        { key: 'training_type', nameKey: "admin.webhook.varTrainingType", example: 'Safety' },
        { key: 'training_time', nameKey: "admin.webhook.varTrainingTime", example: '2026-01-20 09:00' },
        { key: 'training_location', nameKey: "admin.webhook.varTrainingLocation", example: 'Room B201' },
        { key: 'trainer_name', nameKey: "admin.webhook.varTrainerName", example: 'Mr. Wang' },
      ]},
      { categoryKey: "admin.webhook.catStatsInfo", vars: [
        { key: 'participant_count', nameKey: "admin.webhook.varParticipantCount", example: '20' },
        { key: 'pass_rate', nameKey: "admin.webhook.varPassRate", example: '90%' },
        { key: 'certificate_number', nameKey: "admin.webhook.varCertNumber", example: 'CERT-2026-001' },
      ]},
      { categoryKey: "admin.webhook.catUserInfo", vars: [
        { key: 'user_name', nameKey: "admin.webhook.varUserName", example: 'Alice' },
        { key: 'user_list', nameKey: "admin.webhook.varUserList", example: 'Alice, Bob' },
      ]},
    ],
    system_notification: [
      { categoryKey: "admin.webhook.catBasicInfo", vars: [
        { key: 'event_type', nameKey: "admin.webhook.varEventType", example: 'System Notification' },
        { key: 'event_time', nameKey: "admin.webhook.varEventTime", example: '2026-01-16 14:30:00' },
        { key: 'system_name', nameKey: "admin.webhook.varSystemName", example: 'GRT System' },
      ]},
      { categoryKey: "admin.webhook.catAttachments", vars: [
        { key: 'attachment_url', nameKey: "admin.webhook.varAttachmentUrl", example: 'https://...' },
        { key: 'attachment_name', nameKey: "admin.webhook.varAttachmentName", example: 'report.pdf' },
        { key: 'attachment_count', nameKey: "admin.webhook.varAttachmentCount", example: '3' },
      ]},
      { categoryKey: "admin.webhook.catCustom", vars: [
        { key: 'custom_field_1', nameKey: "admin.webhook.varCustomField1", example: 'Custom content' },
        { key: 'custom_field_2', nameKey: "admin.webhook.varCustomField2", example: 'Custom content' },
        { key: 'custom_field_3', nameKey: "admin.webhook.varCustomField3", example: 'Custom content' },
      ]},
    ],
  };
  
  const currentHintCategories = variableHints[formData.eventType] || [];
  const allVarKeys = currentHintCategories.flatMap(cat => cat.vars.map(v => v.key));
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("admin.webhook.templateFormName")}</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t("admin.webhook.templateFormNamePlaceholder")}
          />
        </div>
        
        <div className="space-y-2">
          <Label>{t("admin.webhook.templateFormEventType")}</Label>
          <Select
            value={formData.eventType}
            onValueChange={(value) => {
              setFormData(prev => ({
                ...prev,
                eventType: value,
                availableVariables: JSON.stringify(variableHints[value] || []),
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eventTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("admin.webhook.templateFormWebhookType")}</Label>
          <Select
            value={formData.webhookType}
            onValueChange={(value) => setFormData(prev => ({ ...prev, webhookType: value as WebhookType }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wecom">{t("admin.webhook.wecom")}</SelectItem>
              <SelectItem value="dingtalk">{t("admin.webhook.dingtalk")}</SelectItem>
              <SelectItem value="feishu">{t("admin.webhook.feishu")}</SelectItem>
              <SelectItem value="custom">{t("admin.webhook.custom")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center justify-between pt-6">
          <Label>{t("admin.webhook.templateFormDefault")}</Label>
          <Switch
            checked={formData.isDefault}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
          />
        </div>
      </div>
      
      {/* Variable Hints - Categorized */}
      {currentHintCategories.length > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg space-y-3">
          <Label className="text-xs text-muted-foreground">{t("admin.webhook.availableVarsLabel")}</Label>
          {currentHintCategories.map((category) => (
            <div key={category.categoryKey}>
              <span className="text-xs font-medium text-muted-foreground">{t(category.categoryKey)}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {category.vars.map((v) => (
                  <Badge
                    key={v.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => {
                      navigator.clipboard.writeText(`{{${v.key}}}`);
                      toast.success(`${t("admin.webhook.copied")} {{${v.key}}}`);
                    }}
                    title={`${t(v.nameKey)}: ${v.example}`}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    {t(v.nameKey)}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          <div className="text-xs text-muted-foreground mt-2">
            {t("admin.webhook.condSyntaxHint")} {`{{#if variable}}...{{/if}}`} & {`{{#unless variable}}...{{/unless}}`}
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <Label>{t("admin.webhook.titleTemplateLabel")}</Label>
        <Input
          value={formData.titleTemplate}
          onChange={(e) => setFormData(prev => ({ ...prev, titleTemplate: e.target.value }))}
          placeholder={t("admin.webhook.titleTemplatePlaceholder")}
        />
      </div>
      
      <div className="space-y-2">
        <Label>{t("admin.webhook.contentTemplateLabel")}</Label>
        <Textarea
          value={formData.contentTemplate}
          onChange={(e) => setFormData(prev => ({ ...prev, contentTemplate: e.target.value }))}
          placeholder={t("admin.webhook.contentTemplatePlaceholder")}
          rows={8}
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button
          onClick={onSubmit}
          disabled={isLoading || !formData.name || !formData.titleTemplate || !formData.contentTemplate}
        >
          {isLoading ? t("admin.webhook.processing") : submitLabel}
        </Button>
      </div>
    </div>
  );
}
